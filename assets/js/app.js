/* ==========================================================================
   川口市立高等学校 キャンパス探検 — app.js
   (vanilla JS / 依存ライブラリなし)
   ========================================================================== */
(function () {
  "use strict";
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var D = window.SITE_DATA;

  var fmt = function (n) {
    if (n === null || n === undefined) return "—";
    return n.toLocaleString("ja-JP", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  var esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };

  /* ================= 進捗バー / ヘッダー / スクロールスパイ ================= */
  var progress = $("#progress");
  var toTop = $("#toTop");
  function onScroll() {
    var h = document.documentElement;
    var sc = h.scrollTop || document.body.scrollTop;
    var max = h.scrollHeight - h.clientHeight;
    if (progress) progress.style.width = (max > 0 ? (sc / max) * 100 : 0) + "%";
    if (toTop) toTop.classList.toggle("show", sc > 600);
  }
  document.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  if (toTop) {
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  var navLinks = $$(".site-nav a");
  var sections = navLinks
    .map(function (a) { return $(a.getAttribute("href")); })
    .filter(Boolean);
  if ("IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          navLinks.forEach(function (a) {
            a.classList.toggle("active", a.getAttribute("href") === "#" + en.target.id);
          });
        }
      });
    }, { rootMargin: "-30% 0px -60% 0px" });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ================= キャンパスマップ ================= */
  var CAT_COLORS = {
    building: "var(--cat-building)",
    sports: "var(--cat-sports)",
    space: "var(--cat-space)",
    gate: "var(--cat-gate)",
    parking: "var(--cat-parking)",
    neighbor: "var(--cat-neighbor)",
  };
  var CAT_LABELS = {};
  (D.map.categories || []).forEach(function (c) { CAT_LABELS[c.id] = c.label; });

  var mapWrap = $("#campusMap");
  var mapDetail = $("#mapDetail");
  var facChips = $("#facChips");
  var activeCats = {};
  (D.map.categories || []).forEach(function (c) { activeCats[c.id] = true; });

  function spotAria(s) {
    return "aria-label=\"" + esc(s.name) + "の詳細を表示\"";
  }
  function renderMap() {
    if (!mapWrap) return;
    var html = '<img src="' + D.map.image + '" alt="' + esc(D.map.alt) + '" loading="lazy">';
    D.map.spots.forEach(function (s) {
      html +=
        '<button type="button" class="spot" data-id="' + s.id + '" data-cat="' + s.cat +
        '" style="left:' + s.x + "%;top:" + s.y + "%;--c:" + (CAT_COLORS[s.cat] || "var(--teal)") +
        '" ' + spotAria(s) + "><span class=\"dot\"></span><span class=\"tip\">" + esc(s.name) + "</span></button>";
    });
    mapWrap.innerHTML = html;

    // カテゴリチップ
    var toolbar = $("#mapChips");
    if (toolbar) {
      toolbar.innerHTML =
        D.map.categories
          .map(function (c) {
            return (
              '<button type="button" class="chip on" data-cat="' + c.id + '">' +
              '<span class="sw" style="background:' + CAT_COLORS[c.id] + '"></span>' + esc(c.label) + "</button>"
            );
          })
          .join("") + '<span class="hint">●をクリックで解説 / 分類で絞り込み</span>';
      toolbar.addEventListener("click", function (e) {
        var btn = e.target.closest(".chip");
        if (!btn) return;
        var cat = btn.dataset.cat;
        activeCats[cat] = !activeCats[cat];
        btn.classList.toggle("on", activeCats[cat]);
        $$(".spot", mapWrap).forEach(function (sp) {
          sp.classList.toggle("hidden", !activeCats[sp.dataset.cat]);
        });
      });
    }

    // 凡例
    var legend = $("#mapLegend");
    if (legend) {
      legend.innerHTML = D.map.categories
        .map(function (c) {
          return "<span><i style=\"background:" + CAT_COLORS[c.id] + '"></i>' + esc(c.label) + "</span>";
        })
        .join("");
    }

    // ホットスポット
    mapWrap.addEventListener("click", function (e) {
      var sp = e.target.closest(".spot");
      if (!sp) return;
      selectSpot(sp.dataset.id);
    });

    // 施設チップ一覧
    if (facChips) {
      facChips.innerHTML = D.map.spots
        .map(function (s) {
          return '<button type="button" data-id="' + s.id + '">' + esc(s.name) + "</button>";
        })
        .join("");
      facChips.addEventListener("click", function (e) {
        var b = e.target.closest("button[data-id]");
        if (!b) return;
        selectSpot(b.dataset.id);
        var sp = $('.spot[data-id="' + b.dataset.id + '"]', mapWrap);
        if (sp) sp.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
    selectSpot("koshato", true);
  }

  function selectSpot(id, silent) {
    var s = null;
    for (var i = 0; i < D.map.spots.length; i++) {
      if (D.map.spots[i].id === id) { s = D.map.spots[i]; break; }
    }
    if (!s || !mapDetail) return;
    $$(".spot", mapWrap).forEach(function (sp) {
      sp.classList.toggle("active", sp.dataset.id === id);
    });
    var statsHtml = "";
    (s.stats || []).forEach(function (kv) {
      statsHtml += "<dt>" + esc(kv[0]) + "</dt><dd class=\"num\">" + esc(kv[1]) + "</dd>";
    });
    mapDetail.innerHTML =
      '<span class="cat-tag" style="background:' + (CAT_COLORS[s.cat] || "var(--teal)") + '">' + esc(CAT_LABELS[s.cat] || "") + "</span>" +
      "<h3>" + esc(s.name) + "</h3>" +
      (s.phase && s.phase !== "—" ? '<p class="phase">🔧 ' + esc(s.phase) + "</p>" : "") +
      "<p>" + esc(s.desc) + "</p>" +
      (statsHtml ? "<dl>" + statsHtml + "</dl>" : "") +
      '<p class="goto"><span class="src-badge pdf">📄 実施設計資料「配置図」より</span></p>';
    if (!silent) {
      var head = mapDetail.querySelector("h3");
      if (head) head.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  /* ================= フロアガイド ================= */
  var BUILDING_META = [
    { key: "koshato", label: "校舎棟", color: "var(--c-koshato)" },
    { key: "arenaS", label: "アリーナS棟", color: "var(--c-arenaS)" },
    { key: "arenaN", label: "アリーナN棟", color: "var(--c-arenaN)" },
    { key: "other", label: "その他施設", color: "var(--c-other)" },
  ];
  var floorTabs = $("#floorTabs");
  var floorPanel = $("#floorPanel");
  var currentFloor = null;

  function renderFloorTabs() {
    if (!floorTabs) return;
    floorTabs.innerHTML = D.floors
      .map(function (f) {
        return (
          '<button type="button" class="floor-tab" data-id="' + f.id + '">' +
          '<span class="f">' + esc(f.name) + '</span><br><span class="a">' +
          (f.areas.total ? Math.round(f.areas.total).toLocaleString("ja-JP") + "㎡" : "—") +
          "</span></button>"
        );
      })
      .join("");
    floorTabs.addEventListener("click", function (e) {
      var b = e.target.closest(".floor-tab");
      if (!b) return;
      showFloor(b.dataset.id);
    });
  }

  function showFloor(id) {
    var f = null;
    D.floors.forEach(function (x) { if (x.id === id) f = x; });
    if (!f || !floorPanel) return;
    currentFloor = f;
    $$(".floor-tab", floorTabs).forEach(function (b) {
      b.classList.toggle("on", b.dataset.id === id);
    });

    var total = f.areas.total;
    var barHtml = "";
    BUILDING_META.forEach(function (b) {
      var v = f.areas[b.key];
      if (v) {
        var pct = (v / total) * 100;
        barHtml +=
          '<div class="seg" style="width:' + pct.toFixed(2) + "%;background:" + b.color + '" title="' + esc(b.label) + " " + fmt(v) + '㎡">' +
          (pct > 13 ? Math.round(pct) + "%" : "") + "</div>";
      }
    });

    var legendHtml = "";
    BUILDING_META.forEach(function (b) {
      var v = f.areas[b.key];
      legendHtml +=
        "<li><span class=\"l\"><i style=\"background:" + b.color + '"></i>' + esc(b.label) + "</span>" +
        '<span class="v num' + (v ? "" : " mute") + '">' + (v ? fmt(v) + " ㎡" : "計上なし") + "</span></li>";
    });
    legendHtml +=
      '<li class="total"><span class="l">合計床面積</span><span class="v num">' +
      (total ? fmt(total) + " ㎡" : "—") + "</span></li>";

    var notesHtml = (f.notes || []).map(function (n) { return "<li>" + esc(n) + "</li>"; }).join("");
    var planHtml;
    if (f.plan) {
      planHtml =
        '<figure class="plan-card" style="margin:0">' +
        '<div class="plan-frame" data-viewer="' + f.plan + '" data-title="' + esc(f.name) + '平面図(実施設計 資料04〜07)" role="button" tabindex="0" aria-label="平面図を拡大表示">' +
        '<img src="' + f.plan + '" alt="' + esc(f.name) + 'の平面図" loading="lazy">' +
        '<span class="zoom-hint">🔍 ズーム表示</span></div>' +
        '<figcaption class="plan-cap"><span>実施設計 平面図より切り出し</span><span>' + esc(f.name) + "</span></figcaption></figure>";
    } else {
      planHtml =
        '<div class="no-plan"><span class="big">🗺️</span><span>この階の独立した平面図シートは資料にありません</span><span style="font-weight:500;font-size:12.5px">面積は「設計概要」の面積表で確認できます</span></div>';
    }

    floorPanel.innerHTML =
      '<div class="floor-info"><h3>' + esc(f.name) + "</h3>" +
      '<p class="desc">' + esc(f.desc) + "</p>" +
      (total ? '<div class="stacked-bar" role="img" aria-label="階別床面積の構成">' + barHtml + "</div>" : "") +
      '<ul class="floor-legend">' + legendHtml + "</ul>" +
      (notesHtml && notesHtml.length ? "<ul class=\"floor-legend\" style=\"margin-top:-8px\">" + notesHtml + "</ul>" : "") +
      "</div>" + planHtml;

    var frame = $(".plan-frame", floorPanel);
    if (frame) {
      frame.addEventListener("click", function () {
        Viewer.open(f.plan, esc(f.name) + "の平面図", "実施設計 資料04〜07「平面図」より");
      });
      frame.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); Viewer.open(f.plan, esc(f.name) + "の平面図", "実施設計 資料04〜07「平面図」より"); }
      });
    }
  }

  /* ================= 面積表・ゲージ・駐輪駐車 ================= */
  function renderAreaTable() {
    var host = $("#areaTable");
    if (!host) return;
    var t = D.areaTable;
    var html = '<div class="table-scroll"><table class="area"><thead><tr><th>建物名</th>';
    t.floors.forEach(function (fl) { html += "<th>" + esc(fl) + "</th>"; });
    html += "</tr></thead><tbody>";
    t.rows.forEach(function (r) {
      html += "<tr" + (r.total ? ' class="total"' : "") + "><th scope=\"row\">" + esc(r.name) + "</th>";
      r.vals.forEach(function (v) {
        html += "<td class=\"num" + (v === null ? " missing" : "") + "\">" + (v === null ? "—" : fmt(v)) + "</td>";
      });
      html += "</tr>";
    });
    html += "</tbody></table></div>";
    host.innerHTML = html;
    var note = $("#areaNote");
    if (note) note.textContent = t.note;
  }

  function renderGauges() {
    var host = $("#gauges");
    if (!host) return;
    function gauge(label, plan, base, baseLabel, unit) {
      var pct = (plan / base) * 100;
      var pos = Math.min(pct, 100);
      return (
        '<div class="gauge"><div class="g-head"><span>' + esc(label) + '</span><span class="val num">' +
        plan + unit + ' <small style="color:#8b826a;font-size:11px">(基準 ' + base + unit + ")</small></span></div>" +
        '<div class="track"><div class="fill" style="width:' + pos + '%"></div>' +
        '<div class="base" style="left:calc(' + 100 + "% - 3px)\"></div>" +
        '<span class="base-label" style="left:100%">' + esc(baseLabel) + "</span></div></div>"
      );
    }
    host.innerHTML =
      gauge("計画建蔽率", "27.38", "70", "基準70%(角地+10%)", "%") +
      gauge("計画容積率", "61.42", "200", "基準200%", "%");
  }

  function renderParking() {
    var host = $("#parkingBars");
    if (!host) return;
    var maxCar = Math.max.apply(null, D.parking.car.map(function (x) { return x.n; }));
    var maxBi = Math.max.apply(null, D.parking.bicycle.map(function (x) { return x.n; }));
    function rows(list, max, color, unit) {
      return list
        .map(function (x) {
          return (
            '<div class="park-row"><span class="lbl">' + esc(x.label) + '</span><span class="n num">' +
            x.n + unit + '</span><div class="bar"><i style="width:' + (x.n / max) * 100 + "%;--bc:" + color + '"></i></div></div>'
          );
        })
        .join("");
    }
    host.innerHTML =
      '<h4 style="margin:0 0 12px;font-size:13px;letter-spacing:.1em;color:var(--muted)">🚗 自動車 <span class="num" style="color:var(--ink)">計100台</span>(うち車椅子3台)+ 🚌 バス4台</h4>' +
      rows(D.parking.car, maxCar, "var(--cat-parking)", "台") +
      '<h4 style="margin:22px 0 12px;font-size:13px;letter-spacing:.1em;color:var(--muted)">🚲 自転車 <span class="num" style="color:var(--ink)">計1,510台</span>(5箇所)</h4>' +
      rows(D.parking.bicycle, maxBi, "var(--c-arenaS)", "台") +
      '<p class="subnote">台数・配置は実施設計資料「配置図」の記載による。バス駐車場は2台×2箇所。</p>';
  }

  /* ================= タイムライン・工程 ================= */
  function renderTimeline() {
    var host = $("#timeline");
    if (!host) return;
    var milestone = { "2018.4": 1, "2021.4": 1, "2015.9": 1 };
    host.innerHTML = D.timeline
      .map(function (t) {
        return (
          '<div class="tl-item' + (milestone[t.year] ? " milestone" : "") + '">' +
          '<span class="year num">' + esc(t.year) + ' <span class="src-badge ' + (t.src === "web" ? "web" : "pdf") + '">' +
          (t.src === "web" ? "🌐 公開情報" : "📄 資料") + "</span></span>" +
          '<p class="txt">' + esc(t.text) + "</p></div>"
        );
      })
      .join("");
  }

  function renderPhases() {
    var host = $("#phaseGrid");
    if (!host) return;
    host.innerHTML = D.phases
      .map(function (p, i) {
        var labels = (p.labels || []).map(function (l) { return "<span>" + esc(l) + "</span>"; }).join("");
        return (
          '<article class="phase-card"><div class="ph-img"><span class="step">PHASE ' + i + "</span>" +
          '<img src="' + p.img + '" alt="' + esc(p.name) + "の工程図(実施設計 資料02)\" loading=\"lazy\"></div>" +
          '<div class="ph-body"><h3>' + esc(p.name) + "</h3>" +
          '<div class="period">' + esc(p.period) + "</div>" +
          "<p>" + esc(p.desc) + "</p>" +
          '<div class="labels">' + labels + "</div></div></article>"
        );
      })
      .join("");
  }

  /* ================= ギャラリー + ライトボックス ================= */
  function renderGallery() {
    var host = $("#galleryGrid");
    if (!host) return;
    host.innerHTML = D.gallery
      .map(function (g, i) {
        return (
          '<button type="button" class="g-item" data-i="' + i + '">' +
          '<span class="im"><img src="' + g.img + '" alt="' + esc(g.title) + '" loading="lazy"></span>' +
          '<span class="cap"><span class="t">' + esc(g.title) + '</span><span class="s">' + esc(g.caption) + "</span></span></button>"
        );
      })
      .join("");
    host.addEventListener("click", function (e) {
      var b = e.target.closest(".g-item");
      if (b) Lightbox.open(parseInt(b.dataset.i, 10));
    });
  }

  var Lightbox = (function () {
    var modal, stage, cap, idx = 0;
    function build() {
      modal = document.createElement("div");
      modal.className = "modal";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.innerHTML =
        '<div class="modal-head"><div class="titles"><b id="lbTitle"></b><small id="lbSub"></small></div>' +
        '<div class="tools">' +
        '<button type="button" class="tool-btn" id="lbPrev" aria-label="前へ">◀</button>' +
        '<button type="button" class="tool-btn" id="lbNext" aria-label="次へ">▶</button>' +
        '<button type="button" class="tool-btn close" id="lbClose" aria-label="閉じる">✕</button>' +
        "</div></div>" +
        '<div class="lb-stage"><img id="lbImg" alt=""></div>' +
        '<div class="lb-cap" id="lbCap"></div>';
      document.body.appendChild(modal);
      $("#lbClose", modal).addEventListener("click", close);
      $("#lbPrev", modal).addEventListener("click", function () { show(idx - 1); });
      $("#lbNext", modal).addEventListener("click", function () { show(idx + 1); });
      modal.addEventListener("click", function (e) { if (e.target === modal || e.target.classList.contains("lb-stage")) close(); });
      document.addEventListener("keydown", function (e) {
        if (!modal.classList.contains("open")) return;
        if (e.key === "Escape") close();
        if (e.key === "ArrowLeft") show(idx - 1);
        if (e.key === "ArrowRight") show(idx + 1);
      });
    }
    function show(i) {
      var n = D.gallery.length;
      idx = (i + n) % n;
      var g = D.gallery[idx];
      $("#lbImg", modal).src = g.img;
      $("#lbImg", modal).alt = g.title;
      $("#lbTitle", modal).textContent = g.title;
      $("#lbSub", modal).textContent = (idx + 1) + " / " + n;
      $("#lbCap", modal).innerHTML = "<b>" + esc(g.title) + "</b>" + esc(g.caption);
    }
    function close() { modal.classList.remove("open"); document.body.style.overflow = ""; }
    return {
      open: function (i) {
        if (!modal) build();
        show(i);
        modal.classList.add("open");
        document.body.style.overflow = "hidden";
      },
    };
  })();

  /* ================= 図面ディープズームビューア ================= */
  var Viewer = (function () {
    var modal, stage, img, loader, foot;
    var sheetIdx = -1;
    var customItem = null;
    var state = { s: 1, tx: 0, ty: 0, s0: 1 };
    var pointers = new Map();
    var pinchLast = null;

    function build() {
      modal = document.createElement("div");
      modal.className = "modal";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.innerHTML =
        '<div class="modal-head"><div class="titles"><b id="vTitle"></b><small id="vSub"></small></div>' +
        '<div class="tools">' +
        '<button type="button" class="tool-btn" id="vOut" aria-label="縮小">−</button>' +
        '<button type="button" class="tool-btn wide" id="vPct" aria-label="倍率リセット">100%</button>' +
        '<button type="button" class="tool-btn" id="vIn" aria-label="拡大">＋</button>' +
        '<button type="button" class="tool-btn wide" id="vFit">フィット</button>' +
        '<button type="button" class="tool-btn close" id="vClose" aria-label="閉じる">✕</button>' +
        "</div></div>" +
        '<div class="v-stage" id="vStage"><div class="loader">読み込み中…</div><img id="vImg" alt="図面"></div>' +
        '<div class="modal-foot" id="vFoot"></div>';
      document.body.appendChild(modal);
      stage = $("#vStage", modal);
      img = $("#vImg", modal);
      loader = $(".loader", stage);
      foot = $("#vFoot", modal);

      foot.addEventListener("click", function (e) {
        var pill = e.target.closest(".sheet-pill");
        if (pill) showSheet(parseInt(pill.dataset.i, 10));
      });

      $("#vClose", modal).addEventListener("click", close);
      $("#vIn", modal).addEventListener("click", function () { zoomCenter(1.3); });
      $("#vOut", modal).addEventListener("click", function () { zoomCenter(1 / 1.3); });
      $("#vPct", modal).addEventListener("click", function () { setScaleRel(1); });
      $("#vFit", modal).addEventListener("click", fit);

      img.addEventListener("load", onImgLoad);
      img.addEventListener("error", function () { loader.textContent = "画像を読み込めませんでした"; });

      stage.addEventListener("wheel", onWheel, { passive: false });
      stage.addEventListener("dblclick", function (e) {
        var r = stage.getBoundingClientRect();
        zoomAt(e.clientX - r.left, e.clientY - r.top, 1.8);
      });
      stage.addEventListener("pointerdown", onPointerDown);
      stage.addEventListener("pointermove", onPointerMove);
      stage.addEventListener("pointerup", onPointerUp);
      stage.addEventListener("pointercancel", onPointerUp);
      stage.addEventListener("pointerleave", onPointerUp);

      document.addEventListener("keydown", function (e) {
        if (!modal.classList.contains("open")) return;
        if (e.key === "Escape") close();
        if (e.key === "+" || e.key === "=") zoomCenter(1.25);
        if (e.key === "-") zoomCenter(1 / 1.25);
        if (e.key === "0") fit();
        if (e.key === "ArrowLeft" && sheetIdx >= 0) showSheet(sheetIdx - 1);
        if (e.key === "ArrowRight" && sheetIdx >= 0) showSheet(sheetIdx + 1);
      });
      window.addEventListener("resize", function () {
        if (modal.classList.contains("open")) fit();
      });
    }

    function onImgLoad() {
      loader.style.display = "none";
      img.style.display = "block";
      fit();
    }

    function items() {
      return customItem ? [customItem].concat(D.sheets) : D.sheets;
    }

    function showSheet(i) {
      var list = items();
      var n = list.length;
      if (customItem && sheetIdx === -1) { /* custom first */ }
      sheetIdx = ((i % n) + n) % n;
      var it = list[sheetIdx];
      loader.style.display = "flex";
      loader.textContent = "読み込み中…";
      img.style.display = "none";
      img.src = it.img;
      img.alt = it.title;
      $("#vTitle", modal).textContent = it.title;
      $("#vSub", modal).textContent = it.sub || "";
      renderFoot();
    }

    function renderFoot() {
      var list = items();
      foot.innerHTML = list
        .map(function (it, i) {
          return '<button type="button" class="sheet-pill' + (i === sheetIdx ? " on" : "") + '" data-i="' + i + '">' + esc(it.title) + "</button>";
        })
        .join("");
    }

    function apply() {
      img.style.transform = "translate(" + state.tx + "px," + state.ty + "px) scale(" + state.s + ")";
      var pct = Math.round((state.s / state.s0) * 100);
      var btn = $("#vPct", modal);
      if (btn) btn.textContent = pct + "%";
    }

    function fit() {
      var iw = img.naturalWidth, ih = img.naturalHeight;
      if (!iw || !ih) return;
      var cw = stage.clientWidth, ch = stage.clientHeight;
      var s = Math.min(cw / iw, ch / ih);
      state.s0 = s;
      state.s = s;
      state.tx = (cw - iw * s) / 2;
      state.ty = (ch - ih * s) / 2;
      apply();
    }

    function setScaleRel(ratio) {
      // 相対倍率(フィット=1)で指定倍率へ
      var target = state.s0 * ratio;
      var cw = stage.clientWidth, ch = stage.clientHeight;
      zoomAt(cw / 2, ch / 2, target / state.s);
    }

    function clampScale(s) {
      var min = state.s0 * 0.5, max = state.s0 * 14;
      return Math.max(min, Math.min(max, s));
    }

    function zoomAt(cx, cy, factor) {
      var s2 = clampScale(state.s * factor);
      var k = s2 / state.s;
      state.tx = cx - (cx - state.tx) * k;
      state.ty = cy - (cy - state.ty) * k;
      state.s = s2;
      apply();
    }

    function zoomCenter(factor) {
      var cw = stage.clientWidth, ch = stage.clientHeight;
      zoomAt(cw / 2, ch / 2, factor);
    }

    function onWheel(e) {
      e.preventDefault();
      var r = stage.getBoundingClientRect();
      var factor = e.deltaY < 0 ? 1.16 : 1 / 1.16;
      zoomAt(e.clientX - r.left, e.clientY - r.top, factor);
    }

    function onPointerDown(e) {
      if (e.target.closest(".loader")) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      stage.setPointerCapture(e.pointerId);
      if (pointers.size === 2) {
        var pts = Array.from(pointers.values());
        pinchLast = {
          d: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
          mx: (pts[0].x + pts[1].x) / 2,
          my: (pts[0].y + pts[1].y) / 2,
        };
      }
      e.preventDefault();
    }

    function onPointerMove(e) {
      if (!pointers.has(e.pointerId)) return;
      var prev = pointers.get(e.pointerId);
      var cur = { x: e.clientX, y: e.clientY };
      pointers.set(e.pointerId, cur);
      if (pointers.size === 1) {
        var rect = stage.getBoundingClientRect();
        state.tx += cur.x - prev.x;
        state.ty += cur.y - prev.y;
        apply();
      } else if (pointers.size === 2 && pinchLast) {
        var pts = Array.from(pointers.values());
        var d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        var mx = (pts[0].x + pts[1].x) / 2, my = (pts[0].y + pts[1].y) / 2;
        var rect2 = stage.getBoundingClientRect();
        if (pinchLast.d > 0) {
          zoomAt(pinchLast.mx - rect2.left, pinchLast.my - rect2.top, d / pinchLast.d);
        }
        state.tx += mx - pinchLast.mx;
        state.ty += my - pinchLast.my;
        apply();
        pinchLast = { d: d, mx: mx, my: my };
      }
    }

    function onPointerUp(e) {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchLast = null;
    }

    function close() {
      modal.classList.remove("open");
      document.body.style.overflow = "";
      sheetIdx = -1;
      customItem = null;
    }

    return {
      openSheet: function (i) {
        if (!modal) build();
        customItem = null;
        modal.classList.add("open");
        document.body.style.overflow = "hidden";
        showSheet(i);
      },
      open: function (imgSrc, title, sub) {
        if (!modal) build();
        customItem = { id: "custom", title: title, sub: sub || "", img: imgSrc };
        modal.classList.add("open");
        document.body.style.overflow = "hidden";
        showSheet(0);
      },
    };
  })();

  function renderSheets() {
    var host = $("#sheetGrid");
    if (!host) return;
    host.innerHTML = D.sheets
      .map(function (s, i) {
        var thumb = s.img.replace("img/sheets/", "img/sheets/thumbs/");
        return (
          '<button type="button" class="sheet-card" data-i="' + i + '">' +
          '<span class="im"><img src="' + thumb + '" alt="' + esc(s.title) + '" loading="lazy"></span>' +
          '<span class="t"><b>' + esc(s.title) + "</b><small>" + esc(s.sub) + "</small></span></button>"
        );
      })
      .join("");
    host.addEventListener("click", function (e) {
      var b = e.target.closest(".sheet-card");
      if (b) Viewer.openSheet(parseInt(b.dataset.i, 10));
    });
  }

  /* ================= 出典 ================= */
  function renderSources() {
    var pdfHost = $("#srcPdfs");
    if (pdfHost) {
      pdfHost.innerHTML = D.sources.pdfs
        .map(function (p) {
          return (
            '<article class="src-card"><span class="file">PDF資料</span>' +
            "<h3>" + esc(p.title) + "</h3>" +
            "<p>" + esc(p.desc) + "</p>" +
            '<span class="meta">' + esc(p.size) + "</span>" +
            '<a class="btn btn-primary" style="align-self:flex-start;margin-top:6px" href="' + p.file + '" download>📄 PDFを開く</a>' +
            "</article>"
          );
        })
        .join("");
    }
    var webHost = $("#srcLinks");
    if (webHost) {
      webHost.innerHTML = D.sources.web
        .map(function (w) {
          return '<li><a href="' + w.url + '" target="_blank" rel="noopener">🔗 ' + esc(w.title) + "</a></li>";
        })
        .join("");
    }
  }

  /* ================= 初期化 ================= */
  function init() {
    renderMap();
    renderFloorTabs();
    showFloor("1f");
    renderAreaTable();
    renderGauges();
    renderParking();
    renderTimeline();
    renderPhases();
    renderGallery();
    renderSheets();
    renderSources();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
