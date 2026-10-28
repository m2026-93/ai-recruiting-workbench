(function () {
  window.DATA = window.DATA || {};

  // 原型统一时间基准：所有“已等待时长/今日已处理”均相对此时间计算，保证跨页面数字一致
  DATA.NOW = "2026-10-22T16:35:00+08:00";
  DATA.TODAY = "2026-10-22";

  DATA.JOBS = [
    {
      id: "JOB-PM-001",
      title: "产品经理（商业化方向）",
      dept: "网易严选 · 商业化产品组",
      city: "杭州",
      owner: "李萌（招聘 HR）",
      headcount: 2,
      priority: "P0 · 紧急",
      jd: "负责严选商业化变现方向的产品规划与落地：广告投放、会员权益、商家营销工具等场景的需求分析、方案设计与迭代，独立输出 PRD 并推动跨团队协作。要求 3 年以上互联网产品经验，有商业化产品落地经验者优先。",
      resumeCount: 40,
      source: "内推 12 · 官网 18 · 猎头 6 · 招聘平台 4",
      bizOwner: "陈昊（严选商业化产品负责人）",
      bizTeam: "严选 · 商业化产品组",
      createdAt: "2026-09-28",
      batch: {
        id: "B-PM-01",
        status: "completed",
        total: 40,
        processed: 37,
        failed: 3,
        startedAt: "2026-10-21T09:12:00+08:00",
        finishedAt: "2026-10-21T09:34:00+08:00"
      }
    },
    {
      id: "JOB-DA-002",
      title: "数据分析师（增长方向）",
      dept: "网易云音乐 · 增长分析组",
      city: "杭州",
      owner: "李萌（招聘 HR）",
      headcount: 1,
      priority: "P1",
      jd: "负责云音乐增长业务的数据分析：搭建业务指标体系，用 SQL 与 BI 完成数据提取、看板搭建和专题分析；与产品、运营协作评估增长策略效果。要求 2 年以上数据分析经验，统计 / 数学 / 计算机相关专业。",
      resumeCount: 24,
      source: "官网 14 · 内推 6 · 招聘平台 4",
      bizOwner: "林薇（云音乐增长负责人）",
      bizTeam: "云音乐 · 增长分析组",
      createdAt: "2026-10-09",
      batch: {
        id: "B-DA-01",
        status: "pending",
        total: 24,
        processed: 0,
        failed: 0,
        startedAt: null,
        finishedAt: null
      }
    },
    {
      id: "JOB-OP-003",
      title: "内容运营（新媒体方向）",
      dept: "网易新闻 · 内容运营组",
      city: "北京",
      owner: "李萌（招聘 HR）",
      headcount: 1,
      priority: "P2",
      jd: "负责网易新闻新媒体账号的内容策划与运营：选题、脚本、发布与数据复盘；与设计、视频团队协作产出图文与短视频内容。要求 1 年以上新媒体运营经验，有爆款内容案例者优先。",
      resumeCount: 9,
      source: "官网 5 · 招聘平台 4",
      bizOwner: "赵鹏（网易新闻内容运营负责人）",
      bizTeam: "网易新闻 · 内容运营组",
      createdAt: "2026-10-15",
      batch: {
        id: "B-OP-01",
        status: "pending",
        total: 9,
        processed: 0,
        failed: 0,
        startedAt: null,
        finishedAt: null
      }
    }
  ];

  // 筛选标准：type = hard（硬性条件，必须由 HR 确认）/ core（核心能力）/ bonus（加分项）
  DATA.CRITERIA = {
    "JOB-PM-001": [
      { id: "PM-h1", type: "hard", label: "本科及以上学历，可接受杭州/北京办公", importance: "必须", confirmed: true },
      { id: "PM-h2", type: "hard", label: "3 年以上互联网产品经验，独立负责过完整产品线", importance: "必须", confirmed: true },
      { id: "PM-h3", type: "hard", label: "具备产品需求分析能力，能独立撰写 PRD", importance: "必须", confirmed: true },
      { id: "PM-c1", type: "core", label: "数据分析能力：能定义指标并用数据验证方案效果", importance: "高", confirmed: true },
      { id: "PM-c2", type: "core", label: "跨部门协作与项目推进能力", importance: "中", confirmed: true },
      { id: "PM-c3", type: "core", label: "商业化理解：熟悉广告 / 会员 / 电商任一变现模式", importance: "高", confirmed: true },
      { id: "PM-b1", type: "bonus", label: "有商业化产品（广告投放 / 会员体系 / 电商交易）落地经验", importance: "加分", confirmed: true },
      { id: "PM-b2", type: "bonus", label: "有 B 端或中台产品经验", importance: "加分", confirmed: true }
    ],
    "JOB-DA-002": [
      { id: "DA-h1", type: "hard", label: "本科及以上，统计 / 数学 / 计算机相关专业", importance: "必须", confirmed: false },
      { id: "DA-h2", type: "hard", label: "2 年以上数据分析经验，熟练使用 SQL", importance: "必须", confirmed: false },
      { id: "DA-h3", type: "hard", label: "能独立完成指标体系搭建", importance: "必须", confirmed: false },
      { id: "DA-c1", type: "core", label: "增长 / 用户行为分析经验", importance: "高", confirmed: false },
      { id: "DA-c2", type: "core", label: "BI 工具与看板搭建能力", importance: "中", confirmed: false },
      { id: "DA-b1", type: "bonus", label: "A/B 实验设计与归因分析经验", importance: "加分", confirmed: false },
      { id: "DA-b2", type: "bonus", label: "Python 数据处理与建模能力", importance: "加分", confirmed: false }
    ],
    "JOB-OP-003": [
      { id: "OP-h1", type: "hard", label: "本科及以上，1 年以上新媒体运营经验", importance: "必须", confirmed: false },
      { id: "OP-h2", type: "hard", label: "有独立完成选题到发布的全流程经验", importance: "必须", confirmed: false },
      { id: "OP-c1", type: "core", label: "内容策划与文案能力", importance: "高", confirmed: false },
      { id: "OP-c2", type: "core", label: "数据复盘意识：能看懂阅读、完播、转化指标", importance: "中", confirmed: false },
      { id: "OP-b1", type: "bonus", label: "有短视频脚本或剪辑经验", importance: "加分", confirmed: false }
    ]
  };

  DATA.IMPORTANCE_OPTIONS = ["必须", "高", "中", "加分"];
})();
