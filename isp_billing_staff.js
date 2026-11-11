/* isp_billing_staff.js — вьюхи сотрудника */
(function (global) {
'use strict';
const NB = global.NB;
const S = NB.views.staff;

S.dashboard = function () {
  const total = NB.state.clients.length;
  const active = NB.state.clients.filter(c => c.status === 'active');
  const mrr = active.reduce((s, c) => s + NB.price(c.tariffId), 0);
  const p = NB.period();
  const paid = NB.state.invoices.filter(i => i.status === 'paid' && i.period === p).reduce((s, i) => s + i.amount, 0);
  const due = NB.state.invoices.filter(i => i.status === 'unpaid' && i.period === p).reduce((s, i) => s + i.amount, 0);
  const openTickets = NB.state.tickets.filter(t => t.status === 'open').length;

  /* топ клиентов по оплатам */
  const paidByClient = {};
  NB.state.invoices.filter(i => i.status === 'paid').forEach(i => {
    paidByClient[i.clientId] = (paidByClient[i.clientId] || 0) + i.amount;
  });
  const top = Object.entries(paidByClient)
    .map(([id, sum]) => ({ client: NB.client(Number(id)), sum }))
    .filter(x => x.client)
    .sort((a, b) => b.sum - a.sum)
    .slice(0, 5);

  /* распределение по тарифам */
  const dist = NB.state.tariffs.map(t => ({ ...t, count: NB.state.clients.filter(c => c.tariffId === t.id).length }))
    .sort((a, b) => b.count - a.count);
  const maxCount = Math.max(1, ...dist.map(d => d.count));

  /* суммарная выручка за 14 дней */
  const totalRev = NB.state.revenue.slice(-14).reduce((s, r) => s + r.amount, 0);

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
      ${NB.statCard('Выручка', totalRev, 'за 14 дней', true, '#ffb347')}
      ${NB.statCard('К оплате', due, 'неоплачено', true, '#f59e0b')}
    </div>

    <div class="panel" style="margin-bottom:16px">
      <div class="panel-head"><h2>Выручка по дням</h2>
        <span class="muted small">за ${NB.state.revenue.length} дней</span></div>
      <canvas id="revenue-chart" class="revenue-chart"></canvas>
      <div class="chart-foot">
        <span>Итого: <b>${NB.money(totalRev)}</b></span>
        <span class="muted">Период: ${NB.state.revenue.length ? NB.fmtDate(NB.state.revenue[0].date) + ' — ' + NB.fmtDate(NB.state.revenue[NB.state.revenue.length-1].date) : '—'}</span>
      </div>
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
        <div class="panel-head"><h2>Топ клиентов</h2><button class="btn tiny" data-view="clients">Все →</button></div>
        ${top.length ? `<div class="top-list">
          ${top.map((t, i) => `
            <div class="top-item">
              <div class="top-rank">${i+1}</div>
              <div class="top-body">
                <b>${NB.esc(t.client.name)}</b>
                <small>${NB.esc(t.client.phone)}</small>
              </div>
              <div class="top-amount">${NB.money(t.sum)}</div>
            </div>`).join('')}
        </div>` : '<p class="empty">Пока нет данных</p>'}
      </div>
      <div class="panel">
        <div class="panel-head"><h2>Тарифы</h2><button class="btn tiny" data-view="tariffs">Все →</button></div>
        ${dist.map(d => `<div class="tariff-bar">
          <div class="tariff-bar-top">
            <span><i class="dot" style="background:${d.color}"></i>${NB.esc(d.name)}</span>
            <b>${d.count}</b>
          </div>
          <div class="bar"><i style="width:${(d.count / maxCount) * 100}%;background:${d.color}"></i></div>
        </div>`).join('')}
      </div>
    </div>
  `;
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
      <td><div class="who" data-action="open-client" data-id="${c.id}">
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
      <div><h1>Клиенты</h1><p class="muted">${NB.state.clients.length} абонентов · ${NB.state.clients.filter(c => c.status === 'active').length} активных</p></div>
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

  const totalUnpaid = NB.state.invoices.filter(i => i.status === 'unpaid').reduce((s, i) => s + i.amount, 0);

  return `
    <div class="page-head">
      <div><h1>Счета</h1><p class="muted">Период ${NB.periodLabel(NB.period())} · к оплате ${NB.money(totalUnpaid)}</p></div>
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

S.settings = function () {
  const st = NB.state.settings;
  return `
    <div class="page-head">
      <div><h1>Настройки</h1><p class="muted">Управление симуляцией и данными</p></div>
    </div>
    <div class="panel" style="margin-bottom:16px">
      <div class="settings-section">
        <h3>Симуляция времени</h3>
        <p>Каждый тик — это один день: клиенты платят, подключаются, отключаются.</p>
        <div class="setting-row">
          <div class="setting-row-info">
            <b>Авто-ход</b>
            <small>Автоматически проживать день каждые N секунд</small>
          </div>
          <label class="switch">
            <input type="checkbox" ${st.autoTick ? 'checked' : ''} data-setting="autoTick">
            <span class="switch-track"></span>
          </label>
        </div>
        <div class="setting-row">
          <div class="setting-row-info">
            <b>Скорость</b>
            <small>Как быстро идут дни при авто-ходе</small>
          </div>
          <div class="sim-speed">
            ${[
              { v: 8000, l: '▶ медл' },
              { v: 3000, l: '▶▶ сред' },
              { v: 1000, l: '▶▶▶ быстр' }
            ].map(s => `<button data-action="set-tick" data-ms="${s.v}" class="${st.tickMs === s.v ? 'active' : ''}">${s.l}</button>`).join('')}
          </div>
        </div>
      </div>
      <div class="settings-section">
        <h3>События</h3>
        <p>Что может произойти за день</p>
        <div class="setting-row">
          <div class="setting-row-info">
            <b>Новые клиенты</b>
            <small>Случайные абоненты подключаются с рандомным тарифом</small>
          </div>
          <label class="switch">
            <input type="checkbox" ${st.autoNewClients ? 'checked' : ''} data-setting="autoNewClients">
            <span class="switch-track"></span>
          </label>
        </div>
        <div class="setting-row">
          <div class="setting-row-info">
            <b>Автоплатежи</b>
            <small>Клиенты сами оплачивают счета при достаточном балансе</small>
          </div>
          <label class="switch">
            <input type="checkbox" ${st.autoPayments ? 'checked' : ''} data-setting="autoPayments">
            <span class="switch-track"></span>
          </label>
        </div>
        <div class="setting-row">
          <div class="setting-row-info">
            <b>Вероятность оттока</b>
            <small>Шанс, что клиент отключится за день</small>
          </div>
          <div class="range-row">
            <input type="range" min="0" max="20" value="${Math.round(st.churnChance * 100)}" id="churn-range">
            <span class="range-val" id="churn-val">${Math.round(st.churnChance * 100)}%</span>
          </div>
        </div>
      </div>
      <div class="settings-section">
        <h3>Данные</h3>
        <p>Экспорт и сброс</p>
        <div class="detail-actions">
          <button class="btn ghost" data-action="export">📥 Экспорт JSON</button>
          <button class="btn ghost" data-action="reset-data" style="color:var(--danger);border-color:rgba(239,68,68,.3)">🗑 Сбросить всё</button>
        </div>
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