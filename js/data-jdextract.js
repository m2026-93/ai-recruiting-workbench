(function () {
  var D = window.DATA;

  // JD 要点提取结果（原型：按 JD 文本的规则 + 关键词预置，非真实大模型推理）
  // confidence: high 高（JD 有明确表述）/ mid 中（需推断）/ low 低（JD 未提及，来自岗位模板或同类岗位）
  D.JD_EXTRACT = {
    "JOB-PM-001": {
      engine: "JD 要点提取 v0.3 · 规则 + 关键词",
      items: [
        { id: "J1", text: "3 年以上互联网产品经验", type: "hard", importance: "必须", confidence: "high",
          source: "「要求 3 年以上互联网产品经验」" },
        { id: "J2", text: "能独立完成需求分析与方案设计，独立输出 PRD", type: "hard", importance: "必须", confidence: "high",
          source: "「需求分析、方案设计与迭代，独立输出 PRD」" },
        { id: "J3", text: "本科及以上学历", type: "hard", importance: "必须", confidence: "low",
          source: "JD 未提及，取自岗位默认模板", note: "JD 未写学历要求，是否保留由 HR 决定" },
        { id: "J4", text: "商业化变现方向经验：广告投放 / 会员权益 / 商家营销工具", type: "core", importance: "高", confidence: "high",
          source: "「严选商业化变现方向…广告投放、会员权益、商家营销工具等场景」" },
        { id: "J5", text: "跨团队协同与项目推进能力", type: "core", importance: "中", confidence: "mid",
          source: "「推动跨团队协作」" },
        { id: "J6", text: "数据分析与效果验证能力", type: "core", importance: "高", confidence: "low",
          source: "JD 未明确，据同类岗位补充", note: "JD 未出现数据相关表述，建议确认是否纳入" },
        { id: "J7", text: "有商业化产品落地经验", type: "bonus", importance: "加分", confidence: "high",
          source: "「有商业化产品落地经验者优先」" },
        { id: "J8", text: "电商 / 零售行业背景", type: "bonus", importance: "加分", confidence: "low",
          source: "JD 未提及，据业务线推断", note: "从严选业务线推断，非 JD 原文" }
      ]
    },
    "JOB-DA-002": {
      engine: "JD 要点提取 v0.3 · 规则 + 关键词",
      items: [
        { id: "J1", text: "2 年以上数据分析经验", type: "hard", importance: "必须", confidence: "high",
          source: "「要求 2 年以上数据分析经验」" },
        { id: "J2", text: "统计 / 数学 / 计算机相关专业", type: "hard", importance: "必须", confidence: "high",
          source: "「统计 / 数学 / 计算机相关专业」" },
        { id: "J3", text: "熟练使用 SQL 完成数据提取", type: "hard", importance: "必须", confidence: "high",
          source: "「用 SQL 与 BI 完成数据提取」" },
        { id: "J4", text: "能独立搭建业务指标体系", type: "core", importance: "高", confidence: "high",
          source: "「搭建业务指标体系」" },
        { id: "J5", text: "BI 工具与看板搭建能力", type: "core", importance: "中", confidence: "high",
          source: "「看板搭建和专题分析」" },
        { id: "J6", text: "增长 / 用户行为分析经验", type: "core", importance: "高", confidence: "mid",
          source: "「云音乐增长业务…评估增长策略效果」" },
        { id: "J7", text: "A/B 实验设计与归因分析", type: "bonus", importance: "加分", confidence: "low",
          source: "JD 未提及，据同类岗位补充" }
      ]
    },
    "JOB-OP-003": {
      engine: "JD 要点提取 v0.3 · 规则 + 关键词",
      items: [
        { id: "J1", text: "1 年以上新媒体运营经验", type: "hard", importance: "必须", confidence: "high",
          source: "「要求 1 年以上新媒体运营经验」" },
        { id: "J2", text: "能独立完成选题—脚本—发布全流程", type: "core", importance: "高", confidence: "high",
          source: "「选题、脚本、发布与数据复盘」" },
        { id: "J3", text: "数据复盘能力：看懂阅读、完播、转化指标", type: "core", importance: "中", confidence: "mid",
          source: "「发布与数据复盘」" },
        { id: "J4", text: "有爆款内容案例", type: "bonus", importance: "加分", confidence: "high",
          source: "「有爆款内容案例者优先」" },
        { id: "J5", text: "短视频脚本或剪辑能力", type: "bonus", importance: "加分", confidence: "mid",
          source: "「产出图文与短视频内容」" }
      ]
    }
  };

  D.CONFIDENCE_META = {
    high: { label: "JD 明确", cls: "high" },
    mid: { label: "需推断", cls: "review" },
    low: { label: "JD 未提及", cls: "low" }
  };

  // 新建岗位时没有预置提取结果，用确定性关键词扫描 JD 文本生成候选要点
  D.SCAN_ENGINE = "JD 要点提取 v0.3 · 关键词扫描";
  D.scanJd = function (jd) {
    var t = jd || "";
    var out = [];
    function push(id, text, type, importance, confidence, source, note) {
      out.push({ id: id, text: text, type: type, importance: importance, confidence: confidence, source: source, note: note });
    }
    var m = t.match(/(\d+)\s*年以上/);
    if (m) push("S1", m[1] + " 年以上相关工作经验", "hard", "必须", "high", "「" + m[0] + "」");
    if (/本科|硕士|研究生|学历/.test(t)) {
      var e = t.match(/(本科|硕士|研究生)[^，。；]*/);
      push("S2", (e ? e[0] : "本科") + "及以上学历", "hard", "必须", "high", "「" + (e ? e[0] : "学历") + "」");
    }
    if (/PRD|需求分析|方案设计|产品设计/.test(t)) {
      push("S3", "具备需求分析与方案设计能力，能独立输出 PRD", "hard", "必须", "high", "「需求分析 / 方案设计 / PRD」");
    }
    if (/SQL|数据分析|指标体系|看板|BI|数据/.test(t)) {
      push("S4", "数据分析能力：能定义指标并用数据验证效果", "core", "高", "mid", "「数据分析 / 指标 / SQL」");
    }
    if (/商业化|广告|会员|变现|营收|增长/.test(t)) {
      push("S5", "商业化 / 增长方向业务理解", "core", "高", "mid", "「商业化或增长相关表述」");
    }
    if (/协作|跨团队|推动|沟通/.test(t)) {
      push("S6", "跨团队协同与项目推进能力", "core", "中", "mid", "「协作 / 跨团队」");
    }
    var b = t.match(/([^，。；]*优先[^，。；]*)/);
    if (b) push("S7", b[1].replace(/者优先|优先/g, "").trim() || "优先项", "bonus", "加分", "high", "「" + b[1] + "」");
    if (out.length < 3) {
      push("S8", "JD 内容过短，未提取到足够要点", "core", "中", "low", "JD 文本不足 3 条可用信息",
        "建议补充 JD 后重新提取，或手动添加筛选标准");
    }
    return out;
  };
})();
