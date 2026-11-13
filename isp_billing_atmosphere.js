/* isp_billing_atmosphere.js — динамическая атмосфера: эмодзи, фоны, анимации */
(function (global) {
'use strict';
const NB = global.NB;
const A = NB.atmosphere = NB.atmosphere || {};

/* ============================================================
   НАСТРОЕНИЯ (MOODS) — определяются состоянием игры
   ============================================================ */
A.MOODS = {
  ordinary:    { emoji: [],                          bg: 'none',           anim: null,        overlay: null },
  romance:     { emoji: ['❤️','💕','💖','💗','🌸'], bg: 'hearts',         anim: 'floatUp',   overlay: null },
  family:      { emoji: ['👨‍👩‍👧','🏡','🧸','🌻'],     bg: 'warm',           anim: 'gentleSway',overlay: null },
  dread:       { emoji: ['💀','🦴','🕷️','🕸️'],       bg: 'blood',          anim: 'drip',      overlay: 'dark' },
  solver:      { emoji: ['⚙️','🟡','⚠️','🔶'],        bg: 'yellowCode',     anim: 'glitch',    overlay: 'yellow' },
  drones:      { emoji: ['🤖','⚙️','🔩','🛸'],        bg: 'gears',          anim: 'rotate',    overlay: null },
  bunker:      { emoji: ['🏚️','🕯️','🔦','🧱'],       bg: 'concrete',       anim: 'flicker',   overlay: 'dim' },
  ark:         { emoji: ['🏛️','🚀','🌌','⭐'],        bg: 'stars',          anim: 'twinkle',   overlay: 'deep' },
  silence:     { emoji: ['🌫️','🕊️','🕯️'],            bg: 'fog',            anim: 'fade',      overlay: 'grey' },
  hope:        { emoji: ['🌍','🌱','☀️','🕊️'],        bg: 'dawn',           anim: 'rise',      overlay: 'light' }
};

/* ============================================================
   ОПРЕДЕЛЕНИЕ ТЕКУЩЕГО НАСТРОЕНИЯ
   ============================================================ */
A.detectMood = function () {
  const g = NB.state.game;
  const w = g.world;

  /* Приоритет: сюжетные флаги > угроза > арка */
  if (w.flags.worldSaved) return 'hope';
  if (w.threat >= 8) return 'dread';
  if (w.threat >= 5) return 'solver';
  if (w.drones.enabled && g.daily.dayNumber >= 70 && g.daily.dayNumber < 95) return 'drones';
  if (w.bunker.built && g.daily.dayNumber >= 95 && g.daily.dayNumber < 120) return 'bunker';
  if (w.flags.arkBuilt) return 'ark';
  if (g.family.wife && g.family.wifeHappiness > 70 && g.daily.dayNumber < 50) return 'romance';
  if (g.family.wife && g.family.wifeHappiness > 40) return 'family';
  if (w.neon.met && g.daily.dayNumber < 50) return 'ordinary';
  return 'ordinary';
};

/* ============================================================
   ПРИМЕНЕНИЕ АТМОСФЕРЫ
   ============================================================ */
let activeEmojis = [];
let animFrame = null;

A.apply = function (moodId) {
  const mood = A.MOODS[moodId] || A.MOODS.ordinary;
  document.body.dataset.mood = moodId;

  /* 1. Очищаем старые эмодзи */
  activeEmojis.forEach(el => el.remove());
  activeEmojis = [];

  /* 2. Устанавливаем фон */
  A.setBackground(mood.bg);

  /* 3. Запускаем анимацию (если есть) */
  A.startAnimation(mood.anim);

  /* 4. Оверлей */
  A.setOverlay(mood.overlay);

  /* 5. Спавним эмодзи (не более 12 штук) */
  if (mood.emoji.length > 0) {
    const count = moodId === 'dread' ? 12 : moodId === 'romance' ? 8 : 5;
    for (let i = 0; i < count; i++) {
      setTimeout(() => A.spawnEmoji(mood.emoji), i * 400);
    }
  }
};

A.spawnEmoji = function (pool) {
  if (activeEmojis.length >= 15) return;
  const el = document.createElement('div');
  el.className = 'atm-emoji';
  el.textContent = NB.pick(pool);
  el.style.left = NB.rand(5, 95) + '%';
  el.style.top = NB.rand(10, 90) + '%';
  el.style.fontSize = NB.rand(14, 36) + 'px';
  el.style.animationDuration = NB.rand(6, 14) + 's';
  el.style.animationDelay = NB.rand(0, 3) + 's';
  el.style.opacity = NB.rand(0.05, 0.25);
  document.body.appendChild(el);
  activeEmojis.push(el);
  setTimeout(() => { el.remove(); activeEmojis = activeEmojis.filter(e => e !== el); }, 15000);
};

A.setBackground = function (bg) {
  document.body.dataset.bg = bg;
  /* Стили фонов в CSS */
};

A.startAnimation = function (anim) {
  document.body.dataset.anim = anim || '';
};

A.setOverlay = function (overlay) {
  let el = document.getElementById('atm-overlay');
  if (!overlay) { if (el) el.remove(); return; }
  if (!el) {
    el = document.createElement('div');
    el.id = 'atm-overlay';
    document.body.appendChild(el);
  }
  el.className = 'atm-overlay atm-overlay-' + overlay;
};

/* ============================================================
   АВТООБНОВЛЕНИЕ
   ============================================================ */
A.update = function () {
  const mood = A.detectMood();
  if (document.body.dataset.mood !== mood) {
    A.apply(mood);
  }
};

/* Автообновление при рендере */
const origRender = NB.render;
if (origRender) {
  NB.render = function () {
    origRender.apply(this, arguments);
    setTimeout(() => A.update(), 100);
  };
}

/* Первичный запуск */
setTimeout(() => A.update(), 500);

})(window);