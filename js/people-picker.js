(function () {
  // 企业内部人员选择器：支持姓名 / 全拼 / 首字母 / 部门 / 职务 / 邮箱 / 工号 搜索，点击选择
  var PP = {};
  var store = {};          // id -> { multiple, selected: [] }
  var activeIdx = {};      // id -> number

  function esc(s) {
    return window.UI ? window.UI.esc(s) : String(s == null ? "" : s);
  }
  function D() { return window.DATA; }

  function parseValue(v) {
    if (!v) return [];
    return String(v).split("、").map(function (s) { return s.trim(); })
      .filter(function (s) { return s; });
  }
  function toLabel(e) { return D().empLabel(e); }

  function init(id, opt) {
    var items = parseValue(opt.value).map(function (t) {
      var e = D().empByName(t);
      return { text: t, eid: e ? e.id : null };
    });
    store[id] = { multiple: !!opt.multiple, selected: items };
    if (!store[id].multiple && items.length > 1) store[id].selected = items.slice(0, 1);
    activeIdx[id] = -1;
  }

  function setValue(id) {
    var s = store[id];
    var el = document.getElementById(id);
    if (el) el.value = s.selected.map(function (x) { return x.text; }).join("、");
  }

  function chipsHtml(id) {
    var s = store[id];
    return s.selected.map(function (x, i) {
      var e = x.eid ? D().EMPLOYEES.filter(function (k) { return k.id === x.eid; })[0] : D().empByName(x.text);
      var nm = e ? e.name : x.text.split("（")[0];
      var sub = e ? e.title : "通讯录外";
      return '<span class="pp-chip' + (e ? "" : " free") + '">' +
        '<i class="pp-av">' + esc(nm.slice(0, 1)) + "</i>" +
        '<span class="pp-cn"><b>' + esc(nm) + '</b><em>' + esc(sub) + "</em></span>" +
        '<button type="button" class="pp-x" data-pp-rm="' + i + '" title="移除">×</button>' +
      "</span>";
    }).join("");
  }

  function itemHtml(e, q) {
    var kind = D().KIND_LABEL[e.kind] || "";
    return '<div class="pp-item" data-eid="' + e.id + '">' +
      '<i class="pp-av">' + esc(e.name.slice(0, 1)) + "</i>" +
      '<div class="pp-im"><div class="pp-in">' + hl(e.name, q) +
        (kind ? '<span class="pp-kind">' + esc(kind) + "</span>" : "") +
        '<span class="pp-py">' + esc(e.pinyin) + " · " + esc(e.short) + "</span></div>" +
        '<div class="pp-id">' + hl(e.title, q) + "　·　" + hl(e.dept, q) + "</div>" +
        '<div class="pp-im-mail">' + esc(e.mail) + " · " + esc(e.id) + "</div></div>" +
      '<span class="pp-ok">选择</span></div>';
  }

  function hl(text, q) {
    var t = esc(text);
    if (!q) return t;
    var k = String(q).trim().toLowerCase();
    if (!k) return t;
    var idx = text.toLowerCase().indexOf(k);
    if (idx < 0) return t;
    var frag = esc(text.slice(idx, idx + k.length));
    return esc(text.slice(0, idx)) + '<mark>' + frag + "</mark>" + esc(text.slice(idx + k.length));
  }

  function openDrop(id, q) {
    var s = store[id];
    var drop = document.getElementById(id + "__drop");
    if (!drop) return;
    var list = D().searchEmployees(q, 8);
    var html = "";
    if (!q) html += '<div class="pp-lab">常用联系人 · 输入姓名或拼音可搜索全员</div>';
    if (list.length) {
      html += list.map(function (e) { return itemHtml(e, q); }).join("");
    } else {
      html += '<div class="pp-none">通讯录中没有匹配的员工</div>';
    }
    if (q && !s.multiple) {
      html += '<div class="pp-item free-item" data-free="' + esc(q) + '">' +
        '<i class="pp-av free">手</i><div class="pp-im"><div class="pp-in">按文本填写：' + esc(q) +
        '</div><div class="pp-id">不在通讯录内时可直接填写姓名（仅本地记录）</div></div>' +
        '<span class="pp-ok">使用</span></div>';
    }
    html += '<div class="pp-foot">数据来自企业通讯录（模拟）· 仅用于选择对接人，不发送任何消息</div>';
    drop.innerHTML = html;
    drop.classList.add("on");
    activeIdx[id] = -1;

    drop.querySelectorAll("[data-eid]").forEach(function (it) {
      it.onmousedown = function (ev) { ev.preventDefault(); };
      it.onclick = function () { pick(id, it.getAttribute("data-eid"), null); };
    });
    var fi = drop.querySelector("[data-free]");
    if (fi) {
      fi.onmousedown = function (ev) { ev.preventDefault(); };
      fi.onclick = function () { pick(id, null, fi.getAttribute("data-free")); };
    }
  }

  function closeDrop(id) {
    var drop = document.getElementById(id + "__drop");
    if (drop) drop.classList.remove("on");
    activeIdx[id] = -1;
  }

  function pick(id, eid, freeText) {
    var s = store[id];
    if (eid) {
      var e = D().EMPLOYEES.filter(function (k) { return k.id === eid; })[0];
      if (!e) return;
      var item = { text: toLabel(e), eid: e.id };
      if (s.multiple) {
        if (s.selected.some(function (x) { return x.eid === e.id; })) {
          window.UI.toast(e.name + " 已在列表中", "warn");
        } else s.selected.push(item);
      } else {
        s.selected = [item];
      }
    } else if (freeText) {
      var item2 = { text: freeText, eid: null };
      if (s.multiple) s.selected.push(item2); else s.selected = [item2];
    }
    setValue(id);
    renderChips(id);
    var q = document.getElementById(id + "__q");
    if (q) { q.value = ""; q.focus(); }
    if (s.multiple) openDrop(id, ""); else closeDrop(id);
  }

  function renderChips(id) {
    var box = document.getElementById(id + "__chips");
    if (!box) return;
    box.innerHTML = chipsHtml(id);
    box.querySelectorAll("[data-pp-rm]").forEach(function (b) {
      b.onclick = function (ev) {
        ev.stopPropagation();
        var i = parseInt(b.getAttribute("data-pp-rm"), 10);
        store[id].selected.splice(i, 1);
        setValue(id);
        renderChips(id);
      };
    });
  }

  PP.field = function (opt) {
    var id = opt.id;
    var ph = opt.placeholder || "搜索姓名 / 拼音，如 chenhao、ch";
    return '<div class="field"><label>' + esc(opt.label) + "</label>" +
      '<div class="pp" data-pp="' + id + '">' +
        '<input type="hidden" id="' + id + '" value="' + esc(opt.value || "") + '" />' +
        '<div class="pp-box" id="' + id + '__box">' +
          '<span class="pp-chips" id="' + id + '__chips"></span>' +
          '<input class="pp-input" id="' + id + '__q" autocomplete="off" placeholder="' + esc(ph) + '" />' +
          '<span class="pp-caret">▾</span>' +
        "</div>" +
        '<div class="pp-drop" id="' + id + '__drop"></div>' +
      "</div>" +
      (opt.hint ? '<div class="pp-hint">' + esc(opt.hint) + "</div>" : "") +
    "</div>";
  };

  PP.bind = function (root, opt) {
    var id = opt.id;
    init(id, opt);
    var q = root.querySelector("#" + id + "__q");
    var drop = root.querySelector("#" + id + "__drop");
    var box = root.querySelector("#" + id + "__box");
    if (!q || !drop) return;
    renderChips(id);
    setValue(id);

    q.onfocus = function () { openDrop(id, q.value); };
    q.oninput = function () { openDrop(id, q.value); };
    q.onblur = function () { setTimeout(function () { closeDrop(id); }, 160); };
    q.onkeydown = function (ev) {
      var items = drop.querySelectorAll(".pp-item");
      if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
        if (!drop.classList.contains("on")) { openDrop(id, q.value); return; }
        ev.preventDefault();
        var n = items.length;
        if (!n) return;
        activeIdx[id] = activeIdx[id] + (ev.key === "ArrowDown" ? 1 : -1);
        if (activeIdx[id] < 0) activeIdx[id] = n - 1;
        if (activeIdx[id] >= n) activeIdx[id] = 0;
        for (var i = 0; i < n; i++) items[i].classList.toggle("cur", i === activeIdx[id]);
      } else if (ev.key === "Enter") {
        ev.preventDefault();
        var el = items[activeIdx[id]];
        if (el) el.click();
        else {
          var first = drop.querySelector("[data-eid]");
          if (first) first.click();
        }
      } else if (ev.key === "Escape") {
        closeDrop(id);
      }
    };
    if (box) {
      box.onclick = function (ev) {
        if (ev.target.hasAttribute && ev.target.hasAttribute("data-pp-rm")) return;
        q.focus();
      };
    }
  };

  PP.read = function (root, id) {
    var el = root.querySelector("#" + id);
    return el ? el.value : "";
  };

  // 独立弹窗：工作台 / 步骤条等处快速更换对接人
  PP.pickDialog = function (cfg) {
    var UI = window.UI;
    var id = "ppPick";
    UI.modal({
      title: cfg.title || "选择企业内部员工",
      desc: cfg.desc || "支持姓名、全拼、首字母、部门、职务搜索；数据来自企业通讯录（模拟）。",
      confirmText: cfg.confirmText || "确认选择",
      body: PP.field({
        id: id, label: cfg.label || "人员", value: cfg.value || "",
        multiple: !!cfg.multiple, hint: cfg.hint || ""
      }) + (cfg.note ? '<div class="confirm-banner info" style="margin-top:10px"><span>i</span><div class="grow">' + cfg.note + "</div></div>" : ""),
      onConfirm: function (root) {
        var v = PP.read(root, id);
        if (!v) { UI.toast("请选择一位员工", "warn"); return true; }
        if (cfg.onPick) cfg.onPick(v);
      }
    });
    var modal = document.querySelector("#modalRoot .modal");
    if (modal) {
      PP.bind(modal, { id: id, value: cfg.value || "", multiple: !!cfg.multiple });
      var qi = modal.querySelector("#" + id + "__q");
      if (qi) setTimeout(function () { qi.focus(); }, 30);
    }
  };

  window.PeoplePicker = PP;
})();
