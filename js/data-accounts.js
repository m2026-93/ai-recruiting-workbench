(function () {
  window.DATA = window.DATA || {};

  // 账号体系（模拟）：
  // - 真实环境走企业统一身份（SSO / 企业微信 / LDAP），本原型用本地 mock 模拟同一套账号
  // - MVP 阶段只面向招聘 HR：预置 2 个演示账号，统一密码 123456
  // - 登录名支持：企业邮箱 / 邮箱前缀 / 工号 / 姓名
  DATA.DEFAULT_PWD = "123456";

  // 角色：仅保留 HR 侧两类（业务方反馈走线下的推荐单，本原型不给业务方开账号）
  DATA.ROLES = {
    recruiter: { label: "招聘 HR", pill: "green", desc: "负责岗位、初筛、复核与推选" },
    lead:      { label: "招聘负责人", pill: "accent", desc: "招聘全流程 + 成员与规则管理" }
  };
  // 成员管理里可分配的角色（只开放 HR 角色）
  DATA.HR_ROLES = ["recruiter", "lead"];

  // 权限点：MVP 单人使用，招聘 HR 与负责人都开放全部功能
  DATA.FULL_PERMS = ["screen.write", "recommend.push", "jobs.write", "cards.handle",
    "audit.view", "candidate.view", "members.manage", "rules.config"];
  DATA.PERMS = {
    recruiter: DATA.FULL_PERMS,
    lead:      DATA.FULL_PERMS
  };

  // 预置账号：id = 登录名（邮箱前缀），empId 关联通讯录
  DATA.ACCOUNTS = [
    {
      id: "limeng", name: "李萌", empId: "E1004", role: "recruiter",
      mail: "limeng@corp.netease.com", dept: "人力资源部 · 招聘中心", title: "招聘 HR",
      avatar: "李", active: true, lastLogin: null, demo: true
    },
    {
      id: "maxiaoyu", name: "马晓宇", empId: "E1005", role: "lead",
      mail: "maxiaoyu@corp.netease.com", dept: "人力资源部 · 招聘中心", title: "招聘负责人",
      avatar: "马", active: true, lastLogin: null, demo: true
    }
  ];

  // 登录账号归一化：邮箱 / 邮箱前缀 / 工号 / 姓名 都映射到账号 id
  DATA.resolveLogin = function (input) {
    var q = String(input || "").trim().toLowerCase();
    if (!q) return null;
    // 邮箱前缀
    if (q.indexOf("@") > -1) q = q.split("@")[0];
    var hit = DATA.ACCOUNTS.filter(function (a) {
      return a.id.toLowerCase() === q ||
        a.mail.toLowerCase() === String(input || "").trim().toLowerCase() ||
        (a.empId && a.empId.toLowerCase() === q) ||
        a.name === String(input || "").trim();
    })[0];
    if (hit) return hit;
    // 工号在通讯录里
    var emp = (DATA.EMPLOYEES || []).filter(function (e) { return e.id.toLowerCase() === q; })[0];
    if (emp) {
      return DATA.ACCOUNTS.filter(function (a) { return a.empId === emp.id; })[0] || null;
    }
    return null;
  };

  DATA.accountByMail = function (mail) {
    var m = String(mail || "").trim().toLowerCase();
    return DATA.ACCOUNTS.filter(function (a) { return a.mail.toLowerCase() === m; })[0] || null;
  };

  // 本原型所有账号均为 HR，可见全部岗位
  DATA.jobsOfUser = function (user, jobs) {
    if (!user) return [];
    return jobs.slice();
  };
})();
