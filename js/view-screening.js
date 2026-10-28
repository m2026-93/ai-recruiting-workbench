(function () {
  window.Views = window.Views || {};

  var TYPE_META = {
    hard: { name: "硬性条件", badge: "hard", hint: "不满足即淘汰，需逐项确认" },
    core: { name: "核心能力", badge: "core", hint: "证据不足标记「待确认」" },
    bonus: { name: "加分项", badge: "bonus", hint: "只影响排序" }
  };

  function critPanel(job, list, UI, S) {
    var byType = { hard: [], core: [], bonus: [] };
    list.forEach(function (c) { (byType[c.type] || byType.core).push(c); });
    var confirmedN = list.filter(function (c) { return c.confirmed; }).length;
    var allOk = confirmedN === list.length;
    // 可复用的模板岗位：已确认过标准、且不是当前岗位
    var tpl = S.state.jobs.filter(function (j) {
      return j.id !== job.id && S.crit(j.id).some(function (c) { return c.confirmed; });
    })[0];

    var sections = ["hard", "core", "bonus"].map(function (t) {
      var meta = TYPE_META[t];
      return '<div class="crit-sec" data-type="' + t + '">' +
        '<div class="crit-sec-head"><h4>' + meta.name + "</h4>" +
        '<span class="badge ' + meta.badge + '">' + byType[t].length + " 项</span>" +
        '<span class="small muted">' + meta.hint + "</span></div>" +
        byType[t].map(function (c) {
          var opts = (c.type === "hard" ? ["必须"] : ["高", "中", "加分"]).map(function (o) {
            return '<option value="' + o + '"' + (c.importance === o ? " selected" : "") + ">" + o + "</option>";
          }).join("");
          var typeOpts = ["hard", "core", "bonus"].map(function (k) {
            return '<option value="' + k + '"' + (c.type === k ? " selected" : "") + ">" + TYPE_META[k].name + "</option>";
          }).join("");
          return '<div class="crit-item" data-cid="' + c.id + '">' +
            '<div class="txt"><input value="' + UI.esc(c.label) + '" data-label="' + c.id + '" /></div>' +
            '<select data-type="' + c.id + '" title="要求类别">' + typeOpts + "</select>" +
            '<select data-imp="' + c.id + '" title="重要程度">' + opts + "</select>" +
            '<button class="btn sm ' + (c.confirmed ? "primary" : "") + '" data-confirm="' + c.id + '" style="padding:3px 6px;font-size:11px">' +
              (c.confirmed ? "已确认" : "待确认") + "</button>" +
            '<button class="del" data-del="' + c.id + '" title="删除">×</button>' +
          "</div>";
        }).join("") +
        '<button class="crit-add" data-add="' + t + '">+ 添加' + meta.name + "</button>" +
      "</div>";
    }).join("");

    return '<div class="panel" id="critPanel" style="margin-bottom:14px">' +
      '<div class="panel-head"><div><h2>筛选标准</h2></div>' +
      '<span class="tag ' + (allOk ? "high" : "review") + '">已确认 ' + confirmedN + " / " + list.length + "</span>" +
      '<button class="btn xs ghost" id="btnCollapseCrit">收起</button></div>' +
      '<div class="panel-body">' +
        '<div class="confirm-banner ' + (allOk ? "ok" : "warn") + '"><span>' + (allOk ? "✓" : "!") + "</span>" +
          '<div class="grow">' + (allOk
            ? "AI 只依据这 " + list.length + " 项要求匹配；简历未提及的能力标记「证据不足」，不判为不符合。"
            : "AI 不自行创造淘汰标准，未确认前无法启动批量初筛。") +
          "</div></div>" +
        sections +
        '<div class="task-actions" style="margin-top:12px">' +
          '<button class="btn primary" id="btnConfirmCrit">' + (allOk ? "标准已确认" : "确认并锁定标准") + "</button>" +
          '<button class="btn" id="btnJdExtract">提取 JD 要点</button>' +
          (job.batch.status === "pending" && tpl
            ? '<button class="btn" id="btnCopyCrit">复用「' + UI.esc(tpl.title) + "」的 " + S.crit(tpl.id).length + ' 项标准</button>'
            : "") +
        "</div>" +
      "</div></div>";
  }

  // ---------- JD 要点提取 → 人工复核 ----------
  function extractPanel(job, S, UI) {
    var data = S.jdItems(job.id);
    var picked = S.state.jdPicked || {};
    var items = data.items;
    var highN = items.filter(function (i) { return i.confidence === "high"; }).length;

    return '<div class="panel jd-extract" style="margin-bottom:14px">' +
      '<div class="panel-head"><div><h2>JD 要点</h2>' +
        '<div class="small muted">共 ' + items.length + " 项 · JD 明确 " + highN + " 项</div></div>" +
        '<span class="tag muted">需 HR 复核</span></div>' +
      '<div class="panel-body">' +
        '<div class="confirm-banner info" style="margin-bottom:10px"><span>i</span><div class="grow">' +
          "勾选后才计入标准；JD 未提及的项默认不勾选。</div></div>" +
        items.map(function (it) {
          var conf = window.DATA.CONFIDENCE_META[it.confidence] || { label: "—", cls: "muted" };
          var on = picked.hasOwnProperty(it.id) ? picked[it.id] : it.confidence === "high";
          return '<label class="jd-item' + (on ? " on" : "") + '">' +
            '<input type="checkbox" data-jd="' + it.id + '"' + (on ? " checked" : "") + " />" +
            '<div class="jd-body"><div class="jd-line"><b>' + UI.esc(it.text) + "</b>" +
              '<span class="tag ' + conf.cls + '">' + conf.label + "</span>" +
              '<span class="tag muted">' + TYPE_META[it.type].name + " · " + it.importance + "</span></div>" +
            '<div class="jd-src">出处：' + UI.esc(it.source) + (it.note ? "　·　" + UI.esc(it.note) : "") + "</div></div>" +
          "</label>";
        }).join("") +
        '<div class="task-actions" style="margin-top:12px">' +
          '<button class="btn primary" id="btnAdoptJd">采纳勾选项</button>' +
          '<button class="btn ghost" id="btnCloseJd">取消</button>' +
        "</div>" +
      "</div></div>";
  }

  // 取来源里第一个带数量的渠道，避免显示"手工创建"这类非渠道描述
  function firstChannel(src) {
    var parts = String(src || "").split(" · ").map(function (s) { return s.trim(); }).filter(Boolean);
    for (var i = 0; i < parts.length; i++) if (/\d+$/.test(parts[i])) return parts[i];
    return parts[0] || "—";
  }

  // ---------- 滚动定位：让"去复核 / 去确认"这类跳转看得到结果 ----------
  function goAnchor(id) {
    setTimeout(function () {
      var el = document.getElementById(id);
      if (!el) return;
      try { el.scrollIntoView({ behavior: "smooth", block: "start" }); }
      catch (e) { el.scrollIntoView(); }
      el.classList.add("flash-hl");
      setTimeout(function () { el.classList.remove("flash-hl"); }, 1300);
    }, 40);
  }

  // ---------- 流程步骤条：岗位录入 → 简历导入 → 标准确认 → AI 初筛 → 人工复核 → 推选业务 ----------
  function stepper(job, S, UI, ctx) {
    var st = S.stats(job.id);
    var rs = S.reviewStats(job.id);
    var rc = S.recommendStats(job.id);
    var b = job.batch;
    var confirmedN = ctx.list.filter(function (c) { return c.confirmed; }).length;

    var steps = [
      {
        k: "job", name: "岗位录入", state: "done",
        meta: UI.esc(job.bizOwner || "未填写业务对接人"),
        acts: [{ k: "job", t: "编辑" }]
      },
      {
        k: "import", name: "简历导入", state: b.total > 0 ? "done" : "todo",
        meta: b.total + " 份 · " + UI.esc(firstChannel(job.source)), act: "导入"
      },
      {
        k: "crit", name: "标准确认",
        state: (ctx.allConfirmed && ctx.list.length) ? "done" : (ctx.list.length ? "doing" : "todo"),
        meta: !ctx.list.length ? "尚未提取标准"
          : ctx.allConfirmed ? "已确认 " + confirmedN + " 项" : confirmedN + " / " + ctx.list.length + " 项待确认",
        act: ctx.allConfirmed && ctx.list.length ? "查看" : "去确认"
      },
      {
        k: "screen", name: "AI 初筛",
        state: b.status === "completed" ? "done" : b.status === "running" ? "doing" : "todo",
        meta: b.status === "completed" ? "成功 " + b.processed + " · 失败 " + b.failed
          : b.status === "running" ? "处理中 " + b.processed + " / " + b.total : "待执行 " + b.total + " 份",
        act: b.status === "completed" ? "重跑" : "开始"
      },
      {
        k: "review", name: "人工复核",
        state: b.status !== "completed" ? "todo" : rs.pending > 0 ? "doing" : "done",
        meta: b.status !== "completed" ? "—"
          : rs.pending > 0 ? "已确认 " + rs.done + " / " + rs.total + " · 待确认 " + rs.pending
            : "已全部确认 · 暂定推荐 " + rs.rec + " 人",
        act: rs.pending > 0 ? "去复核" : "查看"
      },
      {
        k: "recommend", name: "推选业务",
        state: rc.people > 0 ? "done" : (S.recommendable(job.id).length ? "doing" : "todo"),
        meta: rc.people ? "已推选 " + rc.people + " 人 · 待反馈 " + rc.waiting
          : S.recommendable(job.id).length + " 人可推选",
        acts: [{ k: "recommend", t: "推选" }, { k: "rec", t: "记录" }]
      }
    ];

    return '<div class="stepper" id="flowStepper">' + steps.map(function (s, i) {
      return '<div class="step ' + s.state + '" data-step="' + s.k + '" title="点击执行该步骤">' +
        '<div class="sp-i">' + (s.state === "done" ? "✓" : i + 1) + "</div>" +
        '<div class="sp-b"><div class="sp-n">' + s.name + "</div>" +
        '<div class="sp-m">' + s.meta + "</div></div>" +
        '<div class="sp-acts">' + (s.acts || [{ k: s.k, t: s.act }]).map(function (a) {
          return '<button class="btn xs" data-step="' + a.k + '">' + a.t + "</button>";
        }).join("") + "</div>" +
        "</div>";
    }).join("") + "</div>";
  }

  // 匹配程度只有四档：高匹配 / 中匹配 / 低匹配 / 解析失败（未解析归入解析失败）
  function statStrip(st, batch, UI) {
    function cell(k, label, val, cls) {
      return '<div class="stat-cell' + (cls ? " " + cls : "") + '"' +
        (k ? ' data-cc="' + k + '" style="cursor:pointer" title="点击只看这一类"' : "") + '>' +
        '<div class="k">' + label + '</div><div class="v">' + val + "</div></div>";
    }
    return '<div class="stat-strip">' +
      cell("", "简历总数", batch.total) +
      cell("high", "高匹配", st.high, "high") +
      cell("review", "中匹配", st.review, "review") +
      cell("low", "低匹配", st.low) +
      cell("failed", "解析失败", st.failed + st.unparsed, "failed") +
    "</div>";
  }

  function evCell(cand, S) {
    var s = S.evidenceScore(cand);
    if (s === null) return '<span class="muted">—</span>';
    var cls = s >= 75 ? "good" : s >= 50 ? "mid" : "";
    return '<div class="ev-bar"><div class="track"><i class="' + cls + '" style="width:' + s + '%"></i></div><span class="small">' + s + "%</span></div>";
  }

  // 复核只有两档：暂定推荐初筛 / 暂不推荐初筛；确认后显示「已确认」，可撤销重选
  function revCell(c) {
    if (c.conclusion === "failed") return '<span class="muted">不可审核</span>';
    if (c.conclusion === "unparsed") return '<span class="muted small">待执行初筛</span>';
    if (c.reviewStatus === "recommend" || c.reviewStatus === "reject") {
      return '<div class="rev-done">' + UI.reviewLabel(c) +
        '<button class="rev-undo" data-rev-undo="' + c.id + '" title="撤销确认，回到待确认">撤销</button>' +
        (c.recommended ? '<span class="tag biz">已推荐业务</span>' : "") + "</div>";
    }
    return '<div class="rev-acts">' +
      '<button class="rb recommend" data-rev="recommend|' + c.id + '">暂定推荐</button>' +
      '<button class="rb reject" data-rev="reject|' + c.id + '">暂不推荐</button>' +
    "</div>";
  }

  function rowHtml(c, S, UI, st) {
    var failed = c.conclusion === "failed";
    var unparsed = c.conclusion === "unparsed";
    var parsing = c.parseStatus === "parsing";
    var col = UI.conclusionMeta[failed ? "failed" : c.conclusion] || null;
    var checked = st.selected.indexOf(c.id) >= 0;
    var nameCell = '<div class="cell-name"><div class="avatar ' + (failed ? "fail" : "") + '">' + UI.esc(c.name.slice(0, 1)) + "</div>" +
      '<div><div class="nm nm-link" data-cand="' + c.id + '" title="点击查看匹配详情">' + UI.esc(c.name) +
        (c.dup ? '<span class="dup-tip" title="' + UI.esc(c.dup.jobTitle + " · " + c.dup.matchedBy) + '">重复投递</span>' : "") +
      "</div></div></div>";

    var recentCell = failed
      ? '<div class="fail-msg"><span class="ic">!</span><span>解析失败：' + UI.esc(c.parseError) + "</span></div>"
      : unparsed
        ? '<div class="muted small">手工补录 · 待执行初筛后生成结论</div>'
        : '<div>' + UI.esc(c.recent) + '</div><div class="muted small">' +
          (c.years ? c.years + " 年 · " : "") + UI.esc(c.edu) + "</div>";

    var gaps = S.hardGaps(c);
    var conclCell = '<div>' + (parsing ? '<span class="tag review">重新解析中…</span>' : UI.conclusionTag(c.conclusion)) + "</div>" +
      (failed ? "" : evCell(c, S)) +
      (gaps.length
        ? '<span class="gap" title="硬性缺口：' + gaps.map(function (g) { return UI.esc(g.label); }).join("；") + '">缺口 ' +
          gaps.length + " 项</span>"
        : "");

    return '<tr class="' + (failed ? "row-failed" : "") + (checked ? " sel" : "") + '">' +
      '<td class="chk"><input type="checkbox" data-sel="' + c.id + '"' + (checked ? " checked" : "") +
        (failed || unparsed ? " disabled title=\"该状态不可批量处理\"" : "") + " /></td>" +
      "<td>" + nameCell + "</td>" +
      "<td>" + recentCell + "</td>" +
      '<td><div class="skills">' + (c.skills.length ? c.skills.slice(0, 3).map(function (s) { return '<span class="skill">' + UI.esc(s) + "</span>"; }).join("") : '<span class="muted small">—</span>') + "</div></td>" +
      "<td>" + conclCell + "</td>" +
      '<td class="review-state">' + revCell(c) + "</td>" +
      '<td style="text-align:right;white-space:nowrap">' +
        '<button class="btn sm ghost" data-resume="' + c.id + '" title="查看简历原件与附件">看原件</button> ' +
        (failed
          ? '<button class="btn sm" data-retry="' + c.id + '">重新解析</button>'
          : '<button class="btn sm" data-cand="' + c.id + '">详情</button>') +
      "</td></tr>";
  }

  // ---------- 左侧岗位选择：直接进本页也能切岗位 ----------
  function railHtml(S, UI, job) {
    var jobs = S.visibleJobs();
    var items = jobs.map(function (j) {
      var b = j.batch, rs = S.reviewStats(j.id);
      var dot = b.status === "completed" ? "done" : b.status === "running" ? "run" : "wait";
      var stat = b.status === "completed"
        ? (rs.pending ? "待复核 " + rs.pending + " 人" : "已复核 · 推荐 " + rs.rec + " 人")
        : b.status === "running" ? "初筛中 " + b.processed + "/" + b.total : "待初筛 " + b.total + " 份";
      return '<button class="job-rail-item' + (j.id === job.id ? " on" : "") + '" data-rail-job="' + j.id + '">' +
        '<div class="jr-t"><b>' + UI.esc(j.title) + '</b><span class="jr-dot ' + dot + '"></span></div>' +
        '<div class="jr-m">' + UI.esc(j.dept) + " · " + b.total + " 份</div>" +
        '<div class="jr-s' + (b.status === "completed" ? " ok" : "") + '">' + stat + "</div>" +
      "</button>";
    }).join("");
    return '<aside class="scr-rail">' +
      '<div class="rail-head"><b>岗位</b><span class="small muted">' + jobs.length + " 个</span></div>" +
      '<div class="rail-list">' + items + "</div>" +
      '<button class="rail-foot" id="btnRailAdmin">岗位管理</button>' +
    "</aside>";
  }

  // ---------- 人工复核进度条：逐个确认 / 其余一键处理 / 全部完成 ----------
  function reviewBar(rs, UI) {
    if (!rs.total) return "";
    if (rs.pending === 0) {
      return '<div class="rv-bar done"><span class="rv-ic">✓</span>' +
        '<div class="grow"><b>复核已全部完成</b>' +
        '<div class="small muted">共 ' + rs.total + " 人 · 暂定推荐 " + rs.rec + " 人 · 暂不推荐 " + rs.rej +
          " 人。下一步：推选给业务部门。</div></div>" +
        '<button class="btn sm" id="btnViewDone">查看已确认</button>' +
        '<button class="btn sm primary" id="btnGoRecommend">去推荐给业务部门</button></div>';
    }
    var pct = Math.round((rs.done / rs.total) * 100);
    return '<div class="rv-bar"><div class="rv-l">' +
      '<div class="rv-t">人工复核 <b>已确认 ' + rs.done + " / " + rs.total + "</b>" +
        '<span class="small muted">暂定推荐 ' + rs.rec + " · 暂不推荐 " + rs.rej + "</span></div>" +
      '<div class="progress"><i style="width:' + pct + '%"></i></div></div>' +
      '<div class="rv-r">' +
        '<button class="btn sm" id="btnRestReject">其余 ' + rs.pending + " 人均暂不推荐</button>" +
        '<span class="hint" style="margin:0">先挑出要推荐的，再一键处理其余</span>' +
      "</div></div>";
  }

  window.Views.screening = function (el) {
    var S = window.Store, UI = window.UI, st = S.state;
    if (window.Auth && window.Auth.user() && !window.Auth.can("screen.write")) {
      el.innerHTML = '<div class="panel" style="padding:48px 24px;text-align:center">' +
        '<div style="font-size:15px;font-weight:600;margin-bottom:6px">当前角色无法查看简历初筛</div>' +
        '<div class="small muted">AI 简历初筛面向招聘 HR 与招聘负责人；业务负责人只看推选给你的候选人。</div>' +
        '<div style="margin-top:16px"><button class="btn primary" id="btnBackDash">返回工作台</button></div></div>';
      var bk = document.getElementById("btnBackDash");
      if (bk) bk.onclick = function () { S.setRoute("dashboard"); };
      return;
    }
    var job = S.curJob();
    if (!job) {
      el.innerHTML = '<div class="empty panel"><b>暂无可查看的岗位</b></div>';
      return;
    }
    var list = S.crit(st.jobId);
    var batch = job.batch;
    var s = S.stats(st.jobId);
    var allConfirmed = list.length > 0 && list.every(function (c) { return c.confirmed; });
    var showCrit = st.critOpen !== false && (batch.status === "pending" || !allConfirmed || st.critForceOpen);

    var html = "";

    // 头部
    html += '<div class="scr-head"><div class="scr-job"><div>' +
      '<h2>' + UI.esc(job.title) + "</h2>" +
      '<div class="dept">' + UI.esc(job.dept) + " · " + UI.esc(job.city) + " · HC " + job.headcount + " · " + UI.esc(job.priority) + "</div></div></div>" +
      '<div style="display:flex;gap:8px;align-items:center">' +
        (batch.status === "pending"
          ? '<button class="btn primary" id="btnStartBatch"' + (allConfirmed ? "" : " disabled") + ">开始批量初筛</button>"
          : batch.status === "running"
            ? '<button class="btn primary" disabled><span class="spin" style="border-top-color:#fff;border-color:rgba(255,255,255,.35);border-top-color:#fff"></span> 处理中…</button>'
            : '<button class="btn" id="btnStartBatch">重新执行初筛</button>') +
      "</div></div>";

    // 流程步骤条：六步状态一眼可见，每步都能直接执行
    html += stepper(job, S, UI, { list: list, allConfirmed: allConfirmed });

    // JD 摘要（单行）
    html += '<div class="panel" style="margin-bottom:14px;padding:9px 14px;display:flex;gap:12px;align-items:center">' +
      '<span class="tag muted" style="flex:0 0 auto">JD</span>' +
      '<div class="small" style="flex:1;min-width:0;color:var(--ink-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap" ' +
        'title="' + UI.esc(job.jd) + ' · 来源：' + UI.esc(job.source) + '">' + UI.esc(job.jd) + "</div>" +
      '<button class="btn sm" id="btnJdExtractA" style="flex:0 0 auto">提取要点</button>' +
    "</div>";

    // 筛选标准
    if (showCrit) html += critPanel(job, list, UI, S);
    if (st.jdOpen) html += extractPanel(job, S, UI);

    // 任务进度
    if (batch.status === "running") {
      var pct = Math.round((batch.processed / batch.total) * 100);
      html += '<div class="progress-strip"><span class="spin"></span>' +
        '<div class="grow"><div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--ink-2);margin-bottom:6px">' +
          "<span>正在解析并逐项匹配…</span><b>" + pct + "%</b></div>" +
          '<div class="progress"><i style="width:' + pct + '%"></i></div></div>' +
        '<div class="nums"><span>已完成 <b>' + batch.processed + "</b></span><span>失败 <b>" + batch.failed + "</b></span><span>共 <b>" + batch.total + "</b></span></div>" +
      "</div>";
    }

    if (batch.status === "completed" && job.lastBatchNote) {
      html += '<div class="confirm-banner ' + (job.lastBatchNote.type === "anomaly" ? "warn" : "info") + '" style="margin-bottom:14px"><span>i</span>' +
        '<div class="grow">' + UI.esc(job.lastBatchNote.text) + "</div></div>";
    }

    if (batch.status === "completed" && s.unparsed > 0) {
      html += '<div class="confirm-banner info" style="margin-bottom:14px"><span>i</span>' +
        '<div class="grow">有 <b>' + s.unparsed + "</b> 份补录简历尚未解析，重新执行初筛后一并生成结论。</div>" +
        '<button class="btn sm" id="btnRerunNew">重新执行初筛</button></div>';
    }

    if (batch.status === "pending") {
      html += '<div class="empty panel" style="margin-bottom:14px"><b>尚未执行初筛</b>' +
        "确认标准后开始，约 30 秒完成 " + batch.total + " 份。</div>";
    }

    // 统计条 + 列表
    if (batch.status !== "pending") {
      html += statStrip(s, batch, UI);
      html += reviewBar(S.reviewStats(job.id), UI);

      var selN = st.selected.length;
      html += '<div class="panel" id="candListPanel">';
      if (selN) {
        html += '<div class="bulk-bar">' +
          '<b>已选 ' + selN + " 人</b>" +
          '<button class="btn sm" data-bulk="recommend">暂定推荐初筛</button>' +
          '<button class="btn sm" data-bulk="reject">暂不推荐初筛</button>' +
          '<button class="btn sm primary" data-recommend="1">推荐给业务部门</button>' +
          '<button class="btn sm ghost" data-bulk-remove="1">移出批次</button>' +
          '<button class="btn sm ghost" data-bulk-clear="1">清空</button>' +
        "</div>";
      }
      html += '<div class="toolbar">' +
        '<div class="seg" id="segConclusion">' +
          ["all", "high", "review", "low", "failed"].map(function (k) {
            var label = k === "all" ? "全部" : UI.conclusionMeta[k].label;
            var cnt = k === "all" ? s.ok + s.failed + s.unparsed : k === "failed" ? s.failed + s.unparsed : s[k];
            return '<button data-c="' + k + '" class="' + (st.filters.conclusion === k ? "on" : "") + '">' + label + " " + cnt + "</button>";
          }).join("") +
        "</div>" +
        '<div class="search"><input class="input" id="candSearch" placeholder="搜索姓名" value="' + UI.esc(st.filters.q) + '" /></div>' +
        '<select id="selReview">' +
          '<option value="all"' + (st.filters.review === "all" ? " selected" : "") + ">全部状态</option>" +
          '<option value="pending"' + (st.filters.review === "pending" ? " selected" : "") + ">待确认</option>" +
          '<option value="done"' + (st.filters.review === "done" ? " selected" : "") + ">已确认</option>" +
        "</select>" +
        '<select id="selSort">' +
          '<option value="match"' + (st.filters.sort === "match" ? " selected" : "") + ">匹配程度</option>" +
          '<option value="evidence"' + (st.filters.sort === "evidence" ? " selected" : "") + ">证据完整度</option>" +
          '<option value="years"' + (st.filters.sort === "years" ? " selected" : "") + ">相关年限</option>" +
        '<option value="pending"' + (st.filters.sort === "pending" ? " selected" : "") + ">待复核优先</option>" +
        "</select>" +
        '<button class="btn sm ghost" id="btnAddCand">+ 补录候选人</button>' +
        '<div class="spacer"></div>' +
      "</div>";

      var rows = filtered(S, st.filters, job.id);
      st.lastFilteredIds = rows.map(function (c) { return c.id; });
      var allChecked = rows.length > 0 && rows.every(function (c) {
        return c.conclusion === "failed" || st.selected.indexOf(c.id) >= 0;
      });
      html += '<div class="table-wrap"><table class="tbl cand-tbl"><thead><tr>' +
        '<th class="chk"><input type="checkbox" id="chkAll"' + (allChecked ? " checked" : "") + ' title="全选当前筛选结果" /></th>' +
        "<th>候选人</th><th>最近相关经历</th><th>核心技能</th><th>匹配结论</th><th>处理状态</th><th></th>" +
        "</tr></thead><tbody>" +
        (rows.length ? rows.map(function (c) { return rowHtml(c, S, UI, st); }).join("")
          : '<tr><td colspan="7"><div class="empty"><b>没有符合筛选条件的候选人</b>试试调整筛选或搜索条件</div></td></tr>') +
        "</tbody></table></div>" +
        '<div class="panel-head" style="border-top:1px solid var(--line-2);border-bottom:0">' +
          '<span class="hint" style="margin:0">' + rows.length + " / " + S.visibleCands(job.id).length + " 条</span>" +
        "</div></div>";
    }

    el.innerHTML = '<div class="scr-wrap">' + railHtml(S, UI, job) +
      '<div class="scr-main">' + html + "</div></div>";
    bind(el, job, list);
  };

  function filtered(S, f, jobId) {
    var rank = { high: 0, unparsed: 1, review: 2, low: 3, failed: 4 };
    var list = S.visibleCands(jobId).filter(function (c) {
      if (f.conclusion !== "all") {
        // 匹配程度四档：低 / 中 / 高 / 解析失败（未解析归入解析失败）
        var isFail = c.conclusion === "failed" || c.conclusion === "unparsed";
        if (f.conclusion === "failed") { if (!isFail) return false; }
        else if (c.conclusion !== f.conclusion) return false;
      }
      if (f.review === "pending" && !(c.reviewStatus === "pending" && c.conclusion !== "failed")) return false;
      if (f.review === "done" && !(c.reviewStatus !== "pending" && c.conclusion !== "failed")) return false;
      if (f.q && c.name.indexOf(f.q) < 0 && c.id.toLowerCase().indexOf(f.q.toLowerCase()) < 0) return false;
      return true;
    });
    list.sort(function (a, b) {
      if (f.sort === "years") return (b.years || 0) - (a.years || 0);
      if (f.sort === "evidence") return (S.evidenceScore(b) || 0) - (S.evidenceScore(a) || 0);
      var d = rank[a.conclusion] - rank[b.conclusion];
      if (f.sort === "pending") {
        var pa = a.reviewStatus === "pending" ? 0 : 1, pb = b.reviewStatus === "pending" ? 0 : 1;
        if (pa !== pb) return pa - pb;
        if (d !== 0) return d;
        return (S.evidenceScore(b) || 0) - (S.evidenceScore(a) || 0);
      }
      if (d !== 0) return d;
      return (S.evidenceScore(b) || 0) - (S.evidenceScore(a) || 0);
    });
    return list;
  }

  function bind(el, job, critList) {
    var S = window.Store, UI = window.UI, st = S.state;

    var collapse = document.getElementById("btnCollapseCrit");
    if (collapse) collapse.onclick = function () { st.critForceOpen = false; S.emit(); };

    var confirmBtn = document.getElementById("btnConfirmCrit");
    if (confirmBtn) confirmBtn.onclick = function () {
      var un = critList.filter(function (c) { return !c.confirmed; }).length;
      if (un > 0) {
        UI.modal({
          title: "确认筛选标准",
          desc: "硬性条件将作为是否进入下一轮的依据，请逐项确认。",
          body: '<div class="confirm-banner warn" style="margin:0"><span>!</span><div class="grow">还有 <b>' + un +
            "</b> 项未确认。确认后 AI 才会依据这些条件匹配简历；后续修改需要重新确认。</div></div>",
          confirmText: "确认全部 " + critList.length + " 项",
          onConfirm: function () {
            S.confirmCriteria(job.id);
            UI.toast("筛选标准已确认，可以开始批量初筛", "ok");
          }
        });
      } else {
        UI.toast("标准已确认，无需重复操作");
      }
    };

    var startBtn = document.getElementById("btnStartBatch");
    if (startBtn) startBtn.onclick = function () {
      if (job.batch.status === "completed") {
        UI.modal({
          title: "重新执行本批次初筛？",
          desc: "将按当前标准重新解析 " + job.batch.total + " 份简历。",
          body: '<div class="confirm-banner info" style="margin:0"><span>i</span><div class="grow">' +
            "不会删除你已填写的审核备注，匹配结论按最新标准重算。</div></div>",
          confirmText: "重新执行",
          onConfirm: function () {
            var r = S.startBatch(job.id);
            if (!r.ok) UI.toast("当前无法启动，请检查筛选标准", "warn");
          }
        });
        return;
      }
      var r = S.startBatch(job.id);
      if (!r.ok) {
        if (r.reason === "no_criteria") {
          UI.toast("请先从 JD 提取要点并确认筛选标准，再启动初筛", "warn");
          st.critForceOpen = true;
          st.jdOpen = true;
          S.emit();
        } else if (r.reason === "criteria") {
          UI.toast("请先确认筛选标准，再启动批量初筛", "warn");
          st.critForceOpen = true;
          S.emit();
        } else UI.toast("任务正在运行中", "warn");
      } else {
        UI.toast("批量初筛已启动，共 " + job.batch.total + " 份简历");
      }
    };

    // 标准编辑
    el.querySelectorAll("[data-label]").forEach(function (inp) {
      inp.onchange = function () { S.updateCriterion(job.id, inp.getAttribute("data-label"), { label: inp.value, confirmed: false }); };
    });
    el.querySelectorAll("[data-imp]").forEach(function (sel) {
      sel.onchange = function () { S.updateCriterion(job.id, sel.getAttribute("data-imp"), { importance: sel.value }); };
    });
    // 类别切换
    el.querySelectorAll("[data-type]").forEach(function (sel) {
      sel.onchange = function () {
        var id = sel.getAttribute("data-type");
        var t = sel.value;
        S.updateCriterion(job.id, id, {
          type: t,
          importance: t === "hard" ? "必须" : t === "core" ? "高" : "加分",
          confirmed: false
        });
      };
    });
    el.querySelectorAll("[data-confirm]").forEach(function (b) {
      b.onclick = function () { S.toggleCriterion(job.id, b.getAttribute("data-confirm")); };
    });
    el.querySelectorAll("[data-del]").forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute("data-del");
        var item = critList.filter(function (c) { return c.id === id; })[0];
        UI.modal({
          title: "删除筛选项",
          desc: item && item.type === "hard" ? "这是硬性条件，删除后该条件不再参与匹配。" : "删除后该项不再参与匹配。",
          body: '<div class="confirm-banner warn" style="margin:0"><span>!</span><div class="grow">' +
            UI.esc(item ? item.label : "") + "</div></div>",
          confirmText: "删除",
          onConfirm: function () { S.removeCriterion(job.id, id); UI.toast("已删除"); }
        });
      };
    });
    el.querySelectorAll("[data-add]").forEach(function (b) {
      b.onclick = function () { S.addCriterion(job.id, b.getAttribute("data-add")); };
    });

    var rerun = document.getElementById("btnRerunNew");
    if (rerun) rerun.onclick = function () {
      var r = S.startBatch(job.id);
      if (!r.ok) {
        UI.toast(r.reason === "criteria" ? "请先确认筛选标准" : "任务正在运行中", "warn");
        if (r.reason === "criteria") { st.critForceOpen = true; S.emit(); }
      } else UI.toast("正在按当前标准重新解析 " + job.batch.total + " 份简历");
    };

    // 统计条：点数字直接过滤到对应结论
    el.querySelectorAll("[data-cc]").forEach(function (b) {
      b.onclick = function () {
        var k = b.getAttribute("data-cc");
        var cur = st.filters.conclusion;
        S.setFilter({ conclusion: cur === k ? "all" : k, review: "all" });
      };
    });

    // 筛选
    el.querySelectorAll("#segConclusion button").forEach(function (b) {
      b.onclick = function () { S.setFilter({ conclusion: b.getAttribute("data-c") }); };
    });
    var selReview = document.getElementById("selReview");
    if (selReview) selReview.onchange = function () { S.setFilter({ review: selReview.value }); };
    var selSort = document.getElementById("selSort");
    if (selSort) selSort.onchange = function () { S.setFilter({ sort: selSort.value }); };
    var search = document.getElementById("candSearch");
    if (search) search.oninput = function () {
      S.state._focus = "candSearch";
      S.setFilter({ q: search.value });
    };

    // 流程步骤条动作：每一步都能点，且点了要有可见反馈（滚动 + 高亮）
    el.querySelectorAll("[data-step]").forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        var k = b.getAttribute("data-step");
        if (k === "job") { window.Admin.jobForm(job); return; }
        if (k === "import") { window.Admin.resumeImportForm(job.id); return; }
        if (k === "crit") {
          st.critForceOpen = true;
          S.setRoute("screening");
          goAnchor("critPanel");
          return;
        }
        if (k === "screen") {
          var sb = document.getElementById("btnStartBatch");
          if (sb) { sb.scrollIntoView({ block: "center" }); sb.click(); }
          return;
        }
        if (k === "review") {
          var pend = S.reviewStats(job.id).pending;
          if (!pend) { UI.toast("本批次已全部复核完成", "ok"); }
          S.setFilter({ review: "pending", sort: "pending", conclusion: "all", q: "" });
          goAnchor("candListPanel");
          return;
        }
        if (k === "recommend") {
          var ids = S.recommendable(job.id).map(function (c) { return c.id; });
          if (!ids.length) {
            UI.toast("暂无可推选候选人：需先完成复核并标记「暂定推荐初筛」", "warn");
            S.setFilter({ review: "pending", sort: "pending", conclusion: "all", q: "" });
            goAnchor("candListPanel");
            return;
          }
          window.Admin.recommendForm(job.id, ids);
          return;
        }
        if (k === "rec") { window.Admin.openRecommends(job.id); }
      };
    });

    var importBtn = document.getElementById("btnImportResume");
    if (importBtn) importBtn.onclick = function () { window.Admin.resumeImportForm(job.id); };

    // 推选业务部门（批量）
    el.querySelectorAll("[data-recommend]").forEach(function (b) {
      b.onclick = function () {
        var ids = S.state.selected.slice();
        if (!ids.length) { UI.toast("请先勾选候选人", "warn"); return; }
        window.Admin.recommendForm(job.id, ids);
      };
    });

    // JD 要点提取
    ["btnJdExtract", "btnJdExtractA"].forEach(function (bid) {
      var b = document.getElementById(bid);
      if (b) b.onclick = function () {
        S.state.jdOpen = true;
        S.state.jdPicked = {};
        S.emit();
      };
    });
    el.querySelectorAll("[data-jd]").forEach(function (cb) {
      cb.onchange = function () { S.state.jdPicked[cb.getAttribute("data-jd")] = cb.checked; };
    });
    var adoptBtn = document.getElementById("btnAdoptJd");
    if (adoptBtn) adoptBtn.onclick = function () {
      var items = S.jdItems(job.id).items;
      var picked = items.filter(function (it) {
        var v = S.state.jdPicked[it.id];
        return v === undefined ? it.confidence === "high" : v;
      }).map(function (it) { return it.id; });
      if (!picked.length) { UI.toast("请至少勾选 1 项要点", "warn"); return; }
      var n = S.adoptJdItems(job.id, picked);
      st.critForceOpen = true;
      UI.toast("已采纳 " + n + " 项要点，请逐项确认后锁定标准", "ok");
    };
    var closeJd = document.getElementById("btnCloseJd");
    if (closeJd) closeJd.onclick = function () { S.state.jdOpen = false; S.state.jdPicked = {}; S.emit(); };

    // 补录 / 编辑候选人
    var addBtn = document.getElementById("btnAddCand");
    if (addBtn) addBtn.onclick = function () { window.Admin.candidateForm(null, job.id); };

    // 复用其他岗位标准
    var copyBtn = document.getElementById("btnCopyCrit");
    if (copyBtn) copyBtn.onclick = function () {
      var jobs = S.state.jobs;
      var tpl = jobs.filter(function (j) {
        return j.id !== job.id && S.crit(j.id).some(function (c) { return c.confirmed; });
      })[0];
      if (!tpl) return;
      UI.modal({
        title: "复用筛选标准",
        desc: "复制「" + tpl.title + "」的 " + S.crit(tpl.id).length + " 项标准到本岗位。",
        body: '<div class="confirm-banner warn" style="margin:0"><span>!</span><div class="grow">' +
          "复制后各项为<b>未确认</b>状态，需逐项核对再锁定。</div></div>",
        confirmText: "复制并逐项确认",
        onConfirm: function () {
          S.copyCriteria(tpl.id, job.id);
          UI.toast("已复制 " + S.crit(tpl.id).length + " 项标准，请确认后再启动初筛", "ok");
        }
      });
    };

    // 勾选
    var chkAll = document.getElementById("chkAll");
    if (chkAll) chkAll.onchange = function () {
      var rows = filtered(S, S.state.filters, job.id).filter(function (c) {
        return c.conclusion !== "failed" && c.conclusion !== "unparsed";
      });
      S.setSelected(chkAll.checked ? rows.map(function (c) { return c.id; }) : []);
    };
    el.querySelectorAll("[data-sel]").forEach(function (cb) {
      cb.onclick = function (e) { e.stopPropagation(); };
      cb.onchange = function () { S.toggleSelect(cb.getAttribute("data-sel"), cb.checked); };
    });
    el.querySelectorAll("[data-bulk-clear]").forEach(function (b) {
      b.onclick = function () { S.clearSelection(); };
    });
    el.querySelectorAll("[data-bulk-remove]").forEach(function (b) {
      b.onclick = function () {
        var picks = S.state.selected.map(function (id) { return S.getCandidate(id); })
          .filter(function (c) { return c && c.jobId === job.id; });
        if (!picks.length) { UI.toast("请先勾选候选人", "warn"); return; }
        UI.modal({
          title: "移出本批次（" + picks.length + " 人）",
          desc: "用于清理重复投递、无效或重复的简历。",
          body: '<div class="confirm-banner warn" style="margin:0 0 10px"><span>!</span><div class="grow">' +
            "移出后这些候选人不再参与本批次统计与初筛。</div></div>" +
            '<div class="small muted">待移除：' + picks.slice(0, 8).map(function (c) { return UI.esc(c.name); }).join("、") +
            (picks.length > 8 ? " 等 " + picks.length + " 人" : "") + "</div>",
          confirmText: "确认移出",
          onConfirm: function () {
            var n = S.removeCandidates(picks.map(function (c) { return c.id; }));
            UI.toast("已移出 " + n + " 人", "ok");
          }
        });
      };
    });
    el.querySelectorAll("[data-bulk]").forEach(function (b) {
      b.onclick = function () {
        var act = b.getAttribute("data-bulk");
        var label = act === "reject" ? "暂不推荐初筛" : "暂定推荐初筛";
        var picks = S.state.selected.map(function (id) { return S.getCandidate(id); })
          .filter(function (c) { return c && c.jobId === job.id; });
        var blocked = picks.filter(function (c) {
          return c.conclusion === "failed" || c.conclusion === "unparsed";
        });
        var highN = act === "reject" ? picks.filter(function (c) { return c.conclusion === "high"; }).length : 0;
        UI.modal({
          title: "批量标记为「" + label + "」",
          desc: "仅对已勾选的 " + picks.length + " 位候选人生效。",
          body: '<div class="field"><label>统一备注（可选）</label>' +
            '<input class="input" id="bulkNote" placeholder="例如：硬性条件不满足，本岗位暂不推进" /></div>' +
            '<div class="confirm-banner ' + (blocked.length || highN ? "warn" : "info") + '" style="margin-top:10px"><span>' +
            (blocked.length || highN ? "!" : "i") + "</span>" +
            '<div class="grow">' + (blocked.length
              ? "将跳过 " + blocked.length + " 人（解析失败或未解析，不可确认）。"
              : highN ? "含 " + highN + " 位高匹配候选人，确认后按你的判断标记。"
                : "勾选的候选人均可批量确认。") + "</div></div>",
          confirmText: "确认批量处理",
          onConfirm: function (m) {
            var note = (m.querySelector("#bulkNote") || {}).value || "";
            var r = S.bulkReview(job.id, act, note.trim());
            if (r.ok) UI.toast("已批量处理 " + r.ok + " 人" + (r.skipped.length ? "，跳过 " + r.skipped.length + " 人" : ""), "ok");
            else UI.toast("没有可批量处理的候选人（护栏生效）", "warn");
          }
        });
      };
    });

    // 行内复核：只有「暂定推荐初筛 / 暂不推荐初筛」两档，点完即显示已确认，可撤销重选
    el.querySelectorAll("[data-rev]").forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        var parts = b.getAttribute("data-rev").split("|");
        var act = parts[0], cid = parts[1];
        var c = S.getCandidate(cid);
        if (!c) return;
        S.reviewCandidate(cid, act, "");
        UI.toast(c.name + " 已确认：" + (act === "recommend" ? "暂定推荐初筛" : "暂不推荐初筛") +
          (act === "recommend" && c.conclusion === "low" ? "（低匹配按你的判断确认，已留痕）" : ""), "ok");
      };
    });
    el.querySelectorAll("[data-rev-undo]").forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        var cid = b.getAttribute("data-rev-undo");
        S.reviewCandidate(cid, "pending", "");
        UI.toast("已撤销确认，回到待确认", "ok");
      };
    });

    // 反选：把当前列表中还没确认的人一次性标记为「暂不推荐初筛」
    var restBtn = document.getElementById("btnRestReject");
    if (restBtn) restBtn.onclick = function () {
      var rows = filtered(S, st.filters, job.id);
      var ids = rows.filter(function (c) {
        return c.reviewStatus === "pending" && c.conclusion !== "failed" && c.conclusion !== "unparsed";
      }).map(function (c) { return c.id; });
      if (!ids.length) { UI.toast("当前列表没有待确认的候选人", "warn"); return; }
      var names = ids.slice(0, 6).map(function (id) {
        var c = S.getCandidate(id); return c ? c.name : id;
      }).join("、");
      UI.modal({
        title: "其余 " + ids.length + " 人均暂不推荐初筛",
        desc: "用于快速收尾：已确认的候选人不参与，只处理还没确认的。",
        body: '<div class="confirm-banner warn" style="margin:0 0 10px"><span>!</span><div class="grow">' +
          "将把当前列表中尚未确认的 <b>" + ids.length + "</b> 人标记为「暂不推荐初筛」，已确认的人保持不变；" +
          "撤销可在列表里逐行点「撤销」。</div></div>" +
          '<div class="small muted">待处理：' + UI.esc(names) + (ids.length > 6 ? " 等 " + ids.length + " 人" : "") + "</div>",
        confirmText: "确认标记",
        onConfirm: function () {
          S.setSelected(ids);
          var r = S.bulkReview(job.id, "reject", "");
          UI.toast("已确认 " + r.ok + " 人为暂不推荐初筛" + (r.skipped.length ? "，跳过 " + r.skipped.length + " 人" : ""), "ok");
        }
      });
    };

    // 全部完成后的下一步
    var viewDone = document.getElementById("btnViewDone");
    if (viewDone) viewDone.onclick = function () {
      S.setFilter({ conclusion: "all", review: "done", sort: "match", q: "" });
    };
    var goRec = document.getElementById("btnGoRecommend");
    if (goRec) goRec.onclick = function () {
      var ids = S.recommendable(job.id).map(function (c) { return c.id; });
      if (!ids.length) {
        var rs = S.reviewStats(job.id);
        UI.toast(rs.rec ? "暂定推荐的 " + rs.rec + " 人已全部推选过" : "没有人被标记为「暂定推荐初筛」", "warn");
        return;
      }
      window.Admin.recommendForm(job.id, ids);
    };

    // 左侧岗位选择
    el.querySelectorAll("[data-rail-job]").forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute("data-rail-job");
        if (id === job.id) return;
        S.setJob(id);
        UI.toast("已切换岗位：" + S.curJob().title, "ok");
      };
    });
    var railAdmin = document.getElementById("btnRailAdmin");
    if (railAdmin) railAdmin.onclick = function () { window.Admin.openJobs(); };

    // 查看详情：点击姓名或「查看详情」按钮打开侧栏（行内其余区域不响应）
    el.querySelectorAll("[data-cand]").forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        window.Drawers.candidate(b.getAttribute("data-cand"));
      };
    });
    el.querySelectorAll("[data-resume]").forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        window.Resume.open(b.getAttribute("data-resume"));
      };
    });
    el.querySelectorAll("[data-retry]").forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        S.retryParse(b.getAttribute("data-retry"));
        UI.toast("正在重新解析该简历…");
      };
    });
  }
})();
