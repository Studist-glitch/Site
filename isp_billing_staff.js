/* isp_billing_staff.js — вьюхи сотрудника */
(function (global) {
'use strict';
const NB = global.NB;
const S = NB.views.staff;

const NAV = [
  { id: 'dashboard', label: 'Дашборд', icon: '◧' },
  { id: 'clients', label: 'Клиенты', icon: '◔' },
  { id: 'tariffs', label: 'Тарифы', icon: '◆' },
  { id: 'invoices', label: 'Счета', icon: '▤' },
  { id: 'tickets', label: 'Заявки', icon: '✉' },
  { id: 'activity', label: 'Активность', icon: '◷' }
];

S.shell = function (content) {
  return `
    <div class="app">
      <aside class="sidebar">
        <div class="brand"><span class="brand-logo">◉</span><span>NetBill</span></div>
        <nav class="nav">
          ${NAV.map(n => `<button class="nav-item ${NB.ui.view === n.id ? 'active' : ''}" data-view="${n.id}">
            <span class="nav-icon">${n.icon}</span><span>${n.label}</span></button>`).join('')}
        </nav>
        <div class="sidebar-foot">
          <div class="user-card">
            <div class="user-ava">${NB.esc(NB.initials('Администратор'))}</div>
            <div class="user-info"><b>Администратор</b><small>Сотрудник</small></div>
          </div>
          <button class="btn ghost small" data-action="logout">Выйти</button>
        </div>
      </aside>
      <main class="main"><div class="view fade" id="view">${content}</div></main>
    </div>`;
};

S.dashboard = function () {
  const total = NB.state.clients.length;
  const active = NB.state.clients.filter(c => c.status === 'active');
  const mrr = active.reduce((s, c) => s + NB.price(c.tariffId), 0);
  const p = NB.period();
  const paid = NB.state.invoices.filter(i => i.status === 'paid' && i.period === p).reduce((s, i) => s + i.amount, 0);
  const due = NB.state.invoices.filter(i => i.status === 'unpaid' && i.period === p).reduce((s, i) => s + i.amount, 0);
  const openTickets = NB.state.tickets.filter(t => t.status === 'open').length;

  const dist = NB.state.tariffs.map(t => ({ ...t, count: NB.state.clients.filter(c => c.tariffId === t.id).length }))
    .sort((a, b) => b.count - a.count);
  const maxCount = Math.max(1, ...dist.map(d => d.count));

  return `
    <div class="page-head">
      <div><h1>Дашборд</h1>
        <p class="muted">Период ${NB.periodLabel(p)} · ${openTickets} заявок в работе</p></div>
      <div class="head-actions">
        <button class="btn ghost" data-action="export">Экспорт</button>
        <button class="btn primary" data-action="gen-invoices">Выставить счета</button>
      </div>
    </div>
    <div class="stats">
      ${NB.statCard('Абоненты', total, `${active.length} активных`, false, '#ff6b00')}
      ${NB.statCard('MRR', mrr, 'выручка/мес', true, '#ff9500')}
      ${NB.statCard('Оплачено', paid, 'в этом периоде', true, '#22c55e')}
      ${NB.statCard('К оплате', due, 'неоплачено', true, '#f59e0b')}
    </div>
    <div class="grid-2">
      <div class="panel">
        <div class="panel-head"><h2>Сетевой трафик</h2><span class="live-badge"><i></i>live</span></div>
        <canvas id="traffic-chart" class="traffic-chart"></canvas>
        <div class="chart-foot">
          <span>Сейчас: <b id="traffic-now">—</b> Мбит/с</span>
          <span class="muted">Пик: <b id="traffic-peak">—</b> Мбит/с</span>
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><h2>Активность</h2><button class="btn tiny" data-view="activity">Все →</button></div>
        <div class="activity-list" id="activity-list">
          ${NB.state.activity.slice(-6).reverse().map(S._activityItem).join('')}
        </div>
      </div>
    </div>
    <div class="grid-2">
      <div class="panel">
        <div class="panel-head"><h2>Распределение по тарифам</h2><button class="btn tiny" data-view="tariffs">Все →</button></div>
        ${dist.map(d => `<div class="tariff-bar">
          <div class="tariff-bar-top">
            <span><i class="dot" style="background:${d.color}"></i>${NB.esc(d.name)}</span><b>${d.count}</b>
          </div>
          <div class="bar"><i style="width:${(d.count / maxCount) * 100}%;background:${d.color}"></i></div>
        </div>`).join('')}
      </div>
      <div class="panel">
        <div class="panel-head"><h2>Узлы сети</h2><span class="muted small">нагрузка</span></div>
        <div class="nodes">
          ${Array.from({ length: 6 }, (_, i) => {
            const ok = Math.random() > 0.18;
            const load = NB.randInt(25, 92);
            return `<div class="node">
              <div class="node-top">
                <span class="node-name">Узел ${i + 1}</span>
                <span class="pill ${ok ? 'ok' : 'warn'}">${ok ? 'ok' : 'load'}</span>
              </div>
              <div class="bar"><i style="width:${load}%;background:${ok ? '#22c55e' : '#f59e0b'}"></i></div>
              <small class="muted">${load}% нагрузки</small>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
};

S.clients = function () {
  const q = NB.ui.query.trim().toLowerCase();
  let list = NB.state.clients.filter(c => !q ||
    c.name.toLowerCase().includes(q) ||
    c.address.toLowerCase().includes(q) ||
    c.phone.toLowerCase().includes(q));

  const dir = NB.ui.clientSort.dir === 'asc' ? 1 : -1;
  list.sort((a, b) => {
    if (NB.ui.clientSort.key === 'name') return a.name.localeCompare(b.name) * dir;
    if (NB.ui.clientSort.key === 'balance') return (a.balance - b.balance) * dir;
    if (NB.ui.clientSort.key === 'tariff') return (NB.price(a.tariffId) - NB.price(b.tariffId)) * dir;
    return 0;
  });

  const rows = list.map(c => {
    const t = NB.tariff(c.tariffId) || { name: '—', color: '#7a7a86' };
    return `<tr class="fade">
      <td><div class="who">
        <div class="ava" style="background:${t.color}26;color:${t.color}">${NB.initials(c.name)}</div>
        <div><b>${NB.esc(c.name)}</b><small>${NB.esc(c.phone)}</small></div>
      </div></td>
      <td class="muted">${NB.esc(c.address)}</td>
      <td><span class="tag" style="--c:${t.color}">${NB.esc(t.name)}</span></td>
      <td class="num ${c.balance < 0 ? 'neg' : ''}">${NB.money(c.balance)}</td>
      <td>${c.status === 'active' ? '<span class="pill ok">Активен</span>' : '<span class="pill off">Блок</span>'}</td>
      <td class="actions">
        <button class="icon" title="Пополнить" data-action="recharge" data-id="${c.id}">＋</button>
        <button class="icon" title="Редактировать" data-action="edit-client" data-id="${c.id}">✎</button>
        <button class="icon" title="${c.status === 'active' ? 'Блок' : 'Разблок'}" data-action="toggle" data-id="${c.id}">${c.status === 'active' ? '❙' : '▶'}</button>
        <button class="icon danger" title="Удалить" data-action="del-client" data-id="${c.id}">✕</button>
      </td>
    </tr>`;
  }).join('');

  return `
    <div class="page-head">
      <div><h1>Клиенты</h1><p class="muted">${NB.state.clients.length} абонентов в базе</p></div>
      <button class="btn primary" data-action="add-client">＋ Новый клиент</button>
    </div>
    <div class="panel">
      <div class="toolbar">
        <input class="search" id="client-search" placeholder="Поиск по имени, адресу или телефону…" value="${NB.esc(NB.ui.query)}">
      </div>
      ${list.length ? `<div class="table-wrap"><table class="table">
        <thead><tr>
          <th class="sortable" data-sort="name">Клиент</th>
          <th>Адрес</th>
          <th class="sortable" data-sort="tariff">Тариф</th>
          <th class="sortable num" data-sort="balance">Баланс</th>
          <th>Статус</th><th></th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table></div>` : '<p class="empty">Ничего не найдено</p>'}
    </div>`;
};

S.tariffs = function () {
  return `
    <div class="page-head">
      <div><h1>Тарифы</h1><p class="muted">${NB.state.tariffs.length} планов</p></div>
      <button class="btn primary" data-action="add-tariff">＋ Новый тариф</button>
    </div>
    <div class="tariff-grid">
      ${NB.state.tariffs.map((t, i) => {
        const count = NB.state.clients.filter(c => c.tariffId === t.id).length;
        return `<article class="tariff-card fade" style="--c:${t.color};animation-delay:${i * 60}ms">
          <div class="tariff-glow"></div>
          <div class="tariff-head">
            <h3>${NB.esc(t.name)}</h3>
            <div class="tariff-actions">
              <button class="icon" data-action="edit-tariff" data-id="${t.id}" title="Редактировать">✎</button>
              <button class="icon danger" data-action="del-tariff" data-id="${t.id}" title="Удалить">✕</button>
            </div>
          </div>
          <p class="tariff-desc">${NB.esc(t.desc || '')}</p>
          <div class="tariff-speed"><b>${t.speed}</b> Мбит/с</div>
          <div class="tariff-price">${NB.money(t.price)}<small>/мес</small></div>
          <div class="tariff-foot">
            <span>${count} клиентов</span>
            <span>${NB.money(count * t.price)}</span>
          </div>
        </article>`;
      }).join('')}
    </div>`;
};

S.invoices = function () {
  let list = [...NB.state.invoices].sort((a, b) => b.id - a.id);
  if (NB.ui.invoiceFilter !== 'all') list = list.filter(i => i.status === NB.ui.invoiceFilter);

  const rows = list.map(i => {
    const c = NB.client(i.clientId) || { name: '—' };
    return `<tr class="fade">
      <td class="muted">#${i.id}</td>
      <td><b>${NB.esc(c.name)}</b></td>
      <td class="muted">${NB.periodLabel(i.period)}</td>
      <td class="num">${NB.money(i.amount)}</td>
      <td>${i.status === 'paid' ? '<span class="pill ok">Оплачен</span>' : '<span class="pill wait">Ожидает</span>'}</td>
      <td class="actions">${i.status === 'unpaid'
        ? `<button class="btn tiny" data-action="pay-invoice" data-id="${i.id}">Оплатить</button>
           <button class="icon danger" data-action="del-invoice" data-id="${i.id}" title="Удалить">✕</button>`
        : `<span class="muted small">${NB.fmtDate(i.paidAt)}</span>`}</td>
    </tr>`;
  }).join('');

  return `
    <div class="page-head">
      <div><h1>Счета</h1><p class="muted">Период ${NB.periodLabel(NB.period())}</p></div>
      <button class="btn primary" data-action="gen-invoices">Выставить счета</button>
    </div>
    <div class="panel">
      <div class="toolbar"><div class="filters">
        ${['all', 'unpaid', 'paid'].map(f => `<button class="chip ${NB.ui.invoiceFilter === f ? 'active' : ''}" data-filter="${f}">
          ${f === 'all' ? 'Все' : f === 'unpaid' ? 'Неоплачено' : 'Оплачено'}</button>`).join('')}
      </div></div>
      ${list.length ? `<div class="table-wrap"><table class="table">
        <thead><tr><th>№</th><th>Клиент</th><th>Период</th><th class="num">Сумма</th><th>Статус</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>` : '<p class="empty">Счетов нет</p>'}
    </div>`;
};

S.tickets = function () {
  const list = [...NB.state.tickets].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return `
    <div class="page-head">
      <div><h1>Заявки</h1><p class="muted">${NB.state.tickets.filter(t => t.status === 'open').length} в работе</p></div>
    </div>
    <div class="panel">
      ${list.length ? list.map(t => {
        const c = NB.client(t.clientId) || { name: '—' };
        return `<div class="ticket fade">
          <div class="ticket-head">
            <div><b>${NB.esc(t.subject)}</b>
              <div class="muted small" style="margin-top:4px">${NB.esc(c.name)} · ${NB.fmtDateTime(t.createdAt)}</div></div>
            <span class="pill ${t.status === 'open' ? 'wait' : 'ok'}">${t.status === 'open' ? 'Открыта' : 'Решена'}</span>
          </div>
          ${t.status === 'open' ? `<div class="ticket-actions">
            <button class="btn tiny" data-action="resolve-ticket" data-id="${t.id}">Отметить решённой</button>
          </div>` : ''}
        </div>`;
      }).join('') : '<p class="empty">Заявок нет</p>'}
    </div>`;
};

S.activity = function () {
  return `
    <div class="page-head">
      <div><h1>Активность</h1><p class="muted">журнал событий системы</p></div>
      <button class="btn ghost" data-action="clear-activity">Очистить</button>
    </div>
    <div class="panel">
      <div class="activity-list" id="activity-list">
        ${NB.state.activity.slice().reverse().map(S._activityItem).join('') || '<p class="empty">Пусто</p>'}
      </div>
    </div>`;
};

S._activityItem = function (a) {
  const icons = { pay: '₽', recharge: '＋', ticket: '✉', net: '◈', sys: '⚙', block: '❙', tariff: '◆' };
  const colors = { pay: '#22c55e', recharge: '#ff6b00', ticket: '#f59e0b', net: '#ff9500', sys: '#7a7a86', block: '#ef4444', tariff: '#ffb347' };
  const c = colors[a.type] || '#7a7a86';
  return `<div class="activity-item">
    <div class="activity-icon" style="background:${c}26;color:${c}">${icons[a.type] || '•'}</div>
    <div class="activity-body">${NB.esc(a.text)}<small>${NB.fmtDateTime(a.at)}</small></div>
  </div>`;
};

})(window);