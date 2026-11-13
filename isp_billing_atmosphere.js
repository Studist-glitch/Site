/* isp_billing_atmosphere.js — панельный декор + символ */
(function (global) {
'use strict';
const NB = global.NB;
const A = NB.atmosphere = NB.atmosphere || {};

/* Символ Абсолютного Решателя: три острые стрелки, расходящиеся из центра */
A.SOLVER_SYMBOL = '✶'; /* стилизованный вариант, можно заменить на SVG */

A.PANEL_THEMES = {
  family: {
    emojis: ['❤️','💕','💖','👨‍👩‍👧','🏡','🌻','🌸'],
    hue: '302deg', opacity: 0.16, count: 5, chance: 0.9, decor: null
  },
  family_crisis: {
    emojis: ['💔','🥀','🌧️','😢'],
    hue: '322deg', opacity: 0.18, count: 6, chance: 1, decor: null
  },
  daylog_ordinary: {
    emojis: ['📖','📝','📋'],
    hue: '352deg', opacity: 0.10, count: 3, chance: 0.7, decor: null
  },
  daylog_solver: {
    emojis: ['⚠️','✶','◈','🔶'],
    hue: '12deg', opacity: 0.14, count: 5, chance: 1, decor: 'glitch'
  },
  daylog_dread: {
    emojis: ['💀','🦴','🩸','🕷️'],
    hue: '322deg', opacity: 0.16, count: 6, chance: 1, decor: 'blood'
  },
  tickets: { emojis: ['✉️','📨','📬'], hue: '182deg', opacity: 0.10, count: 3, chance: 0.7 },
  tasks:   { emojis: ['✅','📋','📌'], hue: '352deg', opacity: 0.10, count: 3, chance: 0.7 },
  pending: { emojis: ['👤','🆕','👥'], hue: '352deg', opacity: 0.11, count: 4, chance: 0.8 },
  economy: { emojis: ['💰','💵','📈','🪙'], hue: '102deg', opacity: 0.09, count: 4, chance: 0.7 },
  bunker: { emojis: ['🏚️','🕯️','🧱','📦'], hue: '12deg', opacity: 0.13, count: 4, chance: 1, decor: 'cobweb' },
  ark: { emojis: ['🏛️','🚀','🌌','⭐','🛸'], hue: '182deg', opacity: 0.10, count: 5, chance: 1, decor: 'stars' },
  drones: { emojis: ['🤖','⚙️','🔩','🛸'], hue: '182deg', opacity: 0.11, count: 5, chance: 1, decor: 'gears' },
  solver: { emojis: ['✶','⚠️','◈','🔶','✴️'], hue: '12deg', opacity: 0.14, count: 6, chance: 1, decor: 'glitch' },
  dread: { emojis: ['💀','🦴','🕷️','🕸️'], hue: '322deg', opacity: 0.16, count: 6, chance: 1, decor: 'blood' },
  story_solver: { emojis: ['◆','✶','⚠️','◈'], hue: '12deg', opacity: 0.12, count: 4, chance: 1, decor: 'angled' },
  story_romance: { emojis: ['❤️','💕','🌸','💖'], hue: '302deg', opacity: 0.12, count: 4, chance: 0.9, decor: null },
  none: { emojis: [], count: 0, chance: 0 }
};

A.detectPanelTheme = function (panel) {
  const g = NB.state.game;
  const cls = panel.className || '';
  if (cls.includes('family-panel')) return g.family.wifeHappiness < 25 ? 'family_crisis' : 'family';
  if (cls.includes('day-log-panel')) {
    if (g.world.threat >= 5) return 'daylog_dread';
    if (g.world.threat >= 3) return 'daylog_solver';
    return 'daylog_ordinary';
  }
  if (cls.includes('tickets-section')) return 'tickets';
  if (cls.includes('daily-tasks-panel')) return 'tasks';
  if (cls.includes('pending-clients-section')) return 'pending';
  if (cls.includes('economy-panel')) return 'economy';
  if (cls.includes('bunker-panel') || cls.includes('bunker-widget')) return 'bunker';
  if (cls.includes('ark-panel')) return 'ark';
  if (cls.includes('drone-panel')) return 'drones';
  if (cls.includes('story-panel')) {
    if (g.world.threat >= 6) return 'story_solver';
    if (g.family.wife && g.family.wifeHappiness > 70) return 'story_romance';
    return 'story_solver';
  }
  if (cls.includes('game-panel')) return 'game_cash';
  if (g.world.threat >= 6) return 'solver';
  if (g.world.threat >= 4) return 'dread';
  return 'none';
};

A.applyToPanel = function (panel, themeKey) {
  if (panel.dataset.atmApplied === themeKey) return;
  panel.dataset.atmApplied = themeKey;
  panel.querySelectorAll('.atm-decor, .atm-special').forEach(el => el.remove());
  panel.classList.remove('atm-glitch-active');
  const theme = A.PANEL_THEMES[themeKey];
  if (!theme || theme.count === 0) return;
  if (Math.random() > (theme.chance || 1)) return;
  if (theme.decor) A.addSpecialDecor(panel, theme.decor);
  for (let i = 0; i < theme.count; i++) {
    const el = document.createElement('span');
    el.className = 'atm-decor';
    el.textContent = NB.pick(theme.emojis);
    el.style.setProperty('--hue', theme.hue);
    el.style.setProperty('--opacity', theme.opacity);
    el.style.fontSize = NB.rand(24, 64) + 'px';
    el.style.left = NB.rand(-6, 94) + '%';
    el.style.top = NB.rand(-10, 82) + '%';
    el.style.transform = `rotate(${NB.rand(-35, 35)}deg)`;
    if (Math.random() > 0.5) {
      el.style.animation = `atmFloat ${NB.rand(8, 18)}s ease-in-out infinite`;
      el.style.animationDelay = NB.rand(0, 4) + 's';
    }
    panel.appendChild(el);
  }
};

A.addSpecialDecor = function (panel, type) {
  if (type === 'cobweb') {
    ['top:-30px;left:-30px', 'bottom:-30px;right:-30px;transform:rotate(180deg)'].forEach(pos => {
      const web = document.createElement('div');
      web.className = 'atm-special atm-cobweb';
      web.style.cssText = pos + ';width:140px;height:140px';
      panel.appendChild(web);
    });
  } else if (type === 'blood') {
    const blood = document.createElement('div');
    blood.className = 'atm-special atm-blood';
    panel.appendChild(blood);
  } else if (type === 'gears') {
    [['right:4%;top:8%', false], ['left:4%;bottom:8%', true]].forEach(([pos, rev]) => {
      const gear = document.createElement('div');
      gear.className = 'atm-special atm-gear';
      gear.textContent = '⚙️';
      gear.style.cssText = `font-size:${NB.rand(48, 96)}px;${pos};animation:atmRotate ${NB.rand(15, 28)}s linear infinite${rev ? ' reverse' : ''}`;
      panel.appendChild(gear);
    });
  } else if (type === 'stars') {
    for (let i = 0; i < 8; i++) {
      const star = document.createElement('div');
      star.className = 'atm-special atm-star';
      star.style.cssText = `left:${NB.rand(3, 97)}%;top:${NB.rand(3, 97)}%;animation-delay:${NB.rand(0, 3)}s`;
      panel.appendChild(star);
    }
  } else if (type === 'glitch') {
    panel.classList.add('atm-glitch-active');
  }
};

A.scan = function () {
  if (!NB.state || !NB.state.game) return;
  const panels = document.querySelectorAll('.panel, .game-panel, .recs-panel, .family-panel, .daily-tasks-panel, .story-panel, .economy-panel, .pending-clients-section, .tickets-section, .day-log-panel');
  panels.forEach(panel => A.applyToPanel(panel, A.detectPanelTheme(panel)));
};

A.update = A.scan;

function wrapRender(obj, key) {
  const orig = obj[key];
  if (!orig || orig.__atmWrapped) return;
  const wrapped = function () {
    const r = orig.apply(this, arguments);
    setTimeout(() => A.scan(), 60);
    return r;
  };
  wrapped.__atmWrapped = true;
  obj[key] = wrapped;
}
wrapRender(NB, 'render');
wrapRender(NB, 'renderView');

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => setTimeout(() => A.scan(), 500));
} else {
  setTimeout(() => A.scan(), 500);
}

})(window);