/* isp_billing_competitors.js — корпорации → закат → угрозы (рейдеры, бандиты, дроны) */
(function (global) {
'use strict';
const NB = global.NB;
const C = NB.competitors = NB.competitors || {};

/* ============================================================
   ПУЛ КОМПАНИЙ
   ============================================================ */
const COMPANY_POOL = [
  { name:'Starlink',   color:'#3b82f6', desc:'Спутниковый гигант',     personality:'aggressive' },
  { name:'МТС',        color:'#ef4444', desc:'Мобильный оператор',     personality:'opportunist' },
  { name:'Ростелеком', color:'#22c55e', desc:'Национальный провайдер', personality:'cautious' },
  { name:'Билайн',     color:'#fbbf24', desc:'Федеральный оператор',   personality:'opportunist' },
  { name:'Мегафон',    color:'#22d3ee', desc:'Мобильный оператор',     personality:'aggressive' },
  { name:'ТТК',        color:'#a855f7', desc:'Магистральный провайдер',personality:'cautious' },
  { name:'ЭР-Телеком', color:'#f97316', desc:'Региональный лидер',     personality:'idealist' },
  { name:'Yota',       color:'#06b6d4', desc:'Мобильный нишевик',      personality:'idealist' }
];

const PERSONALITY = {
  aggressive:  { label:'Агрессор',  icon:'⚔', desc:'Быстро наращивает агрессию' },
  cautious:    { label:'Осторожный',icon:'🛡', desc:'Редко атакует первым' },
  opportunist: { label:'Оппортунист',icon:'🎲',desc:'Действует по ситуации' },
  idealist:    { label:'Идеалист',  icon:'🌱', desc:'Ценит репутацию' }
};

const AGREEMENT_TYPES = {
  tradeDeal:      { label:'Торговое соглашение', icon:'📦', color:'#22c55e' },
  nonAggression:  { label:'Пакт о ненападении',  icon:'🕊', color:'#38bdf8' },
  sharedBackbone: { label:'Общая магистраль',    icon:'🔗', color:'#a855f7' },
  pricePact:      { label:'Ценовой пакт',        icon:'💰', color:'#fbbf24' },
  research:       { label:'Совместные R&D',      icon:'🧪', color:'#f97316' },
  alliance:       { label:'Военный союз',        icon:'⚔',  color:'#ef4444' }
};

C.AGREEMENT_TYPES = AGREEMENT_TYPES;

/* ============================================================
   УГРОЗЫ
   ============================================================ */
const THREAT_TYPES = {
  raider: {
    label:'Рейдеры', icon:'⚔', color:'#ef4444',
    desc:'Крупные вооружённые группы',
    lootMult: 1.8, powerMult: 1.3,
    names: ['Клык','Гром','Сталь','Тень','Хищник','Варан','Кобра']
  },
  bandit: {
    label:'Бандиты', icon:'🔪', color:'#f59e0b',
    desc:'Мелкие банды, крадут припасы',
    lootMult: 0.7, powerMult: 0.7,
    names: ['Псы','Вороны','Крысы','Шакалы','Стервятники']
  },
  drone: {
    label:'Дроны', icon:'🤖', color:'#0ea5e9',
    desc:'Боевые дроны Синессы',
    lootMult: 1.2, powerMult: 1.0,
    names: ['охотники','стражи','скауты','убийцы','разведчики']
  }
};

/* ============================================================
   ГЕНЕРАЦИЯ КОРПОРАЦИЙ
   ============================================================ */
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
    const aggressionBase = p.personality === 'aggressive' ? 40
      : p.personality === 'cautious' ? 10 : 25;
    return {
      id: 'c' + i,
      name: p.name, color: p.color, desc: p.desc,
      personality: p.personality,
      share: Math.max(3, share),
      relationship: 0,
      aggression: aggressionBase,
      financialHealth: 70 + Math.floor(Math.random() * 30),
      techLevel: 2 + Math.floor(Math.random() * 3),
      mood: 'neutral',
      alive: true,
      founded: g.daily.dayNumber,
      agreements: [],
      priceWarUntil: 0,
      takeoverProgress: 0,
      spyAttempts: 0,
      sabotageCount: 0,
      history: []
    };
  });
  NB.save();
  NB.notify(`🏢 Открыт рынок! ${count} конкурентов`, 'ok');
};

/* ============================================================
   ЗАКАТ КОРПОРАЦИЙ (после гала-вечера)
   ============================================================ */
C.startSunset = function () {
  const g = NB.state.game;
  if (g.world.transitionStartedDay) return;
  g.world.transitionStartedDay = g.daily.dayNumber;
  g.world.flags.corpSunset = true;
  NB.notify('🌇 Рынок рушится: корпорации теряют контроль', 'warn');
  NB.addLog('Закат корпораций начался', 'warn');
  /* Умирают быстро: финансовое здоровье резко падает */
  g.competitors.forEach(c => {
    if (c.alive) {
      c.financialHealth = Math.max(0, c.financialHealth - 40);
      c.history.push({ day: g.daily.dayNumber, type:'sunset', label:'Начало заката' });
    }
  });
  NB.save();
};

C.checkSunsetTrigger = function () {
  const g = NB.state.game;
  const day = g.daily.dayNumber;
  /* Триггер: гала-вечер пройден ИЛИ (день >= 70 и угроза >= 3) */
  const galaPassed = g.world.flags.galaSurvived || g.world.flags.galaFamily || g.world.flags.galaSolo;
  const lateGame = day >= 70 && g.world.threat >= 3;
  if ((galaPassed || lateGame) && !g.world.transitionStartedDay) {
    C.startSunset();
  }
};

/* ============================================================
   ТИК
   ============================================================ */
C.tick = function () {
  const g = NB.state.game;
  if (!g.unlocks.competitors) return;
  if (g.competitors.length === 0) C.generate();

  C.checkSunsetTrigger();

  /* Тик корпораций */
  if (g.world.era === 'rivals') {
    C.tickRivals();
  }
  /* Тик угроз */
  if (g.world.era === 'threats') {
    C.tickThreats();
  }

  /* Переход эры */
  C.maybeSwitchEra();

  NB.game.updateMarketShare();
  NB.save();
};

C.tickRivals = function () {
  const g = NB.state.game;
  const day = g.daily.dayNumber;
  const sunset = !!g.world.transitionStartedDay;
  const daysSinceSunset = sunset ? (day - g.world.transitionStartedDay) : 0;

  g.competitors.forEach(c => {
    if (!c.alive) return;

    /* Закат: умирают по одному за 2-4 дня */
    if (sunset) {
      const deathChance = Math.min(0.5, 0.15 + daysSinceSunset * 0.08);
      if (Math.random() < deathChance) {
        C.bankrupt(c);
        return;
      }
    }

    /* Соглашения */
    c.agreements.forEach(a => {
      if (a.untilDay && day > a.untilDay) {
        a.expired = true;
        c.history.push({ day, type:'expired', label:`Истекло: ${AGREEMENT_TYPES[a.type].label}` });
        NB.addLog(`Соглашение с ${c.name} истекло`, 'info');
      } else {
        C.applyAgreement(c, a, day);
      }
    });
    c.agreements = c.agreements.filter(a => !a.expired);

    /* Дрейф */
    c.relationship += (0 - c.relationship) * 0.02;
    c.relationship = Math.max(-100, Math.min(100, c.relationship));
    c.aggression = Math.max(0, c.aggression - 0.3);
    c.mood = c.relationship >= 30 ? 'friendly' : c.relationship <= -30 ? 'hostile' : 'neutral';

    /* Финансы */
    if (sunset) {
      c.financialHealth = Math.max(0, c.financialHealth - 8);
      c.share = Math.max(0, c.share - 1);
    } else {
      if (c.financialHealth > 60) c.share += NB.rand(-0.05, 0.15);
      else c.share -= NB.rand(0, 0.25);
      c.share = Math.max(0, c.share);
    }

    /* Ценовая война */
    if (c.priceWarUntil > day) {
      c.financialHealth = Math.max(0, c.financialHealth - 1.5);
      c.share = Math.max(0, c.share - 0.3);
      g.cash -= 500;
      g.reputation = Math.max(0, g.reputation - 0.5);
    }

    /* Поглощение */
    if (c.takeoverProgress > 0 && c.takeoverProgress < 100) {
      const inc = Math.round(5 + g.company.level * 2);
      c.takeoverProgress = Math.min(100, c.takeoverProgress + inc);
      if (c.takeoverProgress >= 100) C.completeTakeover(c);
    }

    /* Банкротство */
    if (c.financialHealth < 10 && Math.random() < 0.05) C.bankrupt(c);

    /* Спонтанные действия (только до заката) */
    if (!sunset) C.maybeAct(c);
  });
};

C.maybeSwitchEra = function () {
  const g = NB.state.game;
  if (g.world.era === 'threats') return;
  if (!g.world.transitionStartedDay) return;
  const alive = g.competitors.filter(c => c.alive);
  if (alive.length === 0) {
    g.world.era = 'threats';
    g.unlocks.threats = true;
    NB.notify('💀 Все корпорации пали. Начинается эпоха угроз.', 'warn');
    NB.addLog('Эпоха корпораций закончилась. Угрозы: рейдеры, бандиты, дроны.', 'warn');
    /* Зарождаем первые угрозы */
    C.generateThreats();
    C.generateThreats();
    NB.save();
    setTimeout(() => { if (NB.renderView) NB.renderView(); }, 300);
  }
};

/* ============================================================
   ТИК УГРОЗ
   ============================================================ */
C.tickThreats = function () {
  const g = NB.state.game;
  const day = g.daily.dayNumber;
  if (!g.world.threats) g.world.threats = [];

  /* Спавн новых угроз с шансом */
  if (Math.random() < 0.35) C.generateThreats();

  g.world.threats.forEach(t => {
    if (!t.alive) return;

    /* Агрессия растёт */
    t.aggression = Math.min(100, t.aggression + NB.rand(2, 8));

    /* Атака при высокой агрессии */
    if (t.aggression >= 70 && Math.random() < 0.3) {
      C.threatAttack(t);
    }

    /* Дроп, если давно не видали */
    if (day - t.seenDay > 5 && t.aggression < 30) {
      t.alive = false;
      NB.addLog(`${t.name} ушли`, 'info');
    }
  });

  /* Очистка мёртвых */
  g.world.threats = g.world.threats.filter(t => t.alive || (t.diedDay && day - t.diedDay < 3));
};

C.generateThreats = function () {
  const g = NB.state.game;
  if (!g.world.threats) g.world.threats = [];
  const alive = g.world.threats.filter(t => t.alive).length;
  if (alive >= 5) return;

  const typeKeys = Object.keys(THREAT_TYPES);
  /* В начале только бандиты, потом рейдеры/дроны */
  let pool = ['bandit'];
  if (g.daily.dayNumber > 100) pool.push('raider', 'drone');
  if (g.daily.dayNumber > 130) pool.push('raider', 'drone');
  if (g.world.drones.enabled) pool.push('drone', 'drone');
  const type = NB.pick(pool);
  const meta = THREAT_TYPES[type];
  const basePower = Math.round(
    (30 + Math.floor(Math.random() * 30) + Math.floor(g.daily.dayNumber / 4) * 5) * meta.powerMult
  );
  const threat = {
    id: 'th' + (g.world.threatSeq = (g.world.threatSeq || 0) + 1),
    type,
    name: type === 'drone'
      ? `Дроны-${NB.pick(meta.names)}`
      : `${meta.label} «${NB.pick(meta.names)}»`,
    power: basePower,
    basePower,
    aggression: 20 + Math.floor(Math.random() * 40),
    loot: Math.round((2000 + Math.floor(g.daily.dayNumber / 2) * 100) * meta.lootMult),
    alive: true,
    seenDay: g.daily.dayNumber,
    history: []
  };
  g.world.threats.push(threat);
  NB.notify(`⚠ Новая угроза: ${threat.name}`, 'warn');
  NB.addLog(`Обнаружены ${threat.name} (сила ${threat.power})`, 'warn');
};

C.threatAttack = function (t) {
  const g = NB.state.game;
  const warriors = g.employees.filter(e => e.spec === 'warrior');
  const combatPower = warriors.reduce((s, e) => s + (e.combat?.attack || 0) + (e.combat?.defense || 0), 0);
  const defenseBonus = NB.game.getUpgradeEffects?.().bunkerDefense || 0;
  const hasBunker = g.world.bunker.built;

  let repPenalty = 0, cashLoss = 0, foodLoss = 0, victim = null;

  if (combatPower + defenseBonus * 100 >= t.power) {
    /* Отбито */
    NB.addLog(`⚔ ${t.name} атаковали — отбито`, 'success');
    t.aggression = Math.max(0, t.aggression - 30);
    return;
  }

  if (hasBunker && Math.random() < 0.5) {
    NB.addLog(`⚠ ${t.name} не смогли пробиться в бункер`, 'warn');
    t.aggression = Math.max(0, t.aggression - 15);
    return;
  }

  if (t.type === 'bandit') {
    cashLoss = Math.min(Math.round(g.cash * 0.1), 5000);
    foodLoss = Math.min(g.world.bunker.food || 0, 3);
    g.world.bunker.food = Math.max(0, (g.world.bunker.food || 0) - foodLoss);
  } else if (t.type === 'raider') {
    cashLoss = Math.min(Math.round(g.cash * 0.15), 12000);
    if (g.employees.length > 0 && Math.random() < 0.3) {
      const e = NB.pick(g.employees.filter(x => x.spec !== 'warrior'));
      if (e) { victim = e.name; g.employees = g.employees.filter(x => x.id !== e.id); }
    }
  } else if (t.type === 'drone') {
    repPenalty = 5;
    g.world.threat = Math.min(10, g.world.threat + 1);
  }

  g.cash = Math.max(0, g.cash - cashLoss);
  g.reputation = Math.max(0, g.reputation - repPenalty);

  const parts = [];
  if (cashLoss > 0) parts.push(`−${NB.money(cashLoss)}`);
  if (foodLoss > 0) parts.push(`−${foodLoss} еды`);
  if (repPenalty > 0) parts.push(`−${repPenalty} реп`);
  if (victim) parts.push(`погиб ${victim}`);
  NB.addLog(`💀 ${t.name} атаковали: ${parts.join(', ')}`, 'warn');
  t.aggression = Math.max(0, t.aggression - 20);
};

/* ============================================================
   ПРИМЕНЕНИЕ СОГЛАШЕНИЙ (для rivals)
   ============================================================ */
C.applyAgreement = function (c, a, day) {
  const g = NB.state.game;
  switch (a.type) {
    case 'tradeDeal':
      g.cash += a.dailyIncome;
      NB.addLog(`📦 ${c.name}: +${NB.money(a.dailyIncome)} по договору`, 'success');
      break;
    case 'pricePact':
      g.cash += Math.round(200 + g.company.level * 100);
      break;
    case 'research':
      if (day % 3 === 0 && c.techLevel < 5) c.techLevel++;
      break;
    case 'alliance':
      c.aggression = Math.max(0, c.aggression - 5);
      break;
  }
};

C.agreementTrafficBonus = function () {
  const g = NB.state.game;
  let bonus = 0;
  g.competitors.forEach(c => {
    if (!c.alive) return;
    c.agreements.forEach(a => {
      if (a.type === 'sharedBackbone') bonus += 2000;
    });
  });
  return bonus;
};

/* ============================================================
   АКТИВНЫЕ ДЕЙСТВИЯ КОРПОРАЦИЙ
   ============================================================ */
C.maybeAct = function (c) {
  const g = NB.state.game;
  const roll = Math.random();

  if (c.agreements.some(a => a.type === 'alliance' || a.type === 'nonAggression')) return;

  const hostiles = c.mood === 'hostile' || c.aggression > 50;
  if (hostiles && roll < 0.08 * (1 + c.aggression / 100)) {
    C.queueEvent(c, 'attack');
    return;
  }
  if (hostiles && roll < 0.15) { C.queueEvent(c, 'demand'); return; }
  if (c.mood === 'friendly' && roll < 0.05) { C.queueEvent(c, 'offer'); return; }
  if (c.financialHealth < 30 && roll < 0.1) { C.queueEvent(c, 'crisis'); return; }
  if (c.share < 15 && c.relationship > 20 && roll < 0.03) { C.queueEvent(c, 'merger-offer'); return; }
  if (c.personality === 'opportunist' && c.aggression > 30 && roll < 0.04) { C.queueEvent(c, 'price-war-threat'); }
};

C.queueEvent = function (c, type) {
  const g = NB.state.game;
  if (!g.world.competitorQueue) g.world.competitorQueue = [];
  if (g.world.competitorQueue.some(e => e.competitorId === c.id)) return;
  if (g.world.era !== 'rivals') return;
  g.world.competitorQueue.push({ competitorId: c.id, type });
};

C.processQueue = function () {
  const g = NB.state.game;
  if (!g.world.competitorQueue || !g.world.competitorQueue.length) return;
  const modal = document.getElementById('modal');
  if (modal && !modal.classList.contains('hidden')) return;
  if (g.activeEvent) return;
  if (g.world.storyQueue && g.world.storyQueue.length) return;
  const evt = g.world.competitorQueue.shift();
  C.showEvent(evt);
};

C.showEvent = function (evt) {
  const g = NB.state.game;
  const c = g.competitors.find(x => x.id === evt.competitorId);
  if (!c || !c.alive) return;

  const templates = {
    attack: {
      title:`⚔ ${c.name} атакует`,
      desc:`${c.name} начал агрессивную кампанию: демпингует цены и переманивает клиентов.`,
      opts:[
        { label:'Ответить (1 AP)', run:()=>{ if (!NB.spendAp(1)) return 'Нет AP'; c.aggression = Math.max(0, c.aggression - 15); c.relationship = Math.max(-100, c.relationship - 10); g.reputation = Math.min(100, g.reputation + 2); return 'Отступили'; }},
        { label:'Ценовая война (2 AP)', run:()=>{ if (!NB.spendAp(2)) return 'Нет AP'; C.startPriceWar(c); return 'Война'; }},
        { label:'Уступить (5 000₽)', run:()=>{ if (g.cash < 5000) return 'Нет денег'; g.cash -= 5000; c.aggression = Math.max(0, c.aggression - 20); c.relationship = Math.min(100, c.relationship + 10); return 'Откупились'; }},
        { label:'Проигнорировать', run:()=>{ c.share += 2; c.aggression += 5; g.reputation = Math.max(0, g.reputation - 3); return 'Потеряли клиентов'; }}
      ]
    },
    demand: {
      title:`📢 ${c.name} требует`,
      desc:`${c.name} требует уступить часть рынка.`,
      opts:[
        { label:'Отказать', run:()=>{ c.aggression += 20; c.relationship -= 20; return 'Дерзко'; }},
        { label:'Уступить 5% рынка', run:()=>{ if (c.share + 5 > 60) return 'Они огромны'; c.share += 5; c.aggression -= 30; c.relationship += 10; return 'Уступили'; }},
        { label:'Заплатить 10 000₽', run:()=>{ if (g.cash < 10000) return 'Нет денег'; g.cash -= 10000; c.aggression -= 40; c.relationship += 20; return 'Откупились'; }}
      ]
    },
    offer: {
      title:`📦 ${c.name} предлагает сделку`,
      desc:`${c.name} предлагает торговое соглашение.`,
      opts:[
        { label:'Подписать (30 дн.)', run:()=>{ C.signAgreement(c, 'tradeDeal', 30, { dailyIncome: 400 }); c.relationship += 15; return '+400₽/день'; }},
        { label:'Поторговаться (1 AP)', run:()=>{ if (!NB.spendAp(1)) return 'Нет AP'; const gain = 300 + Math.round(Math.random() * 400); C.signAgreement(c, 'tradeDeal', 30, { dailyIncome: gain }); c.relationship += 10; return `+${NB.money(gain)}/день`; }},
        { label:'Отказаться', run:()=>{ c.relationship -= 5; return 'Отказ'; }}
      ]
    },
    crisis: {
      title:`📉 ${c.name} в кризисе`,
      desc:`${c.name} на грани банкротства.`,
      opts:[
        { label:'Помочь (20 000₽)', run:()=>{ if (g.cash < 20000) return 'Нет денег'; g.cash -= 20000; c.financialHealth += 30; c.relationship += 30; c.aggression = Math.max(0, c.aggression - 20); return 'Благодарны'; }},
        { label:'Поглотить сейчас (60 000₽)', run:()=>{ if (g.cash < 60000) return 'Нет денег'; g.cash -= 60000; C.completeTakeover(c); return `${c.name} поглощён`; }},
        { label:'Пусть падают', run:()=>{ c.financialHealth -= 15; return 'Их проблемы'; }}
      ]
    },
    'merger-offer': {
      title:`🤝 ${c.name} предлагает слияние`,
      desc:`${c.name} предлагает объединиться.`,
      opts:[
        { label:'Принять слияние', action:()=>{
          const gained = Math.round(c.share);
          g.marketShare = Math.min(70, g.marketShare + gained);
          g.reputation = Math.max(0, g.reputation - 10);
          c.alive = false; c.share = 0;
          NB.game.updateMarketShare();
          return `+${gained}% рынка (−10 реп)`;
        }},
        { label:'Отказать', run:()=>{ c.relationship -= 15; return 'Отказ'; }}
      ]
    },
    'price-war-threat': {
      title:`💰 ${c.name} угрожает ценовой войной`,
      desc:`${c.name} готовы демпинговать.`,
      opts:[
        { label:'Ценовой пакт', run:()=>{ C.signAgreement(c, 'pricePact', 20, {}); c.relationship += 15; return 'Пакт подписан'; }},
        { label:'Принять бой', run:()=>{ C.startPriceWar(c); return 'Война'; }}
      ]
    }
  };

  const tpl = templates[evt.type];
  if (!tpl) return;
  const opts = tpl.opts.map((o, i) => `<button type="button" class="event-option" data-competitor-opt="${i}">
    <span class="event-option-label">${o.label}</span>
  </button>`).join('');

  NB.openModal({
    title:'', noSubmit:true, boxClass:'event-modal-box',
    html:`<div class="event-title">${tpl.title}</div>
      <div class="event-desc">${tpl.desc}</div>
      <div class="event-options">${opts}</div>`
  });

  setTimeout(() => {
    NB.$$('[data-competitor-opt]').forEach(btn => btn.addEventListener('click', () => {
      const o = tpl.opts[Number(btn.dataset.competitorOpt)];
      let result = '';
      if (o.action) result = o.action();
      else if (o.run) result = o.run();
      c.history.push({ day: g.daily.dayNumber, type: evt.type, label: o.label, result });
      NB.closeModal();
      NB.notify(`${c.name}: ${result || 'выполнено'}`, 'info');
      NB.save(); NB.render();
    }));
  }, 30);
};

/* ============================================================
   СОГЛАШЕНИЯ
   ============================================================ */
C.signAgreement = function (c, type, days, params) {
  const g = NB.state.game;
  const agreement = {
    type, untilDay: g.daily.dayNumber + days,
    dailyIncome: params.dailyIncome || 0,
    upfrontCost: params.upfrontCost || 0,
    startedDay: g.daily.dayNumber
  };
  if (agreement.upfrontCost > 0) {
    if (g.cash < agreement.upfrontCost) return false;
    g.cash -= agreement.upfrontCost;
  }
  c.agreements.push(agreement);
  c.history.push({ day: g.daily.dayNumber, type, label: `Подписано: ${AGREEMENT_TYPES[type].label}` });
  NB.addLog(`Подписано с ${c.name}: ${AGREEMENT_TYPES[type].label}`, 'success');
  NB.save();
  return true;
};

C.cancelAgreement = function (c, idx) {
  const g = NB.state.game;
  const a = c.agreements[idx];
  if (!a) return;
  c.agreements.splice(idx, 1);
  c.relationship -= 25;
  g.reputation = Math.max(0, g.reputation - 5);
  c.history.push({ day: g.daily.dayNumber, type:'broken', label:`Расторгнуто: ${AGREEMENT_TYPES[a.type].label}` });
  NB.notify(`Расторгнуто: ${AGREEMENT_TYPES[a.type].label} с ${c.name}`, 'warn');
  NB.save(); NB.render();
};

/* ============================================================
   ДЕЙСТВИЯ ИГРОКА (rivals)
   ============================================================ */
C.action = function (id, key) {
  const g = NB.state.game;
  const c = g.competitors.find(x => x.id === id);
  if (!c || !c.alive) return;

  switch (key) {
    case 'negotiate':       return C.openNegotiate(c);
    case 'trade-deal':      return C.openTradeDeal(c);
    case 'non-aggression':  return C.openNonAggression(c);
    case 'shared-backbone': return C.openSharedBackbone(c);
    case 'research':        return C.openResearch(c);
    case 'alliance':        return C.proposeAlliance(c);
    case 'price-war':       return C.startPriceWar(c);
    case 'espionage':       return C.tryEspionage(c);
    case 'buyout':          return C.tryBuyout(c);
    case 'poach':           return C.tryPoach(c);
    case 'propaganda':      return C.runPropaganda(c);
    case 'sabotage':        return C.sabotage(c);
  }
};

C.openNegotiate = function (c) {
  const g = NB.state.game;
  if (g.ap.current < 1) return NB.toast('Нужен 1 AP', 'err');
  const rounds = [
    { q:`${c.name}: Чего ты хочешь?`, opts:[
      { label:'«Мир и сотрудничество»', score:3, hint:'+дружба' },
      { label:'«Просто поговорить»', score:1, hint:'нейтрально' },
      { label:'«Убирайся с моего рынка»', score:-2, hint:'−дружба' }
    ]},
    { q:`${c.name}: У тебя есть что предложить?`, opts:[
      { label:'«Скидка на магистраль»', score:2, hint:'+выгода' },
      { label:'«Ничего»', score:0, hint:'пусто' },
      { label:'«Сам заплати»', score:-1, hint:'−дружба' }
    ]},
    { q:`${c.name}: Договорились?`, opts:[
      { label:'«Да, до встречи»', score:1, hint:'закрыть' },
      { label:'«Ещё раз подумаю»', score:0, hint:'отложить' }
    ]}
  ];
  let idx = 0, score = 0;
  NB.spendAp(1);

  const render = () => {
    if (idx >= rounds.length) return finish();
    const r = rounds[idx];
    const opts = r.opts.map((o, i) => `<button type="button" class="event-option" data-negotiate-opt="${i}">
      <span class="event-option-label">${o.label}</span>
      <span class="event-option-hint">${o.hint}</span>
    </button>`).join('');
    NB.openModal({
      title:'', noSubmit:true, boxClass:'event-modal-box',
      html:`<div class="event-title">🤝 Переговоры · ${c.name}</div>
        <div class="event-desc">${r.q}</div>
        <div class="event-options">${opts}</div>`
    });
    setTimeout(() => {
      NB.$$('[data-negotiate-opt]').forEach(btn => btn.addEventListener('click', () => {
        score += r.opts[Number(btn.dataset.negotiateOpt)].score;
        idx++;
        render();
      }));
    }, 30);
  };

  const finish = () => {
    c.relationship += score * 8;
    c.aggression = Math.max(0, c.aggression - score * 5);
    let result = '';
    if (score >= 5) { g.cash += 5000; c.relationship += 10; result = '+5 000 ₽ и дружба'; }
    else if (score >= 2) { result = 'Тёплая встреча'; }
    else if (score <= -3) { c.aggression += 10; result = 'Испортили отношения'; }
    else result = 'Ничего не решили';
    c.history.push({ day: g.daily.dayNumber, type:'negotiate', label:'Переговоры', result });
    NB.closeModal();
    NB.notify(`${c.name}: ${result}`, score >= 2 ? 'ok' : 'info');
    NB.save(); NB.render();
  };

  render();
};

C.openTradeDeal = function (c) {
  const g = NB.state.game;
  const upfront = 10000;
  const daily = 300 + Math.round(c.share * 5);
  NB.openModal({
    title:'', noSubmit:true, boxClass:'event-modal-box',
    html:`<div class="event-title">📦 Торговое соглашение</div>
      <div class="event-desc">${c.name} готов подписать договор: <b>${NB.money(upfront)}</b> сейчас за <b>${NB.money(daily)}</b>/день на 30 дней.
      ${g.cash < upfront ? '<br><span style="color:#f87171">Не хватает денег</span>' : ''}</div>
      <div class="event-options">
        <button type="button" class="event-option" data-deal="sign"><span class="event-option-label">Подписать (${NB.money(upfront)})</span></button>
        <button type="button" class="event-option" data-deal="close"><span class="event-option-label">Отмена</span></button>
      </div>`
  });
  setTimeout(() => {
    document.querySelectorAll('[data-deal]').forEach(btn => btn.addEventListener('click', () => {
      if (btn.dataset.deal === 'sign') {
        if (g.cash < upfront) { NB.toast('Не хватает', 'err'); return; }
        C.signAgreement(c, 'tradeDeal', 30, { dailyIncome: daily, upfrontCost: upfront });
        c.relationship += 10;
        NB.notify(`${c.name}: +${NB.money(daily)}/день`, 'ok');
      }
      NB.closeModal(); NB.render();
    }));
  }, 30);
};

C.openNonAggression = function (c) {
  const g = NB.state.game;
  const cost = 5000;
  NB.openModal({
    title:'', noSubmit:true, boxClass:'event-modal-box',
    html:`<div class="event-title">🕊 Пакт о ненападении</div>
      <div class="event-desc">${c.name} обещает не атаковать. Стоимость: <b>${NB.money(cost)}</b>. Срок: 30 дней.</div>
      <div class="event-options">
        <button type="button" class="event-option" data-pact="sign"><span class="event-option-label">Подписать</span></button>
        <button type="button" class="event-option" data-pact="close"><span class="event-option-label">Отмена</span></button>
      </div>`
  });
  setTimeout(() => {
    document.querySelectorAll('[data-pact]').forEach(btn => btn.addEventListener('click', () => {
      if (btn.dataset.pact === 'sign') {
        if (g.cash < cost) { NB.toast('Не хватает', 'err'); return; }
        C.signAgreement(c, 'nonAggression', 30, { upfrontCost: cost });
        c.aggression = 0; c.relationship += 20;
        NB.notify(`Пакт с ${c.name}`, 'ok');
      }
      NB.closeModal(); NB.render();
    }));
  }, 30);
};

C.openSharedBackbone = function (c) {
  const g = NB.state.game;
  const cost = 8000;
  NB.openModal({
    title:'', noSubmit:true, boxClass:'event-modal-box',
    html:`<div class="event-title">🔗 Общая магистраль</div>
      <div class="event-desc">Доступ к магистрали ${c.name}: <b>+2 000 Мбит/с</b> на 20 дней. Стоимость: <b>${NB.money(cost)}</b>.</div>
      <div class="event-options">
        <button type="button" class="event-option" data-bb="sign"><span class="event-option-label">Подписать</span></button>
        <button type="button" class="event-option" data-bb="close"><span class="event-option-label">Отмена</span></button>
      </div>`
  });
  setTimeout(() => {
    document.querySelectorAll('[data-bb]').forEach(btn => btn.addEventListener('click', () => {
      if (btn.dataset.bb === 'sign') {
        if (g.cash < cost) { NB.toast('Не хватает', 'err'); return; }
        C.signAgreement(c, 'sharedBackbone', 20, { upfrontCost: cost });
        c.relationship += 15;
        NB.notify(`Магистраль открыта`, 'ok');
      }
      NB.closeModal(); NB.render();
    }));
  }, 30);
};

C.openResearch = function (c) {
  const g = NB.state.game;
  const cost = 15000;
  NB.openModal({
    title:'', noSubmit:true, boxClass:'event-modal-box',
    html:`<div class="event-title">🧪 Совместные R&D</div>
      <div class="event-desc">Инвестировать в разработку с ${c.name}: <b>${NB.money(cost)}</b>.</div>
      <div class="event-options">
        <button type="button" class="event-option" data-rd="sign"><span class="event-option-label">Инвестировать</span></button>
        <button type="button" class="event-option" data-rd="close"><span class="event-option-label">Отмена</span></button>
      </div>`
  });
  setTimeout(() => {
    document.querySelectorAll('[data-rd]').forEach(btn => btn.addEventListener('click', () => {
      if (btn.dataset.rd === 'sign') {
        if (g.cash < cost) { NB.toast('Не хватает', 'err'); return; }
        C.signAgreement(c, 'research', 30, { upfrontCost: cost });
        c.relationship += 20;
        NB.notify(`Совместные R&D с ${c.name}`, 'ok');
      }
      NB.closeModal(); NB.render();
    }));
  }, 30);
};

C.proposeAlliance = function (c) {
  const g = NB.state.game;
  if (c.relationship < 40) return NB.toast(`Нужны отношения ≥ 40 (сейчас ${Math.round(c.relationship)})`, 'err');
  if (c.agreements.some(a => a.type === 'alliance')) return NB.toast('Уже в союзе', 'err');
  NB.openModal({
    title:'', noSubmit:true, boxClass:'event-modal-box',
    html:`<div class="event-title">⚔ Военный союз</div>
      <div class="event-desc">${c.name} готов вступить в союз.</div>
      <div class="event-options">
        <button type="button" class="event-option" data-ally="yes"><span class="event-option-label">Заключить союз</span></button>
        <button type="button" class="event-option" data-ally="no"><span class="event-option-label">Отмена</span></button>
      </div>`
  });
  setTimeout(() => {
    document.querySelectorAll('[data-ally]').forEach(btn => btn.addEventListener('click', () => {
      if (btn.dataset.ally === 'yes') {
        C.signAgreement(c, 'alliance', 60, {});
        c.aggression = 0; c.relationship += 30;
        NB.notify(`⚔ Союз с ${c.name}`, 'ok');
      }
      NB.closeModal(); NB.render();
    }));
  }, 30);
};

C.startPriceWar = function (c) {
  const g = NB.state.game;
  if (c.priceWarUntil > g.daily.dayNumber) return NB.toast('Война уже идёт', 'err');
  if (g.cash < 20000) return NB.toast('Нужно 20 000 ₽', 'err');
  g.cash -= 20000;
  c.priceWarUntil = g.daily.dayNumber + 10;
  c.aggression += 30;
  c.relationship -= 30;
  c.history.push({ day: g.daily.dayNumber, type:'price-war', label:'Ценовая война' });
  NB.notify(`💰 Ценовая война с ${c.name}`, 'warn');
  NB.addLog(`Ценовая война: 10 дней`, 'warn');
  NB.save(); NB.render();
};

C.tryEspionage = function (c) {
  const g = NB.state.game;
  if (g.ap.current < 2) return NB.toast('Нужно 2 AP', 'err');
  if (g.cash < 15000) return NB.toast('Нужно 15 000 ₽', 'err');
  NB.spendAp(2); g.cash -= 15000;
  c.spyAttempts++;
  const success = Math.random() < 0.4 + g.company.level * 0.03 - c.techLevel * 0.05;
  if (success) {
    c.techLevel = Math.max(1, c.techLevel - 1);
    g.world.flags.stolenTechs = (g.world.flags.stolenTechs || 0) + 1;
    NB.addCompanyXp(20);
    NB.notify(`🕵 Шпионаж удался: -1 тех. ур. ${c.name}`, 'ok');
    NB.addLog(`Шпионаж: украли технологию ${c.name}`, 'success');
  } else {
    c.relationship -= 40; c.aggression += 25;
    g.reputation = Math.max(0, g.reputation - 5);
    NB.notify(`🕵 Шпионаж провалился`, 'warn');
  }
  c.history.push({ day: g.daily.dayNumber, type:'espionage', label: success ? 'Успех' : 'Провал' });
  NB.save(); NB.render();
};

C.tryBuyout = function (c) {
  const g = NB.state.game;
  if (c.share > 15) return NB.toast(`Поглощение возможно при доле < 15% (сейчас ${Math.round(c.share)}%)`, 'err');
  if (c.takeoverProgress > 0) return NB.toast(`Поглощение идёт: ${c.takeoverProgress}%`, 'info');
  const cost = 60000;
  if (g.cash < cost) return NB.toast(`Нужно ${NB.money(cost)}`, 'err');
  g.cash -= cost;
  c.takeoverProgress = 10;
  c.history.push({ day: g.daily.dayNumber, type:'buyout', label:'Начато поглощение' });
  NB.notify(`💼 Поглощение ${c.name} начато`, 'ok');
  NB.save(); NB.render();
};

C.completeTakeover = function (c) {
  const g = NB.state.game;
  const gained = Math.round(c.share);
  g.marketShare = Math.min(70, g.marketShare + gained);
  c.alive = false;
  c.share = 0;
  c.takeoverProgress = 100;
  NB.confetti();
  NB.notify(`🏆 ${c.name} поглощён: +${gained}% рынка`, 'ok');
  NB.addLog(`Поглощён конкурент: ${c.name}`, 'success');
  c.history.push({ day: g.daily.dayNumber, type:'taken-over', label:'Поглощён' });
  NB.game.updateMarketShare();
};

C.tryPoach = function (c) {
  const g = NB.state.game;
  if (g.ap.current < 1) return NB.toast('Нужен 1 AP', 'err');
  NB.spendAp(1);
  const success = Math.random() < 0.4 + c.relationship / 200;
  if (success) {
    const stolen = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < stolen; i++) {
      const t = NB.pick(NB.state.tariffs);
      NB.state.clients.push({
        id: NB.state.seq.client++,
        name: NB.genName(), address: NB.genAddress(), phone: NB.genPhone(),
        tariffId: t.id, balance: 0, status: 'active',
        createdAt: new Date().toISOString(), password: NB.DEFAULT_PASS,
        isDrone: false, risk: 'normal', revealed: true
      });
    }
    c.share = Math.max(0, c.share - stolen * 0.5);
    c.relationship -= 15; c.aggression += 10;
    NB.notify(`🕵 Переманили ${stolen} клиентов`, 'ok');
    NB.addLog(`Переманено ${stolen} клиентов у ${c.name}`, 'success');
  } else {
    c.relationship -= 10; c.aggression += 5;
    NB.notify(`🕵 Не удалось переманить`, 'warn');
  }
  NB.game.updateMarketShare();
  NB.save(); NB.render();
};

C.runPropaganda = function (c) {
  const g = NB.state.game;
  if (g.ap.current < 1) return NB.toast('Нужен 1 AP', 'err');
  if (g.cash < 10000) return NB.toast('Нужно 10 000 ₽', 'err');
  NB.spendAp(1); g.cash -= 10000;
  c.share = Math.max(0, c.share - 2);
  g.marketShare = Math.min(70, g.marketShare + 1);
  c.relationship -= 25; c.aggression += 15;
  NB.notify(`📢 Пропаганда: ${c.name} теряет позиции`, 'ok');
  NB.game.updateMarketShare();
  NB.save(); NB.render();
};

C.sabotage = function (c) {
  const g = NB.state.game;
  if (g.ap.current < 2) return NB.toast('Нужно 2 AP', 'err');
  if (g.cash < 10000) return NB.toast('Нужно 10 000 ₽', 'err');
  NB.spendAp(2); g.cash -= 10000;
  c.sabotageCount++;
  const success = Math.random() < 0.5 - c.relationship / 200;
  if (success) {
    c.financialHealth = Math.max(0, c.financialHealth - 25);
    c.share = Math.max(0, c.share - 3);
    c.relationship -= 30; c.aggression += 20;
    NB.notify(`💀 Саботаж удался: -3% рынка`, 'ok');
    NB.addLog(`Саботаж: ${c.name} повреждён`, 'success');
  } else {
    c.relationship -= 50; c.aggression += 30;
    g.reputation = Math.max(0, g.reputation - 10);
    NB.notify(`⚠ Саботаж провалился`, 'warn');
  }
  c.history.push({ day: g.daily.dayNumber, type:'sabotage', label: success ? 'Успех' : 'Провал' });
  NB.game.updateMarketShare();
  NB.save(); NB.render();
};

C.bankrupt = function (c) {
  c.alive = false;
  c.share = 0;
  c.diedDay = NB.state.game.daily.dayNumber;
  NB.notify(`📉 ${c.name} обанкротился`, 'warn');
  NB.addLog(`${c.name} обанкротился`, 'info');
  c.history.push({ day: NB.state.game.daily.dayNumber, type:'bankrupt', label:'Банкротство' });
  NB.game.updateMarketShare();
};

/* ============================================================
   ДЕЙСТВИЯ С УГРОЗАМИ
   ============================================================ */
C.actionThreat = function (id, key) {
  const g = NB.state.game;
  const t = g.world.threats.find(x => x.id === id);
  if (!t || !t.alive) return;

  switch (key) {
    case 'fight':      return C.fightThreat(t);
    case 'pay':        return C.payThreat(t);
    case 'negotiate':  return C.negotiateThreat(t);
    case 'ambush':     return C.ambushThreat(t);
    case 'ignore':     return C.ignoreThreat(t);
  }
};

C.combatPower = function () {
  const warriors = NB.state.game.employees.filter(e => e.spec === 'warrior');
  return warriors.reduce((s, e) => s + (e.combat?.attack || 0) + (e.combat?.defense || 0), 0);
};

C.fightThreat = function (t) {
  const g = NB.state.game;
  const warriors = g.employees.filter(e => e.spec === 'warrior' && e.ap.current >= 1);
  if (warriors.length === 0) return NB.toast('Нет доступных воинов', 'err');
  const power = C.combatPower();
  const chance = Math.min(0.9, power / (t.power + power));

  warriors.forEach(w => NB.employees.spendAp(w.id, 1));

  if (Math.random() < chance) {
    t.alive = false;
    t.diedDay = g.daily.dayNumber;
    g.cash += t.loot;
    g.reputation = Math.min(100, g.reputation + 5);
    warriors.forEach(w => NB.employees.levelUp(w.id));
    NB.notify(`⚔ ${t.name} разбиты. +${NB.money(t.loot)}`, 'ok');
    NB.addLog(`Отбита угроза: ${t.name} (+${NB.money(t.loot)})`, 'success');
  } else {
    const losses = Math.min(warriors.length, 1 + Math.floor(Math.random() * 2));
    for (let i = 0; i < losses; i++) {
      const w = warriors[i];
      g.employees = g.employees.filter(e => e.id !== w.id);
      NB.addLog(`Воин ${w.name} погиб в бою с ${t.name}`, 'warn');
    }
    g.reputation = Math.max(0, g.reputation - 3);
    t.aggression = Math.min(100, t.aggression + 20);
    NB.notify(`⚔ Бой с ${t.name} проигран. Потери: ${losses}`, 'warn');
  }
  NB.save(); NB.render();
};

C.payThreat = function (t) {
  const g = NB.state.game;
  const cost = Math.round(t.loot * 0.6);
  if (g.cash < cost) return NB.toast(`Нужно ${NB.money(cost)}`, 'err');
  g.cash -= cost;
  t.alive = false;
  t.diedDay = g.daily.dayNumber;
  t.aggression = 0;
  NB.notify(`💰 Откупились от ${t.name} (${NB.money(cost)})`, 'info');
  NB.addLog(`Откуп: ${t.name}`, 'info');
  NB.save(); NB.render();
};

C.negotiateThreat = function (t) {
  const g = NB.state.game;
  if (g.ap.current < 1) return NB.toast('Нужен 1 AP', 'err');
  NB.spendAp(1);
  const chance = t.type === 'bandit' ? 0.55 : t.type === 'raider' ? 0.3 : 0.15;
  if (Math.random() < chance) {
    t.aggression = Math.max(0, t.aggression - 40);
    g.reputation = Math.min(100, g.reputation + 2);
    NB.notify(`🤝 Удалось договориться с ${t.name}`, 'ok');
    NB.addLog(`Переговоры: ${t.name} отступили`, 'success');
  } else {
    t.aggression = Math.min(100, t.aggression + 25);
    NB.notify(`❌ ${t.name} не идут на контакт`, 'warn');
  }
  NB.save(); NB.render();
};

C.ambushThreat = function (t) {
  const g = NB.state.game;
  if (g.ap.current < 2) return NB.toast('Нужно 2 AP', 'err');
  if (C.combatPower() < t.power * 0.5) return NB.toast('Слишком слабый отряд для засады', 'err');
  NB.spendAp(2);
  const chance = 0.5 + (C.combatPower() - t.power) / 200;
  if (Math.random() < chance) {
    const loot = Math.round(t.loot * 1.5);
    g.cash += loot;
    g.reputation = Math.min(100, g.reputation + 8);
    t.alive = false; t.diedDay = g.daily.dayNumber;
    NB.notify(`🎯 Засада удалась! +${NB.money(loot)}`, 'ok');
    NB.addLog(`Засада: ${t.name} уничтожены (+${NB.money(loot)})`, 'success');
  } else {
    const warriors = g.employees.filter(e => e.spec === 'warrior');
    if (warriors.length > 0) {
      const w = NB.pick(warriors);
      g.employees = g.employees.filter(e => e.id !== w.id);
      NB.addLog(`Засада провалена. ${w.name} погиб`, 'warn');
    }
    t.aggression = Math.min(100, t.aggression + 30);
    NB.notify(`⚠ Засада провалилась`, 'warn');
  }
  NB.save(); NB.render();
};

C.ignoreThreat = function (t) {
  const g = NB.state.game;
  t.aggression = Math.min(100, t.aggression + 10);
  g.reputation = Math.max(0, g.reputation - 1);
  NB.toast(`${t.name} проигнорированы. Агрессия растёт.`, 'info');
  NB.save(); NB.render();
};

/* ============================================================
   РЕНДЕР
   ============================================================ */
C.renderView = function () {
  const g = NB.state.game;
  if (!g.unlocks.competitors) return '<div class="panel"><p class="empty">Появится, когда компания станет заметной</p></div>';
  if (g.world.era === 'threats') return C.renderThreats();
  return C.renderRivals();
};

C.renderRivals = function () {
  const g = NB.state.game;
  if (g.competitors.length === 0) C.generate();
  const alive = g.competitors.filter(c => c.alive);
  const activeAgreements = [];
  alive.forEach(c => c.agreements.forEach((a, i) => activeAgreements.push({ c, a, idx: i })));
  const sunset = !!g.world.transitionStartedDay;

  return `<div class="page-head">
    <div><h1>Конкуренты</h1><p class="muted">${sunset ? '🌇 Рынок рушится — корпорации падают одна за другой' : 'Рынок, отношения и сделки'}</p></div>
  </div>
  ${sunset ? '<div class="ultimatum-banner" style="border-color:#f59e0b;background:linear-gradient(135deg,rgba(245,158,11,.15),rgba(120,80,0,.2))"><h3 style="color:#fbbf24">🌇 Закат корпораций</h3><p style="color:#fbbf24">После гала-вечера рынок рушится. Корпорации гибнут одна за другой. Скоро их место займут рейдеры, бандиты и дроны.</p></div>' : ''}
  <div class="panel" style="margin-bottom:12px">
    <div class="panel-head"><h2>Доля рынка</h2><span class="muted small">${alive.length} активных</span></div>
    <div class="market-bar">
      <i style="width:${g.marketShare}%;background:linear-gradient(90deg,var(--primary),var(--primary-2))"></i>
      ${alive.map(c => `<i style="width:${c.share}%;background:${c.color}"></i>`).join('')}
    </div>
    <div class="market-legend">
      <span><i style="background:linear-gradient(90deg,var(--primary),var(--primary-2))"></i>NetBill ${g.marketShare}%</span>
      ${alive.map(c => `<span style="opacity:${c.alive?1:.4}"><i style="background:${c.color}"></i>${NB.esc(c.name)} ${Math.round(c.share*10)/10}%</span>`).join('')}
    </div>
  </div>
  ${activeAgreements.length ? `<div class="panel" style="margin-bottom:12px;border-left:3px solid #22c55e">
    <div class="panel-head"><h2>📋 Активные соглашения</h2></div>
    <div class="agreements-list">
      ${activeAgreements.map(({c, a, idx}) => {
        const meta = AGREEMENT_TYPES[a.type];
        const left = a.untilDay ? Math.max(0, a.untilDay - g.daily.dayNumber) : '∞';
        return `<div class="agreement-row">
          <span class="agreement-icon" style="color:${meta.color}">${meta.icon}</span>
          <div class="agreement-info">
            <b>${NB.esc(c.name)}</b>
            <small>${meta.label} · ${left} дн.${a.dailyIncome ? ` · +${NB.money(a.dailyIncome)}/день` : ''}</small>
          </div>
          <button class="btn danger small" data-action="cancel-agreement" data-id="${c.id}" data-idx="${idx}">Расторгнуть</button>
        </div>`;
      }).join('')}
    </div>
  </div>` : ''}
  <div class="comp-list">
    ${g.competitors.map(c => C.renderRow(c)).join('')}
  </div>`;
};

C.renderRow = function (c) {
  const g = NB.state.game;
  const pers = PERSONALITY[c.personality] || PERSONALITY.cautious;
  const mood = c.mood === 'friendly' ? 'friendly' : c.mood === 'hostile' ? 'hostile' : 'neutral';
  const moodLabel = { friendly:'Дружелюбный', hostile:'Враждебный', neutral:'Нейтральный' }[mood];
  const relBarWidth = Math.round((c.relationship + 100) / 2);
  const relColor = c.relationship > 20 ? '#4ade80' : c.relationship < -20 ? '#f87171' : '#fbbf24';
  const inPriceWar = c.priceWarUntil > g.daily.dayNumber;
  const agreementsCount = c.agreements.length;
  const sunset = !!g.world.transitionStartedDay;

  if (!c.alive) {
    return `<div class="comp-row dead">
      <div class="comp-logo" style="background:${c.color}">${NB.initials(c.name)}</div>
      <div class="comp-body"><b>${NB.esc(c.name)}</b><small>${NB.esc(c.desc)}</small><span class="comp-mood neutral">Обанкротился</span></div>
      <div class="comp-share">0%<small>доля</small></div>
    </div>`;
  }

  return `<div class="comp-row ${inPriceWar ? 'price-war' : ''} ${sunset ? 'declining' : ''}">
    <div class="comp-logo" style="background:${c.color}">${NB.initials(c.name)}</div>
    <div class="comp-body">
      <b>${NB.esc(c.name)} <span class="comp-personality" title="${pers.desc}">${pers.icon} ${pers.label}</span></b>
      <small>${NB.esc(c.desc)} · 💰 ${c.financialHealth}/100 · 🔬 ${c.techLevel}/5${inPriceWar ? ' · 💰 ВОЙНА' : ''}${sunset ? ' · 🌇 УГАСАЕТ' : ''}</small>
      <div class="comp-mood-row">
        <span class="comp-mood ${mood}">${moodLabel}</span>
        <div class="rel-bar" title="Отношения: ${Math.round(c.relationship)}"><i style="width:${relBarWidth}%;background:${relColor}"></i></div>
        ${agreementsCount > 0 ? `<span class="comp-badge">${agreementsCount} согл.</span>` : ''}
      </div>
    </div>
    <div class="comp-share">${Math.round(c.share*10)/10}%<small>доля</small></div>
    <div class="comp-actions">
      <button class="btn ghost small" data-action="competitor-action" data-id="${c.id}" data-key="negotiate" title="Переговоры (1 AP)">🤝</button>
      <button class="btn ghost small" data-action="competitor-action" data-id="${c.id}" data-key="trade-deal" title="Торговое соглашение">📦</button>
      <button class="btn ghost small" data-action="competitor-action" data-id="${c.id}" data-key="non-aggression" title="Пакт о ненападении">🕊</button>
      <button class="btn ghost small" data-action="competitor-action" data-id="${c.id}" data-key="shared-backbone" title="Общая магистраль">🔗</button>
      <button class="btn ghost small" data-action="competitor-action" data-id="${c.id}" data-key="research" title="Совместные R&D">🧪</button>
      <button class="btn ghost small" data-action="competitor-action" data-id="${c.id}" data-key="alliance" title="Военный союз" ${c.relationship < 40 ? 'disabled' : ''}>⚔</button>
      <button class="btn ghost small" data-action="competitor-action" data-id="${c.id}" data-key="price-war" title="Ценовая война (20k)">💰</button>
      <button class="btn ghost small" data-action="competitor-action" data-id="${c.id}" data-key="espionage" title="Шпионаж (2 AP, 15k)">🕵</button>
      <button class="btn ghost small" data-action="competitor-action" data-id="${c.id}" data-key="poach" title="Переманить клиентов (1 AP)">👥</button>
      <button class="btn ghost small" data-action="competitor-action" data-id="${c.id}" data-key="propaganda" title="Пропаганда (1 AP, 10k)">📢</button>
      <button class="btn ghost small" data-action="competitor-action" data-id="${c.id}" data-key="buyout" title="Поглотить (60k, доля &lt; 15%)" ${c.share > 15 ? 'disabled' : ''}>💼</button>
      <button class="btn ghost small" data-action="competitor-action" data-id="${c.id}" data-key="sabotage" title="Саботаж (2 AP, 10k)" style="color:#f87171">💀</button>
    </div>
  </div>`;
};

C.renderThreats = function () {
  const g = NB.state.game;
  const threats = (g.world.threats || []).filter(t => t.alive);
  const warriors = g.employees.filter(e => e.spec === 'warrior');
  const combatPower = C.combatPower();

  return `<div class="page-head">
    <div><h1>Угрозы</h1><p class="muted">${threats.length} активных · ⚔ Боевая мощь: ${combatPower}</p></div>
  </div>
  <div class="panel" style="margin-bottom:12px;border-left:3px solid #ef4444">
    <div class="panel-head"><h2>⚔ Готовность</h2></div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
      <div class="traffic-stat ${warriors.length>0?'ok':'bad'}"><b>${warriors.length}</b><small>воинов</small></div>
      <div class="traffic-stat ${combatPower>50?'ok':combatPower>0?'warn':'bad'}"><b>${combatPower}</b><small>мощь</small></div>
      <div class="traffic-stat ${g.world.bunker.food>5?'ok':'warn'}"><b>${g.world.bunker.food||0}</b><small>еда</small></div>
    </div>
  </div>
  ${threats.length ? threats.map(t => C.renderThreat(t)).join('') : '<div class="panel"><p class="empty">Пока тихо. Угрозы появятся позже.</p></div>'}`;
};

C.renderThreat = function (t) {
  const g = NB.state.game;
  const meta = THREAT_TYPES[t.type];
  const powerRatio = C.combatPower() > 0 ? Math.min(200, Math.round(C.combatPower() / t.power * 100)) : 0;
  const danger = t.aggression >= 70 ? 'danger' : t.aggression >= 40 ? 'warn' : 'calm';
  return `<div class="threat-row threat-${t.type} ${danger}">
    <div class="threat-icon" style="color:${meta.color}">${meta.icon}</div>
    <div class="threat-body">
      <b>${NB.esc(t.name)}</b>
      <small>${meta.desc} · Сила: ${t.power} · Лут: ${NB.money(t.loot)}</small>
      <div class="threat-bars">
        <div class="threat-bar" title="Агрессия: ${t.aggression}">
          <span>Агрессия</span>
          <div class="threat-bar-track"><i style="width:${t.aggression}%;background:${t.aggression>=70?'#ef4444':t.aggression>=40?'#f59e0b':'#4ade80'}"></i></div>
        </div>
        <div class="threat-bar" title="Ваша мощь vs угроза: ${powerRatio}%">
          <span>Мощь</span>
          <div class="threat-bar-track"><i style="width:${Math.min(100,powerRatio)}%;background:#3b82f6"></i></div>
        </div>
      </div>
    </div>
    <div class="threat-actions">
      <button class="btn primary small" data-action="threat-action" data-id="${t.id}" data-key="fight" title="Отбить (нужны воины)">⚔ Бой</button>
      <button class="btn ghost small" data-action="threat-action" data-id="${t.id}" data-key="ambush" title="Засада (2 AP, мощь ≥ 50%)">🎯</button>
      <button class="btn ghost small" data-action="threat-action" data-id="${t.id}" data-key="negotiate" title="Переговоры (1 AP)">🤝</button>
      <button class="btn ghost small" data-action="threat-action" data-id="${t.id}" data-key="pay" title="Откупиться (${NB.money(Math.round(t.loot*0.6))})">💰</button>
      <button class="btn ghost small" data-action="threat-action" data-id="${t.id}" data-key="ignore" title="Игнорировать">👀</button>
    </div>
  </div>`;
};

})(window);