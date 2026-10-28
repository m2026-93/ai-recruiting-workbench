(function () {
  var A = window.Auth, D = window.DATA;
  var V = {};
  var mode = "login";         // login | register | reset | reset2
  var resetMail = "";
  var errs = {};              // 字段错误
  var busy = false;
  var lastId = "";
  var lastPwd = "";

  V.onSuccess = null;

  function esc(s) {
    return String(s === null || s === undefined ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function err(field) {
    return errs[field] ? '<div class="af-err show">' + esc(errs[field]) + "</div>" : "";
  }
  function inpCls(field) { return "af-inp" + (errs[field] ? " err" : ""); }

  function brandSide() {
    return '<div class="auth-brand">' +
      '<div class="ab-logo"><span class="mk">网</span><span>网易 · AI 招聘工作台</span></div>' +
      '<div class="ab-mid">' +
        '<h2>把「筛简历」和「追进度」<br/>交给 AI，<em>人只做判断</em>。</h2>' +
        '<div class="ab-points">' +
          '<div class="ab-point"><i>1</i><div><b>证据化初筛</b><span>每条结论可定位到简历原文，证据不足就标待确认</span></div></div>' +
          '<div class="ab-point"><i>2</i><div><b>AI 提醒助手</b><span>卡在哪、卡了多久、该找谁，一句话说清</span></div></div>' +
          '<div class="ab-point"><i>3</i><div><b>只提醒，不执行</b><span>不代发消息、不改 ATS，处置权始终在人</span></div></div>' +
        "</div>" +
      "</div>" +
      '<div class="ab-foot">企业统一身份登录 · MVP 演示环境<br/>招聘数据仅限招聘团队访问</div>' +
    "</div>";
  }

  // ---------- 登录 ----------
  function loginForm() {
    var demo = D.ACCOUNTS.filter(function (a) { return a.demo; });
    var demoHtml = demo.map(function (a) {
      return '<button type="button" class="demo-btn" data-demo="' + a.id + '">' +
        '<span class="av">' + esc(a.avatar) + "</span>" +
        "<span style=\"min-width:0\">" + "<b>" + esc(a.name) + "</b>" +
        "<span>" + esc(D.ROLES[a.role].label) + "</span></span></button>";
    }).join("");

    return '<div class="auth-form">' +
      '<div class="af-head"><h3>登录招聘工作台</h3><p>招聘团队专用 · 使用企业账号登录</p></div>' +
      '<form id="afLogin" autocomplete="off">' +
        '<div class="af-field"><label>企业账号</label>' +
          '<div class="' + inpCls("id") + '"><input id="lgId" placeholder="邮箱 / 工号 / 姓名，如 limeng" value="' + esc(lastId) + '" autocomplete="username" /></div>' +
          err("id") +
        "</div>" +
        '<div class="af-field"><label>密码</label>' +
          '<div class="' + inpCls("pwd") + '"><input id="lgPwd" type="password" placeholder="演示密码 123456" value="' + esc(lastPwd) + '" autocomplete="current-password" />' +
            '<button type="button" class="eye" id="lgEye">显示</button></div>' +
          err("pwd") +
        "</div>" +
        '<div class="af-row"><label><input type="checkbox" id="lgRemember" checked /> 记住我（7 天内免登录）</label>' +
          '<a href="#" id="toReset">忘记密码？</a></div>' +
        '<button class="btn primary af-submit" type="submit" id="lgSubmit">' + (busy ? "登录中…" : "登录") + "</button>" +
      "</form>" +
      '<div class="af-sep">演示账号 · 点击直接登录</div>' +
      '<div class="demo-row">' + demoHtml + "</div>" +
      '<div class="af-foot"><span>还没有账号？</span><a href="#" id="toRegister">申请开通 →</a></div>' +
    "</div>";
  }

  // ---------- 注册 ----------
  function registerForm() {
    return '<div class="auth-form">' +
      '<div class="af-head"><h3>申请开通账号</h3><p>使用企业邮箱注册，开通后即为招聘 HR 角色</p></div>' +
      '<form id="afReg" autocomplete="off" style="margin-top:18px">' +
        '<div class="af-grid2">' +
          '<div class="af-field"><label>姓名</label><div class="' + inpCls("name") + '"><input id="rgName" placeholder="如 王小明" /></div>' + err("name") + "</div>" +
          '<div class="af-field"><label>所属部门</label><div class="' + inpCls("dept") + '"><input id="rgDept" placeholder="如 人力资源部 · 招聘中心" /></div>' + err("dept") + "</div>" +
        "</div>" +
        '<div class="af-field"><label>企业邮箱</label><div class="' + inpCls("mail") + '"><input id="rgMail" placeholder="name@corp.netease.com" /></div>' + err("mail") + "</div>" +
        '<div class="af-grid2">' +
          '<div class="af-field"><label>设置密码</label><div class="' + inpCls("pwd") + '"><input id="rgPwd" type="password" placeholder="至少 6 位" /></div>' + err("pwd") + "</div>" +
          '<div class="af-field"><label>确认密码</label><div class="' + inpCls("pwd2") + '"><input id="rgPwd2" type="password" placeholder="再次输入" /></div>' + err("pwd2") + "</div>" +
        "</div>" +
        '<button class="btn primary af-submit" type="submit">注册并登录</button>' +
      "</form>" +
      '<div class="af-hint">注册后即可使用全部功能。</div>' +
      '<div class="af-foot"><span>已有账号？</span><a href="#" id="toLogin">返回登录 →</a></div>' +
    "</div>";
  }

  // ---------- 找回密码 ----------
  function resetForm() {
    if (mode === "reset2") {
      return '<div class="auth-form">' +
        '<div class="af-head"><h3>设置新密码</h3><p>已向 ' + esc(resetMail) + " 发送重置链接（演示环境已直接校验通过）</p></div>" +
        '<form id="afReset2" autocomplete="off" style="margin-top:18px">' +
          '<div class="af-field"><label>新密码</label><div class="' + inpCls("pwd") + '"><input id="rsPwd" type="password" placeholder="至少 6 位" /></div>' + err("pwd") + "</div>" +
          '<div class="af-field"><label>确认新密码</label><div class="' + inpCls("pwd2") + '"><input id="rsPwd2" type="password" placeholder="再次输入" /></div>' + err("pwd2") + "</div>" +
          '<button class="btn primary af-submit" type="submit" style="margin-top:6px">保存并登录</button>' +
        "</form>" +
        '<div class="af-foot"><span>想起密码了？</span><a href="#" id="toLogin">返回登录 →</a></div>' +
      "</div>";
    }
    return '<div class="auth-form">' +
      '<div class="af-head"><h3>找回密码</h3><p>输入企业邮箱，我们会发送重置链接</p></div>' +
      '<form id="afReset" autocomplete="off" style="margin-top:18px">' +
        '<div class="af-field"><label>企业邮箱</label><div class="' + inpCls("mail") + '"><input id="rsMail" placeholder="name@corp.netease.com" /></div>' + err("mail") + "</div>" +
        '<button class="btn primary af-submit" type="submit">发送重置链接</button>' +
      "</form>" +
      '<div class="af-foot"><span>想起密码了？</span><a href="#" id="toLogin">返回登录 →</a></div>' +
    "</div>";
  }

  // ---------- 渲染 ----------
  V.render = function () {
    var root = document.getElementById("authRoot");
    if (!root) return;
    root.className = "auth-root";
    var inner = mode === "login" ? loginForm() : mode === "register" ? registerForm() : resetForm();
    root.innerHTML = '<div class="auth-card">' + brandSide() + inner + "</div>";
    bind(root);
  };

  function show(next) { mode = next; errs = {}; busy = false; V.render(); }

  function fail(field, msg) {
    errs = {};
    if (field) errs[field] = msg;
    busy = false;
    V.render();
  }

  function submitLogin(data) {
    var r = A.login(data.id, data.pwd, data.remember);
    if (!r.ok) { lastId = data.id; lastPwd = data.pwd; fail(r.field, r.msg); return; }
    if (V.onSuccess) V.onSuccess(r.user, "login");
  }

  function bind(root) {
    var eye = root.querySelector("#lgEye");
    if (eye) eye.onclick = function () {
      var p = root.querySelector("#lgPwd");
      var on = p.type === "password";
      p.type = on ? "text" : "password";
      eye.textContent = on ? "隐藏" : "显示";
    };

    var login = root.querySelector("#afLogin");
    if (login) {
      login.onsubmit = function (e) {
        e.preventDefault();
        if (busy) return;
        var data = {
          id: root.querySelector("#lgId").value.trim(),
          pwd: root.querySelector("#lgPwd").value,
          remember: root.querySelector("#lgRemember").checked
        };
        if (!data.id) { fail("id", "请输入企业账号"); return; }
        if (!data.pwd) { fail("pwd", "请输入密码"); return; }
        busy = true;
        var btn = root.querySelector("#lgSubmit");
        btn.textContent = "验证身份中…";
        btn.disabled = true;
        // 模拟网络往返
        setTimeout(function () { submitLogin(data); }, 420);
      };
    }

    root.querySelectorAll("[data-demo]").forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute("data-demo");
        var r = A.login(id, D.DEFAULT_PWD, true);
        if (!r.ok) { fail("id", r.msg); return; }
        if (V.onSuccess) V.onSuccess(r.user, "demo");
      };
    });

    var toReg = root.querySelector("#toRegister");
    if (toReg) toReg.onclick = function (e) { e.preventDefault(); show("register"); };
    root.querySelectorAll("#toLogin").forEach(function (b) {
      b.onclick = function (e) { e.preventDefault(); show("login"); };
    });
    ["toReset", "toReset2"].forEach(function (id) {
      var b = root.querySelector("#" + id);
      if (b) b.onclick = function (e) { e.preventDefault(); show("reset"); };
    });

    // 注册
    var reg = root.querySelector("#afReg");
    if (reg) {
      reg.onsubmit = function (e) {
        e.preventDefault();
        var data = {
          name: root.querySelector("#rgName").value.trim(),
          dept: root.querySelector("#rgDept").value.trim(),
          mail: root.querySelector("#rgMail").value.trim(),
          role: "recruiter",
          pwd: root.querySelector("#rgPwd").value,
          pwd2: root.querySelector("#rgPwd2").value
        };
        var r = A.register(data);
        if (!r.ok) { fail(r.field, r.msg); return; }
        if (V.onSuccess) V.onSuccess(r.user, "register");
      };
    }

    // 找回密码 · 第一步
    var reset = root.querySelector("#afReset");
    if (reset) {
      reset.onsubmit = function (e) {
        e.preventDefault();
        var mail = root.querySelector("#rsMail").value.trim();
        var r = A.requestReset(mail);
        if (!r.ok) { fail("mail", r.msg); return; }
        resetMail = mail;
        show("reset2");
      };
    }
    // 找回密码 · 第二步
    var reset2 = root.querySelector("#afReset2");
    if (reset2) {
      reset2.onsubmit = function (e) {
        e.preventDefault();
        var pwd = root.querySelector("#rsPwd").value;
        var r = A.resetPwd(resetMail, pwd, root.querySelector("#rsPwd2").value);
        if (!r.ok) { fail(r.field, r.msg); return; }
        var login = A.login(resetMail, pwd, true);
        if (!login.ok) { fail(null, login.msg); return; }
        if (V.onSuccess) V.onSuccess(login.user, "reset");
      };
    }

    // 回车提交（单输入场景）
    var first = root.querySelector("#lgId") || root.querySelector("#rgName") || root.querySelector("#rsMail");
    if (first) setTimeout(function () { try { first.focus(); } catch (e) {} }, 30);
  }

  V.preload = function (id, pwd) { lastId = id || ""; lastPwd = pwd || ""; };
  V.mode = function () { return mode; };
  V.setMode = function (m) { mode = m; errs = {}; };

  window.AuthView = V;
})();
