(function () {
  // B 端基础配置维护：岗位 / 候选人 / 提醒规则的增删改查
  window.Admin = window.Admin || {};

  function S() { return window.Store; }
  function U() { return window.UI; }

  function field(label, inner) {
    return '<div class="field"><label>' + label + "</label>" + inner + "</div>";
  }
  function input(id, val, ph) {
    return '<input class="input" id="' + id + '" value="' + U().esc(val || "") + '" placeholder="' + U().esc(ph || "") + '" />';
  }
  function select(id, opts, val) {
    return '<select class="select" id="' + id + '">' + opts.map(function (o) {
      return '<option value="' + o.v + '"' + (o.v === val ? " selected" : "") + ">" + o.t + "</option>";
    }).join("") + "</select>";
  }
  function textarea(id, val, ph) {
    return '<textarea class="textarea" id="' + id + '" placeholder="' + U().esc(ph || "") + '">' + U().esc(val || "") + "</textarea>";
  }
  function val(root, id) {
    var el = root.querySelector("#" + id);
    return el ? el.value.trim() : "";
  }

  // 人员选择器：B 端里凡是"选人"的地方都从企业通讯录里搜，不手敲
  function pp(id, label, value, hint, multiple) {
    return window.PeoplePicker.field({
      id: id, label: label, value: value || "",
      multiple: !!multiple, hint: hint || "支持姓名 / 全拼 / 首字母搜索，如 chenhao、ch"
    });
  }
  function bindPP(root, id, value, multiple) {
    if (!root) return;
    window.PeoplePicker.bind(root, { id: id, value: value || "", multiple: !!multiple });
  }
  function modalEl() { return document.querySelector("#modalRoot .modal"); }

  // ---------------- 岗位 ----------------
  function jobListBody() {
    var st = S().state;
    var rows = st.jobs.map(function (j) {
      var n = S().allCands(j.id).length;
      var status = j.batch.status === "completed" ? '<span class="tag high">初筛完成</span>'
        : j.batch.status === "running" ? '<span class="tag review">处理中</span>'
          : '<span class="tag muted">待开始</span>';
      var owner = String(j.bizOwner || "").split("（")[0].trim();
      return "<tr>" +
        '<td class="t-job">' + U().esc(j.title) + '<div class="muted small">' + U().esc(j.dept) + " · " + U().esc(j.city) + "</div></td>" +
        "<td>" + j.headcount + " 人</td>" +
        "<td>" + j.batch.total + " 份</td>" +
        "<td>" + n + " 人</td>" +
        '<td class="small">' + (owner ? U().esc(owner) : '<span class="muted">未设置</span>') + "</td>" +
        "<td>" + status + "</td>" +
        '<td style="text-align:right;white-space:nowrap">' +
          '<button class="btn sm" data-job-edit="' + j.id + '">编辑</button> ' +
          '<button class="btn sm ghost" data-job-copy="' + j.id + '">复制</button> ' +
          '<button class="btn sm ghost" data-job-del="' + j.id + '">删除</button>' +
        "</td></tr>";
    }).join("");
    return '<div class="table-wrap"><table class="tbl"><thead><tr>' +
      "<th>岗位</th><th>HC</th><th>简历</th><th>候选人</th><th>业务对接人</th><th>初筛状态</th><th></th>" +
      "</tr></thead><tbody>" + rows + "</tbody></table></div>" +
      '<div class="task-actions" style="margin-top:12px">' +
      '<button class="btn primary" data-job-new="1">+ 新增岗位</button>' +
      '<span class="small muted">新增岗位后需录入 JD 并提取要点形成筛选标准</span>' +
      "</div>";
  }

  function bindJobList(root) {
    root.querySelectorAll("[data-job-new]").forEach(function (b) {
      b.onclick = function () { jobForm(null); };
    });
    root.querySelectorAll("[data-job-edit]").forEach(function (b) {
      b.onclick = function () { jobForm(S().getJob(b.getAttribute("data-job-edit"))); };
    });
    root.querySelectorAll("[data-job-copy]").forEach(function (b) {
      b.onclick = function () {
        var src = S().getJob(b.getAttribute("data-job-copy"));
        var copy = S().duplicateJob(src.id);
        if (!copy) { U().toast("复制失败", "warn"); return; }
        U().toast("已复制为「" + copy.title + "」，同步 " + S().crit(copy.id).length + " 项标准（需重新确认）", "ok");
        openJobs();
      };
    });
    root.querySelectorAll("[data-job-del]").forEach(function (b) {
      b.onclick = function () {
        var job = S().getJob(b.getAttribute("data-job-del"));
        var r = S().deleteJob(job.id);
        if (r.ok) {
          U().toast("已删除岗位：" + job.title, "ok");
          openJobs();
        } else if (r.reason === "hasCandidates") {
          U().modal({
            title: "无法删除该岗位",
            desc: "该岗位下已有 " + r.n + " 位候选人。",
            body: '<div class="confirm-banner warn" style="margin:0"><span>!</span><div class="grow">' +
              "请先移除该岗位下的候选人，或将其转至其他岗位后再删除。</div></div>",
            confirmText: null
          });
        } else if (r.reason === "last") {
          U().toast("至少保留 1 个岗位", "warn");
        }
      };
    });
  }

  function openJobs() {
    U().modal({
      title: "岗位管理",
      desc: "维护在招岗位与基础信息；删除前需先清空该岗位候选人。",
      wide: true,
      confirmText: "关闭",
      body: jobListBody(),
      onConfirm: function (root) { bindJobList(root); U().closeModal(); }
    });
    bindJobList(document.querySelector("#modalRoot .modal"));
  }

  function jobForm(job) {
    var isNew = !job;
    job = job || {};
    var ownerVal = job.owner || "李萌（招聘 HR）";
    U().modal({
      title: isNew ? "新增岗位" : "编辑岗位",
      desc: isNew ? "创建后需录入 JD，再从 JD 提取要点形成筛选标准。" : "修改后立即生效，不影响已产生的初筛结果。",
      wide: true,
      confirmText: isNew ? "创建岗位" : "保存修改",
      body:
        '<div class="form-grid">' +
          field("岗位名称", input("fTitle", job.title, "例如：产品经理（商业化方向）")) +
          field("所属部门", input("fDept", job.dept, "例如：网易严选 · 商业化产品组")) +
          field("工作城市", input("fCity", job.city, "例如：杭州")) +
          field("招聘人数 HC", input("fHc", job.headcount || 1, "1")) +
          field("优先级", select("fPri", [{ v: "P0 · 紧急", t: "P0 · 紧急" }, { v: "P1", t: "P1" }, { v: "P2", t: "P2" }], job.priority || "P2")) +
          pp("fBizOwner", "业务对接人", job.bizOwner, "初筛通过后推选给谁；从企业通讯录搜索") +
          pp("fOwner", "招聘负责人", ownerVal, "责任 HR；从企业通讯录搜索") +
        "</div>" +
        field("所属业务团队", input("fBizTeam", job.bizTeam || job.dept, "例如：严选 · 商业化产品组")) +
        field("岗位 JD", textarea("fJd", job.jd, "粘贴完整 JD，用于提取筛选标准要点")) +
        '<div class="confirm-banner info" style="margin-top:10px"><span>i</span><div class="grow">' +
          "JD 只作为提取要点的输入，不会自动变成淘汰标准；提取结果需 HR 逐项确认。</div></div>",
      onConfirm: function (root) {
        var data = {
          title: val(root, "fTitle"), dept: val(root, "fDept"), city: val(root, "fCity"),
          headcount: val(root, "fHc"), priority: val(root, "fPri"), owner: val(root, "fOwner"),
          bizOwner: val(root, "fBizOwner"), bizTeam: val(root, "fBizTeam"), jd: val(root, "fJd")
        };
        if (!data.title) { U().toast("请填写岗位名称", "warn"); return true; }
        if (isNew) {
          var j = S().addJob(data);
          U().toast("已创建岗位：" + j.title, "ok");
        } else {
          S().updateJob(job.id, data);
          U().toast("岗位信息已保存", "ok");
        }
        openJobs();
      }
    });
    var m = modalEl();
    bindPP(m, "fBizOwner", job.bizOwner || "");
    bindPP(m, "fOwner", ownerVal);
  }

  // ---------------- 候选人 ----------------
  function candidateForm(cand, jobId, onSaved) {
    var isNew = !cand;
    cand = cand || {};
    var job = S().getJob(jobId);
    U().modal({
      title: isNew ? "补录候选人" : "编辑候选人",
      desc: isNew ? "手工补录的简历会加入本批次，下次执行初筛时一并解析。" : "修改基础信息；已由 AI 生成的匹配结论不受影响。",
      wide: true,
      confirmText: isNew ? "加入批次" : "保存修改",
      body:
        '<div class="form-grid">' +
          field("姓名", input("cName", cand.name, "候选人姓名")) +
          field("相关年限", input("cYears", cand.years, "例如：4")) +
          field("最近相关经历", input("cRecent", cand.recent === "—" ? "" : cand.recent, "公司 · 岗位")) +
          field("教育背景", input("cEdu", cand.edu === "—" ? "" : cand.edu, "学历 · 学校 · 专业")) +
        "</div>" +
        field("核心技能", input("cSkills", (cand.skills || []).join("、"), "用顿号或逗号分隔")) +
        field("简历文件名", input("cFile", cand.file, "姓名_简历.pdf")) +
        field("备注", textarea("cNote", cand.summary, "可选")) +
        '<div class="confirm-banner info" style="margin-top:10px"><span>i</span><div class="grow">' +
          "目标岗位：<b>" + U().esc(job ? job.title : "") + "</b>　·　" +
          (isNew ? "补录后状态为「待解析」，重新执行初筛时才会生成匹配结论。" : "证据结论由简历原文生成，手工修改不会改变证据。") +
          "</div></div>",
      onConfirm: function (root) {
        var data = {
          name: val(root, "cName"), years: val(root, "cYears"), recent: val(root, "cRecent"),
          edu: val(root, "cEdu"), skills: val(root, "cSkills"), file: val(root, "cFile"), summary: val(root, "cNote")
        };
        if (!data.name) { U().toast("请填写候选人姓名", "warn"); return true; }
        if (isNew) {
          var c = S().addCandidate(jobId, data);
          U().toast("已加入批次：" + c.name + "（待解析）", "ok");
        } else {
          S().updateCandidate(cand.id, data);
          U().toast("候选人信息已保存", "ok");
        }
        if (onSaved) onSaved();
      }
    });
  }

  // ---------------- 提醒规则 ----------------
  function ruleListBody() {
    var st = S().state;
    var rows = st.rules.map(function (r) {
      return "<tr>" +
        '<td class="t-job"><b>' + U().esc(r.name) + '</b><div class="muted small mono">' + r.id + "</div></td>" +
        "<td>" + U().esc(window.DATA.RULE_CATS[r.cat] || r.cat) + "</td>" +
        "<td>" + (r.threshold ? r.threshold + " " + U().esc(r.unit) : "—") + "</td>" +
        '<td class="small muted">' + U().esc(r.source) + "</td>" +
        "<td>" + (r.enabled ? '<span class="tag high">启用</span>' : '<span class="tag muted">停用</span>') + "</td>" +
        '<td style="text-align:right;white-space:nowrap">' +
          '<button class="btn sm" data-rule-edit="' + r.id + '">编辑</button> ' +
          '<button class="btn sm ghost" data-rule-toggle="' + r.id + '">' + (r.enabled ? "停用" : "启用") + "</button> " +
          '<button class="btn sm ghost" data-rule-del="' + r.id + '">删除</button>' +
        "</td></tr>";
    }).join("");
    return '<div class="table-wrap"><table class="tbl"><thead><tr>' +
      "<th>规则</th><th>类别</th><th>阈值</th><th>数据来源</th><th>状态</th><th></th>" +
      "</tr></thead><tbody>" + rows + "</tbody></table></div>" +
      '<div class="task-actions" style="margin-top:12px">' +
      '<button class="btn primary" data-rule-new="1">+ 新增规则</button>' +
      '<span class="small muted">规则为确定性判断，不调用大模型；只生成提醒，不代替 HR 执行</span>' +
      "</div>";
  }

  function bindRuleList(root) {
    root.querySelectorAll("[data-rule-new]").forEach(function (b) {
      b.onclick = function () { ruleForm(null); };
    });
    root.querySelectorAll("[data-rule-edit]").forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute("data-rule-edit");
        ruleForm(S().state.rules.filter(function (r) { return r.id === id; })[0]);
      };
    });
    root.querySelectorAll("[data-rule-toggle]").forEach(function (b) {
      b.onclick = function () { S().toggleRule(b.getAttribute("data-rule-toggle")); openRules(); };
    });
    root.querySelectorAll("[data-rule-del]").forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute("data-rule-del");
        var r = S().state.rules.filter(function (x) { return x.id === id; })[0];
        U().modal({
          title: "删除提醒规则",
          desc: "删除后不再按该条件生成提醒。",
          body: '<div class="confirm-banner warn" style="margin:0"><span>!</span><div class="grow">' +
            U().esc(r.name) + "（" + r.id + "）</div></div>",
          confirmText: "删除",
          onConfirm: function () { S().deleteRule(id); U().toast("已删除规则"); openRules(); }
        });
      };
    });
  }

  function openRules() {
    U().modal({
      title: "提醒规则配置",
      desc: "决定「什么情况值得提醒 HR」；同一问题不重复提醒。",
      wide: true,
      confirmText: "关闭",
      body: ruleListBody(),
      onConfirm: function (root) { bindRuleList(root); U().closeModal(); }
    });
    bindRuleList(document.querySelector("#modalRoot .modal"));
  }

  function ruleForm(rule) {
    var isNew = !rule;
    rule = rule || {};
    var cats = Object.keys(window.DATA.RULE_CATS).map(function (k) {
      return { v: k, t: window.DATA.RULE_CATS[k] };
    });
    U().modal({
      title: isNew ? "新增提醒规则" : "编辑提醒规则",
      desc: "规则生效后由系统在数据更新时检测，命中即生成一条提醒。",
      wide: true,
      confirmText: isNew ? "创建规则" : "保存修改",
      body:
        '<div class="form-grid">' +
          field("规则名称", input("rName", rule.name, "例如：面试反馈超时")) +
          field("类别", select("rCat", cats, rule.cat || "flow")) +
          field("阈值", input("rTh", rule.threshold || 24, "24")) +
          field("单位", input("rUnit", rule.unit || "小时", "小时 / 天 / 份")) +
          field("数据来源字段", input("rSrc", rule.source, "例如：interview_at · feedback_status")) +
          field("适用范围", select("rScope", [{ v: "all", t: "全部岗位" }], rule.scope || "all")) +
        "</div>" +
        field("触发条件说明", textarea("rDesc", rule.desc, "例如：面试结束超过 24 小时且无反馈记录")) +
        field("建议跟进方式", textarea("rFollow", rule.follow, "例如：由 HR 联系面试官并在 ATS 补录")),
      onConfirm: function (root) {
        var data = {
          name: val(root, "rName"), cat: val(root, "rCat"), threshold: val(root, "rTh"),
          unit: val(root, "rUnit"), source: val(root, "rSrc"), scope: val(root, "rScope"),
          desc: val(root, "rDesc"), follow: val(root, "rFollow")
        };
        if (!data.name) { U().toast("请填写规则名称", "warn"); return true; }
        if (isNew) { S().addRule(data); U().toast("已创建规则：" + data.name, "ok"); }
        else { S().updateRule(rule.id, data); U().toast("规则已保存", "ok"); }
        openRules();
      }
    });
  }

  // ---------------- 简历导入（链路第 2 步）----------------
  var CHANNELS = [
    { v: "官网", t: "官网投递" }, { v: "内推", t: "内部推荐" }, { v: "猎头", t: "猎头推荐" },
    { v: "招聘平台", t: "招聘平台" }, { v: "邮箱附件", t: "邮箱附件" }, { v: "宣讲会", t: "线下宣讲会" }
  ];

  function resumeImportForm(jobId) {
    var job = S().getJob(jobId);
    U().modal({
      title: "导入简历",
      desc: "把渠道简历汇入本岗位批次；导入后状态为「待解析」，需执行初筛才生成匹配结论。",
      confirmText: "确认导入",
      body:
        '<div class="form-grid">' +
          field("来源渠道", select("iChannel", CHANNELS, "内推")) +
          field("导入份数", input("iCount", 8, "例如：8")) +
        "</div>" +
        field("导入说明", input("iNote", "", "例如：10-22 内推批次（可选）")) +
        '<div class="confirm-banner info" style="margin-top:10px"><span>i</span><div class="grow">' +
          "目标岗位：<b>" + U().esc(job.title) + "</b>　·　当前批次 <b>" + U().esc(job.batch.id) + "</b>（" + job.batch.total + " 份）。<br/>" +
          "目标岗位与当前批次如上，导入后计入本批次待解析简历。</div></div>",
      onConfirm: function (root) {
        var n = parseInt(val(root, "iCount"), 10);
        if (!n || n <= 0) { U().toast("请填写导入份数", "warn"); return true; }
        var r = S().importResumes(jobId, { count: n, channel: val(root, "iChannel") });
        if (!r.ok) { U().toast("导入失败", "warn"); return true; }
        U().toast("已导入 " + r.n + " 份简历（待解析），请执行初筛", "ok");
        if (job.batch.status === "completed") {
          U().modal({
            title: "导入完成",
            desc: "本批次已执行过初筛，新导入的 " + r.n + " 份尚未解析。",
            body: '<div class="confirm-banner info" style="margin:0"><span>i</span><div class="grow">' +
              "重新执行初筛时，新简历会与已有简历一并解析；<b>已有结论与备注不会被清空</b>。</div></div>",
            confirmText: "知道了"
          });
          return true;
        }
      }
    });
  }

  // ---------------- 推选业务部门（链路第 6 步）----------------
  function recommendForm(jobId, ids) {
    var job = S().getJob(jobId);
    ids = ids || [];
    // 只有「暂定推荐初筛」且未推选过的候选人可进入推荐单
    var pool = S().visibleCands(jobId).filter(function (c) {
      return c.reviewStatus === "recommend" && c.conclusion !== "failed" &&
        c.conclusion !== "unparsed" && !c.recommended;
    });
    var pre = pool.filter(function (c) { return ids.indexOf(c.id) >= 0; });
    var picked = {};
    (pre.length ? pre : pool).forEach(function (c) { picked[c.id] = true; });
    var excluded = ids.length ? ids.length - pre.length : 0;

    var rows = pool.map(function (c) {
      var ev = S().evidenceScore(c);
      var on = !!picked[c.id];
      return '<label class="rec-pick-row' + (on ? " on" : "") + '">' +
        '<input type="checkbox" data-rec-c="' + c.id + '"' + (on ? " checked" : "") + " />" +
        '<span class="nm">' + U().esc(c.name) + "</span>" +
        '<span class="small muted grow">' + U().esc(c.recent) + (c.years ? " · " + c.years + " 年" : "") + "</span>" +
        U().conclusionTag(c.conclusion) +
        '<span class="small muted" style="flex:0 0 auto">' + (ev === null ? "—" : "证据 " + ev + "%") + "</span>" +
        "</label>";
    }).join("");

    var defaultNote = "本批次初筛后推荐以下候选人，均已核对简历证据。请于期望时间内反馈是否推进面试，谢谢！";
    var toVal = job.bizOwner || "";

    U().modal({
      title: "推荐给业务部门",
      desc: "勾选要推荐的候选人，生成推荐单推给业务负责人。",
      wide: true,
      confirmText: "生成推荐单",
      body:
        '<div class="form-grid">' +
          pp("rTo", "接收人", toVal, "业务对接人；可搜索更换其他员工") +
          field("期望反馈时长", select("rHours", [
            { v: "24", t: "24 小时内" }, { v: "48", t: "48 小时内" }, { v: "72", t: "72 小时内" }
          ], "48")) +
        "</div>" +
        pp("rCc", "抄送人（可选）", "", "可多选，例如 HRBP、面试官", true) +
        field("推荐说明", textarea("rNote", defaultNote, "会随推荐单一起展示给业务方")) +
        '<div class="rec-pick">' +
          '<div class="rec-pick-head"><b>选择候选人</b>' +
            '<span class="small muted">已选 <i id="recPickN">0</i> / ' + pool.length + " 人</span>" +
            '<span class="spacer"></span>' +
            '<button class="link-btn" id="recPickAll">全选</button>' +
            '<button class="link-btn" id="recPickNone">清空</button>' +
          "</div>" +
          (rows
            ? '<div class="rec-pick-list">' + rows + "</div>"
            : '<div class="empty" style="margin:0"><b>暂无可推选的候选人</b>先完成复核并标记「暂定推荐初筛」</div>') +
        "</div>" +
        (excluded > 0
          ? '<div class="small muted" style="margin-top:8px">已排除 ' + excluded + " 人：未标记「暂定推荐初筛」或已推选过</div>"
          : ""),
      onConfirm: function (root) {
        var boxes = root.querySelectorAll("[data-rec-c]");
        var chosen = [];
        Array.prototype.forEach.call(boxes, function (b) {
          if (b.checked) chosen.push(b.getAttribute("data-rec-c"));
        });
        if (!chosen.length) { U().toast("请至少选择 1 位候选人", "warn"); return true; }
        if (!val(root, "rTo")) { U().toast("请选择接收人", "warn"); return true; }
        var r = S().recommendToBiz(jobId, chosen, {
          to: val(root, "rTo"), cc: val(root, "rCc"), hours: val(root, "rHours"), note: val(root, "rNote")
        });
        if (!r.ok) { U().toast("未能生成推荐单", "warn"); return true; }
        U().toast("推荐单 " + r.rec.id + " 已生成，" + r.ok + " 人已推选给 " + r.rec.to, "ok");
        openRecommends(jobId);
        return true;
      }
    });
    var m = modalEl();
    bindPP(m, "rTo", toVal);
    bindPP(m, "rCc", "", true);
    bindPick(m);
  }

  // 候选人勾选：实时更新已选人数与确认按钮
  function bindPick(m) {
    if (!m) return;
    var boxes = m.querySelectorAll("[data-rec-c]");
    var nEl = m.querySelector("#recPickN");
    var ok = document.querySelector("#modalRoot [data-modal-ok]");
    function sync() {
      var n = 0;
      Array.prototype.forEach.call(boxes, function (b) {
        var row = b.parentNode;
        if (row && row.classList) row.classList.toggle("on", b.checked);
        if (b.checked) n++;
      });
      if (nEl) nEl.textContent = n;
      if (ok) ok.textContent = n ? "生成推荐单（" + n + " 人）" : "生成推荐单";
      if (ok) ok.disabled = false;
    }
    Array.prototype.forEach.call(boxes, function (b) { b.onchange = sync; });
    var all = m.querySelector("#recPickAll");
    if (all) all.onclick = function () {
      Array.prototype.forEach.call(boxes, function (b) { b.checked = true; });
      sync();
    };
    var none = m.querySelector("#recPickNone");
    if (none) none.onclick = function () {
      Array.prototype.forEach.call(boxes, function (b) { b.checked = false; });
      sync();
    };
    sync();
  }

  // ---------------- 推荐记录 ----------------
  function recommendTalk(rec, cands) {
    var lines = [
      rec.to + " 你好，",
      "",
      "「" + S().getJob(rec.jobId).title + "」本批次初筛后，推荐以下 " + cands.length + " 位候选人，请查阅：",
      ""
    ];
    cands.forEach(function (c, i) {
      var ev = S().evidenceScore(c);
      lines.push((i + 1) + ". " + c.name + "　" + (c.years ? c.years + " 年 · " : "") + c.recent +
        "　匹配：" + (U().conclusionMeta[c.conclusion] || {}).label + (ev ? "　证据完整度 " + ev + "%" : ""));
    });
    lines.push("");
    lines.push(rec.note || "请于期望时间内反馈是否推进面试。");
    lines.push("");
    lines.push("—— 招聘 HR 李萌　推荐单 " + rec.id);
    return lines.join("\n");
  }

  function recommendDetail(id) {
    var rec = S().state.recommends.filter(function (r) { return r.id === id; })[0];
    if (!rec) return;
    var cands = rec.candidateIds.map(function (cid) { return S().getCandidate(cid); }).filter(Boolean);
    var wait = S().hoursSince(rec.at);
    var overdue = wait >= rec.expectHours;
    U().modal({
      title: "推荐单 " + rec.id,
      desc: "推选给 " + U().esc(rec.to) + " · " + U().fmtTime(rec.at),
      wide: true,
      confirmText: "关闭",
      body:
        '<div class="kv-grid">' +
          '<div><span>推荐人</span><b>' + U().esc(rec.by) + "</b></div>" +
          '<div><span>接收人</span><b>' + U().esc(rec.to) + "</b></div>" +
          (rec.cc ? '<div><span>抄送</span><b>' + U().esc(rec.cc) + "</b></div>" : "") +
          '<div><span>候选人</span><b>' + cands.length + " 人</b></div>" +
          '<div><span>等待时长</span><b style="color:' + (overdue ? "var(--accent)" : "inherit") + '">' + wait + " 小时 / 阈值 " + rec.expectHours + " 小时</b></div>" +
        "</div>" +
        '<div class="table-wrap" style="margin-top:10px"><table class="tbl"><thead><tr>' +
          "<th>候选人</th><th>最近经历</th><th>匹配结论</th><th>业务反馈</th></tr></thead><tbody>" +
          cands.map(function (c) {
            return "<tr><td>" + U().esc(c.name) + "</td><td>" + U().esc(c.recent) + "</td>" +
              "<td>" + U().conclusionTag(c.conclusion) + "</td>" +
              "<td>" + (c.bizFeedback === "pending"
                ? '<span class="tag review">等待中</span>' : '<span class="tag high">已反馈</span>') + "</td></tr>";
          }).join("") +
        "</tbody></table></div>" +
        '<div class="field" style="margin-top:12px"><label>沟通话术</label>' +
        '<textarea class="textarea" id="talkBox" style="height:150px">' + U().esc(recommendTalk(rec, cands)) + "</textarea></div>" +
        (overdue
          ? '<div class="confirm-banner warn" style="margin-top:10px"><span>!</span><div class="grow">' +
            "已超期望反馈时间 " + (wait - rec.expectHours) + " 小时，提醒助手会在规则检测时生成一条「业务部门反馈超时」提醒。</div></div>"
          : '<div class="confirm-banner info" style="margin-top:10px"><span>i</span><div class="grow">' +
            "距期望反馈还有 " + (rec.expectHours - wait) + " 小时，超时后由规则引擎生成提醒，HR 再决定催办方式。</div></div>") +
        '<div class="task-actions" style="margin-top:10px">' +
          '<button class="btn sm ghost" id="rdEdit">编辑推荐单</button>' +
          '<button class="btn sm ghost" id="rdRevoke">撤销推选</button>' +
        "</div>",
      onConfirm: function (root) {
        var box = root.querySelector("#talkBox");
        if (box) {
          box.select();
          try { document.execCommand("copy"); U().toast("话术已复制到剪贴板", "ok"); }
          catch (e) { U().toast("请手动复制话术文本", "warn"); }
        }
      }
    });
    var m = modalEl();
    if (m) {
      var e = m.querySelector("#rdEdit");
      if (e) e.onclick = function () { U().closeModal(); recommendEditForm(id, rec.jobId); };
      var rv = m.querySelector("#rdRevoke");
      if (rv) rv.onclick = function () { U().closeModal(); revokeDialog(id, rec.jobId); };
    }
  }

  function openRecommends(jobId) {
    var job = S().getJob(jobId);
    var list = S().recommends(jobId);
    var rows = list.length ? list.map(function (r) {
      var wait = S().hoursSince(r.at);
      var overdue = wait >= r.expectHours;
      return "<tr>" +
        '<td class="t-job"><b>' + U().esc(r.id) + '</b><div class="muted small">' + U().fmtTime(r.at) + "</div></td>" +
        "<td>" + r.candidateIds.length + " 人</td>" +
        '<td class="small">' + U().esc(r.to) + "</td>" +
        "<td>" + r.expectHours + " 小时</td>" +
        "<td>" + (overdue ? '<span class="tag failed">已超时 ' + (wait - r.expectHours) + "h</span>"
          : '<span class="tag review">等待中 ' + wait + "h</span>") + "</td>" +
        '<td style="text-align:right;white-space:nowrap">' +
          '<button class="btn sm" data-rec-open="' + r.id + '">详情</button> ' +
          '<button class="btn sm ghost" data-rec-edit="' + r.id + '">编辑</button> ' +
          '<button class="btn sm ghost" data-rec-revoke="' + r.id + '">撤销</button></td>' +
      "</tr>";
    }).join("") : '<tr><td colspan="6"><div class="empty"><b>暂无推荐记录</b>复核后标记「暂定推荐初筛」，即可推选给业务部门</div></td></tr>';

    U().modal({
      title: "推荐记录 · " + job.title,
      desc: "推选给业务部门的记录",
      wide: true,
      confirmText: "关闭",
      body: '<div class="table-wrap"><table class="tbl"><thead><tr>' +
        "<th>推荐单</th><th>人数</th><th>接收人</th><th>期望反馈</th><th>状态</th><th></th>" +
        "</tr></thead><tbody>" + rows + "</tbody></table></div>",
      onConfirm: function () { U().closeModal(); }
    });
    var modal = document.querySelector("#modalRoot .modal");
    if (modal) {
      modal.querySelectorAll("[data-rec-open]").forEach(function (b) {
        b.onclick = function () { recommendDetail(b.getAttribute("data-rec-open")); };
      });
      modal.querySelectorAll("[data-rec-edit]").forEach(function (b) {
        b.onclick = function () { recommendEditForm(b.getAttribute("data-rec-edit"), jobId); };
      });
      modal.querySelectorAll("[data-rec-revoke]").forEach(function (b) {
        b.onclick = function () { revokeDialog(b.getAttribute("data-rec-revoke"), jobId); };
      });
    }
  }

  // 编辑推荐单：接收人 / 期望反馈时长 / 说明写错时可改
  function recommendEditForm(recId, jobId) {
    var rec = S().state.recommends.filter(function (r) { return r.id === recId; })[0];
    if (!rec) return;
    U().modal({
      title: "编辑推荐单 " + rec.id,
      desc: "修改后立即生效。",
      wide: true,
      confirmText: "保存修改",
      body:
        '<div class="form-grid">' +
          pp("eTo", "接收人", rec.to, "业务负责人") +
          pp("eCc", "抄送人", rec.cc || "", "可多选，留空则不抄送", true) +
          field("期望反馈时长", select("eHours", [
            { v: "24", t: "24 小时内" }, { v: "48", t: "48 小时内" }, { v: "72", t: "72 小时内" }
          ], String(rec.expectHours || 48))) +
        "</div>" +
        field("推荐说明", textarea("eNote", rec.note, "会随推荐单一起展示给业务方")),
      onConfirm: function (root) {
        var patch = {
          to: val(root, "eTo"), cc: val(root, "eCc"),
          expectHours: val(root, "eHours"), note: val(root, "eNote")
        };
        if (!patch.to) { U().toast("请填写接收人", "warn"); return true; }
        S().editRecommend(recId, patch);
        U().toast("推荐单已更新", "ok");
        openRecommends(jobId || rec.jobId);
      }
    });
    var m = modalEl();
    bindPP(m, "eTo", rec.to || "");
    bindPP(m, "eCc", rec.cc || "", true);
  }

  // 撤销推选 / 删除记录
  function revokeDialog(recId, jobId) {
    var rec = S().state.recommends.filter(function (r) { return r.id === recId; })[0];
    if (!rec) return;
    var pending = rec.candidateIds.filter(function (id) {
      var c = S().getCandidate(id);
      return c && c.bizFeedback === "pending";
    }).length;
    U().modal({
      title: "撤销推荐单 " + rec.id,
      desc: "接收人 " + rec.to + " · " + rec.candidateIds.length + " 人（" + pending + " 人待反馈）",
      confirmText: null,
      body:
        '<div class="confirm-banner warn" style="margin:0 0 10px"><span>!</span><div class="grow">' +
          "撤销后候选人回到「可推选」，可以重新推给别人；仅删除记录则保留候选人的已推选状态。</div></div>" +
        '<div class="task-actions">' +
          '<button class="btn primary" id="rvBack">撤销推选（' + rec.candidateIds.length + " 人回到可推选)</button>" +
          '<button class="btn ghost" id="rvKeep">仅删除这条记录</button>' +
        "</div>"
    });
    var m = modalEl();
    if (!m) return;
    m.querySelector("#rvBack").onclick = function () {
      S().revokeRecommend(recId, false);
      U().closeModal();
      U().toast("已撤销推选，" + rec.candidateIds.length + " 人回到「可推选」", "ok");
      openRecommends(jobId || rec.jobId);
    };
    m.querySelector("#rvKeep").onclick = function () {
      S().revokeRecommend(recId, true);
      U().closeModal();
      U().toast("推荐记录已删除", "ok");
      openRecommends(jobId || rec.jobId);
    };
  }

  // ---------------- 业务方：推荐单反馈 ----------------
  function bizFeedback(recId) {
    var rec = S().state.recommends.filter(function (r) { return r.id === recId; })[0];
    if (!rec) return;
    var job = S().getJob(rec.jobId) || {};
    var cands = rec.candidateIds.map(function (id) { return S().getCandidate(id); })
      .filter(Boolean).filter(function (c) { return c.bizFeedback === "pending"; });
    if (!cands.length) { U().toast("这张推荐单里的候选人已全部反馈", "warn"); return; }

    var picks = {};

    var rows = cands.map(function (c) {
      var score = S().evidenceScore(c);
      return '<div class="fbz-row" data-fbz="' + c.id + '">' +
        '<div class="fbz-who"><i class="pp-av">' + U().esc(c.name.slice(0, 1)) + "</i>" +
          "<div><b>" + U().esc(c.name) + "</b>" +
          '<div class="small muted">' + U().esc(c.recent) + "</div>" +
          '<div class="small muted">' + c.years + " 年 · " + U().esc(c.edu) + "</div></div></div>" +
        '<div class="fbz-mid">' + U().conclusionTag(c.conclusion) +
          (score !== null ? '<span class="small muted">证据 ' + score + "%</span>" : "") +
          '<button class="link-btn" data-fbz-resume="' + c.id + '">看简历</button></div>' +
        '<div class="fbz-opt">' +
          '<button class="fbz-b" data-pick="interview">同意面试</button>' +
          '<button class="fbz-b" data-pick="reject">不合适</button>' +
          '<button class="fbz-b" data-pick="hold">待定</button>' +
        "</div></div>";
    }).join("");

    U().modal({
      title: "反馈推荐单 " + rec.id,
      desc: U().esc(job.title || "") + " · " + U().esc(rec.by) + " 推选 · 期望 " + (rec.expectHours || 48) + " 小时内反馈",
      wide: true,
      confirmText: "提交反馈",
      body:
        '<div class="confirm-banner info"><span>i</span><div class="grow">' +
          "<b>同意面试</b>表示你愿意约面，具体时间由 HR 与你确认。</div></div>" +
        '<div class="fbz-tools"><button class="btn sm" id="fbzAll">全部同意推进面试</button>' +
          '<span class="small muted">可逐个调整</span></div>' +
        '<div class="fbz-list">' + rows + "</div>" +
        '<div class="field" style="margin-top:6px"><label>反馈备注（可选，会同步给 HR）</label>' +
          '<textarea class="textarea" id="fbzNote" placeholder="例如：简历不错，优先安排本周三下午面试"></textarea></div>',
      onConfirm: function (root) {
        var ids = Object.keys(picks);
        if (!ids.length) { U().toast("请至少给一位候选人选择结论", "warn"); return true; }
        var note = val(root, "fbzNote");
        var groups = { interview: [], reject: [], hold: [] };
        ids.forEach(function (id) { groups[picks[id]].push(id); });
        var total = 0;
        ["interview", "reject", "hold"].forEach(function (k) {
          if (!groups[k].length) return;
          var r = S().feedbackRecommend(recId, k, note, groups[k]);
          if (r.ok) total += r.n;
        });
        U().toast("已反馈 " + total + " 人，招聘 HR 已收到", "ok");
        return false;
      }
    });

    var modal = modalEl();
    if (!modal) return;

    function paint() {
      modal.querySelectorAll("[data-fbz]").forEach(function (row) {
        var cid = row.getAttribute("data-fbz");
        row.querySelectorAll("[data-pick]").forEach(function (b) {
          var v = b.getAttribute("data-pick");
          b.classList.toggle("on", picks[cid] === v);
        });
      });
    }

    modal.querySelectorAll("[data-pick]").forEach(function (b) {
      b.onclick = function () {
        var cid = b.closest("[data-fbz]").getAttribute("data-fbz");
        var v = b.getAttribute("data-pick");
        if (picks[cid] === v) delete picks[cid]; else picks[cid] = v;
        paint();
      };
    });
    modal.querySelectorAll("[data-fbz-resume]").forEach(function (b) {
      b.onclick = function () { window.Resume.open(b.getAttribute("data-fbz-resume")); };
    });
    var all = modal.querySelector("#fbzAll");
    if (all) all.onclick = function () {
      cands.forEach(function (c) { picks[c.id] = "interview"; });
      paint();
      U().toast("已全部标记为同意面试，可个别调整", "ok");
    };
  }

  // ---------------- 成员与权限（管理员 / 招聘负责人）----------------
  function openMembers() {
    var A = window.Auth;
    if (!A.can("members.manage")) { U().toast("当前角色无成员管理权限", "warn"); return; }
    var me = A.user();

    var rows = A.accounts().map(function (a) {
      var roleOpts = (window.DATA.HR_ROLES || Object.keys(window.DATA.ROLES)).map(function (r) {
        return '<option value="' + r + '"' + (a.role === r ? " selected" : "") + ">" + window.DATA.ROLES[r].label + "</option>";
      }).join("");
      var isMe = me && a.id === me.id;
      return "<tr>" +
        '<td><div class="cell-name"><div class="avatar" style="width:22px;height:22px;font-size:10px">' + U().esc(a.avatar) + "</div>" +
          "<div><div class=\"nm\">" + U().esc(a.name) + (isMe ? ' <span class="tag muted">我</span>' : "") + "</div>" +
          '<div class="muted small">' + U().esc(a.mail) + "</div></div></div></td>" +
        '<td class="small">' + U().esc(a.dept || "—") + "</td>" +
        '<td><select class="select" style="height:26px;padding:0 6px;font-size:11.5px" data-role-set="' + a.id + '"' +
          (isMe ? " disabled title=\"不能修改自己的角色\"" : "") + ">" + roleOpts + "</select></td>" +
        "<td>" + (a.active === false ? '<span class="tag muted">已停用</span>' : '<span class="dot-tag green"><i></i>正常</span>') + "</td>" +
        '<td class="small muted">' + (a.lastLogin ? U().fmtTime(a.lastLogin) : "—") + "</td>" +
        '<td style="text-align:right;white-space:nowrap">' +
          '<button class="btn sm ghost" data-mem-toggle="' + a.id + '"' + (isMe ? " disabled" : "") + ">" +
            (a.active === false ? "恢复" : "停用") + "</button> " +
          '<button class="btn sm ghost" data-mem-del="' + a.id + '"' + (isMe ? " disabled" : "") + ">删除</button>" +
        "</td></tr>";
    }).join("");

    U().modal({
      title: "成员与权限",
      desc: "招聘团队账号；招聘负责人可管理成员与提醒规则。",
      wide: true,
      confirmText: "关闭",
      body:
        '<div class="table-wrap"><table class="tbl"><thead><tr>' +
          "<th>成员</th><th>部门</th><th>角色</th><th>状态</th><th>最近登录</th><th></th>" +
        "</tr></thead><tbody>" + rows + "</tbody></table></div>" +
        '<div class="confirm-banner info" style="margin-top:10px"><span>i</span><div class="grow">' +
          "停用后无法登录，已产生的数据保留；删除只移除登录账号，不影响历史初筛与推荐记录。</div></div>",
      onConfirm: function () { U().closeModal(); }
    });

    var modal = modalEl();
    if (!modal) return;
    modal.querySelectorAll("[data-role-set]").forEach(function (sel) {
      sel.onchange = function () {
        var id = sel.getAttribute("data-role-set");
        if (!A.setRole(id, sel.value)) {
          U().toast("不能把自己改为无管理权限的角色", "warn");
          var cur = A.accounts().filter(function (x) { return x.id === id; })[0];
          sel.value = cur.role;
          return;
        }
        U().toast("角色已更新为 " + window.DATA.ROLES[sel.value].label, "ok");
      };
    });
    modal.querySelectorAll("[data-mem-toggle]").forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute("data-mem-toggle");
        if (!A.toggleActive(id)) { U().toast("不能停用当前登录账号", "warn"); return; }
        openMembers();
      };
    });
    modal.querySelectorAll("[data-mem-del]").forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute("data-mem-del");
        var acc = A.accounts().filter(function (x) { return x.id === id; })[0];
        U().modal({
          title: "删除成员",
          desc: "删除后该账号立即失效，历史操作日志保留。",
          confirmText: "确认删除",
          body: '<div class="small">确定删除 <b>' + U().esc(acc ? acc.name : id) + "</b>（" + U().esc(acc ? acc.mail : "") + "）？</div>",
          onConfirm: function () {
            if (!A.removeAccount(id)) { U().toast("不能删除当前登录账号", "warn"); return true; }
            U().toast("成员已删除", "ok");
            setTimeout(openMembers, 60);
          }
        });
      };
    });
  }

  window.Admin.openJobs = openJobs;
  window.Admin.openRules = openRules;
  window.Admin.jobForm = jobForm;
  window.Admin.candidateForm = candidateForm;
  window.Admin.resumeImportForm = resumeImportForm;
  window.Admin.recommendForm = recommendForm;
  window.Admin.openRecommends = openRecommends;
  window.Admin.openTrack = recommendDetail;
  window.Admin.recommendEditForm = recommendEditForm;
  window.Admin.revokeDialog = revokeDialog;
  window.Admin.bizFeedback = bizFeedback;
  window.Admin.openMembers = openMembers;
})();
