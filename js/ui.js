(function () {
  var S = window.Store;
  var UI = {};

  UI.esc = function (s) {
    if (s === null || s === undefined) return "";
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  };
  function pad(n) { return n < 10 ? "0" + n : "" + n; }

  UI.fmtTime = function (iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    return pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  };
  UI.fmtDateFull = function (iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  };
  UI.relHours = function (iso) {
    if (!iso) return "—";
    var h = S.hoursSince(iso);
    if (h < 1) return "不到 1 小时";
    if (h < 24) return h + " 小时";
    return Math.floor(h / 24) + " 天 " + (h % 24) + " 小时";
  };

  UI.conclusionMeta = {
    high: { cls: "high", label: "高匹配" },
    review: { cls: "review", label: "中匹配" },
    low: { cls: "low", label: "低匹配" },
    failed: { cls: "failed", label: "解析失败" },
    unparsed: { cls: "muted", label: "待解析" }
  };
  UI.waitText = function (card) {
    return card.waitOverride || UI.relHours(card.sinceAt);
  };
  UI.conclusionTag = function (c) {
    var m = UI.conclusionMeta[c];
    if (!m) return '<span class="tag muted">未处理</span>';
    return '<span class="tag ' + m.cls + '">' + m.label + "</span>";
  };
  UI.reviewLabel = function (c) {
    if (c.conclusion === "failed") return '<span class="muted">不可审核</span>';
    if (c.conclusion === "unparsed") return '<span class="muted small">待执行初筛</span>';
    var map = {
      recommend: '<span class="dot-tag green"><i></i>已确认 · 暂定推荐</span>',
      reject: '<span class="dot-tag red"><i></i>已确认 · 暂不推荐</span>',
      pending: '<span class="dot-tag"><i></i>待确认</span>'
    };
    return map[c.reviewStatus] || map.pending;
  };
  UI.evBadge = function (status) {
    if (status === "matched") return '<span class="tag high">有相关证据支持</span>';
    if (status === "limited") return '<span class="tag review">证据有限，建议核实</span>';
    return '<span class="tag muted">未找到相关证据</span>';
  };

  // ---------- Toast ----------
  UI.toast = function (msg, type) {
    var root = document.getElementById("toastRoot");
    var el = document.createElement("div");
    el.className = "toast " + (type || "");
    el.textContent = msg;
    root.appendChild(el);
    setTimeout(function () {
      el.style.opacity = "0";
      el.style.transition = "opacity .2s";
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 220);
    }, 2600);
  };

  // ---------- Modal ----------
  var modalOnConfirm = null;
  UI.modal = function (cfg) {
    var root = document.getElementById("modalRoot");
    modalOnConfirm = cfg.onConfirm || null;
    root.innerHTML =
      '<div class="modal-mask" data-modal-mask="1">' +
        '<div class="modal ' + (cfg.wide ? "wide" : "") + '" role="dialog">' +
          '<div class="modal-head"><h3>' + UI.esc(cfg.title) + "</h3>" +
            (cfg.desc ? "<p>" + cfg.desc + "</p>" : "") + "</div>" +
          '<div class="modal-body">' + (cfg.body || "") + "</div>" +
          '<div class="modal-foot">' +
            '<button class="btn" data-modal-cancel="1">' + (cfg.cancelText || "取消") + "</button>" +
            (cfg.confirmText === null ? "" : '<button class="btn primary" data-modal-ok="1">' + (cfg.confirmText || "确定") + "</button>") +
          "</div>" +
        "</div>" +
      "</div>";
    root.querySelector("[data-modal-cancel]").onclick = UI.closeModal;
    var ok = root.querySelector("[data-modal-ok]");
    if (ok) {
      ok.onclick = function () {
        if (!modalOnConfirm) { UI.closeModal(); return; }
        var keep = modalOnConfirm(root.querySelector(".modal"));
        if (!keep) UI.closeModal();
      };
    }
    root.querySelector("[data-modal-mask]").onclick = function (e) {
      if (e.target === e.currentTarget) UI.closeModal();
    };
  };
  UI.closeModal = function () {
    document.getElementById("modalRoot").innerHTML = "";
    modalOnConfirm = null;
    if (!document.getElementById("drawerRoot").innerHTML) document.body.style.overflow = "";
  };

  // ---------- Drawer ----------
  UI.drawer = function (html, opts) {
    opts = opts || {};
    var root = document.getElementById("drawerRoot");
    root.innerHTML =
      '<div class="drawer-mask" data-drawer-mask="1"></div>' +
      '<aside class="drawer ' + (opts.narrow ? "narrow" : "") + '">' + html + "</aside>";
    root.querySelector("[data-drawer-mask]").onclick = UI.closeDrawer;
    var closeBtn = root.querySelector("[data-drawer-close]");
    if (closeBtn) closeBtn.onclick = UI.closeDrawer;
    document.body.style.overflow = "hidden";
  };
  UI.closeDrawer = function () {
    document.getElementById("drawerRoot").innerHTML = "";
    document.body.style.overflow = "";
  };

  // ---------- 全局键盘 ----------
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (document.getElementById("modalRoot").innerHTML) UI.closeModal();
      else if (document.getElementById("drawerRoot").innerHTML) UI.closeDrawer();
    }
  });

  // ---------- Shell ----------
  var ROUTE_META = {
    dashboard: { title: "招聘工作台", sub: "下一步该做什么" },
    screening: { title: "AI 简历初筛", sub: "证据化匹配 · 结论可追溯到简历原文" },
    cards: { title: "AI 提醒助手", sub: "只提醒，不执行 · 规则可配置" }
  };

  // ---------- 顶栏用户区 ----------
  var userMenuOpen = false;

  UI.closeUserMenu = function () {
    userMenuOpen = false;
    var m = document.querySelector(".user-menu");
    if (m) m.classList.remove("open");
  };

  UI.renderUser = function () {
    var box = document.getElementById("userBox");
    if (!box) return;
    var A = window.Auth;
    if (!A || !A.user()) { box.innerHTML = ""; return; }
    var u = A.user();
    var meta = A.meta();

    var others = window.DATA.ACCOUNTS.filter(function (a) {
      return a.id !== u.id && a.active !== false;
    }).slice(0, 4);

    var switchRows = others.map(function (a) {
      return '<button class="um-item" data-switch="' + a.id + '">' +
        '<span class="av">' + UI.esc(a.avatar) + "</span>" +
        '<span class="grow">' + UI.esc(a.name) + "</span>" +
        '<span class="rl">' + UI.esc(window.DATA.ROLES[a.role].label) + "</span></button>";
    }).join("");

    box.innerHTML =
      '<button class="user-btn" id="btnUser">' +
        '<span class="uv">' + UI.esc(u.avatar) + "</span>" +
        '<span style="text-align:left">' +
          '<span class="un">' + UI.esc(u.name) + "</span>" +
          '<span class="ur">' + UI.esc(meta ? meta.label : "") + "</span>" +
        "</span>" +
        '<span class="caret"></span>' +
      "</button>" +
      '<div class="user-menu' + (userMenuOpen ? " open" : "") + '" id="userMenu">' +
        '<div class="um-head"><span class="uv">' + UI.esc(u.avatar) + "</span>" +
          "<div><b>" + UI.esc(u.name) + "</b><span>" + UI.esc(u.dept || "") + "</span></div></div>" +
        '<div class="um-sec">' +
          '<div class="um-t">当前身份</div>' +
          '<div class="um-item" style="cursor:default"><span class="grow">' + UI.esc(meta ? meta.label : "") +
            '</span><span class="rl">' + UI.esc(u.mail) + "</span></div>" +
        "</div>" +
        '<div class="um-sec">' +
          '<div class="um-t">切换身份（演示）</div>' + switchRows +
        "</div>" +
        '<div class="um-sec">' +
          '<button class="um-item" id="umProfile">个人与权限</button>' +
          '<button class="um-item um-danger" id="umLogout">退出登录</button>' +
        "</div>" +
      "</div>";

    var btn = box.querySelector("#btnUser");
    if (btn) btn.onclick = function (e) {
      e.stopPropagation();
      userMenuOpen = !userMenuOpen;
      var m = box.querySelector("#userMenu");
      if (m) m.classList.toggle("open", userMenuOpen);
    };

    box.querySelectorAll("[data-switch]").forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute("data-switch");
        UI.closeUserMenu();
        if (UI.onSwitchUser) UI.onSwitchUser(id);
      };
    });

    var prof = box.querySelector("#umProfile");
    if (prof) prof.onclick = function () { UI.closeUserMenu(); UI.openProfile(); };
    var out = box.querySelector("#umLogout");
    if (out) out.onclick = function () { UI.closeUserMenu(); UI.confirmLogout(); };
  };

  UI.bindUserBoxOutside = function () {
    document.addEventListener("click", function (e) {
      var box = document.getElementById("userBox");
      if (box && !box.contains(e.target)) UI.closeUserMenu();
    });
  };

  // ---------- 侧栏导航（招聘工作台 ▸ AI 简历初筛 / AI 提醒助手）----------
  var navSubOpen = true;

  function applyNavSub() {
    var sub = document.querySelector(".nav-sub[data-sub]");
    var grp = document.querySelector(".nav-group");
    if (sub) sub.classList.toggle("collapsed", !navSubOpen);
    if (grp) grp.classList.toggle("collapsed", !navSubOpen);
  }
  UI.setNavSub = function (open) { navSubOpen = !!open; applyNavSub(); };

  UI.bindNav = function () {
    Array.prototype.forEach.call(document.querySelectorAll(".nav-item[data-route]"), function (b) {
      b.onclick = function () {
        var rt = b.getAttribute("data-route");
        if (rt !== "dashboard") UI.setNavSub(true);
        S.setRoute(rt);
      };
    });
    var t = document.querySelector("[data-nav-toggle]");
    if (t) t.onclick = function (e) { e.stopPropagation(); UI.setNavSub(!navSubOpen); };
  };

  UI.renderShell = function () {
    var st = S.state;
    var job = S.curJob();
    var meta = ROUTE_META[st.route] || ROUTE_META.dashboard;

    document.getElementById("pageTitle").textContent = meta.title;
    document.getElementById("pageSub").textContent = meta.sub;

    // nav
    var A = window.Auth;
    var navBtns = document.querySelectorAll(".nav-item");
    var subVisible = 0;
    for (var i = 0; i < navBtns.length; i++) {
      var rt = navBtns[i].getAttribute("data-route");
      var allowed = !A || !A.user() ? true : (rt === "screening" ? A.can("screen.write") : true);
      navBtns[i].style.display = allowed ? "" : "none";
      navBtns[i].classList.toggle("active", rt === st.route);
      if (allowed && navBtns[i].classList.contains("sub")) subVisible++;
    }
    var subWrap = document.querySelector(".nav-sub[data-sub]");
    if (subWrap) subWrap.style.display = subVisible ? "" : "none";
    var grp = document.querySelector(".nav-group");
    if (grp) grp.classList.toggle("group-active", st.route === "dashboard" || st.route === "screening" || st.route === "cards");
    applyNavSub();

    // user
    UI.renderUser();

    // job select（按角色收敛可见岗位）
    var sel = document.getElementById("jobSelect");
    var myJobs = S.visibleJobs();
    var opts = myJobs.map(function (j) {
      return '<option value="' + j.id + '"' + (j.id === st.jobId ? " selected" : "") + ">" +
        UI.esc(j.title) + "（" + j.batch.total + " 份）</option>";
    }).join("");
    if (sel.getAttribute("data-render") !== opts) {
      sel.innerHTML = opts;
      sel.setAttribute("data-render", opts);
    }
    var picker = sel.parentNode;
    if (picker) picker.style.display = myJobs.length > 1 ? "" : "none";

    // task chip
    var chip = document.getElementById("taskChip");
    if (job) {
      var b = job.batch;
      var label, s;
      if (b.status === "completed") { s = "completed"; label = "初筛已完成 · " + (b.processed + b.failed) + "/" + b.total; }
      else if (b.status === "running") { s = "running"; label = "初筛处理中 · " + b.processed + "/" + b.total; }
      else { s = "pending"; label = "待开始初筛 · " + b.total + " 份"; }
      chip.setAttribute("data-s", s);
      chip.innerHTML = '<span class="dot"></span>' + label;
    }
    // nav badges
    var sj = document.getElementById("sideJob");
    if (job) {
      var pct = job.batch.total ? Math.round(((job.batch.processed + job.batch.failed) / job.batch.total) * 100) : 0;
      sj.innerHTML = "<b>" + UI.esc(job.title) + "</b>" +
        '<div class="muted small">' + UI.esc(job.dept) + " · " + job.batch.total + " 份简历</div>";
    }

    // badges
    var stt = S.stats(st.jobId);
    var bs = document.getElementById("navBadgeScreen");
    var sc = job && job.batch.status === "pending" ? job.batch.total : stt.pendingTotal;
    bs.textContent = sc;
    bs.classList.toggle("hot", sc > 0);
    var bc = document.getElementById("navBadgeCard");
    var activeN = S.cardsByStatus("active").length;
    bc.textContent = activeN;
    bc.classList.toggle("hot", activeN > 0);
  };

  // ---------- 通用交互绑定 ----------
  UI.bindShellActions = function () {
    UI.bindUserBoxOutside();
  };

  var PERM_TEXT = {
    "screen.write": "查看岗位、确认标准、执行 AI 初筛",
    "recommend.push": "将候选人推选给业务部门",
    "jobs.write": "新建 / 编辑 / 删除岗位",
    "cards.handle": "处理 AI 提醒（标记已知悉 / 暂缓）",
    "candidate.view": "查看候选人详情与简历原件",
    "audit.view": "查看操作日志",
    "members.manage": "开通账号、调整角色与停用",
    "rules.config": "配置提醒规则与阈值",
    "feedback.submit": "对推荐单给出面试反馈"
  };

  UI.openProfile = function () {
    var A = window.Auth;
    var u = A.user();
    if (!u) return;
    var meta = A.meta();
    var perms = A.perms().map(function (p) {
      return '<li style="display:flex;gap:6px"><span style="color:var(--green)">✓</span><span>' + UI.esc(PERM_TEXT[p] || p) + "</span></li>";
    }).join("");
    UI.modal({
      title: "个人与权限",
      desc: "身份由企业统一账号下发，权限随角色自动生效。",
      wide: false,
      confirmText: "关闭",
      body:
        '<div class="b-list">' +
          '<li><div class="k">账号</div><div class="v">' + UI.esc(u.name) + " · " + UI.esc(u.mail) + "</div></li>" +
          '<li><div class="k">身份</div><div class="v"><b>' + UI.esc(meta ? meta.label : "") + "</b> · " + UI.esc(meta ? meta.desc : "") + "</div></li>" +
          '<li><div class="k">部门</div><div class="v">' + UI.esc(u.dept || "—") + "</div></li>" +
          '<li><div class="k">数据范围</div><div class="v">' + (A.isBiz()
            ? "仅本人负责的岗位与推荐单（" + S.visibleJobs().map(function (j) { return UI.esc(j.title); }).join("、") + "）"
            : "全部招聘岗位与候选人") + "</div></li>" +
          '<li><div class="k">可执行</div><div class="v"><ul style="margin-top:2px">' + perms + "</ul></div></li>" +
          '<li><div class="k">登录方式</div><div class="v">企业账号密码 / 企业微信扫码（模拟）</div></li>' +
        "</div>" +
        '<div class="confirm-banner info" style="margin-top:4px"><span>i</span><div class="grow">' +
          "原型内角色可随时切换，用于演示不同岗位看到的界面差异。</div></div>"
    });
  };

  UI.confirmLogout = function () {
    var u = window.Auth.user();
    UI.modal({
      title: "退出登录",
      desc: "退出后需要重新验证企业身份。",
      confirmText: "退出登录",
      body: '<div class="small" style="color:var(--ink-2)">当前账号：<b>' + UI.esc(u ? u.name : "") + "</b>" +
        (u ? "（" + UI.esc(u.mail) + "）" : "") + "<br/>未保存的筛选条件与备注会保留在本次会话中。</div>",
      onConfirm: function () {
        if (UI.onLogout) UI.onLogout();
      }
    });
  };

  UI.bindAudit = function () {
    var sj = document.getElementById("sideJob");
    if (sj) {
      sj.style.cursor = "pointer";
      sj.title = "点击管理岗位";
      sj.onclick = function () { window.Admin.openJobs(); };
    }
  };


  window.UI = UI;
})();
