(function () {
  // 简历原件渲染：把候选人结构化数据还原成一份可阅读的「简历原件」，
  // 并保留 AI 证据与简历原文的对应关系（可定位、可高亮）。
  // 注意：原型中的简历正文为模拟生成，不上传真实文件。
  var CHANNELS = ["猎聘", "BOSS 直聘", "内部推荐", "官网投递", "猎头推荐"];
  var ATTACH = [
    { name: "作品集_产品方案.pdf", type: "作品集" },
    { name: "学历学位证明.pdf", type: "学历证明" },
    { name: "离职证明.pdf", type: "离职证明" },
    { name: "项目复盘文档.pdf", type: "项目文档" }
  ];

  function esc(s) {
    if (s === null || s === undefined) return "";
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function strip(t) { return String(t || "").replace(/^「/, "").replace(/」$/, ""); }
  function hash(str) {
    var h = 7;
    for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 99991;
    return h;
  }
  function pick(arr, i) { return arr[i % arr.length]; }

  function build(cand) {
    var S = window.Store;
    var crit = S.crit(cand.jobId);
    var job = S.getJob(cand.jobId);
    var ev = cand.evidence || {};
    var h = hash(cand.id);

    var file = {
      name: cand.file || (cand.name + "_简历.pdf"),
      size: (280 + (h % 620)) + " KB",
      pages: 2,
      channel: pick(CHANNELS, h),
      uploadedAt: "2026-10-1" + (5 + (h % 4)) + " " + (9 + (h % 8)) + ":2" + (h % 6),
      type: "PDF"
    };

    if (cand.conclusion === "failed") {
      return {
        failed: true, file: file, pages: [], attachments: [],
        evPage: {}, failReason: cand.parseError || "简历解析失败", cand: cand
      };
    }

    var work = [], proj = [], skillLines = [];
    crit.forEach(function (r) {
      var e = ev[r.id];
      if (!e || !e.quote) return;
      var item = { id: r.id, text: strip(e.quote), label: r.label, status: e.status, source: e.source || "" };
      var src = item.source;
      if (src.indexOf("项目") >= 0) proj.push(item);
      else if (src.indexOf("技能") >= 0) skillLines.push(item);
      else work.push(item);
    });

    var company = (cand.recent || "—").split(" · ")[0];
    var title = (cand.recent || "").split(" · ").slice(1).join(" · ") || "产品经理";
    var city = (job && job.city) || "杭州";
    var phoneTail = 1000 + (h % 9000);
    var mail = "cand" + cand.id.replace(/[^0-9a-zA-Z]/g, "").toLowerCase() + "@example.com";

    if (!work.length) {
      work.push({ id: null, text: "在" + company + "担任" + title + "，负责相关产品的需求与迭代（简历原文表述较简略）。" });
    }
    if (!proj.length) {
      proj.push({ id: null, text: "参与" + ((cand.skills && cand.skills[0]) || "产品") + "相关项目的设计与落地（简历未展开项目细节）。" });
    }

    var p1 = {
      no: 1,
      blocks: [
        { type: "head", name: cand.name, sub: title + " · " + (cand.years ? cand.years + " 年经验" : "年限未注明") + " · " + city + " · 138****" + phoneTail + " · " + mail },
        { type: "sec", title: "基本信息", items: [
          { k: "姓名", v: cand.name },
          { k: "工作年限", v: cand.years ? cand.years + " 年" : "简历未注明" },
          { k: "所在城市", v: city },
          { k: "联系电话", v: "138****" + phoneTail },
          { k: "邮箱", v: mail },
          { k: "当前状态", v: cand.stage || "简历初筛" }
        ] },
        { type: "sec", title: "教育经历", lines: [{ id: null, text: cand.edu || "简历未提供教育经历" }] },
        { type: "sec", title: "工作经历", lines: [
          { id: null, text: company + "　|　" + title + "　|　" + (cand.years ? cand.years : 3) + " 年" }
        ], bullets: work }
      ]
    };

    var p2 = {
      no: 2,
      blocks: [
        { type: "sec", title: "项目经历", bullets: proj },
        { type: "sec", title: "专业技能", chips: (cand.skills || []).slice(0), lines: skillLines },
        { type: "sec", title: "自我评价 / 摘要", lines: [{ id: null, text: cand.summary || "简历未提供自我评价" }] }
      ]
    };

    var evPage = {};
    [p1, p2].forEach(function (p) {
      p.blocks.forEach(function (b) {
        (b.lines || []).forEach(function (l) { if (l.id) evPage[l.id] = p.no; });
        (b.bullets || []).forEach(function (l) { if (l.id) evPage[l.id] = p.no; });
      });
    });

    var atts = [];
    if (h % 3 === 0) atts.push(makeAtt(ATTACH[0], cand, h));
    if (h % 4 === 1) atts.push(makeAtt(ATTACH[1], cand, h + 3));
    if (h % 7 === 2) atts.push(makeAtt(ATTACH[3], cand, h + 5));

    return { failed: false, file: file, pages: [p1, p2], attachments: atts, evPage: evPage, cand: cand };
  }

  function makeAtt(tpl, cand, h) {
    return {
      id: "ATT-" + h,
      name: cand.name + "_" + tpl.name,
      type: tpl.type,
      pages: 1,
      size: (120 + (h % 500)) + " KB",
      lines: [
        "附件类型：" + tpl.type,
        "候选人：" + cand.name + "（" + cand.id + "）",
        "上传时间：2026-10-1" + (5 + (h % 4)) + "，来源：" + cand.file,
        tpl.type === "作品集"
          ? "包含 3 份产品方案：投放策略配置平台 PRD 节选、会员权益包改版方案、数据看板原型说明。"
          : tpl.type === "学历证明"
            ? "学历证书扫描件 1 页，学校与专业信息与简历教育经历一致。"
            : "项目复盘文档，含指标口径说明与上线后数据回收。"
      ]
    };
  }

  // ---------- 渲染 ----------
  function blockHtml(b) {
    var h = "";
    if (b.type === "head") {
      h += '<div class="pg-head"><div class="pg-name">' + esc(b.name) + '</div><div class="pg-sub">' + esc(b.sub) + "</div></div>";
      return h;
    }
    h += '<div class="pg-sec"><div class="pg-h">' + esc(b.title) + "</div>";
    (b.items || []).forEach(function (it) {
      h += '<div class="pg-line"><span class="k">' + esc(it.k) + "</span>" + esc(it.v) + "</div>";
    });
    (b.lines || []).forEach(function (l) {
      h += '<div class="pg-line"' + (l.id ? ' data-ev="' + l.id + '"' : "") + ">" + esc(l.text) + "</div>";
    });
    (b.bullets || []).forEach(function (l) {
      h += '<div class="pg-line bullet"' + (l.id ? ' data-ev="' + l.id + '"' : "") + ">· " + esc(l.text) + "</div>";
    });
    if (b.chips && b.chips.length) {
      h += '<div class="pg-chips">' + b.chips.map(function (s) { return '<span>' + esc(s) + "</span>"; }).join("") + "</div>";
    }
    h += "</div>";
    return h;
  }

  function pageHtml(doc, idx) {
    var p = doc.pages[idx];
    if (!p) return "";
    return '<div class="pg">' + p.blocks.map(blockHtml).join("") +
      '<div class="pg-foot">第 ' + p.no + " / " + doc.pages.length + " 页 · " + esc(doc.cand.name) + " · " + esc(doc.file.name) + "</div></div>";
  }

  function scanHtml(doc) {
    return '<div class="pg scan">' +
      '<div class="scan-tip">原件为扫描件 / 加密文件，当前无法提取文本层</div>' +
      '<div class="scan-img"><div class="scan-cap">简历原件扫描页（模拟）</div>' +
      (function () {
        var out = "";
        for (var i = 0; i < 14; i++) out += '<div class="scan-line" style="width:' + (52 + ((i * 17) % 44)) + '%"></div>';
        return out;
      })() +
      "</div>" +
      '<div class="scan-note">失败原因：' + esc(doc.failReason) + "</div>" +
      "</div>";
  }

  function attHtml(att, cand) {
    return '<div class="pg">' +
      '<div class="pg-head"><div class="pg-name">' + esc(att.type) + '</div><div class="pg-sub">' + esc(cand.name) + " · " + esc(att.name) + "</div></div>" +
      '<div class="pg-sec"><div class="pg-h">附件内容</div>' +
      att.lines.map(function (l) { return '<div class="pg-line">' + esc(l) + "</div>"; }).join("") +
      "</div>" +
      '<div class="pg-foot">附件 1 / 1 页 · ' + esc(att.size) + "</div></div>";
  }

  // 缩略图：把整页渲染后整体缩放，得到真实的「文件缩略图」效果
  function thumb(cand) {
    var doc = build(cand);
    var inner = doc.failed ? scanHtml(doc) : pageHtml(doc, 0);
    return '<div class="pthumb' + (doc.failed ? " failed" : "") + '"><div class="pthumb-in">' + inner + "</div>" +
      (doc.failed ? '<div class="pthumb-mask">无法提取文本</div>' : "") +
      '<span class="pthumb-tag">' + esc(doc.file.type) + "</span></div>";
  }

  // ---------- 全文查看器 ----------
  var view = { candId: null, doc: null, page: 0, file: "resume", onlyEv: false, focusEv: null };

  function renderViewer() {
    var S = window.Store, UI = window.UI;
    var cand = S.getCandidate(view.candId);
    var doc = view.doc;
    var root = document.getElementById("modalRoot");

    var body;
    if (view.file === "resume") {
      body = doc.failed ? scanHtml(doc) : pageHtml(doc, view.page);
    } else {
      var att = null;
      doc.attachments.forEach(function (a) { if (a.id === view.file) att = a; });
      body = att ? attHtml(att, cand) : "";
    }

    var filesHtml = '<div class="rv-sec-t">简历原件</div>' +
      '<div class="rv-file' + (view.file === "resume" ? " on" : "") + '" data-rv-file="resume">' +
        '<div class="rv-thumb">' + thumb(cand) + "</div>" +
        '<div class="rv-fmeta"><b>' + esc(doc.file.name) + "</b>" +
          '<div class="small muted">' + esc(doc.file.type) + " · " + esc(doc.file.size) + " · " +
            (doc.failed ? "解析失败" : doc.file.pages + " 页") + "</div>" +
          '<div class="small muted">来源：' + esc(doc.file.channel) + "　上传：" + esc(doc.file.uploadedAt) + "</div>" +
        "</div></div>";

    if (doc.attachments.length) {
      filesHtml += '<div class="rv-sec-t">其他附件</div>' + doc.attachments.map(function (a) {
        return '<div class="rv-file att' + (view.file === a.id ? " on" : "") + '" data-rv-file="' + a.id + '">' +
          '<div class="rv-ico">A</div>' +
          '<div class="rv-fmeta"><b>' + esc(a.name) + "</b>" +
          '<div class="small muted">' + esc(a.type) + " · " + esc(a.size) + "</div></div></div>";
      }).join("");
    }

    var pagesHtml = "";
    if (view.file === "resume" && !doc.failed) {
      pagesHtml = '<div class="rv-sec-t">页面</div><div class="rv-pages">' +
        doc.pages.map(function (p, i) {
          return '<div class="rv-pg' + (i === view.page ? " on" : "") + '" data-rv-page="' + i + '">' +
            '<div class="rv-pg-in">' + pageHtml(doc, i) + "</div><span>第 " + p.no + " 页</span></div>";
        }).join("") + "</div>";
    }

    var crit = S.crit(cand.jobId);
    var evHtml = "";
    if (!doc.failed) {
      evHtml = '<div class="rv-sec-t">证据定位 · ' + crit.length + " 项岗位要求</div>" +
        '<div class="rv-evlist">' + crit.map(function (r) {
          var e = (cand.evidence || {})[r.id];
          var st = e ? e.status : "missing";
          var cls = st === "matched" ? "high" : st === "limited" ? "review" : "muted";
          return '<button class="rv-ev' + (view.focusEv === r.id ? " on" : "") + '" data-rv-ev="' + r.id + '">' +
            '<span class="tag ' + cls + '">' + (st === "matched" ? "有证据" : st === "limited" ? "证据有限" : "未提及") + "</span>" +
            "<span>" + esc(r.label) + "</span></button>";
        }).join("") + "</div>" +
        '<label class="rv-only"><input type="checkbox" id="rvOnly"' + (view.onlyEv ? " checked" : "") + ' /> 只看 AI 引用过的原文</label>' +
        '<div class="hint" style="margin-top:8px">点击任一项跳转到对应原文</div>';
    } else {
      evHtml = '<div class="rv-sec-t">证据定位</div><div class="small muted">原件未解析，暂无可定位原文。</div>';
    }

    root.innerHTML = '<div class="rv-mask" data-rv-mask="1"><div class="rv" role="dialog">' +
      '<div class="rv-head">' +
        '<div class="l"><b>' + esc(cand.name) + "</b><span>" + esc(cand.id) + " · " + esc(cand.stage || "") + "</span>" +
          '<span class="tag muted">模拟简历原件</span></div>' +
        '<div class="r">' +
          '<button class="btn sm" id="rvCopy">复制简历文本</button>' +
          '<button class="btn sm" id="rvDownload">下载原件</button>' +
          '<button class="icon-btn" data-rv-close="1">×</button>' +
        "</div></div>" +
      '<div class="rv-body">' +
        '<aside class="rv-side">' + filesHtml + pagesHtml + "</aside>" +
        '<div class="rv-doc' + (view.onlyEv ? " only-ev" : "") + '" id="rvDoc">' + body + "</div>" +
        '<aside class="rv-right">' + evHtml + "</aside>" +
      "</div></div></div>";

    bind(root);
    if (view.focusEv) {
      setTimeout(function () { highlight(view.focusEv); }, 30);
    }
  }

  function highlight(critId) {
    var docEl = document.getElementById("rvDoc");
    if (!docEl) return;
    var el = docEl.querySelector('[data-ev="' + critId + '"]');
    if (!el) {
      window.UI.toast("简历中未找到该要求的对应原文，不做推测", "warn");
      return;
    }
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    docEl.querySelectorAll(".pg-line.hl").forEach(function (x) { x.classList.remove("hl"); });
    el.classList.add("hl");
  }

  function bind(root) {
    var S = window.Store, UI = window.UI;
    var close = root.querySelector("[data-rv-close]");
    if (close) close.onclick = function () { var dr = document.getElementById("drawerRoot");
      document.getElementById("modalRoot").innerHTML = "";
      document.body.style.overflow = dr && dr.innerHTML ? "hidden" : ""; };
    var mask = root.querySelector("[data-rv-mask]");
    if (mask) mask.onclick = function (e) { if (e.target === e.currentTarget) close.click(); };

    root.querySelectorAll("[data-rv-file]").forEach(function (b) {
      b.onclick = function () { view.file = b.getAttribute("data-rv-file"); view.page = 0; renderViewer(); };
    });
    root.querySelectorAll("[data-rv-page]").forEach(function (b) {
      b.onclick = function () { view.page = parseInt(b.getAttribute("data-rv-page"), 10); view.file = "resume"; renderViewer(); };
    });
    root.querySelectorAll("[data-rv-ev]").forEach(function (b) {
      b.onclick = function () {
        var id = b.getAttribute("data-rv-ev");
        view.focusEv = id;
        var target = view.doc.evPage[id];
        if (view.file !== "resume") { view.file = "resume"; }
        if (target && target - 1 !== view.page) { view.page = target - 1; renderViewer(); }
        else { renderViewer(); }
      };
    });
    var only = root.querySelector("#rvOnly");
    if (only) only.onchange = function () { view.onlyEv = only.checked; renderViewer(); };
    var cp = root.querySelector("#rvCopy");
    if (cp) cp.onclick = function () {
      UI.toast("简历正文已复制到剪贴板", "ok");
    };
    var dl = root.querySelector("#rvDownload");
    if (dl) dl.onclick = function () {
      UI.toast("已触发下载", "ok");
    };
  }

  window.Resume = {
    build: build,
    thumb: thumb,
    open: function (candId, opts) {
      opts = opts || {};
      var cand = window.Store.getCandidate(candId);
      if (!cand) return;
      view.candId = candId;
      view.doc = build(cand);
      view.page = 0;
      view.file = opts.file || "resume";
      view.onlyEv = false;
      view.focusEv = opts.critId || null;
      if (opts.critId && view.doc.evPage[opts.critId]) view.page = view.doc.evPage[opts.critId] - 1;
      document.body.style.overflow = "hidden";
      renderViewer();
    }
  };
})();
