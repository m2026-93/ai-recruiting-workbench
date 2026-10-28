(function () {
  window.Drawers = window.Drawers || {};

  function statusTag(card) {
    if (card.status === "ack") return '<span class="tag muted">已知悉</span>';
    if (card.status === "deferred") return '<span class="tag review">暂缓中</span>';
    return '<span class="tag accent">待关注</span>';
  }

  function rawRows(card, S, UI) {
    var job = S.getJob(card.jobId);
    var cand = card.candidateId ? S.getCandidate(card.candidateId) : null;
    var rows = [];
    rows.push(["job_id", job.id, "—"]);
    if (cand) {
      rows.push(["candidate_id", cand.id, UI.fmtTime(cand.stageUpdatedAt)]);
      rows.push(["current_stage", card.stage, UI.fmtTime(cand.stageUpdatedAt)]);
      rows.push(["interview_at", cand.interviewAt ? UI.fmtTime(cand.interviewAt) : "—", UI.fmtTime(cand.interviewAt || cand.stageUpdatedAt)]);
      rows.push(["feedback_status", cand.feedbackStatus || "n/a", UI.fmtTime(card.sinceAt)]);
    } else {
      rows.push(["batch_id", job.batch.id, UI.fmtTime(job.batch.finishedAt)]);
      rows.push(["screening_result", "高匹配 " + (card.statsHigh || 0) + " / 已处理 " + (card.statsProcessed || 0), UI.fmtTime(card.sinceAt)]);
    }
    rows.push(["stage_updated_at", UI.fmtTime(card.sinceAt), UI.fmtTime(card.sinceAt)]);
    rows.push(["rule_id", card.ruleId, "—"]);
    return rows.map(function (r) {
      return '<tr><td class="mono">' + UI.esc(r[0]) + "</td><td>" + UI.esc(r[1]) + '</td><td class="mono muted">' + UI.esc(r[2]) + "</td></tr>";
    }).join("");
  }

  function renderCard(id) {
    var S = window.Store, UI = window.UI, A = window.Agent;
    var card = S.getCard(id);
    if (!card) return;
    var job = S.getJob(card.jobId);
    var cand = card.candidateId ? S.getCandidate(card.candidateId) : null;
    var isAnomaly = card.type === "screening_anomaly";
    var wait = isAnomaly || card.type === "position_gap" ? UI.relHours(card.sinceAt) : UI.waitText(card);
    var chain = A.chain(card);

    var html = '<div class="drawer-head"><div><div class="ttl">' +
      '<span class="ct-type ' + (isAnomaly ? "anomaly" : "blocker") + '">' + UI.esc(card.typeLabel) + "</span>" +
      "<h2>" + UI.esc(card.title) + "</h2>" + statusTag(card) + "</div>" +
      '<div class="meta">' + UI.esc(job.title) + "　·　" + UI.esc(cand ? cand.name + " · " + card.stage : card.stage) + "</div></div>" +
      '<button class="icon-btn" data-drawer-close="1">×</button></div>';

    html += '<div class="drawer-body">';

    // AI 判断链路：怎么发现的
    html += '<div class="sec"><div class="agc-st"><span class="ag-ic">AI</span>AI 判断链路</div>' +
      '<div class="agc-chain">' + chain.map(function (s, k) {
        return '<div class="ch-i"><span class="ch-n">' + (k + 1) + "</span>" +
          '<div><b>' + UI.esc(s.t) + '</b><div class="small muted">' + UI.esc(s.d) + "</div></div></div>";
      }).join("") + "</div></div>";

    // AI 产出物：话术或行动清单
    html += '<div class="sec">' + A.draftHtml(card, "dk") + "</div>";

    // 关键信息
    html += '<div class="sec"><h3>关键信息</h3><div class="kv-grid">' +
      '<dl class="kv"><dt>关联岗位</dt><dd>' + UI.esc(job.title) + "</dd></dl>" +
      (cand
        ? '<dl class="kv"><dt>候选人</dt><dd>' + UI.esc(cand.name) + "</dd></dl>"
        : '<dl class="kv"><dt>范围</dt><dd>' + UI.esc(card.stage) + "</dd></dl>") +
      '<dl class="kv"><dt>' + UI.esc(card.sinceLabel) + "</dt><dd>" + UI.fmtTime(card.sinceAt) + "</dd></dl>" +
      '<dl class="kv"><dt>已等待</dt><dd style="color:var(--accent)">' + wait + "</dd></dl>" +
      '<dl class="kv" style="grid-column:1/-1"><dt>触发规则</dt><dd>' + UI.esc(card.ruleText) + "</dd></dl>" +
    "</div></div>";

    if (isAnomaly) html += '<div class="hint">无历史基线，以上仅为当前批次观察结果</div>';

    html += '<div class="sec"><details><summary style="cursor:pointer;font-size:12.5px;font-weight:600;color:var(--ink-2);padding:2px 0">原始数据 · ATS 同步字段</summary>' +
      '<div class="panel" style="box-shadow:none;margin-top:8px"><div class="table-wrap"><table class="tbl">' +
      '<thead><tr><th>字段</th><th>值</th><th>更新时间</th></tr></thead><tbody>' + rawRows(card, S, UI) + "</tbody></table></div></div></details></div>";

    if (card.status === "ack") {
      html += '<div class="sec"><h3>已知悉记录</h3><div class="summary-box">' +
        "处理人：" + UI.esc(card.ackBy || "—") + "　·　" + UI.fmtDateFull(card.ackAt) +
        (card.ackNote ? "<br/>备注：" + UI.esc(card.ackNote) : "") + "</div></div>";
    }
    if (card.status === "deferred") {
      html += '<div class="sec"><h3>暂缓记录</h3><div class="summary-box">暂缓至 ' + UI.fmtTime(card.deferUntil) +
        "　·　到期后条件仍成立会重新提醒。</div></div>";
    }

    html += "</div>";

    html += '<div class="drawer-foot">';
    if (card.status === "active") {
      html += '<button class="btn" id="btnDefer">暂缓提醒</button>' +
        '<div style="flex:1"></div>' +
        '<button class="btn primary" id="btnAck">已知悉</button>';
    } else if (card.status === "deferred") {
      html += '<span class="small muted">暂缓至 ' + UI.fmtTime(card.deferUntil) + "</span>" +
        '<div style="flex:1"></div><button class="btn" id="btnReopen">恢复提醒</button>';
    } else {
      html += '<span class="small muted">已知悉</span><div style="flex:1"></div>' +
        '<button class="btn" data-drawer-close="1">关闭</button>';
    }
    html += "</div>";

    window.UI.drawer(html);
    document.querySelector("[data-drawer-close]").onclick = window.UI.closeDrawer;
    document.querySelector("[data-drawer-mask]").onclick = window.UI.closeDrawer;

    var root = document.querySelector(".drawer");
    if (root) {
      A.bindDraft(root, card, "dk");
      var jb = root.querySelector("[data-jump]");
      if (jb) jb.onclick = function () {
        var d = A.draft(card);
        if (d.jump) { window.UI.closeDrawer(); d.jump.run(); }
      };
    }

    var df = document.getElementById("btnDefer");
    if (df) df.onclick = function () { window.Drawers.deferDialog(card.id); };
    var ak = document.getElementById("btnAck");
    if (ak) ak.onclick = function () { window.Drawers.ackDialog(card.id); };
    var ro = document.getElementById("btnReopen");
    if (ro) ro.onclick = function () {
      S.reopenCard(card.id);
      window.UI.toast("已恢复提醒", "ok");
      window.UI.closeDrawer();
    };
  }

  window.Drawers.card = function (id) { renderCard(id); };

  window.Drawers.ackDialog = function (id) {
    var S = window.Store, UI = window.UI;
    var card = S.getCard(id);
    if (!card) return;
    UI.modal({
      title: "标记为已知悉",
      
      body:
        window.PeoplePicker.field({
          id: "ackCc", label: "知会同事（可选）", value: "",
          multiple: true, hint: "记录由谁跟进"
        }) +
        '<div class="field"><label>备注（可选）</label>' +
        '<textarea class="textarea" id="ackNote" placeholder="例如：已与面试官沟通，反馈今天下班前补充"></textarea></div>',
      confirmText: "标记已知悉",
      onConfirm: function (root) {
        var note = root.querySelector("#ackNote").value.trim();
        var cc = window.PeoplePicker.read(root, "ackCc");
        if (cc) note = (note ? note + "　·　" : "") + "知会：" + cc;
        S.ackCard(id, note);
        UI.toast("已标记已知悉", "ok");
        if (document.getElementById("drawerRoot").innerHTML) window.UI.closeDrawer();
      }
    });
    var m = document.querySelector("#modalRoot .modal");
    if (m) window.PeoplePicker.bind(m, { id: "ackCc", value: "", multiple: true });
  };

  window.Drawers.deferDialog = function (id) {
    var S = window.Store, UI = window.UI;
    var card = S.getCard(id);
    if (!card) return;
    UI.modal({
      title: "暂缓提醒",
      desc: "暂缓结束后重新检查触发条件。",
      body:
        '<div class="field"><label>暂缓时长</label>' +
        '<div style="display:flex;gap:10px">' +
          '<label class="btn" style="flex:1;justify-content:center"><input type="radio" name="deferDays" value="1" checked style="margin-right:6px"/>1 天</label>' +
          '<label class="btn" style="flex:1;justify-content:center"><input type="radio" name="deferDays" value="3" style="margin-right:6px"/>3 天</label>' +
        "</div></div>",
      confirmText: "确认暂缓",
      onConfirm: function (root) {
        var days = parseInt(root.querySelector('input[name="deferDays"]:checked').value, 10);
        S.deferCard(id, days);
        UI.toast("已暂缓 " + days + " 天", "ok");
        if (document.getElementById("drawerRoot").innerHTML) window.UI.closeDrawer();
      }
    });
  };
})();
