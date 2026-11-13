/* isp_billing_daily.js — день, все эффекты апгрейдов, атаки, голод */
(function (global) {
'use strict';
const NB = global.NB;
const D = NB.daily = NB.daily || {};

const JUNK_SPAM = ['💊 Похудей за 7 дней!','💰 Заработай 50000₽!','🎰 Казино 777','📱 iPhone за 999₽','💎 Крипта ×100','🎁 Ты выиграл миллион'];

D.spawnSpam = function () {
  if (!NB.state.game.unlocks.spam) return;
  if (document.querySelectorAll('.sn-spam.show').length >= 3) return;
  const eff = NB.game.getUpgradeEffects();
  if (eff.spamReduction > 0 && Math.random() < eff.spamReduction * 2) return;
  const el = document.createElement('div'); el.className = 'sn-spam';
  el.style.left = Math.max(10, Math.random()*(window.innerWidth-260))+'px';
  el.style.top = Math.max(10, Math.random()*(window.innerHeight-160))+'px';
  el.innerHTML = `<div class="sn-spam-brand">📣 Реклама <span>×</span></div><div class="sn-spam-body">${NB.pick(JUNK_SPAM)}</div>`;
  document.body.appendChild(el); requestAnimationFrame(()=>el.classList.add('show'));
  const close = () => { el.classList.remove('show'); setTimeout(()=>el.remove(),300); };
  el.querySelector('span').addEventListener('click', e=>{e.stopPropagation();close();});
  el.addEventListener('click', close); setTimeout(close, 5000);
};

/* ============================================================
   БОНУСЫ СОТРУДНИКОВ
   ============================================================ */
D.getEmployeeBonuses = function () {
  const b = { support:0, tech:0, security:0, sales:0, ops:0 };
  NB.state.game.employees.forEach(e => {
    if (!e.spec || !(e.spec in b)) return;
    b[e.spec] += 1 + (e.level||1) - 1;
  });
  return b;
};

D.processEmployeePassives = function () {
  const g = NB.state.game, b = D.getEmployeeBonuses();
  const newApMax = 3 + Math.floor(Math.max(0,g.company.level-1)/3) + Math.floor(b.ops/2);
  if (g.ap.max !== newApMax) { g.ap.max = newApMax; if (g.ap.current>g.ap.max) g.ap.current=g.ap.max; }
  if (b.tech > 0 && Object.keys(g.upgradesBroken).length) {
    if (Math.random() < Math.min(0.4, b.tech*0.08)) {
      const victim = NB.pick(Object.keys(g.upgradesBroken));
      delete g.upgradesBroken[victim];
      NB.addLog(`🔧 ${NB.game.UPGRADES[victim].name} починен техником`, 'success');
    }
  }
};

/* ============================================================
   AI-АВТОРЕШЕНИЕ ЗАЯВОК (новый эффект апгрейда ai)
   ============================================================ */
D.processAiTickets = function () {
  const eff = NB.game.getUpgradeEffects();
  if (eff.autoResolveTickets <= 0) return;
  const open = NB.state.tickets.filter(t => t.status === 'open');
  const max = Math.min(eff.autoResolveTickets, open.length);
  for (let i = 0; i < max; i++) {
    open[i].status = 'resolved';
    NB.addLog(`🤖 AI решил заявку: ${open[i].subject}`, 'success');
  }
  if (max > 0) NB.notify(`🤖 AI решил ${max} заявок`, 'ok');
};

/* ============================================================
   РИСКИ КЛИЕНТОВ (firewall, autoClean)
   ============================================================ */
D.processClientRisks = function () {
  const g = NB.state.game, b = D.getEmployeeBonuses(), eff = NB.game.getUpgradeEffects();
  NB.state.clients.forEach(c => {
    if (c.status !== 'active' || c.isDrone) return;
    if (c.risk === 'hacker') {
      const chance = Math.max(0.003, 0.06 - eff.hackReduction - b.security*0.02);
      if (Math.random() < chance) {
        const guardian = g.employees.find(e => e.ap.current>0 && (e.skills.includes('protect')||e.skills.includes('hack')));
        if (guardian && Math.random()<0.7) { NB.employees.spendAp(guardian.id,1); NB.addLog(`🛡 ${guardian.name} отбил атаку`, 'success'); }
        else { const stolen = Math.min(Math.round(g.cash*0.05), 8000); if (stolen>0) { g.cash -= stolen; NB.addLog(`⚠ «${c.name}» взломал кассу: −${NB.money(stolen)}`, 'warn'); } }
      }
    }
    if (c.risk === 'spammer') {
      if (Math.random() < Math.max(0.05, 0.15 - eff.spamReduction)) {
        g.reputation = Math.max(0, g.reputation-2);
        NB.addLog(`⚠ «${c.name}» спамит: −2 реп`, 'warn');
        if (Math.random()<0.5) setTimeout(()=>D.spawnSpam(),400);
      }
    }
    if (c.risk === 'unknown') {
      c.daysAsUnknown = (c.daysAsUnknown||0)+1;
      if (c.daysAsUnknown >= 3) { c.risk = NB.pick(['good','good','normal','risky','risky','hacker','spammer']); c.daysAsUnknown=0; NB.notify(`🕵 «${c.name}» раскрыт: ${c.risk}`, 'info'); }
    }
  });
};

/* ============================================================
   ПЕРЕГРУЗКА
   ============================================================ */
D.processOverload = function () {
  const g = NB.state.game, load = NB.traffic.getLoad();
  if (load.percent <= 100) return;
  const severity = Math.min(3, (load.percent-100)/100);
  const active = NB.state.clients.filter(c=>c.status==='active'&&!c.isDrone);
  if (active.length && Math.random() < 0.3+severity*0.4) {
    const count = Math.max(1, Math.round(severity*2));
    for (let i=0;i<count&&active.length;i++) {
      const v = NB.pick(active);
      NB.state.clients = NB.state.clients.filter(c=>c.id!==v.id);
      NB.state.invoices = NB.state.invoices.filter(x=>x.clientId!==v.id);
      NB.state.tickets = NB.state.tickets.filter(t=>t.clientId!==v.id);
      NB.addLog(`«${v.name}» ушёл (перегрузка)`, 'warn');
      active.splice(active.indexOf(v),1);
    }
  }
  const repPenalty = Math.round(severity*3);
  if (repPenalty>0) { g.reputation = Math.max(0,g.reputation-repPenalty); NB.addLog(`Перегрузка: −${repPenalty} реп`, 'warn'); }
  if (load.percent>200 && Math.random()<0.15) {
    const broken = Object.keys(g.upgrades).filter(k=>g.upgrades[k]>0 && !g.upgradesBroken[k]);
    if (broken.length) { const victim = NB.pick(broken); g.upgradesBroken[victim]={brokenAt:g.daily.dayNumber,reason:'Перегрузка'}; NB.notify(`⚡ Сломалось: ${NB.game.UPGRADES[victim].name}`, 'warn'); }
  }
  if (load.percent>150) { document.body.classList.add('anomaly-glitch'); setTimeout(()=>document.body.classList.remove('anomaly-glitch'),1500); }
};

/* ============================================================
   ЦЕНООБРАЗОВАНИЕ
   ============================================================ */
D.processPricing = function () {
  const g = NB.state.game, active = NB.state.clients.filter(c=>c.status==='active');
  if (!active.length) return;
  const avg = active.reduce((s,c)=>s+NB.price(c.tariffId),0)/active.length;
  if (avg > 1250 && Math.random() < 0.2*(avg/1250)) {
    const v = NB.pick(active);
    NB.state.clients = NB.state.clients.filter(c=>c.id!==v.id);
    NB.state.invoices = NB.state.invoices.filter(i=>i.clientId!==v.id);
    NB.state.tickets = NB.state.tickets.filter(t=>t.clientId!==v.id);
    NB.addLog(`«${v.name}» ушёл: дорого`, 'warn'); NB.toast('Клиент ушёл: дорого', 'err');
  }
};

/* ============================================================
   АНОМАЛИИ
   ============================================================ */
D.processAnomaly = function () {
  const g = NB.state.game;
  if (g.world.flags.worldSaved || g.world.threat < 1) return;
  const threat = g.world.threat;
  if (Math.random() < 0.15 + threat*0.03) {
    document.body.style.filter = `hue-rotate(${NB.randInt(-30,30)}deg) contrast(${1+Math.random()*0.3})`;
    setTimeout(()=>{document.body.style.filter='';}, 300+threat*100);
  }
  if (threat>=4 && Math.random()<0.15) { document.body.classList.add('anomaly-glitch'); setTimeout(()=>document.body.classList.remove('anomaly-glitch'),500+threat*100); }
  if (threat>=5 && Math.random()<0.08) { NB.effects.shake(200); NB.effects.redFlash(); }
  if (threat>=7 && Math.random()<0.05) { const loss=Math.min(2000,Math.round(g.cash*0.02)); if(loss>0){g.cash-=loss;NB.addLog(`⚠ Аномалия списала ${NB.money(loss)}`,'warn');} }
};

/* ============================================================
   СЕМЬЯ
   ============================================================ */
D.processFamily = function () {
  const g = NB.state.game; if (!g.family.wife) return;
  g.family.wifeHappiness = Math.max(0, g.family.wifeHappiness-1);
  if (g.family.wifeHappiness===0 && !g.family.crisisShown) { g.family.crisisShown=true; NB.notify(`💔 ${g.family.wife.name} на грани`, 'warn'); }
  if (g.family.wifeHappiness===0 && Math.random()<0.25) {
    NB.notify(`💔 ${g.family.wife.name} ушла`, 'warn'); NB.addLog(`${g.family.wife.name} ушла`, 'warn');
    g.family.wife=null; g.reputation=Math.max(0,g.reputation-15);
  }
};

/* ============================================================
   АТАКИ СИНЕССЫ (ddos + firewall + scanner снижают)
   ============================================================ */
D.processSolverAttacks = function () {
  const g = NB.state.game;
  if (g.world.flags.worldSaved || g.world.threat < 3) return;
  const eff = NB.game.getUpgradeEffects();
  const chance = Math.max(0.05, Math.min(0.6, g.world.threat*0.06 - eff.solverAttackReduction));
  if (Math.random() > chance) {
    if (eff.scannerWarn && Math.random() < 0.15) NB.addLog('📡 Сканер: угроза была, но защита сработала', 'info');
    return;
  }
  NB.game.startNightRaid();
  NB.addLog('⚠ Синесса начала ночную охоту', 'warn');
};

/* ============================================================
   БУНКЕР: голод, апгрейды, ресурсы
   ============================================================ */
D.processBunkerHunger = function () {
  const g = NB.state.game; if (!g.world.bunker.built) return;
  const eff = NB.game.getUpgradeEffects();
  /* bunkerFood добавляет еду */
  if (eff.bunkerFoodPerDay > 0) {
    g.world.bunker.food = (g.world.bunker.food || 0) + eff.bunkerFoodPerDay;
    NB.addLog(`🍖 Запасы еды +${eff.bunkerFoodPerDay}`, 'info');
  }
  const pop = g.world.bunker.population || 0;
  const food = g.world.bunker.food || 0;
  const consumption = Math.max(1, Math.ceil(pop/5));
  g.world.bunker.food = Math.max(0, food - consumption);
  if (g.world.bunker.food === 0) {
    g.reputation = Math.max(0, g.reputation-5);
    g.family.wifeHappiness = Math.max(0, g.family.wifeHappiness-10);
    NB.addLog('⚠ В бункере голод', 'warn');
    if (Math.random()<0.2) {
      const v = NB.pick(g.employees);
      if (v) {
        if (Math.random() < eff.bunkerMedChance) NB.addLog(`🏥 ${v.name} выжил благодаря медотсеку`, 'success');
        else { g.employees=g.employees.filter(e=>e.id!==v.id); NB.notify(`💀 ${v.name} умер от голода`,'err'); }
      }
    }
  }
};

/* ============================================================
   ФИНАЛ
   ============================================================ */
D.checkFinale = function () {
  const g = NB.state.game;
  if (g.world.flags.worldSaved && g.world.threat <= 0 && !g.world.flags.finaleShown) {
    g.world.flags.finaleShown = true;
    if (NB.showEndingScreen) NB.showEndingScreen('world_saved');
    return true;
  }
  return false;
};

/* ============================================================
   ADVANCE DAY
   ============================================================ */
D.advanceDay = function () {
  const st = NB.state, g = st.game;
  if (g.stats.won || g.stats.lost) { NB.toast('Игра окончена', 'err'); return; }
  const check = NB.canAdvanceDay();
  if (!check.ok) { NB.toast(check.reason, 'err'); return; }

  const eff = NB.game.getUpgradeEffects();

  /* автосбор */
  if (eff.autoCollect && g.daily.pendingRevenue > 0) {
    g.cash += g.daily.pendingRevenue;
    NB.addLog(`Автосбор: +${NB.money(g.daily.pendingRevenue)}`, 'success');
  }

  /* AI решает заявки */
  D.processAiTickets();

  /* штраф за открытые заявки */
  const openT = st.tickets.filter(t=>t.status==='open');
  if (openT.length) { g.reputation = Math.max(0, g.reputation - openT.length*2); NB.addLog(`Просрочено ${openT.length} заявок: −${openT.length*2} реп`, 'warn'); }

  const cost = NB.dailyCostEstimate();
  g.cash -= cost.total; g.stats.totalExpenses += cost.total;

  g.daily.dayNumber++; st.simDate = NB.addDays(st.simDate,1); g.stats.daysPlayed++;
  g.daily.collectedToday = 0; g.daily.log = [{text:`День ${g.daily.dayNumber}`,type:'info'}];

  NB.resetAp(); NB.checkUnlocks(); D.processEmployeePassives();

  setTimeout(()=>{ const c=document.getElementById('game-cash'); if(c){c.classList.add('flash');setTimeout(()=>c.classList.remove('flash'),800);} },100);

  D.processOverload();
  const load = NB.traffic.getLoad();
  if (load.percent>100) { g.network.stability=Math.max(0,g.network.stability-Math.round((load.percent-100)*0.4)); NB.addLog(`⚠ Перегрузка: −${Math.round((load.percent-100)*0.4)} стабильности`, 'warn'); }
  else if (load.percent<70) { g.network.stability=Math.min(100,g.network.stability+3); }

  const bon = D.getEmployeeBonuses();
  const churn = 0.04 * (1 - eff.churnReduction - bon.support*0.08) * (1+(100-g.reputation)/200) * (1+(100-g.network.stability)/150);
  if (Math.random() < Math.max(0.005, churn)) {
    const active = st.clients.filter(c=>c.status==='active'&&!c.isDrone);
    if (active.length>3) { const v=NB.pick(active); st.clients=st.clients.filter(c=>c.id!==v.id); st.invoices=st.invoices.filter(i=>i.clientId!==v.id); st.tickets=st.tickets.filter(t=>t.clientId!==v.id); NB.addLog(`«${v.name}» ушёл`, 'warn'); }
  }

  D.processClientRisks(); D.processPricing(); D.processFamily();

  if (!g.world.flags.worldSaved) D.processAnomaly();
  else if (g.world.threat>0) { g.world.threat=Math.max(0,g.world.threat-1); if(g.world.threat===0){NB.notify('🌍 Тишина. Аномалии исчезли.','ok');NB.addLog('Аномалии прекратились','success');} }

  /* новые клиенты */
  const base = 2 + eff.newClientBonus + bon.sales*0.5;
  const activeNow = st.clients.filter(c=>c.status==='active');
  const avgPrice = activeNow.reduce((s,c)=>s+NB.price(c.tariffId),0)/Math.max(1,activeNow.length);
  const priceFactor = avgPrice<400?1.5:avgPrice<600?1:avgPrice<900?0.6:0.3;
  const cnt = Math.max(1, Math.round((base+NB.randInt(0,2))*priceFactor));
  for (let i=0;i<cnt;i++) {
    const t = NB.pick(st.tariffs); const roll = Math.random(); let risk='normal',revealed=true,name,phone,address;
    if (roll<0.55) risk='good'; else if(roll<0.75) risk='normal'; else if(roll<0.88) risk='risky'; else if(roll<0.94) risk='hacker'; else if(roll<0.98) risk='spammer'; else {risk='unknown';revealed=false;}
    name = risk==='unknown'?'❓ Неизвестный':(g.world.drones.enabled&&Math.random()<0.2?NB.genDroneName():NB.genName());
    phone = risk==='unknown'?'—':NB.genPhone(); address = risk==='unknown'?'нет данных':NB.genAddress();
    g.pendingClients.push({id:g.pendingClientSeq++,name,address,phone,tariffId:t.id,risk,revealed});
  }
  NB.addLog(`Новые клиенты: ${cnt}`, 'info');

  /* заявки */
  const active = st.clients.filter(c=>c.status==='active');
  if (active.length && Math.random()<0.75) { const tCount=NB.randInt(1,2); for(let i=0;i<tCount;i++){ NB.chat.createTicket(NB.pick(active).id); } NB.addLog(`Новых заявок: ${tCount}`, 'info'); }

  if (NB.invoices.generateForDay) NB.invoices.generateForDay();
  if (NB.invoices.processOverdue) NB.invoices.processOverdue();

  const dom = NB.parseDate(st.simDate).getDate();
  if (dom===1) { const curP=st.simDate.slice(0,7); let created=0; st.clients.forEach(c=>{ if(st.invoices.some(i=>i.clientId===c.id&&i.period===curP))return; st.invoices.push({id:st.seq.invoice++,clientId:c.id,period:curP,amount:NB.price(c.tariffId),status:'unpaid',paidAt:null}); created++; }); if(created)NB.addLog(`Выставлено ${created} счетов`,'info'); }

  st.invoices.forEach(inv => {
    if (inv.status!=='unpaid') return;
    const c = NB.client(inv.clientId); if(!c||c.status!=='active')return;
    if (Math.random() < 0.4 + eff.autoPayChance + bon.support*0.03 && c.balance>=inv.amount) { c.balance-=inv.amount; inv.status='paid'; inv.paidAt=new Date().toISOString(); }
  });

  g.daily.pendingRevenue = NB.dailyIncomeEstimate().total;
  st.revenue.push({date:st.simDate,amount:g.daily.pendingRevenue}); if(st.revenue.length>90)st.revenue.shift();
  st.growth.push({date:st.simDate,count:st.clients.length}); if(st.growth.length>90)st.growth.shift();
  g.stats.totalRevenue += g.daily.pendingRevenue;

  NB.addCompanyXp(10); NB.game.updateMarketShare();
  if (NB.competitors?.tick && g.unlocks.competitors) NB.competitors.tick();

  let ev = false;
  if (Math.random()<0.28) { NB.game.triggerEvent(); ev=true; }

  if (NB.story?.tick) NB.story.tick();

  if (g.unlocks.spam) { const sp = st.clients.filter(c=>c.risk==='spammer').length; if (Math.random()<0.2+g.company.level*0.05+sp*0.08) setTimeout(()=>D.spawnSpam(),400+Math.random()*800); }

  D.processSolverAttacks();
  D.processBunkerHunger();

  if (D.checkFinale()) { NB.save(); NB.render(); return; }

  if (g.world.threat>=8 && !g.world.flags.worldSaved && !g.world.endingTriggered) {
    if (Math.random() < 0.18*(g.world.bunker.built?0.5:1)) { NB.showCynessaEnding(); return; }
  }

  NB.checkGameState(); NB.save(); NB.render();
  setTimeout(()=>{ if(g.world.storyQueue.length) NB.story.showNextInQueue(); else if(ev) NB.game.showEventModal(); },350);
};

})(window);