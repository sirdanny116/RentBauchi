function defaultApiBase() {
  const local = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  if (location.protocol === "file:" || (local && location.port !== "5000"))
    return "http://localhost:5000/api";
  return "/api";
}
const API = window.API_BASE || defaultApiBase(),
  API_ORIGIN = API.replace(/\/api\/?$/, ""),
  tokenKey = "rentbauchi_token",
  userKey = "rentbauchi_user";
const $ = (s) => document.querySelector(s),
  esc = (v) =>
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
function tok() {
  return localStorage.getItem(tokenKey);
}
function usr() {
  try {
    return JSON.parse(localStorage.getItem(userKey) || "null");
  } catch {
    return null;
  }
}
function logout() {
  localStorage.removeItem(tokenKey);
  localStorage.removeItem(userKey);
  location.href = "/admin/";
}
async function api(path, o = {}) {
  const h = o.headers || {};
  if (!(o.body instanceof FormData)) h["Content-Type"] = "application/json";
  if (tok()) h.Authorization = "Bearer " + tok();
  const r = await fetch(API + path, { ...o, headers: h });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.message || "Request failed");
  return d;
}
function money(n) {
  return "₦" + Number(n || 0).toLocaleString("en-NG");
}
function toast(message, type = "success", duration = 3200) {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  const el = document.createElement("div");
  el.className = "toast toast-" + type;
  el.textContent = message;
  el.addEventListener("click", dismiss);
  container.appendChild(el);
  function dismiss() {
    el.classList.add("toast-leaving");
    setTimeout(() => el.remove(), 260);
  }
  setTimeout(dismiss, duration);
  return el;
}
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
function photo(u) {
  return !u
    ? "/assets/images/avatar-placeholder.jpg"
    : u.startsWith("http")
      ? u
      : u.startsWith("/assets/")
        ? u
        : API_ORIGIN + u;
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

/* Reveal system */
function reveal() {
  const els = document.querySelectorAll(".reveal, .reveal-left, .reveal-right, .reveal-scale");
  const ob = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("show");
          ob.unobserve(e.target);
        }
      });
    },
    { threshold: 0.1 },
  );
  els.forEach((el) => ob.observe(el));

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
    { threshold: 0.1 },
  );
  staggerGroups.forEach((g) => sob.observe(g));
}

document.addEventListener("DOMContentLoaded", () => {
  reveal();
  animateCounters();
  document.querySelectorAll("[data-logout]").forEach((b) =>
    b.addEventListener("click", logout),
  );
  const sidebar = document.getElementById("sidebar");
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
});
function protect() {
  if (!tok() || !usr() || usr().role !== "admin") {
    location.href = "/admin/";
    return false;
  }
  return true;
}
