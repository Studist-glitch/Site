/* isp_billing_actions.js — все действия */
(function (global) {
'use strict';
const NB = global.NB;
const A = NB.actions = NB.actions || {};

A.genInvoices = function () {
  const p = NB.period();
  let created = 0;
  NB.state.clients.forEach(c => {
    if (NB.state.invoices.some(i => i.clientId === c.id && i.period === p)) return;
    NB.state.invoices.push({ id: NB.state.seq.invoice++, clientId: c.id, period: p,
      amount: NB.price(c.tariffId), status: 'unpaid', paidAt: null });
    created++;
  });
  NB.save();
  if (created) {
    NB.notify(`Выставлено ${created} счетов`, 'ok');
    NB.renderView();
  } else NB.toast('Все счета уже выставлены');
};

A.exportData = function () {
  const blob = new Blob([JSON.stringify(NB.state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `netbill-${Date.now()}.json`;
  a.click();
  NB.toast('Экспортировано', 'ok');
};

A.clearActivity = function () {
  if (!confirm('Очистить журнал?')) return;
  NB.state.activity = [];
  NB.save(); NB.renderView();
  NB.toast('Очищено');
};

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
      ${unread ? '<button data-action="mark-read">Прочитать все</button>' : ''}
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
      if (!panel.contains(e.target)) {
        panel.classList.remove('show');
        setTimeout(() => panel.remove(), 220);
        document.removeEventListener('click', close);
      }
    };
    document.addEventListener('click', close);
  }, 10);
};

A.markRead = function () {
  NB.state.notifications.forEach(n => n.read = true);
  NB.save();
  const panel = document.getElementById('notif-panel');
  if (panel) { panel.classList.remove('show'); setTimeout(() => panel.remove(), 200); }
  document.querySelectorAll('.notif-badge').forEach(el => el.style.display = 'none');
};

A.openClient = function (id) {
  const c = NB.client(Number(id));
  if (!c) return;
  const t = NB.tariff(c.tariffId) || { name: '—', price: 0, speed: 0, color: '#7a7a86' };
  const myInv = NB.state.invoices.filter(i => i.clientId === c.id).sort((a, b) => b.id - a.id).slice(0, 5);
  const myTickets = NB.state.tickets.filter(t => t.clientId === c.id).slice(0, 3);
  const totalPaid = NB.state.invoices.filter(i => i.clientId === c.id && i.status === 'paid')
    .reduce((s, i) => s + i.amount, 0);

  const html = `
    <div class="detail-section">
      <div class="detail-row"><span>Телефон</span><span>${NB.esc(c.phone)}</span></div>
      <div class="detail-row"><span>Адрес</span><span>${NB.esc(c.address)}</span></div>
      <div class="detail-row"><span>Тип</span><span>${c.isDrone ? '🤖 Дрон' : '👤 Человек'}</span></div>
      <div class="detail-row"><span>С нами с</span><span>${NB.fmtDate(c.createdAt)}</span></div>
      <div class="detail-row"><span>Статус</span><span>${c.status === 'active' ? '<span class="pill ok">Активен</span>' : '<span class="pill off">Блок</span>'}</span></div>
    </div>
    <div class="detail-section">
      <h4>Финансы</h4>
      <div class="detail-row"><span>Баланс</span><span style="font-weight:700;color:${c.balance < 0 ? 'var(--danger)' : 'var(--success)'}">${NB.money(c.balance)}</span></div>
      <div class="detail-row"><span>Всего оплачено</span><span>${NB.money(totalPaid)}</span></div>
      <div class="detail-row"><span>Тариф</span><span><span class="tag" style="--c:${t.color}">${NB.esc(t.name)}</span> · ${t.speed} Мбит/с</span></div>
    </div>
    <div class="detail-section">
      <h4>Последние счета</h4>
      ${myInv.length ? myInv.map(i => `<div class="detail-row">
        <span>${NB.periodLabel(i.period)}</span>
        <span>${NB.money(i.amount)} · ${i.status === 'paid' ? '✓ оплачен' : '○ ожидает'}</span>
      </div>`).join('') : '<p class="muted small">Нет</p>'}
    </div>
    ${myTickets.length ? `<div class="detail-section">
      <h4>Заявки</h4>
      ${myTickets.map(tk => `<div class="detail-row">
        <span>${NB.esc(tk.subject)}</span>
        <span class="pill ${tk.status === 'open' ? 'wait' : 'ok'}">${tk.status === 'open' ? 'Открыта' : 'Решена'}</span>
      </div>`).join('')}
    </div>` : ''}
    <div class="detail-actions">
      <button type="button" class="btn primary small" data-action="recharge" data-id="${c.id}">Пополнить</button>
      <button type="button" class="btn ghost small" data-action="edit-client" data-id="${c.id}">Изменить</button>
      <button type="button" class="btn ghost small" data-action="toggle" data-id="${c.id}">${c.status === 'active' ? 'Блокировать' : 'Разблокировать'}</button>
      <button type="button" class="btn ghost small" data-action="del-client" data-id="${c.id}" style="color:var(--danger)">Удалить</button>
    </div>`;

  NB.openModal({ title: c.name, html, noSubmit: true, wide: true });
};

A.addClient = function () {
  NB.openModal({
    title: 'Новый клиент',
    html: NB.field('ФИО', 'name', 'text', '', 'required') +
      NB.field('Адрес', 'address', 'text', '', 'placeholder="ул. …"') +
      NB.field('Телефон', 'phone', 'text', '', 'required') +
      NB.selectField('Тариф', 'tariffId', NB.state.tariffs.map(t => ({ v: t.id, l: `${t.name} · ${t.price} ₽` }))),
    onSubmit(fd) {
      const name = String(fd.get('name') || '').trim();
      if (!name) return NB.toast('Укажите имя', 'err');
      NB.state.clients.push({
        id: NB.state.seq.client++, name,
        address: String(fd.get('address') || '').trim() || NB.genAddress(),
        phone: String(fd.get('phone') || '').trim() || NB.genPhone(),
        tariffId: Number(fd.get('tariffId')),
        balance: 0, status: 'active',
        createdAt: new Date().toISOString(), password: NB.DEFAULT_PASS,
        isDrone: false
      });
      NB.save();
      NB.notify(`Добавлен клиент «${name}»`, 'ok');
      NB.closeModal(); NB.renderView();
    }
  });
};

A.editClient = function (id) {
  const c = NB.client(Number(id));
  if (!c) return;
  NB.openModal({
    title: 'Редактировать клиента',
    html: NB.field('ФИО', 'name', 'text', c.name, 'required') +
      NB.field('Адрес', 'address', 'text', c.address) +
      NB.field('Телефон', 'phone', 'text', c.phone, 'required') +
      NB.selectField('Тариф', 'tariffId', NB.state.tariffs.map(t => ({ v: t.id, l: `${t.name} · ${t.price} ₽` }))),
    onSubmit(fd) {
      c.name = String(fd.get('name') || '').trim() || c.name;
      c.address = String(fd.get('address') || '').trim() || '—';
      c.phone = String(fd.get('phone') || '').trim() || c.phone;
      c.tariffId = Number(fd.get('tariffId'));
      NB.save();
      NB.notify(`Клиент «${c.name}» обновлён`, 'ok');
      NB.closeModal(); NB.renderView();
    }
  });
  setTimeout(() => { const sel = document.querySelector('select[name=tariffId]'); if (sel) sel.value = c.tariffId; }, 50);
};

A.rechargeClient = function (id) {
  const c = NB.client(Number(id));
  if (!c) return;
  NB.openModal({
    title: 'Пополнить баланс',
    submit: 'Пополнить',
    html: `<p class="muted" style="margin-bottom:14px">${NB.esc(c.name)} · баланс ${NB.money(c.balance)}</p>` +
      NB.field('Сумма, ₽', 'amount', 'number', '500', 'min="1" step="50" required'),
    onSubmit(fd) {
      const amt = Number(fd.get('amount')) || 0;
      if (amt <= 0) return NB.toast('Введите положительную сумму', 'err');
      c.balance += amt;
      NB.save();
      NB.notify(`Баланс «${c.name}» пополнен`, 'ok');
      NB.closeModal(); NB.renderView();
    }
  });
};

A.toggleClient = function (id) {
  const c = NB.client(Number(id));
  if (!c) return;
  c.status = c.status === 'active' ? 'blocked' : 'active';
  NB.save();
  NB.notify(`${c.status === 'active' ? 'Разблокирован' : 'Заблокирован'} «${c.name}»`, 'ok');
  NB.closeModal(); NB.renderView();
};

A.delClient = function (id) {
  const c = NB.client(Number(id));
  if (!c) return;
  if (!confirm(`Удалить клиента «${c.name}»?`)) return;
  NB.state.clients = NB.state.clients.filter(x => x.id !== c.id);
  NB.state.invoices = NB.state.invoices.filter(i => i.clientId !== c.id);
  NB.state.tickets = NB.state.tickets.filter(t => t.clientId !== c.id);
  NB.save();
  NB.notify(`Клиент «${c.name}» удалён`, 'warn');
  NB.closeModal(); NB.renderView();
};

A.payInvoiceStaff = function (id) {
  const inv = NB.state.invoices.find(i => i.id === Number(id));
  if (!inv || inv.status === 'paid') return;
  inv.status = 'paid';
  inv.paidAt = new Date().toISOString();
  NB.save();
  NB.notify(`Счёт #${inv.id} оплачен (${NB.money(inv.amount)})`, 'ok');
  NB.renderView();
};

A.payInvoiceSelf = function (id) {
  const inv = NB.state.invoices.find(i => i.id === Number(id));
  if (!inv || inv.status === 'paid') return;
  const c = NB.client(NB.state.session.id);
  if (c.balance < inv.amount) return NB.toast('Недостаточно средств', 'err');
  c.balance -= inv.amount;
  inv.status = 'paid';
  inv.paidAt = new Date().toISOString();
  NB.save();
  NB.renderView();
  NB.confetti();
  NB.toast(`Оплата ${NB.money(inv.amount)} прошла`, 'ok');
};

A.delInvoice = function (id) {
  const inv = NB.state.invoices.find(i => i.id === Number(id));
  if (!inv) return;
  if (!confirm(`Удалить счёт #${inv.id}?`)) return;
  NB.state.invoices = NB.state.invoices.filter(x => x.id !== inv.id);
  NB.save(); NB.renderView();
  NB.toast('Счёт удалён');
};

A.addTariff = function () {
  NB.openModal({
    title: 'Новый тариф',
    html: NB.field('Название', 'name', 'text', '', 'required') +
      NB.field('Описание', 'desc', 'text', '') +
      NB.field('Скорость, Мбит/с', 'speed', 'number', '100', 'min="1" required') +
      NB.field('Цена, ₽/мес', 'price', 'number', '500', 'min="1" required'),
    onSubmit(fd) {
      const name = String(fd.get('name') || '').trim();
      if (!name) return NB.toast('Укажите название', 'err');
      const palette = ['#ff6b00', '#ff9500', '#ffb347', '#ff3d00', '#ffaa33', '#e85d00', '#ff8000'];
      NB.state.tariffs.push({
        id: NB.state.seq.tariff++, name,
        desc: String(fd.get('desc') || '').trim(),
        speed: Number(fd.get('speed')) || 100,
        price: Number(fd.get('price')) || 500,
        color: palette[NB.state.tariffs.length % palette.length]
      });
      NB.save();
      NB.notify(`Создан тариф «${name}»`, 'ok');
      NB.closeModal(); NB.renderView();
    }
  });
};

A.editTariff = function (id) {
  const t = NB.tariff(Number(id));
  if (!t) return;
  NB.openModal({
    title: 'Редактировать тариф',
    html: NB.field('Название', 'name', 'text', t.name, 'required') +
      NB.field('Описание', 'desc', 'text', t.desc || '') +
      NB.field('Скорость, Мбит/с', 'speed', 'number', t.speed, 'min="1" required') +
      NB.field('Цена, ₽/мес', 'price', 'number', t.price, 'min="1" required'),
    onSubmit(fd) {
      t.name = String(fd.get('name') || '').trim() || t.name;
      t.desc = String(fd.get('desc') || '').trim();
      t.speed = Number(fd.get('speed')) || t.speed;
      t.price = Number(fd.get('price')) || t.price;
      NB.save();
      NB.notify(`Тариф «${t.name}» обновлён`, 'ok');
      NB.closeModal(); NB.renderView();
    }
  });
};

A.delTariff = function (id) {
  const t = NB.tariff(Number(id));
  if (!t) return;
  if (NB.state.tariffs.length === 1) return NB.toast('Нельзя удалить последний тариф', 'err');
  const affected = NB.state.clients.filter(c => c.tariffId === t.id);
  if (affected.length) {
    const others = NB.state.tariffs.filter(x => x.id !== t.id).sort((a, b) => a.price - b.price);
    const target = others[0];
    if (!confirm(`Тариф «${t.name}» у ${affected.length} клиентов. Перевести на «${target.name}» (${NB.money(target.price)})?`)) return;
    affected.forEach(c => c.tariffId = target.id);
  } else {
    if (!confirm(`Удалить тариф «${t.name}»?`)) return;
  }
  NB.state.tariffs = NB.state.tariffs.filter(x => x.id !== t.id);
  NB.save();
  NB.renderView();
};

A.switchTariff = function (id) {
  const c = NB.client(NB.state.session.id);
  const t = NB.tariff(Number(id));
  if (!c || !t) return;
  if (!confirm(`Перейти на «${t.name}» (${NB.money(t.price)}/мес)?`)) return;
  c.tariffId = t.id;
  NB.save();
  NB.notify(`Вы перешли на «${t.name}»`, 'ok');
  NB.renderView();
};

A.rechargeSelf = function () {
  const c = NB.client(NB.state.session.id);
  if (!c) return;
  NB.openModal({
    title: 'Пополнить баланс',
    submit: 'Пополнить',
    html: `<p class="muted" style="margin-bottom:14px">Текущий баланс: ${NB.money(c.balance)}</p>` +
      NB.field('Сумма, ₽', 'amount', 'number', '500', 'min="1" step="50" required'),
    onSubmit(fd) {
      const amt = Number(fd.get('amount')) || 0;
      if (amt <= 0) return NB.toast('Введите положительную сумму', 'err');
      c.balance += amt;
      NB.save();
      NB.closeModal(); NB.renderView();
      NB.confetti();
      NB.toast(`+${NB.money(amt)} зачислено`, 'ok');
    }
  });
};

A.resolveTicket = function (id) {
  const t = NB.state.tickets.find(x => x.id === Number(id));
  if (!t) return;
  t.status = 'resolved';
  NB.save();
  NB.notify(`Заявка «${t.subject}» решена`, 'ok');
  NB.renderView();
};

A.newTicket = function () {
  const c = NB.client(NB.state.session.id);
  NB.openModal({
    title: 'Новая заявка',
    submit: 'Отправить',
    html: NB.textareaField('Опишите проблему', 'subject'),
    onSubmit(fd) {
      const subject = String(fd.get('subject') || '').trim();
      if (!subject) return NB.toast('Опишите проблему', 'err');
      NB.state.tickets.push({
        id: NB.state.seq.ticket++, clientId: c.id, subject,
        status: 'open', createdAt: new Date().toISOString()
      });
      NB.save();
      NB.notify(`Клиент «${c.name}» создал заявку`, 'ok');
      NB.closeModal(); NB.renderView();
    }
  });
};

A.buyUpgrade = function (key) { NB.game.buyUpgrade(key); };
A.resolveEventModal = function () { if (NB.state.game.activeEvent) NB.game.showEventModal(); };
A.startTour = function () { NB.startTour(); };

A.advanceDay = function () { NB.advanceDay(); };

A.setTick = function () { /* убрано */ };
A.simSpeed = function () { /* убрано */ };

A.resetData = function () { NB.resetState(); };

A.openStory = function () { NB.story.showNextInQueue(); };

/* Сбор выручки */
A.collectRevenue = function () {
  const g = NB.state.game;
  if (g.daily.pendingRevenue <= 0) return NB.toast('Нечего собирать', 'err');
  const amount = g.daily.pendingRevenue;
  g.cash += amount;
  g.daily.collectedToday += amount;
  g.daily.pendingRevenue = 0;
  g.daily.lastDayRevenue = amount;
  NB.notify(`Собрано ${NB.money(amount)}`, 'ok');
  NB.addActivity(`Собрана выручка: ${NB.money(amount)}`, 'pay');
  NB.checkGameState();
  NB.save();
  NB.renderView();
};

A.finishDay = function () {
  NB.advanceDay();
};

A.map = {
  'logout':       () => NB.auth.logout(),
  'export':       A.exportData,
  'reset-data':   A.resetData,
  'clear-activity': A.clearActivity,
  'advance-day':  A.advanceDay,
  'show-notifs':  A.showNotifs,
  'mark-read':    A.markRead,
  'start-tour':   A.startTour,
  'buy-upgrade':  d => A.buyUpgrade(d.key),
  'resolve-event-modal': A.resolveEventModal,
  'open-story':   A.openStory,
  'open-client':  d => A.openClient(d.id),
  'add-client':   A.addClient,
  'edit-client':  d => A.editClient(d.id),
  'recharge':     d => A.rechargeClient(d.id),
  'recharge-self': A.rechargeSelf,
  'toggle':       d => A.toggleClient(d.id),
  'del-client':   d => A.delClient(d.id),
  'add-tariff':   A.addTariff,
  'edit-tariff':  d => A.editTariff(d.id),
  'del-tariff':   d => A.delTariff(d.id),
  'switch-tariff': d => A.switchTariff(d.id),
  'pay-invoice':  d => A.payInvoiceStaff(d.id),
  'pay-invoice-self': d => A.payInvoiceSelf(d.id),
  'del-invoice':  d => A.delInvoice(d.id),
  'resolve-ticket': d => A.resolveTicket(d.id),
  'new-ticket':   A.newTicket,
  'gen-invoices': A.genInvoices,
  'collect-revenue': A.collectRevenue,
  'finish-day':   A.finishDay
};

})(window);