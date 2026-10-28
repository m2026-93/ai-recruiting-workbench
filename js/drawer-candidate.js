(function () {
  window.Drawers = window.Drawers || {};

  var REVIEW_LABEL = { recommend: "暂定推荐初筛", reject: "暂不推荐初筛" };
  var NOTE_PRESETS = [
    "硬性条件不满足，本岗位暂不推进",
    "商业化经验匹配，建议优先推进",
    "数据分析案例需面试验证",
    "经历表述简略，需电话沟通确认"
  ];

  var TAB = "ev";          // 详情抽屉当前分区，翻页时保持
  var NOTE_OPEN = false;   // 备注区是否展开

  function esc(s) { return window.UI.esc(s); }

  function navIds(c) {
    var S = window.Store;
    var ids = S.state.lastFilteredIds || [];
    if (!ids.length || ids.indexOf(c.id) < 0) {
      ids = S.visibleCands(c.jobId).map(function (x) { return x.id; });
    }
    return ids;
  }

  // ---------- 顶部：姓名 / 结论 / 翻页 ----------
  function topHtml(c, job, UI, ids, idx, extra) {
    return '<div class="dw-top">' +
      '<div class="dw-av' + (c.conclusion === "failed" ? " fail" : "") + '">' + esc(c.name.slice(0, 1)) + "</div>" +
      '<div class="dw-t"><div class="n"><h2>' + esc(c.name) + "</h2>" + extra + "</div>" +
        '<div class="m">' + esc(job.title) + "　·　" + esc(c.recent) +
          '　·　<span class="mono">' + esc(c.id) + "</span></div></div>" +
      '<div style="display:flex;align-items:center;gap:6px;flex:0 0 auto">' +
        '<span class="small muted" style="margin-right:2px">' + (idx + 1) + "/" + ids.length + "</span>" +
        '<button class="icon-btn" data-nav="-1"' + (idx <= 0 ? " disabled style=\"opacity:.35\"" : "") + ' title="上一位">‹</button>' +
        '<button class="icon-btn" data-nav="1"' + (idx >= ids.length - 1 ? " disabled style=\"opacity:.35\"" : "") + ' title="下一位">›</button>' +
        '<button class="icon-btn" data-drawer-close="1" title="关闭">×</button>' +
      "</div></div>";
  }

  function metricsHtml(c, S, UI, matched, limited) {
    var score = S.evidenceScore(c);
    return '<div class="dw-metrics">' +
      '<div class="m"><div class="k">匹配结论</div><div class="v" style="font-size:13px">' +
        (UI.conclusionMeta[c.conclusion] || {}).label + "</div></div>" +
      '<div class="m"><div class="k">证据完整度</div><div class="v">' + (score === null ? "—" : score + "%") + "</div></div>" +
      '<div class="m g"><div class="k">证据支持</div><div class="v">' + matched + "</div></div>" +
      '<div class="m a"><div class="k">待核实</div><div class="v">' + limited + "</div></div>" +
    "</div>";
  }

  function tabsHtml(c, matched, limited, logsN) {
    function t(k, label, n) {
      return '<button data-tab="' + k + '" class="' + (TAB === k ? "on" : "") + '">' + label +
        (n ? '<span class="tn">' + n + "</span>" : "") + "</button>";
    }
    return '<div class="dw-tabs">' +
      t("ev", "匹配证据", matched + "/" + (matched + limited)) +
      t("resume", "简历原件") +
      t("log", "记录", logsN || null) +
      '<div class="spacer"></div>' +
      '<span class="small muted" style="align-self:center">← → 可翻页</span>' +
    "</div>";
  }

  // ---------- 简历原件 ----------
  function resumeTab(c, UI) {
    var doc = window.Resume.build(c);
    var firstEv = null;
    if (!doc.failed) {
      var list = window.Store.crit(c.jobId);
      for (var i = 0; i < list.length; i++) {
        var e = (c.evidence || {})[list[i].id];
        if (e && e.quote) { firstEv = list[i].id; break; }
      }
    }
    return '<div class="dw-sec"><div class="rcard compact">' +
        '<div class="thumb" data-open-resume="1" title="点击查看简历全文">' + window.Resume.thumb(c) + "</div>" +
        '<div class="meta">' +
          '<div style="font-size:12.5px;font-weight:600">' + esc(doc.file.name) + "</div>" +
          '<div class="small muted" style="margin-top:2px">' + esc(doc.file.type) + " · " + esc(doc.file.size) +
            " · " + (doc.failed ? '<span style="color:var(--accent)">解析失败</span>' : doc.file.pages + " 页") + "</div>" +
          '<div class="small muted">来源 ' + esc(doc.file.channel) + " · 上传于 " + esc(doc.file.uploadedAt) + "</div>" +
          '<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">' +
            '<button class="btn sm primary" data-open-resume-btn="1">查看全文</button>' +
            (firstEv ? '<button class="btn sm ghost" data-open-ev="' + firstEv + '">定位引用原文</button>' : "") +
          "</div>" +
          (doc.attachments.length
            ? '<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">' + doc.attachments.map(function (a) {
                return '<button class="att-chip" data-open-att="' + a.id + '" title="' + esc(a.name) + '"><i>A</i>' + esc(a.type) + "</button>";
              }).join("") + "</div>"
            : "") +
        "</div></div>" +
      (doc.failed ? '<div class="hint small" style="margin-top:8px">原件无法提取文本，不生成匹配结论</div>' : "") +
      "</div>";
  }

  // ---------- 证据分区 ----------
  function evTab(c, S, UI, matched, limited) {
    var list = S.crit(c.jobId);
    var rows = list.map(function (r) {
      var ev = (c.evidence || {})[r.id];
      var status = ev ? ev.status : "missing";
      var typeName = r.type === "hard" ? "硬性条件" : r.type === "core" ? "核心能力" : "加分项";
      var hasQuote = !!(ev && ev.quote);
      return '<div class="ev-row ' + status + '">' +
        '<span class="dot"></span><div class="bd">' +
          '<div class="r1"><span class="rq">' + esc(r.label) + '</span>' +
            '<span class="ty">' + typeName + " · " + esc(r.importance) + "</span>" +
            '<span style="margin-left:auto">' + UI.evBadge(status) + "</span></div>" +
          '<div class="ev"><span class="k">简历证据：</span>' +
            (ev && ev.status !== "missing" ? esc(ev.text) : "未找到与该要求直接相关的描述。") + "</div>" +
          '<div class="acts">' +
            '<button class="lnk" data-locate="' + r.id + '">原件中定位</button>' +
            (hasQuote ? '<button class="lnk" data-quote="' + r.id + '">展开简历原文</button>' : "") +
          "</div>" +
          (hasQuote
            ? '<div class="quote" id="q_' + r.id + '" style="display:none;margin-top:6px">' + esc(ev.quote) +
              '<span class="src">出处：' + esc(ev.source || "—") + "</span></div>"
            : "") +
        "</div></div>";
    }).join("");

    var gaps = list.filter(function (r) {
      var ev = (c.evidence || {})[r.id];
      return !ev || ev.status !== "matched";
    });

    var html = '<div class="dw-sec"><h3>简历摘要</h3>' +
      '<div class="summary-box">' + esc(c.summary) + "</div></div>";
    html += '<div class="dw-sec"><h3>岗位要求 × 简历证据' +
      '<span class="cnt">支持 ' + matched + " · 待核实 " + limited + " · 缺失 " + (list.length - matched - limited) + "</span></h3>" +
      rows + "</div>";
    if (gaps.length) {
      html += '<div class="dw-sec"><h3>未找到充分证据<span class="cnt">不做负面推断</span></h3>' +
        '<div class="dw-note">' + gaps.map(function (r) {
          var ev = (c.evidence || {})[r.id];
          return '<span class="tag ' + (ev && ev.status === "limited" ? "review" : "muted") + '">' + esc(r.label) + "</span>";
        }).join("") + "</div></div>";
    }
    return html;
  }

  function noteBox(c, UI) {
    return '<div class="dw-sec" id="noteBox"' + (NOTE_OPEN ? "" : ' style="display:none"') + '>' +
      '<h3>审核备注</h3>' +
      '<textarea class="textarea" id="reviewNote" style="height:66px" placeholder="例如：商业化经验匹配，但数据分析案例需面试验证">' +
        esc(c.reviewNote || "") + "</textarea>" +
      '<div class="dw-note">' + NOTE_PRESETS.map(function (n) {
        return '<button class="chip-btn" data-note="' + esc(n) + '">' + esc(n) + "</button>";
      }).join("") + "</div></div>";
  }

  function renderCandidate(id, scrollTop) {
    var S = window.Store, UI = window.UI;
    var c = S.getCandidate(id);
    if (!c) return;
    var job = S.getJob(c.jobId);
    var list = S.crit(c.jobId);
    var failed = c.conclusion === "failed";
    var unparsed = c.conclusion === "unparsed";
    var ids = navIds(c);
    var idx = ids.indexOf(id);

    var matched = 0, limited = 0;
    if (!failed && !unparsed) {
      list.forEach(function (r) {
        var ev = (c.evidence || {})[r.id];
        if (ev && ev.status === "matched") matched++;
        else if (ev && ev.status === "limited") limited++;
      });
    }
    var logs = S.state.logs.filter(function (l) { return l.target && l.target.indexOf(c.name) >= 0; }).slice(0, 6);

    var html = topHtml(c, job, UI, ids, idx,
      UI.conclusionTag(c.conclusion) + UI.reviewLabel(c));

    if (!failed && !unparsed) html += metricsHtml(c, S, UI, matched, limited);
    html += tabsHtml(c, matched, limited, logs.length);

    html += '<div class="drawer-body compact">';

    if (failed) {
      html += '<div class="dw-sec"><div class="confirm-banner warn" style="margin:0"><span>!</span><div class="grow">' +
        "<b>简历解析失败，请检查文件格式。</b><br/>" + esc(c.parseError) +
        "<br/>不计入匹配结论，也不默认为低匹配。</div></div>" +
        '<div style="display:flex;gap:8px;margin-top:10px">' +
          '<button class="btn primary" id="btnRetryParse"' + (c.parseStatus === "parsing" ? " disabled" : "") + ">" +
            (c.parseStatus === "parsing" ? "解析中…" : "重新解析") + "</button>" +
          '<button class="btn" id="btnUploadNew">上传新文件</button>' +
        "</div></div>";
      html += resumeTab(c, UI);
    } else if (unparsed) {
      html += '<div class="dw-sec"><div class="confirm-banner info" style="margin:0"><span>i</span><div class="grow">' +
        "<b>手工补录的简历，尚未执行初筛。</b><br/>重新执行本批次初筛后会一并解析并生成证据结论。</div></div>" +
        '<div style="display:flex;gap:8px;margin-top:10px">' +
          '<button class="btn" id="btnEditCand2">编辑资料</button>' +
          '<button class="btn ghost" id="btnRemoveCand2">移出批次</button>' +
        "</div></div>";
      html += '<div class="dw-sec"><h3>基本信息</h3><div class="kv-grid">' +
        '<dl class="kv"><dt>最近相关经历</dt><dd>' + esc(c.recent) + "</dd></dl>" +
        '<dl class="kv"><dt>相关年限</dt><dd>' + (c.years ? c.years + " 年" : "—") + "</dd></dl>" +
        '<dl class="kv"><dt>教育背景</dt><dd>' + esc(c.edu) + "</dd></dl>" +
        '<dl class="kv"><dt>简历文件</dt><dd>' + esc(c.file) + "</dd></dl></div></div>";
      html += resumeTab(c, UI);
    } else {
      if (TAB === "ev") {
        if (c.dup) {
          html += '<div class="dw-sec"><div class="confirm-banner warn" style="margin:0"><span>!</span><div class="grow">' +
            "<b>疑似重复投递。</b>该候选人于 " + esc(c.dup.at) + " 投递过「" + esc(c.dup.jobTitle) + "」（" +
            esc(c.dup.matchedBy) + "，当时结论：" + esc(c.dup.conclusion) + "），建议复用已有结论。</div></div></div>";
        }
        html += '<div class="dw-sec"><h3>概览</h3><div class="kv-grid">' +
          '<dl class="kv"><dt>最近相关经历</dt><dd>' + esc(c.recent) + "</dd></dl>" +
          '<dl class="kv"><dt>相关年限</dt><dd>' + (c.years ? c.years + " 年" : "—") + "</dd></dl>" +
          '<dl class="kv"><dt>教育背景</dt><dd>' + esc(c.edu) + "</dd></dl>" +
          '<dl class="kv"><dt>当前阶段</dt><dd>' + esc(c.stage) + "</dd></dl></div></div>";
        if (c.recommended) {
          var rec = S.state.recommends.filter(function (r) { return r.id === c.recommended.batchId; })[0];
          var w = S.hoursSince(rec ? rec.at : c.recommended.at);
          var ex = rec ? rec.expectHours : 48;
          html += '<div class="dw-sec"><div class="confirm-banner ' + (c.bizFeedback === "pending" && w >= ex ? "warn" : "info") + '" style="margin:0"><span>' +
            (c.bizFeedback === "pending" && w >= ex ? "!" : "i") + '</span><div class="grow">' +
            "已通过推荐单 <b>" + esc(c.recommended.batchId) + "</b> 推选给 <b>" +
            esc(c.recommended.to || (rec ? rec.to : "业务负责人")) + "</b>，已等待 <b>" + w + "</b> 小时。" +
            (c.bizFeedback === "pending" ? "" : "业务部门已反馈。") + "</div></div></div>";
        }
        html += evTab(c, S, UI, matched, limited);
        html += noteBox(c, UI);
      } else if (TAB === "resume") {
        html += resumeTab(c, UI);
      } else {
        html += '<div class="dw-sec"><h3>操作记录</h3>' +
          (logs.length
            ? '<ul class="timeline">' + logs.map(function (l) {
                return '<li class="' + (l.action.indexOf("修改") === 0 ? "cur" : "") + '"><span class="t">' + UI.fmtTime(l.at) + "</span>" +
                  esc(l.action) + '<div class="muted small">' + esc(l.detail || l.target) + "</div></li>";
              }).join("") + "</ul>"
            : '<div class="small muted">暂无操作记录</div>') + "</div>";
        html += '<div class="dw-sec"><h3>资料维护</h3><div style="display:flex;gap:8px;flex-wrap:wrap">' +
          '<button class="btn sm" id="btnEditCand">编辑候选人</button>' +
          '<button class="btn sm ghost" id="btnRemoveCand">移出批次</button>' +
          '<span class="hint small" style="align-self:center">移出仅从本批次移除</span></div></div>';
      }
    }

    html += "</div>";

    // 底部固定审核条
    if (!failed && !unparsed) {
      var current = c.reviewStatus === "pending" ? null : c.reviewStatus;
      html += '<div class="dw-foot">' +
        ["recommend", "reject"].map(function (k) {
          var cls = k === "recommend" ? "recommend" : "reject";
          return '<button class="btn sm ' + (current === k ? "on " + cls : "") + '" data-review="' + k + '">' + REVIEW_LABEL[k] + "</button>";
        }).join("") +
        (current ? '<span class="hint" style="margin:0">已确认，可改选另一个</span>' : '<span class="hint" style="margin:0">二选一</span>') +
        '<button class="btn sm ghost" data-toggle-note="1">备注</button>' +
        '<div class="spacer"></div>' +
        '<span class="hint">仅本次初筛生效</span>' +
        '<button class="btn sm primary" id="btnSaveNext">保存并下一位</button>' +
        "</div>";
    } else {
      html += '<div class="dw-foot"><div class="spacer"></div>' +
        '<button class="btn sm" data-drawer-close="1">关闭</button></div>';
    }

    window.UI.drawer(html);

    var body = document.querySelector(".drawer-body");
    if (body && scrollTop) body.scrollTop = scrollTop;

    bindCommon(id, ids, idx);
    bindBody(id, c, body);
  }

  function bindBody(id, c, body) {
    var S = window.Store, UI = window.UI;
    var root = document.getElementById("drawerRoot");
    function all(sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }

    all("[data-tab]").forEach(function (b) {
      b.onclick = function () { TAB = b.getAttribute("data-tab"); renderCandidate(id, 0); };
    });

    all("[data-open-resume],[data-open-resume-btn]").forEach(function (b) {
      b.onclick = function () { window.Resume.open(id); };
    });
    all("[data-open-ev]").forEach(function (b) {
      b.onclick = function () { window.Resume.open(id, { critId: b.getAttribute("data-open-ev") }); };
    });
    all("[data-open-att]").forEach(function (b) {
      b.onclick = function () { window.Resume.open(id, { file: b.getAttribute("data-open-att") }); };
    });
    all("[data-locate]").forEach(function (b) {
      b.onclick = function () { window.Resume.open(id, { critId: b.getAttribute("data-locate") }); };
    });
    all("[data-quote]").forEach(function (b) {
      b.onclick = function () {
        var q = document.getElementById("q_" + b.getAttribute("data-quote"));
        if (!q) return;
        var on = q.style.display !== "none";
        q.style.display = on ? "none" : "block";
        b.textContent = on ? "展开简历原文" : "收起原文";
      };
    });
    all("[data-note]").forEach(function (b) {
      b.onclick = function () {
        var ta = document.getElementById("reviewNote");
        if (ta) { ta.value = b.getAttribute("data-note"); ta.focus(); }
      };
    });

    var tn = root.querySelector("[data-toggle-note]");
    if (tn) tn.onclick = function () {
      NOTE_OPEN = !NOTE_OPEN;
      if (TAB !== "ev") { TAB = "ev"; }
      renderCandidate(id, 0);
      setTimeout(function () {
        var box = document.getElementById("noteBox");
        var ta = document.getElementById("reviewNote");
        if (box && ta) { box.scrollIntoView({ block: "center" }); ta.focus(); }
      }, 40);
    };

    // 审核结论
    var chosen = c.reviewStatus === "pending" ? null : c.reviewStatus;
    all("[data-review]").forEach(function (b) {
      b.onclick = function () {
        chosen = b.getAttribute("data-review");
        all("[data-review]").forEach(function (x) { x.className = "btn sm"; });
        b.className = "btn sm on " + (chosen === "recommend" ? "recommend" : "reject");
      };
    });
    function doSave() {
      var note = "";
      var ta = document.getElementById("reviewNote");
      if (ta) note = ta.value.trim();
      if (!chosen) { UI.toast("请先选择审核结论", "warn"); return false; }
      S.reviewCandidate(id, chosen, note);
      UI.toast("已保存：" + REVIEW_LABEL[chosen], "ok");
      return true;
    }
    var saveNext = document.getElementById("btnSaveNext");
    if (saveNext) saveNext.onclick = function () {
      if (!doSave()) return;
      nextPending(id);
    };

    var rp = document.getElementById("btnRetryParse");
    if (rp) rp.onclick = function () { S.retryParse(id); UI.toast("正在重新解析…"); };
    var up = document.getElementById("btnUploadNew");
    if (up) up.onclick = function () { UI.toast("已模拟重新上传并解析", "ok"); };
    var ed2 = document.getElementById("btnEditCand2");
    if (ed2) ed2.onclick = function () { window.Admin.candidateForm(c, c.jobId, function () { renderCandidate(id); }); };
    var rm2 = document.getElementById("btnRemoveCand2");
    if (rm2) rm2.onclick = function () { window.Drawers.confirmRemove(c, function () { UI.closeDrawer(); }); };
    var ed = document.getElementById("btnEditCand");
    if (ed) ed.onclick = function () { window.Admin.candidateForm(c, c.jobId, function () { renderCandidate(id); }); };
    var rm = document.getElementById("btnRemoveCand");
    if (rm) rm.onclick = function () { window.Drawers.confirmRemove(c, function () { UI.closeDrawer(); }); };
  }

  function nextPending(id) {
    var S = window.Store, UI = window.UI;
    var c = S.getCandidate(id);
    var ids = navIds(c);
    var idx = ids.indexOf(id);
    var nextId = null, i;
    for (i = idx + 1; i < ids.length; i++) {
      var n1 = S.getCandidate(ids[i]);
      if (n1 && n1.reviewStatus === "pending" && n1.conclusion !== "failed") { nextId = ids[i]; break; }
    }
    if (!nextId) {
      for (i = 0; i < idx; i++) {
        var n2 = S.getCandidate(ids[i]);
        if (n2 && n2.reviewStatus === "pending" && n2.conclusion !== "failed") { nextId = ids[i]; break; }
      }
    }
    if (nextId) renderCandidate(nextId, 0);
    else { UI.toast("本批待复核已全部处理完", "ok"); renderCandidate(id, 0); }
  }

  function bindCommon(id, ids, idx) {
    var UI = window.UI;
    var root = document.getElementById("drawerRoot");
    var close = root.querySelector("[data-drawer-close]");
    if (close) close.onclick = UI.closeDrawer;
    var mask = root.querySelector("[data-drawer-mask]");
    if (mask) mask.onclick = UI.closeDrawer;

    Array.prototype.slice.call(root.querySelectorAll("[data-nav]")).forEach(function (b) {
      if (b.disabled) return;
      b.onclick = function () {
        var dir = parseInt(b.getAttribute("data-nav"), 10);
        var next = ids[idx + dir];
        if (next) renderCandidate(next, 0);
      };
    });

    var drawer = root.querySelector(".drawer");
    if (drawer) {
      drawer.onkeydown = function (e) {
        var t = e.target.tagName;
        if (t === "INPUT" || t === "TEXTAREA" || t === "SELECT") return;
        if (e.key === "ArrowLeft" && idx > 0) { e.preventDefault(); renderCandidate(ids[idx - 1], 0); }
        if (e.key === "ArrowRight" && idx < ids.length - 1) { e.preventDefault(); renderCandidate(ids[idx + 1], 0); }
      };
      drawer.setAttribute("tabindex", "-1");
      drawer.focus();
    }
  }

  window.Drawers.confirmRemove = function (c, after) {
    var S = window.Store, UI = window.UI;
    var job = S.getJob(c.jobId);
    UI.modal({
      title: "移出本批次",
      desc: "该候选人将从「" + (job ? job.title : "—") + "」批次中移除。",
      body: '<div class="confirm-banner warn" style="margin:0"><span>!</span><div class="grow">' +
        esc(c.name) + "（" + esc(c.id) + "）<br/>" +
        "移出后可从 ATS 归档中恢复。</div></div>",
      confirmText: "确认移出",
      onConfirm: function () {
        S.removeCandidate(c.id);
        UI.toast("已移出批次：" + c.name, "ok");
        if (after) after();
      }
    });
  };

  window.Drawers.candidate = function (id) {
    TAB = "ev";
    NOTE_OPEN = false;
    renderCandidate(id, 0);
  };
})();
