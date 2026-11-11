/* isp_billing_game.js — геймплей: события, апгрейды, тур, цели */
(function (global) {
'use strict';
const NB = global.NB;
const G = NB.game = NB.game || {};

/* =========== UPGRADE CATALOG =========== */
G.UPGRADES = {
  ddos: {
    icon: '🛡',
    name: 'DDoS-защита',
    desc: 'Отбивает атаки. Без неё каждая атака стоит клиентов и репутации.',
    costs: [10000, 25000, 50000],
    upkeep: [500, 1200, 2500],
    levels: [
      'Базовая фильтрация трафика',
      'Продвинутая защита + CDN',
      'Максимальная защита + автоблокировка'
    ]
  },
  bandwidth: {
    icon: '⚡',
    name: 'Пропускная способность',
    desc: 'Больше клиентов без просадок скорости. Уменьшает отток.',
    costs: [15000, 30000, 60000],
    upkeep: [600, 1500, 3000],
    levels: [
      '+30% ёмкость сети',
      'Резервный канал связи',
      'Гигабитные магистрали'
    ]
  },
  support: {
    icon: '💬',
    name: 'Служба поддержки',
    desc: 'Быстрее решает заявки, снижает отток, повышает репутацию.',
    costs: [8000, 20000, 40000],
    upkeep: [400, 1000, 2000],
    levels: [
      'Два оператора на связи',
      'Круглосуточная поддержка',
      'Персональные менеджеры'
    ]
  },
  marketing: {
    icon: '📢',
    name: 'Маркетинг',
    desc: 'Больше новых клиентов каждый день.',
    costs: [12000, 28000, 55000],
    upkeep: [800, 2000, 4000],
    levels: [
      'Таргетированная реклама',
      'Наружная реклама в городе',
      'Национальная кампания'
    ]
  }
};

G.upgradeCost = (key) => {
  const lvl = NB.state.game.upgrades[key];
  const costs = G.UPGRADES[key].costs;
  return lvl >= costs.length ? null : costs[lvl];
};

G.dailyUpkeep = () => {
  let sum = 0;
  Object.keys(NB.state.game.upgrades).forEach(key => {
    const lvl = NB.state.game.upgrades[key];
    for (let i = 0; i < lvl; i++) sum += G.UPGRADES[key].upkeep[i];
  });
  return sum;
};

G.buyUpgrade = function (key) {
  const cost = G.upgradeCost(key);
  if (cost === null) return NB.toast('Уже максимум', 'err');
  if (NB.state.game.cash < cost) return NB.toast('Недостаточно средств', 'err');
  NB.state.game.cash -= cost;
  NB.state.game.upgrades[key]++;
  NB.state.game.stats.totalExpenses += cost;
  NB.notify(`Куплено улучшение: ${G.UPGRADES[key].name} ур.${NB.state.game.upgrades[key]}`, 'ok');
  NB.addActivity(`Куплено: ${G.UPGRADES[key].name} ур.${NB.state.game.upgrades[key]}`, 'tariff');
  NB.save();
  NB.renderView();
};

/* =========== EVENTS =========== */
G.EVENTS = [
  {
    id: 'ddos',
    title: '💀 DDoS-атака',
    desc: 'Сеть под массированной атакой. Клиенты не могут подключиться.',
    weight: 1.4,
    opts: [
      { label: 'Заплатить за срочную защиту', hint: '-5 000 ₽', run: () => {
        NB.state.game.cash -= 5000;
        NB.state.game.stats.totalExpenses += 5000;
        return 'Атака отбита, репутация сохранена';
      }},
      { label: 'Терпеть, прорвёмся', hint: '-2 клиента, -15 реп', run: () => {
        const ddosLvl = NB.state.game.upgrades.ddos;
        const lost = Math.max(1, 3 - ddosLvl);
        const active = NB.state.clients.filter(c => c.status === 'active');
        for (let i = 0; i < lost && i < active.length; i++) {
          const v = active[i];
          NB.state.clients = NB.state.clients.filter(c => c.id !== v.id);
          NB.state.invoices = NB.state.invoices.filter(i => i.clientId !== v.id);
        }
        NB.state.game.reputation = Math.max(0, NB.state.game.reputation - 15);
        return `Потеряно ${lost} клиентов`;
      }}
    ]
  },
  {
    id: 'equipment',
    title: '🔧 Отказ оборудования',
    desc: 'Магистральный коммутатор вышел из строя. Нужно срочное решение.',
    weight: 1.2,
    opts: [
      { label: 'Купить новый', hint: '-3 000 ₽', run: () => {
        NB.state.game.cash -= 3000;
        NB.state.game.stats.totalExpenses += 3000;
        return 'Оборудование заменено, сеть работает';
      }},
      { label: 'Починить своими силами', hint: '-1 клиент', run: () => {
        const active = NB.state.clients.filter(c => c.status === 'active');
        if (active.length) {
          const v = active[0];
          NB.state.clients = NB.state.clients.filter(c => c.id !== v.id);
          NB.state.invoices = NB.state.invoices.filter(i => i.clientId !== v.id);
        }
        return 'Починили, но клиент ушёл';
      }}
    ]
  },
  {
    id: 'bigclient',
    title: '💼 Крупный клиент',
    desc: 'ООО «Ромашка» хочет подключиться на тариф «Бизнес», но просит первый месяц бесплатно.',
    weight: 1.0,
    opts: [
      { label: 'Согласиться', hint: 'Новый клиент', run: () => {
        const t = NB.state.tariffs.find(x => x.name === 'Бизнес') || NB.state.tariffs[NB.state.tariffs.length - 1];
        const nc = {
          id: NB.state.seq.client++,
          name: 'ООО «Ромашка»',
          address: NB.genAddress(),
          phone: '+7 495 ' + NB.randInt(100, 999) + '-00-' + NB.randInt(10, 99),
          tariffId: t.id, balance: 0, status: 'active',
          createdAt: new Date().toISOString(), password: NB.DEFAULT_PASS
        };
        NB.state.clients.push(nc);
        return `Подключён ${nc.name}, бонус +${NB.money(t.price)}`;
      }},
      { label: 'Отказать', hint: 'Ничего', run: () => 'Отказали, идём дальше' }
    ]
  },
  {
    id: 'viral',
    title: '📈 Вирусный эффект',
    desc: 'Ваш пост в соцсетях стал популярным. Можно докинуть денег в продвижение.',
    weight: 0.9,
    opts: [
      { label: 'Вложить в продвижение', hint: '-8 000 ₽ → +5 клиентов', run: () => {
        if (NB.state.game.cash < 8000) return 'Не хватило денег — момент упущен';
        NB.state.game.cash -= 8000;
        NB.state.game.stats.totalExpenses += 8000;
        for (let i = 0; i < 5; i++) {
          const t = NB.pick(NB.state.tariffs);
          const nc = {
            id: NB.state.seq.client++, name: NB.genName(), address: NB.genAddress(),
            phone: NB.genPhone(), tariffId: t.id, balance: 0, status: 'active',
            createdAt: new Date().toISOString(), password: NB.DEFAULT_PASS
          };
          NB.state.clients.push(nc);
        }
        return '+5 новых клиентов!';
      }},
      { label: 'Пропустить', hint: 'Ничего', run: () => 'Пост остался без продвижения' }
    ]
  },
  {
    id: 'competitor',
    title: '🎯 Конкурент давит',
    desc: '«СтарЛинк» запустил акцию: скидка 50% на полгода. Часть клиентов уйдёт.',
    weight: 1.0,
    opts: [
      { label: 'Ответить акцией', hint: '-10 000 ₽, -5 клиентов', run: () => {
        if (NB.state.game.cash < 10000) return 'Не хватило денег — потеряли клиентов';
        NB.state.game.cash -= 10000;
        NB.state.game.stats.totalExpenses += 10000;
        const active = NB.state.clients.filter(c => c.status === 'active');
        for (let i = 0; i < 5 && i < active.length; i++) {
          const v = active[i];
          NB.state.clients = NB.state.clients.filter(c => c.id !== v.id);
          NB.state.invoices = NB.state.invoices.filter(inv => inv.clientId !== v.id);
        }
        return 'Ответили акцией, потеряли 5 клиентов';
      }},
      { label: 'Ничего не делать', hint: '-8 клиентов', run: () => {
        const active = NB.state.clients.filter(c => c.status === 'active');
        for (let i = 0; i < 8 && i < active.length; i++) {
          const v = active[i];
          NB.state.clients = NB.state.clients.filter(c => c.id !== v.id);
          NB.state.invoices = NB.state.invoices.filter(inv => inv.clientId !== v.id);
        }
        return 'Потеряли 8 клиентов';
      }}
    ]
  },
  {
    id: 'inspection',
    title: '📋 Проверка Роскомнадзора',
    desc: 'Найдены мелкие нарушения в документации.',
    weight: 0.7,
    opts: [
      { label: 'Оплатить штраф', hint: '-4 000 ₽', run: () => {
        NB.state.game.cash -= 4000;
        NB.state.game.stats.totalExpenses += 4000;
        return 'Штраф оплачен, работаем дальше';
      }},
      { label: 'Оспорить', hint: '-10 репутации', run: () => {
        NB.state.game.reputation = Math.max(0, NB.state.game.reputation - 10);
        return 'Штраф оспорили, но репутация пострадала';
      }}
    ]
  },
  {
    id: 'discount',
    title: '🏷 Распродажа оборудования',
    desc: 'Поставщик предлагает магистральное оборудование со скидкой 50%.',
    weight: 0.6,
    opts: [
      { label: 'Купить со скидкой', hint: 'Апгрейд bandwidth', run: () => {
        const lvl = NB.state.game.upgrades.bandwidth;
        if (lvl >= G.UPGRADES.bandwidth.costs.length) return 'Уже максимум';
        const cost = Math.round(G.UPGRADES.bandwidth.costs[lvl] / 2);
        if (NB.state.game.cash < cost) return 'Не хватило денег';
        NB.state.game.cash -= cost;
        NB.state.game.upgrades.bandwidth++;
        return `Пропускная способность ур.${NB.state.game.upgrades.bandwidth}`;
      }},
      { label: 'Пропустить', hint: 'Ничего', run: () => 'Оборудование не купили' }
    ]
  },
  {
    id: 'staff-poach',
    title: '🚪 Переманили сотрудника',
    desc: 'Ключевой инженер получил оффер от конкурента. Матчим зарплату?',
    weight: 0.8,
    opts: [
      { label: 'Поднять зарплату', hint: '-5 000 ₽', run: () => {
        NB.state.game.cash -= 5000;
        NB.state.game.stats.totalExpenses += 5000;
        return 'Инженер остался, команда в порядке';
      }},
      { label: 'Отпустить', hint: '-1 уровень support', run: () => {
        if (NB.state.game.upgrades.support > 0) NB.state.game.upgrades.support--;
        return 'Потеряли специалиста, поддержка просела';
      }}
    ]
  }
];

G.rollEvent = function () {
  const pool = G.EVENTS;
  const weights = pool.map(e => e.weight || 1);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[0];
};

G.triggerEvent = function () {
  const evt = G.rollEvent();
  NB.state.game.activeEvent = { ...evt, triggeredAt: new Date().toISOString() };
  NB.save();
};

G.showEventModal = function () {
  const evt = NB.state.game.activeEvent;
  if (!evt) return;
  const optsHtml = evt.opts.map((o, i) => `
    <button type="button" class="event-option" data-event-opt="${i}">
      <span class="event-option-label">${o.label}</span>
      <span class="event-option-hint">${o.hint || ''}</span>
    </button>`).join('');
  NB.openModal({
    title: '',
    submit: null,
    boxClass: 'event-modal-box',
    html: `<div class="event-title">${evt.title}</div>
           <div class="event-desc">${evt.desc}</div>
           <div class="event-options">${optsHtml}</div>`,
    onSubmit: null
  });
  setTimeout(() => {
    document.querySelectorAll('[data-event-opt]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.eventOpt);
        G.resolveEvent(idx);
      });
    });
  }, 30);
};

G.resolveEvent = function (idx) {
  const evt = NB.state.game.activeEvent;
  if (!evt) return;
  const opt = evt.opts[idx];
  if (!opt) return;
  const result = opt.run();
  NB.state.game.activeEvent = null;
  NB.state.game.history.push({
    id: evt.id, title: evt.title, choice: opt.label, result,
    at: new Date().toISOString()
  });
  NB.state.game.stats.eventsResolved++;
  NB.closeModal();
  NB.notify(`${evt.title}: ${result}`, 'info');
  NB.addActivity(`${evt.title} — ${result}`, 'sys');
  NB.save();
  NB.checkGameState();
  NB.renderView();
};

/* =========== GOAL / LEVEL =========== */
G.LEVELS = [
  { at: 0, label: 'Новичок' },
  { at: 50000, label: 'Стартап' },
  { at: 100000, label: 'Растущий' },
  { at: 150000, label: 'Уверенный' },
  { at: 200000, label: 'Профи' }
];
G.levelFor = (cash) => {
  let lvl = 1;
  for (let i = 0; i < G.LEVELS.length; i++) if (cash >= G.LEVELS[i].at) lvl = i + 1;
  return lvl;
};

NB.checkGameState = function () {
  const g = NB.state.game;
  if (g.stats.won || g.stats.lost) return;
  if (g.cash >= g.goal) {
    g.stats.won = true;
    g.stats.totalRevenue += 0;
    NB.notify('🏆 Цель достигнута! Вы победили!', 'ok');
    NB.addActivity('Цель достигнута — игра пройдена!', 'sys');
    NB.confetti();
    NB.save();
  } else if (g.cash < 0) {
    g.stats.lost = true;
    NB.notify('💀 Касса ушла в минус — вы проиграли', 'warn');
    NB.addActivity('Банкротство — игра проиграна', 'block');
    NB.save();
  }
  const newLvl = G.levelFor(g.cash);
  if (newLvl > g.level) {
    g.level = newLvl;
    NB.notify(`Новый уровень: ${G.LEVELS[newLvl - 1].label}`, 'ok');
    NB.save();
  }
};

/* =========== TOUR =========== */
G.TOUR = {
  staff: [
    { view: 'dashboard', icon: '◧', title: 'Дашборд', text: 'Здесь всё главное: касса, цель, выручка, топ клиентов, лента активности.' },
    { view: 'clients', icon: '◔', title: 'Клиенты', text: 'База абонентов. Клик по строке — карточка с полной информацией, оплатами и заявками.' },
    { view: 'tariffs', icon: '◆', title: 'Тарифы', text: 'Управляйте планами: создавайте, редактируйте, удаляйте. Клиенты переносятся автоматически.' },
    { view: 'invoices', icon: '▤', title: 'Счета', text: 'Выставляйте и отмечайте оплату. Фильтры по статусу сверху.' },
    { view: 'tickets', icon: '✉', title: 'Заявки', text: 'Обращения от клиентов. Закрывайте те, что решены.' },
    { view: 'upgrades', icon: '⚙', title: 'Магазин', text: 'Покупайте апгрейды — они повышают защиту, скорость и приток клиентов.' },
    { view: 'activity', icon: '◷', title: 'Активность', text: 'Полный журнал событий: покупки, оплаты, заявки, инциденты.' },
    { view: 'settings', icon: '🛠', title: 'Настройки', text: 'Скорость времени, события, экспорт и сброс. Всё под контролем.' }
  ],
  client: [
    { view: 'dashboard', icon: '◧', title: 'Обзор', text: 'Баланс, тариф, трафик и последние счета — на одном экране.' },
    { view: 'tariff', icon: '◆', title: 'Мой тариф', text: 'Здесь можно поменять тариф в один клик — выбор из доступных планов.' },
    { view: 'invoices', icon: '▤', title: 'Счета', text: 'Все ваши счета. Оплата — с баланса, в один клик.' },
    { view: 'speed', icon: '⚡', title: 'Скорость', text: 'Замер скорости соединения прямо в браузере.' },
    { view: 'support', icon: '✉', title: 'Поддержка', text: 'Возникли вопросы — создайте заявку, мы ответим в течение 24 часов.' }
  ]
};

G.startTour = function (role) {
  const steps = G.TOUR[role];
  if (!steps || !steps.length) return;
  if (document.querySelector('.tour-overlay')) return;
  let idx = 0;

  const overlay = document.createElement('div');
  overlay.className = 'tour-overlay';
  overlay.innerHTML = `<div class="tour-highlight" id="tour-hl"></div>
    <div class="tour-bubble left" id="tour-bubble">
      <div class="tour-icon" id="tour-icon"></div>
      <div class="tour-title" id="tour-title"></div>
      <div class="tour-text" id="tour-text"></div>
      <div class="tour-dots" id="tour-dots"></div>
      <div class="tour-actions">
        <button type="button" class="tour-skip" id="tour-skip">Пропустить</button>
        <div class="right">
          <button type="button" class="tour-back" id="tour-back" style="display:none">Назад</button>
          <button type="button" class="tour-next" id="tour-next">Далее</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const highlightEl = overlay.querySelector('#tour-hl');
  const bubble = overlay.querySelector('#tour-bubble');

  const step = () => {
    const s = steps[idx];
    const navItem = document.querySelector(`[data-view="${s.view}"]`);
    if (!navItem) { finish(); return; }
    const rect = navItem.getBoundingClientRect();

    highlightEl.style.left = (rect.left - 4) + 'px';
    highlightEl.style.top = (rect.top - 4) + 'px';
    highlightEl.style.width = (rect.width + 8) + 'px';
    highlightEl.style.height = (rect.height + 8) + 'px';

    const isMobile = window.innerWidth <= 760;
    if (isMobile) {
      bubble.className = 'tour-bubble below';
      bubble.style.left = '12px';
      bubble.style.right = '12px';
      bubble.style.width = 'auto';
      bubble.style.top = (rect.bottom + 18) + 'px';
    } else {
      bubble.className = 'tour-bubble left';
      bubble.style.width = '320px';
      bubble.style.left = (rect.right + 16) + 'px';
      bubble.style.top = Math.max(12, rect.top - 22) + 'px';
    }
    overlay.querySelector('#tour-icon').textContent = s.icon;
    overlay.querySelector('#tour-title').textContent = s.title;
    overlay.querySelector('#tour-text').textContent = s.text;
    overlay.querySelector('#tour-dots').innerHTML = steps.map((_, i) =>
      `<i class="${i === idx ? 'active' : ''}"></i>`).join('');
    overlay.querySelector('#tour-next').textContent = idx === steps.length - 1 ? 'Начать работу' : 'Далее';
    overlay.querySelector('#tour-back').style.display = idx > 0 ? '' : 'none';
  };

  const finish = () => {
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 300);
    if (role === 'staff') NB.state.onboarded.staff = true;
    else {
      const id = NB.state.session && NB.state.session.role === 'client' ? NB.state.session.id : null;
      if (id && !NB.state.onboarded.clients.includes(id)) NB.state.onboarded.clients.push(id);
    }
    NB.save();
  };

  overlay.querySelector('#tour-next').addEventListener('click', () => {
    if (idx === steps.length - 1) finish();
    else { idx++; step(); }
  });
  overlay.querySelector('#tour-back').addEventListener('click', () => {
    if (idx > 0) { idx--; step(); }
  });
  overlay.querySelector('#tour-skip').addEventListener('click', finish);

  overlay.style.pointerEvents = 'auto';
  requestAnimationFrame(step);
};

NB.startTour = function () {
  const role = NB.state.session.role;
  G.startTour(role);
};

})(window);