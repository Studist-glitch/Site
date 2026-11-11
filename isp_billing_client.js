/* isp_billing_client.js — вьюхи абонента */
(function (global) {
'use strict';
const NB = global.NB;
const CL = NB.views.client;

/* ============================================================
   ОБЗОР
   ============================================================ */
CL.dashboard = function () {
  const c = NB.client(NB.state.session.id);
  if (!c) { NB.auth.logout(); return ''; }
  const t = NB.tariff(c.tariffId) || { name: '—', speed: 0, price: 0, color: '#7a7a86' };
  const myInv = NB.state.invoices.filter(i => i.clientId === c.id).sort((a, b) => b.id - a.id);
  const stats = NB.computeStats();
  const unpaid = myInv.filter(i => i.status === 'unpaid').length;
  const paid   = myInv.filter(i => i.status === 'paid').length;
  const droneMark = c.isDrone ? ' 🤖' : '';

  return `
    <div class="page-head">
      <div>
        <h1>Здравствуйте, ${NB.esc(c.name.split(' ')[0])}${droneMark}</h1>
        <p class="muted">Ваш персональный кабинет</p>
      </div>
      <button class="btn primary" data-action="recharge-self">Пополнить баланс</button>
    </div>
    <div class="stats">
      ${NB.statCard('Баланс', stats.balance, stats.balance < 0 ? 'задолженность' : 'доступно', true, stats.balance < 0 ? '#ef4444' : '#22c55e', 'balance')}
      ${NB.statCard('Скорость', stats.speed, 'Мбит/с · ' + t.name, false, t.color, 'speed')}
      ${NB.statCard('К оплате', stats.due, unpaid + ' счетов', true, '#f59e0b', 'due')}
      ${NB.statCard('Оплачено', stats.totalPaid, paid + ' счетов', true, '#ffb347', 'totalPaid')}
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
            <div>
              <b>${NB.money(i.amount)}</b>
              <small>${NB.periodLabel(i.period)}</small>
            </div>
            ${i.status === 'paid'
              ? '<span class="pill ok">Оплачен</span>'
              : `<button class="btn tiny" data-action="pay-invoice-self" data-id="${i.id}">Оплатить</button>`}
          </div>`).join('') || '<p class="empty">Счетов пока нет</p>'}
      </div>
    </div>`;
};

/* ============================================================
   МОЙ ТАРИФ
   ============================================================ */
CL.tariff = function () {
  const c = NB.client(NB.state.session.id);
  const current = NB.tariff(c.tariffId);
  return `
    <div class="page-head">
      <div><h1>Мой тариф</h1><p class="muted">Текущий план и опции</p></div>
    </div>
    ${current ? `
      <div class="panel" style="margin-bottom:16px;border-left:4px solid ${current.color}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
          <h3 style="font-size:18px;color:#fff">${NB.esc(current.name)}</h3>
          <span class="tag" style="--c:${current.color}">Текущий</span>
        </div>
        <p style="color:var(--muted);font-size:12.5px;margin-bottom:14px">${NB.esc(current.desc || '')}</p>
        <div style="font-size:13px;color:var(--muted)">
          <b style="font-size:24px;color:var(--primary-3);letter-spacing:-.03em;margin-right:3px">${current.speed}</b> Мбит/с
        </div>
        <div style="font-size:20px;font-weight:700;letter-spacing:-.03em;margin:8px 0 0;color:#fff">
          ${NB.money(current.price)}<small style="font-size:12px;color:var(--muted);margin-left:3px">/мес</small>
        </div>
      </div>` : ''}
    <h2 style="margin:22px 0 14px;font-size:15px;color:#fff">Доступные тарифы</h2>
    <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px">
      ${NB.state.tariffs.map((t, i) => `
        <article class="tariff-card fade" style="position:relative;overflow:hidden;background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:20px;transition:.3s;animation-delay:${i * 60}ms">
          <div class="tariff-glow" style="position:absolute;inset:-40% 60% 70% -30%;border-radius:50%;background:${t.color};opacity:.16;filter:blur(32px);pointer-events:none"></div>
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
            <h3 style="font-size:15.5px;color:#fff">${NB.esc(t.name)}</h3>
            ${t.id === c.tariffId ? `<span class="tag" style="--c:${t.color}">Активен</span>` : ''}
          </div>
          <p style="color:var(--muted);font-size:12.5px;margin-bottom:14px;min-height:16px">${NB.esc(t.desc || '')}</p>
          <div style="font-size:13px;color:var(--muted)">
            <b style="font-size:24px;color:var(--primary-3);letter-spacing:-.03em;margin-right:3px">${t.speed}</b> Мбит/с
          </div>
          <div style="font-size:20px;font-weight:700;letter-spacing:-.03em;margin:8px 0 16px;color:#fff">
            ${NB.money(t.price)}<small style="font-size:12px;color:var(--muted);margin-left:3px">/мес</small>
          </div>
          ${t.id !== c.tariffId ? `
            <button class="btn primary full" data-action="switch-tariff" data-id="${t.id}">Перейти</button>
          ` : ''}
        </article>`).join('')}
    </div>`;
};

/* ============================================================
   СЧЕТА
   ============================================================ */
CL.invoices = function () {
  const c = NB.client(NB.state.session.id);
  const myInv = NB.state.invoices.filter(i => i.clientId === c.id).sort((a, b) => b.id - a.id);
  const rows = myInv.map(i => `<tr class="fade">
    <td class="muted">#${i.id}</td>
    <td class="muted">${NB.periodLabel(i.period)}</td>
    <td class="num">${NB.money(i.amount)}</td>
    <td>${i.status === 'paid' ? '<span class="pill ok">Оплачен</span>' : '<span class="pill wait">Ожидает</span>'}</td>
    <td class="actions">
      ${i.status === 'unpaid'
        ? `<button class="btn tiny" data-action="pay-invoice-self" data-id="${i.id}">Оплатить</button>`
        : `<span class="muted small">${NB.fmtDate(i.paidAt)}</span>`}
    </td>
  </tr>`).join('');
  return `
    <div class="page-head">
      <div><h1>Мои счета</h1><p class="muted">Баланс: ${NB.money(c.balance)}</p></div>
      <button class="btn primary" data-action="recharge-self">Пополнить</button>
    </div>
    <div class="panel">
      ${myInv.length ? `<div class="table-wrap"><table class="table">
        <thead><tr><th>№</th><th>Период</th><th class="num">Сумма</th><th>Статус</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>` : '<p class="empty">Счетов пока нет</p>'}
    </div>`;
};

/* ============================================================
   СКОРОСТЬ
   ============================================================ */
CL.speed = function () {
  const c = NB.client(NB.state.session.id);
  const t = NB.tariff(c.tariffId) || { speed: 100 };
  const R = 2 * Math.PI * 90;
  return `
    <div class="page-head">
      <div><h1>Скорость</h1><p class="muted">Замер соединения</p></div>
    </div>
    <div class="speed-wrap">
      <div class="speed-gauge">
        <svg viewBox="0 0 220 220">
          <defs>
            <linearGradient id="speedGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="var(--primary)"/>
              <stop offset="100%" stop-color="var(--primary-2)"/>
            </linearGradient>
          </defs>
          <circle class="bg" cx="110" cy="110" r="90"></circle>
          <circle class="fg" cx="110" cy="110" r="90" stroke-dasharray="${R}"
            stroke-dashoffset="${R}"></circle>
        </svg>
        <div class="speed-num"><b id="speed-value">0</b><small>Мбит/с</small></div>
      </div>
      <button class="btn primary" id="start-speed" style="padding:12px 28px">Запустить тест</button>
      <p class="muted" style="margin-top:16px;font-size:12.5px">Лимит вашего тарифа — ${t.speed} Мбит/с</p>
    </div>`;
};

/* ============================================================
   ПОДДЕРЖКА
   ============================================================ */
CL.support = function () {
  const c = NB.client(NB.state.session.id);
  const my = NB.state.tickets
    .filter(t => t.clientId === c.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return `
    <div class="page-head">
      <div><h1>Поддержка</h1><p class="muted">Обращения</p></div>
      <button class="btn primary" data-action="new-ticket">＋ Создать</button>
    </div>
    <div class="panel">
      ${my.length ? my.map(t => `
        <div class="ticket fade">
          <div class="ticket-head">
            <div>
              <b>${NB.esc(t.subject)}</b>
              <div class="muted small" style="margin-top:4px">${NB.fmtDateTime(t.createdAt)}</div>
            </div>
            <span class="pill ${t.status === 'open' ? 'wait' : 'ok'}">${t.status === 'open' ? 'Открыта' : 'Решена'}</span>
          </div>
        </div>`).join('') : '<p class="empty">Обращений нет</p>'}
    </div>`;
};

})(window);