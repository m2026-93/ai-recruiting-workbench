(function () {
  window.DATA = window.DATA || {};

  // 企业内部通讯录（模拟）：真实环境来自 HR 主数据 / 企业微信通讯录接口
  // pinyin 全拼 · short 首字母 · dept 部门 · title 职务 · mail 企业邮箱 · kind 角色
  DATA.EMPLOYEES = [
    { id: "E1001", name: "陈昊",   pinyin: "chenhao",   short: "ch", dept: "网易严选 · 商业化产品组", title: "严选商业化产品负责人", mail: "chenhao@corp.netease.com",   kind: "biz", freq: true },
    { id: "E1002", name: "林薇",   pinyin: "linwei",    short: "lw", dept: "网易云音乐 · 增长分析组", title: "云音乐增长负责人",     mail: "linwei@corp.netease.com",    kind: "biz", freq: true },
    { id: "E1003", name: "赵鹏",   pinyin: "zhaopeng",  short: "zp", dept: "网易新闻 · 内容运营组",   title: "网易新闻内容运营负责人", mail: "zhaopeng@corp.netease.com", kind: "biz", freq: true },
    { id: "E1004", name: "李萌",   pinyin: "limeng",    short: "lm", dept: "人力资源部 · 招聘中心",   title: "招聘 HR",            mail: "limeng@corp.netease.com",    kind: "hr",  freq: true, self: true },
    { id: "E1005", name: "马晓宇", pinyin: "maxiaoyu",  short: "mxy", dept: "人力资源部 · 招聘中心",   title: "招聘负责人",          mail: "maxiaoyu@corp.netease.com",  kind: "hr",  freq: true },
    { id: "E1006", name: "吴桐",   pinyin: "wutong",    short: "wt", dept: "网易严选 · 商业化产品组", title: "严选产品总监",        mail: "wutong@corp.netease.com",    kind: "biz" },
    { id: "E1007", name: "周予安", pinyin: "zhouyuan",  short: "zya", dept: "网易严选 · 商业化产品组", title: "高级产品经理",        mail: "zhouyuan@corp.netease.com",  kind: "interviewer" },
    { id: "E1008", name: "罗嘉",   pinyin: "luojia",    short: "lj", dept: "网易严选 · 商业化产品组", title: "商业化产品经理",      mail: "luojia@corp.netease.com",    kind: "interviewer" },
    { id: "E1009", name: "高源",   pinyin: "gaoyuan",   short: "gy", dept: "网易严选 · 会员业务组",   title: "会员产品负责人",      mail: "gaoyuan@corp.netease.com",   kind: "biz" },
    { id: "E1010", name: "王砚",   pinyin: "wangyan",   short: "wy", dept: "网易严选 · 用户增长组",   title: "增长产品负责人",      mail: "wangyan@corp.netease.com",   kind: "biz" },
    { id: "E1011", name: "冯珂",   pinyin: "fengke",    short: "fk", dept: "人力资源部 · HRBP",       title: "严选 HRBP",          mail: "fengke@corp.netease.com",    kind: "hr" },
    { id: "E1012", name: "孙澈",   pinyin: "sunche",    short: "sc", dept: "网易云音乐 · 数据平台组", title: "数据分析专家",        mail: "sunche@corp.netease.com",    kind: "interviewer" },
    { id: "E1013", name: "郑楠",   pinyin: "zhengnan",  short: "zn", dept: "网易云音乐 · 增长分析组", title: "资深数据分析师",      mail: "zhengnan@corp.netease.com",  kind: "interviewer" },
    { id: "E1014", name: "沈亦",   pinyin: "shenyi",    short: "sy", dept: "网易云音乐 · 增长分析组", title: "增长产品经理",        mail: "shenyi@corp.netease.com",    kind: "biz" },
    { id: "E1015", name: "徐朗",   pinyin: "xulang",    short: "xl", dept: "技术中心 · 数据中台",     title: "数据平台负责人",      mail: "xulang@corp.netease.com",    kind: "biz" },
    { id: "E1016", name: "潘越",   pinyin: "panyue",    short: "py", dept: "技术中心 · 算法平台",     title: "算法专家",            mail: "panyue@corp.netease.com",    kind: "interviewer" },
    { id: "E1017", name: "何静",   pinyin: "hejing",    short: "hj", dept: "网易新闻 · 内容运营组",   title: "新媒体运营主管",      mail: "hejing@corp.netease.com",    kind: "interviewer" },
    { id: "E1018", name: "曹宇",   pinyin: "caoyu",     short: "cy", dept: "网易新闻 · 内容运营组",   title: "内容运营专家",        mail: "caoyu@corp.netease.com",     kind: "interviewer" },
    { id: "E1019", name: "唐宁",   pinyin: "tangning",  short: "tn", dept: "网易新闻 · 视频内容组",   title: "视频运营负责人",      mail: "tangning@corp.netease.com",  kind: "biz" },
    { id: "E1020", name: "袁曼",   pinyin: "yuanman",   short: "ym", dept: "网易严选 · 设计中心",     title: "设计负责人",          mail: "yuanman@corp.netease.com",   kind: "interviewer" }
  ];

  DATA.KIND_LABEL = { biz: "业务", hr: "HR", interviewer: "面试官" };

  // 姓名 + 职务，与岗位 bizOwner 的历史文本格式保持一致
  DATA.empLabel = function (e) { return e.name + "（" + e.title + "）"; };
  DATA.empByName = function (text) {
    if (!text) return null;
    var n = String(text).split("（")[0].trim();
    return DATA.EMPLOYEES.filter(function (e) { return e.name === n; })[0] || null;
  };

  // 搜索：姓名 / 全拼 / 首字母 / 部门 / 职务 / 邮箱 / 工号
  DATA.searchEmployees = function (q, limit) {
    var key = String(q || "").trim().toLowerCase();
    var all = DATA.EMPLOYEES;
    if (!key) {
      return all.filter(function (e) { return e.freq; }).slice(0, limit || 8);
    }
    var scored = [];
    all.forEach(function (e) {
      var name = e.name, py = e.pinyin, sh = e.short;
      var s = -1;
      if (name === key) s = 0;
      else if (name.indexOf(key) === 0) s = 1;
      else if (py.indexOf(key) === 0) s = 2;
      else if (sh.indexOf(key) === 0) s = 3;
      else if (name.indexOf(key) > 0) s = 4;
      else if (py.indexOf(key) > 0) s = 5;
      else if (e.title.toLowerCase().indexOf(key) >= 0) s = 6;
      else if (e.dept.toLowerCase().indexOf(key) >= 0) s = 7;
      else if (e.mail.toLowerCase().indexOf(key) >= 0) s = 8;
      else if (e.id.toLowerCase().indexOf(key) >= 0) s = 9;
      if (s >= 0) scored.push({ e: e, s: s });
    });
    scored.sort(function (a, b) { return a.s - b.s || (a.e.freq ? 0 : 1) - (b.e.freq ? 0 : 1); });
    return scored.slice(0, limit || 8).map(function (x) { return x.e; });
  };
})();
