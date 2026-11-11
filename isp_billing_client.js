/* isp_billing_client.js — вьюхи абонента */
(function (global) {
'use strict';
const NB = global.NB;
const CL = NB.views.client;

const NAV = [
  { id: 'dashboard', label: 'Обзор', icon: '◧' },
  { id: 'tariff', label: 'Мой тариф', icon: '◆' },
  { id: 'invoices', label: 'Счета', icon: '▤' },
  { id: 'speed', label: 'Скорость', icon: '⚡' },
  { id: 'support', label: 'Поддержка', icon: '✉' }
];

CL.shell = function (content, name) {
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
            <div class="user-ava">${NB.esc(NB.initials(name))}</div>
            <div class="user-info"><b>${NB.esc(name)}</b><small>Абонент</small></div>
          </div>
          <button class="btn ghost small" data-action="logout">Выйти</button>
        </div>
      </aside>
      <main class="main"><div class="view fade" id="view">${content}</div></main>
    </div>`;
};

CL.dashboard = function () {
  const c = NB.client(NB.state.session.id);
  const t = NB.tariff(c.tariffId) || { name: '—', speed: 0, price: 0, color: '#7a7a86' };
  const myInv = NB.state.invoices.filter(i => i.clientId === c.id).sort((a, b) => b.id - a.id);
  const due = myInv.filter(i => i.status === 'unpaid');
  const paidCount = myInv.filter(i => i.status === 'paid').length;
  const totalPaid = myInv.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);

  return `
    <div class="page-head">
      <div><h1>Здравствуйте, ${NB.esc(c.name.split(' ')[0])}</h1>
        <p class="muted">Ваш персональный кабинет</p></div>
      <button class="btn primary" data-action="recharge-self">Пополнить баланс</button>
    </div>
    <div class="stats">
      ${NB.statCard('Баланс', c.balance, c.balance < 0 ? 'задолженность' : 'доступно средств', true, c.balance < 0 ? '#ef4444' : '#22c55e')}
      ${NB.statCard('Скорость', t.speed, 'Мбит/с · ' + t.name, false, t.color)}
      ${NB.statCard('К оплате', due.reduce((s, i) => s + i.amount, 0), due.length + ' счетов', true, '#f59e0b')}
      ${NB.statCard('Оплачено', totalPaid, paidCount + ' счетов всего', true, '#ffb347')}
    </div>
    <div class="grid-2">
      <div class="panel">
        <div class="panel-head"><h2>Ваш трафик</h2><span class="live-badge"><i></i>live</span></div>
        <canvas id="traffic-chart" class="traffic-chart"></canvas>
        <div class="chart-foot">
          <span>Сейчас: <b id="traffic-now">—</b> Мбит/с</span>
          <span class="muted">Лимит: ${t.speed} Мбит/с</span>
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><h2>Последние счета</h2><button class="btn tiny" data-view="invoices">Все →</button></div>
        ${myInv.slice(0, 4).map(i => `
          <div class="inv-row">
            <div><b>${NB.money(i.amount)}</b><small>${NB.periodLabel(i.period)}</small></div>
            ${i.status === 'paid'
              ? '<span class="pill ok">Оплачен</span>'
              : `<button class="btn tiny" data-action="pay-invoice-self" data-id="${i.id}">Оплатить</button>`}
          </div>`).join('') || '<p class="empty">Счетов пока нет</p>'}
      </div>
    </div>`;
};

CL.tariff = function () {
  const c = NB.client(NB.state.session.id);
  const current = NB.tariff(c.tariffId);
  return `
    <div class="page-head">
      <div><h1>Мой тариф</h1><p class="muted">Текущий план и доступные опции</p></div>
    </div>
    ${current ? `
    <div class="panel" style="margin-bottom:16px;border-left:4px solid ${current.color}">
      <div class="tariff-head" style="margin-bottom:10px">
        <h3 style="font-size:18px">${NB.esc(current.name)}</h3>
        <span class="tag" style="--c:${current.color}">Текущий</span>
      </div>
      <p class="tariff-desc">${NB.esc(current.desc || '')}</p>
      <div class="tariff-speed"><b>${current.speed}</b> Мбит/с</div>
      <div class="tariff-price">${NB.money(current.price)}<small>/мес</small></div>
    </div>` : ''}
    <h2 style="margin:22px 0 14px;font-size:15px">Доступные тарифы</h2>
    <div class="tariff-grid">
      ${NB.state.tariffs.map((t, i) => `
        <article class="tariff-card fade" style="--c:${t.color};animation-delay:${i * 60}ms">
          <div class="tariff-glow"></div>
          <div class="tariff-head"><h3>${NB.esc(t.name)}</h3>
            ${t.id === c.tariffId ? '<span class="tag" style="--c:' + t.color + '">Активен</span>' : ''}</div>
          <p class="tariff-desc">${NB.esc(t.desc || '')}</p>
          <div class="tariff-speed"><b>${t.speed}</b> Мбит/с</div>
          <div class="tariff-price">${NB.money(t.price)}<small>/мес</small></div>
          ${t.id !== c.tariffId ? `
            <button class="btn primary full" style="margin-top:12px" data-action="switch-tariff" data-id="${t.id}">
              Перейти на этот тариф
            </button>` : ''}
        </article>`).join('')}
    </div>`;
};

CL.invoices = function () {
  const c = NB.client(NB.state.session.id);
  const myInv = NB.state.invoices.filter(i => i.clientId === c.id).sort((a, b) => b.id - a.id);
  const rows = myInv.map(i => `<tr class="fade">
    <td class="muted">#${i.id}</td>
    <td class="muted">${NB.periodLabel(i.period)}</td>
    <td class="num">${NB.money(i.amount)}</td>
    <td>${i.status === 'paid' ? '<span class="pill ok">Оплачен</span>' : '<span class="pill wait">Ожидает</span>'}</td>
    <td class="actions">${i.status === 'unpaid'
      ? `<button class="btn tiny" data-action="pay-invoice-self" data-id="${i.id}">Оплатить</button>`
      : `<span class="muted small">${NB.fmtDate(i.paidAt)}</span>`}</td>
  </tr>`).join('');
  return `
    <div class="page-head">
      <div><h1>Мои счета</h1><p class="muted">Баланс: ${NB.money(c.balance)}</p></div>
      <button class="btn primary" data-action="recharge-self">Пополнить баланс</button>
    </div>
    <div class="panel">
      ${myInv.length ? `<div class="table-wrap"><table class="table">
        <thead><tr><th>№</th><th>Период</th><th class="num">Сумма</th><th>Статус</th><th></th></tr></thead>
        <tbody>${rows}</tbody></table></div>` : '<p class="empty">Счетов пока нет</p>'}
    </div>`;
};

CL.speed = function () {
  const c = NB.client(NB.state.session.id);
  const t = NB.tariff(c.tariffId) || { speed: 100 };
  return `
    <div class="page-head">
      <div><h1>Скорость</h1><p class="muted">Замер скорости соединения</p></div>
    </div>
    <div class="speed-wrap">
      <div class="speed-gauge">
        <svg viewBox="0 0 220 220">
          <defs><linearGradient id="speedGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#ff6b00"/><stop offset="100%" stop-color="#ffb347"/>
          </linearGradient></defs>
          <circle class="bg" cx="110" cy="110" r="90"></circle>
          <circle class="fg" cx="110" cy="110" r="90" stroke-dasharray="${2 * Math.PI * 90}"
            stroke-dashoffset="${2 * Math.PI * 90}"></circle>
        </svg>
        <div class="speed-num"><b id="speed-value">0</b><small>Мбит/с</small></div>
      </div>
      <button class="btn primary" id="start-speed" style="padding:12px 28px">Запустить тест</button>
      <p class="muted" style="margin-top:16px;font-size:12.5px">Лимит вашего тарифа — ${t.speed} Мбит/с</p>
    </div>`;
};

CL.support = function () {
  const c = NB.client(NB.state.session.id);
  const my = NB.state.tickets.filter(t => t.clientId === c.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return `
    <div class="page-head">
      <div><h1>Поддержка</h1><p class="muted">Обращения в техподдержку</p></div>
      <button class="btn primary" data-action="new-ticket">＋ Создать заявку</button>
    </div>
    <div class="panel">
      ${my.length ? my.map(t => `<div class="ticket fade">
        <div class="ticket-head">
          <div><b>${NB.esc(t.subject)}</b>
            <div class="muted small" style="margin-top:4px">${NB.fmtDateTime(t.createdAt)}</div></div>
          <span class="pill ${t.status === 'open' ? 'wait' : 'ok'}">${t.status === 'open' ? 'Открыта' : 'Решена'}</span>
        </div>
      </div>`).join('') : '<p class="empty">Обращений нет</p>'}
    </div>`;
};

})(window);