/* isp_billing_game.js — апгрейды, события, уровни, туры */
(function (global) {
'use strict';
const NB = global.NB;
const G = NB.game = NB.game || {};

/* ============================================================
   АПГРЕЙДЫ
   ============================================================ */
G.UPGRADES = {
  ddos:           { icon:'🛡', name:'DDoS-защита',           desc:'Отбивает атаки.', costs:[8000,18000,35000], upkeep:[15,40,80], levels:['Базовая','CDN','Автоблок'], minDay: 3 },
  bandwidth:      { icon:'⚡', name:'Пропускная способность', desc:'Расширяет канал. Открывает высокие скорости.', costs:[12000,25000,50000], upkeep:[20,50,100], levels:['+400 Мбит','+800 Мбит','+1200 Мбит'] },
  support:        { icon:'💬', name:'Поддержка',              desc:'Меньше оттока, быстрее оплата.', costs:[6000,15000,30000], upkeep:[15,40,80], levels:['2 оператора','24/7','Менеджеры'], minDay: 5 },
  marketing:      { icon:'📢', name:'Маркетинг',              desc:'Больше клиентов в день.', costs:[10000,22000,45000], upkeep:[20,50,100], levels:['+1 клиент','+2 клиента','+3 клиента'], minDay: 4 },
  fiber:          { icon:'🕸', name:'Оптиковолокно',          desc:'Магистрали. Ещё больше скорости.', costs:[30000,70000], upkeep:[60,150], levels:['Городская','Магистральная'], requiresUpgrade: 'bandwidth' },
  satellite:      { icon:'🛰', name:'Спутник',                desc:'Резерв и покрытие.', costs:[50000], upkeep:[80], levels:['Спутниковый резерв'], minDay: 20 },
  ai:             { icon:'🤖', name:'AI-автоматизация',       desc:'Автоподдержка.', costs:[70000], upkeep:[120], levels:['AI-оператор'], minDay: 30 },
  quantum:        { icon:'⚛', name:'Квантовый шифр',          desc:'Только после особой концовки.', costs:[180000], upkeep:[200], levels:['Квантовая сеть'], requiresFlag: 'quantumUnlocked' },
  firewall:       { icon:'🧱', name:'Firewall',               desc:'Снижает взломы и угрозы.', costs:[12000,30000,60000], upkeep:[20,50,100], levels:['Базовый','Глубокий','ИИ'], minDay: 15 },
  microBooster:   { icon:'🔧', name:'Микроускоритель',        desc:'Небольшой буст канала.', costs:[4000,12000], upkeep:[10,25], levels:['+150','+300'] },
  darkFiber:      { icon:'🌑', name:'Тёмное волокно',          desc:'Секретный канал.', costs:[80000], upkeep:[150], levels:['Скрытая магистраль'], minDay: 40 },
  autoCollect:    { icon:'💰', name:'Автосбор выручки',        desc:'Собирает автоматически.', costs:[6000,15000], upkeep:[10,25], levels:['100%','+5%'], minDay: 6 },
  autoClean:      { icon:'🧹', name:'Автоочистка спама',       desc:'Убирает спам и снижает риск спамеров.', costs:[4000], upkeep:[8], levels:['Скрипт'], minDay: 8 },
  salesBoost:     { icon:'📈', name:'Буст продаж',             desc:'Шанс подключения.', costs:[8000,20000], upkeep:[15,40], levels:['+10%','+20%'], minDay: 10 },
  bunker:         { icon:'🏚', name:'Бункер',                  desc:'Укрытие от глобальной угрозы.', costs:[70000,130000], upkeep:[80,200], levels:['Базовый','Укреплённый'], requiresFlag: 'bunkerBlueprints' },
  anomalyScanner: { icon:'📡', name:'Аномальный сканер',       desc:'Рано предупреждает.', costs:[20000,45000], upkeep:[20,50], levels:['Первый','Полный'], minDay: 12 }
};

G.upgradeVisible = function (key) {
  const u = G.UPGRADES[key];
  const g = NB.state.game;
  if (!u) return false;
  if (u.minDay && g.daily.dayNumber < u.minDay) return false;
  if (u.requiresUpgrade && !g.upgrades[u.requiresUpgrade]) return false;
  if (u.requiresFlag && !g.world.flags[u.requiresFlag]) return false;
  if (key === 'quantum' && !g.unlockedTech.includes('quantum')) return false;
  return true;
};

G.upgradeCost = function (key) {
  if (!G.upgradeVisible(key)) return null;
  const g = NB.state.game;
  const lvl = g.upgrades[key];
  const u = G.UPGRADES[key];
  if (!u || lvl >= u.costs.length) return null;
  return u.costs[lvl];
};

G.dailyUpkeep = function () {
  let s = 0;
  Object.keys(NB.state.game.upgrades).forEach(k => {
    const lvl = NB.state.game.upgrades[k];
    const u = G.UPGRADES[k]; if (!u) return;
    for (let i = 0; i < lvl; i++) s += u.upkeep[i] || 0;
  });
  return s;
};

G.isBroken = key => !!NB.state.game.upgradesBroken[key];

G.buyUpgrade = function (key) {
  if (!G.upgradeVisible(key)) return NB.toast('Недоступно', 'err');
  const cost = G.upgradeCost(key);
  if (cost === null) return NB.toast('Уже максимум', 'err');
  if (NB.state.game.cash < cost) return NB.toast('Недостаточно средств', 'err');
  NB.state.game.cash -= cost;
  NB.state.game.upgrades[key]++;
  NB.state.game.stats.totalExpenses += cost;
  if (NB.state.game.upgradesBroken[key]) delete NB.state.game.upgradesBroken[key];
  NB.notify(`${G.UPGRADES[key].name} ур.${NB.state.game.upgrades[key]}`, 'ok');
  NB.addLog(`Куплено: ${G.UPGRADES[key].name}`, 'success');
  NB.addCompanyXp(5);
  NB.save(); NB.render();
};

G.repairUpgrade = function (key) {
  if (!G.upgradeVisible(key)) return NB.toast('Недоступно', 'err');
  const g = NB.state.game;
  if (!g.upgradesBroken[key]) return;
  const cost = 3000 + (g.upgrades[key] || 1) * 2000;
  if (g.cash < cost) return NB.toast(`Нужно ${NB.money(cost)}`, 'err');
  g.cash -= cost;
  delete g.upgradesBroken[key];
  NB.notify(`Починено: ${G.UPGRADES[key].name}`, 'ok');
  NB.save(); NB.render();
};

/* ============================================================
   СОБЫТИЯ — 22 штуки
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
      { label:'Игнорировать', run:()=>{ for(let i=0;i<3&&i<NB.state.clients.length;i++){ const v=NB.state.clients[i]; NB.state.clients=NB.state.clients.filter(c=>c.id!==v.id); } return '−3 клиента'; }}
    ]
  },
  { id:'ddos', title:'💀 DDoS', desc:'Сеть атакована.', weight:1.4,
    opts:[
      { label:'Защита (5000₽)', run:()=>{ if(NB.state.game.cash<5000) return 'Нет денег'; NB.state.game.cash-=5000; return 'Отбито'; }},
      { label:'Терпеть', run:()=>{ for(let i=0;i<2&&i<NB.state.clients.length;i++){ const v=NB.state.clients[i]; NB.state.clients=NB.state.clients.filter(c=>c.id!==v.id);} return 'Потери'; }}
    ]
  },
  { id:'bigclient', title:'💼 Крупный клиент', desc:'ООО «Ромашка» хочет подключиться.', weight:1.0,
    opts:[
      { label:'Принять', run:()=>{ const t=NB.state.tariffs[NB.state.tariffs.length-1]; NB.state.clients.push({id:NB.state.seq.client++,name:'ООО «Ромашка»',address:NB.genAddress(),phone:NB.genPhone(),tariffId:t.id,balance:0,status:'active',createdAt:new Date().toISOString(),password:NB.DEFAULT_PASS,isDrone:false,risk:'good',revealed:true}); return '+1 крупный клиент'; }},
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
      { label:'Ответить акцией (10k₽)', run:()=>{ if(NB.state.game.cash<10000) return 'Нет денег'; NB.state.game.cash-=10000; for(let i=0;i<5&&i<NB.state.clients.length;i++){ const v=NB.state.clients[i]; NB.state.clients=NB.state.clients.filter(c=>c.id!==v.id);} return 'Потери'; }},
      { label:'Ничего', run:()=>{ for(let i=0;i<8&&i<NB.state.clients.length;i++){ const v=NB.state.clients[i]; NB.state.clients=NB.state.clients.filter(c=>c.id!==v.id);} return 'Потери'; }}
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
      { label:'Провести вечер (1 AP)', run:()=>{ if(!NB.spendAp(1)) return 'Нет AP'; NB.state.game.family.wifeHappiness=Math.min(100,NB.state.game.family.wifeHappiness+15); return 'Хороший вечер'; }},
      { label:'Отложить', run:()=>{ NB.state.game.family.wifeHappiness=Math.max(0,NB.state.game.family.wifeHappiness-10); return 'Промолчала'; }}
    ]
  },
  { id:'broken', title:'⚡ Поломка', desc:'Одно устройство сломалось.', weight:0.8,
    condition:()=>Object.keys(NB.state.game.upgrades).some(k=>NB.state.game.upgrades[k]>0&&!NB.state.game.upgradesBroken[k]),
    opts:[
      { label:'Починить (3000₽)', run:()=>{ if(NB.state.game.cash<3000) return 'Нет денег'; NB.state.game.cash-=3000; return 'Починено'; }},
      { label:'Пока работает', run:()=>{ const opts=Object.keys(NB.state.game.upgrades).filter(k=>NB.state.game.upgrades[k]>0&&!NB.state.game.upgradesBroken[k]); if(opts.length){const k=NB.pick(opts); NB.state.game.upgradesBroken[k]={brokenAt:NB.state.game.daily.dayNumber,reason:'Износ'}; return `Сломалось: ${G.UPGRADES[k].name}`;} return 'Обошлось'; }}
    ]
  },
  { id:'hacker_blackmail', title:'👾 Шантаж', desc:'Кто-то взломал базу клиентов. Требует 15 000 ₽.', weight:0.9,
    opts:[
      { label:'Заплатить', run:()=>{ if(NB.state.game.cash<15000) return 'Нет денег'; NB.state.game.cash-=15000; return 'Заплачено. Инцидент закрыт.'; }},
      { label:'ФСБ (-5000₽)', run:()=>{ if(NB.state.game.cash<5000) return 'Нет денег'; NB.state.game.cash-=5000; NB.state.game.reputation=Math.min(100,NB.state.game.reputation+5); return 'Хакер найден'; }},
      { label:'Игнорировать', run:()=>{ for(let i=0;i<5&&i<NB.state.clients.length;i++){const v=NB.state.clients[i]; NB.state.clients=NB.state.clients.filter(c=>c.id!==v.id);} NB.state.game.reputation=Math.max(0,NB.state.game.reputation-15); return 'База утекла'; }}
    ]
  },
  { id:'outage', title:'⚡ Авария в узле', desc:'Серьёзная авария. 3 часа без интернета.', weight:1.0,
    opts:[
      { label:'Компенсировать (3000₽)', run:()=>{ if(NB.state.game.cash<3000) return 'Нет денег'; NB.state.game.cash-=3000; NB.state.game.reputation=Math.min(100,NB.state.game.reputation+2); return 'Клиенты довольны'; }},
      { label:'Ничего', run:()=>{ NB.state.game.reputation=Math.max(0,NB.state.game.reputation-5); return '−5 реп'; }}
    ]
  },
  { id:'family_vacation', title:'🏖 Отпуск', desc:'Жена хочет на море. Дети тоже.', weight:0.8,
    condition:()=>NB.state.game.family.wife && NB.state.game.daily.dayNumber>20,
    opts:[
      { label:'Оплатить (10 000₽)', run:()=>{ if(NB.state.game.cash<10000) return 'Нет денег'; NB.state.game.cash-=10000; NB.state.game.family.wifeHappiness=Math.min(100,NB.state.game.family.wifeHappiness+30); return 'Семья счастлива'; }},
      { label:'Отложить', run:()=>{ NB.state.game.family.wifeHappiness=Math.max(0,NB.state.game.family.wifeHappiness-15); return 'Жена расстроена'; }}
    ]
  },
  { id:'child_sick', title:'🤒 Ребёнок заболел', desc:'Нужен врач. Срочно.', weight:0.7,
    condition:()=>NB.state.game.family.kids.length>0,
    opts:[
      { label:'Хороший врач (5000₽)', run:()=>{ if(NB.state.game.cash<5000) return 'Нет денег'; NB.state.game.cash-=5000; NB.state.game.family.wifeHappiness=Math.min(100,NB.state.game.family.wifeHappiness+5); return 'Всё хорошо'; }},
      { label:'Скорая', run:()=>{ NB.state.game.family.wifeHappiness=Math.max(0,NB.state.game.family.wifeHappiness-5); return 'Обошлось'; }}
    ]
  },
  { id:'corp_offer', title:'🏢 Слияние', desc:'Крупный конкурент предлагает купить вас за 300 000 ₽.', weight:0.5,
    condition:()=>NB.state.game.unlocks.competitors,
    opts:[
      { label:'Продаться', run:()=>{
        const g = NB.state.game;
        g.cash += 300000;
        g.stats.won = true;
        if (!g.stats.endings.includes('corporate_win')) g.stats.endings.push('corporate_win');
        setTimeout(() => { if (NB.showEndingScreen) NB.showEndingScreen('corporate_win'); }, 400);
        return '🏆 Слияние принято';
      }},
      { label:'Отказать', run:()=>{ if(NB.state.game.competitors.length){const c=NB.pick(NB.state.game.competitors); c.relationship=Math.max(-100,c.relationship-20); c.aggression+=15; return 'Конкурент обиделся';} return 'Отказ'; }}
    ]
  },
  { id:'drone_incident', title:'🤖 Сбой дрона', desc:'Один из дронов-клиентов ведёт себя странно.', weight:0.9,
    condition:()=>NB.state.game.world.drones.enabled,
    opts:[
      { label:'Отключить дрона', run:()=>{ const drone = NB.state.clients.find(c=>c.isDrone); if(drone){ NB.state.clients=NB.state.clients.filter(c=>c.id!==drone.id); } NB.state.game.reputation=Math.min(100,NB.state.game.reputation+3); return 'Инцидент закрыт'; }},
      { label:'Проигнорировать', run:()=>{ NB.state.game.reputation=Math.max(0,NB.state.game.reputation-3); return '−3 реп'; }}
    ]
  },
  { id:'equipment_gift', title:'🎁 Подарок', desc:'Старый друг отдаёт списанный коммутатор.', weight:0.5,
    opts:[
      { label:'Принять', run:()=>{ const lvl=NB.state.game.upgrades.bandwidth; if(lvl<G.UPGRADES.bandwidth.costs.length){ NB.state.game.upgrades.bandwidth++; return 'Бесплатный апгрейд bandwidth'; } return 'Уже не нужно'; }},
      { label:'Отказаться', run:()=>'Отказ' }
    ]
  },
  { id:'talent_search', title:'🔍 Талант', desc:'На рынке появился редкий специалист.', weight:0.6,
    condition:()=>NB.state.game.unlocks.employees,
    opts:[
      { label:'Нанять (8000₽)', run:()=>{ if(NB.state.game.cash<8000) return 'Нет денег'; NB.state.game.cash-=8000; if(NB.employees && NB.employees.generateEmployee){ NB.state.game.employees.push(NB.employees.generateEmployee(2)); } return 'Нанят ценный сотрудник'; }},
      { label:'Пропустить', run:()=>'Пропущено' }
    ]
  },
  { id:'salary_negotiation', title:'💰 Повышение', desc:'Сотрудник просит повышения. Его работа важна.', weight:0.8,
    condition:()=>NB.state.game.employees.length>0,
    opts:[
      { label:'Переговоры (мини-игра)', action:()=>{
        NB.closeModal();
        setTimeout(() => {
          NB.minigames.start('negotiate', (success) => {
            const g = NB.state.game;
            const emp = NB.pick(g.employees);
            if (!emp) { NB.notify('Некого повышать', 'warn'); NB.render(); return; }
            if (success) {
              if (g.cash < 5000) { NB.notify('Переговоры выиграны, но денег нет', 'warn'); NB.render(); return; }
              g.cash -= 5000;
              emp.salary = Math.round(emp.salary * 1.2);
              NB.notify(`${emp.name} доволен. Зарплата повышена.`, 'ok');
            } else {
              g.employees = g.employees.filter(e => e.id !== emp.id);
              NB.notify(`${emp.name} уволился после провала переговоров`, 'warn');
            }
            NB.save(); NB.render();
          }, {
            successText: 'Сотрудник согласен на повышение зарплаты.',
            failText: 'Переговоры провалились. Сотрудник ушёл.'
          });
        }, 250);
        return 'Переговоры начались.';
      }},
      { label:'Дать премию (5000₽)', run:()=>{
        if(NB.state.game.cash<5000) return 'Нет денег';
        NB.state.game.cash-=5000;
        NB.state.game.reputation=Math.min(100,NB.state.game.reputation+2);
        return 'Сотрудник благодарен.';
      }},
      { label:'Отказать', run:()=>{
        if (NB.state.game.employees.length) {
          const emp = NB.pick(NB.state.game.employees);
          NB.state.game.employees = NB.state.game.employees.filter(e => e.id !== emp.id);
          return `${emp.name} ушёл.`;
        }
        return 'Никого не было.';
      }}
    ]
  },
  { id:'hostile_takeover', title:'🏴 Враждебный конкурент', desc:'Starlink атакует: DDoS + переманивание клиентов. За 3 дня можно потерять 20 клиентов.', weight:0.7,
    condition:()=>NB.state.game.unlocks.competitors && NB.state.game.competitors.some(c=>c.alive),
    opts:[
      { label:'Контратака (мини-игра)', action:()=>{
        NB.closeModal();
        setTimeout(() => {
          NB.minigames.start('codebreak', (success) => {
            const g = NB.state.game;
            if (success) {
              g.reputation = Math.min(100, g.reputation + 10);
              NB.notify('Атака отбита. Репутация выросла.', 'ok');
            } else {
              for (let i = 0; i < 5 && i < NB.state.clients.length; i++) {
                const v = NB.state.clients[i];
                NB.state.clients = NB.state.clients.filter(c => c.id !== v.id);
              }
              g.reputation = Math.max(0, g.reputation - 10);
              NB.notify('Контратака провалилась. Потери клиентов.', 'warn');
            }
            NB.save(); NB.render();
          });
        }, 250);
        return 'Контратака начинается...';
      }},
      { label:'Откупиться (10 000₽)', run:()=>{
        if(NB.state.game.cash<10000) return 'Нет денег';
        NB.state.game.cash-=10000;
        return 'Откупились. Атака прекратилась.';
      }},
      { label:'Терпеть', run:()=>{
        for(let i=0;i<8&&i<NB.state.clients.length;i++){const v=NB.state.clients[i]; NB.state.clients=NB.state.clients.filter(c=>c.id!==v.id);}
        NB.state.game.reputation = Math.max(0, NB.state.game.reputation - 15);
        return '−8 клиентов, −15 репутации';
      }}
    ]
  },
  { id:'client_complaint', title:'📢 Массовая жалоба', desc:'10 клиентов жалуются на качество. Требуют компенсацию.', weight:0.9,
    condition:()=>NB.state.game.daily.dayNumber > 15 && NB.state.clients.length > 5,
    opts:[
      { label:'Компенсировать (3000₽)', run:()=>{
        if(NB.state.game.cash<3000) return 'Нет денег';
        NB.state.game.cash-=3000;
        NB.state.game.reputation = Math.min(100, NB.state.game.reputation + 5);
        return '+5 репутации';
      }},
      { label:'Ответить лично (1 AP)', action:()=>{
        if (!NB.spendAp(1)) return 'Нет AP';
        NB.state.game.reputation = Math.min(100, NB.state.game.reputation + 8);
        return '+8 репутации';
      }},
      { label:'Проигнорировать', run:()=>{
        NB.state.game.reputation = Math.max(0, NB.state.game.reputation - 10);
        for(let i=0;i<3&&i<NB.state.clients.length;i++){const v=NB.state.clients[i]; NB.state.clients=NB.state.clients.filter(c=>c.id!==v.id);}
        return '−3 клиента, −10 репутации';
      }}
    ]
  }
];

G.rollEvent = function () {
  const pool = G.EVENTS.filter(e => !e.condition || e.condition());
  const weights = pool.map(e => e.weight || 1);
  const total = weights.reduce((a,b) => a+b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) return pool[i]; }
  return pool[0];
};

G.triggerEvent = function () {
  NB.state.game.activeEvent = { ...G.rollEvent(), triggeredAt: new Date().toISOString() };
  NB.save();
};

G.showEventModal = function () {
  const evt = NB.state.game.activeEvent;
  if (!evt) return;
  const opts = evt.opts.map((o, i) => `<button type="button" class="event-option" data-event-opt="${i}">
    <span class="event-option-label">${o.label}</span>
    <span class="event-option-hint">${o.hint || ''}</span>
  </button>`).join('');
  NB.openModal({ title:'', noSubmit:true, boxClass:'event-modal-box',
    html:`<div class="event-title">${evt.title}</div><div class="event-desc">${evt.desc}</div><div class="event-options">${opts}</div>` });
  setTimeout(() => {
    NB.$$('[data-event-opt]').forEach(btn => btn.addEventListener('click', () => G.resolveEvent(Number(btn.dataset.eventOpt))));
  }, 30);
};

G.resolveEvent = function (idx) {
  const evt = NB.state.game.activeEvent;
  if (!evt) return;
  const opt = evt.opts[idx]; if (!opt) return;

  /* action() — если это мини-игра или кастомное действие */
  let result = '';
  if (opt.action) {
    result = opt.action();
    NB.state.game.activeEvent = null;
    NB.state.game.stats.eventsResolved++;
    NB.closeModal();
    NB.notify(`${evt.title}: ${result || 'выполнено'}`, 'info');
    NB.save();
    if (NB.render) NB.render();
    return;
  }

  if (opt.run) result = opt.run();
  NB.state.game.activeEvent = null;
  NB.state.game.history.push({ id: evt.id, title: evt.title, choice: opt.label, result, at: new Date().toISOString() });
  NB.state.game.stats.eventsResolved++;
  NB.closeModal();
  NB.notify(`${evt.title}: ${result || 'выполнено'}`, 'info');
  NB.save(); NB.checkGameState(); NB.render();
};

/* ============================================================
   УРОВНИ
   ============================================================ */
G.LEVELS = [
  { at:0,       label:'Новичок' },
  { at:50000,   label:'Стартап' },
  { at:100000,  label:'Растущий' },
  { at:250000,  label:'Уверенный' },
  { at:500000,  label:'Профи' },
  { at:1000000, label:'Магнат' }
];

G.levelFor = function (cash) {
  let l = 1;
  for (let i = 0; i < G.LEVELS.length; i++) if (cash >= G.LEVELS[i].at) l = i + 1;
  return l;
};

NB.checkGameState = function () {
  const g = NB.state.game;
  if (g.stats.won || g.stats.lost) return;
  if (g.cash >= g.goal) {
    g.stats.won = true;
    NB.notify('🏆 Цель достигнута!', 'ok');
    NB.confetti();
    NB.save();
    setTimeout(() => { if (NB.showEndingScreen) NB.showEndingScreen('corporate_win'); }, 500);
  } else if (g.cash < -20000) {
    g.stats.lost = true;
    NB.notify('💀 Банкротство', 'warn');
    NB.save();
  }
  const lvl = G.levelFor(g.cash);
  if (lvl > g.level) {
    g.level = lvl;
    NB.notify(`Уровень: ${G.LEVELS[lvl-1].label}`, 'ok');
    NB.save();
  }
};

/* ============================================================
   РЫНОК
   ============================================================ */
G.updateMarketShare = function () {
  const g = NB.state.game;
  const total = NB.state.clients.filter(c => c.status === 'active').length;
  g.marketShare = Math.round(Math.min(45, 5 + total * 0.8));
  if (!g.unlocks.competitors) return;
  const other = 100 - g.marketShare;
  const alive = g.competitors.filter(c => c.alive);
  const sum = alive.reduce((s, c) => s + c.share, 0) || 1;
  alive.forEach(c => { c.share = Math.round((c.share / sum) * other * 10) / 10; });
};

/* ============================================================
   ГЛАВНЫЙ ТУР
   ============================================================ */
G.TOUR = [
  { view:'dashboard', selector:'.daily-tasks-panel', icon:'📋', title:'Добро пожаловать', text:'Слева — меню (открывается по мере роста). Главное — задачи дня. Пока не выполнены — «Следующий день» заблокирован.' },
  { view:'dashboard', selector:'.daily-tasks-list', icon:'✅', title:'Задачи дня', text:'Соберите выручку, примите клиентов, разберите заявки. Только тогда можно завершить день.' },
  { view:'dashboard', selector:'.pending-clients-section', icon:'🆕', title:'Клиенты', text:'Принимайте клиентов — они приносят деньги. Рискованные (взломщики, спамеры, неизвестные) — риск. Неизвестные раскрываются через 3 дня.' },
  { view:'dashboard', selector:'.collect-revenue-btn', icon:'💰', title:'Соберите деньги', text:'Клик «Собрать» — деньги в кассу. Иначе 20% сгорит.' },
  { view:'dashboard', selector:'.economy-panel', icon:'💵', title:'Экономика', text:'Net/день = доход − расход. Минус — плохо. Проверьте «Пропускную способность» и «Маркетинг».' },
  { view:'invoices', selector:'.invoice-tabs', icon:'📄', title:'Счета', text:'Слева — клиенты платят нам. Справа — мы платим (зарплаты, семья, налоги, коммуналка).' },
  { view:'tariffs', selector:'.tariff-grid', icon:'◆', title:'Тарифы', text:'Скорость ограничена пропускной способностью. Цена — от скорости. Покупайте апгрейды, чтобы поднимать планку.' },
  { view:'upgrades', selector:'.upgrades-grid', icon:'⚙', title:'Магазин', text:'Открывается постепенно. Сначала — пропускная способность, маркетинг, автосбор. Остальное — позже.' },
  { view:'dashboard', selector:'.advance-day-btn', icon:'📅', title:'Готовы!', text:'Каждый день: собрать → принять клиентов → заявки → следующий день. Удачи!' }
];

G.startTour = function () {
  const steps = G.TOUR;
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
      setTimeout(step, 220);
      return;
    }
    NB.$$('.tutorial-pulse').forEach(el => el.classList.remove('tutorial-pulse'));
    const target = s.selector ? document.querySelector(s.selector) : null;
    if (target) {
      target.classList.add('tutorial-pulse');
      const r = target.getBoundingClientRect();
      hl.style.display = 'block';
      hl.style.left = (r.left - 6) + 'px';
      hl.style.top = (r.top - 6) + 'px';
      hl.style.width = (r.width + 12) + 'px';
      hl.style.height = (r.height + 12) + 'px';
      const mob = window.innerWidth <= 760;
      if (mob) {
        bubble.className = 'tour-bubble below';
        bubble.style.left = '12px'; bubble.style.right = '12px'; bubble.style.width = 'auto';
        bubble.style.top = (r.bottom + 18) + 'px'; bubble.style.transform = 'none';
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
    overlay.querySelector('#tour-icon').textContent = s.icon;
    overlay.querySelector('#tour-title').textContent = s.title;
    overlay.querySelector('#tour-text').textContent = s.text;
    overlay.querySelector('#tour-dots').innerHTML = steps.map((_, i) => `<i class="${i === idx ? 'active' : ''}"></i>`).join('');
    overlay.querySelector('#tour-next').textContent = idx === steps.length - 1 ? 'Начать!' : 'Далее';
    overlay.querySelector('#tour-back').style.display = idx > 0 ? '' : 'none';
  };

  const finish = () => {
    NB.$$('.tutorial-pulse').forEach(el => el.classList.remove('tutorial-pulse'));
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 300);
    NB.state.onboarded.tour = true;
    if (!NB.state.onboarded.views) NB.state.onboarded.views = {};
    NB.state.onboarded.views.dashboard = true;
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

NB.startTour = () => G.startTour();

/* ============================================================
   ТУРЫ ПО ВКЛАДКАМ
   ============================================================ */
G.TOURS_BY_VIEW = {
  dashboard: [
    { selector:'.daily-tasks-panel', icon:'📋', title:'Задачи дня', text:'Главное: собрать выручку, принять клиентов, разобрать заявки. Пока не выполнено — «Следующий день» заблокирован.' },
    { selector:'.pending-clients-section', icon:'🆕', title:'Клиенты', text:'Принимайте клиентов — деньги. Рискованные (взломщики, спамеры, неизвестные) — риск. Неизвестные раскрываются через 3 дня.' },
    { selector:'.economy-panel', icon:'💵', title:'Экономика', text:'Net/день = доход − расход. Минус — плохо. Проверьте пропускную способность и маркетинг.' },
    { selector:'.advance-day-btn', icon:'📅', title:'Следующий день', text:'Завершает день. Спишутся расходы, придут новые клиенты и заявки.' }
  ],
  chat: [
    { selector:'.chat-wrap', icon:'💬', title:'Поддержка', text:'Клиенты пишут. Отвечайте. Некоторые ответы требуют AP, сотрудников с навыком или мини-игру.' }
  ],
  employees: [
    { selector:'.employees-grid', icon:'👥', title:'Сотрудники', text:'Нанятые помогают в чате и событиях. У них свой AP. Прокачиваются с успешными решениями.' }
  ],
  competitors: [
    { selector:'.comp-list', icon:'🏢', title:'Конкуренты', text:'Можно договариваться (1 AP) или саботировать (2 AP + 10 000 ₽). Отношения влияют на агрессию.' }
  ],
  upgrades: [
    { selector:'.upgrades-grid', icon:'⚙', title:'Магазин', text:'Открывается постепенно. Пропускная способность — ключевая: без неё нельзя ставить высокие тарифы.' }
  ],
  invoices: [
    { selector:'.invoice-tabs', icon:'📄', title:'Счета', text:'Слева — клиенты платят нам. Справа — мы платим (зарплаты, семья, налоги). Просрочки бьют по репутации.' }
  ],
  tariffs: [
    { selector:'.tariff-grid', icon:'◆', title:'Тарифы', text:'Диапазон скорости растёт от пропускной способности. Цена — от скорости. Нельзя ставить максимум без апгрейдов.' }
  ]
};

G.startViewTour = function (view) {
  if (!G.TOURS_BY_VIEW[view]) return;
  if (NB.state.onboarded.views && NB.state.onboarded.views[view]) return;
  if (document.querySelector('.tour-overlay')) return;
  const steps = G.TOURS_BY_VIEW[view];
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
    NB.$$('.tutorial-pulse').forEach(el => el.classList.remove('tutorial-pulse'));
    const target = s.selector ? document.querySelector(s.selector) : null;
    if (target) {
      target.classList.add('tutorial-pulse');
      const r = target.getBoundingClientRect();
      hl.style.display = 'block';
      hl.style.left = (r.left - 6) + 'px';
      hl.style.top = (r.top - 6) + 'px';
      hl.style.width = (r.width + 12) + 'px';
      hl.style.height = (r.height + 12) + 'px';
      const mob = window.innerWidth <= 760;
      if (mob) {
        bubble.className = 'tour-bubble below';
        bubble.style.left = '12px'; bubble.style.right = '12px'; bubble.style.width = 'auto';
        bubble.style.top = (r.bottom + 18) + 'px'; bubble.style.transform = 'none';
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
    overlay.querySelector('#tour-icon').textContent = s.icon;
    overlay.querySelector('#tour-title').textContent = s.title;
    overlay.querySelector('#tour-text').textContent = s.text;
    overlay.querySelector('#tour-dots').innerHTML = steps.map((_, i) => `<i class="${i === idx ? 'active' : ''}"></i>`).join('');
    overlay.querySelector('#tour-next').textContent = idx === steps.length - 1 ? 'Понятно!' : 'Далее';
    overlay.querySelector('#tour-back').style.display = idx > 0 ? '' : 'none';
  };

  const finish = () => {
    NB.$$('.tutorial-pulse').forEach(el => el.classList.remove('tutorial-pulse'));
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 300);
    if (!NB.state.onboarded.views) NB.state.onboarded.views = {};
    NB.state.onboarded.views[view] = true;
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

})(window);