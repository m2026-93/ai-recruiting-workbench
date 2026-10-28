(function () {
  // 认证与权限（前端模拟）：真实环境应对接企业 SSO / LDAP，令牌由服务端签发
  var KEY = "netease.aihr.auth";
  var D = window.DATA;

  var Auth = {};
  var state = { user: null, at: null, remember: true };
  var subs = [];

  function readStore() {
    try {
      var raw = localStorage.getItem(KEY) || sessionStorage.getItem(KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }
  function writeStore() {
    var payload = JSON.stringify({ id: state.user ? state.user.id : null, at: state.at });
    try {
      localStorage.removeItem(KEY);
      sessionStorage.removeItem(KEY);
      if (!state.user) return;
      (state.remember ? localStorage : sessionStorage).setItem(KEY, payload);
    } catch (e) {}
  }

  function emit() {
    subs.forEach(function (fn) { try { fn(Auth); } catch (e) {} });
  }

  Auth.subscribe = function (fn) { subs.push(fn); };

  Auth.user = function () { return state.user; };
  Auth.isLogged = function () { return !!state.user; };
  Auth.meta = function () {
    return state.user ? D.ROLES[state.user.role] : null;
  };
  Auth.perms = function () {
    return state.user ? (D.PERMS[state.user.role] || []) : [];
  };
  Auth.can = function (perm) {
    return Auth.perms().indexOf(perm) > -1;
  };
  Auth.isBiz = function () { return !!state.user && state.user.role === "biz"; };
  Auth.isManager = function () { return Auth.can("members.manage"); };

  // 业务角色只能看自己的岗位；其他角色看全部
  Auth.jobs = function (jobs) {
    if (!state.user) return [];
    return D.jobsOfUser(state.user, jobs);
  };

  function finish(user, remember, silent) {
    state.user = user;
    state.at = new Date().toISOString();
    state.remember = !!remember;
    user.lastLogin = state.at;
    writeStore();
    if (!silent) emit();
  }

  Auth.login = function (loginInput, pwd, remember) {
    var acc = D.resolveLogin(loginInput);
    if (!acc) {
      return { ok: false, field: "id", msg: "未找到该账号，可用企业邮箱、工号或姓名登录" };
    }
    if (!pwd) return { ok: false, field: "pwd", msg: "请输入密码" };
    if (acc.active === false) {
      return { ok: false, field: "id", msg: "账号已停用，请联系系统管理员恢复" };
    }
    if (pwd !== (acc.pwd || D.DEFAULT_PWD)) {
      return { ok: false, field: "pwd", msg: "密码不正确，演示账号统一密码为 123456" };
    }
    finish(acc, remember, true);
    return { ok: true, user: acc };
  };

  // 企业微信 / SSO 一键登录：模拟已通过企业身份校验
  Auth.loginSSO = function (accountId) {
    var acc = D.resolveLogin(accountId || "limeng");
    if (!acc || acc.active === false) return { ok: false, msg: "企业身份校验失败，请改用密码登录" };
    finish(acc, true, true);
    return { ok: true, user: acc };
  };

  Auth.register = function (data) {
    var name = String(data.name || "").trim();
    var mail = String(data.mail || "").trim().toLowerCase();
    var pwd = String(data.pwd || "");
    if (!name) return { ok: false, field: "name", msg: "请填写姓名" };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return { ok: false, field: "mail", msg: "请填写企业邮箱，例如 name@corp.netease.com" };
    if (!/corp\.|@netease\.com$/.test(mail)) return { ok: false, field: "mail", msg: "需使用企业邮箱域名（@corp.netease.com）" };
    if (D.accountByMail(mail)) return { ok: false, field: "mail", msg: "该邮箱已开通账号，请直接登录或找回密码" };
    if (pwd.length < 6) return { ok: false, field: "pwd", msg: "密码至少 6 位" };
    if (data.pwd2 !== undefined && pwd !== data.pwd2) return { ok: false, field: "pwd2", msg: "两次输入的密码不一致" };

    var id = mail.split("@")[0];
    if (D.ACCOUNTS.filter(function (a) { return a.id === id; })[0]) id = id + "2";
    var acc = {
      id: id, name: name, empId: "",
      role: D.ROLES[data.role] ? data.role : "recruiter",
      mail: mail,
      dept: String(data.dept || "").trim() || "未填写部门",
      title: D.ROLES[data.role] ? D.ROLES[data.role].label : "招聘 HR",
      avatar: name.slice(0, 1), active: true, lastLogin: null, pwd: pwd,
      joinedAt: new Date().toISOString(), demo: false
    };
    D.ACCOUNTS.push(acc);
    finish(acc, true, true);
    return { ok: true, user: acc };
  };

  Auth.requestReset = function (mail) {
    var acc = D.accountByMail(mail);
    if (!acc) return { ok: false, msg: "该邮箱未开通账号，请先注册或联系管理员" };
    return { ok: true, user: acc };
  };

  // 重置密码：模拟邮件链接校验通过后直接改密
  Auth.resetPwd = function (mail, pwd, pwd2) {
    var acc = D.accountByMail(mail);
    if (!acc) return { ok: false, msg: "该邮箱未开通账号" };
    if (!pwd || pwd.length < 6) return { ok: false, field: "pwd", msg: "密码至少 6 位" };
    if (pwd !== pwd2) return { ok: false, field: "pwd2", msg: "两次输入的密码不一致" };
    acc.pwd = pwd;
    return { ok: true };
  };

  Auth.logout = function () {
    state.user = null;
    state.at = null;
    writeStore();
    emit();
  };

  // 切换账号（演示用）
  Auth.switchTo = function (id) {
    var acc = D.resolveLogin(id);
    if (!acc) return false;
    finish(acc, state.remember, false);
    return true;
  };

  // ---------- 成员管理 ----------
  Auth.accounts = function () { return D.ACCOUNTS.slice(); };
  Auth.addAccount = function (data) {
    var mail = String(data.mail || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return { ok: false, msg: "请填写正确的企业邮箱" };
    if (D.accountByMail(mail)) return { ok: false, msg: "该邮箱已存在" };
    var id = mail.split("@")[0];
    var acc = {
      id: id, name: String(data.name || "").trim() || id, empId: data.empId || "",
      role: D.ROLES[data.role] ? data.role : "recruiter", mail: mail,
      dept: data.dept || "未填写部门", title: data.title || (D.ROLES[data.role] ? D.ROLES[data.role].label : "招聘 HR"),
      avatar: (String(data.name || id).trim().slice(0, 1)), active: true, lastLogin: null,
      pwd: D.DEFAULT_PWD, joinedAt: new Date().toISOString(), demo: false
    };
    D.ACCOUNTS.push(acc);
    return { ok: true, acc: acc };
  };
  Auth.setRole = function (accId, role) {
    var acc = D.ACCOUNTS.filter(function (a) { return a.id === accId; })[0];
    if (!acc || !D.ROLES[role]) return false;
    if (state.user && state.user.id === accId) {
      // 不允许把自己降权到失去成员管理，避免把自己锁在外面
      if (!D.PERMS[role] || D.PERMS[role].indexOf("members.manage") < 0) return false;
    }
    acc.role = role;
    if (state.user && state.user.id === accId) { state.user.role = role; }
    return true;
  };
  Auth.toggleActive = function (accId) {
    var acc = D.ACCOUNTS.filter(function (a) { return a.id === accId; })[0];
    if (!acc) return false;
    if (state.user && state.user.id === accId) return false;
    acc.active = !acc.active;
    return true;
  };
  Auth.removeAccount = function (accId) {
    if (state.user && state.user.id === accId) return false;
    var i = D.ACCOUNTS.findIndex(function (a) { return a.id === accId; });
    if (i < 0) return false;
    D.ACCOUNTS.splice(i, 1);
    return true;
  };

  // ---------- 启动时恢复会话 ----------
  Auth.restore = function () {
    var s = readStore();
    if (!s || !s.id) { state.user = null; return false; }
    var acc = D.ACCOUNTS.filter(function (a) { return a.id === s.id; })[0];
    if (!acc || acc.active === false) {
      try { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); } catch (e) {}
      state.user = null;
      return false;
    }
    state.user = acc;
    state.at = s.at || new Date().toISOString();
    state.remember = !!localStorage.getItem(KEY);
    return true;
  };

  Auth.sessionAge = function () {
    if (!state.at) return "";
    var h = Math.max(0, Math.round((Date.now() - new Date(state.at).getTime()) / 3600000));
    return h < 1 ? "刚刚" : h + " 小时前";
  };

  window.Auth = Auth;
})();
