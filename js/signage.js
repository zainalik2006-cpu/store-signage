/* ============================================================
   SIGNAGE ENGINE — you should not need to edit this file.
   Fetches the Google Sheet CSV, filters items for this TV,
   renders them, and auto-refreshes without reloading the page.
   ============================================================ */
(function () {
  "use strict";

  /* ================= PURE HELPERS (no browser needed) ================= */

  /* ---------- CSV parsing (handles quoted fields with commas) ---------- */
  function parseCSV(text) {
    const rows = [];
    let row = [], field = "", inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else field += c;
      } else if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); field = "";
        rows.push(row); row = [];
      } else field += c;
    }
    if (field !== "" || row.length) { row.push(field); rows.push(row); }
    return rows;
  }

  /* ---------- Turn raw rows into item objects ---------- */
  function toItems(rows) {
    if (!rows.length) return [];
    const header = rows[0].map((h) => h.trim().toLowerCase());
    const iName = header.indexOf("item name"), iCat = header.indexOf("category"),
          iPrice = header.indexOf("price"), iUnit = header.indexOf("unit"),
          iActive = header.indexOf("active");
    if (iName < 0 || iCat < 0 || iPrice < 0) {
      throw new Error("Sheet is missing required columns (Item Name, Category, Price).");
    }
    const items = [];
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const name = (row[iName] || "").trim();
      if (!name) continue;
      // Only show rows where Active is TRUE / Yes / Y / 1
      const active = (iActive < 0 ? "true" : (row[iActive] || "")).trim().toLowerCase();
      if (["true", "yes", "y", "1"].indexOf(active) < 0) continue;
      const price = parsePrice(row[iPrice]);
      if (price === null) continue; // no price → item is hidden
      items.push({
        name: name,
        category: (row[iCat] || "").trim(),
        price: price,
        unit: ((iUnit < 0 ? "" : row[iUnit]) || "lb").trim().toLowerCase() || "lb",
      });
    }
    return items;
  }

  function parsePrice(raw) {
    const cleaned = String(raw || "").replace(/[$,\s]/g, "").replace(/\/.*$/, "");
    if (!cleaned || /^n\/?a$/i.test(cleaned)) return null;
    const n = parseFloat(cleaned);
    return isFinite(n) && n > 0 ? n : null;
  }

  function formatPrice(item) {
    const dollars = "$" + item.price.toFixed(2);
    if (item.unit === "lb") return dollars + "/lb";
    if (item.unit === "ea") return dollars + " ea";
    return dollars + "/" + item.unit; // e.g. $44.99/box
  }

  function escapeHTML(s) {
    return s.replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  /* Group items by category, preserving configured order; drop empty groups */
  function groupItems(items, categories) {
    return categories
      .map((cat) => ({ cat: cat, items: items.filter((it) => it.category === cat) }))
      .filter((g) => g.items.length > 0);
  }

  /* Build screen columns from the page config: each entry in
     page.columns is a list of categories stacked in that column. */
  function buildColumns(items, columnsConfig) {
    return columnsConfig
      .map((cats) => groupItems(items, cats))
      .filter((col) => col.length > 0); // drop columns with nothing to show
  }

  /* Turn a Google Drive share link into a direct image URL;
     pass any other URL through unchanged. */
  function convertImageURL(url) {
    if (!url) return "";
    const m =
      url.match(/drive\.google\.com\/file\/d\/([\w-]+)/) ||
      url.match(/drive\.google\.com\/(?:open|uc)\?.*?id=([\w-]+)/);
    if (m) return "https://drive.google.com/thumbnail?id=" + m[1] + "&sz=w1920";
    return url;
  }

  /* Parse the "Slides" sheet tab into promo slide objects for this TV.
     Expected columns: Title | Text | Image Link | Seconds | Screens | Active */
  function toSlides(rows, pageKey) {
    if (!rows.length) return [];
    const h = rows[0].map((x) => x.trim().toLowerCase());
    const idx = (names) => {
      for (const n of names) { const i = h.indexOf(n); if (i >= 0) return i; }
      return -1;
    };
    const iTitle = idx(["title"]), iText = idx(["text", "subtitle"]),
          iImg = idx(["image link", "image", "image url", "photo"]),
          iSec = idx(["seconds", "duration"]), iScr = idx(["screens", "screen", "tv"]),
          iAct = idx(["active"]);
    const out = [];
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const title = ((iTitle >= 0 && row[iTitle]) || "").trim();
      const image = convertImageURL(((iImg >= 0 && row[iImg]) || "").trim());
      if (!title && !image) continue; // blank row
      if (iAct >= 0) {
        const act = ((row[iAct]) || "").trim().toLowerCase();
        if (["true", "yes", "y", "1"].indexOf(act) < 0) continue;
      }
      // Screens: "chicken", "meat", "both"/"all"/blank = every TV
      const scr = ((iScr >= 0 && row[iScr]) || "").trim().toLowerCase();
      if (scr && ["both", "all"].indexOf(scr) < 0 && scr.indexOf(pageKey) < 0) continue;
      let sec = parseFloat((iSec >= 0 && row[iSec]) || "");
      if (!isFinite(sec) || sec <= 0) sec = 10;
      out.push({
        title: title,
        text: ((iText >= 0 && row[iText]) || "").trim(),
        image: image,
        seconds: Math.min(Math.max(sec, 3), 120),
      });
    }
    return out;
  }

  // Expose pure functions for automated tests (Node); skip browser boot there.
  if (typeof module !== "undefined" && typeof document === "undefined") {
    module.exports = { parseCSV, toItems, parsePrice, formatPrice, groupItems, buildColumns, toSlides, convertImageURL };
    return;
  }

  /* ======================= BROWSER-ONLY CODE ======================= */

  const PAGE_KEY = document.body.dataset.page; // "chicken" or "meat"
  const PAGE = PAGES[PAGE_KEY];
  const DEMO_MODE = SHEET_CSV_URL.indexOf("PASTE_YOUR") === 0;
  const DATA_URL = DEMO_MODE ? "sheet-data.csv" : SHEET_CSV_URL;

  const els = {
    board: document.getElementById("board"),
    loading: document.getElementById("loading"),
    errorBar: document.getElementById("error-bar"),
    demoBar: document.getElementById("demo-bar"),
    updated: document.getElementById("last-updated"),
  };

  let lastGoodCSV = null; // keep showing last good data if a fetch fails

  function render(items) {
    const cols = buildColumns(items, PAGE.columns);
    let html = "";
    for (const colGroups of cols) {
      html += '<div class="board-col">';
      for (const g of colGroups) {
        const label = CATEGORY_LABELS[g.cat] || g.cat;
        html += '<section class="category">';
        html += '<h2 class="category-title">' + escapeHTML(label) + "</h2>";
        html += '<ul class="items">';
        for (const it of g.items) {
          html +=
            '<li class="item"><span class="item-name">' + escapeHTML(it.name) +
            '</span><span class="item-dots"></span><span class="item-price">' +
            escapeHTML(formatPrice(it)) + "</span></li>";
        }
        html += "</ul></section>";
      }
      html += "</div>";
    }
    els.board.innerHTML =
      html || '<p class="empty">No items to display. Check the Category and Active columns in the sheet.</p>';

    fitToScreen();
    els.loading.classList.add("hidden");
    els.updated.textContent =
      "Updated " + new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  /* ---------- Auto-fit: shrink content until everything fits ---------- */
  function fitToScreen() {
    const board = els.board;
    let scale = 1.0;
    board.style.setProperty("--scale", scale);
    let guard = 40; // safety: never loop forever
    while (
      guard-- > 0 && scale > 0.45 &&
      (board.scrollHeight > board.clientHeight || board.scrollWidth > board.clientWidth)
    ) {
      scale -= 0.025;
      board.style.setProperty("--scale", scale.toFixed(3));
    }
  }

  /* ---------- Fetch loop ---------- */
  async function refresh() {
    try {
      // Cache-buster so Google/browsers never serve a stale copy
      const sep = DATA_URL.indexOf("?") >= 0 ? "&" : "?";
      const res = await fetch(DATA_URL + sep + "t=" + Date.now(), { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const text = await res.text();
      els.errorBar.classList.add("hidden");
      if (text === lastGoodCSV) return; // nothing changed — no re-render
      const items = toItems(parseCSV(text));
      lastGoodCSV = text;
      render(items);
    } catch (err) {
      // Keep showing the last good prices; surface a small status bar
      console.error("Signage refresh failed:", err);
      els.errorBar.textContent =
        lastGoodCSV === null
          ? "Could not load the price list — check the sheet link in js/config.js. Retrying…"
          : "Connection issue — showing last known prices. Retrying…";
      if (lastGoodCSV === null) els.loading.classList.add("hidden");
      els.errorBar.classList.remove("hidden");
    }
  }

  /* ---------- Promo slides (optional rotation) ---------- */
  // Fallbacks so an older config.js still works without slides
  const SLIDES_URL = (typeof SLIDES_CSV_URL !== "undefined") ? SLIDES_CSV_URL : "";
  const PRICES_SECS = (typeof PRICES_SECONDS !== "undefined") ? PRICES_SECONDS : 45;
  const SLIDES_ENABLED = SLIDES_URL && SLIDES_URL.indexOf("PASTE_") !== 0;

  let slides = [];
  const overlay = document.createElement("div");
  overlay.id = "slide-overlay";
  overlay.innerHTML =
    '<div class="slide-bg"></div><div class="slide-shade"></div>' +
    '<div class="slide-content"><div class="slide-title"></div><div class="slide-text"></div></div>' +
    '<div class="slide-brand">halal4allshop.com</div>';
  document.body.appendChild(overlay);

  async function refreshSlides() {
    try {
      const sep = SLIDES_URL.indexOf("?") >= 0 ? "&" : "?";
      const res = await fetch(SLIDES_URL + sep + "t=" + Date.now(), { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      slides = toSlides(parseCSV(await res.text()), PAGE_KEY);
      // Preload images so slides appear instantly
      slides.forEach((s) => { if (s.image) { const im = new Image(); im.src = s.image; } });
    } catch (err) {
      console.error("Slides refresh failed:", err); // keep last good slides
    }
  }

  function renderSlide(s) {
    overlay.querySelector(".slide-bg").style.backgroundImage = s.image ? 'url("' + s.image + '")' : "none";
    overlay.querySelector(".slide-title").textContent = s.title;
    overlay.querySelector(".slide-text").textContent = s.text;
    overlay.classList.toggle("no-image", !s.image);
  }

  /* Rotation loop: prices for PRICES_SECS → each slide → prices → … */
  let rotTimer = null;
  function rotate(idx) {
    clearTimeout(rotTimer);
    if (idx >= slides.length) idx = -1; // also covers "no slides yet"
    if (idx < 0) {
      overlay.classList.remove("show"); // back to the price board
      rotTimer = setTimeout(() => rotate(0), Math.max(10, PRICES_SECS) * 1000);
    } else {
      renderSlide(slides[idx]);
      overlay.classList.add("show");
      rotTimer = setTimeout(() => rotate(idx + 1), slides[idx].seconds * 1000);
    }
  }

  if (SLIDES_ENABLED) {
    refreshSlides();
    setInterval(refreshSlides, POLL_INTERVAL_MS);
    rotate(-1);
  }

  /* ---------- Live clock (footer) ---------- */
  const clockEl = document.getElementById("clock");
  function tickClock() {
    if (clockEl) {
      clockEl.textContent = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }
  }
  tickClock();
  setInterval(tickClock, 1000);

  /* ---------- Boot ---------- */
  document.getElementById("page-heading").textContent = PAGE.heading;
  document.title = PAGE.heading;
  if (DEMO_MODE) els.demoBar.classList.remove("hidden");

  refresh();
  setInterval(refresh, POLL_INTERVAL_MS);
  window.addEventListener("resize", () => {
    if (lastGoodCSV !== null) render(toItems(parseCSV(lastGoodCSV)));
  });
})();
