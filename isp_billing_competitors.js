/* isp_billing_competitors.js — вариативные переговоры, угрозы, события */
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
  aggressive:  { label:'Агрессор',  icon:'⚔', desc:'Наглый, прямой' },
  cautious:    { label:'Осторожный',icon:'🛡', desc:'Ценит гарантии' },
  opportunist: { label:'Оппортунист',icon:'🎲',desc:'Ценит выгоду' },
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

const THREAT_TYPES = {
  raider:  { label:'Рейдеры',  icon:'⚔', color:'#ef4444', desc:'Крупные вооружённые группы', lootMult:1.8, powerMult:1.3, names:['Клык','Гром','Сталь','Тень','Хищник','Варан','Кобра'] },
  bandit:  { label:'Бандиты',  icon:'🔪', color:'#f59e0b', desc:'Мелкие банды, крадут припасы', lootMult:0.7, powerMult:0.7, names:['Псы','Вороны','Крысы','Шакалы','Стервятники'] },
  drone:   { label:'Дроны',    icon:'🤖', color:'#0ea5e9', desc:'Боевые дроны Синессы', lootMult:1.2, powerMult:1.0, names:['охотники','стражи','скауты','убийцы','разведчики'] }
};

/* ============================================================
   ПУЛЫ ПЕРЕГОВОРОВ
   Вопрос: q, opts[]
   Опция: label, score, hint, hidden?, trap?, followUp?
   ============================================================ */
C.NEGOTIATE_POOLS = {

  aggressive: {
    friendly: [
      { q:`Мне нравится, что ты не сдался. Давай по-честному: чего ты хочешь?`,
        opts:[
          { label:'«Равного партнёрства»', score:3, hint:'+дружба' },
          { label:'«Твоих клиентов»', score:-1, hint:'−дружба', hidden:{ aggression:5 } },
          { label:'«Чтобы ты ушёл с рынка»', score:-3, hint:'конфронтация' }
        ]},
      { q:`Могу отдать тебе 5% рынка. В обмен — скидка на магистраль.`,
        opts:[
          { label:'«Согласен»', score:2, hint:'+дружба', hidden:{ cash:-5000 }, trap:true },
          { label:'«Дай 8%»', score:1, hint:'торг' },
          { label:'«Не нуждаюсь»', score:-1, hint:'−дружба' }
        ]},
      { q:`Хочешь совместный проект? У меня есть идея с демпингом.`,
        opts:[
          { label:'«Только если 50/50»', score:2, hint:'+дружба' },
          { label:'«Не интересно»', score:0, hint:'нейтрально' },
          { label:'«Ты хочешь войны?»', score:-2, hint:'−дружба' }
        ]}
    ],
    neutral: [
      { q:`Ты знаешь, что я могу тебя раздавить?`,
        opts:[
          { label:'«Попробуй»', score:2, hint:'+дружба (хладнокровие)' },
          { label:'«Возможно»', score:0, hint:'нейтрально' },
          { label:'«Я готов уступить»', score:-2, hint:'−дружба (слабость)' }
        ]},
      { q:`Мне нужен твой клиент. Иванов. Отдашь?`,
        opts:[
          { label:'«За 5000₽»', score:1, hint:'торг', hidden:{ cash:5000 } },
          { label:'«Да, забирай»', score:-2, hint:'−дружба', hidden:{ relationship:-10 } },
          { label:'«Никогда»', score:2, hint:'+дружба' }
        ]},
      { q:`Что у тебя с сетью? Слышал, у тебя проблемы.`,
        opts:[
          { label:'«Всё в порядке»', score:1, hint:'+дружба' },
          { label:'«Есть небольшие»', score:0, hint:'нейтрально', hidden:{ aggression:5 } },
          { label:'«Это не твоё дело»', score:-1, hint:'−дружба' }
        ]}
    ],
    hostile: [
      { q:`Ты пожалеешь, что вообще появился на рынке.`,
        opts:[
          { label:'«Уже жалею, что разговариваю»', score:0, hint:'нейтрально' },
          { label:'«Я не боюсь»', score:2, hint:'+уважение' },
          { label:'«Пойду на мировую»', score:-3, hint:'−дружба (слабость)' }
        ]},
      { q:`Мой последний ультиматум: уходи, или я тебя уничтожу.`,
        opts:[
          { label:'«Удачи»', score:1, hint:'хладнокровие' },
          { label:'«Сколько?»', score:-2, hint:'−дружба', hidden:{ cash:-10000 }, trap:true },
          { label:'«Хорошо, ухожу»', score:-4, hint:'капитуляция' }
        ]}
    ]
  },

  cautious: {
    friendly: [
      { q:`Мне важно быть уверенным в завтрашнем дне. Что ты можешь гарантировать?`,
        opts:[
          { label:'«Долгосрочное партнёрство»', score:3, hint:'+дружба' },
          { label:'«Гарантий нет»', score:-1, hint:'−дружба' },
          { label:'«Всё, что попросишь»', score:-2, hint:'−дружба (слабость)' }
        ]},
      { q:`Мои акционеры нервничают. Как ты предлагаешь сотрудничество?`,
        opts:[
          { label:'«Обмен технологиями»', score:2, hint:'+дружба' },
          { label:'«Совместная защита от угроз»', score:3, hint:'+дружба' },
          { label:'«Не наше дело»', score:-1, hint:'−дружба' }
        ]},
      { q:`Стабильность важнее роста. Согласен?`,
        opts:[
          { label:'«Полностью»', score:2, hint:'+дружба' },
          { label:'«Частично»', score:0, hint:'нейтрально' },
          { label:'«Рост — это главное»', score:-1, hint:'−дружба' }
        ]}
    ],
    neutral: [
      { q:`Что ты готов дать, если мы не будем вредить друг другу?`,
        opts:[
          { label:'«Ничего не нужно»', score:2, hint:'+дружба' },
          { label:'«Скидку на магистраль»', score:1, hint:'торг', hidden:{ cash:-3000 }, trap:true },
          { label:'«Всё, что попросишь»', score:-2, hint:'−дружба' }
        ]},
      { q:`У меня есть информация. Но она стоит денег.`,
        opts:[
          { label:'«5000₽»', score:0, hidden:{ cash:-5000, insight:true }, trap:true },
          { label:'«Сначала скажи»', score:1, hint:'+дружба' },
          { label:'«Не нужно»', score:0, hint:'нейтрально' }
        ]}
    ],
    hostile: [
      { q:`Мне не о чем с тобой говорить. Но я дам тебе шанс.`,
        opts:[
          { label:'«Слушаю»', score:2, hint:'+дружба' },
          { label:'«Мне не нужен твой шанс»', score:-2, hint:'−дружба' },
          { label:'«Убирайся»', score:-4, hint:'конфронтация' }
        ]},
      { q:`Ты нарушил нашу договорённость. Как это понимать?`,
        opts:[
          { label:'«Извини, моя ошибка»', score:1, hint:'+дружба' },
          { label:'«Не было договорённости»', score:-2, hint:'−дружба' },
          { label:'«Это бизнес»', score:0, hint:'нейтрально' }
        ]}
    ]
  },

  opportunist: {
    friendly: [
      { q:`Слушай, есть дело. Хочешь заработать?`,
        opts:[
          { label:'«Говори»', score:2, hint:'+дружба' },
          { label:'«Сколько?»', score:1, hint:'торг' },
          { label:'«Не интересно»', score:-1, hint:'−дружба' }
        ]},
      { q:`Давай обменяемся: я тебе клиентов, ты мне — скидку.`,
        opts:[
          { label:'«Согласен»', score:2, hidden:{ clientsStolen:-1 }, trap:true },
          { label:'«50/50»', score:2, hint:'+дружба' },
          { label:'«Мне и так хорошо»', score:0, hint:'нейтрально' }
        ]},
      { q:`У меня есть инсайд. Хочешь купить?`,
        opts:[
          { label:'«5000₽»', score:1, hidden:{ cash:-5000, insight:true } },
          { label:'«Поделись бесплатно»', score:-1, hint:'−дружба' },
          { label:'«Не нужно»', score:0, hint:'нейтрально' }
        ]}
    ],
    neutral: [
      { q:`Почём продашь свой бизнес?`,
        opts:[
          { label:'«Он не продаётся»', score:2, hint:'+уважение' },
          { label:'«За 100 000₽»', score:0, hint:'нейтрально' },
          { label:'«Сам у меня купи»', score:-2, hint:'−дружба' }
        ]},
      { q:`Я могу уничтожить тебя за неделю. Или мы можем договориться.`,
        opts:[
          { label:'«Что предлагаешь?»', score:2, hint:'+дружба' },
          { label:'«Не пугай»', score:0, hint:'нейтрально' },
          { label:'«Попробуй»', score:-1, hint:'−дружба' }
        ]}
    ],
    hostile: [
      { q:`Ты мне надоел. Назови свою цену — и уйди.`,
        opts:[
          { label:'«Я не продаюсь»', score:2, hint:'+уважение' },
          { label:'«20 000₽»', score:-2, hidden:{ cash:20000 }, trap:true },
          { label:'«Сам уйди»', score:-3, hint:'−дружба' }
        ]}
    ]
  },

  idealist: {
    friendly: [
      { q:`Как ты думаешь, зачем мы вообще этим занимаемся?`,
        opts:[
          { label:'«Чтобы помогать людям»', score:3, hint:'+дружба' },
          { label:'«Чтобы зарабатывать»', score:-1, hint:'−дружба' },
          { label:'«Чтобы изменить мир»', score:2, hint:'+дружба' }
        ]},
      { q:`У меня есть проект. Помочь выжившим после катастрофы. Участвуешь?`,
        opts:[
          { label:'«Внести 5000₽»', score:3, hidden:{ cash:-5000 } },
          { label:'«Чем могу — помогу»', score:2, hint:'+дружба' },
          { label:'«Мне это не интересно»', score:-2, hint:'−дружба' }
        ]},
      { q:`Репутация — это всё. Согласен?`,
        opts:[
          { label:'«Абсолютно»', score:2, hint:'+дружба' },
          { label:'«Не всегда»', score:0, hint:'нейтрально' },
          { label:'«Деньги важнее»', score:-2, hint:'−дружба' }
        ]}
    ],
    neutral: [
      { q:`Скажи честно: ты не жалеешь о том, что мы делаем?`,
        opts:[
          { label:'«Нет»', score:2, hint:'+дружба' },
          { label:'«Иногда»', score:1, hint:'+дружба' },
          { label:'«Это просто бизнес»', score:-1, hint:'−дружба' }
        ]},
      { q:`Ты веришь в лучшее будущее?`,
        opts:[
          { label:'«Верю»', score:2, hint:'+дружба' },
          { label:'«Не знаю»', score:0, hint:'нейтрально' },
          { label:'«Нет»', score:-2, hint:'−дружба' }
        ]}
    ],
    hostile: [
      { q:`Ты разочаровал меня. Я был о тебе лучшего мнения.`,
        opts:[
          { label:'«Прости»', score:1, hint:'+дружба' },
          { label:'«Мне не нужно твоё мнение»', score:-2, hint:'−дружба' },
          { label:'«Это не твоё дело»', score:-4, hint:'конфронтация' }
        ]}
    ]
  }
};

/* Особые раунды (25% шанс) */
C.SPECIAL_ROUNDS = [
  { q:`Скажи мне — что тебя пугает больше всего?`,
    opts:[
      { label:'«Потерять всё»', score:2, hint:'откровенность' },
      { label:'«Ничего»', score:0, hint:'закрытость' },
      { label:'«Ты»', score:1, hint:'+уважение' }
    ]},
  { q:`У тебя есть семья? Я слышал, есть.`,
    opts:[
      { label:'«Да, и я их защищу»', score:3, hint:'+уважение' },
      { label:'«Не твоё дело»', score:-1, hint:'−дружба' },
      { label:'«Тебе не достать их»', score:0, hint:'нейтрально', hidden:{ aggression:10 } }
    ]},
  { q:`Если бы всё пошло не так — ты бы пошёл против меня?`,
    opts:[
      { label:'«Если придётся»', score:2, hint:'честность' },
      { label:'«Никогда»', score:0, hint:'нейтрально' },
      { label:'«Уже готовлю план»', score:-2, hint:'−дружба' }
    ]}
];

/* Реакции конкурента после раунда (для погружения) */
C.REACTIONS = {
  positive: ['(Кивает)', '(Улыбается)', '(Откидывается на спинку)', '«Хорошо»', '«Приятно слышать»'],
  neutral: ['(Молчит)', '«Продолжай»', '«Понятно»', '(Смотрит в окно)'],
  negative: ['(Хмурится)', '«Зря ты так»', '(Сжимает кулаки)', '«Это ошибка»', '«Мы ещё поговорим»']
};

/* ============================================================
   ГЕНЕРАЦИЯ
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
      relationship: 0, aggression: aggressionBase,
      financialHealth: 70 + Math.floor(Math.random() * 30),
      techLevel: 2 + Math.floor(Math.random() * 3),
      mood: 'neutral', alive: true,
      founded: g.daily.dayNumber,
      agreements: [],
      priceWarUntil: 0, takeoverProgress: 0,
      spyAttempts: 0, sabotageCount: 0,
      history: []
    };
  });
  NB.save();
  NB.notify(`🏢 Открыт рынок! ${count} конкурентов`, 'ok');
};

/* ============================================================
   ЗАКАТ / ЭРА УГРОЗ
   ============================================================ */
C.startSunset = function () {
  const g = NB.state.game;
  if (g.world.transitionStartedDay) return;
  g.world.transitionStartedDay = g.daily.dayNumber;
  g.world.flags.corpSunset = true;
  NB.notify('🌇 Рынок рушится: корпорации теряют контроль', 'warn');
  NB.addLog('Закат корпораций начался', 'warn');
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
  const galaPassed = g.world.flags.galaSurvived || g.world.flags.galaFamily || g.world.flags.galaSolo;
  const lateGame = day >= 70 && g.world.threat >= 3;
  if ((galaPassed || lateGame) && !g.world.transitionStartedDay) C.startSunset();
};

/* ============================================================
   ТИК
   ============================================================ */
C.tick = function () {
  const g = NB.state.game;
  if (!g.unlocks.competitors) return;
  if (g.competitors.length === 0) C.generate();
  C.checkSunsetTrigger();
  if (g.world.era === 'rivals') C.tickRivals();
  if (g.world.era === 'threats') C.tickThreats();
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
    if (sunset) {
      const deathChance = Math.min(0.5, 0.15 + daysSinceSunset * 0.08);
      if (Math.random() < deathChance) { C.bankrupt(c); return; }
    }
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
    c.relationship += (0 - c.relationship) * 0.02;
    c.relationship = Math.max(-100, Math.min(100, c.relationship));
    c.aggression = Math.max(0, c.aggression - 0.3);
    c.mood = c.relationship >= 30 ? 'friendly' : c.relationship <= -30 ? 'hostile' : 'neutral';
    if (sunset) {
      c.financialHealth = Math.max(0, c.financialHealth - 8);
      c.share = Math.max(0, c.share - 1);
    } else {
      if (c.financialHealth > 60) c.share += NB.rand(-0.05, 0.15);
      else c.share -= NB.rand(0, 0.25);
      c.share = Math.max(0, c.share);
    }
    if (c.priceWarUntil > day) {
      c.financialHealth = Math.max(0, c.financialHealth - 1.5);
      c.share = Math.max(0, c.share - 0.3);
      g.cash -= 500;
      g.reputation = Math.max(0, g.reputation - 0.5);
    }
    if (c.takeoverProgress > 0 && c.takeoverProgress < 100) {
      const inc = Math.round(5 + g.company.level * 2);
      c.takeoverProgress = Math.min(100, c.takeoverProgress + inc);
      if (c.takeoverProgress >= 100) C.completeTakeover(c);
    }
    if (c.financialHealth < 10 && Math.random() < 0.05) C.bankrupt(c);
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
    C.generateThreats();
    C.generateThreats();
    NB.save();
    setTimeout(() => { if (NB.renderView) NB.renderView(); }, 300);
  }
};

/* ============================================================
   УГРОЗЫ
   ============================================================ */
C.tickThreats = function () {
  const g = NB.state.game;
  const day = g.daily.dayNumber;
  if (!g.world.threats) g.world.threats = [];
  if (Math.random() < 0.35) C.generateThreats();
  g.world.threats.forEach(t => {
    if (!t.alive) return;
    t.aggression = Math.min(100, t.aggression + NB.rand(2, 8));
    if (t.aggression >= 70 && Math.random() < 0.3) C.threatAttack(t);
    if (day - t.seenDay > 5 && t.aggression < 30) {
      t.alive = false;
      NB.addLog(`${t.name} ушли`, 'info');
    }
  });
  g.world.threats = g.world.threats.filter(t => t.alive || (t.diedDay && day - t.diedDay < 3));
};

C.generateThreats = function () {
  const g = NB.state.game;
  if (!g.world.threats) g.world.threats = [];
  const alive = g.world.threats.filter(t => t.alive).length;
  if (alive >= 5) return;
  let pool = ['bandit'];
  if (g.daily.dayNumber > 100) pool.push('raider', 'drone');
  if (g.daily.dayNumber > 130) pool.push('raider', 'drone');
  if (g.world.drones.enabled) pool.push('drone', 'drone');
  const type = NB.pick(pool);
  const meta = THREAT_TYPES[type];
  const basePower = Math.round((30 + Math.floor(Math.random() * 30) + Math.floor(g.daily.dayNumber / 4) * 5) * meta.powerMult);
  const threat = {
    id: 'th' + (g.world.threatSeq = (g.world.threatSeq || 0) + 1),
    type,
    name: type === 'drone' ? `Дроны-${NB.pick(meta.names)}` : `${meta.label} «${NB.pick(meta.names)}»`,
    power: basePower, basePower,
    aggression: 20 + Math.floor(Math.random() * 40),
    loot: Math.round((2000 + Math.floor(g.daily.dayNumber / 2) * 100) * meta.lootMult),
    alive: true, seenDay: g.daily.dayNumber, history: []
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
   СОГЛАШЕНИЯ / ДЕЙСТВИЯ КОРПОРАЦИЙ
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

C.maybeAct = function (c) {
  const g = NB.state.game;
  const roll = Math.random();
  if (c.agreements.some(a => a.type === 'alliance' || a.type === 'nonAggression')) return;
  const hostiles = c.mood === 'hostile' || c.aggression > 50;

  if (hostiles && roll < 0.06) { C.queueEvent(c, NB.pick(['attack','demand','ultimatum'])); return; }
  if (hostiles && roll < 0.12) { C.queueEvent(c, 'rumor'); return; }
  if (c.mood === 'friendly' && roll < 0.04) { C.queueEvent(c, NB.pick(['offer','gift','proposal'])); return; }
  if (c.mood === 'neutral' && roll < 0.03) { C.queueEvent(c, NB.pick(['offer','rumor','proposal'])); return; }
  if (c.financialHealth < 30 && roll < 0.08) { C.queueEvent(c, 'crisis'); return; }
  if (c.share < 15 && c.relationship > 20 && roll < 0.02) { C.queueEvent(c, 'merger-offer'); return; }
  if (c.personality === 'opportunist' && c.aggression > 30 && roll < 0.03) { C.queueEvent(c, 'price-war-threat'); }
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
  const pers = PERSONALITY[c.personality] || PERSONALITY.cautious;
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
    },
    ultimatum: {
      title:`⚡ ${c.name}: ультиматум`,
      desc:`${c.name} выдвигает жёсткий ультиматум: уходите с рынка или они перейдут к полномасштабной атаке.`,
      opts:[
        { label:'Принять бой', run:()=>{ c.aggression += 30; c.relationship -= 30; return 'Они готовы к войне'; }},
        { label:'Уступить 8%', run:()=>{ c.share = Math.min(60, c.share + 8); c.aggression -= 50; c.relationship += 20; return 'Отдали 8%'; }},
        { label:'Заплатить 20 000₽', run:()=>{ if (g.cash < 20000) return 'Нет денег'; g.cash -= 20000; c.aggression -= 60; c.relationship += 25; return 'Откупились'; }}
      ]
    },
    rumor: {
      title:`🕵 ${c.name}: слухи`,
      desc:`До вас дошли слухи от ${c.name}.`,
      opts:[
        { label:'Проверить (1 AP)', ap:1, action:()=>{
          const roll = Math.random();
          if (roll < 0.4) { g.cash += 5000; return 'Инсайд принёс 5 000 ₽'; }
          if (roll < 0.7) { c.aggression = Math.max(0, c.aggression - 15); return 'Готовятся к атаке — можно опередить'; }
          return 'Пустой слух';
        }},
        { label:'Игнорировать', run:()=>'Пропущено' }
      ]
    },
    gift: {
      title:`🎁 ${c.name} дарит`,
      desc:`${c.name} неожиданно присылает подарок — ящик элитного оборудования.`,
      opts:[
        { label:'Принять', run:()=>{ const g2 = NB.state.game; g2.cash += 3000; c.relationship += 10; return '+3 000 ₽'; }},
        { label:'Отказаться', run:()=>{ c.relationship += 5; return 'Скромно'; }}
      ]
    },
    proposal: {
      title:`🧪 ${c.name}: совместный проект`,
      desc:`${c.name} предлагает совместный технологический проект.`,
      opts:[
        { label:'Инвестировать 8 000₽', run:()=>{ if (g.cash < 8000) return 'Нет денег'; g.cash -= 8000; c.technology = (c.techLevel||0); if (Math.random() < 0.6) { g.unlockedTech.push('jointTech'); NB.addCompanyXp(30); return 'Проект удался!'; } return 'Проект провалился'; }},
        { label:'Отказаться', run:()=>{ c.relationship -= 5; return 'Отказ'; }}
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
   ПЕРЕГОВОРЫ — вариативные, по характеру и настроению
   ============================================================ */
C.openNegotiate = function (c) {
  const g = NB.state.game;
  if (g.ap.current < 1) return NB.toast('Нужен 1 AP', 'err');
  NB.spendAp(1);

  const pers = PERSONALITY[c.personality] || PERSONALITY.cautious;
  const pool = C.NEGOTIATE_POOLS[c.personality]?.[c.mood];
  if (!pool || !pool.length) return NB.toast('Не о чем говорить', 'err');

  /* Берём 4 уникальных вопроса из пула */
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const rounds = shuffled.slice(0, Math.min(4, shuffled.length));

  /* 30% шанс вставить особый раунд на 2-3 позицию */
  if (Math.random() < 0.3) {
    const special = NB.pick(C.SPECIAL_ROUNDS);
    rounds.splice(1 + Math.floor(Math.random() * 2), 0, special);
  }

  let idx = 0, score = 0, cashDelta = 0, insight = false;

  const finish = () => {
    /* Применяем score к отношениям */
    c.relationship += score * 8;
    c.aggression = Math.max(0, c.aggression - score * 5);
    c.relationship = Math.max(-100, Math.min(100, c.relationship));
    g.cash = Math.max(0, g.cash + cashDelta);

    let result = '', color = 'info', extra = '';

    if (score >= 10) {
      if (!c.agreements.some(a => a.type === 'alliance')) {
        C.signAgreement(c, 'alliance', 60, {});
        c.relationship += 20;
        g.cash += 10000;
        result = 'Союз заключён!';
        extra = '+10 000 ₽, +дружба';
        color = 'ok';
      } else {
        g.cash += 5000;
        result = 'Тёплая встреча';
        extra = '+5 000 ₽';
        color = 'ok';
      }
    } else if (score >= 5) {
      if (!c.agreements.some(a => a.type === 'tradeDeal')) {
        C.signAgreement(c, 'tradeDeal', 30, { dailyIncome: 400 });
        g.cash += 5000;
        result = 'Торговое соглашение подписано!';
        extra = '+400₽/день, +5 000 ₽';
        color = 'ok';
      } else {
        g.cash += 5000;
        result = 'Приятная встреча';
        extra = '+5 000 ₽';
        color = 'ok';
      }
    } else if (score >= 2) {
      g.cash += 2000;
      result = 'Дружеская встреча';
      extra = '+2 000 ₽';
      color = 'ok';
    } else if (score <= -4) {
      c.aggression += 15;
      result = 'Отношения испорчены';
      extra = '+агрессия';
      color = 'err';
    } else {
      result = 'Ничего не решили';
    }

    c.history.push({
      day: g.daily.dayNumber, type:'negotiate',
      label:`Переговоры (score ${score})`, result
    });
    NB.closeModal();
    NB.notify(`${pers.icon} ${c.name}: ${result}${extra ? ' · ' + extra : ''}`, color === 'err' ? 'warn' : 'info');
    NB.save(); NB.render();
  };

  const showReaction = (reactionScore, cb) => {
    const key = reactionScore > 0 ? 'positive' : reactionScore < 0 ? 'negative' : 'neutral';
    const reactionText = NB.pick(C.REACTIONS[key]);
    /* Мини-пауза с реакцией */
    NB.openModal({
      title:'', noSubmit:true, boxClass:'event-modal-box',
      html:`<div class="event-title">${pers.icon} ${c.name}</div>
        <div class="event-desc" style="font-size:16px;font-style:italic;color:var(--primary-3);text-align:center;padding:20px 0">${reactionText}</div>
        <div class="event-options"><button type="button" class="event-option" data-reaction-next><span class="event-option-label">Продолжить →</span></button></div>`
    });
    setTimeout(() => {
      const btn = document.querySelector('[data-reaction-next]');
      if (btn) btn.addEventListener('click', () => cb());
    }, 30);
  };

  const render = () => {
    if (idx >= rounds.length) return finish();
    const r = rounds[idx];
    const opts = r.opts.map((o, i) => `<button type="button" class="event-option" data-negotiate-opt="${i}">
      <span class="event-option-label">${o.label}</span>
      <span class="event-option-hint">${o.hint || ''}</span>
    </button>`).join('');
    NB.openModal({
      title:'', noSubmit:true, boxClass:'event-modal-box',
      html:`<div class="event-title">🤝 Переговоры · ${c.name} <span style="font-size:12px;color:var(--muted);font-weight:400">· ${pers.icon} ${pers.label} · раунд ${idx+1}/${rounds.length}</span></div>
        <div class="event-desc">${r.q}</div>
        <div class="event-options">${opts}</div>
        <div style="margin-top:14px;text-align:center;font-size:11px;color:var(--muted)">Очки: <b style="color:var(--primary-3)">${score}</b> · деньги: <b style="color:${cashDelta >= 0 ? '#4ade80' : '#f87171'}">${cashDelta >= 0 ? '+' : ''}${NB.money(cashDelta)}</b></div>`
    });
    setTimeout(() => {
      NB.$$('[data-negotiate-opt]').forEach(btn => btn.addEventListener('click', () => {
        const opt = r.opts[Number(btn.dataset.negotiateOpt)];
        score += opt.score || 0;
        if (opt.hidden) {
          if (opt.hidden.cash) cashDelta += opt.hidden.cash;
          if (opt.hidden.aggression) c.aggression = Math.max(0, c.aggression + opt.hidden.aggression);
          if (opt.hidden.relationship) c.relationship += opt.hidden.relationship;
          if (opt.hidden.insight) insight = true;
          if (opt.hidden.clientsStolen) {
            /* У вас крадут клиента */
            const victim = NB.pick(NB.state.clients.filter(x => x.status === 'active'));
            if (victim) {
              NB.state.clients = NB.state.clients.filter(x => x.id !== victim.id);
              c.share = Math.min(60, c.share + 0.5);
            }
          }
        }
        if (opt.trap) {
          /* Ловушка: даже при положительном score есть скрытый штраф (уже применён) */
        }
        idx++;
        showReaction(opt.score || 0, render);
      }));
    }, 30);
  };

  render();
};

/* ============================================================
   ОСТАЛЬНЫЕ ДЕЙСТВИЯ (с вариативностью)
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

C.openTradeDeal = function (c) {
  const g = NB.state.game;
  /* Разные условия в зависимости от личности */
  const pers = c.personality;
  const upfront = pers === 'opportunist' ? 12000 : pers === 'cautious' ? 8000 : 10000;
  const daily = pers === 'aggressive' ? 400 + Math.round(c.share * 6) : 300 + Math.round(c.share * 5);
  const days = pers === 'cautious' ? 40 : 30;
  NB.openModal({
    title:'', noSubmit:true, boxClass:'event-modal-box',
    html:`<div class="event-title">📦 Торговое соглашение</div>
      <div class="event-desc">${c.name} готов подписать договор: <b>${NB.money(upfront)}</b> сейчас за <b>${NB.money(daily)}</b>/день на ${days} дней.
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
        C.signAgreement(c, 'tradeDeal', days, { dailyIncome: daily, upfrontCost: upfront });
        c.relationship += 10;
        NB.notify(`${c.name}: +${NB.money(daily)}/день`, 'ok');
      }
      NB.closeModal(); NB.render();
    }));
  }, 30);
};

C.openNonAggression = function (c) {
  const g = NB.state.game;
  /* Цена зависит от личности и отношений */
  let cost = 5000;
  if (c.personality === 'aggressive') cost = 8000;
  if (c.personality === 'idealist') cost = 3000;
  if (c.relationship < -30) cost = Math.round(cost * 1.5);
  if (c.relationship > 40) cost = Math.round(cost * 0.7);
  const days = c.personality === 'cautious' ? 50 : 30;
  NB.openModal({
    title:'', noSubmit:true, boxClass:'event-modal-box',
    html:`<div class="event-title">🕊 Пакт о ненападении</div>
      <div class="event-desc">${c.name} обещает не атаковать. Стоимость: <b>${NB.money(cost)}</b>. Срок: ${days} дней.</div>
      <div class="event-options">
        <button type="button" class="event-option" data-pact="sign"><span class="event-option-label">Подписать</span></button>
        <button type="button" class="event-option" data-pact="close"><span class="event-option-label">Отмена</span></button>
      </div>`
  });
  setTimeout(() => {
    document.querySelectorAll('[data-pact]').forEach(btn => btn.addEventListener('click', () => {
      if (btn.dataset.pact === 'sign') {
        if (g.cash < cost) { NB.toast('Не хватает', 'err'); return; }
        C.signAgreement(c, 'nonAggression', days, { upfrontCost: cost });
        c.aggression = 0; c.relationship += 20;
        NB.notify(`Пакт с ${c.name}`, 'ok');
      }
      NB.closeModal(); NB.render();
    }));
  }, 30);
};

C.openSharedBackbone = function (c) {
  const g = NB.state.game;
  const cost = c.personality === 'aggressive' ? 12000 : c.personality === 'cautious' ? 10000 : 8000;
  const bonus = c.personality === 'cautious' ? 3000 : 2000;
  NB.openModal({
    title:'', noSubmit:true, boxClass:'event-modal-box',
    html:`<div class="event-title">🔗 Общая магистраль</div>
      <div class="event-desc">Доступ к магистрали ${c.name}: <b>+${bonus} Мбит/с</b> на 20 дней. Стоимость: <b>${NB.money(cost)}</b>.</div>
      <div class="event-options">
        <button type="button" class="event-option" data-bb="sign"><span class="event-option-label">Подписать</span></button>
        <button type="button" class="event-option" data-bb="close"><span class="event-option-label">Отмена</span></button>
      </div>`
  });
  setTimeout(() => {
    document.querySelectorAll('[data-bb]').forEach(btn => btn.addEventListener('click', () => {
      if (btn.dataset.bb === 'sign') {
        if (g.cash < cost) { NB.toast('Не хватает', 'err'); return; }
        C.signAgreement(c, 'sharedBackbone', 20, { upfrontCost: cost, bonus });
        c.relationship += 15;
        NB.notify(`Магистраль открыта (+${bonus})`, 'ok');
      }
      NB.closeModal(); NB.render();
    }));
  }, 30);
};

C.openResearch = function (c) {
  const g = NB.state.game;
  const cost = c.personality === 'cautious' ? 18000 : 15000;
  NB.openModal({
    title:'', noSubmit:true, boxClass:'event-modal-box',
    html:`<div class="event-title">🧪 Совместные R&D</div>
      <div class="event-desc">Инвестировать в разработку с ${c.name}: <b>${NB.money(cost)}</b>. Шанс получить технологию — 60%.</div>
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
        if (Math.random() < 0.6) {
          c.techLevel = Math.min(5, c.techLevel + 1);
          NB.addCompanyXp(25);
          NB.notify(`R&D с ${c.name}: успех!`, 'ok');
        } else {
          NB.notify(`R&D с ${c.name}: провал`, 'warn');
        }
      }
      NB.closeModal(); NB.render();
    }));
  }, 30);
};

C.proposeAlliance = function (c) {
  const g = NB.state.game;
  /* Для идеалистов — порог ниже */
  const threshold = c.personality === 'idealist' ? 30 : 40;
  if (c.relationship < threshold) return NB.toast(`Нужны отношения ≥ ${threshold} (сейчас ${Math.round(c.relationship)})`, 'err');
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
  c.aggression += 30; c.relationship -= 30;
  c.history.push({ day: g.daily.dayNumber, type:'price-war', label:'Ценовая война' });
  NB.notify(`💰 Ценовая война с ${c.name}`, 'warn');
  NB.save(); NB.render();
};

C.tryEspionage = function (c) {
  const g = NB.state.game;
  if (g.ap.current < 2) return NB.toast('Нужно 2 AP', 'err');
  if (g.cash < 15000) return NB.toast('Нужно 15 000 ₽', 'err');
  NB.spendAp(2); g.cash -= 15000;
  c.spyAttempts++;
  /* Шанс зависит от techLevel, personality, отношений */
  const baseChance = c.personality === 'cautious' ? 0.25 : c.personality === 'aggressive' ? 0.5 : 0.4;
  const success = Math.random() < baseChance + g.company.level * 0.03 - c.techLevel * 0.05;
  if (success) {
    c.techLevel = Math.max(1, c.techLevel - 1);
    g.world.flags.stolenTechs = (g.world.flags.stolenTechs || 0) + 1;
    NB.addCompanyXp(20);
    NB.notify(`🕵 Шпионаж удался: -1 тех. ур. ${c.name}`, 'ok');
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
  if (c.share > 15) return NB.toast(`Доля должна быть < 15% (сейчас ${Math.round(c.share)}%)`, 'err');
  if (c.takeoverProgress > 0) return NB.toast(`Идёт: ${c.takeoverProgress}%`, 'info');
  const cost = c.personality === 'cautious' ? 70000 : c.personality === 'aggressive' ? 80000 : 60000;
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
  c.alive = false; c.share = 0; c.takeoverProgress = 100;
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
  /* У идеалистов переманить сложнее (верны компании) */
  const baseChance = c.personality === 'idealist' ? 0.3 : c.personality === 'opportunist' ? 0.55 : 0.4;
  const success = Math.random() < baseChance + c.relationship / 200;
  if (success) {
    const stolen = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < stolen; i++) {
      const t = NB.pick(NB.state.tariffs);
      NB.state.clients.push({
        id: NB.state.seq.client++, name: NB.genName(), address: NB.genAddress(), phone: NB.genPhone(),
        tariffId: t.id, balance: 0, status: 'active', createdAt: new Date().toISOString(),
        password: NB.DEFAULT_PASS, isDrone: false, risk: 'normal', revealed: true
      });
    }
    c.share = Math.max(0, c.share - stolen * 0.5);
    c.relationship -= 15; c.aggression += 10;
    NB.notify(`🕵 Переманили ${stolen} клиентов`, 'ok');
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
  /* Идеалисты теряют больше (репутация важна) */
  const loss = c.personality === 'idealist' ? 3 : c.personality === 'cautious' ? 1.5 : 2;
  c.share = Math.max(0, c.share - loss);
  g.marketShare = Math.min(70, g.marketShare + loss * 0.5);
  c.relationship -= 25; c.aggression += 15;
  NB.notify(`📢 Пропаганда: ${c.name} теряет ${loss}% рынка`, 'ok');
  NB.game.updateMarketShare();
  NB.save(); NB.render();
};

C.sabotage = function (c) {
  const g = NB.state.game;
  if (g.ap.current < 2) return NB.toast('Нужно 2 AP', 'err');
  if (g.cash < 10000) return NB.toast('Нужно 10 000 ₽', 'err');
  NB.spendAp(2); g.cash -= 10000;
  c.sabotageCount++;
  /* Осторожные защищены лучше */
  const baseChance = c.personality === 'cautious' ? 0.35 : 0.5;
  const success = Math.random() < baseChance - c.relationship / 200;
  if (success) {
    c.financialHealth = Math.max(0, c.financialHealth - 25);
    c.share = Math.max(0, c.share - 3);
    c.relationship -= 30; c.aggression += 20;
    NB.notify(`💀 Саботаж удался: -3% рынка`, 'ok');
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
  c.alive = false; c.share = 0;
  c.diedDay = NB.state.game.daily.dayNumber;
  NB.notify(`📉 ${c.name} обанкротился`, 'warn');
  NB.addLog(`${c.name} обанкротился`, 'info');
  c.history.push({ day: NB.state.game.daily.dayNumber, type:'bankrupt', label:'Банкротство' });
  NB.game.updateMarketShare();
};

/* ============================================================
   ДЕЙСТВИЯ С УГРОЗАМИ — с вариативностью
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
    case 'distract':   return C.distractThreat(t);
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
    t.alive = false; t.diedDay = g.daily.dayNumber;
    g.cash += t.loot;
    g.reputation = Math.min(100, g.reputation + 5);
    warriors.forEach(w => NB.employees.levelUp(w.id));
    NB.notify(`⚔ ${t.name} разбиты. +${NB.money(t.loot)}`, 'ok');
  } else {
    const losses = Math.min(warriors.length, 1 + Math.floor(Math.random() * 2));
    for (let i = 0; i < losses; i++) {
      const w = warriors[i];
      g.employees = g.employees.filter(e => e.id !== w.id);
    }
    g.reputation = Math.max(0, g.reputation - 3);
    t.aggression = Math.min(100, t.aggression + 20);
    NB.notify(`⚔ Бой с ${t.name} проигран. Потери: ${losses}`, 'warn');
  }
  NB.save(); NB.render();
};

C.payThreat = function (t) {
  const g = NB.state.game;
  /* Дроны не берут деньги */
  if (t.type === 'drone') return NB.toast('Дроны не берут деньги', 'err');
  const cost = Math.round(t.loot * 0.6);
  if (g.cash < cost) return NB.toast(`Нужно ${NB.money(cost)}`, 'err');
  g.cash -= cost;
  t.alive = false; t.diedDay = g.daily.dayNumber;
  t.aggression = 0;
  NB.notify(`💰 Откупились от ${t.name} (${NB.money(cost)})`, 'info');
  NB.save(); NB.render();
};

C.negotiateThreat = function (t) {
  const g = NB.state.game;
  if (g.ap.current < 1) return NB.toast('Нужен 1 AP', 'err');
  NB.spendAp(1);
  const chance = t.type === 'bandit' ? 0.55 : t.type === 'raider' ? 0.3 : 0.1;
  if (Math.random() < chance) {
    t.aggression = Math.max(0, t.aggression - 40);
    g.reputation = Math.min(100, g.reputation + 2);
    NB.notify(`🤝 Договорились с ${t.name}`, 'ok');
  } else {
    t.aggression = Math.min(100, t.aggression + 25);
    NB.notify(`❌ ${t.name} не идут на контакт`, 'warn');
  }
  NB.save(); NB.render();
};

C.ambushThreat = function (t) {
  const g = NB.state.game;
  if (g.ap.current < 2) return NB.toast('Нужно 2 AP', 'err');
  if (C.combatPower() < t.power * 0.5) return NB.toast('Слишком слабый отряд', 'err');
  NB.spendAp(2);
  const chance = 0.5 + (C.combatPower() - t.power) / 200;
  if (Math.random() < chance) {
    const loot = Math.round(t.loot * 1.5);
    g.cash += loot;
    g.reputation = Math.min(100, g.reputation + 8);
    t.alive = false; t.diedDay = g.daily.dayNumber;
    NB.notify(`🎯 Засада удалась! +${NB.money(loot)}`, 'ok');
  } else {
    const warriors = g.employees.filter(e => e.spec === 'warrior');
    if (warriors.length > 0) {
      const w = NB.pick(warriors);
      g.employees = g.employees.filter(e => e.id !== w.id);
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

C.distractThreat = function (t) {
  const g = NB.state.game;
  if (g.ap.current < 1) return NB.toast('Нужен 1 AP', 'err');
  NB.spendAp(1);
  /* Шанс зависит от типа: дронов легко отвлечь, рейдеров — сложно */
  const chance = t.type === 'drone' ? 0.7 : t.type === 'bandit' ? 0.5 : 0.25;
  if (Math.random() < chance) {
    t.aggression = Math.max(0, t.aggression - 20);
    NB.notify(`🎭 ${t.name} отвлечены`, 'ok');
  } else {
    t.aggression = Math.min(100, t.aggression + 10);
    NB.notify(`${t.name} не отвлеклись`, 'warn');
  }
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
  ${sunset ? '<div class="ultimatum-banner" style="border-color:#f59e0b;background:linear-gradient(135deg,rgba(245,158,11,.15),rgba(120,80,0,.2))"><h3 style="color:#fbbf24">🌇 Закат корпораций</h3><p style="color:#fbbf24">После гала-вечера рынок рушится. Скоро их место займут рейдеры, бандиты и дроны.</p></div>' : ''}
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
          <div class="agreement-info"><b>${NB.esc(c.name)}</b><small>${meta.label} · ${left} дн.${a.dailyIncome ? ` · +${NB.money(a.dailyIncome)}/день` : ''}</small></div>
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
        ${c.agreements.length > 0 ? `<span class="comp-badge">${c.agreements.length} согл.</span>` : ''}
      </div>
    </div>
    <div class="comp-share">${Math.round(c.share*10)/10}%<small>доля</small></div>
    <div class="comp-actions">
      <button class="btn ghost small" data-action="competitor-action" data-id="${c.id}" data-key="negotiate" title="Переговоры (1 AP)">🤝</button>
      <button class="btn ghost small" data-action="competitor-action" data-id="${c.id}" data-key="trade-deal" title="Торговое соглашение">📦</button>
      <button class="btn ghost small" data-action="competitor-action" data-id="${c.id}" data-key="non-aggression" title="Пакт о ненападении">🕊</button>
      <button class="btn ghost small" data-action="competitor-action" data-id="${c.id}" data-key="shared-backbone" title="Общая магистраль">🔗</button>
      <button class="btn ghost small" data-action="competitor-action" data-id="${c.id}" data-key="research" title="Совместные R&D">🧪</button>
      <button class="btn ghost small" data-action="competitor-action" data-id="${c.id}" data-key="alliance" title="Военный союз" ${c.relationship < (c.personality === 'idealist' ? 30 : 40) ? 'disabled' : ''}>⚔</button>
      <button class="btn ghost small" data-action="competitor-action" data-id="${c.id}" data-key="price-war" title="Ценовая война (20k)">💰</button>
      <button class="btn ghost small" data-action="competitor-action" data-id="${c.id}" data-key="espionage" title="Шпионаж (2 AP, 15k)">🕵</button>
      <button class="btn ghost small" data-action="competitor-action" data-id="${c.id}" data-key="poach" title="Переманить клиентов (1 AP)">👥</button>
      <button class="btn ghost small" data-action="competitor-action" data-id="${c.id}" data-key="propaganda" title="Пропаганда (1 AP, 10k)">📢</button>
      <button class="btn ghost small" data-action="competitor-action" data-id="${c.id}" data-key="buyout" title="Поглотить (доля &lt; 15%)" ${c.share > 15 ? 'disabled' : ''}>💼</button>
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
        <div class="threat-bar" title="Агрессия: ${t.aggression}"><span>Агрессия</span><div class="threat-bar-track"><i style="width:${t.aggression}%;background:${t.aggression>=70?'#ef4444':t.aggression>=40?'#f59e0b':'#4ade80'}"></i></div></div>
        <div class="threat-bar" title="Ваша мощь vs угроза: ${powerRatio}%"><span>Мощь</span><div class="threat-bar-track"><i style="width:${Math.min(100,powerRatio)}%;background:#3b82f6"></i></div></div>
      </div>
    </div>
    <div class="threat-actions">
      <button class="btn primary small" data-action="threat-action" data-id="${t.id}" data-key="fight" title="Отбить (нужны воины)">⚔ Бой</button>
      <button class="btn ghost small" data-action="threat-action" data-id="${t.id}" data-key="ambush" title="Засада (2 AP, мощь ≥ 50%)">🎯</button>
      <button class="btn ghost small" data-action="threat-action" data-id="${t.id}" data-key="negotiate" title="Переговоры (1 AP)">🤝</button>
      <button class="btn ghost small" data-action="threat-action" data-id="${t.id}" data-key="distract" title="Отвлечь (1 AP)">🎭</button>
      <button class="btn ghost small" data-action="threat-action" data-id="${t.id}" data-key="pay" title="Откупиться (${NB.money(Math.round(t.loot*0.6))})" ${t.type==='drone'?'disabled':''}>💰</button>
      <button class="btn ghost small" data-action="threat-action" data-id="${t.id}" data-key="ignore" title="Игнорировать">👀</button>
    </div>
  </div>`;
};

})(window);