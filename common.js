/* ============================================================
   КАЛЬКУЛЯТОР БАЛЛОВ — ОБЩИЙ СКРИПТ
   Подключается на каждой странице (index.html, pm.html и т.д.)
   ============================================================ */

/* ============================================================
   ПРЕСЕТЫ ФОНОВ
   ============================================================ */
const BG_PRESETS = [
  { id: "med-blue", title: "Медицина", css: "linear-gradient(135deg, #0a1f3d 0%, #0d2f4a 40%, #0a1f3d 100%)" },
  { id: "med-soft", title: "Soft", css: "linear-gradient(160deg, #1a2a3a 0%, #0f1e2e 50%, #05111c 100%)" },
  { id: "dots", title: "Точки",
    css: "radial-gradient(circle at 25% 25%, rgba(88,166,255,0.12) 1px, transparent 2px) 0 0 / 24px 24px, " +
         "radial-gradient(circle at 75% 75%, rgba(88,166,255,0.08) 1px, transparent 2px) 12px 12px / 24px 24px, " +
         "linear-gradient(135deg, #0d1117, #0a0e14)" },
  { id: "grid", title: "Сетка",
    css: "linear-gradient(rgba(88,166,255,0.07) 1px, transparent 1px) 0 0 / 40px 40px, " +
         "linear-gradient(90deg, rgba(88,166,255,0.07) 1px, transparent 1px) 0 0 / 40px 40px, " +
         "linear-gradient(160deg, #0a0e14, #101828)" },
  { id: "sunset", title: "Закат", css: "linear-gradient(160deg, #2a1830 0%, #3a1f2a 35%, #1a1428 100%)" },
  { id: "aurora", title: "Aurora",
    css: "radial-gradient(ellipse at 20% 20%, rgba(88,166,255,0.35), transparent 50%), " +
         "radial-gradient(ellipse at 70% 75%, rgba(255,122,184,0.20), transparent 55%), " +
         "linear-gradient(160deg, #05111c, #0d1117)" },
];

/* ============================================================
   ЗАГРУЗЧИК ФОНА
   Ключ в localStorage общий для всех страниц, поэтому фон
   сохраняется при переходах между калькуляторами.
   ============================================================ */
(function() {
  const KEY = "calc_bg_v1";
  const body = document.body;
  const btnMenu    = document.getElementById("bg-menu-btn");
  const menu       = document.getElementById("bg-menu");
  const presetsEl  = document.getElementById("bg-presets");
  const inputFile  = document.getElementById("bg-file");
  const inputColor = document.getElementById("bg-color");
  const btnGrad    = document.getElementById("bg-gradient");
  const btnReset   = document.getElementById("bg-reset");

  if (!btnMenu || !menu) return;

  // Отрисовать пресеты
  if (presetsEl) {
    BG_PRESETS.forEach(p => {
      const el = document.createElement("div");
      el.className = "bg-preset";
      el.title = p.title;
      el.style.background = p.css;
      el.innerHTML = `<div class="bg-preset-title">${p.title}</div>`;
      el.addEventListener("click", () => {
        applyBackground({type: "preset", id: p.id, css: p.css});
        menu.hidden = true;
      });
      presetsEl.appendChild(el);
    });
  }

  // Открытие / закрытие меню
  btnMenu.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.hidden = !menu.hidden;
  });
  document.addEventListener("click", (e) => {
    if (!menu.hidden && !menu.contains(e.target) && e.target !== btnMenu) {
      menu.hidden = true;
    }
  });

  // Применить фон
  function applyBackground(cfg, persist = true) {
    body.classList.remove("has-custom-bg");
    body.style.backgroundColor = "";
    body.style.backgroundImage = "";
    body.style.animation = "";

    if (!cfg || cfg.type === "gradient") {
      if (persist) save({type: "gradient"});
      return;
    }
    if (cfg.type === "color") {
      body.style.backgroundImage = "none";
      body.style.backgroundColor = cfg.value;
      body.style.animation = "none";
      if (persist) save(cfg);
      return;
    }
    if (cfg.type === "preset") {
      body.classList.add("has-custom-bg");
      body.style.backgroundImage = cfg.css;
      if (persist) save(cfg);
      return;
    }
    if (cfg.type === "image") {
      body.classList.add("has-custom-bg");
      body.style.backgroundImage = `url("${cfg.value}")`;
      if (persist) save(cfg);
    }
  }

  function save(cfg) {
    try { localStorage.setItem(KEY, JSON.stringify(cfg)); }
    catch (e) { showToast("Фон не сохранён (файл слишком большой)"); }
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  // Свои картинки
  inputFile.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) showToast("Файл > 4 МБ. Может не поместиться.");
    const reader = new FileReader();
    reader.onload = () => {
      applyBackground({type: "image", value: reader.result});
      menu.hidden = true;
    };
    reader.onerror = () => showToast("Не удалось прочитать файл");
    reader.readAsDataURL(file);
  });

  inputColor.addEventListener("input", (e) => {
    applyBackground({type: "color", value: e.target.value});
  });

  btnGrad.addEventListener("click", () => {
    applyBackground({type: "gradient"});
    menu.hidden = true;
  });
  btnReset.addEventListener("click", () => {
    applyBackground({type: "color", value: "#0d1117"});
    menu.hidden = true;
  });

  // Восстановить сохранённый фон
  const saved = load();
  if (saved) applyBackground(saved, false);
})();

/* ============================================================
   TOAST — всплывающее уведомление
   ============================================================ */
let _toastTimer = null;
function showToast(msg) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove("show"), 2000);
}

/* ============================================================
   АНИМАЦИЯ ЦИФР В ЯЧЕЙКАХ «ИТОГ»
   ============================================================ */
function popIfChanged(el, oldText, newText) {
  if (!el) return;
  if (oldText !== newText) {
    el.textContent = newText;
    el.classList.remove("pop");
    void el.offsetWidth;
    el.classList.add("pop");
  }
}

/* ============================================================
   АНИМАЦИЯ КРУПНОГО ИТОГА
   ============================================================ */
function pulseEl(el) {
  if (!el) return;
  el.classList.remove("pulse");
  void el.offsetWidth;
  el.classList.add("pulse");
}

/* ============================================================
   ШКАЛА ПРОГРЕССА
   Логарифмическая шкала со сегментами:
   0..100 → 0..6.66%
   100..250 → 6.66..16.66%
   250..500 → 16.66..33.33%
   500..1000 → 33.33..66.66%
   1000..1500 → 66.66..100%
   Цвет: красный → оранжевый → жёлтый → зелёный
   ============================================================ */
const RAIL_SEGMENTS = [
  { from: 0,    to: 100,  posFrom: 0,      posTo: 6.66  },
  { from: 100,  to: 250,  posFrom: 6.66,   posTo: 16.66 },
  { from: 250,  to: 500,  posFrom: 16.66,  posTo: 33.33 },
  { from: 500,  to: 1000, posFrom: 33.33,  posTo: 66.66 },
  { from: 1000, to: 1500, posFrom: 66.66,  posTo: 100   },
];

function valueToPercent(total) {
  if (total <= 0) return 0;
  if (total >= 1500) return 100;
  for (const s of RAIL_SEGMENTS) {
    if (total >= s.from && total <= s.to) {
      const t = (total - s.from) / (s.to - s.from);
      return s.posFrom + t * (s.posTo - s.posFrom);
    }
  }
  return 100;
}

function valueToColor(total) {
  const stops = [
    { v: 0,    c: [248, 81, 73] },
    { v: 100,  c: [248, 81, 73] },
    { v: 250,  c: [248, 160, 73] },
    { v: 500,  c: [210, 153, 34] },
    { v: 1000, c: [120, 200, 100] },
    { v: 1500, c: [63, 185, 80] },
  ];
  if (total <= 0) return "rgb(248, 81, 73)";
  if (total >= 1500) return "rgb(63, 185, 80)";
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i], b = stops[i + 1];
    if (total >= a.v && total <= b.v) {
      const t = (total - a.v) / (b.v - a.v);
      const r  = Math.round(a.c[0] + (b.c[0] - a.c[0]) * t);
      const g  = Math.round(a.c[1] + (b.c[1] - a.c[1]) * t);
      const bl = Math.round(a.c[2] + (b.c[2] - a.c[2]) * t);
      return `rgb(${r}, ${g}, ${bl})`;
    }
  }
  return "rgb(63, 185, 80)";
}

function statusText(total) {
  if (total <= 0)   return "Начало";
  if (total < 100)  return "Старт";
  if (total < 250)  return "Норма";
  if (total < 500)  return "Хорошо";
  if (total < 1000) return "Отлично";
  if (total < 1500) return "Супер";
  return "Максимум";
}

/* Обновить шкалу на странице с указанным id-секции */
function updateRail(sectionId, total) {
  const section = document.getElementById(sectionId);
  if (!section) return;
  const rail = section.querySelector(".progress-rail");
  if (!rail) return;

  const valueEl  = rail.querySelector("[data-rail-value]");
  const fillEl   = rail.querySelector("[data-rail-fill]");
  const statusEl = rail.querySelector("[data-rail-status]");

  const percent = valueToPercent(total);
  const color = valueToColor(total);

  if (valueEl && valueEl.textContent !== String(total)) {
    valueEl.textContent = total;
    valueEl.style.color = color;
  }
  if (fillEl) {
    const isMobile = window.matchMedia("(max-width: 900px)").matches;
    if (isMobile) fillEl.style.width = percent + "%";
    else          fillEl.style.height = percent + "%";
    fillEl.style.background = color;
    fillEl.style.boxShadow = `0 0 14px ${color}`;
  }
  if (statusEl) {
    statusEl.textContent = statusText(total);
    statusEl.style.color = color;
  }
}

/* ============================================================
   СКАЧИВАНИЕ ФАЙЛА (на будущее — если пригодится)
   ============================================================ */
function downloadBlob(content, filename) {
  const blob = new Blob([content], {type: "text/csv;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ============================================================
   ГОД В ПОДВАЛЕ + ОБЩИЕ ИНИЦИАЛИЗАЦИИ
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // пересчёт шкал при ресайзе
  if (typeof window.onCalcResize === "function") {
    let t;
    window.addEventListener("resize", () => {
      clearTimeout(t);
      t = setTimeout(() => window.onCalcResize(), 120);
    });
  }
});

/* ============================================================
   ГВОЗДЬ НА СЛУЧАЙ ОШИБОК — выводим в консоль с префиксом
   ============================================================ */
window.addEventListener("error", (e) => {
  console.error("[Calc error]", e.message, e.filename, e.lineno);
});