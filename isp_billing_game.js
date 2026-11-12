/* isp_billing_game.js — апгрейды, события, уровни, туториал */
(function (global) {
'use strict';
const NB = global.NB;
const G = NB.game = NB.game || {};

G.UPGRADES = {
  ddos:           { icon:'🛡', name:'DDoS-защита',           desc:'Отбивает атаки на сеть.', costs:[8000,18000,35000], upkeep:[15,40,80], levels:['Базовая фильтрация','CDN + защита','Автоблок'] },
  bandwidth:      { icon:'⚡', name:'Пропускная способность', desc:'Больше клиентов без просадок.', costs:[12000,25000,50000], upkeep:[20,50,100], levels:['+30% ёмкость','Резервный канал','Гигабит'] },
  support:        { icon:'💬', name:'Поддержка',              desc:'Меньше оттока, быстрее оплата.', costs:[6000,15000,30000], upkeep:[15,40,80], levels:['2 оператора','24/7','Менеджеры'] },
  marketing:      { icon:'📢', name:'Маркетинг',              desc:'Больше новых клиентов.', costs:[10000,22000,45000], upkeep:[20,50,100], levels:['+1 клиент/день','+2 клиента/день','+3 клиента/день'] },
  fiber:          { icon:'🕸', name:'Оптиковолокно',          desc:'Собственные магистрали.', costs:[30000,70000], upkeep:[60,150], levels:['Городская оптика','Магистральная'] },
  satellite:      { icon:'🛰', name:'Спутниковый канал',      desc:'Резерв и покрытие.', costs:[50000], upkeep:[80], levels:['Спутниковый резерв'] },
  ai:             { icon:'🤖', name:'AI-автоматизация',       desc:'Автоподдержка и продажи.', costs:[70000], upkeep:[120], levels:['AI-оператор'] },
  quantum:        { icon:'⚛', name:'Квантовый шифр',          desc:'Только после особой концовки.', costs:[180000], upkeep:[200], levels:['Квантовая сеть'] },
  firewall:       { icon:'🧱', name:'Firewall',               desc:'Снижает аномальный трафик.', costs:[12000,30000,60000], upkeep:[20,50,100], levels:['Базовый','Глубокий анализ','ИИ-файрвол'] },
  microBooster:   { icon:'🔧', name:'Микроускоритель',        desc:'Буст скорости для клиентов.', costs:[4000,12000], upkeep:[10,25], levels:['+5% скорость','+10% скорость'] },
  darkFiber:      { icon:'🌑', name:'Тёмное волокно',          desc:'Секретный канал.', costs:[80000], upkeep:[150], levels:['Скрытая магистраль'] },
  autoCollect:    { icon:'💰', name:'Автосбор выручки',        desc:'Автоматически собирает выручку.', costs:[6000,15000], upkeep:[10,25], levels:['Автосбор 100%','+5% бонус'] },
  autoClean:      { icon:'🧹', name:'Автоочистка спама',       desc:'Убирает рекламный спам.', costs:[4000], upkeep:[8], levels:['Скрипт-блокировщик'] },
  salesBoost:     { icon:'📈', name:'Буст продаж',             desc:'Повышает шанс подключения.', costs:[8000,20000], upkeep:[15,40], levels:['+10% продаж','+20% продаж'] },
  bunker:         { icon:'🏚', name:'Бункер',                  desc:'Укрытие от глобальной угрозы.', costs:[70000,130000], upkeep:[80,200], levels:['Базовый бункер','Укреплённый'] },
  anomalyScanner: { icon:'📡', name:'Аномальный сканер',       desc:'Рано предупреждает об атаках.', costs:[20000,45000], upkeep:[20,50], levels:['Первый сканер','Полный охват'] }
};

G.upgradeCost = function (key) {
  const lvl = NB.state.game.upgrades[key];
  const u = G.UPGRADES[key];
  if (!u || lvl >= u.costs.length) return null;
  if (key === 'quantum' && !NB.state.game.unlockedTech.includes('quantum')) return null;
  return u.costs[lvl];
};

G.dailyUpkeep = function () {
  let s = 0;
  Object.keys(NB.state.game.upgrades).forEach(key => {
    const lvl = NB.state.game.upgrades[key];
    const u = G.UPGRADES[key]; if (!u) return;
    for (let i = 0; i < lvl; i++) s += u.upkeep[i] || 0;
  });
  return s;
};

G.buyUpgrade = function (key) {
  const cost = G.upgradeCost(key);
  if (cost === null) return NB.toast('Недоступно', 'err');
  if (NB.state.game.cash < cost) return NB.toast('Недостаточно средств', 'err');
  NB.state.game.cash -= cost;
  NB.state.game.upgrades[key]++;
  NB.state.game.stats.totalExpenses += cost;
  NB.notify(`Куплено: ${G.UPGRADES[key].name} ур.${NB.state.game.upgrades[key]}`, 'ok');
  NB.addActivity(`Куплено: ${G.UPGRADES[key].name}`, 'tariff');
  NB.addLog(`Куплено: ${G.UPGRADES[key].name}`, 'success');
  NB.save(); NB.renderView();
};

/* ============================================================
   СОБЫТИЯ
   ============================================================ */
G.EVENTS = [
  { id:'micro_coffee', title:'☕ Кофе для команды', desc:'Сотрудники просят кофе. Мелочь, а приятно.', weight:1.5, opts:[
    { label:'Купить кофе', hint:'-500 ₽', run:()=>{ NB.state.game.cash-=500; NB.state.game.reputation=Math.min(100,NB.state.game.reputation+1); return 'Команда довольна'; }},
    { label:'Отказать', hint:'', run:()=>{ NB.state.game.reputation=Math.max(0,NB.state.game.reputation-1); return 'Недовольство'; }}
  ]},
  { id:'micro_bug', title:'🐛 Баг в биллинге', desc:'Мелкий баг. Можно исправить или оставить.', weight:1.4, opts:[
    { label:'Исправить', hint:'-2000 ₽', run:()=>{ NB.state.game.cash-=2000; return 'Исправлено'; }},
    { label:'Оставить', hint:'Риск клиентов', run:()=>{ for(let i=0;i<3&&i<NB.state.clients.length;i++){const v=NB.state.clients[i];NB.state.clients=NB.state.clients.filter(c=>c.id!==v.id);} return 'Клиенты ушли'; }}
  ]},
  { id:'micro_feedback', title:'📝 Обратная связь', desc:'Клиент оставил отзыв.', weight:1.1, opts:[
    { label:'Ответить', hint:'+1 репутация', run:()=>{ NB.state.game.reputation=Math.min(100,NB.state.game.reputation+1); return 'Спасибо за отзыв'; }},
    { label:'Игнорировать', hint:'', run:()=>'Проигнорировано' }
  ]},
  { id:'ddos', title:'💀 DDoS-атака', desc:'Сеть под атакой.', weight:1.4, opts:[
    { label:'Заплатить за защиту', hint:'-5000 ₽', run:()=>{ NB.state.game.cash-=5000; return 'Атака отбита'; }},
    { label:'Терпеть', hint:'Потери клиентов', run:()=>{ for(let i=0;i<2&&i<NB.state.clients.length;i++){const v=NB.state.clients[i];NB.state.clients=NB.state.clients.filter(c=>c.id!==v.id);} return 'Потери'; }}
  ]},
  { id:'equipment', title:'🔧 Отказ оборудования', desc:'Коммутатор сломался.', weight:1.2, opts:[
    { label:'Купить новый', hint:'-3000 ₽', run:()=>{ NB.state.game.cash-=3000; return 'Заменено'; }},
    { label:'Починить', hint:'-клиент', run:()=>{ if(NB.state.clients.length){const v=NB.state.clients[0];NB.state.clients=NB.state.clients.filter(c=>c.id!==v.id);} return 'Потеря'; }}
  ]},
  { id:'bigclient', title:'💼 Крупный клиент', desc:'ООО «Ромашка» хочет подключиться.', weight:1.0, opts:[
    { label:'Согласиться', hint:'+1 клиент', run:()=>{ const t=NB.state.tariffs[NB.state.tariffs.length-1]; const nc={id:NB.state.seq.client++,name:'ООО «Ромашка»',address:NB.genAddress(),phone:NB.genPhone(),tariffId:t.id,balance:0,status:'active',createdAt:new Date().toISOString(),password:NB.DEFAULT_PASS,isDrone:false,risk:'good'}; NB.state.clients.push(nc); return 'Подключён'; }},
    { label:'Отказать', hint:'', run:()=>'Отказ' }
  ]},
  { id:'viral', title:'📈 Вирусный эффект', desc:'Пост стал популярным.', weight:0.9, opts:[
    { label:'Вложить', hint:'-8000 ₽, +5 клиентов', run:()=>{ if(NB.state.game.cash<8000) return 'Не хватило'; NB.state.game.cash-=8000; for(let i=0;i<5;i++){const t=NB.pick(NB.state.tariffs); const nc={id:NB.state.seq.client++,name:NB.genName(),address:NB.genAddress(),phone:NB.genPhone(),tariffId:t.id,balance:0,status:'active',createdAt:new Date().toISOString(),password:NB.DEFAULT_PASS,isDrone:false,risk:'normal'};NB.state.clients.push(nc);} return '+5 клиентов'; }},
    { label:'Пропустить', hint:'', run:()=>'Пропущено' }
  ]},
  { id:'competitor', title:'🎯 Конкурент давит', desc:'Starlink запустил акцию.', weight:1.0, opts:[
    { label:'Ответить акцией', hint:'-10000 ₽', run:()=>{ if(NB.state.game.cash<10000) return 'Не хватило'; NB.state.game.cash-=10000; for(let i=0;i<5&&i<NB.state.clients.length;i++){const v=NB.state.clients[i];NB.state.clients=NB.state.clients.filter(c=>c.id!==v.id);} return 'Потери'; }},
    { label:'Ничего не делать', hint:'Больше потерь', run:()=>{ for(let i=0;i<8&&i<NB.state.clients.length;i++){const v=NB.state.clients[i];NB.state.clients=NB.state.clients.filter(c=>c.id!==v.id);} return 'Потери'; }}
  ]},
  { id:'inspection', title:'📋 Проверка', desc:'Найдены нарушения.', weight:0.7, opts:[
    { label:'Оплатить штраф', hint:'-4000 ₽', run:()=>{ NB.state.game.cash-=4000; return 'Оплачено'; }},
    { label:'Оспорить', hint:'-10 репутации', run:()=>{ NB.state.game.reputation=Math.max(0,NB.state.game.reputation-10); return 'Оспорено'; }}
  ]},
  { id:'discount', title:'🏷 Распродажа', desc:'Скидка на оборудование.', weight:0.6, opts:[
    { label:'Купить', hint:'Скидка 50%', run:()=>{ const lvl=NB.state.game.upgrades.bandwidth; if(lvl>=G.UPGRADES.bandwidth.costs.length) return 'Максимум'; const cost=Math.round(G.UPGRADES.bandwidth.costs[lvl]/2); if(NB.state.game.cash<cost) return 'Не хватило'; NB.state.game.cash-=cost; NB.state.game.upgrades.bandwidth++; return 'Куплено'; }},
    { label:'Пропустить', hint:'', run:()=>'Пропущено' }
  ]},
  { id:'staff-poach', title:'🚪 Переманили сотрудника', desc:'Инженер получил оффер.', weight:0.8, opts:[
    { label:'Поднять зарплату', hint:'-5000 ₽', run:()=>{ NB.state.game.cash-=5000; return 'Остался'; }},
    { label:'Отпустить', hint:'-уровень support', run:()=>{ if(NB.state.game.upgrades.support>0) NB.state.game.upgrades.support--; return 'Ушёл'; }}
  ]},
  { id:'family_1', title:'👨‍👩‍👧 Личное время', desc:'Жена просит провести вечер с семьёй. У вас много работы.', weight:0.7,
    condition:()=>NB.state.game.daily.dayNumber>15 && !NB.state.game.world.family.wife,
    opts:[
      { label:'Провести вечер', hint:'+3 репутации', run:()=>{ NB.state.game.reputation=Math.min(100,NB.state.game.reputation+3); NB.state.game.world.family.wife='Анна'; return 'Хороший вечер'; }},
      { label:'Отложить', hint:'', run:()=>'Работали допоздна' }
    ]
  }
];

G.rollEvent = function () {
  const pool = G.EVENTS.filter(e => !e.condition || e.condition());
  const weights = pool.map(e => e.weight || 1);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) return pool[i]; }
  return pool[0] || G.EVENTS[0];
};

G.triggerEvent = function () {
  const evt = G.rollEvent();
  NB.state.game.activeEvent = { ...evt, triggeredAt: new Date().toISOString() };
  NB.save();
};

G.showEventModal = function () {
  const evt = NB.state.game.activeEvent;
  if (!evt) return;
  const optsHtml = evt.opts.map((o, i) =>
    `<button type="button" class="event-option" data-event-opt="${i}">
       <span class="event-option-label">${o.label}</span>
       <span class="event-option-hint">${o.hint || ''}</span>
     </button>`).join('');
  NB.openModal({ title: '', noSubmit: true, boxClass: 'event-modal-box',
    html: `<div class="event-title">${evt.title}</div><div class="event-desc">${evt.desc}</div><div class="event-options">${optsHtml}</div>` });
  setTimeout(() => {
    document.querySelectorAll('[data-event-opt]').forEach(btn => {
      btn.addEventListener('click', () => G.resolveEvent(Number(btn.dataset.eventOpt)));
    });
  }, 30);
};

G.resolveEvent = function (idx) {
  const evt = NB.state.game.activeEvent;
  if (!evt) return;
  const opt = evt.opts[idx]; if (!opt) return;
  const result = opt.run();
  NB.state.game.activeEvent = null;
  NB.state.game.history.push({ id: evt.id, title: evt.title, choice: opt.label, result, at: new Date().toISOString() });
  NB.state.game.stats.eventsResolved++;
  NB.closeModal();
  NB.notify(`${evt.title}: ${result}`, 'info');
  NB.addActivity(`${evt.title} — ${result}`, 'sys');
  NB.addLog(`${evt.title}: ${result}`, 'info');
  NB.save(); NB.checkGameState(); NB.renderView();
};

G.LEVELS = [
  { at:0,      label:'Новичок' },
  { at:50000,  label:'Стартап' },
  { at:100000, label:'Растущий' },
  { at:200000, label:'Уверенный' },
  { at:350000, label:'Профи' },
  { at:500000, label:'Магнат' }
];
G.levelFor = cash => {
  let lvl = 1;
  for (let i = 0; i < G.LEVELS.length; i++) if (cash >= G.LEVELS[i].at) lvl = i + 1;
  return lvl;
};

NB.checkGameState = function () {
  const g = NB.state.game;
  if (g.stats.won || g.stats.lost) return;
  if (g.cash >= g.goal) {
    g.stats.won = true;
    NB.notify('🏆 Цель достигнута!', 'ok');
    NB.confetti(); NB.save();
  } else if (g.cash < 0) {
    g.stats.lost = true;
    NB.notify('💀 Касса в минусе — вы проиграли', 'warn');
    NB.save();
  }
  const newLvl = G.levelFor(g.cash);
  if (newLvl > g.level) { g.level = newLvl; NB.notify(`Новый уровень: ${G.LEVELS[newLvl-1].label}`, 'ok'); NB.save(); }
};

G.updateMarketShare = function () {
  const g = NB.state.game;
  const totalClients = NB.state.clients.filter(c => c.status === 'active').length;
  g.marketShare = Math.round(Math.min(45, 5 + totalClients * 0.8));
  const otherTotal = 100 - g.marketShare;
  const compSum = g.competitors.reduce((s, c) => s + c.share, 0) || 1;
  g.competitors.forEach(c => { c.share = Math.round((c.share / compSum) * otherTotal * 10) / 10; });
};

/* ============================================================
   ТУТОРИАЛ — реальная интерактивная подсветка
   ============================================================ */
G.TOUR = {
  staff: [
    { view:'dashboard', selector:'.daily-tasks-panel', icon:'📋', title:'Добро пожаловать!',
      text:'Вы — оператор биллинга. Задача: копить деньги и проходить сюжет. Слева — меню, справа — задачи. Гид покажет по шагам.' },
    { view:'dashboard', selector:'.daily-tasks-list', icon:'✅', title:'Дневные задачи',
      text:'Здесь — что нужно сделать сегодня. Пока не выполнены все — «Следующий день» заблокирован.' },
    { view:'dashboard', selector:'.pending-clients-section', icon:'🆕', title:'Новые клиенты',
      text:'Каждый день приходят клиенты. Принимайте их — они приносят деньги. Отклоняйте — теряете репутацию, но не тащите проблемных.' },
    { view:'dashboard', selector:'.tickets-section', icon:'✉', title:'Заявки',
      text:'Клиенты жалуются. Решайте — иначе к концу дня теряете репутацию, а это влияет на отток.' },
    { view:'dashboard', selector:'.collect-revenue-btn', icon:'💰', title:'Соберите выручку',
      text:'Нажмите — деньги уйдут в кассу. Если не собрать, 20% сгорит при смене дня.' },
    { view:'dashboard', selector:'.advance-day-btn', icon:'📅', title:'Завершите день',
      text:'Когда всё сделано — кнопка разблокируется. Жмите — расходы спишутся, придут новые клиенты и заявки.' },
    { view:'upgrades', selector:'.upgrades-grid', icon:'⚙', title:'Магазин',
      text:'Покупайте улучшения: маркетинг (больше клиентов), автосбор (не терять выручку), поддержка (меньше оттока).' },
    { view:'clients', selector:'.table-wrap', icon:'◔', title:'Клиенты',
      text:'База абонентов. Кликните на строку — карточка с оплатой, заявками и балансом.' },
    { view:'dashboard', selector:null, icon:'🌟', title:'Готовы!',
      text:'Каждый день: соберите выручку → примите клиентов → решите заявки → следующий день. Сюжет начнётся на 5-й день.' }
  ],
  client: [
    { view:'dashboard', selector:'.stats', icon:'◧', title:'Ваш кабинет',
      text:'Здесь баланс, тариф, счета и трафик.' },
    { view:'dashboard', selector:'[data-action="recharge-self"]', icon:'💳', title:'Пополняйте баланс',
      text:'Без баланса счета не оплатятся, и интернет отключат.' },
    { view:'tariff', selector:'.tariff-card', icon:'◆', title:'Меняйте тариф',
      text:'Один клик — и вы на новом тарифе.' },
    { view:'speed', selector:'#start-speed', icon:'⚡', title:'Замер скорости',
      text:'Проверьте реальную скорость соединения.' },
    { view:'support', selector:'[data-action="new-ticket"]', icon:'✉', title:'Поддержка',
      text:'Возникли проблемы — создайте заявку.' }
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
  const hl = overlay.querySelector('#tour-hl');
  const bubble = overlay.querySelector('#tour-bubble');

  const step = () => {
    const s = steps[idx];
    if (s.view && NB.ui.view !== s.view) {
      NB.ui.view = s.view;
      NB.renderView();
      setTimeout(() => step(), 200);
      return;
    }
    document.querySelectorAll('.tutorial-pulse').forEach(el => el.classList.remove('tutorial-pulse'));
    let target = null;
    if (s.selector) target = document.querySelector(s.selector);

    if (target) {
      target.classList.add('tutorial-pulse');
      const r = target.getBoundingClientRect();
      hl.style.display = 'block';
      hl.style.left = (r.left - 6) + 'px';
      hl.style.top = (r.top - 6) + 'px';
      hl.style.width = (r.width + 12) + 'px';
      hl.style.height = (r.height + 12) + 'px';

      const isMobile = window.innerWidth <= 760;
      if (isMobile) {
        bubble.className = 'tour-bubble below';
        bubble.style.left = '12px'; bubble.style.right = '12px'; bubble.style.width = 'auto';
        bubble.style.top = (r.bottom + 18) + 'px';
        bubble.style.transform = 'none';
      } else {
        bubble.className = 'tour-bubble left';
        bubble.style.width = '320px';
        bubble.style.transform = 'none';
        bubble.style.left = Math.min(r.right + 20, window.innerWidth - 340) + 'px';
        bubble.style.top = Math.max(12, r.top - 22) + 'px';
      }
    } else {
      hl.style.display = 'none';
      bubble.className = 'tour-bubble left';
      bubble.style.width = '360px';
      bubble.style.left = '50%';
      bubble.style.transform = 'translateX(-50%)';
      bubble.style.top = '160px';
    }

    overlay.querySelector('#tour-icon').textContent  = s.icon;
    overlay.querySelector('#tour-title').textContent = s.title;
    overlay.querySelector('#tour-text').textContent  = s.text;
    overlay.querySelector('#tour-dots').innerHTML = steps.map((_, i) =>
      `<i class="${i === idx ? 'active' : ''}"></i>`).join('');
    overlay.querySelector('#tour-next').textContent = idx === steps.length - 1 ? 'Начать!' : 'Далее';
    overlay.querySelector('#tour-back').style.display = idx > 0 ? '' : 'none';
  };

  const finish = () => {
    document.querySelectorAll('.tutorial-pulse').forEach(el => el.classList.remove('tutorial-pulse'));
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
    if (idx === steps.length - 1) finish(); else { idx++; step(); }
  });
  overlay.querySelector('#tour-back').addEventListener('click', () => { if (idx > 0) { idx--; step(); } });
  overlay.querySelector('#tour-skip').addEventListener('click', finish);
  overlay.style.pointerEvents = 'auto';
  requestAnimationFrame(step);
};

NB.startTour = function () { G.startTour(NB.state.session.role); };

})(window);