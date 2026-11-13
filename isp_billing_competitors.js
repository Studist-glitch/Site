/* isp_billing_competitors.js — глубокое взаимодействие с корпорациями */
(function (global) {
'use strict';
const NB = global.NB;
const C = NB.competitors = NB.competitors || {};

/* ============================================================
   ПУЛ КОМПАНИЙ С ХАРАКТЕРАМИ
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
  aggressive:  { label:'Агрессор',  icon:'⚔', desc:'Быстро наращивает агрессию, часто атакует' },
  cautious:    { label:'Осторожный',icon:'🛡', desc:'Держит дистанцию, редко атакует первым' },
  opportunist: { label:'Оппортунист',icon:'🎲',desc:'Действует по ситуации, ценит выгоду' },
  idealist:    { label:'Идеалист',  icon:'🌱', desc:'Готов на союзы, ценит репутацию' }
};

const AGREEMENT_TYPES = {
  tradeDeal:      { label:'Торговое соглашение', icon:'📦', color:'#22c55e' },
  nonAggression:  { label:'Пакт о ненападении',  icon:'🕊', color:'#38bdf8' },
  sharedBackbone: { label:'Общая магистраль',    icon:'🔗', color:'#a855f7' },
  pricePact:      { label:'Ценовой пакт',        icon:'💰', color:'#fbbf24' },
  research:       { label:'Совместные R&D',      icon:'🧪', color:'#f97316' },
  alliance:       { label:'Военный союз',        icon:'⚔',  color:'#ef4444' }
};

/* ============================================================
   ГЕНЕРАЦИЯ РЫНКА
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
      priceWarStartedBy: null,
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
   ДНЕВНОЙ ТИК
   ============================================================ */
C.tick = function () {
  const g = NB.state.game;
  if (!g.unlocks.competitors) return;
  if (g.competitors.length === 0) C.generate();
  const day = g.daily.dayNumber;

  g.competitors.forEach(c => {
    if (!c.alive) return;

    /* Обработка соглашений */
    c.agreements.forEach(a => {
      if (a.untilDay && day > a.untilDay) {
        a.expired = true;
        c.history.push({ day, type:'expired', label:`Истекло: ${AGREEMENT_TYPES[a.type].label}` });
        NB.addLog(`Соглашение с ${c.name} истекло: ${AGREEMENT_TYPES[a.type].label}`, 'info');
      } else {
        C.applyAgreement(c, a, day);
      }
    });
    c.agreements = c.agreements.filter(a => !a.expired);

    /* Дрейф отношений */
    c.relationship += (0 - c.relationship) * 0.02;
    c.relationship = Math.max(-100, Math.min(100, c.relationship));

    /* Агрессия утихает */
    c.aggression = Math.max(0, c.aggression - 0.3);

    /* Настроение */
    c.mood = c.relationship >= 30 ? 'friendly' : c.relationship <= -30 ? 'hostile' : 'neutral';

    /* Финансы */
    if (c.financialHealth > 60) c.share += NB.rand(-0.05, 0.15);
    else c.share -= NB.rand(0, 0.25);
    c.share = Math.max(0, c.share);

    /* Ценовая война */
    if (c.priceWarUntil > day) {
      c.financialHealth = Math.max(0, c.financialHealth - 1.5);
      c.share = Math.max(0, c.share - 0.3);
      /* Игрок тоже теряет */
      g.cash -= 500;
      g.reputation = Math.max(0, g.reputation - 0.5);
    }

    /* Прогресс поглощения */
    if (c.takeoverProgress > 0 && c.takeoverProgress < 100) {
      const inc = Math.round(5 + g.company.level * 2);
      c.takeoverProgress = Math.min(100, c.takeoverProgress + inc);
      if (c.takeoverProgress >= 100) C.completeTakeover(c);
    }

    /* Банкротство */
    if (c.financialHealth < 10 && Math.random() < 0.05) C.bankrupt(c);

    /* Спонтанные действия конкурента */
    C.maybeAct(c);
  });

  NB.game.updateMarketShare();
  NB.save();
};

/* ============================================================
   ПРИМЕНЕНИЕ СОГЛАШЕНИЙ
   ============================================================ */
C.applyAgreement = function (c, a, day) {
  const g = NB.state.game;
  switch (a.type) {
    case 'tradeDeal':
      g.cash += a.dailyIncome;
      NB.addLog(`📦 ${c.name}: +${NB.money(a.dailyIncome)} по договору`, 'success');
      break;
    case 'sharedBackbone':
      /* +трафик: применяется через временный бонус в upgrades */
      break;
    case 'pricePact':
      g.cash += Math.round(200 + g.company.level * 100);
      break;
    case 'research':
      if (day % 3 === 0 && c.techLevel < 5) c.techLevel++;
      break;
    case 'alliance':
      /* Уменьшает атаки на обоих */
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
   ДЕЙСТВИЯ КОНКУРЕНТОВ
   ============================================================ */
C.maybeAct = function (c) {
  const g = NB.state.game;
  const roll = Math.random();

  /* Союз — не атакует */
  if (c.agreements.some(a => a.type === 'alliance' || a.type === 'nonAggression')) return;

  const hostiles = c.mood === 'hostile' || c.aggression > 50;
  if (hostiles && roll < 0.08 * (1 + c.aggression / 100)) {
    C.queueEvent(c, 'attack');
    return;
  }
  if (hostiles && roll < 0.15) {
    C.queueEvent(c, 'demand');
    return;
  }
  if (c.mood === 'friendly' && roll < 0.05) {
    C.queueEvent(c, 'offer');
    return;
  }
  if (c.financialHealth < 30 && roll < 0.1) {
    C.queueEvent(c, 'crisis');
    return;
  }
  if (c.share < 15 && c.relationship > 20 && roll < 0.03) {
    C.queueEvent(c, 'merger-offer');
    return;
  }
  /* Оппортунист: ценовая война */
  if (c.personality === 'opportunist' && c.aggression > 30 && roll < 0.04) {
    C.queueEvent(c, 'price-war-threat');
  }
};

C.queueEvent = function (c, type) {
  const g = NB.state.game;
  if (!g.world.competitorQueue) g.world.competitorQueue = [];
  if (g.world.competitorQueue.some(e => e.competitorId === c.id)) return;
  g.world.competitorQueue.push({ competitorId: c.id, type });
};

C.processQueue = function () {
  const g = NB.state.game;
  if (!g.world.competitorQueue || !g.world.competitorQueue.length) return;
  /* Не показываем, если уже есть модалка или сюжет */
  const modal = document.getElementById('modal');
  if (modal && !modal.classList.contains('hidden')) return;
  if (g.activeEvent) return;
  if (g.world.storyQueue && g.world.storyQueue.length) return;
  const evt = g.world.competitorQueue.shift();
  C.showEvent(evt);
};

/* ============================================================
   СОБЫТИЯ ОТ КОНКУРЕНТОВ
   ============================================================ */
C.showEvent = function (evt) {
  const g = NB.state.game;
  const c = g.competitors.find(x => x.id === evt.competitorId);
  if (!c || !c.alive) return;

  const templates = {
    attack: {
      title:`⚔ ${c.name} атакует`,
      desc:`${c.name} начал агрессивную кампанию: демпингует цены и переманивает клиентов.`,
      opts:[
        { label:'Ответить (1 AP)', run:()=>{
          if (!NB.spendAp(1)) return 'Нет AP';
          c.aggression = Math.max(0, c.aggression - 15);
          c.relationship = Math.max(-100, c.relationship - 10);
          g.reputation = Math.min(100, g.reputation + 2);
          return `${c.name} отступил`;
        }},
        { label:'Ценовая война (2 AP)', run:()=>{
          if (!NB.spendAp(2)) return 'Нет AP';
          C.startPriceWar(c);
          return 'Война началась';
        }},
        { label:'Уступить (5 000₽)', run:()=>{
          if (g.cash < 5000) return 'Нет денег';
          g.cash -= 5000;
          c.aggression = Math.max(0, c.aggression - 20);
          c.relationship = Math.min(100, c.relationship + 10);
          return 'Откупились';
        }},
        { label:'Проигнорировать', run:()=>{
          c.share += 2;
          c.aggression += 5;
          g.reputation = Math.max(0, g.reputation - 3);
          return 'Потеряли клиентов';
        }}
      ]
    },
    demand: {
      title:`📢 ${c.name} требует`,
      desc:`${c.name} требует уступить часть рынка. «Или мы сделаем больно».`,
      opts:[
        { label:'Отказать', run:()=>{ c.aggression += 20; c.relationship -= 20; return 'Дерзко'; }},
        { label:'Уступить 5% рынка', run:()=>{ if (c.share + 5 > 60) return 'Они и так огромны'; c.share += 5; c.aggression -= 30; c.relationship += 10; return 'Уступили'; }},
        { label:'Заплатить 10 000₽', run:()=>{ if (g.cash < 10000) return 'Нет денег'; g.cash -= 10000; c.aggression -= 40; c.relationship += 20; return 'Откупились'; }}
      ]
    },
    offer: {
      title:`📦 ${c.name} предлагает сделку`,
      desc:`${c.name} предлагает торговое соглашение: они делятся частью клиентов и дают доступ к своей инфраструктуре.`,
      opts:[
        { label:'Подписать (30 дн.)', run:()=>{
          C.signAgreement(c, 'tradeDeal', 30, { dailyIncome: 400, upfrontCost: 0 });
          c.relationship += 15;
          return 'Договор подписан: +400₽/день';
        }},
        { label:'Поторговаться (1 AP)', run:()=>{
          if (!NB.spendAp(1)) return 'Нет AP';
          const gain = 300 + Math.round(Math.random() * 400);
          C.signAgreement(c, 'tradeDeal', 30, { dailyIncome: gain, upfrontCost: 0 });
          c.relationship += 10;
          return `Договор подписан: +${NB.money(gain)}/день`;
        }},
        { label:'Отказаться', run:()=>{ c.relationship -= 5; return 'Отказ'; }}
      ]
    },
    crisis: {
      title:`📉 ${c.name} в кризисе`,
      desc:`${c.name} на грани банкротства. Они ищут спасения.`,
      opts:[
        { label:'Помочь (20 000₽)', run:()=>{
          if (g.cash < 20000) return 'Нет денег';
          g.cash -= 20000;
          c.financialHealth += 30;
          c.relationship += 30;
          c.aggression = Math.max(0, c.aggression - 20);
          return 'Они благодарны';
        }},
        { label:'Поглотить сейчас (60 000₽)', run:()=>{
          if (g.cash < 60000) return 'Нет денег';
          g.cash -= 60000;
          C.completeTakeover(c);
          return `${c.name} поглощён`;
        }},
        { label:'Пусть падают', run:()=>{
          c.financialHealth -= 15;
          return 'Их проблемы';
        }}
      ]
    },
    'merger-offer': {
      title:`🤝 ${c.name} предлагает слияние`,
      desc:`${c.name} предлагает объединиться. Их рынок станет вашим, но они хотят долю в вашей компании.`,
      opts:[
        { label:'Принять слияние', action:()=>{
          const gained = Math.round(c.share);
          g.marketShare = Math.min(70, g.marketShare + gained);
          g.reputation = Math.max(0, g.reputation - 10);
          g.world.flags.mergerTaken = true;
          c.alive = false; c.share = 0;
          NB.game.updateMarketShare();
          return `Слияние: +${gained}% рынка (но −10 реп)`;
        }},
        { label:'Отказать', run:()=>{ c.relationship -= 15; return 'Отказ'; }}
      ]
    },
    'price-war-threat': {
      title:`💰 ${c.name} угрожает ценовой войной`,
      desc:`${c.name} готовы демпинговать. Это ударит по обоим.`,
      opts:[
        { label:'Заключить ценовой пакт', run:()=>{
          C.signAgreement(c, 'pricePact', 20, {});
          c.relationship += 15;
          return 'Пакт подписан: +доход/день';
        }},
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
    NB.$$('[data-competitor-opt]').forEach(btn => {
      btn.addEventListener('click', () => {
        const o = tpl.opts[Number(btn.dataset.competitorOpt)];
        let result = '';
        if (o.action) result = o.action();
        else if (o.run) result = o.run();
        c.history.push({ day: g.daily.dayNumber, type: evt.type, label: o.label, result });
        NB.closeModal();
        NB.notify(`${c.name}: ${result || 'выполнено'}`, 'info');
        NB.save(); NB.render();
      });
    });
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
   ДЕЙСТВИЯ ИГРОКА
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

/* ----- Переговоры (многоступенчатые) ----- */
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

/* ----- Торговое соглашение ----- */
C.openTradeDeal = function (c) {
  const g = NB.state.game;
  const upfront = 10000;
  const daily = 300 + Math.round(c.share * 5);
  NB.openModal({
    title:'', noSubmit:true, boxClass:'event-modal-box',
    html:`<div class="event-title">📦 Торговое соглашение</div>
      <div class="event-desc">${c.name} готов подписать договор: <b>${NB.money(upfront)}</b> сейчас за <b>${NB.money(daily)}</b>/день в течение 30 дней.
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
      NB.closeModal();
      NB.render();
    }));
  }, 30);
};

/* ----- Пакт о ненападении ----- */
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
        c.aggression = 0;
        c.relationship += 20;
        NB.notify(`Пакт с ${c.name}`, 'ok');
      }
      NB.closeModal();
      NB.render();
    }));
  }, 30);
};

/* ----- Общая магистраль ----- */
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
      NB.closeModal();
      NB.render();
    }));
  }, 30);
};

/* ----- Совместные R&D ----- */
C.openResearch = function (c) {
  const g = NB.state.game;
  const cost = 15000;
  NB.openModal({
    title:'', noSubmit:true, boxClass:'event-modal-box',
    html:`<div class="event-title">🧪 Совместные R&D</div>
      <div class="event-desc">Инвестировать в разработку с ${c.name}. Стоимость: <b>${NB.money(cost)}</b>. Через 3 дня технология у них вырастет — и это даст вам возможность учиться. +5 к отношениям.</div>
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
      NB.closeModal();
      NB.render();
    }));
  }, 30);
};

/* ----- Военный союз ----- */
C.proposeAlliance = function (c) {
  const g = NB.state.game;
  if (c.relationship < 40) return NB.toast(`Нужны отношения ≥ 40 (сейчас ${Math.round(c.relationship)})`, 'err');
  if (c.agreements.some(a => a.type === 'alliance')) return NB.toast('Уже в союзе', 'err');
  NB.openModal({
    title:'', noSubmit:true, boxClass:'event-modal-box',
    html:`<div class="event-title">⚔ Военный союз</div>
      <div class="event-desc">${c.name} готов вступить в союз против общих угроз. Обе стороны не атакуют друг друга.</div>
      <div class="event-options">
        <button type="button" class="event-option" data-ally="yes"><span class="event-option-label">Заключить союз</span></button>
        <button type="button" class="event-option" data-ally="no"><span class="event-option-label">Отмена</span></button>
      </div>`
  });
  setTimeout(() => {
    document.querySelectorAll('[data-ally]').forEach(btn => btn.addEventListener('click', () => {
      if (btn.dataset.ally === 'yes') {
        C.signAgreement(c, 'alliance', 60, {});
        c.aggression = 0;
        c.relationship += 30;
        NB.notify(`⚔ Союз с ${c.name}`, 'ok');
      }
      NB.closeModal();
      NB.render();
    }));
  }, 30);
};

/* ----- Ценовая война ----- */
C.startPriceWar = function (c) {
  const g = NB.state.game;
  if (c.priceWarUntil > g.daily.dayNumber) return NB.toast('Война уже идёт', 'err');
  if (g.cash < 20000) return NB.toast('Нужно 20 000 ₽', 'err');
  g.cash -= 20000;
  c.priceWarUntil = g.daily.dayNumber + 10;
  c.priceWarStartedBy = 'player';
  c.aggression += 30;
  c.relationship -= 30;
  c.history.push({ day: g.daily.dayNumber, type:'price-war', label:'Ценовая война' });
  NB.notify(`💰 Ценовая война с ${c.name}`, 'warn');
  NB.addLog(`Ценовая война: 10 дней`, 'warn');
  NB.save(); NB.render();
};

/* ----- Шпионаж ----- */
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
    NB.notify(`🕵 Шпионаж удался: -1 тех. уровень ${c.name}`, 'ok');
    NB.addLog(`Шпионаж: украли технологию ${c.name}`, 'success');
  } else {
    c.relationship -= 40;
    c.aggression += 25;
    g.reputation = Math.max(0, g.reputation - 5);
    NB.notify(`🕵 Шпионаж провалился`, 'warn');
    NB.addLog(`Шпионаж провалился: ${c.name} узнал`, 'warn');
  }
  c.history.push({ day: g.daily.dayNumber, type:'espionage', label: success ? 'Успех' : 'Провал' });
  NB.save(); NB.render();
};

/* ----- Поглощение ----- */
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

/* ----- Переманивание клиентов ----- */
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
    c.relationship -= 15;
    c.aggression += 10;
    NB.notify(`🕵 Переманили ${stolen} клиентов`, 'ok');
    NB.addLog(`Переманено ${stolen} клиентов у ${c.name}`, 'success');
  } else {
    c.relationship -= 10;
    c.aggression += 5;
    NB.notify(`🕵 Не удалось переманить`, 'warn');
  }
  NB.game.updateMarketShare();
  NB.save(); NB.render();
};

/* ----- Пропаганда ----- */
C.runPropaganda = function (c) {
  const g = NB.state.game;
  if (g.ap.current < 1) return NB.toast('Нужен 1 AP', 'err');
  if (g.cash < 10000) return NB.toast('Нужно 10 000 ₽', 'err');
  NB.spendAp(1); g.cash -= 10000;
  c.share = Math.max(0, c.share - 2);
  g.marketShare = Math.min(70, g.marketShare + 1);
  c.relationship -= 25;
  c.aggression += 15;
  NB.notify(`📢 Пропаганда: ${c.name} теряет позиции`, 'ok');
  NB.game.updateMarketShare();
  NB.save(); NB.render();
};

/* ----- Саботаж ----- */
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
    c.relationship -= 30;
    c.aggression += 20;
    NB.notify(`💀 Саботаж удался: -3% рынка`, 'ok');
    NB.addLog(`Саботаж: ${c.name} повреждён`, 'success');
  } else {
    c.relationship -= 50;
    c.aggression += 30;
    g.reputation = Math.max(0, g.reputation - 10);
    NB.notify(`⚠ Саботаж провалился`, 'warn');
  }
  c.history.push({ day: g.daily.dayNumber, type:'sabotage', label: success ? 'Успех' : 'Провал' });
  NB.game.updateMarketShare();
  NB.save(); NB.render();
};

/* ============================================================
   БАНКРОТСТВО
   ============================================================ */
C.bankrupt = function (c) {
  c.alive = false;
  c.share = 0;
  NB.notify(`📉 ${c.name} обанкротился`, 'warn');
  NB.addLog(`${c.name} обанкротился`, 'info');
  c.history.push({ day: NB.state.game.daily.dayNumber, type:'bankrupt', label:'Банкротство' });
  NB.game.updateMarketShare();
};

/* ============================================================
   РЕНДЕР
   ============================================================ */
C.renderView = function () {
  const g = NB.state.game;
  if (!g.unlocks.competitors) return '<div class="panel"><p class="empty">Конкуренты появятся, когда компания станет заметной</p></div>';
  if (g.competitors.length === 0) C.generate();
  const alive = g.competitors.filter(c => c.alive);
  const activeAgreements = [];
  alive.forEach(c => c.agreements.forEach((a, i) => activeAgreements.push({ c, a, idx: i })));

  return `<div class="page-head">
    <div><h1>Конкуренты</h1><p class="muted">Рынок, отношения и сделки</p></div>
  </div>
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

  if (!c.alive) {
    return `<div class="comp-row dead">
      <div class="comp-logo" style="background:${c.color}">${NB.initials(c.name)}</div>
      <div class="comp-body"><b>${NB.esc(c.name)}</b><small>${NB.esc(c.desc)}</small><span class="comp-mood neutral">Обанкротился</span></div>
      <div class="comp-share">0%<small>доля</small></div>
    </div>`;
  }

  return `<div class="comp-row ${inPriceWar ? 'price-war' : ''}">
    <div class="comp-logo" style="background:${c.color}">${NB.initials(c.name)}</div>
    <div class="comp-body">
      <b>${NB.esc(c.name)} <span class="comp-personality" title="${pers.desc}">${pers.icon} ${pers.label}</span></b>
      <small>${NB.esc(c.desc)} · 💰 ${c.financialHealth}/100 · 🔬 ${c.techLevel}/5${inPriceWar ? ' · 💰 ВОЙНА' : ''}</small>
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

})(window);