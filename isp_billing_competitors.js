(function (global) {
'use strict';
const NB = global.NB;
const C = NB.competitors = NB.competitors || {};

const COMPANY_POOL = [
  { name:'Starlink',       color:'#3b82f6', desc:'Спутниковый гигант' },
  { name:'МТС',            color:'#ef4444', desc:'Мобильный оператор' },
  { name:'Ростелеком',     color:'#22c55e', desc:'Национальный провайдер' },
  { name:'Билайн',         color:'#fbbf24', desc:'Федеральный оператор' },
  { name:'Мегафон',        color:'#22d3ee', desc:'Мобильный оператор' },
  { name:'ТТК',            color:'#a855f7', desc:'Магистральный провайдер' },
  { name:'ЭР-Телеком',     color:'#f97316', desc:'Региональный лидер' },
  { name:'Yota',           color:'#06b6d4', desc:'Мобильный нишевик' }
];

C.generate = function () {
  const g = NB.state.game;
  if (g.competitors.length > 0) return;
  const shuffled = [...COMPANY_POOL].sort(() => Math.random() - 0.5);
  const count = 3 + Math.floor(Math.random() * 2);
  const picks = shuffled.slice(0, count);
  const totalOther = Math.max(0, 100 - g.marketShare);
  let assigned = 0;
  g.competitors = picks.map((p, i) => {
    const remaining = picks.length - i;
    const share = i === picks.length - 1
      ? totalOther - assigned
      : Math.round((totalOther - assigned) / remaining * (0.7 + Math.random() * 0.6));
    assigned += share;
    return {
      id: 'c' + i,
      name: p.name,
      color: p.color,
      desc: p.desc,
      share: Math.max(3, share),
      mood: 'neutral',
      aggression: 0,
      financialHealth: 70 + Math.floor(Math.random() * 30),
      techLevel: 2 + Math.floor(Math.random() * 3),
      relationship: 0,
      alive: true,
      founded: g.daily.dayNumber
    };
  });
  NB.save();
  NB.notify(`🏢 Открыт рынок! ${count} конкурентов`, 'ok');
};

C.tick = function () {
  const g = NB.state.game;
  if (!g.unlocks.competitors) return;
  if (g.competitors.length === 0) C.generate();
  g.competitors.forEach(c => {
    if (!c.alive) return;
    let delta = 0;
    if (c.financialHealth > 60) delta += NB.rand(-0.05, 0.15);
    else delta -= NB.rand(0, 0.25);
    c.share = Math.max(0, c.share + delta);
    c.financialHealth = Math.max(0, Math.min(100, c.financialHealth + NB.rand(-1, 1)));
    c.relationship = Math.max(-100, Math.min(100, c.relationship - 0.05));
    c.techLevel = Math.max(1, Math.min(5, c.techLevel + (Math.random() < 0.05 ? 1 : 0)));
    if (c.financialHealth < 10 && Math.random() < 0.05) {
      c.alive = false;
      c.share = 0;
      NB.notify(`📉 ${c.name} обанкротился`, 'ok');
      NB.addLog(`${c.name} обанкротился`, 'info');
    }
    c.mood = c.relationship >= 30 ? 'friendly' : c.relationship <= -30 ? 'hostile' : 'neutral';
  });
  NB.game.updateMarketShare();
  NB.save();
};

C.renderView = function () {
  const g = NB.state.game;
  if (!g.unlocks.competitors) return '<div class="panel"><p class="empty">Конкуренты откроются, когда компания станет заметной</p></div>';
  if (g.competitors.length === 0) C.generate();

  return `
    <div class="page-head">
      <div><h1>Конкуренты</h1><p class="muted">Рынок и отношения</p></div>
    </div>
    <div class="panel" style="margin-bottom:12px">
      <div class="panel-head"><h2>Доля рынка</h2></div>
      <div class="market-bar">
        <i style="width:${g.marketShare}%;background:linear-gradient(90deg,var(--primary),var(--primary-2))"></i>
        ${g.competitors.filter(c=>c.alive).map(c => `<i style="width:${c.share}%;background:${c.color}"></i>`).join('')}
      </div>
      <div class="market-legend">
        <span><i style="background:linear-gradient(90deg,var(--primary),var(--primary-2))"></i>NetBill ${g.marketShare}%</span>
        ${g.competitors.map(c => `<span style="opacity:${c.alive?1:.4}"><i style="background:${c.color}"></i>${NB.esc(c.name)} ${Math.round(c.share*10)/10}%</span>`).join('')}
      </div>
    </div>
    <div class="comp-list">
      ${g.competitors.map(c => C.renderRow(c)).join('')}
    </div>`;
};

C.renderRow = function (c) {
  const mood = c.mood === 'friendly' ? 'Дружелюбный' : c.mood === 'hostile' ? 'Враждебный' : 'Нейтральный';
  return `<div class="comp-row ${c.alive ? '' : 'dead'}">
    <div class="comp-logo" style="background:${c.color}">${NB.initials(c.name)}</div>
    <div class="comp-body">
      <b>${NB.esc(c.name)}</b>
      <small>${NB.esc(c.desc)} · Финансы ${c.financialHealth}/100 · Тех ${c.techLevel}</small>
      <span class="comp-mood ${c.mood}">${mood}</span>
    </div>
    <div class="comp-share">${Math.round(c.share*10)/10}%<small>доля</small></div>
    <div class="comp-actions">
      ${c.alive && c.relationship > -50 ? `<button class="btn ghost small" data-action="negotiate" data-id="${c.id}" title="Переговоры (1 AP)">🤝</button>` : ''}
      ${c.alive && c.relationship > -80 ? `<button class="btn ghost small" data-action="sabotage" data-id="${c.id}" style="color:#f87171" title="Саботаж (2 AP, 10k₽)">💀</button>` : ''}
    </div>
  </div>`;
};

C.negotiate = function (id) {
  const g = NB.state.game;
  const c = g.competitors.find(x => x.id === id);
  if (!c) return;
  if (g.ap.current < 1) return NB.toast('Нужен 1 AP', 'err');
  NB.spendAp(1);
  const roll = Math.random() + c.relationship / 200;
  if (roll > 0.55) {
    c.relationship = Math.min(100, c.relationship + 20);
    g.cash += 5000;
    NB.notify(`🤝 ${c.name}: +5000 ₽`, 'ok');
    NB.addCompanyXp(15);
  } else {
    c.relationship = Math.max(-100, c.relationship - 10);
    c.aggression += 5;
    NB.notify(`⚔ ${c.name}: отказ`, 'warn');
  }
  NB.save(); NB.render();
};

C.sabotage = function (id) {
  const g = NB.state.game;
  const c = g.competitors.find(x => x.id === id);
  if (!c) return;
  if (g.ap.current < 2) return NB.toast('Нужно 2 AP', 'err');
  if (g.cash < 10000) return NB.toast('Нужно 10 000 ₽', 'err');
  NB.spendAp(2); g.cash -= 10000;
  if (Math.random() > 0.5) {
    c.financialHealth = Math.max(0, c.financialHealth - 25);
    c.share = Math.max(0, c.share - 3);
    c.relationship = Math.max(-100, c.relationship - 20);
    c.aggression += 15;
    NB.notify(`💀 ${c.name}: атака удалась`, 'ok');
    NB.game.updateMarketShare();
  } else {
    c.relationship = Math.max(-100, c.relationship - 40);
    c.aggression += 25;
    g.reputation = Math.max(0, g.reputation - 10);
    NB.notify(`⚠ Атака на ${c.name} провалилась`, 'warn');
  }
  NB.save(); NB.render();
};

})(window);