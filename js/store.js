(function () {
  var D = window.DATA;
  var NOW = new Date(D.NOW);
  var HOUR = 3600000;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  var state = {
    route: "dashboard",
    jobId: "JOB-PM-001",
    jobs: clone(D.JOBS),
    criteria: clone(D.CRITERIA),
    candidates: [],
    cards: clone(D.CARDS_SEED),
    recommends: [],
    logs: [],
    filters: { q: "", conclusion: "all", review: "all", sort: "match" },
    cardsTab: "active",
    cardFilters: { cat: "all", job: "all" },
    rules: clone(D.RULES),
    jdOpen: false,
    jdPicked: {},
    selected: [],
    lastFilteredIds: [],
    lastUpdated: D.NOW,
    timer: null
  };

  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function isoNow() { return D.NOW; }

  // ---------- 初始化数据 ----------
  function buildAll() {
    var pm = state.jobs[0];
    var pmCrit = state.criteria[pm.id];
    var list = clone(D.CURATED_PM);
    var reserved = {};
    list.forEach(function (c) { reserved[c.name] = true; });
    var gen = D.buildGenerated(pm, pmCrit, {
      count: 26, startSeq: 15, idPrefix: "C-PM-",
      high: 0, review: 3, low: 23, failed: 0,
      pending: 2, reviewedToday: 3, allPending: false,
      reserved: reserved,
      titlePool: ["产品经理", "高级产品经理", "产品主管", "商业化产品经理"]
    });
    state.candidates = list.concat(gen);

    state.jobs.slice(1).forEach(function (job, idx) {
      var crit = state.criteria[job.id];
      var plan = idx === 0
        ? { high: 4, review: 6, low: 13, failed: 1, idPrefix: "C-DA-", titlePool: ["数据分析师", "高级数据分析师", "商业分析师"] }
        : { high: 1, review: 3, low: 4, failed: 1, idPrefix: "C-OP-", titlePool: ["内容运营", "新媒体运营", "运营主管"] };
      var g = D.buildGenerated(job, crit, {
        count: job.resumeCount, startSeq: 1, idPrefix: plan.idPrefix,
        high: plan.high, review: plan.review, low: plan.low, failed: plan.failed,
        allPending: true, pending: 0, reviewedToday: 0,
        reserved: {}, titlePool: plan.titlePool,
        failReason: "简历解析失败，请检查文件格式（扫描件缺少文本层）"
      });
      state.candidates = state.candidates.concat(g);
    });

    // 重复投递：同一候选人疑似同时投递其他岗位，提示 HR 复用已有结论
    var dup = state.candidates.filter(function (c) { return c.id === "C-PM-005"; })[0];
    if (dup) {
      dup.dup = {
        jobId: "JOB-DA-002",
        jobTitle: "数据分析师（增长方向）",
        at: "2026-10-18",
        matchedBy: "手机号后四位 6612 一致",
        conclusion: "中匹配"
      };
    }

    // 与提醒卡片保持一致的候选人阶段（避免同一候选人在不同页面状态矛盾）
    var stageFix = {
      "C-PM-006": { stage: "初筛通过，待安排面试", stageUpdatedAt: "2026-10-18T14:00:00+08:00" },
      "C-PM-007": { stage: "Offer 审批中", stageUpdatedAt: "2026-10-20T15:00:00+08:00" },
      "C-PM-008": { stage: "已推荐业务部门", stageUpdatedAt: "2026-10-14T10:00:00+08:00" },
      "C-PM-009": { stage: "一面待进行", stageUpdatedAt: "2026-10-22T09:00:00+08:00", interviewAt: "2026-10-22T18:00:00+08:00" }
    };
    Object.keys(stageFix).forEach(function (id) {
      var c = state.candidates.filter(function (x) { return x.id === id; })[0];
      if (c) Object.keys(stageFix[id]).forEach(function (k) { c[k] = stageFix[id][k]; });
    });

    // 与提醒卡片同源的推荐记录（保证候选人阶段、卡片、推荐单三者一致）
    state.recommends = [
      {
        id: "R-PM-00", jobId: "JOB-PM-001",
        at: "2026-10-14T10:00:00+08:00", by: "李萌",
        to: "陈昊（严选商业化产品负责人）", team: "严选 · 商业化产品组",
        note: "首批推选，请确认是否约面。",
        expectAt: "2026-10-16T10:00:00+08:00", expectHours: 48,
        candidateIds: ["C-PM-008"], bizFeedback: {}, channel: "系统内推送", status: "waiting"
      },
      {
        id: "R-PM-01", jobId: "JOB-PM-001",
        at: "2026-10-20T09:30:00+08:00", by: "李萌",
        to: "陈昊（严选商业化产品负责人）", team: "严选 · 商业化产品组",
        note: "本批次高匹配候选人，请优先查看。",
        expectAt: "2026-10-22T09:30:00+08:00", expectHours: 48,
        candidateIds: ["C-PM-002"], bizFeedback: {}, channel: "系统内推送", status: "waiting"
      }
    ];
    state.candidates.forEach(function (c) {
      if (c.id === "C-PM-008" || c.id === "C-PM-002") {
        c.recommended = { batchId: c.id === "C-PM-008" ? "R-PM-00" : "R-PM-01" };
        c.bizFeedback = "pending";
      }
    });

    state.logs = [
      { at: "2026-10-22T16:30:00+08:00", action: "数据同步", target: "岗位 3 个 / 候选人 73 人", detail: "从 ATS 同步增量数据（模拟）" },
      { at: "2026-10-21T09:34:00+08:00", action: "批量初筛完成", target: "产品经理（商业化方向）", detail: "37 份解析成功，3 份解析失败" },
      { at: "2026-10-21T09:12:00+08:00", action: "批量初筛启动", target: "产品经理（商业化方向）", detail: "批次 B-PM-01，共 40 份简历" }
    ];
  }

  // ---------- 查询 ----------
  function getJob(id) {
    for (var i = 0; i < state.jobs.length; i++) if (state.jobs[i].id === id) return state.jobs[i];
    return null;
  }
  function curJob() { return getJob(state.jobId); }
  function crit(jobId) { return state.criteria[jobId] || []; }

  function allCands(jobId) {
    return state.candidates.filter(function (c) { return c.jobId === jobId; });
  }
  // 未完成初筛前不展示结果
  function visibleCands(jobId) {
    var job = getJob(jobId);
    if (!job) return [];
    if (job.batch.status === "pending") return [];
    var list = allCands(jobId);
    if (job.batch.status === "running") return list.slice(0, Math.max(0, job.batch.processed));
    return list;
  }

  function evidenceScore(cand) {
    var list = crit(cand.jobId);
    if (cand.conclusion === "failed" || cand.conclusion === "unparsed" || !list.length) return null;
    var wSum = 0, vSum = 0;
    list.forEach(function (c) {
      var w = c.importance === "必须" ? 1 : c.importance === "高" ? 0.8 : c.importance === "中" ? 0.6 : 0.4;
      var ev = cand.evidence && cand.evidence[c.id];
      var v = !ev ? 0 : ev.status === "matched" ? 1 : ev.status === "limited" ? 0.5 : 0;
      wSum += w; vSum += w * v;
    });
    return Math.round((vSum / wSum) * 100);
  }

  function stats(jobId) {
    var job = getJob(jobId);
    var list = visibleCands(jobId);
    var total = job ? (job.batch.status === "completed" ? allCands(jobId).length : job.batch.total) : 0;
    if (job && job.batch.status === "running") total = job.batch.total;
    var failed = 0, high = 0, review = 0, low = 0, unparsed = 0, reviewed = 0, pendingReview = 0;
    list.forEach(function (c) {
      if (c.conclusion === "failed") { failed++; return; }
      if (c.conclusion === "unparsed") { unparsed++; return; }
      if (c.conclusion === "high") high++;
      else if (c.conclusion === "review") review++;
      else low++;
      if (c.reviewStatus === "pending") pendingReview++; else reviewed++;
    });
    var ok = high + review + low;
    return {
      total: total, ok: ok, failed: failed, unparsed: unparsed,
      high: high, review: review, low: low,
      reviewed: reviewed, pendingReview: pendingReview,
      pendingTotal: pendingReview + failed + unparsed,
      highRatio: ok ? high / ok : 0
    };
  }

  // 人工复核进度：只看可审核的简历（解析失败 / 未解析不参与）
  function reviewStats(jobId) {
    var list = visibleCands(jobId).filter(function (c) {
      return c.conclusion !== "failed" && c.conclusion !== "unparsed";
    });
    var rec = 0, rej = 0;
    list.forEach(function (c) {
      if (c.reviewStatus === "recommend") rec++;
      else if (c.reviewStatus === "reject") rej++;
    });
    var done = rec + rej;
    return { total: list.length, done: done, pending: list.length - done, rec: rec, rej: rej };
  }

  function pendingResumes() {
    var n = 0;
    state.jobs.forEach(function (j) { if (j.batch.status === "pending") n += j.batch.total; });
    return n;
  }

  function cardsByStatus(status) {
    if (status === "active") return state.cards.filter(function (c) { return c.status === "active"; })
      .sort(function (a, b) { return b.priority - a.priority; });
    if (status === "deferred") return state.cards.filter(function (c) { return c.status === "deferred"; });
    if (status === "ack") return state.cards.filter(function (c) { return c.status === "ack"; })
      .sort(function (a, b) { return new Date(b.ackAt) - new Date(a.ackAt); });
    return state.cards;
  }

  function cardCount(status) {
    return state.cards.filter(function (c) { return c.status === status; }).length;
  }

  function handledToday() {
    var n = 0;
    state.candidates.forEach(function (c) {
      if (c.reviewAt && c.reviewAt.indexOf(D.TODAY) === 0) n++;
    });
    state.cards.forEach(function (c) {
      if ((c.ackAt || c.resolvedAt || "").indexOf(D.TODAY) === 0) n++;
    });
    return n;
  }

  function hoursSince(iso) {
    if (!iso) return 0;
    return Math.floor((NOW - new Date(iso)) / HOUR);
  }

  function hasCard(candidateId, stage, type) {
    return state.cards.some(function (c) {
      return c.candidateId === candidateId && c.type === type && c.status !== "done";
    });
  }

  function getCard(id) {
    for (var i = 0; i < state.cards.length; i++) if (state.cards[i].id === id) return state.cards[i];
    return null;
  }
  function getCandidate(id) {
    for (var i = 0; i < state.candidates.length; i++) if (state.candidates[i].id === id) return state.candidates[i];
    return null;
  }

  // ---------- 事件 ----------
  var listeners = [];
  function emit() {
    listeners.forEach(function (fn) { try { fn(); } catch (e) { console.error(e); } });
  }

  function log(action, target, detail) {
    var u = window.Auth && window.Auth.user();
    state.logs.unshift({ at: isoNow(), action: action, target: target, detail: detail, by: u ? u.name : "系统" });
    if (state.logs.length > 60) state.logs.pop();
  }

  // ---------- 数据范围（登录后按角色收敛）----------
  function visibleJobs() {
    if (!state.jobs.length) return [];
    if (window.Auth && window.Auth.user()) {
      var list = window.Auth.jobs(state.jobs);
      return list.length ? list : [];
    }
    return state.jobs.slice();
  }
  function canSeeJob(jobId) {
    return visibleJobs().some(function (j) { return j.id === jobId; });
  }
  // 当前用户可见的岗位（业务角色只有自己的岗位）
  function defaultJobId() {
    var list = visibleJobs();
    return list.length ? list[0].id : state.jobId;
  }

  // ---------- 动作 ----------
  function setRoute(r) {
    state.route = r;
    emit();
  }
  function setJob(id) {
    state.jobId = id;
    state.filters = { q: "", conclusion: "all", review: "all", sort: "match" };
    state.selected = [];
    emit();
  }
  function setFilter(patch) {
    Object.keys(patch).forEach(function (k) { state.filters[k] = patch[k]; });
    emit();
  }
  function setCardsTab(t) { state.cardsTab = t; emit(); }

  function confirmCriteria(jobId) {
    crit(jobId).forEach(function (c) { c.confirmed = true; });
    log("确认筛选标准", getJob(jobId).title, "HR 确认 " + crit(jobId).length + " 项筛选标准");
    emit();
  }
  function toggleCriterion(jobId, id) {
    var c = crit(jobId).filter(function (x) { return x.id === id; })[0];
    if (!c) return;
    c.confirmed = !c.confirmed;
    log(c.confirmed ? "确认筛选项" : "取消确认筛选项", getJob(jobId).title, c.label);
    emit();
  }
  function updateCriterion(jobId, id, patch) {
    var c = crit(jobId).filter(function (x) { return x.id === id; })[0];
    if (!c) return;
    Object.keys(patch).forEach(function (k) { c[k] = patch[k]; });
    emit();
  }
  function addCriterion(jobId, type) {
    var list = crit(jobId);
    var prefix = jobId === "JOB-PM-001" ? "PM" : jobId === "JOB-DA-002" ? "DA" : "OP";
    var n = list.filter(function (c) { return c.type === type; }).length + 1;
    list.push({
      id: prefix + "-" + type.charAt(0) + "x" + Date.now().toString().slice(-4),
      type: type,
      label: "新的" + (type === "hard" ? "硬性条件" : type === "core" ? "核心能力" : "加分项"),
      importance: type === "hard" ? "必须" : type === "core" ? "高" : "加分",
      confirmed: false
    });
    n++;
    emit();
  }
  function removeCriterion(jobId, id) {
    var list = crit(jobId);
    var i = -1;
    list.forEach(function (c, k) { if (c.id === id) i = k; });
    if (i >= 0) { log("删除筛选项", getJob(jobId).title, list[i].label); list.splice(i, 1); emit(); }
  }

  // 复用其他岗位已确认的筛选标准（复制后会按新标准重算证据，需 HR 重新确认）
  function copyCriteria(fromJobId, toJobId) {
    var src = crit(fromJobId);
    if (!src.length) return { ok: false };
    var prefix = toJobId === "JOB-PM-001" ? "PM" : toJobId === "JOB-DA-002" ? "DA" : "OP";
    var counters = { hard: 0, core: 0, bonus: 0 };
    var newList = src.map(function (c) {
      counters[c.type] = (counters[c.type] || 0) + 1;
      return {
        id: prefix + "-" + c.type.charAt(0) + counters[c.type],
        type: c.type, label: c.label, importance: c.importance, confirmed: false
      };
    });
    state.criteria[toJobId] = newList;
    allCands(toJobId).forEach(function (cand, i) {
      if (cand.conclusion === "failed") return;
      var parts = (cand.recent || "").split(" · ");
      var company = parts[0] || "某公司";
      var title = parts.slice(1).join(" · ") || "产品经理";
      cand.evidence = D.genEvidence(newList, cand.conclusion, i + 1, company, title);
    });
    log("复用筛选标准", getJob(toJobId).title, "从「" + getJob(fromJobId).title + "」复制 " + newList.length + " 项，待 HR 确认");
    emit();
    return { ok: true, n: newList.length };
  }

  // 勾选（用于批量处理）
  function toggleSelect(id, on) {
    var i = state.selected.indexOf(id);
    if (on === true) { if (i < 0) state.selected.push(id); }
    else if (on === false) { if (i >= 0) state.selected.splice(i, 1); }
    else { if (i < 0) state.selected.push(id); else state.selected.splice(i, 1); }
    emit();
  }
  function setSelected(ids) { state.selected = ids.slice(); emit(); }
  function clearSelection() { state.selected = []; emit(); }

  // 批量审核：只有「暂定推荐初筛 / 暂不推荐初筛」两种结论；解析失败与未解析不参与
  function bulkReview(jobId, result, note) {
    var labels = { recommend: "暂定推荐初筛", reject: "暂不推荐初筛" };
    var done = [], skipped = [];
    state.selected.forEach(function (id) {
      var c = getCandidate(id);
      if (!c || c.jobId !== jobId) return;
      if (c.conclusion === "failed" || c.conclusion === "unparsed") {
        skipped.push({ name: c.name, why: "解析未完成，不可批量确认" });
        return;
      }
      c.reviewStatus = result;
      c.reviewer = "李萌";
      c.reviewAt = isoNow();
      if (note) c.reviewNote = note;
      done.push(c);
    });
    if (done.length) {
      log("批量修改审核状态", getJob(jobId).title,
        done.length + " 人 → " + labels[result] + (note ? " · 备注：" + note : "") +
        (skipped.length ? "（跳过 " + skipped.length + " 人）" : ""));
    }
    state.selected = [];
    emit();
    return { ok: done.length, skipped: skipped };
  }

  // 硬性条件缺口：让 HR 在列表里就能看到为什么是低匹配
  function hardGaps(cand) {
    var list = crit(cand.jobId).filter(function (c) { return c.type === "hard"; });
    if (!list.length || cand.conclusion === "failed" || cand.conclusion === "unparsed") return [];
    var out = [];
    list.forEach(function (r) {
      var e = cand.evidence && cand.evidence[r.id];
      var st = e ? e.status : "missing";
      if (st !== "matched") out.push({ label: r.label, status: st });
    });
    return out;
  }

  // ---------- 简历导入（链路第 2 步）----------
  function mergeSource(src, channel, n) {
    var parts = String(src || "").split(" · ").map(function (s) { return s.trim(); }).filter(function (s) { return s; });
    var found = false;
    parts = parts.map(function (p) {
      var m = p.match(/^(\S+?)\s*(\d+)$/);
      if (m && m[1] === channel) { found = true; return channel + " " + (parseInt(m[2], 10) + n); }
      return p;
    });
    if (!found) parts.push(channel + " " + n);
    return parts.join(" · ");
  }

  function importResumes(jobId, opts) {
    var job = getJob(jobId);
    if (!job) return { ok: false };
    var n = parseInt(opts.count, 10) || 0;
    if (n <= 0) return { ok: false, reason: "count" };
    if (n > 200) n = 200;
    var used = {};
    state.candidates.forEach(function (c) { used[c.name] = true; });
    var added = [];
    for (var i = 0; i < n; i++) {
      var id = nextCandId(jobId);
      var name = D.pickName(used);
      var c = D.makeImported(job, id, opts.channel, state.candidates.length + i + 7, name);
      state.candidates.push(c);
      added.push(c);
    }
    job.batch.total += n;
    job.resumeCount += n;
    job.source = mergeSource(job.source, opts.channel, n);
    job.hasNewImport = true;
    log("导入简历", job.title, n + " 份 · 渠道「" + opts.channel + "」· 状态：待解析");
    emit();
    return { ok: true, n: n, added: added };
  }

  // ---------- 推选业务部门（链路第 6 步）----------
  function recommends(jobId) {
    return state.recommends.filter(function (r) { return r.jobId === jobId; })
      .sort(function (a, b) { return new Date(b.at) - new Date(a.at); });
  }

  function recommendStats(jobId) {
    var rs = recommends(jobId);
    var people = 0, waiting = 0, overdue = 0;
    rs.forEach(function (r) {
      people += r.candidateIds.length;
      r.candidateIds.forEach(function (id) {
        var c = getCandidate(id);
        if (!c || c.bizFeedback === "pending") {
          waiting++;
          if (hoursSince(r.at) >= (r.expectHours || 48)) overdue++;
        }
      });
    });
    return { batches: rs.length, people: people, waiting: waiting, overdue: overdue, list: rs };
  }

  // 可推选：审核结论为「推荐初筛」且未推选过
  function recommendable(jobId) {
    return allCands(jobId).filter(function (c) {
      return c.reviewStatus === "recommend" && c.conclusion !== "failed" &&
        c.conclusion !== "unparsed" && !c.recommended;
    });
  }

  function recommendToBiz(jobId, ids, data) {
    var job = getJob(jobId);
    if (!job) return { ok: 0, skipped: [] };
    var picks = [], skipped = [];
    ids.forEach(function (id) {
      var c = getCandidate(id);
      if (!c || c.jobId !== jobId) return;
      if (c.conclusion === "failed") { skipped.push({ name: c.name, why: "解析失败，无法推选" }); return; }
      if (c.conclusion === "unparsed") { skipped.push({ name: c.name, why: "尚未完成解析" }); return; }
      if (c.reviewStatus !== "recommend") { skipped.push({ name: c.name, why: "审核结论不是「暂定推荐初筛」" }); return; }
      if (c.recommended) { skipped.push({ name: c.name, why: "已在推荐单 " + c.recommended.batchId + " 中" }); return; }
      picks.push(c);
    });
    if (!picks.length) return { ok: 0, skipped: skipped };

    var hours = parseInt(data.hours, 10) || 48;
    var at = isoNow();
    var expect = new Date(NOW.getTime() + hours * HOUR).toISOString();
    var seq = recommends(jobId).length + 1;
    var rec = {
      id: "R-" + job.batch.id.slice(2) + "-" + (seq < 10 ? "0" : "") + seq,
      jobId: jobId, at: at, by: "李萌",
      to: (data.to || job.bizOwner || "业务负责人").trim(),
      cc: (data.cc || "").trim(),
      team: job.bizTeam || "",
      note: (data.note || "").trim(),
      expectAt: expect, expectHours: hours,
      candidateIds: picks.map(function (c) { return c.id; }),
      bizFeedback: {}, channel: "系统内推送", status: "waiting"
    };
    state.recommends.unshift(rec);
    picks.forEach(function (c) {
      c.stage = "已推荐业务部门";
      c.stageUpdatedAt = at;
      c.bizFeedback = "pending";
      c.recommended = { batchId: rec.id, at: at, to: rec.to, expectAt: expect };
    });
    log("推选业务部门", job.title,
      picks.length + " 人 → " + rec.to + " · " + rec.id + " · 期望 " + hours + " 小时内反馈" +
      (rec.cc ? " · 抄送 " + rec.cc : "") + (skipped.length ? "（跳过 " + skipped.length + " 人）" : ""));
    state.selected = [];
    emit();
    return { ok: picks.length, skipped: skipped, rec: rec };
  }

  // 业务方反馈推荐单：business 角色真正有处置权的地方（闭环回 HR）
  function feedbackRecommend(recId, result, note, candIds) {
    var rec = state.recommends.filter(function (r) { return r.id === recId; })[0];
    if (!rec) return { ok: false, msg: "推荐单不存在" };
    var u = window.Auth && window.Auth.user();
    if (!u) return { ok: false, msg: "请先登录" };
    var ids = (candIds && candIds.length) ? candIds : rec.candidateIds;
    var at = isoNow();
    var label = { interview: "同意推进面试", reject: "不合适", hold: "待定，需补充信息" };
    if (!label[result]) return { ok: false, msg: "请选择反馈结论" };

    ids.forEach(function (id) {
      var c = getCandidate(id);
      if (!c) return;
      c.bizFeedback = result;
      c.bizFeedbackAt = at;
      c.bizFeedbackBy = u.name;
      c.bizFeedbackNote = (note || "").trim();
      if (result === "interview") { c.stage = "业务已通过，待约面"; c.stageUpdatedAt = at; }
      if (result === "reject") { c.stage = "业务未通过"; c.stageUpdatedAt = at; }
      if (result === "hold") { c.stage = "业务待定"; c.stageUpdatedAt = at; }
      rec.bizFeedback[id] = { result: result, at: at, by: u.name, note: (note || "").trim() };
    });
    var left = rec.candidateIds.filter(function (id) {
      var c = getCandidate(id);
      return c && c.bizFeedback === "pending";
    }).length;
    rec.status = left ? "waiting" : "done";
    rec.feedbackAt = at;

    var names = ids.map(function (id) { var c = getCandidate(id); return c ? c.name : id; }).join("、");
    log("业务反馈推荐单", rec.id + " · " + getJob(rec.jobId).title, names + " → " + label[result] + (note ? "（" + note + "）" : ""));
    emit();
    return { ok: true, n: ids.length, left: left, label: label[result] };
  }

  // 当前登录业务方待反馈的推荐单
  function myRecommends() {
    var u = window.Auth && window.Auth.user();
    if (!u) return [];
    var myJobs = visibleJobs().map(function (j) { return j.id; });
    return state.recommends.filter(function (r) {
      if (myJobs.indexOf(r.jobId) < 0) return false;
      var to = String(r.to || "").split("（")[0].trim();
      var cc = String(r.cc || "").split(/[、,，]/).map(function (s) { return s.split("（")[0].trim(); });
      return to === u.name || cc.indexOf(u.name) > -1;
    });
  }

  // ---------- 岗位 CRUD ----------
  function newId(prefix) {
    return prefix + "-" + Date.now().toString().slice(-5) + Math.floor(Math.random() * 90 + 10);
  }
  function addJob(data) {
    var id = newId("JOB");
    var job = {
      id: id,
      title: data.title || "未命名岗位",
      dept: data.dept || "—",
      city: data.city || "—",
      owner: data.owner || "李萌（招聘 HR）",
      bizOwner: data.bizOwner || "",
      bizTeam: data.bizTeam || data.dept || "",
      createdAt: D.TODAY,
      headcount: parseInt(data.headcount, 10) || 1,
      priority: data.priority || "P2",
      jd: data.jd || "",
      resumeCount: 0,
      source: "手工创建",
      batch: { id: "B-" + id.slice(-4), status: "pending", total: 0, processed: 0, failed: 0, startedAt: null, finishedAt: null }
    };
    state.jobs.push(job);
    state.criteria[id] = [];
    D.JD_EXTRACT[id] = null;
    log("新增岗位", job.title, "手工创建 · HC " + job.headcount);
    state.jobId = id;
    emit();
    return job;
  }
  function updateJob(id, patch) {
    var job = getJob(id);
    if (!job) return;
    Object.keys(patch).forEach(function (k) { job[k] = patch[k]; });
    log("编辑岗位", job.title, Object.keys(patch).join("、") + " 已更新");
    emit();
  }
  // 复制岗位：连 JD 与筛选标准一起复制，状态重置为待开始（B 端高频操作）
  function duplicateJob(id) {
    var job = getJob(id);
    if (!job) return null;
    var copy = clone(job);
    copy.id = newId("JOB");
    copy.title = job.title.replace(/（副本.*）$/, "") + "（副本）";
    copy.createdAt = D.TODAY;
    copy.resumeCount = 0;
    copy.source = "复制自「" + job.title + "」";
    copy.batch = { id: "B-" + copy.id.slice(-4), status: "pending", total: 0, processed: 0, failed: 0, startedAt: null, finishedAt: null };
    state.jobs.push(copy);
    state.criteria[copy.id] = clone(crit(id)).map(function (c) {
      c.id = newId("CR"); c.confirmed = false;
      return c;
    });
    D.JD_EXTRACT[copy.id] = null;
    var n = state.criteria[copy.id].length;
    log("复制岗位", copy.title, "来源 " + job.title + " · 同步 " + n + " 项筛选标准（需重新确认）");
    state.jobId = copy.id;
    emit();
    return copy;
  }

  function deleteJob(id) {
    var job = getJob(id);
    if (!job) return { ok: false, reason: "notfound" };
    if (state.jobs.length <= 1) return { ok: false, reason: "last" };
    var n = allCands(id).length;
    if (n > 0) return { ok: false, reason: "hasCandidates", n: n };
    var i = state.jobs.indexOf(job);
    state.jobs.splice(i, 1);
    delete state.criteria[id];
    delete D.JD_EXTRACT[id];
    state.cards = state.cards.filter(function (c) { return c.jobId !== id; });
    if (state.jobId === id) state.jobId = state.jobs[0].id;
    log("删除岗位", job.title, "岗位及其筛选标准已移除");
    emit();
    return { ok: true };
  }

  // ---------- 候选人 CRUD ----------
  function nextCandId(jobId) {
    var prefix = jobId === "JOB-PM-001" ? "C-PM-" : jobId === "JOB-DA-002" ? "C-DA-" : jobId === "JOB-OP-003" ? "C-OP-" : "C-N" + jobId.slice(-2) + "-";
    var max = 0;
    state.candidates.forEach(function (c) {
      if (c.jobId !== jobId || c.id.indexOf(prefix) !== 0) return;
      var n = parseInt(c.id.slice(prefix.length), 10);
      if (!isNaN(n) && n > max) max = n;
    });
    return prefix + (max + 1 < 10 ? "00" : max + 1 < 100 ? "0" : "") + (max + 1);
  }
  function addCandidate(jobId, data) {
    var job = getJob(jobId);
    if (!job) return null;
    var id = nextCandId(jobId);
    var skills = String(data.skills || "").split(/[、,，\s]+/).filter(function (s) { return s; });
    var cand = {
      id: id, jobId: jobId, name: data.name || "未命名候选人",
      years: data.years ? parseInt(data.years, 10) : null,
      recent: data.recent || "—",
      edu: data.edu || "—",
      skills: skills,
      conclusion: "unparsed",
      file: data.file || (data.name || "候选人") + "_简历.pdf",
      summary: data.summary || "",
      stage: "简历初筛",
      stageUpdatedAt: isoNow(),
      interviewAt: null, feedbackStatus: "n/a",
      reviewStatus: "pending", reviewer: null, reviewAt: null, reviewNote: "",
      parseStatus: "queued", evidence: {}, manual: true
    };
    state.candidates.push(cand);
    job.batch.total += 1;
    job.resumeCount += 1;
    log("新增候选人", cand.name + "（" + id + "）", "手工补录进 " + job.title + " 批次 " + job.batch.id);
    emit();
    return cand;
  }
  function updateCandidate(id, patch) {
    var c = getCandidate(id);
    if (!c) return;
    Object.keys(patch).forEach(function (k) { c[k] = patch[k]; });
    if (patch.skills && typeof patch.skills === "string") {
      c.skills = patch.skills.split(/[、,，\s]+/).filter(function (s) { return s; });
    }
    log("编辑候选人", c.name + "（" + c.id + "）", Object.keys(patch).join("、") + " 已更新");
    emit();
  }
  function removeCandidate(id) {
    var c = getCandidate(id);
    if (!c) return;
    var job = getJob(c.jobId);
    var i = state.candidates.indexOf(c);
    state.candidates.splice(i, 1);
    if (job && job.batch.total > 0) job.batch.total -= 1;
    if (job && job.resumeCount > 0) job.resumeCount -= 1;
    state.cards = state.cards.filter(function (x) { return x.candidateId !== id; });
    log("移除候选人", c.name + "（" + c.id + "）", "已从 " + (job ? job.title : "—") + " 批次移除");
    emit();
  }
  // 批量移出（初筛页勾选后一次性清理重复投递 / 无效简历）
  function removeCandidates(ids) {
    var done = [];
    ids.forEach(function (id) {
      var c = getCandidate(id);
      if (!c) return;
      done.push(c);
      removeCandidate(id);
    });
    if (done.length) log("批量移除候选人", done.length + " 人", done.map(function (c) { return c.name; }).join("、"));
    return done.length;
  }

  // ---------- 推荐单 CRUD ----------
  function editRecommend(recId, patch) {
    var rec = state.recommends.filter(function (r) { return r.id === recId; })[0];
    if (!rec) return null;
    Object.keys(patch).forEach(function (k) { rec[k] = patch[k]; });
    if (patch.expectHours) {
      rec.expectHours = parseInt(patch.expectHours, 10) || rec.expectHours;
      rec.expectAt = new Date(NOW.getTime() + rec.expectHours * HOUR).toISOString();
      rec.candidateIds.forEach(function (id) {
        var c = getCandidate(id);
        if (c && c.recommended) c.recommended.expectAt = rec.expectAt;
      });
    }
    log("编辑推荐单", rec.id, Object.keys(patch).join("、") + " 已更新");
    emit();
    return rec;
  }
  // 撤销推选：候选人回到「可推选」，推荐单移除（keep=true 时只删单，不改候选人）
  function revokeRecommend(recId, keep) {
    var rec = state.recommends.filter(function (r) { return r.id === recId; })[0];
    if (!rec) return { ok: false };
    var n = 0;
    if (!keep) {
      rec.candidateIds.forEach(function (id) {
        var c = getCandidate(id);
        if (!c) return;
        n++;
        c.recommended = null;
        c.bizFeedback = null;
        c.bizFeedbackAt = null;
        c.bizFeedbackBy = null;
        c.stage = "已复核，待推选";
        c.stageUpdatedAt = isoNow();
      });
    }
    state.recommends = state.recommends.filter(function (r) { return r.id !== recId; });
    log(keep ? "删除推荐记录" : "撤销推选", rec.id,
      keep ? "仅删除记录，候选人状态保留" : n + " 人回到「可推选」");
    emit();
    return { ok: true, n: n, rec: rec };
  }

  // ---------- 提醒规则 CRUD ----------
  function addRule(data) {
    var r = {
      id: "RULE-" + (data.name || "NEW").slice(0, 2).toUpperCase() + "-" + Date.now().toString().slice(-4),
      name: data.name || "新规则",
      cat: data.cat || "flow",
      threshold: parseInt(data.threshold, 10) || 0,
      unit: data.unit || "小时",
      scope: data.scope || "all",
      enabled: true,
      desc: data.desc || "",
      source: data.source || "—",
      follow: data.follow || "由 HR 自行处理"
    };
    state.rules.push(r);
    log("新增提醒规则", r.name, r.id + " · 阈值 " + r.threshold + " " + r.unit);
    emit();
    return r;
  }
  function updateRule(id, patch) {
    var r = state.rules.filter(function (x) { return x.id === id; })[0];
    if (!r) return;
    Object.keys(patch).forEach(function (k) { r[k] = patch[k]; });
    log("编辑提醒规则", r.name, Object.keys(patch).join("、") + " 已更新");
    emit();
  }
  function deleteRule(id) {
    var r = state.rules.filter(function (x) { return x.id === id; })[0];
    if (!r) return;
    state.rules = state.rules.filter(function (x) { return x.id !== id; });
    log("删除提醒规则", r.name, r.id);
    emit();
  }
  function toggleRule(id) {
    var r = state.rules.filter(function (x) { return x.id === id; })[0];
    if (!r) return;
    r.enabled = !r.enabled;
    log(r.enabled ? "启用提醒规则" : "停用提醒规则", r.name, r.id);
    emit();
  }

  // ---------- JD 要点提取 → 人工复核 ----------
  function jdItems(jobId) {
    var job = getJob(jobId);
    if (!job) return { engine: "—", items: [] };
    var preset = D.JD_EXTRACT[jobId];
    if (preset) return preset;
    return { engine: D.SCAN_ENGINE, items: D.scanJd(job.jd) };
  }
  function adoptJdItems(jobId, pickedIds) {
    var items = jdItems(jobId).items.filter(function (it) { return pickedIds.indexOf(it.id) >= 0; });
    var list = crit(jobId);
    var n = 0;
    items.forEach(function (it) {
      list.push({
        id: (jobId.slice(4, 6) || "NJ") + "-" + it.type.charAt(0) + "j" + Date.now().toString().slice(-4) + n,
        type: it.type, label: it.text, importance: it.importance, confirmed: false, fromJd: true
      });
      n++;
    });
    state.jdOpen = false;
    state.jdPicked = {};
    log("采纳 JD 要点", getJob(jobId).title, "采纳 " + n + " 项，待 HR 逐项确认后锁定");
    emit();
    return n;
  }

  // ---------- 提醒状态 ----------
  function ackCard(id, note) {
    var card = getCard(id);
    if (!card) return;
    card.status = "ack";
    card.ackAt = isoNow();
    card.ackBy = "李萌";
    card.ackNote = note || "";
    log("已知悉提醒", card.title, note ? "备注：" + note : "—");
    emit();
  }
  function setCardFilter(patch) {
    Object.keys(patch).forEach(function (k) { state.cardFilters[k] = patch[k]; });
    emit();
  }

  function startBatch(jobId) {
    var job = getJob(jobId);
    if (!job || job.batch.status === "running") return { ok: false, reason: "running" };
    if (!crit(jobId).length) return { ok: false, reason: "no_criteria" };
    var unconfirmed = crit(jobId).filter(function (c) { return !c.confirmed; }).length;
    if (unconfirmed > 0) return { ok: false, reason: "criteria" };
    job.batch.status = "running";
    job.batch.processed = 0;
    job.batch.failed = 0;
    job.batch.startedAt = isoNow();
    job.batch.finishedAt = null;
    log("批量初筛启动", job.title, "批次 " + job.batch.id + "，共 " + job.batch.total + " 份简历");
    emit();

    var total = job.batch.total, step = 0;
    if (state.timer) clearInterval(state.timer);
    state.timer = setInterval(function () {
      step++;
      var done = Math.min(total, Math.ceil(total * step / 12));
      job.batch.processed = done;
      emit();
      if (done >= total) {
        clearInterval(state.timer);
        state.timer = null;
        finishBatch(jobId);
      }
    }, 260);
    return { ok: true };
  }

  function finishBatch(jobId) {
    var job = getJob(jobId);
    var list = allCands(jobId);

    // 新补录 / 待解析的简历在本批次中一并处理
    var newly = 0;
    list.forEach(function (c) {
      if (c.conclusion !== "unparsed") return;
      var parts = (c.recent || "—").split(" · ");
      var company = parts[0] || "某公司", title = parts.slice(1).join(" · ") || "候选人";
      c.conclusion = (c.years || 0) >= 3 ? "review" : "low";
      c.parseStatus = "ok";
      c.summary = c.summary || "本次批量初筛解析完成：" + (c.years || 0) + " 年相关经验，按岗位标准逐项匹配后生成证据。";
      c.evidence = D.genEvidence(crit(jobId), c.conclusion, (c.years || 1) + list.indexOf(c), company, title);
      newly++;
    });

    var failed = list.filter(function (c) { return c.conclusion === "failed"; }).length;
    var ok = list.length - failed;
    job.batch.status = "completed";
    job.batch.processed = ok;
    job.batch.failed = failed;
    job.batch.finishedAt = isoNow();
    job.hasNewImport = false;
    log("批量初筛完成", job.title, ok + " 份解析成功，" + failed + " 份解析失败" + (newly ? "（含新补录 " + newly + " 份）" : ""));
    job.lastBatchNote = evaluateAnomaly(jobId);
    emit();
  }

  function evaluateAnomaly(jobId) {
    var job = getJob(jobId);
    var st = stats(jobId);
    var ratio = st.highRatio;
    if (st.ok < 30) {
      return {
        type: "insufficient",
        text: "本批次已处理 " + st.ok + " 份简历，样本量未达到 30 份，未生成初筛异常卡片。当前批次观察结果：高匹配 " + st.high + " 份，占比 " + Math.round(ratio * 100) + "%。"
      };
    }
    if (ratio >= 0.15) {
      return {
        type: "normal",
        text: "本批次高匹配占比 " + Math.round(ratio * 100) + "%，高于 15% 的观察阈值，未生成初筛异常卡片。"
      };
    }
    if (!hasCard(null, null, "screening_anomaly") || !state.cards.some(function (c) {
      return c.type === "screening_anomaly" && c.jobId === jobId && c.status !== "done";
    })) {
      state.cards.unshift({
        id: "CARD-SC-" + Date.now().toString().slice(-6),
        type: "screening_anomaly",
        typeLabel: "初筛异常",
        title: "本批次初筛通过率偏低",
        jobId: jobId,
        candidateId: null,
        stage: "简历初筛批次 " + job.batch.id,
        sinceAt: isoNow(),
        sinceLabel: "批次完成时间",
        thresholdHours: null,
        thresholdLabel: "样本量 ≥ 30 且高匹配比例 < 15%",
        ruleId: "RULE-SC-LOWPASS",
        ruleText: "单批次已处理简历 ≥ 30 份且高匹配比例 < 15% → 生成初筛异常提醒",
        basis: "批次 " + job.batch.id + " 累计处理 " + st.ok + " 份可解析简历（另有 " + st.failed + " 份解析失败），其中 " + st.high + " 份被判断为高匹配，占比 " + Math.round(ratio * 100) + "%，低于 15% 的观察阈值。",
        impact: "若标准过严可能漏掉可用候选人；若标准合理则说明简历来源与岗位不匹配。",
        suggestions: ["抽查 3–5 份「中匹配」简历，确认是否因表达差异被降级", "核查硬性条件是否存在可放宽项", "核对本批次简历来源结构"],
        statsPeriod: D.TODAY,
        statsProcessed: st.ok,
        statsHigh: st.high,
        statsRatio: ratio,
        baseline: null,
        status: "active",
        priority: 74
      });
      log("生成 AI 提醒", job.title, "本批次初筛通过率偏低");
      return { type: "anomaly", text: "本批次高匹配占比偏低，已生成一条「初筛异常」AI 提醒。" };
    }
    return { type: "exists", text: "本批次高匹配占比偏低，已存在同类 AI 提醒，不重复提醒。" };
  }

  function reviewCandidate(id, result, note) {
    var c = getCandidate(id);
    if (!c) return;
    var labels = { recommend: "暂定推荐初筛", reject: "暂不推荐初筛", pending: "撤销确认" };
    c.reviewStatus = result;
    c.reviewer = "李萌";
    c.reviewAt = isoNow();
    c.reviewNote = note || "";
    log("修改初筛审核状态", c.name + "（" + c.id + "）", labels[result] + (note ? " · 备注：" + note : ""));
    emit();
  }

  function retryParse(id) {
    var c = getCandidate(id);
    if (!c) return;
    c.parseStatus = "parsing";
    emit();
    setTimeout(function () {
      if (c.retryable) {
        var list = crit(c.jobId);
        c.parseStatus = "ok";
        c.conclusion = "review";
        c.years = 4;
        c.recent = "某电商平台 · 商业化产品 · 产品经理";
        c.edu = "本科 · 某 211 高校 · 信息管理";
        c.skills = ["需求分析", "PRD 撰写", "数据分析"];
        c.summary = "重新解析成功：4 年电商商业化产品经验，负责营销工具与投放后台；简历文本质量一般，部分项目缺少结果数据，需人工核实。";
        c.evidence = {};
        list.forEach(function (r) {
          c.evidence[r.id] = {
            status: "limited",
            text: "重新解析仅提取到基础信息，未找到与该要求对应的具体项目描述。",
            quote: null,
            source: null
          };
        });
        log("重新解析简历", c.name, "解析成功，转为「中匹配」");
      } else {
        c.parseStatus = "failed";
        log("重新解析简历", c.name, "解析仍失败：" + c.parseError);
      }
      emit();
    }, 1100);
  }

  function deferCard(id, days) {
    var card = getCard(id);
    if (!card) return;
    var until = new Date(NOW.getTime() + days * 24 * HOUR);
    card.status = "deferred";
    card.deferUntil = until.toISOString();
    card.deferredAt = isoNow();
    card.deferDays = days;
    log("暂缓提醒", card.title, "暂缓 " + days + " 天");
    emit();
  }

  function reopenCard(id) {
    var card = getCard(id);
    if (!card) return;
    card.status = "active";
    card.deferUntil = null;
    log("恢复提醒", card.title, "HR 手动恢复提醒");
    emit();
  }

  function setLastUpdated() { state.lastUpdated = isoNow(); }

  buildAll();

  window.Store = {
    state: state, NOW: NOW,
    subscribe: function (fn) { listeners.push(fn); },
    emit: emit,
    getJob: getJob, curJob: curJob, crit: crit,
    allCands: allCands, visibleCands: visibleCands, getCandidate: getCandidate, getCard: getCard,
    evidenceScore: evidenceScore, stats: stats, reviewStats: reviewStats, pendingResumes: pendingResumes,
    cardsByStatus: cardsByStatus, cardCount: cardCount, handledToday: handledToday, hoursSince: hoursSince,
    setRoute: setRoute, setJob: setJob, setFilter: setFilter, setCardsTab: setCardsTab,
    confirmCriteria: confirmCriteria, toggleCriterion: toggleCriterion, updateCriterion: updateCriterion,
    addCriterion: addCriterion, removeCriterion: removeCriterion, copyCriteria: copyCriteria,
    toggleSelect: toggleSelect, setSelected: setSelected, clearSelection: clearSelection,
    bulkReview: bulkReview, hardGaps: hardGaps,
    startBatch: startBatch, evaluateAnomaly: evaluateAnomaly,
    reviewCandidate: reviewCandidate, retryParse: retryParse,
    importResumes: importResumes, recommendToBiz: recommendToBiz,
    recommends: recommends, recommendStats: recommendStats, recommendable: recommendable,
    feedbackRecommend: feedbackRecommend, myRecommends: myRecommends,
    visibleJobs: visibleJobs, canSeeJob: canSeeJob, defaultJobId: defaultJobId,
    addJob: addJob, updateJob: updateJob, deleteJob: deleteJob, duplicateJob: duplicateJob,
    addCandidate: addCandidate, updateCandidate: updateCandidate, removeCandidate: removeCandidate,
    removeCandidates: removeCandidates,
    editRecommend: editRecommend, revokeRecommend: revokeRecommend,
    addRule: addRule, updateRule: updateRule, deleteRule: deleteRule, toggleRule: toggleRule,
    jdItems: jdItems, adoptJdItems: adoptJdItems, setCardFilter: setCardFilter,
    ackCard: ackCard, deferCard: deferCard, reopenCard: reopenCard,
    log: log, isoNow: isoNow
  };
})();
