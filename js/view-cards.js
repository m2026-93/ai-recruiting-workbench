(function () {
  window.Views = window.Views || {};

  // 小卡内联 AI 产出物的展开状态
  var AG_OPEN = {};

  function miniCard(card, S, UI, A) {
    var job = S.getJob(card.jobId);
    var cand = card.candidateId ? S.getCandidate(card.candidateId) : null;
    var wait = card.type === "screening_anomaly" || card.type === "position_gap"
      ? UI.relHours(card.sinceAt)
      : UI.waitText(card);
    var obj = card.candidateId
      ? UI.esc(job.title) + " · " + UI.esc(cand ? cand.name : "—") + " · " + UI.esc(card.stage)
      : UI.esc(job.title) + " · " + UI.esc(card.stage);

    var acts = "";
    if (card.status === "active") {
      acts =
        '<button class="btn xs ghost" data-card-defer="' + card.id + '">暂缓</button>' +
        '<button class="btn xs" data-card-ack="' + card.id + '">已知悉</button>';
    } else if (card.status === "deferred") {
      acts = '<span class="small muted">暂缓至 ' + UI.fmtTime(card.deferUntil) + "</span>" +
        '<button class="btn xs ghost" data-card-reopen="' + card.id + '">恢复</button>';
    } else {
      acts = '<span class="small muted">' + UI.fmtTime(card.ackAt) + " 已知悉</span>";
    }

    var draft = A.draft(card);
    var agBtn = card.status === "active"
      ? '<button class="mc-ag-btn" data-ag="' + card.id + '"><span class="ag-ic">AI</span>' +
        (draft.kind === "msg" ? "沟通稿" : "行动建议") + "</button>"
      : "";

    return '<div class="mini-card' + (card.status === "deferred" ? " is-deferred" : card.status === "ack" ? " is-ack" : "") + '"' +
      ' data-card-open="' + card.id + '">' +
      '<div class="mc-top">' +
        '<span class="mc-cat">' + UI.esc(card.typeLabel) + "</span>" +
        "<b>" + UI.esc(card.title) + "</b>" +
        '<span class="mc-wait">' + wait + "</span>" +
      "</div>" +
      '<div class="mc-obj">' + obj + "</div>" +
      '<div class="mc-sug">' + UI.esc(card.suggestions[0]) + "</div>" +
      '<div class="mc-foot">' + agBtn + '<div class="spacer"></div>' + acts + "</div>" +
      '<div class="mc-ag" id="ag_' + card.id + '" style="display:' + (AG_OPEN[card.id] ? "block" : "none") + '">' +
        (AG_OPEN[card.id] ? A.draftHtml(card, "c" + card.id) : "") +
      "</div>" +
    "</div>";
  }

  // AI 简报：先说清有几件事、先做哪件
  function briefBar(cards, S, UI, A) {
    var b = A.brief(cards);
    var merges = A.mergeGroups(cards);
    return '<div class="ag-brief"><span class="ag-ic">AI</span>' +
      '<div class="abb-t">' + b.text +
        '<div class="abb-g">' + b.groups.map(function (g) {
          return '<span class="ag-chip' + (g.maxH >= 24 ? " hot" : "") + '">' + UI.esc(g.label) + " <b>" + g.n + "</b></span>";
        }).join("") + "</div>" +
      "</div>" +
      '<div class="abb-a">' +
        (merges.length
          ? '<button class="btn sm ghost" data-merge="1">合并催办 ' +
            merges.reduce(function (n, m) { return n + m.cards.length; }, 0) + " 条</button>"
          : "") +
        '<button class="btn sm primary" data-agent="1">按建议顺序处理 ' + cards.length + " 条</button>" +
      "</div></div>";
  }

  // 业务角色只看与自己岗位相关的提醒
  function scopedCards(S, tab) {
    var list = S.cardsByStatus(tab);
    if (window.Auth && window.Auth.isBiz()) {
      var ids = S.visibleJobs().map(function (j) { return j.id; });
      list = list.filter(function (c) { return ids.indexOf(c.jobId) > -1; });
    }
    return list;
  }

  window.Views.cards = function (el) {
    var S = window.Store, UI = window.UI, A = window.Agent, st = S.state;
    var tab = st.cardsTab || "active";
    var f = st.cardFilters || { cat: "all", job: "all" };

    var all = scopedCards(S, tab);
    var list = all.filter(function (c) {
      var rule = S.state.rules.filter(function (r) { return r.id === c.ruleId; })[0];
      var cat = rule ? rule.cat : "flow";
      if (f.cat !== "all" && cat !== f.cat) return false;
      if (f.job !== "all" && c.jobId !== f.job) return false;
      return true;
    });

    var nActive = scopedCards(S, "active").length, nDefer = scopedCards(S, "deferred").length, nAck = scopedCards(S, "ack").length;
    var enabledRules = S.state.rules.filter(function (r) { return r.enabled; }).length;

    var html = "";
    if (tab === "active" && list.length) html += briefBar(list, S, UI, A);

    html += '<div class="toolbar" style="margin-bottom:12px">' +
      '<div class="seg" id="segCardTab">' +
        ['<button data-tab="active" class="' + (tab === "active" ? "on" : "") + '">待关注 ' + nActive + "</button>",
         '<button data-tab="deferred" class="' + (tab === "deferred" ? "on" : "") + '">已暂缓 ' + nDefer + "</button>",
         '<button data-tab="ack" class="' + (tab === "ack" ? "on" : "") + '">已知悉 ' + nAck + "</button>"].join("") +
      "</div>" +
      '<select id="selCat">' +
        '<option value="all"' + (f.cat === "all" ? " selected" : "") + ">全部类别</option>" +
        Object.keys(window.DATA.RULE_CATS).map(function (k) {
          return '<option value="' + k + '"' + (f.cat === k ? " selected" : "") + ">" + window.DATA.RULE_CATS[k] + "</option>";
        }).join("") +
      "</select>" +
      '<select id="selCardJob">' +
        '<option value="all"' + (f.job === "all" ? " selected" : "") + ">全部岗位</option>" +
        st.jobs.map(function (j) {
          return '<option value="' + j.id + '"' + (f.job === j.id ? " selected" : "") + ">" + UI.esc(j.title) + "</option>";
        }).join("") +
      "</select>" +
      '<div class="spacer"></div>' +
      '<span class="small muted">规则 ' + enabledRules + " / " + S.state.rules.length + " 启用</span>" +
      '<button class="btn sm ghost" id="btnRules">规则配置</button>' +
    "</div>";

    html += list.length
      ? '<div class="mini-grid">' + list.map(function (c) { return miniCard(c, S, UI, A); }).join("") + "</div>"
      : '<div class="panel empty"><b>' + (tab === "active" ? "当前没有需要关注的提醒" : tab === "deferred" ? "没有暂缓中的提醒" : "还没有已知悉的提醒") +
        "</b>规则会在数据更新时自动检测</div>";

    // 业务反馈跟踪：由推荐单实时派生，未超时只跟踪、不打扰
    var tracks = [];
    st.jobs.forEach(function (j) {
      S.recommends(j.id).forEach(function (r) {
        var wait = S.hoursSince(r.at);
        var pendingN = r.candidateIds.filter(function (id) {
          var c = S.getCandidate(id);
          return !c || c.bizFeedback === "pending";
        }).length;
        if (pendingN > 0) tracks.push({ job: j, rec: r, wait: wait, pendingN: pendingN, overdue: wait >= r.expectHours });
      });
    });
    tracks.sort(function (a, b) { return (b.overdue ? 1 : 0) - (a.overdue ? 1 : 0) || b.wait - a.wait; });

    html += '<div class="panel" style="margin-top:14px"><div class="panel-head"><div><h2>业务反馈跟踪</h2></div>' +
      '<span class="tag ' + (tracks.some(function (t) { return t.overdue; }) ? "failed" : "muted") + '">' +
      tracks.filter(function (t) { return t.overdue; }).length + " 超时 / " + tracks.length + " 跟踪中</span></div>" +
      (tracks.length
        ? '<div class="table-wrap"><table class="tbl"><thead><tr>' +
          "<th>推荐单</th><th>岗位</th><th>接收人</th><th>人数</th><th>已等待 / 阈值</th><th>状态</th><th></th>" +
          "</tr></thead><tbody>" + tracks.map(function (t) {
            return "<tr>" +
              '<td class="t-job"><b>' + UI.esc(t.rec.id) + '</b><div class="muted small">' + UI.fmtTime(t.rec.at) + "</div></td>" +
              '<td class="small">' + UI.esc(t.job.title) + "</td>" +
              '<td class="small">' + UI.esc(t.rec.to) + "</td>" +
              "<td>" + t.pendingN + " 人</td>" +
              '<td class="small">' + t.wait + " h / " + t.rec.expectHours + " h</td>" +
              "<td>" + (t.overdue ? '<span class="tag failed">已超时 ' + (t.wait - t.rec.expectHours) + " h</span>"
                : '<span class="tag review">等待中</span>') + "</td>" +
              '<td style="text-align:right"><button class="btn sm" data-track-open="' + t.rec.id + '">催办话术</button></td>' +
            "</tr>";
          }).join("") + "</tbody></table></div>"
        : '<div class="empty"><b>暂无推荐跟踪</b>推选候选人给业务部门后，这里会实时跟踪</div>') +
      "</div>";

    el.innerHTML = html;

    el.querySelectorAll("[data-tab]").forEach(function (b) {
      b.onclick = function () { S.setCardsTab(b.getAttribute("data-tab")); };
    });
    var sc = document.getElementById("selCat");
    if (sc) sc.onchange = function () { S.setCardFilter({ cat: sc.value }); };
    var sj = document.getElementById("selCardJob");
    if (sj) sj.onchange = function () { S.setCardFilter({ job: sj.value }); };
    var br = document.getElementById("btnRules");
    if (br) br.onclick = function () { window.Admin.openRules(); };

    // AI 处理台：按建议顺序逐条清
    el.querySelectorAll("[data-agent]").forEach(function (b) {
      b.onclick = function () {
        var ids = scopedCards(S, "active").map(function (c) { return c.id; });
        A.console(ids, function () { S.emit(); });
      };
    });

    // 同类合并：一次沟通多条
    el.querySelectorAll("[data-merge]").forEach(function (b) {
      b.onclick = function () {
        var cards = scopedCards(S, "active");
        var groups = A.mergeGroups(cards);
        var g = groups[0];
        if (!g) return;
        var text = A.mergeText(g.cards);
        UI.modal({
          title: "合并催办 · " + (window.DATA.CARD_TYPE_LABEL[g.type] || "同类提醒") + " " + g.cards.length + " 条",
          desc: "AI 把同类提醒合成一版沟通稿，复制后由你一次性发出。",
          wide: true,
          confirmText: "复制话术",
          body:
            '<div class="table-wrap"><table class="tbl"><thead><tr><th>涉及</th><th>岗位</th><th>等待</th></tr></thead><tbody>' +
            g.cards.map(function (c) {
              var cd = c.candidateId ? S.getCandidate(c.candidateId) : null;
              var jb = S.getJob(c.jobId);
              return "<tr><td>" + UI.esc(cd ? cd.name : jb.title) + "</td><td class='small'>" + UI.esc(jb.title) +
                "</td><td class='small'>" + A.wait(c) + "</td></tr>";
            }).join("") + "</tbody></table></div>" +
            '<div class="field" style="margin-top:10px"><label>合并沟通稿（可自行修改）</label>' +
            '<textarea class="textarea" id="mergeBox" style="height:200px">' + UI.esc(text) + "</textarea></div>",
          onConfirm: function (root) {
            A.copy(root.querySelector("#mergeBox").value);
          }
        });
      };
    });

    // 卡片内联展开 AI 产出物
    el.querySelectorAll("[data-ag]").forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        var id = b.getAttribute("data-ag");
        var box = el.querySelector("#ag_" + id);
        if (!box) return;
        if (AG_OPEN[id]) {
          AG_OPEN[id] = false;
          box.style.display = "none";
          box.innerHTML = "";
          return;
        }
        AG_OPEN[id] = true;
        var card = S.getCard(id);
        box.style.display = "block";
        box.innerHTML = A.draftHtml(card, "c" + id);
        A.bindDraft(box, card, "c" + id);
      };
    });

    el.querySelectorAll("[data-card-open]").forEach(function (b) {
      b.onclick = function (e) {
        if (e.target.closest("button")) return;
        window.Drawers.card(b.getAttribute("data-card-open"));
      };
    });
    el.querySelectorAll("[data-card-ack]").forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        window.Drawers.ackDialog(b.getAttribute("data-card-ack"));
      };
    });
    el.querySelectorAll("[data-card-defer]").forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        window.Drawers.deferDialog(b.getAttribute("data-card-defer"));
      };
    });
    el.querySelectorAll("[data-card-reopen]").forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        S.reopenCard(b.getAttribute("data-card-reopen"));
        UI.toast("已恢复提醒", "ok");
      };
    });
    el.querySelectorAll("[data-track-open]").forEach(function (b) {
      b.onclick = function () { window.Admin.openTrack(b.getAttribute("data-track-open")); };
    });
  };
})();
