(function () {
  // AI 提醒助手的「大脑」：只做扫描、判断、准备材料；不发送、不写 ATS、不代替 HR 决策
  var A = {};
  function S() { return window.Store; }
  function U() { return window.UI; }
  function emp(name) { return window.DATA.empByName(name); }
  function shortName(text) { return String(text || "").split("（")[0].trim(); }

  A.hours = function (card) { return S().hoursSince(card.sinceAt); };
  A.wait = function (card) { return card.waitOverride || U().relHours(card.sinceAt); };

  A.ruleOf = function (card) {
    return S().state.rules.filter(function (r) { return r.id === card.ruleId; })[0] || null;
  };

  // 按岗位部门就近取一位面试官（模拟：来自企业通讯录）
  A.interviewerOf = function (job) {
    var pool = window.DATA.EMPLOYEES.filter(function (e) { return e.kind === "interviewer"; });
    var hit = pool.filter(function (e) {
      return (job.dept || "").indexOf(e.dept.split(" · ")[0]) >= 0;
    });
    return hit[0] || pool[0] || { name: "面试官", title: "" };
  };

  // ---------- 1. AI 简报：一句话说清「现在有几件事、先做哪件」 ----------
  A.brief = function (cards) {
    if (!cards.length) return { text: "规则已扫描全部在招岗位，当前没有需要处理的异常。", groups: [] };
    var byType = {};
    cards.forEach(function (c) {
      if (!byType[c.type]) byType[c.type] = { type: c.type, label: window.DATA.CARD_TYPE_LABEL[c.type] || c.typeLabel, n: 0, maxH: 0, ids: [] };
      var g = byType[c.type];
      g.n++;
      g.ids.push(c.id);
      var h = A.hours(c);
      if (h > g.maxH) g.maxH = h;
    });
    var groups = Object.keys(byType).map(function (k) { return byType[k]; })
      .sort(function (a, b) { return b.maxH - a.maxH; });
    var top = cards[0];
    var topName = top.candidateId ? (S().getCandidate(top.candidateId) || {}).name : S().getJob(top.jobId).title;
    var text = "扫描到 <b>" + cards.length + "</b> 条待处理，分 " + groups.length + " 类；建议先处理「" + U().esc(topName) + "」，等待最久且阻塞后续流程。";
    return { text: text, groups: groups, top: top };
  };

  // ---------- 2. AI 判断链路：把「怎么发现的」摊开给 HR 看 ----------
  A.chain = function (card) {
    var job = S().getJob(card.jobId);
    var cand = card.candidateId ? S().getCandidate(card.candidateId) : null;
    var rule = A.ruleOf(card);
    var steps = [];

    steps.push({
      t: "读取 ATS 字段",
      d: (rule ? rule.source : "ATS") + "　·　" + (cand ? "候选人 " + cand.name + " · " + card.stage : job.batch.id + " · " + card.stage)
    });
    steps.push({
      t: "命中规则",
      d: card.ruleText
    });
    if (card.thresholdHours) {
      steps.push({
        t: "计算等待",
        d: "自 " + U().fmtTime(card.sinceAt) + " 起，已等待 " + A.hours(card) + " 小时，阈值 " + card.thresholdHours + " 小时"
      });
    } else {
      steps.push({
        t: "计算指标",
        d: (card.statsProcessed ? "样本 " + card.statsProcessed + " 份 · 高匹配 " + card.statsHigh + " 份" : card.basis)
      });
    }
    steps.push({
      t: "交叉核对",
      d: card.basis
    });
    steps.push({
      t: "生成提醒",
      d: card.impact + "　→　只提醒，不催办、不发消息、不改 ATS"
    });
    return steps;
  };

  // ---------- 3. AI 产出物：话术（多语气）或行动清单 ----------
  function msg(to, tones) { return { kind: "msg", to: to, tones: tones }; }
  function todo(items, jump) { return { kind: "todo", items: items, jump: jump || null }; }

  A.draft = function (card) {
    var job = S().getJob(card.jobId);
    var cand = card.candidateId ? S().getCandidate(card.candidateId) : null;
    var h = A.hours(card);
    var wait = A.wait(card);
    var nm = cand ? cand.name : "";
    var jt = job.title;

    switch (card.type) {
      case "interview_feedback": {
        var iv = A.interviewerOf(job);
        return msg(iv.name + "（" + iv.title + "）", [
          { k: "plain", name: "直接", text:
            iv.name + " 你好，\n" +
            "「" + jt + "」候选人 " + nm + " 的" + card.stage + "已于 " + U().fmtTime(card.sinceAt) + " 结束，ATS 里还没有反馈记录，已等待 " + h + " 小时。\n" +
            "麻烦今天 18:00 前补充评估结论与评分，我好推进下一轮。\n—— 李萌" },
          { k: "soft", name: "委婉", text:
            iv.name + " 你好，打扰一下～\n" +
            "想跟你确认下 " + nm + "（" + jt + "）的面试反馈，系统里目前还没看到记录，已经过去 " + h + " 小时了。\n" +
            "如果还在整理，方便的话同步一个大概时间，我这边先跟候选人说明。谢谢！\n—— 李萌" },
          { k: "up", name: "升级", text:
            "马晓宇（招聘负责人）你好，同步一个卡点：\n" +
            "「" + jt + "」" + nm + " 的" + card.stage + "结束 " + h + " 小时仍未录入反馈，已超阈值 " + (h - card.thresholdHours) + " 小时，候选人无法进入下一轮。\n" +
            "我已提醒面试官 " + iv.name + "，如今天内仍未补充，申请由招聘侧介入协调。\n—— 李萌" }
        ]);
      }
      case "biz_feedback": {
        var to = shortName(job.bizOwner) || "业务对接人";
        return msg(to, [
          { k: "plain", name: "直接", text:
            to + " 你好，\n" +
            "「" + jt + "」" + U().fmtTime(card.sinceAt) + " 推给你的候选人 " + nm + "，还没有反馈，已等待 " + h + " 小时（期望 " + card.thresholdHours + " 小时内）。\n" +
            "请回复「安排面试 / 暂不推进」，我今天内同步候选人。\n—— 李萌" },
          { k: "soft", name: "委婉", text:
            to + " 你好，想跟一下 " + nm + "（" + jt + "）的简历反馈～\n" +
            "已经推过来 " + h + " 小时了，如果还没来得及看，我可以先发一份要点摘要给你，方便快速判断。\n—— 李萌" },
          { k: "up", name: "升级", text:
            to + " 你好，" + nm + " 的反馈已超时 " + (h - card.thresholdHours) + " 小时，候选人仍在等待。\n" +
            "请在今天 18:00 前给出结论；如暂不推进，我这边会同步归档并告知候选人，避免空等。\n—— 李萌（抄送 " + shortName(job.owner) + "）" }
        ]);
      }
      case "offer_approval": {
        var ap = shortName(job.bizOwner) || "审批人";
        return msg(ap, [
          { k: "plain", name: "直接", text:
            ap + " 你好，\n" +
            "「" + jt + "」" + nm + " 的 Offer 于 " + U().fmtTime(card.sinceAt) + " 提交审批，已等待 " + h + " 小时，仍有节点未处理。\n" +
            "麻烦确认预计完成时间，候选人已在等入职安排。\n—— 李萌" },
          { k: "up", name: "升级", text:
            "审批链提醒：「" + jt + "」" + nm + " 的 Offer 已停留 " + h + " 小时，超过 " + card.thresholdHours + " 小时阈值。\n" +
            "请当前节点今日内处理，否则入职时间需要重新与候选人协商。\n—— 李萌" }
        ]);
      }
      case "stage_stale": {
        var so = shortName(job.bizOwner) || "业务对接人";
        return msg(so, [
          { k: "plain", name: "直接", text:
            so + " 你好，\n" +
            nm + "（" + jt + "）自 " + U().fmtDateFull(card.sinceAt) + " 起停留在「" + card.stage + "」，已 " + wait + " 无推进。\n" +
            "请确认继续推进还是暂不推进，我按结论处理。\n—— 李萌" },
          { k: "soft", name: "委婉", text:
            so + " 你好，" + nm + " 这一单已经停了一段时间，想跟你确认下方向：\n" +
            "继续推进我就去约面，暂时不推进我就先归档并同步候选人，免得一直挂着。\n—— 李萌" }
        ]);
      }
      case "interview_arrange": {
        var iv2 = A.interviewerOf(job);
        return msg(iv2.name + "（" + iv2.title + "）", [
          { k: "plain", name: "约面", text:
            iv2.name + " 你好，\n" +
            nm + "（" + jt + "）已通过初筛，等待 " + h + " 小时仍未安排面试。\n" +
            "麻烦给两个可面试时段，我来发邀约。\n—— 李萌" }
        ]);
      }
      case "interview_today": {
        return todo([
          "确认会议链接 / 会议室并写入 ATS",
          "提前 10 分钟与候选人确认到场方式",
          "面试当天结束后当天内补录反馈（避免触发 24h 提醒）"
        ], { label: "查看候选人", run: function () { if (cand) window.Drawers.candidate(cand.id); } });
      }
      case "screening_anomaly": {
        var hard = S().crit(job.id).filter(function (c) { return c.type === "hard"; });
        return todo([
          "抽查 5 份「中匹配」简历，确认是否因表述差异被降级",
          "核对硬性条件：" + (hard.length ? hard.map(function (c) { return c.label; }).slice(0, 3).join("、") : "暂无硬性条件") + " 是否有可放宽项",
          "若标准合理，则问题在简历来源，同步渠道侧调整"
        ], { label: "去核对标准", run: function () { S().setJob(job.id); S().state.critForceOpen = true; S().setRoute("screening"); } });
      }
      case "position_gap": {
        return todo([
          "与业务方确认用人时间点是否可延后",
          "核对在流程中的候选人数量是否覆盖剩余 HC",
          "评估是否放宽标准或增加渠道"
        ], { label: "看候选人", run: function () { S().setJob(job.id); S().setRoute("screening"); } });
      }
      case "duplicate_apply": {
        return todo([
          "查看另一岗位已有初筛结论，判断是否可复用",
          "若转岗推进，与对应 HR 同步，避免重复约面"
        ], { label: "查看候选人", run: function () { if (cand) window.Drawers.candidate(cand.id); } });
      }
      default:
        return todo(card.suggestions.slice(0), null);
    }
  };

  // ---------- 4. 同类合并：一次沟通多条 ----------
  A.mergeGroups = function (cards) {
    var g = {};
    cards.forEach(function (c) {
      if (!g[c.type]) g[c.type] = [];
      g[c.type].push(c);
    });
    return Object.keys(g).filter(function (k) { return g[k].length >= 2; })
      .map(function (k) { return { type: k, cards: g[k] }; });
  };

  A.mergeText = function (cards) {
    var c0 = cards[0];
    var job = S().getJob(c0.jobId);
    var names = cards.map(function (c) {
      var cd = c.candidateId ? S().getCandidate(c.candidateId) : null;
      return (cd ? cd.name : job.title) + "（" + c.stage + " · 等待 " + A.hours(c) + " 小时）";
    });
    if (c0.type === "interview_feedback") {
      var iv = A.interviewerOf(job);
      return iv.name + " 你好，\n" +
        "有 " + cards.length + " 位候选人的面试反馈还没录入 ATS，麻烦一并确认：\n" +
        names.map(function (n, i) { return (i + 1) + ". " + n; }).join("\n") + "\n" +
        "今天 18:00 前补充结论即可，我可以一次性推进后续流程。\n—— 李萌";
    }
    var to = shortName(job.bizOwner) || "业务对接人";
    return to + " 你好，\n" +
      "以下 " + cards.length + " 位候选人卡在同一环节，想一并跟你确认：\n" +
      names.map(function (n, i) { return (i + 1) + ". " + n; }).join("\n") + "\n" +
      "请回复是否推进，我按结论处理，避免候选人空等。\n—— 李萌";
  };

  // ---------- 5. 复制：系统不代发，只帮 HR 准备好 ----------
  A.copy = function (text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    if (ok) { U().toast("已复制，发送由你完成", "ok"); return; }
    U().modal({
      title: "复制这段内容",
      desc: "浏览器未授权自动复制，请手动全选复制后自行发送。",
      confirmText: "关闭",
      body: '<textarea class="textarea" style="height:220px">' + U().esc(text) + "</textarea>"
    });
  };

  // 产出物区块（话术 / 清单），供卡片抽屉与处理台复用
  A.draftHtml = function (card, idPrefix) {
    var d = A.draft(card);
    if (d.kind === "msg") {
      var tones = d.tones;
      return '<div class="ag-draft">' +
        '<div class="agd-head"><span class="ag-ic">AI</span><b>AI 已备好沟通稿</b>' +
          '<span class="small muted">发给 ' + U().esc(d.to) + " · 复制后由你发送</span>" +
          '<div class="spacer"></div><button class="btn xs" data-copy-tone="' + idPrefix + '">复制</button></div>' +
        '<div class="agd-tones">' + tones.map(function (t, i) {
          return '<button class="agd-tone' + (i === 0 ? " on" : "") + '" data-tone="' + idPrefix + "_" + i + '">' + t.name + "</button>";
        }).join("") + "</div>" +
        tones.map(function (t, i) {
          return '<textarea class="textarea agd-text" id="tone_' + idPrefix + "_" + i + '"' +
            (i === 0 ? "" : ' style="display:none"') + ">" + U().esc(t.text) + "</textarea>";
        }).join("") +
        "</div>";
    }
    return '<div class="ag-draft">' +
      '<div class="agd-head"><span class="ag-ic">AI</span><b>AI 建议这样做</b>' +
        (d.jump ? '<div class="spacer"></div><button class="btn xs" data-jump="' + idPrefix + '">' + U().esc(d.jump.label) + "</button>" : "") +
        "</div>" +
      '<ol class="agd-list">' + d.items.map(function (it) { return "<li>" + U().esc(it) + "</li>"; }).join("") + "</ol>" +
      "</div>";
  };

  // 绑定产出物交互：语气切换、复制、跳转
  A.bindDraft = function (root, card, idPrefix, rerender) {
    var d = A.draft(card);
    root.querySelectorAll("[data-tone]").forEach(function (b) {
      b.onclick = function () {
        var key = b.getAttribute("data-tone");
        root.querySelectorAll("[data-tone]").forEach(function (x) {
          x.classList.toggle("on", x.getAttribute("data-tone") === key);
        });
        d.tones.forEach(function (t, i) {
          var el = root.querySelector("#tone_" + idPrefix + "_" + i);
          if (el) el.style.display = ("tone_" + key === "tone_" + idPrefix + "_" + i) ? "block" : "none";
        });
      };
    });
    root.querySelectorAll("[data-copy-tone]").forEach(function (b) {
      b.onclick = function () {
        var on = root.querySelector('[data-tone].on');
        var idx = on ? parseInt(on.getAttribute("data-tone").split("_").pop(), 10) : 0;
        A.copy(d.tones[idx] ? d.tones[idx].text : "");
      };
    });
    root.querySelectorAll("[data-jump]").forEach(function (b) {
      b.onclick = function () {
        if (d.jump) d.jump.run();
      };
    });
  };

  // ---------- 6. 处理台：按 AI 建议顺序逐条清 ----------
  A.console = function (ids, doneCb) {
    var list = ids.slice().sort(function (a, b) {
      var ca = S().getCard(a), cb2 = S().getCard(b);
      return (cb2.priority || 0) - (ca.priority || 0);
    });
    var i = 0, done = 0, skipped = 0;

    function render() {
      var card = S().getCard(list[i]);
      if (!card) { finish(); return; }
      var job = S().getJob(card.jobId);
      var cand = card.candidateId ? S().getCandidate(card.candidateId) : null;
      var chain = A.chain(card);

      var queue = list.map(function (id, k) {
        var c = S().getCard(id);
        if (!c) return "";
        var cd = c.candidateId ? S().getCandidate(c.candidateId) : null;
        return '<div class="agc-qi' + (k === i ? " on" : "") + (k < i ? " passed" : "") + '" data-qi="' + k + '">' +
          '<span class="q-n">' + (k < i ? "✓" : k + 1) + "</span>" +
          '<div class="q-b"><div class="q-t">' + U().esc(cd ? cd.name + " · " + c.title : c.title) + "</div>" +
          '<div class="q-m">' + U().esc(window.DATA.CARD_TYPE_LABEL[c.type] || c.typeLabel) + " · " + A.wait(c) + "</div></div></div>";
      }).join("");

      U().modal({
        title: "AI 处理台 · 第 " + (i + 1) + " / " + list.length + " 条",
        desc: "按紧急程度排序，AI 已备好材料；是否发送、如何处理仍由你决定。",
        wide: true,
        cancelText: "退出处理台",
        confirmText: null,
        body:
          '<div class="ag-console">' +
            '<div class="agc-left"><div class="agc-qh">处理队列 · 剩 ' + (list.length - i) + " 条</div>" + queue + "</div>" +
            '<div class="agc-main">' +
              '<div class="agc-h"><span class="tag accent">' + U().esc(window.DATA.CARD_TYPE_LABEL[card.type] || card.typeLabel) + "</span>" +
                "<b>" + U().esc(card.title) + "</b>" +
                '<span class="small muted">' + A.wait(card) + "</span></div>" +
              '<div class="agc-who">' + U().esc(job.title) + "　·　" + U().esc(cand ? cand.name + " · " + card.stage : card.stage) + "</div>" +
              '<div class="agc-sec"><div class="agc-st"><span class="ag-ic">AI</span>判断链路</div>' +
                '<div class="agc-chain">' + chain.map(function (s, k) {
                  return '<div class="ch-i"><span class="ch-n">' + (k + 1) + "</span>" +
                    '<div><b>' + U().esc(s.t) + '</b><div class="small muted">' + U().esc(s.d) + "</div></div></div>";
                }).join("") + "</div></div>" +
              '<div class="agc-sec">' + A.draftHtml(card, "cs") + "</div>" +
              '<div class="agc-acts">' +
                '<button class="btn primary" data-cs-ack="1">已知悉，下一条</button>' +
                '<button class="btn" data-cs-defer="1">暂缓 1 天</button>' +
                '<button class="btn ghost" data-cs-skip="1">跳过</button>' +
                '<div class="spacer"></div>' +
                '<span class="small muted">处理动作只记录在本系统，不改 ATS</span>' +
              "</div>" +
            "</div>" +
          "</div>"
      });

      var root = document.querySelector("#modalRoot .modal");
      if (!root) return;
      A.bindDraft(root, card, "cs");
      root.querySelectorAll("[data-qi]").forEach(function (b) {
        b.onclick = function () { i = parseInt(b.getAttribute("data-qi"), 10); render(); };
      });
      root.querySelector("[data-cs-ack]").onclick = function () {
        S().ackCard(card.id, "处理台批量处理");
        done++; i++; render();
      };
      root.querySelector("[data-cs-defer]").onclick = function () {
        S().deferCard(card.id, 1);
        skipped++; i++; render();
      };
      root.querySelector("[data-cs-skip]").onclick = function () { skipped++; i++; render(); };
    }

    function finish() {
      U().modal({
        title: "处理完成",
        desc: "AI 处理台已结束本轮。",
        confirmText: "完成",
        body: '<div class="agc-done"><b>' + done + "</b> 条已知悉　<b>" + skipped + "</b> 条暂缓或跳过" +
          '<div class="small muted" style="margin-top:8px">条件仍成立的提醒会在下次检测时重新出现。</div></div>',
        onConfirm: function () { if (doneCb) doneCb(); }
      });
    }

    render();
  };

  window.Agent = A;
})();
