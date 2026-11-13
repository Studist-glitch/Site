/* isp_billing_game.js — апгрейды, события, туры */
(function (global) {
'use strict';
const NB = global.NB;
const G = NB.game = NB.game || {};

G.UPGRADES = {
  /* ---------- ОБОРУДОВАНИЕ ---------- */
  router:         { icon:'📡', name:'Маршрутизаторы',         desc:'Базовое оборудование. Ускоряет обработку трафика.', costs:[5000,12000,25000], upkeep:[10,25,50], levels:['Базовые','Мощные','Профессиональные'], minDay:2 },
  bandwidth:      { icon:'⚡', name:'Пропускная способность', desc:'Расширяет канал. +3000 Мбит/с за уровень.', costs:[12000,25000,50000], upkeep:[20,50,100], levels:['+3000','+6000','+9000'], minDay:2 },
  microBooster:   { icon:'🔧', name:'Микроускоритель',        desc:'Точечный буст канала. +1200 Мбит/с.', costs:[4000,12000], upkeep:[10,25], levels:['+1200','+2400'], minDay:3 },
  switch:         { icon:'🔀', name:'Коммутаторы',            desc:'Управляемые свитчи. Меньше потерь.', costs:[6000,15000,32000], upkeep:[12,30,60], levels:['Базовые','Управляемые','Стековые'], minDay:4 },
  cooling:        { icon:'❄️', name:'Охлаждение',             desc:'Климат-контроль серверной.', costs:[7000,16000], upkeep:[15,35], levels:['Вентиляция','Климат'], minDay:5 },
  coolingPro:     { icon:'🧊', name:'Промышленное охлаждение',desc:'Для перегруженных узлов.', costs:[22000,48000], upkeep:[40,90], levels:['Серверное','Криогенное'], minDay:30, requiresUpgrade:'cooling' },
  ups:            { icon:'🔋', name:'ИБП',                    desc:'Бесперебойное питание.', costs:[9000,20000], upkeep:[10,25], levels:['Основной','Резервный'], minDay:16 },
  racks:          { icon:'🗄️', name:'Серверные стойки',       desc:'Больше места для оборудования.', costs:[8000,18000], upkeep:[15,35], levels:['Стойка','Дата-центр'], minDay:20, requiresUpgrade:'switch' },

  /* ---------- ТЕХНОЛОГИИ ---------- */
  fiber:          { icon:'🕸', name:'Оптиковолокно',          desc:'Магистральный канал. +5000 Мбит/с.', costs:[30000,70000], upkeep:[60,150], levels:['Городское','Магистральное'], minDay:18, requiresUpgrade:'bandwidth' },
  gpon:           { icon:'💡', name:'GPON',                   desc:'Пассивная оптика.', costs:[45000,90000], upkeep:[70,150], levels:['Дом','Район'], minDay:40, requiresUpgrade:'fiber' },
  docsis:         { icon:'📺', name:'DOCSIS 3.1',             desc:'Интернет по меди.', costs:[18000], upkeep:[40], levels:['Кабельный'], minDay:26 },
  wifi6:          { icon:'📶', name:'Wi-Fi 6 точки',          desc:'Современные точки доступа.', costs:[12000,25000], upkeep:[20,45], levels:['Домашние','Меш-сеть'], minDay:22 },
  mpls:           { icon:'🏢', name:'MPLS',                   desc:'Выделенные каналы для бизнеса.', costs:[35000,75000], upkeep:[50,100], levels:['L2','L3'], minDay:45, requiresUpgrade:'fiber' },
  satellite:      { icon:'🛰', name:'Спутник',                desc:'Резервный канал. +10000 Мбит/с.', costs:[50000], upkeep:[80], levels:['Резерв'], minDay:38 },

  /* ---------- ОПТИМИЗАЦИИ ---------- */
  caching:        { icon:'📦', name:'Кэш-серверы',            desc:'Снижают нагрузку на канал.', costs:[15000,35000], upkeep:[25,60], levels:['Локальный','Распределённый'], minDay:15, requiresUpgrade:'router' },
  cdn:            { icon:'🌐', name:'CDN',                    desc:'Сеть доставки контента.', costs:[22000,48000], upkeep:[40,90], levels:['Региональный','Глобальный'], minDay:20, requiresUpgrade:'caching' },
  qos:            { icon:'🎚', name:'QoS-приоритизация',      desc:'Умное распределение трафика.', costs:[12000,28000], upkeep:[25,60], levels:['Приоритеты','Умный QoS'], minDay:12, requiresUpgrade:'switch' },
  loadBalancer:   { icon:'⚖️', name:'Балансировщик нагрузки', desc:'Распределяет трафик по узлам.', costs:[18000,42000], upkeep:[30,70], levels:['Активный','HA-кластер'], minDay:24, requiresUpgrade:'switch' },
  compression:    { icon:'🗜️', name:'Сжатие трафика',         desc:'Оптимизация потока.', costs:[16000,38000], upkeep:[20,50], levels:['Базовая','Умная'], minDay:18 },
  peering:        { icon:'🔗', name:'Пиринг',                 desc:'Прямое соединение с провайдерами.', costs:[30000,65000], upkeep:[50,110], levels:['Местный','Междугородний'], minDay:30, requiresUpgrade:'caching' },

  /* ---------- СЕРВИС И БИЗНЕС ---------- */
  marketing:      { icon:'📢', name:'Маркетинг',              desc:'Больше новых клиентов.', costs:[10000,22000,45000], upkeep:[20,50,100], levels:['+1','+2','+3'], minDay:8 },
  ddos:           { icon:'🛡', name:'DDoS-защита',            desc:'Отбивает распределённые атаки.', costs:[8000,18000,35000], upkeep:[15,40,80], levels:['Базовая','CDN-фильтр','Автоблок'], minDay:7, requiresFlag:'ddosEncountered' },
  firewall:       { icon:'🧱', name:'Firewall',               desc:'Защита от взломов.', costs:[12000,30000,60000], upkeep:[20,50,100], levels:['Базовый','Глубокий','ИИ'], minDay:14, requiresFlag:'hackerEncountered' },
  honeyPot:       { icon:'🍯', name:'Ханипоты',               desc:'Приманки для хакеров.', costs:[28000,65000], upkeep:[35,80], levels:['Ловушки','Ложные сети'], minDay:45, requiresUpgrade:'firewall' },
  support:        { icon:'💬', name:'Служба поддержки',       desc:'Меньше оттока.', costs:[6000,15000,30000], upkeep:[15,40,80], levels:['2 оператора','24/7','Менеджеры'], minDay:11 },
  autoClean:      { icon:'🧹', name:'Автоочистка спама',      desc:'Фильтр спама.', costs:[4000], upkeep:[8], levels:['Скрипт'], minDay:10 },
  autoCollect:    { icon:'💰', name:'Автосбор выручки',       desc:'Автоматический сбор.', costs:[6000,15000], upkeep:[10,25], levels:['100%','+5%'], minDay:9 },
  salesBoost:     { icon:'📈', name:'Буст продаж',            desc:'Скрипты для менеджеров.', costs:[8000,20000], upkeep:[15,40], levels:['+10%','+20%'], minDay:22 },
  ai:             { icon:'🤖', name:'AI-автоматизация',       desc:'Автоматическое решение заявок.', costs:[70000,120000], upkeep:[120,200], levels:['AI-оператор','AI-менеджер'], minDay:32 },
  anomalyScanner: { icon:'📡', name:'Аномальный сканер',      desc:'Предупреждает об угрозах.', costs:[20000,45000], upkeep:[20,50], levels:['Первый','Полный'], minDay:28, requiresFlag:'anomalyEncountered' },
  backupPower:    { icon:'🔌', name:'Резервное питание',      desc:'Генераторы на случай отключений.', costs:[35000,80000], upkeep:[40,90], levels:['Дизель','Автономная станция'], minDay:50, requiresUpgrade:'ups' },
  darkFiber:      { icon:'🌑', name:'Тёмное волокно',         desc:'Скрытый канал.', costs:[80000], upkeep:[150], levels:['Скрытая магистраль'], minDay:55 },
  droneRepair:    { icon:'🛠', name:'Ремонтные дроны',        desc:'Автопочинка оборудования.', costs:[22000,50000], upkeep:[30,70], levels:['Бригада','Флот'], minDay:60, requiresFlag:'drones' },
  barracks:       { icon:'🏰', name:'Казармы',                desc:'Позволяют обучать воинов.', costs:[30000], upkeep:[60], levels:['Казарма'], minDay:24, requiresFlag:'bunkerBuilt' },
  armory:         { icon:'🔫', name:'Арсенал',                desc:'Оружие и снаряжение для воинов.', costs:[40000,85000], upkeep:[50,110], levels:['Базовый','Полный'], minDay:30, requiresUpgrade:'barracks' },
  trainingGround: { icon:'🥋', name:'Тренировочная база',     desc:'Ускоряет прокачку воинов.', costs:[25000,55000], upkeep:[40,90], levels:['Спортзал','Полоса препятствий'], minDay:35, requiresUpgrade:'barracks' },

  /* ---------- СЮЖЕТ / БУНКЕР / КОВЧЕГ ---------- */
  bunker:         { icon:'🏚', name:'Бункер',                 desc:'Укрытие от угрозы.', costs:[70000,130000,250000], upkeep:[80,200,400], levels:['Базовый','Укреплённый','Крепость'], requiresFlag:'bunkerBlueprints' },
  bunkerFood:     { icon:'🍖', name:'Запасы еды',             desc:'Продовольствие.', costs:[15000,30000], upkeep:[0,0], levels:['+5','+10'], requiresFlag:'bunkerBuilt' },
  bunkerDefense:  { icon:'🛡', name:'Турели',                 desc:'Защита периметра.', costs:[25000,55000], upkeep:[30,70], levels:['Авто-турель','Лазерная сеть'], requiresFlag:'bunkerBuilt' },
  bunkerMed:      { icon:'🏥', name:'Медотсек',               desc:'Лечит выживших.', costs:[20000,40000], upkeep:[25,60], levels:['Аптечка','Операционная'], requiresFlag:'bunkerBuilt' },
  bunkerVent:     { icon:'🌀', name:'Вентиляция',             desc:'Изолированные отсеки.', costs:[18000,38000], upkeep:[20,50], levels:['Фильтры','Изоляция'], requiresFlag:'bunkerBuilt' },
  ark:            { icon:'🏛', name:'Ковчег',                 desc:'Подземный город.', costs:[50000], upkeep:[200], levels:['Первый уровень'], requiresFlag:'arkBuilt' },
  arkSecurity:    { icon:'🛡', name:'Служба безопасности',     desc:'Охрана ковчега.', costs:[30000,70000], upkeep:[50,120], levels:['Отряд','Дивизия'], requiresFlag:'arkBuilt' },
  soldier:        { icon:'🎖', name:'Добровольцы',            desc:'Открывают найм воинов (см. Сотрудники).', costs:[10000,25000,50000], upkeep:[20,50,100], levels:['+5 мест','+15 мест','+30 мест'], requiresFlag:'arkBuilt' }
};

G.upgradeVisible = function (key) {
  const u = G.UPGRADES[key]; if (!u) return false;
  const g = NB.state.game;
  if (u.minDay && g.daily.dayNumber < u.minDay) return false;
  if (u.requiresUpgrade && !g.upgrades[u.requiresUpgrade]) return false;
  if (u.requiresFlag && !g.world.flags[u.requiresFlag]) return false;
  return true;
};

G.upgradeCost = function (key) {
  if (!G.upgradeVisible(key)) return null;
  const g = NB.state.game, lvl = g.upgrades[key] || 0, u = G.UPGRADES[key];
  if (!u || lvl >= u.costs.length) return null;
  return u.costs[lvl];
};

G.dailyUpkeep = function () {
  let s = 0;
  Object.keys(NB.state.game.upgrades).forEach(k => {
    const lvl = NB.state.game.upgrades[k], u = G.UPGRADES[k];
    if (!u) return;
    for (let i = 0; i < lvl; i++) s += u.upkeep[i] || 0;
  });
  return s;
};

G.isBroken = key => !!NB.state.game.upgradesBroken[key];

G.getUpgradeEffects = function () {
  const u = NB.state.game.upgrades;
  const eq = u.router||0, sw = u.switch||0, cool = (u.cooling||0)+(u.coolingPro||0),
    qosLvl = u.qos||0, cache = u.caching||0, upsLvl = u.ups||0, cdnLvl = u.cdn||0,
    lb = u.loadBalancer||0, hp = u.honeyPot||0, bp = u.backupPower||0, dr = u.droneRepair||0,
    comp = u.compression||0, wf = u.wifi6||0, mplsLvl = u.mpls||0, gponLvl = u.gpon||0,
    bq = (u.barracks||0) + (u.armory||0) + (u.trainingGround||0);
  return {
    trafficBonus: (u.bandwidth||0)*3000 + (u.fiber||0)*5000 + (u.satellite||0)*10000
      + (u.microBooster||0)*1200 + (u.darkFiber||0)*5000
      + eq*800 + sw*500 + cache*1500 + cdnLvl*2000 + lb*1000
      + comp*1200 + wf*400 + gponLvl*3000 + mplsLvl*1500,
    churnReduction: (u.support||0)*0.15 + (u.salesBoost||0)*0.05
      + eq*0.02 + sw*0.03 + cool*0.02 + qosLvl*0.04 + upsLvl*0.02
      + lb*0.02 + dr*0.02 + wf*0.03 + mplsLvl*0.02 + gponLvl*0.02,
    newClientBonus: (u.marketing||0) + (u.salesBoost||0)*0.5 + cdnLvl*0.3 + mplsLvl*0.5 + wf*0.2,
    autoPayChance: (u.support||0)*0.05,
    hackReduction: (u.firewall||0)*0.015 + hp*0.03,
    spamReduction: (u.autoClean||0)*0.05,
    autoCollect: u.autoCollect > 0,
    autoResolveTickets: u.ai || 0,
    solverAttackReduction: (u.ddos||0)*0.05 + (u.firewall||0)*0.03
      + (u.anomalyScanner||0)*0.05 + hp*0.05 + bp*0.08,
    bunkerDefense: (u.bunkerDefense||0)*0.15,
    bunkerFoodPerDay: (u.bunkerFood||0)*5,
    bunkerMedChance: (u.bunkerMed||0)*0.10,
    bunkerVentChance: (u.bunkerVent||0)*0.15,
    arkSecurity: (u.arkSecurity||0)*0.10,
    soldierRunBonus: (u.soldier||0)*0.10,
    combatPower: (u.armory||0)*20 + (u.trainingGround||0)*15 + (u.barracks||0)*10,
    stealthBonus: (u.darkFiber||0)*0.1,
    scannerWarn: (u.anomalyScanner||0) > 0
  };
};

/* Capacity с учётом новых апгрейдов */
NB.traffic.getCapacity = function () {
  const u = NB.state.game.upgrades;
  return 5000
    + (u.bandwidth||0)*3000 + (u.fiber||0)*5000 + (u.satellite||0)*10000
    + (u.microBooster||0)*1200 + (u.darkFiber||0)*5000
    + (u.router||0)*800 + (u.switch||0)*500 + (u.caching||0)*1500
    + (u.cdn||0)*2000 + (u.loadBalancer||0)*1000
    + (u.compression||0)*1200 + (u.wifi6||0)*400
    + (u.gpon||0)*3000 + (u.mpls||0)*1500;
};

G.buyUpgrade = function (key) {
  if (!G.upgradeVisible(key)) return NB.toast('Недоступно', 'err');
  const cost = G.upgradeCost(key);
  if (cost === null) return NB.toast('Уже максимум', 'err');
  const g = NB.state.game;
  if (g.cash < cost) return NB.toast('Недостаточно средств', 'err');
  g.cash -= cost;
  g.upgrades[key] = (g.upgrades[key] || 0) + 1;
  g.stats.totalExpenses += cost;
  if (g.upgradesBroken[key]) delete g.upgradesBroken[key];
  if (key === 'bunker')   { g.world.flags.bunkerBuilt = true; g.world.bunker.built = true; g.world.bunker.level = g.upgrades.bunker; }
  if (key === 'ark')      { g.world.flags.arkBuilt = true; g.world.bunker.level = Math.max(g.world.bunker.level, 2); }
  if (key === 'barracks') { g.world.flags.barracksBuilt = true; }
  NB.notify(`${G.UPGRADES[key].name} ур.${g.upgrades[key]}`, 'ok');
  NB.addLog(`Куплено: ${G.UPGRADES[key].name}`, 'success');
  NB.addCompanyXp(5); NB.save(); NB.render();
};

G.repairUpgrade = function (key) {
  if (!G.upgradeVisible(key)) return NB.toast('Недоступно', 'err');
  const g = NB.state.game;
  if (!g.upgradesBroken[key]) return;
  const cost = 3000 + (g.upgrades[key] || 1) * 2000;
  if (g.cash < cost) return NB.toast(`Нужно ${NB.money(cost)}`, 'err');
  g.cash -= cost; delete g.upgradesBroken[key];
  NB.notify(`Починено: ${G.UPGRADES[key].name}`, 'ok'); NB.save(); NB.render();
};

/* ============================================================
   ЭКШЕН-СЦЕНА
   ============================================================ */
G.startActionScene = function (config, callback) {
  const timeLimit = config.timeLimit || 8;
  let timeLeft = timeLimit, resolved = false, timer;
  NB.openModal({
    title: '', noSubmit: true, boxClass: 'action-modal-box',
    html: `<div class="action-scene">
      <div class="action-title">${NB.esc(config.title)}</div>
      <div class="action-desc">${NB.esc(config.desc)}</div>
      <div class="action-timer-bar"><i id="action-timer-fill" style="width:100%"></i></div>
      <div class="action-timer-text" id="action-timer-text">${timeLeft.toFixed(1)}с</div>
      <div class="action-options">${config.options.map((o,i)=>`<button class="action-option" data-action-opt="${i}">${NB.esc(o.label)}</button>`).join('')}</div>
    </div>`
  });
  setTimeout(() => {
    NB.$$('[data-action-opt]').forEach(btn => btn.addEventListener('click', () => {
      if (resolved) return; resolved = true; clearInterval(timer);
      const opt = config.options[Number(btn.dataset.actionOpt)];
      const success = Math.random() < (opt.chance || 0.5);
      NB.closeModal();
      if (success) { if (opt.success) opt.success(); callback(true); }
      else { if (opt.fail) opt.fail(); callback(false); }
    }));
  }, 30);
  timer = setInterval(() => {
    timeLeft -= 0.1;
    const fill = document.getElementById('action-timer-fill');
    const txt = document.getElementById('action-timer-text');
    if (fill) fill.style.width = Math.max(0, (timeLeft / timeLimit) * 100) + '%';
    if (txt) txt.textContent = Math.max(0, timeLeft).toFixed(1) + 'с';
    if (timeLeft <= 0 && !resolved) { resolved = true; clearInterval(timer); NB.closeModal(); NB.toast('Слишком медленно!','err'); callback(false); }
  }, 100);
};

G.triggerSolverAttack = function () {
  const g = NB.state.game;
  if (g.world.threat < 3 || g.world.flags.worldSaved) return;
  const eff = G.getUpgradeEffects();
  document.body.classList.add('solver-flash');
  setTimeout(() => document.body.classList.remove('solver-flash'), 1500);
  const severity = Math.min(3, Math.floor(g.world.threat / 3));
  const baseVictims = NB.randInt(1, severity + 1);
  const victims = Math.max(0, Math.round(baseVictims * Math.max(0, 1 - eff.bunkerDefense)));
  for (let i = 0; i < victims && NB.state.clients.length; i++) {
    const v = NB.pick(NB.state.clients.filter(c => c.status === 'active'));
    if (v) {
      NB.state.clients = NB.state.clients.filter(c => c.id !== v.id);
      NB.state.tickets = NB.state.tickets.filter(t => t.clientId !== v.id);
      NB.addLog(`⚠ Атака: потерян клиент «${v.name}»`, 'warn');
    }
  }
  /* Воины защищают бункер */
  const warriors = (g.employees || []).filter(e => e.spec === 'warrior');
  const combatPower = warriors.reduce((s, e) => s + (e.combat?.attack||0) + (e.combat?.defense||0), 0) + eff.combatPower;
  if (g.world.bunker.built && g.family.wife) {
    const bunkerLvl = g.world.bunker.level || 0;
    const safe = (bunkerLvl >= 2 || combatPower >= 50 || Math.random() > 0.35);
    if (!safe && Math.random() > eff.bunkerMedChance) {
      NB.notify(`💀 Атака добралась до семьи. ${g.family.wife.name} погибла.`, 'err');
      g.family.wife = null; g.family.kids = [];
      g.reputation = Math.max(0, g.reputation - 30);
      document.body.classList.add('corpse-flash');
      setTimeout(() => document.body.classList.remove('corpse-flash'), 2000);
    } else {
      if (combatPower >= 50) NB.addLog(`⚔ Воины отбили атаку (${combatPower} силы)`, 'success');
      else NB.addLog('Семья укрылась в бункере.', 'info');
    }
  } else if (!g.world.bunker.built && g.employees.length) {
    /* Погибают не-воины первыми */
    const nonWarriors = g.employees.filter(e => e.spec !== 'warrior');
    const lost = Math.min(nonWarriors.length, NB.randInt(1, 2));
    for (let i = 0; i < lost; i++) {
      const e = NB.pick(nonWarriors);
      if (Math.random() < eff.bunkerMedChance) { NB.addLog(`🏥 ${e.name} выжил`, 'success'); continue; }
      g.employees = g.employees.filter(x => x.id !== e.id);
      NB.addLog(`Сотрудник ${e.name} погиб`, 'warn');
    }
  }
  if (eff.scannerWarn) NB.notify('📡 Сканер предупредил заранее', 'info');
};

G.startNightRaid = function () {
  let n = 0;
  const max = NB.randInt(2, 4);
  const iv = setInterval(() => {
    if (n >= max || NB.state.game.stats.lost) { clearInterval(iv); return; }
    G.triggerSolverAttack(); n++;
  }, 3000);
};

/* ============================================================
   СОБЫТИЯ — включают навыки сотрудников
   ============================================================ */
G.EVENTS = [
  { id:'coffee', title:'☕ Кофе', desc:'Сотрудники просят кофе.', weight:1.2,
    condition:()=>NB.state.game.employees.length>0,
    opts:[
      { label:'Купить (500₽)', run:()=>{ if(NB.state.game.cash<500) return 'Нет денег'; NB.state.game.cash-=500; NB.state.game.reputation=Math.min(100,NB.state.game.reputation+1); return 'Довольны'; }},
      { label:'Отказать', run:()=>{ NB.state.game.reputation=Math.max(0,NB.state.game.reputation-1); return 'Недовольство'; }}
    ]
  },
  { id:'bug', title:'🐛 Баг', desc:'Клиенты жалуются на списания.', weight:1.4,
    opts:[
      { label:'Исправить (2000₽)', run:()=>{ if(NB.state.game.cash<2000) return 'Нет денег'; NB.state.game.cash-=2000; return 'Исправлено'; }},
      { label:'Поручить технику', employeeSkill:'hardware', run:()=>{ NB.state.game.reputation=Math.min(100,NB.state.game.reputation+2); return 'Техник справился'; }},
      { label:'Игнорировать', run:()=>{ for(let i=0;i<3&&i<NB.state.clients.length;i++){const v=NB.state.clients[i]; NB.state.clients=NB.state.clients.filter(c=>c.id!==v.id);} return '−3 клиента'; }}
    ]
  },
  { id:'ddos', title:'💀 DDoS', desc:'Сеть атакована. Защиты нет.', weight:1.4,
    condition:()=>NB.state.game.daily.dayNumber>=5,
    opts:[
      { label:'Срочная защита (5000₽)', run:()=>{ if(NB.state.game.cash<5000) return 'Нет денег'; NB.state.game.cash-=5000; NB.state.game.world.flags.ddosEncountered=true; return 'Отбито.'; }},
      { label:'Задействовать безопасника', employeeSkill:'protect', run:()=>{ NB.state.game.world.flags.ddosEncountered=true; NB.state.game.reputation=Math.min(100,NB.state.game.reputation+3); return 'Безопасник отбил'; }},
      { label:'Терпеть', run:()=>{ for(let i=0;i<2&&i<NB.state.clients.length;i++){const v=NB.state.clients[i]; NB.state.clients=NB.state.clients.filter(c=>c.id!==v.id);} NB.state.game.world.flags.ddosEncountered=true; return 'Потери'; }}
    ]
  },
  /* --- ТРЕБУЮТ КОНКРЕТНЫХ НАВЫКОВ --- */
  { id:'server_fire', title:'🔥 Пожар в серверной', desc:'Пламя охватило стойки.', weight:1.0,
    condition:()=>NB.state.game.employees.length>0,
    opts:[
      { label:'Пожарные (10 000₽)', cost:10000, run:()=>'Потушили'},
      { label:'Воины (1 AP)', ap:1, employeeSkill:'combat', action:()=>{
        const warrior = NB.employees.bestFor('combat');
        if (!warrior) return 'Нет воинов';
        NB.employees.spendAp(warrior.id, 1);
        NB.employees.levelUp(warrior.id);
        return `${warrior.name} справился. Получил опыт.`;
      }},
      { label:'Отключить оборудование', run:()=>{ const broken=Object.keys(NB.state.game.upgrades).filter(k=>NB.state.game.upgrades[k]>0&&!NB.state.game.upgradesBroken[k]); if(broken.length){const k=NB.pick(broken); NB.state.game.upgradesBroken[k]={brokenAt:NB.state.game.daily.dayNumber,reason:'Пожар'}; return `Сломано: ${NB.GAME?.UPGRADES?.[k]?.name||k}`;} return 'Обошлось'; }}
    ]
  },
  { id:'market_pitch', title:'📊 Крупный тендер', desc:'Город объявил конкурс на подключение.', weight:0.8,
    condition:()=>NB.state.game.reputation>50,
    opts:[
      { label:'Участвовать (1 AP)', ap:1, employeeSkill:'negotiate', action:()=>{
        const m = NB.employees.bestFor('negotiate');
        if (!m) return 'Нужен менеджер';
        NB.employees.spendAp(m.id, 1);
        const win = Math.random() < 0.5 + m.level * 0.05;
        if (win) { NB.state.game.cash += 15000; NB.employees.levelUp(m.id); return `${m.name} выиграл тендер! +15 000 ₽`; }
        return `${m.name} проиграл. Опыт получен.`;
      }},
      { label:'Отказаться', run:()=>'Пропущено' }
    ]
  },
  { id:'medical_emergency', title:'🚑 Эпидемия', desc:'Сотрудники болеют. Нужна помощь.', weight:0.7,
    condition:()=>NB.state.game.employees.length>=2,
    opts:[
      { label:'Врачи (8000₽)', cost:8000, run:()=>'Вылечены'},
      { label:'Оператор организует (1 AP)', ap:1, employeeSkill:'organize', action:()=>{
        const o = NB.employees.bestFor('organize');
        if (!o) return 'Нужен оператор';
        NB.employees.spendAp(o.id, 1);
        NB.employees.levelUp(o.id);
        return `${o.name} организовал карантин`;
      }},
      { label:'Игнорировать', run:()=>{ NB.employees.loseRandom(2); return 'Двое погибли'; }}
    ]
  },
  { id:'underground_dig', title:'⛏ Раскопки', desc:'В подвале нашли проход. Там что-то есть.', weight:0.6,
    condition:()=>NB.state.game.world.bunker.built,
    opts:[
      { label:'Отправить воинов (1 AP)', ap:1, employeeSkill:'raid', action:()=>{
        const w = NB.employees.bestFor('raid');
        if (!w) return 'Нужен воин';
        NB.employees.spendAp(w.id, 1);
        if (Math.random() < 0.6) { NB.state.game.cash += 8000; NB.employees.levelUp(w.id); return `${w.name} нашёл запасы. +8 000 ₽`; }
        NB.employees.loseRandom(1);
        return `${w.name} не вернулся`;
      }},
      { label:'Замуровать', run:()=>'Закрыли проход' }
    ]
  },
  { id:'drone_infiltration', title:'🤖 Инфильтрация', desc:'В сеть пробрался заражённый дрон.', weight:1.0,
    condition:()=>NB.state.game.world.drones.enabled,
    opts:[
      { label:'Безопасник (1 AP)', ap:1, employeeSkill:'hack', action:()=>{
        const s = NB.employees.bestFor('hack');
        if (!s) return 'Нужен безопасник';
        NB.employees.spendAp(s.id, 1);
        NB.employees.levelUp(s.id);
        NB.state.game.world.threat = Math.max(0, NB.state.game.world.threat - 1);
        return `${s.name} взломал дрон`;
      }},
      { label:'Отключить всё (5000₽)', cost:5000, run:()=>'Отключено'},
      { label:'Наблюдать', run:()=>{ NB.state.game.world.threat = Math.min(10, NB.state.game.world.threat + 1); return 'Угроза растёт'; }}
    ]
  },
  { id:'bigclient', title:'💼 Крупный клиент', desc:'ООО «Ромашка» хочет подключиться.', weight:1.0,
    opts:[
      { label:'Принять', run:()=>{ const t=NB.state.tariffs[NB.state.tariffs.length-1]; NB.state.clients.push({id:NB.state.seq.client++,name:'ООО «Ромашка»',address:NB.genAddress(),phone:NB.genPhone(),tariffId:t.id,balance:0,status:'active',createdAt:new Date().toISOString(),password:NB.DEFAULT_PASS,isDrone:false,risk:'good',revealed:true}); return '+1 крупный клиент'; }},
      { label:'Менеджер ведёт', employeeSkill:'negotiate', run:()=>{ const m = NB.employees.bestFor('negotiate'); NB.employees.levelUp(m.id); const t=NB.state.tariffs[NB.state.tariffs.length-1]; NB.state.clients.push({id:NB.state.seq.client++,name:'ООО «Ромашка»',address:NB.genAddress(),phone:NB.genPhone(),tariffId:t.id,balance:0,status:'active',createdAt:new Date().toISOString(),password:NB.DEFAULT_PASS,isDrone:false,risk:'good',revealed:true}); NB.state.game.cash += 3000; return `${m.name} закрыл сделку с бонусом`; }},
      { label:'Отказ', run:()=>'Отказ' }
    ]
  },
  { id:'viral', title:'📈 Вирусный эффект', desc:'Пост стал популярным.', weight:0.9,
    opts:[
      { label:'Вложить (8000₽)', run:()=>{ if(NB.state.game.cash<8000) return 'Нет денег'; NB.state.game.cash-=8000; for(let i=0;i<5;i++){const t=NB.pick(NB.state.tariffs); NB.state.clients.push({id:NB.state.seq.client++,name:NB.genName(),address:NB.genAddress(),phone:NB.genPhone(),tariffId:t.id,balance:0,status:'active',createdAt:new Date().toISOString(),password:NB.DEFAULT_PASS,isDrone:false,risk:'normal',revealed:true});} return '+5 клиентов'; }},
      { label:'Пропустить', run:()=>'Пропущено' }
    ]
  },
  { id:'competitor', title:'🎯 Конкурент', desc:'Крупный конкурент запустил акцию.', weight:1.0,
    condition:()=>NB.state.game.unlocks.competitors,
    opts:[
      { label:'Ответить акцией (10k₽)', run:()=>{ if(NB.state.game.cash<10000) return 'Нет денег'; NB.state.game.cash-=10000; return 'Потери'; }},
      { label:'Ничего', run:()=>{ for(let i=0;i<8&&i<NB.state.clients.length;i++){const v=NB.state.clients[i]; NB.state.clients=NB.state.clients.filter(c=>c.id!==v.id);} return 'Потери'; }}
    ]
  },
  { id:'inspection', title:'📋 Проверка', desc:'Найдены нарушения.', weight:0.7,
    opts:[
      { label:'Оплатить (4000₽)', run:()=>{ if(NB.state.game.cash<4000) return 'Нет денег'; NB.state.game.cash-=4000; return 'Оплачено'; }},
      { label:'Оспорить', run:()=>{ NB.state.game.reputation=Math.max(0,NB.state.game.reputation-10); return '−10 реп'; }}
    ]
  },
  { id:'discount', title:'🏷 Распродажа', desc:'Скидка на оборудование.', weight:0.6,
    condition:()=>NB.state.game.unlocks.advancedUpgrades,
    opts:[
      { label:'Купить 50%', run:()=>{ const lvl=NB.state.game.upgrades.bandwidth; if(lvl>=G.UPGRADES.bandwidth.costs.length) return 'Макс'; const cost=Math.round(G.UPGRADES.bandwidth.costs[lvl]/2); if(NB.state.game.cash<cost) return 'Нет денег'; NB.state.game.cash-=cost; NB.state.game.upgrades.bandwidth++; return 'Куплено'; }},
      { label:'Пропустить', run:()=>'Пропущено' }
    ]
  },
  { id:'staff-poach', title:'🚪 Переманили сотрудника', desc:'Инженер получил оффер.', weight:0.8,
    condition:()=>NB.state.game.employees.length>0,
    opts:[
      { label:'Поднять ЗП (5000₽)', run:()=>{ if(NB.state.game.cash<5000) return 'Нет денег'; NB.state.game.cash-=5000; return 'Остался'; }},
      { label:'Отпустить', run:()=>{ if(NB.state.game.employees.length){const e=NB.pick(NB.state.game.employees); NB.state.game.employees=NB.state.game.employees.filter(x=>x.id!==e.id); return `${e.name} ушёл`;} return 'Никого'; }}
    ]
  },
  { id:'family_ap', title:'👨‍👩‍👧 Семья', desc:'Жена просит время.', weight:1.2,
    condition:()=>NB.state.game.family.wife && NB.state.game.daily.dayNumber>10,
    opts:[
      { label:'Вечер (1 AP)', ap:1, run:()=>{ NB.state.game.family.wifeHappiness=Math.min(100,NB.state.game.family.wifeHappiness+15); return 'Хорошо'; }},
      { label:'Отложить', run:()=>{ NB.state.game.family.wifeHappiness=Math.max(0,NB.state.game.family.wifeHappiness-10); return 'Промолчала'; }}
    ]
  },
  { id:'broken', title:'⚡ Поломка', desc:'Устройство сломалось.', weight:0.8,
    condition:()=>Object.keys(NB.state.game.upgrades).some(k=>NB.state.game.upgrades[k]>0&&!NB.state.game.upgradesBroken[k]),
    opts:[
      { label:'Починить (3000₽)', run:()=>{ if(NB.state.game.cash<3000) return 'Нет денег'; NB.state.game.cash-=3000; return 'Починено'; }},
      { label:'Техник (1 AP)', ap:1, employeeSkill:'repair', action:()=>{
        const t = NB.employees.bestFor('repair');
        if (!t) return 'Нужен техник';
        NB.employees.spendAp(t.id, 1);
        NB.employees.levelUp(t.id);
        return `${t.name} починил`;
      }},
      { label:'Пока работает', run:()=>{ const opts=Object.keys(NB.state.game.upgrades).filter(k=>NB.state.game.upgrades[k]>0&&!NB.state.game.upgradesBroken[k]); if(opts.length){const k=NB.pick(opts); NB.state.game.upgradesBroken[k]={brokenAt:NB.state.game.daily.dayNumber,reason:'Износ'}; return `Сломано`;} return 'Обошлось'; }}
    ]
  },
  { id:'hacker_blackmail', title:'👾 Шантаж', desc:'Взломали базу. Требуют 15 000 ₽.', weight:0.9,
    condition:()=>NB.state.game.daily.dayNumber>=10,
    opts:[
      { label:'Заплатить', run:()=>{ if(NB.state.game.cash<15000) return 'Нет денег'; NB.state.game.cash-=15000; NB.state.game.world.flags.hackerEncountered=true; return 'Заплачено'; }},
      { label:'Контр-взлом (1 AP)', ap:1, employeeSkill:'counterHack', action:()=>{
        const s = NB.employees.bestFor('counterHack');
        if (!s) return 'Нужен безопасник с контр-взломом';
        NB.employees.spendAp(s.id, 1);
        NB.state.game.world.flags.hackerEncountered=true;
        if (Math.random() < 0.6) { NB.state.game.cash += 5000; NB.employees.levelUp(s.id); return `${s.name} поймал хакера. +5 000 ₽`; }
        return `${s.name} провалился. Опыт получен.`;
      }},
      { label:'ФСБ (-5000₽)', run:()=>{ if(NB.state.game.cash<5000) return 'Нет денег'; NB.state.game.cash-=5000; NB.state.game.world.flags.hackerEncountered=true; return 'Найден'; }},
      { label:'Игнорировать', run:()=>{ NB.state.game.world.flags.hackerEncountered=true; NB.state.game.reputation=Math.max(0,NB.state.game.reputation-15); return 'База утекла'; }}
    ]
  },
  { id:'outage', title:'⚡ Авария в узле', desc:'3 часа без интернета.', weight:1.0,
    opts:[
      { label:'Компенсировать (3000₽)', run:()=>{ if(NB.state.game.cash<3000) return 'Нет денег'; NB.state.game.cash-=3000; NB.state.game.reputation=Math.min(100,NB.state.game.reputation+2); return 'Довольны'; }},
      { label:'Ничего', run:()=>{ NB.state.game.reputation=Math.max(0,NB.state.game.reputation-5); return '−5 реп'; }}
    ]
  },
  { id:'family_vacation', title:'🏖 Отпуск', desc:'Жена хочет на море.', weight:0.8,
    condition:()=>NB.state.game.family.wife && NB.state.game.daily.dayNumber>20,
    opts:[
      { label:'Оплатить (10 000₽)', cost:10000, run:()=>{ NB.state.game.family.wifeHappiness=Math.min(100,NB.state.game.family.wifeHappiness+30); return 'Счастлива'; }},
      { label:'Отложить', run:()=>{ NB.state.game.family.wifeHappiness=Math.max(0,NB.state.game.family.wifeHappiness-15); return 'Расстроена'; }}
    ]
  },
  { id:'child_sick', title:'🤒 Ребёнок заболел', desc:'Нужен врач.', weight:0.7,
    condition:()=>NB.state.game.family.kids.length>0,
    opts:[
      { label:'Хороший врач (5000₽)', cost:5000, run:()=>{ NB.state.game.family.wifeHappiness=Math.min(100,NB.state.game.family.wifeHappiness+5); return 'Хорошо'; }},
      { label:'Скорая', run:()=>{ NB.state.game.family.wifeHappiness=Math.max(0,NB.state.game.family.wifeHappiness-5); return 'Обошлось'; }}
    ]
  },
  { id:'corp_offer', title:'🏢 Слияние', desc:'Конкурент предлагает 300 000 ₽.', weight:0.5,
    condition:()=>NB.state.game.unlocks.competitors,
    opts:[
      { label:'Продаться', action:()=>{ const g=NB.state.game; g.cash+=300000; g.stats.won=true; if(!g.stats.endings.includes('corporate_win')) g.stats.endings.push('corporate_win'); setTimeout(()=>NB.showEndingScreen&&NB.showEndingScreen('corporate_win'),400); return '🏆 Слияние'; }},
      { label:'Отказать', run:()=>'Отказ' }
    ]
  },
  { id:'drone_incident', title:'🤖 Сбой дрона', desc:'Дрон-клиент странно себя ведёт.', weight:0.9,
    condition:()=>NB.state.game.world.drones.enabled,
    opts:[
      { label:'Отключить', run:()=>{ const d=NB.state.clients.find(c=>c.isDrone); if(d){NB.state.clients=NB.state.clients.filter(c=>c.id!==d.id);} return 'Закрыто'; }},
      { label:'Игнорировать', run:()=>{ NB.state.game.reputation=Math.max(0,NB.state.game.reputation-3); return '−3 реп'; }}
    ]
  },
  { id:'equipment_gift', title:'🎁 Подарок', desc:'Старый друг отдаёт коммутатор.', weight:0.5,
    opts:[
      { label:'Принять', run:()=>{ const lvl=NB.state.game.upgrades.bandwidth; if(lvl<G.UPGRADES.bandwidth.costs.length){ NB.state.game.upgrades.bandwidth++; return 'Апгрейд'; } return 'Не нужно'; }},
      { label:'Отказаться', run:()=>'Отказ' }
    ]
  },
  { id:'talent_search', title:'🔍 Талант', desc:'Редкий специалист на рынке.', weight:0.6,
    condition:()=>NB.state.game.unlocks.employees,
    opts:[
      { label:'Нанять (8000₽)', cost:8000, run:()=>{ if(NB.employees?.generateEmployee){ NB.state.game.employees.push(NB.employees.generateEmployee(2)); } return 'Нанят'; }},
      { label:'Пропустить', run:()=>'Пропущено' }
    ]
  },
  { id:'salary_negotiation', title:'💰 Повышение', desc:'Сотрудник просит повышения.', weight:0.8,
    condition:()=>NB.state.game.employees.length>0,
    opts:[
      { label:'Переговоры (мини-игра)', action:()=>{ NB.closeModal(); setTimeout(()=>{ NB.minigames.start('negotiate',(success)=>{ const g=NB.state.game; const emp=NB.pick(g.employees); if(!emp){NB.render();return;} if(success){ if(g.cash<5000){NB.notify('Денег нет','warn');NB.render();return;} g.cash-=5000; NB.employees.upgrade(emp.id, true); } else { g.employees=g.employees.filter(e=>e.id!==emp.id); NB.notify(`${emp.name} уволился`,'warn'); } NB.save(); NB.render(); }, {successText:'Согласен.',failText:'Провал.'}); },250); return 'Переговоры'; }},
      { label:'Премия (5000₽)', cost:5000, run:()=>{ NB.state.game.reputation=Math.min(100,NB.state.game.reputation+2); return 'Благодарен'; }},
      { label:'Отказать', run:()=>{ if(NB.state.game.employees.length){const e=NB.pick(NB.state.game.employees); NB.state.game.employees=NB.state.game.employees.filter(x=>x.id!==e.id); return `${e.name} ушёл`;} return 'Никого'; }}
    ]
  },
  { id:'hostile_takeover', title:'🏴 Враждебный конкурент', desc:'Starlink атакует.', weight:0.7,
    condition:()=>NB.state.game.unlocks.competitors && NB.state.game.competitors.some(c=>c.alive),
    opts:[
      { label:'Контратака (мини-игра)', action:()=>{ NB.closeModal(); setTimeout(()=>{ NB.minigames.start('codebreak',(ok)=>{ const g=NB.state.game; if(ok){g.reputation=Math.min(100,g.reputation+10);NB.notify('Отбито!','ok');} else {g.reputation=Math.max(0,g.reputation-10);NB.notify('Провал.','warn');} NB.save(); NB.render(); }); },250); return 'Контратака'; }},
      { label:'Откупиться (10k₽)', cost:10000, run:()=>'Откупились'},
      { label:'Терпеть', run:()=>{ for(let i=0;i<8&&i<NB.state.clients.length;i++){const v=NB.state.clients[i]; NB.state.clients=NB.state.clients.filter(c=>c.id!==v.id);} NB.state.game.reputation=Math.max(0,NB.state.game.reputation-15); return '−8 клиентов'; }}
    ]
  },
  { id:'client_complaint', title:'📢 Массовая жалоба', desc:'10 клиентов недовольны.', weight:0.9,
    condition:()=>NB.state.game.daily.dayNumber>15 && NB.state.clients.length>5,
    opts:[
      { label:'Компенсировать (3000₽)', cost:3000, run:()=>{ NB.state.game.reputation=Math.min(100,NB.state.game.reputation+5); return '+5 реп'; }},
      { label:'Поддержка решает (1 AP)', ap:1, employeeSkill:'chat', action:()=>{
        const s = NB.employees.bestFor('chat');
        if (!s) return 'Нужен поддержка';
        NB.employees.spendAp(s.id, 1);
        NB.employees.levelUp(s.id);
        NB.state.game.reputation = Math.min(100, NB.state.game.reputation + 10);
        return `${s.name} всех успокоил (+10 реп)`;
      }},
      { label:'Игнорировать', run:()=>{ NB.state.game.reputation=Math.max(0,NB.state.game.reputation-10); for(let i=0;i<3&&i<NB.state.clients.length;i++){const v=NB.state.clients[i]; NB.state.clients=NB.state.clients.filter(c=>c.id!==v.id);} return '−3 клиента'; }}
    ]
  },
  { id:'investor_offer', title:'💼 Инвестор', desc:'50 000 ₽ за 15% компании.', weight:0.5,
    condition:()=>NB.state.game.daily.dayNumber>25,
    opts:[
      { label:'Принять', run:()=>{ NB.state.game.cash+=50000; NB.state.game.reputation=Math.max(0,NB.state.game.reputation-5); return '+50 000 ₽'; }},
      { label:'Отказать', run:()=>'Отказ' }
    ]
  },
  { id:'subsidy', title:'🏛 Субсидия', desc:'30 000 ₽ за подключение деревень.', weight:0.6,
    condition:()=>NB.state.game.reputation>60,
    opts:[
      { label:'Взять', run:()=>{ NB.state.game.cash+=30000; NB.state.game.reputation=Math.max(0,NB.state.game.reputation-8); return '+30 000 ₽'; }},
      { label:'Отказать', run:()=>'Отказ' }
    ]
  },
  { id:'vip_client', title:'👑 VIP-клиент', desc:'Богатый клиент хочет VIP-тариф.', weight:0.7,
    condition:()=>NB.state.game.reputation>70,
    opts:[
      { label:'Принять', run:()=>{ if(NB.state.tariffs.length<6){ NB.state.tariffs.push({id:NB.state.seq.tariff++,name:'VIP',speed:500,price:5000,color:'#ffd700',desc:'Персональный VIP'}); } const t=NB.state.tariffs[NB.state.tariffs.length-1]; NB.state.clients.push({id:NB.state.seq.client++,name:'VIP-клиент',address:NB.genAddress(),phone:NB.genPhone(),tariffId:t.id,balance:0,status:'active',createdAt:new Date().toISOString(),password:NB.DEFAULT_PASS,isDrone:false,risk:'good',revealed:true}); return 'VIP подключён'; }},
      { label:'Отказать', run:()=>'Отказ' }
    ]
  },
  { id:'vandalism', title:'🔨 Вандализм', desc:'Кто-то сломал оборудование.', weight:0.8,
    condition:()=>Object.keys(NB.state.game.upgrades).some(k=>NB.state.game.upgrades[k]>0 && !NB.state.game.upgradesBroken[k]),
    opts:[
      { label:'Починить (4000₽)', cost:4000, run:()=>'Восстановлено'},
      { label:'Оставить', run:()=>{ const broken=Object.keys(NB.state.game.upgrades).filter(k=>NB.state.game.upgrades[k]>0 && !NB.state.game.upgradesBroken[k]); if(broken.length){ const k=NB.pick(broken); NB.state.game.upgradesBroken[k]={brokenAt:NB.state.game.daily.dayNumber,reason:'Вандализм'}; return `Сломано`; } return 'Обошлось'; }}
    ]
  },
  { id:'viral_negative', title:'💢 Волна негатива', desc:'Негативный пост стал виральным.', weight:0.9,
    condition:()=>NB.state.game.daily.dayNumber>15,
    opts:[
      { label:'Опровергнуть (1 AP)', ap:1, run:()=>{ NB.state.game.reputation=Math.min(100,NB.state.game.reputation+3); return '+3 реп'; }},
      { label:'Игнорировать', run:()=>{ NB.state.game.reputation=Math.max(0,NB.state.game.reputation-8); for(let i=0;i<2&&i<NB.state.clients.length;i++){const v=NB.state.clients[i]; NB.state.clients=NB.state.clients.filter(c=>c.id!==v.id);} return '−2 клиента'; }},
      { label:'Нанять пиар (8000₽)', cost:8000, run:()=>{ NB.state.game.reputation=Math.min(100,NB.state.game.reputation+5); return '+5 реп'; }}
    ]
  },
  { id:'server_upgrade_offer', title:'⚙ Апгрейд по акции', desc:'Скидка 40% на канал.', weight:0.7,
    condition:()=>NB.state.game.daily.dayNumber>10 && NB.state.game.cash>5000,
    opts:[
      { label:'Купить (40% off)', run:()=>{ const lvl=NB.state.game.upgrades.bandwidth; const max=G.UPGRADES.bandwidth.costs.length; if(lvl>=max) return 'Уже макс'; const cost=Math.round(G.UPGRADES.bandwidth.costs[lvl]*0.6); if(NB.state.game.cash<cost) return 'Нет денег'; NB.state.game.cash-=cost; NB.state.game.upgrades.bandwidth++; return 'Улучшено'; }},
      { label:'Отказаться', run:()=>'Пропущено' }
    ]
  },
  { id:'weather_damage', title:'⛈ Погода сломала кабель', desc:'Гроза повредила магистраль.', weight:0.6,
    condition:()=>NB.state.game.daily.dayNumber>5,
    opts:[
      { label:'Срочный ремонт (6000₽)', cost:6000, run:()=>'Восстановлено'},
      { label:'Ждать', run:()=>{ NB.state.game.reputation=Math.max(0,NB.state.game.reputation-6); return '−6 реп'; }}
    ]
  },
  { id:'neon_secret', title:'🌟 Секрет Neon', desc:'Neon прислал зашифрованный файл.', weight:0.3,
    condition:()=>NB.state.game.world.neon.trust>60 && !NB.state.game.world.flags.neonSecretSeen,
    opts:[
      { label:'Открыть (1 AP)', ap:1, action:()=>{ const g=NB.state.game; g.world.flags.neonSecretSeen=true; g.world.flags.quantumUnlocked=true; g.cash+=50000; NB.notify('🌟 +50 000 ₽','ok'); return 'Квантовый ключ'; }},
      { label:'Удалить', run:()=>'Удалено' }
    ]
  },
  { id:'anomaly_signal', title:'📡 Странный сигнал', desc:'В сети появился сигнал необычной формы.', weight:1.0,
    condition:()=>NB.state.game.daily.dayNumber>=15 && !NB.state.game.world.flags.anomalyEncountered,
    opts:[
      { label:'Исследовать (1 AP)', ap:1, action:()=>{ NB.state.game.world.flags.anomalyEncountered=true; NB.state.game.world.threat=Math.max(1,NB.state.game.world.threat); return 'Понадобится сканер'; }},
      { label:'Игнорировать', run:()=>{ NB.state.game.world.flags.anomalyEncountered=true; NB.state.game.world.threat=Math.min(10,NB.state.game.world.threat+1); return 'Сигнал усиливается'; }}
    ]
  },
  { id:'solver_attack', title:'⚠ Атака', desc:'Жёлтая вспышка. Сеть под ударом.', weight:1.8,
    condition:()=>NB.state.game.world.threat>=3,
    opts:[
      { label:'Спрятаться (1 AP)', ap:1, action:()=>{ NB.game.startActionScene({ title:'Спрятаться', desc:'Шаги.', timeLimit:6,
        options:[
          { label:'В вентиляцию', chance:0.7, success:()=>NB.notify('Спрятались.','ok'), fail:()=>NB.notify('Нашли.','err') },
          { label:'За серверы', chance:0.5, success:()=>NB.notify('Прошло.','ok'), fail:()=>NB.notify('«Ку-ку».','err') }
        ]}, ok=>{ if(!ok) NB.effects.shake(600); }); return 'Действие'; }},
      { label:'Воины прикрывают', employeeSkill:'combat', action:()=>{ const w = NB.employees.bestFor('combat'); if(!w) return 'Нет воинов'; NB.employees.spendAp(w.id, 1); NB.employees.levelUp(w.id); NB.state.game.reputation = Math.min(100, NB.state.game.reputation + 3); return `${w.name} отбил атаку`; }},
      { label:'Притвориться мёртвым', run:()=>{ if(Math.random()<0.4) return 'Прошло.'; NB.state.game.reputation=Math.max(0,NB.state.game.reputation-10); return 'Почуяли.'; }},
      { label:'Бежать', run:()=>{ if(Math.random()<0.3) return 'Убежали.'; NB.state.game.stats.lost=true; return 'Догнали.'; }}
    ]
  },
  { id:'drone_trap', title:'🤖 Дрон-ловушка', desc:'Дрон-клиент перестал отвечать.', weight:1.2,
    condition:()=>NB.state.game.world.drones.enabled,
    opts:[
      { label:'Уничтожить (1 AP)', ap:1, run:()=>{ NB.state.game.world.threat=Math.max(0,NB.state.game.world.threat-1); return 'Взорван'; }},
      { label:'Вскрыть', run:()=>{ if(Math.random()<0.5) return 'Координаты'; NB.state.game.world.threat=Math.min(10,NB.state.game.world.threat+1); return 'Активировался'; }}
    ]
  },
  { id:'refugee_group', title:'🚶 Выжившие', desc:'Группа просит убежища.', weight:1.4,
    condition:()=>NB.state.game.world.bunker.built,
    opts:[
      { label:'Впустить', run:()=>{ const eff=NB.game.getUpgradeEffects(); if(Math.random() < 0.7 + eff.bunkerVentChance){ NB.state.game.world.bunker.population=(NB.state.game.world.bunker.population||0)+3; NB.state.game.reputation=Math.min(100,NB.state.game.reputation+5); return 'Чисты'; } NB.state.game.world.threat=Math.min(10,NB.state.game.world.threat+1); return 'Заражён'; }},
      { label:'Проверить (1 AP)', ap:1, employeeSkill:'forensics', action:()=>{
        const s = NB.employees.bestFor('forensics');
        if (!s) return 'Нужен безопасник с форензикой';
        NB.employees.spendAp(s.id, 1);
        NB.employees.levelUp(s.id);
        NB.state.game.world.bunker.population = (NB.state.game.world.bunker.population||0) + 2;
        return `${s.name} проверил. Чисты.`;
      }},
      { label:'Отказать', run:()=>{ NB.state.game.reputation=Math.max(0,NB.state.game.reputation-10); return 'Ушли'; }}
    ]
  }
];

G.rollEvent = function () {
  const pool = G.EVENTS.filter(e => !e.condition || e.condition());
  const weights = pool.map(e => e.weight || 1);
  let r = Math.random() * weights.reduce((a,b)=>a+b,0);
  for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) return pool[i]; }
  return pool[0];
};

G.triggerEvent = function () {
  NB.state.game.activeEvent = { ...G.rollEvent(), triggeredAt: new Date().toISOString() };
  NB.save();
};

G.showEventModal = function () {
  const evt = NB.state.game.activeEvent; if (!evt) return;
  const opts = evt.opts.map((o, i) => `<button type="button" class="event-option" data-event-opt="${i}"><span class="event-option-label">${o.label}</span><span class="event-option-hint">${o.hint||''}</span></button>`).join('');
  NB.openModal({ title:'', noSubmit:true, boxClass:'event-modal-box', html:`<div class="event-title">${evt.title}</div><div class="event-desc">${evt.desc}</div><div class="event-options">${opts}</div>` });
  setTimeout(() => { NB.$$('[data-event-opt]').forEach(btn => btn.addEventListener('click', () => G.resolveEvent(Number(btn.dataset.eventOpt)))); }, 30);
};

G.resolveEvent = function (idx) {
  const evt = NB.state.game.activeEvent; if (!evt) return;
  const opt = evt.opts[idx]; if (!opt) return;
  let result = '';
  if (opt.action) { result = opt.action(); NB.state.game.activeEvent = null; NB.state.game.stats.eventsResolved++; NB.closeModal(); NB.notify(`${evt.title}: ${result||'выполнено'}`, 'info'); NB.save(); if (NB.render) NB.render(); return; }
  if (opt.run) result = opt.run();
  NB.state.game.activeEvent = null;
  NB.state.game.history.push({ id:evt.id, title:evt.title, choice:opt.label, result, at:new Date().toISOString() });
  NB.state.game.stats.eventsResolved++;
  NB.closeModal(); NB.notify(`${evt.title}: ${result||'выполнено'}`, 'info');
  NB.save(); NB.checkGameState(); NB.render();
};

G.LEVELS = [{at:0,label:'Новичок'},{at:50000,label:'Стартап'},{at:100000,label:'Растущий'},{at:250000,label:'Уверенный'},{at:500000,label:'Профи'},{at:1000000,label:'Магнат'}];
G.levelFor = cash => { let l=1; for (let i=0;i<G.LEVELS.length;i++) if (cash>=G.LEVELS[i].at) l=i+1; return l; };

NB.checkGameState = function () {
  const g = NB.state.game;
  if (g.stats.won || g.stats.lost) return;
  if (g.cash >= g.goal) { g.stats.won = true; NB.notify('🏆 Цель достигнута!', 'ok'); NB.confetti(); NB.save(); setTimeout(()=>NB.showEndingScreen && NB.showEndingScreen('corporate_win'), 500); }
  else if (g.cash < -20000) { g.stats.lost = true; NB.notify('💀 Банкротство', 'warn'); NB.save(); }
  const lvl = G.levelFor(g.cash);
  if (lvl > g.level) { g.level = lvl; NB.notify(`Уровень: ${G.LEVELS[lvl-1].label}`, 'ok'); NB.save(); }
};

G.updateMarketShare = function () {
  const g = NB.state.game;
  const total = NB.state.clients.filter(c=>c.status==='active').length;
  g.marketShare = Math.round(Math.min(45, 5 + total * 0.8));
  if (!g.unlocks.competitors) return;
  const other = 100 - g.marketShare;
  const alive = g.competitors.filter(c=>c.alive);
  const sum = alive.reduce((s,c)=>s+c.share,0)||1;
  alive.forEach(c=>{ c.share = Math.round((c.share/sum)*other*10)/10; });
};

/* ============================================================
   ТУРЫ
   ============================================================ */
G.TOUR = [
  { view:'dashboard', selector:'.daily-tasks-panel', icon:'📋', title:'Добро пожаловать', text:'Слева — меню. Задачи дня — главное. Пока не выполнены — день не завершить.' },
  { view:'dashboard', selector:'.pending-clients-section', icon:'🆕', title:'Клиенты', text:'Принимайте клиентов. Кликните «✓».', interactive:{ selector:'[data-action="accept-client"]', hint:'Кликните ✓ у клиента' } },
  { view:'dashboard', selector:'.collect-revenue-btn', icon:'💰', title:'Соберите деньги', text:'Кликните «Собрать».', interactive:{ selector:'.collect-revenue-btn', hint:'Кликните «Собрать»' } },
  { view:'invoices', selector:'.bills-summary', icon:'📄', title:'Наши расходы', text:'Здесь всё, что платим мы: зарплаты, налоги, коммуналка, семья и кредиты. Просрочки бьют по репутации и деньгам. Если не хватает — возьмите кредит.' },
  { view:'upgrades', selector:'.upgrades-grid', icon:'⚙', title:'Магазин', text:'Оборудование, оптимизации, технологии и защита. Многие улучшения требуют предыдущих — например, кэш нужен для CDN, а охлаждение — для промышленного охлаждения. Некоторые открываются только после того, как вы столкнётесь с новой угрозой или примете особое решение.' }
];
G.TOURS_BY_VIEW = {
  dashboard: G.TOUR,
  chat:[{ selector:'.chat-wrap', icon:'💬', title:'Поддержка', text:'Отвечайте клиентам. Некоторые ответы требуют AP или конкретного сотрудника с нужным навыком.' }],
  upgrades:[{ selector:'.upgrades-grid', icon:'⚙', title:'Магазин', text:'Здесь — оборудование, оптимизации, технологии и защита. Часть улучшений требует предыдущих, часть открывается только при определённых условиях и событиях.' }],
  employees:[{ selector:'.employees-grid', icon:'👥', title:'Сотрудники', text:'Каждый сотрудник — с деревом навыков. Прокачивайте за деньги: растёт зарплата, но открываются новые умения. Воины защищают бункер и участвуют в рейдах.' }]
};

function makeTour(steps, onFinish) {
  if (document.querySelector('.tour-overlay')) return;
  let idx = 0, awaitingAction = false;
  const overlay = document.createElement('div'); overlay.className = 'tour-overlay';
  overlay.innerHTML = `<div class="tour-highlight" id="tour-hl"></div><div class="tour-bubble left" id="tour-bubble"><div class="tour-icon" id="tour-icon"></div><div class="tour-title" id="tour-title"></div><div class="tour-text" id="tour-text"></div><div class="tour-interactive-hint" id="tour-int" style="display:none"></div><div class="tour-dots" id="tour-dots"></div><div class="tour-actions"><button type="button" class="tour-skip" id="tour-skip">Пропустить</button><div class="right"><button type="button" class="tour-back" id="tour-back" style="display:none">Назад</button><button type="button" class="tour-next" id="tour-next">Далее</button></div></div></div>`;
  document.body.appendChild(overlay);
  const hl = overlay.querySelector('#tour-hl'), bubble = overlay.querySelector('#tour-bubble'), nextBtn = overlay.querySelector('#tour-next');
  const getTarget = s => { if (s.interactive && document.querySelector(s.interactive.selector)) return document.querySelector(s.interactive.selector); return document.querySelector(s.selector); };
  const position = target => {
    if (!target) { hl.style.display='none'; bubble.className='tour-bubble'; bubble.style.cssText='width:360px;left:50%;top:50%;transform:translate(-50%,-50%)'; return; }
    const r = target.getBoundingClientRect();
    hl.style.display='block'; hl.style.left=(r.left-6)+'px'; hl.style.top=(r.top-6)+'px'; hl.style.width=(r.width+12)+'px'; hl.style.height=(r.height+12)+'px';
    const bw = 320, bh = bubble.offsetHeight || 260, gap = 16;
    const rightSpace = window.innerWidth - r.right - gap, leftSpace = r.left - gap;
    let bl, bt;
    if (rightSpace >= bw) { bl = r.right + gap; bubble.className='tour-bubble left'; }
    else if (leftSpace >= bw) { bl = r.left - bw - gap; bubble.className='tour-bubble right'; }
    else { bl = Math.max(12, Math.min(window.innerWidth-bw-12, r.left+r.width/2-bw/2)); const belowY = r.bottom+gap; if (belowY+bh < window.innerHeight-12) { bubble.className='tour-bubble below'; bubble.style.cssText=`left:${bl}px;top:${belowY}px;width:${bw}px;transform:none`; return; } bubble.className='tour-bubble above'; bubble.style.cssText=`left:${bl}px;top:${Math.max(12,r.top-bh-gap)}px;width:${bw}px;transform:none`; return; }
    bt = Math.max(12, Math.min(r.top-22, window.innerHeight-bh-12));
    bubble.style.cssText = `left:${bl}px;top:${bt}px;width:${bw}px;transform:none`;
  };
  const update = () => position(getTarget(steps[idx]));
  const cleanup = () => { if (!awaitingAction) return; awaitingAction=false; nextBtn.disabled=false; nextBtn.textContent='Далее'; bubble.classList.remove('awaiting'); const h=document.getElementById('tour-int'); if(h) h.style.display='none'; const s=steps[idx]; if(s&&s.interactive){ const el=document.querySelector(s.interactive.selector); if(el){ el.classList.remove('tutorial-pulse-strong'); if(el._tourCleanup){el._tourCleanup.forEach(fn=>fn());delete el._tourCleanup;} } } };
  const setup = () => { const s=steps[idx]; if(!s.interactive) return; const el=document.querySelector(s.interactive.selector); if(!el) return; awaitingAction=true; nextBtn.disabled=true; nextBtn.textContent='Ждём...'; bubble.classList.add('awaiting'); el.classList.add('tutorial-pulse-strong'); const h=document.getElementById('tour-int'); h.style.display='block'; h.innerHTML=`👉 ${NB.esc(s.interactive.hint)}`; const handler=()=>{ setTimeout(()=>{ cleanup(); idx++; step(); },350); }; el.addEventListener('click',handler); el._tourCleanup=[()=>el.removeEventListener('click',handler)]; };
  const step = () => { cleanup(); const s=steps[idx]; if(s.view && NB.ui.view!==s.view){ NB.ui.view=s.view; NB.renderView(); setTimeout(step,220); return; } NB.$$('.tutorial-pulse').forEach(el=>el.classList.remove('tutorial-pulse')); const t=getTarget(s); if(t) t.classList.add('tutorial-pulse'); position(t); overlay.querySelector('#tour-icon').textContent=s.icon; overlay.querySelector('#tour-title').textContent=s.title; overlay.querySelector('#tour-text').textContent=s.text; overlay.querySelector('#tour-dots').innerHTML=steps.map((_,i)=>`<i class="${i===idx?'active':''}"></i>`).join(''); nextBtn.textContent=idx===steps.length-1?'Понятно!':'Далее'; nextBtn.disabled=false; overlay.querySelector('#tour-back').style.display=idx>0?'':'none'; if(s.interactive) setTimeout(setup,150); };
  const finish = () => { cleanup(); window.removeEventListener('scroll',update); window.removeEventListener('resize',update); NB.$$('.tutorial-pulse,.tutorial-pulse-strong').forEach(el=>{el.classList.remove('tutorial-pulse','tutorial-pulse-strong');}); overlay.style.opacity='0'; setTimeout(()=>overlay.remove(),300); if(onFinish)onFinish(); };
  window.addEventListener('scroll',update,{passive:true}); window.addEventListener('resize',update,{passive:true});
  nextBtn.addEventListener('click',()=>{ if(awaitingAction)return; if(idx===steps.length-1)finish(); else {idx++;step();} });
  overlay.querySelector('#tour-back').addEventListener('click',()=>{ if(idx>0&&!awaitingAction){idx--;step();} });
  overlay.querySelector('#tour-skip').addEventListener('click',finish);
  requestAnimationFrame(step);
}

G.startTour = function () { makeTour(G.TOUR, () => { NB.state.onboarded.tour=true; NB.state.onboarded.views.dashboard=true; NB.save(); }); };
G.startViewTour = function (view) { if(!G.TOURS_BY_VIEW[view]) return; if(view==='dashboard'&&!NB.state.onboarded.tour) return G.startTour(); if(NB.state.onboarded.views?.[view]) return; makeTour(G.TOURS_BY_VIEW[view], ()=>{ NB.state.onboarded.views[view]=true; NB.save(); }); };
NB.startTour = () => G.startTour();

})(window);