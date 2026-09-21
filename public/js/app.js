
/* ===========================
   ICON SET (inline SVG, stroke)
   =========================== */
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/>',
  building:
    '<path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/><path d="M16 9h3a1 1 0 0 1 1 1v11"/><path d="M8 8h2M8 12h2M8 16h2M2 21h20"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
  mail: '<path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/><path d="m3 7 9 6 9-6"/>',
  shield:
    '<path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/><path d="m9 12 2 2 4-4"/>',
  users:
    '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16.5 4.5a3.5 3.5 0 0 1 0 6.6"/><path d="M18.5 20a6.5 6.5 0 0 0-3.2-5.6"/>',
  tag: '<path d="M20 12 12 20H4v-8l8-8z"/><path d="m7 7 .01 0"/>',
  pin: '<path d="M12 22s7-5.5 7-12a7 7 0 1 0-14 0c0 6.5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  bed: '<path d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7"/><path d="M3 18h18"/><path d="M6 13h.01M10 13h.01M15 11v0"/>',
  bath:
    '<path d="M4 12h16v1a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z"/><path d="M7 12V6a2 2 0 0 1 4 0"/><path d="M8 20h8"/>',
  phone:
    '<path d="M5 3h4l2 5-2.5 1.5a12 12 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
  whatsapp:
    '<path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9z"/><path d="M9 10.2h.01M12.5 10.2h.01M15.5 12.6c-.4 1-1.3 1.7-2.5 2.1-1.4.5-2.8.2-4.2-.8"/>',
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  logout:
    '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  check: '<path d="m4 12.5 5 5L20 6.5"/>',
  userPlus:
    '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M19 8v6M16 11h6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5h.1a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1z"/>',
  key: '<circle cx="15" cy="9" r="6"/><path d="m2 21 8-8"/><path d="m18 12 3 3"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  help:
    '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1.1 1-1.1 1.7v.5"/><path d="M12 17h.01"/>',
  user:
    '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  compass:
    '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  eye: '<path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  heart:
    '<path d="M12 20.5 4.5 13a4.5 4.5 0 0 1 6.4-6.4l1.1 1.1 1.1-1.1a4.5 4.5 0 0 1 6.4 6.4z"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  bookmark: '<path d="M6 3h12v18l-6-4.5L6 21z"/>',
  briefcase:
    '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/>',
  send: '<path d="m21 3-9 9"/><path d="M21 3 13 21l-2-8-8-2z"/>',
  homePlus:
    '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h6.5"/><path d="M17 13v6M14 16h6"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
};
function icon(name, size = 16) {
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.info}</svg>`;
}
function navIconFor(a) {
  const href = a.getAttribute("href") || "";
  const text = (a.textContent || "").toLowerCase();
  if (text.includes("property") || href.includes("properties")) return "building";
  if (text.includes("about")) return "info";
  if (text.includes("contact")) return "mail";
  if (text.includes("login") || text.includes("log in")) return "user";
  if (text.includes("account") || text.includes("register") || text.includes("create")) return "userPlus";
  if (href.includes("index") || href === "#" || href === "") return "home";
  return "arrow";
}

/* ===========================
   CONFIG & HELPERS
   =========================== */
function defaultApiBase() {
  const local = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  if (location.protocol === "file:" || (local && location.port !== "5000"))
    return "http://localhost:5000/api";
  return "/api";
}
const API = window.API_BASE || defaultApiBase();
const API_ORIGIN = API.replace(/\/api\/?$/, "");
const tokenKey = "rentbauchi_token";
const sessionUserKey = "rentbauchi_user";
const $ = (s) => document.querySelector(s);
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[m],
  );
function token() {
  return localStorage.getItem(tokenKey);
}
function user() {
  try {
    return JSON.parse(localStorage.getItem(sessionUserKey) || "null");
  } catch {
    return null;
  }
}
function setSession(data) {
  localStorage.setItem(tokenKey, data.token);
  localStorage.setItem(sessionUserKey, JSON.stringify(data.user));
}
function logout() {
  localStorage.removeItem(tokenKey);
  localStorage.removeItem(sessionUserKey);
  location.href = "/login.html";
}
async function api(path, options = {}) {
  const headers = options.headers || {};
  if (!(options.body instanceof FormData))
    headers["Content-Type"] = "application/json";
  if (token()) headers.Authorization = "Bearer " + token();
  const r = await fetch(API + path, { ...options, headers });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.message || "Request failed");
  return data;
}
function money(n) {
  return "₦" + Number(n || 0).toLocaleString("en-NG");
}

/* ===========================
   TOAST NOTIFICATIONS
   =========================== */
function toast(message, type = "success", duration = 3200) {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  const el = document.createElement("div");
  el.className = "toast toast-" + type;
  el.innerHTML =
    icon(type === "error" ? "help" : type === "warning" ? "clock" : "check", 18) +
    "<span>" + esc(message) + "</span>";
  el.addEventListener("click", dismiss);
  container.appendChild(el);
  function dismiss() {
    el.classList.add("toast-leaving");
    setTimeout(() => el.remove(), 260);
  }
  setTimeout(dismiss, duration);
  return el;
}

/* ===========================
   CONFIRM DIALOG
   =========================== */
function confirmDialog(message) {
  return new Promise((resolve) => {
    const o = document.createElement("div");
    o.className = "overlay";
    o.style.padding = "20px";
    o.innerHTML = `<div class="form-card" style="max-width:420px;width:100%;text-align:center">
      <div style="margin-bottom:18px">${icon("help", 36)}</div>
      <p style="margin:0 0 22px;font-size:15px;font-weight:600;line-height:1.5">${esc(message)}</p>
      <div style="display:flex;gap:10px;justify-content:center">
        <button class="btn btn-light" data-action="cancel">Cancel</button>
        <button class="btn btn-danger" data-action="confirm">Confirm</button>
      </div>
    </div>`;
    o.addEventListener("click", (e) => {
      if (e.target === o) { o.remove(); resolve(false); }
    });
    o.querySelector("[data-action='cancel']").addEventListener("click", () => { o.remove(); resolve(false); });
    o.querySelector("[data-action='confirm']").addEventListener("click", () => { o.remove(); resolve(true); });
    document.addEventListener("keydown", function escKey(e) {
      if (e.key === "Escape") { o.remove(); resolve(false); document.removeEventListener("keydown", escKey); }
    });
    document.body.appendChild(o);
  });
}

/* Button loading state */
function setLoading(btn, loading, loadingText) {
  if (!btn) return;
  if (loading) {
    if (!btn.dataset.loadingText) btn.dataset.loadingText = btn.textContent;
    btn.disabled = true;
    btn.classList.add("btn-loading");
    btn.textContent = loadingText || "";
  } else {
    btn.disabled = false;
    btn.classList.remove("btn-loading");
    if (btn.dataset.loadingText) btn.textContent = btn.dataset.loadingText;
  }
}

/* ===========================
   SCROLL ANIMATION SYSTEM
   =========================== */
function reveal() {
  const selectors = [".reveal", ".reveal-left", ".reveal-right", ".reveal-scale"];
  const els = document.querySelectorAll(selectors.join(","));
  const ob = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("show");
          ob.unobserve(e.target);
        }
      });
    },
    { threshold: 0.06, rootMargin: "0px 0px -40px 0px" },
  );
  els.forEach((el) => ob.observe(el));

  // Stagger children groups
  const staggerGroups = document.querySelectorAll(".stagger-children");
  const sob = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("show");
          sob.unobserve(e.target);
        }
      });
    },
    { threshold: 0.08 },
  );
  staggerGroups.forEach((g) => sob.observe(g));

  // Add reveal to dynamically-created property cards
  document.querySelectorAll("#publicProperties .reveal, #results .reveal, #savedBox .reveal").forEach((el) => {
    ob.observe(el);
  });
}

/* Animated counter for stats */
function animateCounters() {
  const counters = document.querySelectorAll("[data-count]");
  if (!counters.length) return;
  const ob = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseInt(el.dataset.count, 10) || 0;
        ob.unobserve(el);
        if (target <= 0) return;
        const duration = 1200;
        const start = performance.now();
        function tick(now) {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.round(target * eased).toLocaleString();
          if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    },
    { threshold: 0.5 },
  );
  counters.forEach((c) => ob.observe(c));
}

/* Nav scroll shadow */
function wireNavScroll() {
  const nav = document.querySelector(".nav");
  if (!nav) return;
  const onScroll = () => {
    nav.classList.toggle("scrolled", window.scrollY > 10);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

/* Mobile menu backdrop */
function wireMobileMenu() {
  const sidebar = document.querySelector(".sidebar");
  if (sidebar) {
    const backdrop = document.createElement("div");
    backdrop.className = "overlay-backdrop";
    document.body.appendChild(backdrop);
    const close = () => {
      sidebar.classList.remove("open");
      backdrop.classList.remove("show");
    };
    backdrop.addEventListener("click", close);
    document.querySelectorAll(".side-nav a, .side-nav button").forEach((item) => {
      item.addEventListener("click", () => {
        if (window.innerWidth <= 900) close();
      });
    });
  }
}

/* Public mobile nav toggle */
function wireMobileNav() {
  const toggle = document.querySelector(".mobile-nav-toggle");
  if (!toggle) return;
  let menu = document.querySelector(".mobile-nav");
  if (!menu) {
    menu = document.createElement("div");
    menu.className = "mobile-nav";
    document.body.appendChild(menu);
  }
  const links = document.querySelectorAll(".nav-links a");
  const actions = document.querySelectorAll(".nav-actions a");
  const seen = new Set();
  menu.innerHTML = "";
  const addLink = (a) => {
    const href = a.getAttribute("href") || "";
    if (seen.has(href)) return;
    seen.add(href);
    const clone = document.createElement("a");
    clone.href = href;
    clone.innerHTML = navIconFor(a) + "<span>" + esc(a.textContent) + "</span>";
    if (a.classList.contains("btn")) {
      clone.className = "btn " + a.className.replace(/btn\s+/, "").trim();
    }
    menu.appendChild(clone);
  };
  links.forEach(addLink);
  actions.forEach(addLink);
  const close = () => menu.classList.remove("show");
  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.classList.toggle("show");
  });
  menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", close));
  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target) && !toggle.contains(e.target))
      menu.classList.remove("show");
  });
}

function photoUrl(url) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  if (url.startsWith("/assets/")) return url;
  return API_ORIGIN + url;
}
function requireRole(role) {
  if (!token() || !user()) {
    location.href = "/login.html";
    return false;
  }
  if (user().role !== role) {
    location.href =
      user().role === "admin"
        ? "/admin/"
        : user().role === "agent"
          ? "/agent-dashboard.html"
          : "/renter-dashboard.html";
    return false;
  }
  return true;
}
function card(p, logged = false) {
  const img = photoUrl(p.media?.[0]?.url) || "/assets/images/hero-house.jpg";
  return `<article class="property-card reveal">
    <div class="property-photo" style="background-image:url('${esc(img)}')">
      <span class="tag card-tag ${p.verified ? "tag-accent" : "tag-secondary"}">${icon(p.verified ? "shield" : "eye", 13)} ${esc(p.verified ? "VERIFIED" : "AVAILABLE")}</span>
    </div>
    <div class="property-body">
      <div class="meta">${esc(p.type)}${p.subtype ? " · " + esc(p.subtype) : ""}</div>
      <h3>${esc(p.title)}</h3>
      <div class="meta">${icon("pin", 13)}${esc(p.location)}</div>
      <div class="property-features">
        <span>${icon("bed", 14)}${p.bedrooms || 0} beds</span>
        <span>${icon("bath", 14)}${p.bathrooms || 0} baths</span>
        <span>${icon("check", 14)}${esc(p.type)}</span>
      </div>
      <div class="price-row">
        <div class="price">${money(p.annualRent)} <small>/ year</small></div>
      </div>
      <div class="card-footer">
        <button class="btn btn-primary btn-sm" onclick="openProperty('${p.id}',${logged})">${icon("eye", 13)} View</button>
        ${logged ? `<button class="btn btn-light btn-sm" onclick="window.saveProperty && saveProperty('${p.id}')">${icon("bookmark", 13)} Save</button>` : ""}
      </div>
    </div></article>`;
}
const browseState = { page: 1, pages: 1, q: "", sort: "", type: "" };
async function loadPublicProperties(reset = true) {
  const box = $("#publicProperties");
  if (!box) return;
  if (reset) {
    browseState.page = 1;
    browseState.q = ($("#propertySearch") && $("#propertySearch").value) || "";
    browseState.sort = ($("#sort") && $("#sort").value) || "";
    browseState.type = ($("#typeFilter") && $("#typeFilter").value) || "";
  }
  const params = new URLSearchParams({
    q: browseState.q,
    sort: browseState.sort,
    type: browseState.type,
    page: browseState.page,
    limit: 6,
  });
  try {
    const d = await api("/properties?" + params.toString());
    browseState.pages = d.pages || 1;
    if (reset) {
      box.classList.add("stagger-children");
      box.classList.remove("show");
      box.innerHTML = d.properties.length
        ? d.properties.map((p) => card(p, false)).join("")
        : '<div class="empty">No available properties yet.</div>';
    } else {
      box.insertAdjacentHTML(
        "beforeend",
        d.properties.map((p) => card(p, false)).join(""),
      );
    }
    requestAnimationFrame(() => box.classList.add("show"));
    reveal();
    const more = $("#loadMore");
    if (more) {
      const hasMore = browseState.page < browseState.pages;
      more.classList.toggle("hide", !hasMore);
      more.hidden = !hasMore;
    }
    const count = $("#resultCount");
    if (count) count.textContent = d.total + " property" + (d.total === 1 ? "" : "s");
  } catch (e) {
    if (reset)
      box.innerHTML = `<div class="error" style="display:block">${esc(e.message)}</div>`;
  }
}
function wireBrowseControls() {
  const more = $("#loadMore");
  if (more)
    more.addEventListener("click", () => {
      browseState.page += 1;
      loadPublicProperties(false);
    });
  const sortEl = $("#sort");
  if (sortEl) sortEl.addEventListener("change", () => loadPublicProperties(true));
  const searchEl = $("#propertySearch");
  if (searchEl) {
    let t;
    searchEl.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => loadPublicProperties(true), 350);
    });
  }
}
function openProperty(id, logged) {
  location.href = "/property.html?id=" + encodeURIComponent(id);
}
async function loadPropertyDetail(id) {
  try {
    const d = await api("/properties/" + encodeURIComponent(id));
    return d.property;
  } catch (e) {
    toast(e.message, "error");
    return null;
  }
}
function wireLogout() {
  document.querySelectorAll("[data-logout]").forEach((b) =>
    b.addEventListener("click", logout),
  );
}
/* Newsletter forms (footer) */
function wireNewsletter() {
  document.querySelectorAll(".newsletter").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = form.querySelector("input");
      if (input) input.value = "";
      toast("Subscribed! We'll keep you posted on new listings.");
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  reveal();
  animateCounters();
  wireNavScroll();
  wireMobileMenu();
  wireMobileNav();
  wireLogout();
  wireNewsletter();
  wireBrowseControls();
  loadPublicProperties();
  document
    .querySelectorAll("[data-year]")
    .forEach((el) => (el.textContent = new Date().getFullYear()));
});
