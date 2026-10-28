(function () {
  var S = window.Store, UI = window.UI, A = window.Auth;

  function render() {
    if (!A.isLogged()) return;

    // 路由守卫：无权限的页面自动回落
    if (S.state.route === "screening" && !A.can("screen.write")) {
      S.state.route = "dashboard";
    }

    var active = document.activeElement;
    var focusId = active && active.id ? active.id : null;
    var selStart = null;
    if (focusId && active.setSelectionRange) {
      try { selStart = active.selectionStart; } catch (e) { selStart = null; }
    }
    var scrollY = window.scrollY;

    UI.renderShell();

    var view = document.getElementById("view");
    var renderer = window.Views[S.state.route] || window.Views.dashboard;
    renderer(view);

    if (focusId) {
      var again = document.getElementById(focusId);
      if (again) {
        again.focus();
        if (again.setSelectionRange && selStart !== null) {
          try { again.setSelectionRange(selStart, selStart); } catch (e) {}
        }
      }
    }
    window.scrollTo(0, scrollY);
  }

  // 登录后按角色收敛数据范围
  function applyScope() {
    var myJobs = S.visibleJobs();
    if (!myJobs.length) return;
    if (!myJobs.some(function (j) { return j.id === S.state.jobId; })) {
      S.state.jobId = myJobs[0].id;
    }
    if (S.state.route === "screening" && !A.can("screen.write")) {
      S.state.route = "dashboard";
    }
  }

  function enterApp(user, via) {
    document.body.setAttribute("data-auth", "in");
    var authRoot = document.getElementById("authRoot");
    authRoot.innerHTML = "";
    authRoot.style.display = "none";
    document.getElementById("appShell").style.display = "flex";

    applyScope();
    S.emit();

    var meta = A.meta();
    var tail = via === "demo" ? "（演示账号）" : via === "sso" ? "（企业微信身份）" : via === "register" ? "（新账号）" : "";
    setTimeout(function () {
      UI.toast(user.name + " 你好" + tail + " · " + meta.label + " · 已进入招聘工作台", "ok");
    }, 260);
  }

  function leaveApp() {
    document.body.setAttribute("data-auth", "out");
    document.getElementById("appShell").style.display = "none";
    var authRoot = document.getElementById("authRoot");
    authRoot.style.display = "";
    authRoot.innerHTML = "";
    document.getElementById("drawerRoot").innerHTML = "";
    document.getElementById("modalRoot").innerHTML = "";
    document.body.style.overflow = "";
    A.logout();
    window.AuthView.preload("limeng", "123456");
    window.AuthView.setMode("login");
    window.AuthView.render();
    try { document.getElementById("authRoot").scrollTop = 0; } catch (e) {}
  }

  // 登录成功回调
  window.AuthView.onSuccess = function (user, via) { enterApp(user, via); };
  UI.onLogout = leaveApp;
  UI.onSwitchUser = function (id) {
    if (!A.switchTo(id)) { UI.toast("切换失败：账号已停用", "warn"); return; }
    applyScope();
    S.emit();
    var u = A.user();
    UI.toast("已切换为 " + u.name + " · " + A.meta().label, "ok");
  };

  S.subscribe(render);

  UI.bindNav();

  document.getElementById("jobSelect").onchange = function (e) {
    S.setJob(e.target.value);
    UI.toast("已切换岗位：" + S.curJob().title, "ok");
  };

  UI.bindShellActions();
  UI.bindAudit();

  // 启动：优先恢复上次会话，否则进入登录页
  if (A.restore()) {
    enterApp(A.user(), "restore");
  } else {
    document.body.setAttribute("data-auth", "out");
    document.getElementById("appShell").style.display = "none";
    window.AuthView.preload("limeng", "123456");
    window.AuthView.setMode("login");
    window.AuthView.render();
  }
})();
