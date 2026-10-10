/* ============================================================
   ОБЩИЙ СКРИПТ
   - движок звуков (Web Audio API)
   - хранилище настроек (фон, звук)
   - шкала прогресса
   - toast
   - утилиты
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
   ДВИЖОК ЗВУКОВ
   ============================================================ */
const Sound = (function() {
  let audioCtx = null;
  const STORAGE_KEY = "ems_sound_v1";

  // Настройки по умолчанию
  const defaults = {
    enabled: false,
    volume: 0.5,
    theme: "medical",
  };

  let state = { ...defaults };

  // Загрузить из localStorage
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = { ...defaults, ...parsed };
    }
  } catch (e) {}

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  function initCtx() {
    if (audioCtx) return audioCtx;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { return null; }
    return audioCtx;
  }

  /**
   * Играть тон
   * @param {number} freq — частота в Гц
   * @param {number} duration — длительность в сек
   * @param {string} type — sine, square, triangle, sawtooth
   * @param {number} volMul — множитель громкости (0..1)
   */
  function playTone(freq, duration = 0.1, type = "sine", volMul = 1) {
    if (!state.enabled) return;
    const ctx = initCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;

    const vol = state.volume * volMul;
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  // Проигрыш последовательности тонов
  function playSeq(notes) {
    if (!state.enabled) return;
    const ctx = initCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();

    let delay = 0;
    const now = ctx.currentTime;
    notes.forEach(n => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = n.type || "sine";
      osc.frequency.value = n.freq;

      const vol = state.volume * (n.volMul || 1);
      const start = now + delay;
      const dur = n.dur || 0.1;

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(vol, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur + 0.02);

      delay += (n.gap != null ? n.gap : dur);
    });
  }

  // Готовые звуки в зависимости от темы
  const sounds = {
    medical: {
      click:   () => playTone(880, 0.05, "sine", 0.4),
      hover:   () => playTone(1200, 0.03, "sine", 0.2),
      success: () => playSeq([
        { freq: 880,  dur: 0.08, type: "sine", volMul: 0.6 },
        { freq: 1320, dur: 0.12, type: "sine", volMul: 0.6 },
      ]),
      error:   () => playSeq([
        { freq: 400, dur: 0.1, type: "square", volMul: 0.5 },
        { freq: 300, dur: 0.15, type: "square", volMul: 0.5 },
      ]),
      notify:  () => playSeq([
        { freq: 1000, dur: 0.08, type: "sine", volMul: 0.5 },
        { freq: 1400, dur: 0.1,  type: "sine", volMul: 0.5 },
      ]),
      tick:    () => playTone(1500, 0.025, "square", 0.3),
    },
    soft: {
      click:   () => playTone(600, 0.06, "sine", 0.3),
      hover:   () => playTone(800, 0.04, "sine", 0.15),
      success: () => playSeq([
        { freq: 660, dur: 0.1, type: "sine", volMul: 0.4 },
        { freq: 880, dur: 0.14, type: "sine", volMul: 0.4 },
      ]),
      error:   () => playSeq([
        { freq: 340, dur: 0.12, type: "sine", volMul: 0.4 },
        { freq: 280, dur: 0.16, type: "sine", volMul: 0.4 },
      ]),
      notify:  () => playSeq([
        { freq: 700, dur: 0.09, type: "sine", volMul: 0.35 },
        { freq: 900, dur: 0.11, type: "sine", volMul: 0.35 },
      ]),
      tick:    () => playTone(900, 0.03, "sine", 0.2),
    },
    classic: {
      click:   () => playTone(800, 0.05, "triangle", 0.35),
      hover:   () => playTone(1000, 0.03, "triangle", 0.15),
      success: () => playSeq([
        { freq: 800,  dur: 0.1, type: "triangle", volMul: 0.5 },
        { freq: 1000, dur: 0.1, type: "triangle", volMul: 0.5 },
        { freq: 1200, dur: 0.15, type: "triangle", volMul: 0.5 },
      ]),
      error:   () => playSeq([
        { freq: 350, dur: 0.12, type: "triangle", volMul: 0.5 },
        { freq: 250, dur: 0.18, type: "triangle", volMul: 0.5 },
      ]),
      notify:  () => playSeq([
        { freq: 900,  dur: 0.08, type: "triangle", volMul: 0.45 },
        { freq: 1100, dur: 0.12, type: "triangle", volMul: 0.45 },
      ]),
      tick:    () => playTone(1200, 0.02, "triangle", 0.25),
    },
  };

  function play(name) {
    if (!state.enabled) return;
    const set = sounds[state.theme] || sounds.medical;
    const fn = set[name];
    if (fn) fn();
  }

  return {
    get enabled() { return state.enabled; },
    get volume() { return state.volume; },
    get theme() { return state.theme; },

    setEnabled(v) {
      state.enabled = !!v;
      save();
      if (state.enabled) play("click");
    },
    setVolume(v) {
      state.volume = Math.max(0, Math.min(1, v));
      save();
    },
    setTheme(t) {
      if (sounds[t]) {
        state.theme = t;
        save();
        play("notify");
      }
    },
    play,
  };
})();

/* ============================================================
   УПРАВЛЕНИЕ ФОНОМ
   ============================================================ */
const Background = (function() {
  const KEY = "ems_bg_v1";
  const body = document.body;

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

  function apply(cfg, persist = true) {
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

  function getCurrent() { return load() || {type: "gradient"}; }

  function reset() {
    try { localStorage.removeItem(KEY); } catch (e) {}
    apply({type: "gradient"}, false);
  }

  // Применить сохранённый при загрузке
  const saved = load();
  if (saved) apply(saved, false);

  return { apply, reset, getCurrent };
})();

/* ============================================================
   TOAST
   ============================================================ */
function showToast(msg) {
  let t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    t.className = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  Sound.play("notify");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => t.classList.remove("show"), 2200);
}

/* ============================================================
   УТИЛИТЫ
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
function pulseEl(el) {
  if (!el) return;
  el.classList.remove("pulse");
  void el.offsetWidth;
  el.classList.add("pulse");
}

/* ============================================================
   ШКАЛА ПРОГРЕССА
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
   ПОДКЛЮЧЕНИЕ ЗВУКОВ К СТРАНИЦЕ
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  // Год в подвале
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Клик по ссылкам навигации
  document.querySelectorAll(".tab, .tab-left, .card").forEach(el => {
    el.addEventListener("click", () => Sound.play("click"));
  });

  // Hover по вкладкам — тихий tick
  document.querySelectorAll(".tab, .tab-left").forEach(el => {
    el.addEventListener("mouseenter", () => Sound.play("hover"));
  });

  // Кнопки — клик
  document.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => Sound.play("click"));
  });
});

/* ============================================================
   ОТЛОВ ОШИБОК
   ============================================================ */
window.addEventListener("error", (e) => {
  console.error("[EMS error]", e.message, e.filename, e.lineno);
});
