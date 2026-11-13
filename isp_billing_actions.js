/* isp_billing_actions.js — действия */
(function (global) {
'use strict';
const NB = global.NB;
const A = NB.actions = NB.actions || {};

/* ============================================================
   КЛИЕНТЫ
   ============================================================ */
A.acceptClient = function (id) {
  const g = NB.state.game;
  const pc = g.pendingClients.find(c => c.id === Number(id));
  if (!pc) return;
  const isDrone = g.world.drones.enabled && Math.random() < 0.25;
  NB.state.clients.push({
    id: NB.state.seq.client++, name: pc.name, address: pc.address, phone: pc.phone,
    tariffId: pc.tariffId, balance: 0, status: 'active',
    createdAt: new Date().toISOString(), password: NB.DEFAULT_PASS,
    isDrone, risk: pc.risk, revealed: true
  });
  g.pendingClients = g.pendingClients.filter(c => c.id !== pc.id);
  NB.notify(`Принят «${pc.name}»`, 'ok');
  NB.addLog(`Принят клиент: ${pc.name}`, 'success');
  NB.addCompanyXp(5);
  NB.save(); NB.render();
};

A.rejectClient = function (id) {
  const g = NB.state.game;
  const pc = g.pendingClients.find(c => c.id === Number(id));
  if (!pc) return;
  g.pendingClients = g.pendingClients.filter(c => c.id !== pc.id);
  g.reputation = Math.max(0, g.reputation - 1);
  NB.addLog(`Отклонён: ${pc.name}`, 'warn');
  NB.save(); NB.render();
};

A.openClient = function (id) {
  const c = NB.client(Number(id));
  if (!c) return;
  const t = NB.tariff(c.tariffId) || { name:'—', price:0, speed:0, color:'#7a7a86' };
  const myTickets = NB.state.tickets.filter(x => x.clientId === c.id).slice(0, 3);
  const riskLabels = { good:'✓ Надёжный', normal:'— Обычный', risky:'⚠ Рискованный', hacker:'⚠ Возможен взлом', spammer:'⚠ Возможен спам', unknown:'❓ Нет данных' };
  const html = `
    <div class="detail-section">
      <div class="detail-row"><span>Телефон</span><span>${NB.esc(c.phone)}</span></div>
      <div class="detail-row"><span>Адрес</span><span>${NB.esc(c.address)}</span></div>
      <div class="detail-row"><span>Тип</span><span>${c.isDrone ? '🤖 Дрон' : '👤 Человек'}</span></div>
      <div class="detail-row"><span>Риск</span><span>${riskLabels[c.risk] || '—'}</span></div>
      <div class="detail-row"><span>С нами с</span><span>${NB.fmtDate(c.createdAt)}</span></div>
      <div class="detail-row"><span>Статус</span><span>${c.status === 'active' ? '<span class="pill ok">Активен</span>' : '<span class="pill off">Блок</span>'}</span></div>
    </div>
    <div class="detail-section">
      <h4>Тариф</h4>
      <div class="detail-row"><span>План</span><span><span class="tag" style="--c:${t.color}">${NB.esc(t.name)}</span> · ${t.speed} Мбит/с</span></div>
      <div class="detail-row"><span>Абонплата</span><span>${NB.money(t.price)}/мес</span></div>
      <div class="detail-row"><span>Ежедневный доход</span><span>${NB.money(Math.round(t.price / NB.INCOME_DIVISOR))}/день</span></div>
    </div>
    ${myTickets.length ? `<div class="detail-section"><h4>Заявки</h4>${myTickets.map(tk => `<div class="detail-row"><span>${NB.esc(tk.subject)}</span><span class="pill ${tk.status === 'open' ? 'wait' : 'ok'}">${tk.status === 'open' ? 'Открыта' : 'Решена'}</span></div>`).join('')}</div>` : ''}
    <div class="detail-actions">
      <button class="btn ghost small" data-action="edit-client" data-id="${c.id}">Изменить</button>
      <button class="btn ghost small" data-action="toggle" data-id="${c.id}">${c.status === 'active' ? 'Блок' : 'Разблок'}</button>
      <button class="btn ghost small" data-action="del-client" data-id="${c.id}" style="color:var(--danger)">Удалить</button>
    </div>`;
  NB.openModal({ title: c.name, html, noSubmit: true, wide: true });
};

A.editClient = function (id) {
  const c = NB.client(Number(id));
  if (!c) return;
  NB.openModal({
    title: 'Редактировать',
    html: NB.field('ФИО', 'name', 'text', c.name, 'required') +
      NB.field('Адрес', 'address', 'text', c.address) +
      NB.field('Телефон', 'phone', 'text', c.phone, 'required') +
      NB.selectField('Тариф', 'tariffId', NB.state.tariffs.map(t => ({ v: t.id, l: `${t.name} · ${t.price} ₽` }))),
    onSubmit(fd) {
      c.name = String(fd.get('name') || '').trim() || c.name;
      c.address = String(fd.get('address') || '').trim() || '—';
      c.phone = String(fd.get('phone') || '').trim() || c.phone;
      c.tariffId = Number(fd.get('tariffId'));
      NB.save(); NB.closeModal(); NB.render();
    }
  });
  setTimeout(() => { const s = document.querySelector('select[name=tariffId]'); if (s) s.value = c.tariffId; }, 50);
};

A.toggleClient = function (id) {
  const c = NB.client(Number(id));
  if (!c) return;
  c.status = c.status === 'active' ? 'blocked' : 'active';
  NB.save(); NB.closeModal(); NB.render();
};

A.delClient = function (id) {
  const c = NB.client(Number(id));
  if (!c) return;
  if (!confirm(`Удалить «${c.name}»?`)) return;
  NB.state.clients = NB.state.clients.filter(x => x.id !== c.id);
  NB.state.tickets = NB.state.tickets.filter(t => t.clientId !== c.id);
  NB.save(); NB.closeModal(); NB.render();
};

/* ============================================================
   СЧЕТА / КРЕДИТ
   ============================================================ */
A.payBill = function (id) { NB.invoices.payBill(Number(id)); };

A.takeLoan = function () {
  NB.openModal({
    title: 'Кредит', submit: 'Взять',
    html: `<p class="muted" style="margin-bottom:14px">Возврат 130% за 10 месяцев (13% в месяц).</p>` +
      NB.field('Сумма, ₽', 'amount', 'number', '50000', 'min="10000" max="500000" step="10000" required'),
    onSubmit(fd) {
      const amt = Number(fd.get('amount')) || 0;
      NB.invoices.takeLoan(amt);
      NB.closeModal();
    }
  });
};

/* ============================================================
   ТАРИФЫ
   ============================================================ */
A.addTariff = function () {
  NB.openModal({
    title: 'Новый тариф', html: NB.tariffs.formHtml(null),
    onSubmit(fd) {
      const name = String(fd.get('name') || '').trim();
      if (!name) return NB.toast('Укажите название', 'err');
      const r = NB.tariffs.getRange();
      const speed = r.steps[Number(fd.get('speedIdx'))];
      const price = Number(fd.get('price'));
      const v = NB.tariffs.validate(speed, price);
      if (!v.ok) return NB.toast(v.reason, 'err');
      const palette = ['#ff6b00','#ff9500','#ffb347','#ff3d00','#ffaa33','#e85d00'];
      NB.state.tariffs.push({ id: NB.state.seq.tariff++, name, desc: String(fd.get('desc') || '').trim(), speed, price, color: palette[NB.state.tariffs.length % palette.length] });
      NB.save(); NB.closeModal(); NB.render();
      NB.notify(`Создан «${name}»`, 'ok');
    }
  });
  NB.tariffs.bindSliders();
};

A.editTariff = function (id) {
  const t = NB.tariff(Number(id));
  if (!t) return;
  NB.openModal({
    title: 'Редактировать тариф', html: NB.tariffs.formHtml(t),
    onSubmit(fd) {
      const r = NB.tariffs.getRange();
      t.name = String(fd.get('name') || '').trim() || t.name;
      t.desc = String(fd.get('desc') || '').trim();
      t.speed = r.steps[Number(fd.get('speedIdx'))];
      t.price = Number(fd.get('price'));
      const v = NB.tariffs.validate(t.speed, t.price);
      if (!v.ok) return NB.toast(v.reason, 'err');
      NB.save(); NB.closeModal(); NB.render();
    }
  });
  NB.tariffs.bindSliders();
};

A.delTariff = function (id) {
  const t = NB.tariff(Number(id));
  if (!t) return;
  if (NB.state.tariffs.length === 1) return NB.toast('Последний нельзя', 'err');
  const affected = NB.state.clients.filter(c => c.tariffId === t.id);
  if (affected.length) {
    const others = NB.state.tariffs.filter(x => x.id !== t.id).sort((a,b) => a.price - b.price);
    const target = others[0];
    if (!confirm(`У тарифа ${affected.length} клиентов. Перевести на «${target.name}»?`)) return;
    affected.forEach(c => c.tariffId = target.id);
  } else if (!confirm(`Удалить «${t.name}»?`)) return;
  NB.state.tariffs = NB.state.tariffs.filter(x => x.id !== t.id);
  NB.save(); NB.render();
};

/* ============================================================
   ЗАЯВКИ
   ============================================================ */
A.resolveTicket = function (id) {
  const t = NB.state.tickets.find(x => x.id === Number(id));
  if (!t) return;
  t.status = 'resolved';
  NB.state.game.reputation = Math.min(100, NB.state.game.reputation + 1);
  NB.save(); NB.render();
};
A.newTicket = function () { NB.toast('Заявки создаются клиентами автоматически', 'info'); };

/* ============================================================
   СОТРУДНИКИ
   ============================================================ */
A.hireEmployee = function (id) { NB.employees.hire(Number(id)); };
A.fireEmployee = function (id) { NB.employees.fire(Number(id)); };
A.refreshEmployeesPool = function () { NB.employees.refreshPool(); };

A.upgradeEmployee = function (id) {
  if (!NB.employees || !NB.employees.upgrade) return NB.toast('Прокачка недоступна', 'err');
  const g = NB.state.game;
  const emp = g.employees.find(e => e.id === Number(id));
  if (!emp) return;
  const cost = NB.employees.upgradeCost(emp);
  if (g.cash < cost) return NB.toast(`Нужно ${NB.money(cost)}`, 'err');
  const ok = NB.employees.upgrade(Number(id));
  if (ok) {
    setTimeout(() => {
      const card = document.querySelector(`.emp-card [data-action="upgrade-employee"][data-id="${id}"]`);
      const parent = card?.closest('.emp-card');
      if (parent) { parent.classList.add('emp-leveled'); setTimeout(() => parent.classList.remove('emp-leveled'), 900); }
    }, 80);
  }
};

/* ============================================================
   АПГРЕЙДЫ
   ============================================================ */
A.buyUpgrade = function (key) { NB.game.buyUpgrade(key); };
A.repairUpgrade = function (key) { NB.game.repairUpgrade(key); };

/* ============================================================
   КОНКУРЕНТЫ / УГРОЗЫ
   ============================================================ */
A.competitorAction = function (id, key) {
  if (!NB.competitors || !NB.competitors.action) return NB.toast('Действие недоступно', 'err');
  NB.competitors.action(id, key);
};

A.cancelAgreement = function (id, idx) {
  const g = NB.state.game;
  const c = g.competitors.find(x => x.id === id);
  if (!c) return;
  const agreement = c.agreements[Number(idx)];
  if (!agreement) return;
  const label = NB.competitors?.AGREEMENT_TYPES?.[agreement.type]?.label || 'соглашение';
  if (!confirm(`Расторгнуть «${label}» с ${c.name}? Это ударит по отношениям.`)) return;
  NB.competitors.cancelAgreement(c, Number(idx));
};

A.threatAction = function (id, key) {
  if (!NB.competitors || !NB.competitors.actionThreat) return NB.toast('Действие недоступно', 'err');
  NB.competitors.actionThreat(id, key);
};

A.negotiate = function (id) { A.competitorAction(id, 'negotiate'); };
A.sabotage  = function (id) { A.competitorAction(id, 'sabotage'); };

/* ============================================================
   СЮЖЕТ / БУНКЕР
   ============================================================ */
A.openStory = function () { if (NB.story && NB.story.showNextInQueue) NB.story.showNextInQueue(); };

A.buildBunker = function () {
  const g = NB.state.game;
  if (g.world.bunker.built) return NB.toast('Уже построен', 'err');
  if (g.cash < 70000) {
    if (confirm(`Не хватает ${NB.money(70000 - g.cash)}. Взять кредит?`)) {
      NB.invoices.takeLoan(Math.max(10000, Math.ceil((70000 - g.cash) / 10000) * 10000));
      if (g.cash < 70000) return NB.toast('Всё равно не хватает', 'err');
    } else return;
  }
  g.cash -= 70000;
  g.world.bunker.built = true; g.world.bunker.level = 1;
  g.world.flags.bunkerBlueprints = true; g.world.flags.bunkerBuilt = true;
  NB.notify('🏚 Бункер готов', 'ok');
  NB.addLog('Построен бункер', 'success');
  NB.save(); NB.render();
};

A.bunkerOrderFood = function () {
  const g = NB.state.game;
  if (g.cash < 15000) return NB.toast('Нужно 15 000 ₽', 'err');
  g.cash -= 15000;
  g.world.bunker.food = (g.world.bunker.food || 0) + 10;
  NB.notify('🍖 +10 еды', 'ok');
  NB.addLog('Заказана еда в бункер', 'success');
  NB.save(); NB.render();
};

A.bunkerRecruit = function () {
  const g = NB.state.game;
  g.world.bunker.population = (g.world.bunker.population || 0) + 2;
  g.reputation = Math.min(100, g.reputation + 3);
  NB.notify('Приняты выжившие (+2)', 'ok');
  NB.save(); NB.render();
};

A.bunkerFortify = function () {
  const g = NB.state.game;
  if (g.cash < 20000) return NB.toast('Нужно 20 000 ₽', 'err');
  g.cash -= 20000;
  g.upgrades.bunkerDefense = (g.upgrades.bunkerDefense || 0) + 1;
  NB.notify('🔫 Укрепление', 'ok');
  NB.save(); NB.render();
};

/* ============================================================
   ОБЩЕЕ
   ============================================================ */
A.advanceDay = function () { NB.advanceDay(); };
A.finishDay = function () { NB.advanceDay(); };

A.collectRevenue = function () {
  const g = NB.state.game;
  if (g.daily.pendingRevenue <= 0) return NB.toast('Нечего собирать', 'err');
  const amount = g.daily.pendingRevenue;
  g.cash += amount;
  g.daily.collectedToday += amount;
  g.daily.pendingRevenue = 0;
  NB.notify(`Собрано ${NB.money(amount)}`, 'ok');
  NB.addLog(`Собрано: +${NB.money(amount)}`, 'success');
  const btn = document.querySelector('.collect-revenue-btn');
  if (btn) { btn.classList.add('got-money'); setTimeout(() => btn.classList.remove('got-money'), 500); }
  NB.save(); NB.render();
};

A.exportData = function () {
  const blob = new Blob([JSON.stringify(NB.state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `netbill-${Date.now()}.json`;
  a.click();
  NB.toast('Экспортировано', 'ok');
};

A.resetData = function () { NB.resetState(); };
A.startTour = function () { NB.startTour(); };
A.resolveEventModal = function () {
  if (NB.state.game.activeEvent) NB.game.showEventModal();
};

/* ============================================================
   СЕМЬЯ
   ============================================================ */
A.familyEvening = function () {
  const g = NB.state.game;
  if (!g.family.wife) return NB.toast('Нет семьи', 'err');
  if (!NB.spendAp(1)) return NB.toast('Не хватает AP', 'err');
  g.family.wifeHappiness = Math.min(100, g.family.wifeHappiness + 20);
  g.family.crisisShown = false;
  NB.addLog('Проведён вечер с семьёй (+20)', 'success');
  NB.notify('Семья довольна', 'ok');
  NB.save(); NB.render();
};

/* ============================================================
   ИСТОРИЯ
   ============================================================ */
A.showHistory = function () {
  const g = NB.state.game;
  const log = (g.history || []).slice(-20).reverse();
  NB.openModal({
    title: 'История решений', noSubmit: true,
    html: log.length
      ? `<div style="max-height:400px;overflow:auto">${log.map(h => `
        <div class="detail-section">
          <div class="detail-row"><span style="color:var(--text)">${NB.esc(h.title)}</span><span style="color:var(--muted);font-size:11.5px">${NB.fmtDateTime(h.at)}</span></div>
          <div class="detail-row"><span>${NB.esc(h.choice)}</span><span>${NB.esc(h.result || '—')}</span></div>
        </div>`).join('')}</div>`
      : '<p class="empty">Пока пусто</p>'
  });
};

/* ============================================================
   NOTIFS
   ============================================================ */
A.showNotifs = function () {
  const existing = document.getElementById('notif-panel');
  if (existing) { existing.classList.remove('show'); setTimeout(() => existing.remove(), 220); return; }
  const st = NB.state;
  const unread = st.notifications.filter(n => !n.read).length;
  const panel = document.createElement('div');
  panel.className = 'notif-panel';
  panel.id = 'notif-panel';
  panel.innerHTML = `
    <div class="notif-panel-head">
      <h3>Уведомления ${unread ? `<span class="notif-badge" style="position:static;margin-left:6px">${unread}</span>` : ''}</h3>
      ${unread ? '<button data-action="mark-read">Прочитать</button>' : ''}
    </div>
    ${st.notifications.length === 0
      ? '<p class="empty" style="padding:20px 0">Пока пусто</p>'
      : st.notifications.slice(0, 20).map(n => `
        <div class="notif-item ${n.read ? '' : 'unread'}">
          <div class="notif-dot" style="background:${n.type === 'ok' ? '#22c55e' : n.type === 'warn' ? '#f59e0b' : '#ff6b00'}"></div>
          <div class="notif-item-body"><b>${NB.esc(n.text)}</b><small>${NB.timeAgo(n.at)}</small></div>
        </div>`).join('')}`;
  document.body.appendChild(panel);
  requestAnimationFrame(() => panel.classList.add('show'));
  setTimeout(() => {
    const close = e => {
      if (!panel.contains(e.target)) { panel.classList.remove('show'); setTimeout(() => panel.remove(), 220); document.removeEventListener('click', close); }
    };
    document.addEventListener('click', close);
  }, 10);
};

A.markRead = function () {
  NB.state.notifications.forEach(n => n.read = true);
  NB.save();
  const p = document.getElementById('notif-panel');
  if (p) { p.classList.remove('show'); setTimeout(() => p.remove(), 200); }
};

/* ============================================================
   MAP
   ============================================================ */
A.map = {
  'export':                   A.exportData,
  'reset-data':               A.resetData,
  'advance-day':              A.advanceDay,
  'finish-day':               A.finishDay,
  'show-notifs':              A.showNotifs,
  'mark-read':                A.markRead,
  'start-tour':               A.startTour,
  'show-history':             A.showHistory,
  'collect-revenue':          A.collectRevenue,
  'resolve-event-modal':      A.resolveEventModal,
  'buy-upgrade':              d => A.buyUpgrade(d.key),
  'repair-upgrade':           d => A.repairUpgrade(d.key),
  'open-story':               A.openStory,
  'build-bunker':             A.buildBunker,
  'bunker-order-food':        A.bunkerOrderFood,
  'bunker-recruit':           A.bunkerRecruit,
  'bunker-fortify':           A.bunkerFortify,
  'family-evening':           A.familyEvening,
  'accept-client':            d => A.acceptClient(d.id),
  'reject-client':            d => A.rejectClient(d.id),
  'open-client':              d => A.openClient(d.id),
  'edit-client':              d => A.editClient(d.id),
  'toggle':                   d => A.toggleClient(d.id),
  'del-client':               d => A.delClient(d.id),
  'add-tariff':               A.addTariff,
  'edit-tariff':              d => A.editTariff(d.id),
  'del-tariff':               d => A.delTariff(d.id),
  'pay-bill':                 d => A.payBill(d.id),
  'take-loan':                A.takeLoan,
  'resolve-ticket':           d => A.resolveTicket(d.id),
  'new-ticket':               A.newTicket,
  'hire-employee':            d => A.hireEmployee(d.id),
  'fire-employee':            d => A.fireEmployee(d.id),
  'refresh-employees-pool':   A.refreshEmployeesPool,
  'upgrade-employee':         d => A.upgradeEmployee(d.id),
  'competitor-action':        d => A.competitorAction(d.id, d.key),
  'cancel-agreement':         d => A.cancelAgreement(d.id, d.idx),
  'threat-action':            d => A.threatAction(d.id, d.key),
  'negotiate':                d => A.negotiate(d.id),
  'sabotage':                 d => A.sabotage(d.id)
};

})(window);