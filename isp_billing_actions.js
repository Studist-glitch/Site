/* isp_billing_actions.js — обработчики действий */
(function (global) {
'use strict';
const NB = global.NB;
const A = NB.actions;

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
    NB.addActivity(`Выставлено ${created} счетов за ${NB.periodLabel(p)}`, 'sys');
    NB.render(); NB.toast(`Создано счетов: ${created}`, 'ok');
  } else NB.toast('Все счета уже выставлены');
};

A.exportData = function () {
  const blob = new Blob([JSON.stringify(NB.state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `netbill-${Date.now()}.json`;
  a.click();
  NB.toast('Данные экспортированы', 'ok');
};

A.addClient = function () {
  NB.openModal({
    title: 'Новый клиент',
    html: NB.field('ФИО', 'name', 'text', '', 'required') +
      NB.field('Адрес', 'address', 'text', '', 'placeholder="ул. …"') +
      NB.field('Телефон', 'phone', 'text', '', 'required placeholder="+7 …"') +
      NB.selectField('Тариф', 'tariffId', NB.state.tariffs.map(t => ({ v: t.id, l: `${t.name} · ${t.price} ₽` }))),
    onSubmit(fd) {
      const name = String(fd.get('name') || '').trim();
      if (!name) return NB.toast('Укажите имя', 'err');
      NB.state.clients.push({
        id: NB.state.seq.client++, name,
        address: String(fd.get('address') || '').trim() || '—',
        phone: String(fd.get('phone') || '').trim() || '—',
        tariffId: Number(fd.get('tariffId')),
        balance: 0, status: 'active',
        createdAt: new Date().toISOString(),
        password: NB.DEFAULT_PASS
      });
      NB.save();
      NB.addActivity(`Добавлен клиент «${name}»`, 'sys');
      NB.closeModal(); NB.render();
      NB.toast(`Клиент «${name}» добавлен`, 'ok');
    }
  });
};

A.editClient = function (id) {
  const c = NB.client(id);
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
      NB.addActivity(`Клиент «${c.name}» отредактирован`, 'sys');
      NB.closeModal(); NB.render();
      NB.toast('Изменения сохранены', 'ok');
    }
  });
  setTimeout(() => {
    const sel = document.querySelector('select[name=tariffId]');
    if (sel) sel.value = c.tariffId;
  }, 50);
};

A.rechargeClient = function (id) {
  const c = NB.client(id);
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
      NB.addActivity(`Баланс «${c.name}» пополнен на ${NB.money(amt)}`, 'recharge');
      NB.closeModal(); NB.render();
      NB.toast(`+${NB.money(amt)} на баланс`, 'ok');
    }
  });
};

A.toggleClient = function (id) {
  const c = NB.client(id);
  if (!c) return;
  c.status = c.status === 'active' ? 'blocked' : 'active';
  NB.save();
  NB.addActivity(`${c.status === 'active' ? 'Разблокирован' : 'Заблокирован'} клиент «${c.name}»`, 'block');
  NB.render();
  NB.toast(c.status === 'active' ? 'Доступ восстановлен' : 'Клиент заблокирован');
};

A.delClient = function (id) {
  const c = NB.client(id);
  if (!c) return;
  if (!confirm(`Удалить клиента «${c.name}»?`)) return;
  NB.state.clients = NB.state.clients.filter(x => x.id !== id);
  NB.state.invoices = NB.state.invoices.filter(i => i.clientId !== id);
  NB.state.tickets = NB.state.tickets.filter(t => t.clientId !== id);
  NB.save();
  NB.addActivity(`Клиент «${c.name}» удалён`, 'sys');
  NB.render();
  NB.toast('Клиент удалён');
};

A.payInvoiceStaff = function (id) {
  const inv = NB.state.invoices.find(i => i.id === id);
  if (!inv || inv.status === 'paid') return;
  inv.status = 'paid';
  inv.paidAt = new Date().toISOString();
  NB.save();
  const c = NB.client(inv.clientId);
  NB.addActivity(`Счёт #${inv.id} (${c ? c.name : '—'}) отмечен оплаченным`, 'pay');
  NB.render();
  NB.toast(`Счёт #${inv.id} оплачен`, 'ok');
};

A.payInvoiceSelf = function (id) {
  const inv = NB.state.invoices.find(i => i.id === id);
  if (!inv || inv.status === 'paid') return;
  const c = NB.client(NB.state.session.id);
  if (c.balance < inv.amount) {
    NB.toast('Недостаточно средств. Пополните баланс', 'err');
    return;
  }
  c.balance -= inv.amount;
  inv.status = 'paid';
  inv.paidAt = new Date().toISOString();
  NB.save();
  NB.addActivity(`Клиент «${c.name}» оплатил счёт #${inv.id}`, 'pay');
  NB.render();
  NB.confetti();
  NB.toast(`Оплата ${NB.money(inv.amount)} прошла успешно`, 'ok');
};

A.delInvoice = function (id) {
  const inv = NB.state.invoices.find(i => i.id === id);
  if (!inv) return;
  if (!confirm(`Удалить счёт #${inv.id}?`)) return;
  NB.state.invoices = NB.state.invoices.filter(x => x.id !== id);
  NB.save(); NB.render();
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
      NB.addActivity(`Создан тариф «${name}»`, 'tariff');
      NB.closeModal(); NB.render();
      NB.toast(`Тариф «${name}» создан`, 'ok');
    }
  });
};

A.editTariff = function (id) {
  const t = NB.tariff(id);
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
      NB.addActivity(`Тариф «${t.name}» обновлён`, 'tariff');
      NB.closeModal(); NB.render();
      NB.toast('Тариф обновлён', 'ok');
    }
  });
};

A.delTariff = function (id) {
  const t = NB.tariff(id);
  if (!t) return;
  if (NB.state.tariffs.length === 1) return NB.toast('Нельзя удалить единственный тариф', 'err');
  const affected = NB.state.clients.filter(c => c.tariffId === id);
  if (affected.length) {
    const others = NB.state.tariffs.filter(x => x.id !== id).sort((a, b) => a.price - b.price);
    const target = others[0];
    if (!confirm(`Тариф «${t.name}» используется ${affected.length} клиентами.\n\nОни будут переведены на «${target.name}» (${NB.money(target.price)}). Продолжить?`)) return;
    affected.forEach(c => c.tariffId = target.id);
    NB.addActivity(`Тариф «${t.name}» удалён, ${affected.length} клиентов → «${target.name}»`, 'tariff');
  } else {
    if (!confirm(`Удалить тариф «${t.name}»?`)) return;
    NB.addActivity(`Тариф «${t.name}» удалён`, 'tariff');
  }
  NB.state.tariffs = NB.state.tariffs.filter(x => x.id !== id);
  NB.save(); NB.render();
  NB.toast('Тариф удалён');
};

A.switchTariff = function (id) {
  const c = NB.client(NB.state.session.id);
  const t = NB.tariff(id);
  if (!c || !t) return;
  if (!confirm(`Перейти на тариф «${t.name}» (${NB.money(t.price)}/мес)?`)) return;
  c.tariffId = id;
  NB.save();
  NB.addActivity(`Клиент «${c.name}» перешёл на тариф «${t.name}»`, 'tariff');
  NB.render();
  NB.toast(`Теперь ваш тариф — «${t.name}»`, 'ok');
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
      NB.addActivity(`Клиент «${c.name}» пополнил баланс на ${NB.money(amt)}`, 'recharge');
      NB.closeModal(); NB.render();
      NB.confetti();
      NB.toast(`+${NB.money(amt)} на баланс`, 'ok');
    }
  });
};

A.resolveTicket = function (id) {
  const t = NB.state.tickets.find(x => x.id === id);
  if (!t) return;
  t.status = 'resolved';
  NB.save();
  NB.addActivity(`Заявка «${t.subject}» решена`, 'ticket');
  NB.render();
  NB.toast('Заявка закрыта', 'ok');
};

A.newTicket = function () {
  const c = NB.client(NB.state.session.id);
  NB.openModal({
    title: 'Новая заявка',
    submit: 'Отправить',
    html: NB.textareaField('Опишите проблему', 'subject') +
      `<p class="muted small" style="margin-top:6px">Обычно отвечаем в течение 24 часов</p>`,
    onSubmit(fd) {
      const subject = String(fd.get('subject') || '').trim();
      if (!subject) return NB.toast('Опишите проблему', 'err');
      NB.state.tickets.push({
        id: NB.state.seq.ticket++, clientId: c.id, subject,
        status: 'open', createdAt: new Date().toISOString()
      });
      NB.save();
      NB.addActivity(`Клиент «${c.name}» создал заявку`, 'ticket');
      NB.closeModal(); NB.render();
      NB.toast('Заявка отправлена', 'ok');
    }
  });
};

A.clearActivity = function () {
  if (!confirm('Очистить журнал активности?')) return;
  NB.state.activity = [];
  NB.save(); NB.render();
  NB.toast('Журнал очищен');
};

/* карта действий */
A.map = {
  logout: NB.auth.logout,
  export: A.exportData,
  'gen-invoices': A.genInvoices,
  'add-client': A.addClient,
  'edit-client': A.editClient,
  'recharge': A.rechargeClient,
  'recharge-self': A.rechargeSelf,
  'toggle': A.toggleClient,
  'del-client': A.delClient,
  'add-tariff': A.addTariff,
  'edit-tariff': A.editTariff,
  'del-tariff': A.delTariff,
  'switch-tariff': A.switchTariff,
  'pay-invoice': A.payInvoiceStaff,
  'pay-invoice-self': A.payInvoiceSelf,
  'del-invoice': A.delInvoice,
  'resolve-ticket': A.resolveTicket,
  'new-ticket': A.newTicket,
  'clear-activity': A.clearActivity
};

})(window);