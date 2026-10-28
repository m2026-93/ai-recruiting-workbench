(function () {
  window.Views = window.Views || {};

  function mc(card, S, UI) {
    var job = S.getJob(card.jobId);
    var cand = card.candidateId ? S.getCandidate(card.candidateId) : null;
    var wait = card.type === "screening_anomaly" || card.type === "position_gap"
      ? UI.relHours(card.sinceAt) : UI.waitText(card);
    var obj = card.candidateId
      ? UI.esc(job.title) + " · " + UI.esc(cand ? cand.name : "—")
      : UI.esc(job.title);
    return '<div class="mini-card" data-card-open="' + card.id + '">' +
      '<div class="mc-top"><span class="mc-cat">' + UI.esc(card.typeLabel) + "</span>" +
        "<b>" + UI.esc(card.title) + "</b>" +
        '<span class="mc-wait">' + wait + "</span></div>" +
      '<div class="mc-obj">' + obj + " · " + UI.esc(card.stage) + "</div>" +
      '<div class="mc-sug">' + UI.esc(card.suggestions[0]) + "</div>" +
      '<div class="mc-foot">' + '<div class="spacer"></div>' +
        '<button class="btn xs ghost" data-card-defer="' + card.id + '">暂缓</button>' +
        '<button class="btn xs" data-card-ack="' + card.id + '">已知悉</button></div>' +
    "</div>";
  }

  // 业务对接人展示 + 更换（从企业通讯录搜索）
  function ownerChip(job, UI, compact) {
    var e = window.DATA.empByName(job.bizOwner);
    var raw = String(job.bizOwner || "");
    var nm = e ? e.name : raw.split("（")[0];
    var tt = compact ? "" : (e ? e.title : raw.replace(/^.*（/, "").replace(/）$/, ""));
    if (!nm) return '<span class="owner-chip empty">未设置</span>';
    return '<span class="owner-chip"><i class="pp-av">' + UI.esc(nm.slice(0, 1)) + "</i>" +
      '<span class="oc-n">' + UI.esc(nm) + "</span>" +
      (tt ? '<span class="oc-t">' + UI.esc(tt) + "</span>" : "") + "</span>";
  }
  function ownerLine(job, UI) {
    return '<div class="owner-line" style="margin-top:10px">' +
      '<span class="ol-k">业务对接人</span>' + ownerChip(job, UI) +
      '<button class="btn xs" data-owner-edit="' + job.id + '">' + (job.bizOwner ? "更换" : "设置") + "</button>" +
      "</div>";
  }

  // ---------- 业务负责人视角：只关心「推给我的人」----------
  function bizDash(el, S, UI) {
    var A = window.Auth, u = A.user();
    var myJobs = S.visibleJobs();
    var myJobIds = myJobs.map(function (j) { return j.id; });
    var recs = S.myRecommends();

    var items = [];
    recs.forEach(function (r) {
      r.candidateIds.forEach(function (id) {
        var c = S.getCandidate(id);
        if (!c || c.bizFeedback !== "pending") return;
        var h = S.hoursSince(r.at);
        items.push({ rec: r, cand: c, h: h, overdue: h >= (r.expectHours || 48) });
      });
    });
    items.sort(function (a, b) { return b.h - a.h; });

    var doneN = 0;
    recs.forEach(function (r) {
      Object.keys(r.bizFeedback || {}).forEach(function (k) {
        if (r.bizFeedback[k] && r.bizFeedback[k].by === u.name) doneN++;
      });
    });
    var overdueN = items.filter(function (i) { return i.overdue; }).length;

    var myCards = S.cardsByStatus("active").filter(function (c) { return myJobIds.indexOf(c.jobId) > -1; });

    // 按推荐单分组
    var byRec = {};
    items.forEach(function (i) {
      if (!byRec[i.rec.id]) byRec[i.rec.id] = { rec: i.rec, list: [] };
      byRec[i.rec.id].list.push(i);
    });
    var groups = Object.keys(byRec).map(function (k) { return byRec[k]; })
      .sort(function (a, b) { return Math.max.apply(null, b.list.map(function (x) { return x.h; })) - Math.max.apply(null, a.list.map(function (x) { return x.h; })); });

    var hour = new Date().getHours();
    var hello = (hour < 12 ? "上午好" : hour < 18 ? "下午好" : "晚上好") + "，" + u.name;

    var html = "";
    html += '<div class="dash-head"><div><h2>' + UI.esc(hello) + "</h2>" +
      "<p>" + (items.length
        ? "有 <b>" + items.length + "</b> 位候选人等你反馈" + (overdueN ? " · <b style=\"color:var(--accent)\">" + overdueN + " 位已超时</b>" : "")
        : "暂无待反馈的推荐单，HR 推选后会出现在这里") + "</p></div></div>";

    html += '<div class="stat-row">' +
      '<div class="stat"><div class="lbl">待我反馈</div><div class="num">' + items.length + "<small>人</small></div>" +
        '<div class="foot">来自 ' + groups.length + " 张推荐单</div></div>" +
      '<div class="stat" style="cursor:' + (overdueN ? "pointer" : "default") + '" data-biz-fb-first="' + (overdueN && groups[0] ? groups[0].rec.id : "") + '"><div class="lbl">超时未反馈</div>' +
        '<div class="num" style="color:' + (overdueN ? "var(--accent)" : "inherit") + '">' + overdueN + "<small>人</small></div>" +
        '<div class="foot">' + (overdueN ? "已超过期望反馈时长" : "都在期望时长内") + "</div></div>" +
      '<div class="stat"><div class="lbl">我已反馈</div><div class="num">' + doneN + "<small>人</small></div>" +
        '<div class="foot">点击查看处理记录</div></div>' +
      '<div class="stat primary-stat"><div class="lbl">我的岗位</div>' +
        '<div class="num" style="font-size:15px;letter-spacing:0;font-weight:600;line-height:1.5">' +
          UI.esc(myJobs.length ? myJobs[0].title : "暂无负责岗位") + "</div>" +
        '<div class="foot">' + (myJobs.length > 1 ? "共 " + myJobs.length + " 个在招岗位" : UI.esc(myJobs[0] ? myJobs[0].dept : "")) + "</div>" +
      "</div>" +
    "</div>";

    html += '<div class="dash-grid"><div class="dash-col">';

    html += '<div class="panel"><div class="panel-head"><div><h2>待我反馈</h2>' +
      '<div class="small muted">看完简历再给结论，反馈会同步回招聘 HR</div></div>' +
      (groups.length ? '<button class="btn sm primary" data-biz-fb="' + groups[0].rec.id + '">逐条反馈</button>' : "") +
      "</div>" +
      (groups.length
        ? '<div class="fb-list">' + groups.map(function (g) {
            var r = g.rec;
            var job = S.getJob(r.jobId) || {};
            var maxH = Math.max.apply(null, g.list.map(function (x) { return x.h; }));
            var overdue = maxH >= (r.expectHours || 48);
            return '<div class="fb-item">' +
              '<div class="fb-head"><div class="fb-t"><b>' + UI.esc(job.title || "") + "</b>" +
                '<span class="tag muted">' + UI.esc(r.id) + "</span></div>" +
                '<span class="fb-wait' + (overdue ? " overdue" : "") + '">' + UI.relHours(r.at) + "前推选</span></div>" +
              '<div class="fb-cands">' + g.list.map(function (x) {
                return '<button class="fb-cand" data-cand="' + x.cand.id + '">' +
                  '<i class="pp-av">' + UI.esc(x.cand.name.slice(0, 1)) + "</i>" +
                  "<span>" + UI.esc(x.cand.name) + "</span>" +
                  '<em class="fb-cl ' + x.cand.conclusion + '">' +
                    (x.cand.conclusion === "high" ? "高匹配" : x.cand.conclusion === "review" ? "待确认" : "低匹配") + "</em></button>";
              }).join("") + "</div>" +
              '<div class="fb-foot"><span class="small muted">推选人 ' + UI.esc(r.by) + " · 期望 " + (r.expectHours || 48) + " 小时内反馈" +
                (r.note ? " · " + UI.esc(r.note) : "") + "</span><div class=\"spacer\"></div>" +
                '<button class="btn sm primary" data-biz-fb="' + r.id + '">反馈（' + g.list.length + " 人）</button></div>" +
            "</div>";
          }).join("") + "</div>"
        : '<div class="empty"><b>暂无待反馈的候选人</b>HR 推选后会在这里提醒你，并同步到 AI 提醒助手</div>') +
      "</div>";

    // 最近反馈（这个人反馈过的）
    var hist = [];
    recs.forEach(function (r) {
      Object.keys(r.bizFeedback || {}).forEach(function (cid) {
        var f = r.bizFeedback[cid];
        if (!f || f.by !== u.name) return;
        var c = S.getCandidate(cid);
        hist.push({ f: f, c: c, r: r });
      });
    });
    hist.sort(function (a, b) { return new Date(b.f.at) - new Date(a.f.at); });
    if (hist.length) {
      html += '<div class="panel"><div class="panel-head"><div><h2>我的反馈记录</h2></div></div>' +
        '<div class="table-wrap"><table class="tbl"><thead><tr><th>候选人</th><th>岗位</th><th>结论</th><th>时间</th></tr></thead><tbody>' +
        hist.slice(0, 6).map(function (x) {
          var lb = { interview: "同意推进面试", reject: "不合适", hold: "待定" }[x.f.result] || "—";
          var cls = x.f.result === "interview" ? "high" : x.f.result === "reject" ? "low" : "review";
          return "<tr><td><b>" + UI.esc(x.c ? x.c.name : "—") + "</b></td>" +
            '<td class="small">' + UI.esc((S.getJob(x.r.jobId) || {}).title || "") + "</td>" +
            '<td><span class="tag ' + cls + '">' + lb + "</span></td>" +
            '<td class="small muted">' + UI.fmtTime(x.f.at) + "</td></tr>";
        }).join("") + "</tbody></table></div></div>";
    }

    html += '</div><div class="dash-col">';
    html += '<div class="panel"><div class="panel-head"><div><h2>AI 提醒助手</h2>' +
      '<div class="small muted">只提醒，不执行</div></div>' +
      '<button class="btn sm ghost" data-goto-cards="1">全部</button></div>' +
      (myCards.length
        ? '<div class="mini-grid one-col">' + myCards.slice(0, 4).map(function (c) { return mc(c, S, UI); }).join("") + "</div>"
        : '<div class="empty"><b>暂无与你相关的提醒</b>面试反馈、推荐超时等会在这里出现</div>') +
      "</div>";
    html += "</div></div>";

    el.innerHTML = html;

    el.querySelectorAll("[data-biz-fb]").forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute("data-biz-fb");
        if (!id) return;
        window.Admin.bizFeedback(id);
      };
    });
    el.querySelectorAll("[data-biz-fb-first]").forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute("data-biz-fb-first");
        if (id) window.Admin.bizFeedback(id);
      };
    });
    el.querySelectorAll("[data-goto-cards]").forEach(function (b) {
      b.onclick = function () { S.setRoute("cards"); };
    });
    el.querySelectorAll("[data-cand]").forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        window.Drawers.candidate(b.getAttribute("data-cand"));
      };
    });
    el.querySelectorAll("[data-card-open]").forEach(function (b) {
      b.onclick = function (e) {
        if (e.target.closest("button")) return;
        window.Drawers.card(b.getAttribute("data-card-open"));
      };
    });
    el.querySelectorAll("[data-card-ack]").forEach(function (b) {
      b.onclick = function (e) { e.stopPropagation(); window.Drawers.ackDialog(b.getAttribute("data-card-ack")); };
    });
    el.querySelectorAll("[data-card-defer]").forEach(function (b) {
      b.onclick = function (e) { e.stopPropagation(); window.Drawers.deferDialog(b.getAttribute("data-card-defer")); };
    });
  }

  function taskRow(job, S, UI) {
    var b = job.batch;
    var st = S.stats(job.id);
    var stateHtml;
    if (b.status === "completed") stateHtml = '<span class="tag high">初筛已完成</span>';
    else if (b.status === "running") stateHtml = '<span class="tag review"><span class="spin" style="display:inline-block;vertical-align:-2px"></span> 处理中</span>';
    else stateHtml = '<span class="tag muted">待开始</span>';
    var rc = S.recommendStats(job.id);
    return "<tr>" +
      '<td class="t-job">' + UI.esc(job.title) + '<div class="muted small">' + UI.esc(b.id) + "</div></td>" +
      "<td>" + b.total + " 份</td>" +
      "<td>" + stateHtml +
        (b.status === "completed" ? '<div class="muted small">' + b.processed + " 已解析 / " + b.failed + " 失败</div>" : "") + "</td>" +
      '<td class="small muted">' + (b.status === "pending" ? "—" : (st.pendingTotal ? st.pendingTotal + " 份待复核" : "已复核")) + "</td>" +
      '<td class="small"><button class="link-btn" data-owner-edit="' + job.id + '" title="' +
        UI.esc(job.bizOwner || "未设置，点击设置") + ' · 点击更换对接人">' +
        ownerChip(job, UI, true) + "</button></td>" +
      '<td class="small">' + (rc.people
        ? rc.people + " 人已推选" + (rc.waiting ? ' <span class="muted">待反馈 ' + rc.waiting + "</span>" : "")
        : '<span class="muted">—</span>') + "</td>" +
      '<td style="text-align:right;white-space:nowrap">' +
        '<button class="btn sm ghost" data-job-edit="' + job.id + '">编辑</button> ' +
        '<button class="btn sm" data-goto-screen="' + job.id + '">' + (b.status === "pending" ? "开始初筛" : "继续初筛") + "</button>" +
      "</td></tr>";
  }

  window.Views.dashboard = function (el) {
    var S = window.Store, UI = window.UI, st = S.state;
    if (window.Auth && window.Auth.isBiz()) { bizDash(el, S, UI); return; }
    var job = S.curJob();
    var activeCards = S.cardsByStatus("active");
    var pending = S.pendingResumes();
    var doneToday = S.handledToday();
    var top = activeCards[0];

    var mainJob = st.jobs.filter(function (j) { return j.batch.status === "completed"; })[0] || job;
    var mainSt = S.stats(mainJob.id);
    var pct = mainJob.batch.total ? Math.round((mainSt.reviewed / mainJob.batch.total) * 100) : 0;
    var draftJob = st.jobs.filter(function (j) { return j.batch.status === "pending"; })[0];
    var draftJobId = draftJob ? draftJob.id : mainJob.id;

    var u = window.Auth && window.Auth.user();
    var hello = (new Date().getHours() < 12 ? "上午好" : new Date().getHours() < 18 ? "下午好" : "晚上好") + "，" + (u ? u.name : "李萌");

    var html = "";
    html += '<div class="dash-head"><div><h2>' + UI.esc(hello) + "</h2>" +
      "<p>待复核 <b>" + mainSt.pendingTotal + "</b> 份 · 待关注提醒 <b>" + activeCards.length + "</b> 条</p></div></div>";

    html += '<div class="stat-row">' +
      '<div class="stat" data-goto-screen="' + draftJobId + '" style="cursor:pointer"><div class="lbl">待筛简历</div><div class="num">' + pending + "<small>份</small></div>" +
        '<div class="foot">' + (draftJob ? UI.esc(draftJob.title) + " 待开始" : "暂无待筛批次") + "</div></div>" +
      '<div class="stat" data-goto-cards="1" style="cursor:pointer"><div class="lbl">待关注提醒</div><div class="num">' + activeCards.length + "<small>条</small></div>" +
        '<div class="foot">流程类 ' + activeCards.filter(function (c) { return c.type !== "screening_anomaly" && c.type !== "position_gap"; }).length + " 条 · 初筛类 " +
          activeCards.filter(function (c) { return c.type === "screening_anomaly"; }).length + " 条</div></div>" +
      '<div class="stat"><div class="lbl">今日已处理</div><div class="num">' + doneToday + "<small>项</small></div>" +
        '<div class="foot">点击查看日志</div></div>' +
      '<div class="stat primary-stat"><div class="lbl">建议先做</div>' +
        '<div class="num" style="font-size:15px;letter-spacing:0;font-weight:600;line-height:1.5">' +
          (top ? UI.esc(top.title) : "暂无待关注提醒") + "</div>" +
        '<div class="foot">' + (top ? (top.candidateId ? UI.esc(S.getCandidate(top.candidateId).name) + " · 已等待 " + UI.waitText(top) : UI.esc(S.getJob(top.jobId).title)) : "") + "</div>" +
        (top ? '<div style="margin-top:8px"><button class="btn sm primary" data-card-open="' + top.id + '">去看看</button></div>' : "") +
      "</div>" +
    "</div>";

    html += '<div class="dash-grid"><div class="dash-col">';

    html += '<div class="panel"><div class="panel-head"><div><h2>继续初筛</h2></div>' +
      '<div style="display:flex;gap:8px">' +
        '<button class="btn" data-continue-pending="' + mainJob.id + '">待复核 ' + (mainSt.pendingReview || 0) + "</button>" +
        '<button class="btn primary" data-goto-screen="' + mainJob.id + '">进入列表</button>' +
      "</div></div>" +
      '<div class="task-card">' +
        '<div class="task-top"><div><h3>' + UI.esc(mainJob.title) + "</h3>" +
          '<div class="job">' + UI.esc(mainJob.dept) + " · 批次 " + UI.esc(mainJob.batch.id) + "</div></div>" +
          '<span class="tag ' + (mainSt.pendingTotal > 0 ? "review" : "high") + '">' +
            (mainSt.pendingTotal > 0 ? "有 " + mainSt.pendingTotal + " 份待复核" : "本批次已复核完成") + "</span></div>" +
        ownerLine(mainJob, UI) +
        '<div class="task-prog">' +
          '<div class="nums"><span>' + mainJob.batch.total + " 份 · 已处理 " + mainSt.reviewed + " · 待复核 " + mainSt.pendingTotal + "</span>" +
          "<b>" + pct + "%</b></div>" +
          '<div class="progress"><i style="width:' + pct + '%"></i></div>' +
        "</div>" +
        '<div class="task-facts">' +
          '<div class="task-fact" data-fact="high" style="cursor:pointer"><div class="k">高匹配</div><div class="v">' + mainSt.high + "</div></div>" +
          '<div class="task-fact" data-fact="review" style="cursor:pointer"><div class="k">需进一步确认</div><div class="v">' + mainSt.review + "</div></div>" +
          '<div class="task-fact" data-fact="failed" style="cursor:pointer"><div class="k">解析失败</div><div class="v" style="color:var(--accent)">' + mainSt.failed + "</div></div>" +
          '<div class="task-fact" data-fact="rec" style="cursor:pointer"><div class="k">已推选业务</div><div class="v">' + S.recommendStats(mainJob.id).people + "</div></div>" +
          '<div class="task-fact" data-fact="todo" style="cursor:pointer"><div class="k">可推选</div><div class="v">' + S.recommendable(mainJob.id).length + "</div></div>" +
        "</div>" +
      "</div></div>";

    html += '<div class="panel"><div class="panel-head"><div><h2>招聘任务</h2></div>' +
      '<button class="btn sm ghost" id="btnJobsAdmin3">+ 新增岗位</button></div>' +
      '<div class="table-wrap"><table class="tbl recent-tbl"><thead><tr>' +
      "<th>岗位 / 批次</th><th>简历</th><th>状态</th><th>待办</th><th>业务对接人</th><th>推选业务</th><th></th></tr></thead><tbody>" +
      S.visibleJobs().map(function (j) { return taskRow(j, S, UI); }).join("") +      "</tbody></table></div></div>";

    html += '</div><div class="dash-col">';

    html += '<div class="panel"><div class="panel-head"><div><h2>AI 提醒助手</h2>' +
      '<div class="small muted">只提醒，不执行</div></div>' +
      '<div style="display:flex;gap:8px">' +
        (activeCards.length ? '<button class="btn sm primary" data-agent="1">AI 处理 ' + activeCards.length + " 条</button>" : "") +
        '<button class="btn sm ghost" data-goto-cards="1">全部</button></div></div>' +
      (activeCards.length
        ? '<div class="mini-grid one-col">' + activeCards.slice(0, 5).map(function (c) { return mc(c, S, UI); }).join("") + "</div>" +
          (activeCards.length > 5 ? '<div class="panel-head" style="border-top:1px solid var(--line-2);border-bottom:0">' +
            '<button class="btn sm ghost" data-goto-cards="1">查看其余 ' + (activeCards.length - 5) + " 条</button></div>" : "")
        : '<div class="empty"><b>暂无待关注提醒</b>规则会在数据更新时自动检测</div>') +
      "</div>";

    html += "</div></div>";

    el.innerHTML = html;

    el.querySelectorAll("[data-goto-screen]").forEach(function (b) {
      b.onclick = function () {
        S.setJob(b.getAttribute("data-goto-screen"));
        S.setRoute("screening");
      };
    });
    el.querySelectorAll("[data-agent]").forEach(function (b) {
      b.onclick = function () {
        window.Agent.console(activeCards.map(function (c) { return c.id; }), function () { S.emit(); });
      };
    });
    el.querySelectorAll("[data-goto-cards]").forEach(function (b) {
      b.onclick = function () { S.setRoute("cards"); };
    });
    el.querySelectorAll("[data-continue-pending]").forEach(function (b) {
      b.onclick = function () {
        S.setJob(b.getAttribute("data-continue-pending"));
        S.setFilter({ review: "pending", sort: "pending", conclusion: "all", q: "" });
        S.setRoute("screening");
      };
    });
    el.querySelectorAll("[data-job-edit]").forEach(function (b) {
      b.onclick = function () { window.Admin.jobForm(S.getJob(b.getAttribute("data-job-edit"))); };
    });
    // 业务对接人：从企业通讯录搜索后选择
    el.querySelectorAll("[data-owner-edit]").forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        var job = S.getJob(b.getAttribute("data-owner-edit"));
        if (!job) return;
        window.PeoplePicker.pickDialog({
          title: "选择业务对接人 · " + job.title,
          desc: "支持姓名、全拼（chenhao）、首字母（ch）、部门、职务搜索；数据来自企业通讯录（模拟）。",
          label: "业务对接人",
          value: job.bizOwner || "",
          note: "初筛通过后，「暂定推荐初筛」的候选人会推选给这位对接人。",
          onPick: function (v) {
            S.updateJob(job.id, { bizOwner: v });
            window.UI.toast("业务对接人已设为 " + v.split("（")[0], "ok");
          }
        });
      };
    });
    // 统计数字：点进去看对应候选人
    el.querySelectorAll("[data-fact]").forEach(function (b) {
      b.onclick = function () {
        var k = b.getAttribute("data-fact");
        if (k === "rec") { window.Admin.openRecommends(mainJob.id); return; }
        if (k === "todo") {
          var ids = S.recommendable(mainJob.id).map(function (c) { return c.id; });
          if (!ids.length) { window.UI.toast("暂无可推选候选人：需先标记「暂定推荐初筛」", "warn"); return; }
          window.Admin.recommendForm(mainJob.id, ids);
          return;
        }
        S.setJob(mainJob.id);
        S.setFilter({ conclusion: k, review: "all", sort: "match", q: "" });
        S.setRoute("screening");
      };
    });
    document.getElementById("btnJobsAdmin3").onclick = function () { window.Admin.jobForm(null); };
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
  };
})();
