(function () {
  var D = window.DATA;

  var SURNAMES = ["顾", "邵", "崔", "常", "温", "岑", "席", "鹿", "曾", "覃", "包", "车", "尹", "江", "童", "翁", "万", "柏", "石", "应", "苗", "费", "卜", "冷", "麦", "全文", "骆", "戚"];
  var GIVENS = ["一鸣", "云舒", "予安", "嘉言", "若舟", "之衡", "明远", "子衿", "亦阳", "书宁", "静川", "泽宇", "沐辰", "心远", "秋实", "星野", "昱辰", "承宇", "清越", "以宁", "南乔", "叙白", "识野", "若初"];

  var COMPANIES = ["某电商平台", "某在线教育公司", "某本地生活平台", "某出行科技公司", "某社交内容平台", "某广告技术公司", "某 SaaS 服务商", "某零售集团", "某金融科技公司", "某游戏发行公司", "某母婴品牌", "某供应链服务商"];
  var TITLES = ["产品经理", "高级产品经理", "产品主管", "数据分析师", "高级数据分析师", "内容运营", "运营主管"];
  var EDUS = ["本科 · 某 211 高校 · 信息管理", "硕士 · 某 985 高校 · 管理科学与工程", "本科 · 普通本科 · 市场营销", "硕士 · 海外院校 · 计算机科学", "本科 · 普通本科 · 统计学", "硕士 · 某 211 高校 · 应用统计"];
  var SKILLS = ["需求分析", "PRD 撰写", "SQL", "Tableau", "数据分析", "竞品分析", "项目管理", "广告投放", "会员体系", "A/B 测试", "用户增长", "看板搭建", "内容策划", "活动运营"];
  var PRODUCTS = ["投放配置后台", "商家营销工具", "会员权益中心", "经营分析看板", "内容分发策略", "订单履约链路", "用户增长活动平台", "广告素材系统", "人群定向能力", "数据指标平台"];
  var QUOTES = [
    "负责{product}的需求分析与版本规划，独立输出 PRD 与验收标准",
    "主导{product}从 0 到 1 的设计，完成 20+ 场用户访谈与方案评审",
    "负责{product}的迭代优化，跟踪核心指标并按周复盘",
    "参与{product}的需求梳理、上线验收与问题回收"
  ];

  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function pad3(n) { return n < 10 ? "00" + n : (n < 100 ? "0" + n : "" + n); }

  function statusFor(c, conclusion, i, idxInType) {
    if (conclusion === "high") {
      if (c.type === "hard") return "matched";
      if (c.type === "core") return idxInType === 0 && i % 3 === 0 ? "limited" : "matched";
      return idxInType === 0 ? "matched" : i % 2 ? "limited" : "missing";
    }
    if (conclusion === "review") {
      if (c.type === "hard") return "matched";
      if (c.type === "core") {
        if (idxInType === 0) return "limited";
        return i % 2 ? "missing" : "limited";
      }
      return "limited";
    }
    if (c.type === "hard") return idxInType === i % 3 ? "missing" : "matched";
    if (c.type === "core") return "limited";
    return "missing";
  }

  function genEvidence(criteria, conclusion, i, company, title) {
    var ev = {};
    var counters = { hard: 0, core: 0, bonus: 0 };
    criteria.forEach(function (c) {
      var idx = counters[c.type]++;
      var st = statusFor(c, conclusion, i, idx);
      var product = PRODUCTS[(i + idx) % PRODUCTS.length];
      var q = QUOTES[(i + idx) % QUOTES.length].replace("{product}", product);
      if (st === "matched") {
        ev[c.id] = {
          status: "matched",
          text: "在「" + product + "」项目中承担了与该要求相关的工作，简历中有可核实的动作描述。",
          quote: "「" + q + "」",
          source: "工作经历 · " + company + " · " + title
        };
      } else if (st === "limited") {
        ev[c.id] = {
          status: "limited",
          text: "简历仅在技能栏或职责概述中出现与「" + c.label.slice(0, 14) + "…」相关的表述，未提供具体项目或结果。",
          quote: "「技能：" + SKILLS[(i + idx) % SKILLS.length] + "、" + SKILLS[(i + idx + 3) % SKILLS.length] + "」",
          source: "技能清单（无对应项目说明）"
        };
      } else {
        ev[c.id] = {
          status: "missing",
          text: "未在简历中找到与「" + c.label.slice(0, 16) + "…」直接相关的经历描述。",
          quote: null,
          source: null
        };
      }
    });
    return ev;
  }

  var IMPORT_SURNAMES = ["沈", "罗", "贺", "龚", "汤", "黎", "易", "武", "乔", "赖", "文", "施", "章", "鲁", "韦", "昌", "马", "凤", "花", "方", "俞", "任", "袁", "柳", "唐", "雷"];
  var _ig = ["知远", "砚清", "望舒", "斯年", "照野", "怀瑾", "观澜", "向晚", "长风", "映真",
    "安泽", "思远", "景明", "笑白", "若谷", "清和", "知微", "南屏", "砚书", "子墨",
    "听澜", "归远", "疏桐", "明轩"];

  // 简历导入：取一个不与现有候选人重名的姓名
  D.pickName = function (used) {
    for (var t = 0; t < 400; t++) {
      var n = IMPORT_SURNAMES[(t * 7) % IMPORT_SURNAMES.length] + _ig[(t * 5) % _ig.length];
      if (!used[n]) { used[n] = true; return n; }
    }
    return "新候选人" + Math.floor(Math.random() * 900 + 100);
  };

  // 生成一份「已导入、待解析」的简历记录（不预置结论，结论由批量初筛产生）
  D.makeImported = function (job, id, channel, seq, name) {
    var company = COMPANIES[(seq * 3) % COMPANIES.length];
    var title = TITLES[(seq * 5) % TITLES.length];
    var years = 1 + (seq % 6);
    var skills = [];
    for (var k = 0; k < 3; k++) {
      var s = SKILLS[(seq * 4 + k * 5) % SKILLS.length];
      if (skills.indexOf(s) < 0) skills.push(s);
    }
    return {
      id: id, jobId: job.id, name: name, years: years,
      recent: company + " · " + title,
      edu: EDUS[seq % EDUS.length],
      skills: skills,
      conclusion: "unparsed",
      file: name + "_简历_" + (2026) + ".pdf",
      summary: "",
      stage: "简历待解析",
      stageUpdatedAt: D.NOW,
      interviewAt: null, feedbackStatus: "n/a",
      reviewStatus: "pending", reviewer: null, reviewAt: null, reviewNote: "",
      parseStatus: "queued", evidence: {},
      channel: channel, importedAt: D.NOW, imported: true
    };
  };

  // 供「复用筛选标准」后按新标准重算证据
  D.genEvidence = genEvidence;

  // 生成一批候选人：plan 指定各结论数量
  D.buildGenerated = function (job, criteria, opts) {
    var n = opts.count;
    var pool = [];
    var i;
    var leftHigh = opts.high || 0, leftReview = opts.review || 0, leftLow = opts.low || 0;
    for (i = 0; i < n; i++) {
      if (leftHigh > 0 && i % 8 === 0) { pool.push("high"); leftHigh--; }
      else if (leftReview > 0 && i % 4 === 1) { pool.push("review"); leftReview--; }
      else if (leftLow > 0) { pool.push("low"); leftLow--; }
      else if (leftReview > 0) { pool.push("review"); leftReview--; }
      else if (leftHigh > 0) { pool.push("high"); leftHigh--; }
      else pool.push("low");
    }
    var failedNeeded = opts.failed || 0;
    for (i = 0; i < failedNeeded; i++) pool[n - 1 - i] = "failed";

    var reserved = opts.reserved || {};
    var out = [];
    var pendingLeft = opts.pending || 0;
    var todayLeft = opts.reviewedToday || 0;
    var reviewIdx = 0;

    for (i = 0; i < n; i++) {
      var conclusion = pool[i];
      var seq = opts.startSeq + i;
      var id = opts.idPrefix + pad3(seq);
      var si = (seq * 5) % SURNAMES.length;
      var gi = (seq * 7) % GIVENS.length;
      var name = SURNAMES[si] + GIVENS[gi];
      var guard = 0;
      while (reserved[name] && guard < 40) { gi = (gi + 3) % GIVENS.length; name = SURNAMES[si] + GIVENS[gi]; guard++; }
      reserved[name] = true;

      var company = COMPANIES[(seq * 3) % COMPANIES.length];
      var title = TITLES[(seq * 5 + (conclusion === "low" ? 2 : 0)) % 4];
      if (opts.titlePool) title = opts.titlePool[(seq * 3) % opts.titlePool.length];
      var years = conclusion === "low" ? (seq % 2 ? 1 + (seq % 2) : 4 + (seq % 4)) : 3 + (seq % 4);
      var skills = [];
      for (var k = 0; k < 3 + (seq % 3); k++) {
        var s = SKILLS[(seq * 4 + k * 3) % SKILLS.length];
        if (skills.indexOf(s) < 0) skills.push(s);
      }

      var cand = {
        id: id, jobId: job.id, name: name, years: years,
        recent: company + " · " + title,
        edu: EDUS[seq % EDUS.length],
        skills: skills,
        conclusion: conclusion,
        file: name + "_简历_2026.pdf",
        summary: conclusion === "failed"
          ? ""
          : (conclusion === "high"
            ? years + " 年产品经验，负责过" + PRODUCTS[seq % PRODUCTS.length] + "相关的需求与迭代，简历中多项要求有可核实描述。"
            : conclusion === "review"
              ? years + " 年相关经验，方向与岗位部分重合；部分核心能力仅在技能栏出现，缺少项目层面的证据。"
              : years + " 年相关经验，主要方向与岗位要求差异较大，硬性条件存在缺口。"),
        stage: opts.stage || "简历初筛",
        stageUpdatedAt: opts.stageUpdatedAt || "2026-10-21T09:30:00+08:00",
        interviewAt: null, feedbackStatus: "n/a",
        reviewStatus: "pending", reviewer: null, reviewAt: null, reviewNote: ""
      };

      if (conclusion === "failed") {
        cand.parseStatus = "failed";
        cand.parseError = opts.failReason || "简历解析失败，请检查文件格式（文本层缺失）";
        cand.evidence = {};
        cand.years = null; cand.recent = "—"; cand.edu = "—"; cand.skills = []; cand.summary = "";
        out.push(cand);
        continue;
      }

      cand.evidence = genEvidence(criteria, conclusion, seq, company, title);

      // 审核状态分配
      if (conclusion === "review" && pendingLeft > 0) {
        pendingLeft--;
      } else if (opts.allPending) {
        // 保持待复核
      } else {
        cand.reviewStatus = conclusion === "high" ? "recommend" : "reject";
        cand.reviewer = "李萌";
        if (todayLeft > 0) {
          var hrs = [8, 10, 13][reviewIdx % 3];
          cand.reviewAt = "2026-10-22T" + pad(hrs) + ":" + pad(15 + (reviewIdx * 7) % 40) + ":00+08:00";
          todayLeft--;
        } else {
          var day = 21 - (reviewIdx % 4);
          cand.reviewAt = "2026-10-" + pad(day) + "T1" + (reviewIdx % 5) + ":20:00+08:00";
        }
        reviewIdx++;
        cand.reviewNote = conclusion === "reject" ? "综合评估后暂不推进。" : "证据较充分，建议推进。";
      }
      out.push(cand);
    }
    return out;
  };
})();
