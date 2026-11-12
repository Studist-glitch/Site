/* isp_billing_staff.js — вьюхи сотрудника */
(function (global) {
'use strict';
const NB = global.NB;
const S = NB.views.staff;

/* ============================================================
   ДАШБОРД
   ============================================================ */
S.dashboard = function () {
  const st = NB.state;
  const g  = st.game;
  const w  = g.world;
  const stats = NB.computeStats();
  const openTicketsList = st.tickets.filter(t => t.status === 'open');
  const openTickets = openTicketsList.length;
  const levelLabel = NB.game.LEVELS[g.level - 1] ? NB.game.LEVELS[g.level - 1].label : 'Новичок';
  const pendingClients = g.pendingClients;
  const income = NB.dailyIncomeEstimate();
  const cost = NB.dailyCostEstimate();
  const net = NB.netDailyEstimate();

  /* ---------- Дневные задачи ---------- */
  const revenueDone = g.daily.pendingRevenue === 0 || g.upgrades.autoCollect > 0;
  const clientsDone = pendingClients.length === 0;
  const tasksTotal = 3;
  let tasksDone = 0;
  if (revenueDone) tasksDone++;
  if (clientsDone) tasksDone++;

  const dailyTasksHtml = `
    <div class="daily-tasks-panel">
      <div class="dt-header">
        <div>
          <h3>📋 Задачи на сегодня</h3>
          <p class="muted small">Выполните всё — и можно завершать день</p>
        </div>
        <span class="dt-progress">${tasksDone}/${tasksTotal}</span>
      </div>
      <div class="daily-tasks-list">
        <div class="dt-item ${revenueDone ? 'done' : ''}">
          <span class="dt-icon">${revenueDone ? '✅' : '⬜'}</span>
          <span class="dt-text">Собрать выручку${g.daily.pendingRevenue > 0 ? ` (${NB.money(g.daily.pendingRevenue)})` : ''}</span>
          ${!revenueDone ? `<button class="btn tiny" data-action="collect-revenue">Собрать</button>` : ''}
        </div>
        <div class="dt-item ${clientsDone ? 'done' : ''}">
          <span class="dt-icon">${clientsDone ? '✅' : '⬜'}</span>
          <span class="dt-text">Обработать новых клиентов (${pendingClients.length ? pendingClients.length + ' ждут' : 'всё готово'})</span>
        </div>
        <div class="dt-item ${openTickets === 0 ? 'done' : ''}">
          <span class="dt-icon">${openTickets === 0 ? '✅' : '🟡'}</span>
          <span class="dt-text">${openTickets > 0 ? `Заявки в работе: ${openTickets} (штраф −${openTickets * 2} реп)` : 'Заявок нет'}</span>
        </div>
      </div>
    </div>`;

  /* ---------- Pending клиенты ---------- */
  let pendingHtml = '';
  if (pendingClients.length > 0) {
    pendingHtml = `
      <div class="panel pending-clients-section" style="border-color:rgba(255,107,0,.5);margin-bottom:12px">
        <div class="panel-head">
          <h2>🆕 Новые клиенты ждут подключения</h2>
          <span class="muted small">${pendingClients.length}</span>
        </div>
        <div class="pending-list">
          ${pendingClients.map(pc => {
            const t = NB.tariff(pc.tariffId) || { name:'—', price:0, color:'#7a7a86' };
            const dailyInc = Math.round(t.price / NB.INCOME_DIVISOR);
            const riskLabel = pc.risk === 'good' ? '✓ Надёжный'
                            : pc.risk === 'risky' ? '⚠ Рискованный'
                            : '— Обычный';
            const riskClass = pc.risk === 'good' ? 'good'
                            : pc.risk === 'risky' ? 'risky'
                            : 'normal';
            return `<div class="pending-client">
              <div class="pc-info">
                <b>${NB.esc(pc.name)}</b>
                <small>${NB.esc(pc.phone)} · ${NB.esc(pc.address)}</small>
                <span class="pc-risk ${riskClass}">${riskLabel}</span>
              </div>
              <div class="pc-tariff">
                <span class="tag" style="--c:${t.color}">${NB.esc(t.name)}</span>
                <small>${NB.money(t.price)}/мес · +${NB.money(dailyInc)}/день</small>
              </div>
              <div class="pc-actions">
                <button class="btn primary small" data-action="accept-client" data-id="${pc.id}">✓ Принять</button>
                <button class="btn ghost small" data-action="reject-client" data-id="${pc.id}">✕</button>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  /* ---------- Заявки ---------- */
  let ticketsHtml = '';
  if (openTicketsList.length > 0) {
    ticketsHtml = `
      <div class="panel tickets-section" style="margin-bottom:12px">
        <div class="panel-head">
          <h2>✉ Открытые заявки</h2>
          <span class="muted small">${openTicketsList.length}</span>
        </div>
        <div class="tickets-list">
          ${openTicketsList.map(t => {
            const c = NB.client(t.clientId) || { name:'—' };
            return `<div class="ticket-inline">
              <div class="ti-body">
                <b>${NB.esc(t.subject)}</b>
                <small>${NB.esc(c.name)} · ${NB.fmtDateTime(t.createdAt)}</small>
              </div>
              <button class="btn tiny" data-action="resolve-ticket" data-id="${t.id}">Решить</button>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  /* ---------- Дневной журнал ---------- */
  const logHtml = g.daily.log && g.daily.log.length > 1
    ? `<div class="panel day-log-panel">
        <div class="panel-head"><h2>📖 Что произошло сегодня</h2></div>
        <div class="day-log-list">
          ${g.daily.log.slice(-10).reverse().map(l => `
            <div class="log-entry log-${l.type || 'info'}">${NB.esc(l.text)}</div>
          `).join('')}
        </div>
      </div>` : '';

  /* ---------- Кнопка "следующий день" ---------- */
  const canAdv = NB.canAdvanceDay();

  /* ---------- Событие ---------- */
  const eventBanner = g.activeEvent ? `
    <div class="game-panel" style="border-color:rgba(239,68,68,.6);margin-bottom:12px">
      <div class="game-head">
        <div>
          <div class="game-title" style="color:#f87171">⚠ Требуется решение</div>
          <div style="font-size:16px;font-weight:700;color:#fff;margin-top:4px">${g.activeEvent.title}</div>
          <div style="font-size:12.5px;color:var(--muted);margin-top:4px;max-width:520px">${g.activeEvent.desc}</div>
        </div>
        <button class="btn primary" data-action="resolve-event-modal">Решить →</button>
      </div>
    </div>` : '';

  /* ---------- Угроза ---------- */
  let threatBar = '';
  if (w.threat > 0 && w.arc !== 'ordinary') {
    const lvl = w.threat >= 7 ? 'КРИТИЧЕСКИЙ' : w.threat >= 5 ? 'ВЫСОКИЙ' : w.threat >= 3 ? 'СРЕДНИЙ' : 'НИЗКИЙ';
    threatBar = `<div class="game-panel cyn-warning" style="border-color:rgba(168,85,247,.6);margin-bottom:12px">
      <div class="game-head"><div>
        <div class="game-title" style="color:#c084fc">⚠ Аномалия в сети</div>
        <div style="font-size:16px;font-weight:700;color:#fff;margin-top:4px">Угроза: ${lvl} (${w.threat})</div>
        <div style="font-size:12.5px;color:var(--muted);margin-top:4px">Источник неизвестен</div>
      </div></div>
    </div>`;
  }

  /* ---------- Бункер ---------- */
  let bunkerBar = '';
  if (w.bunker.built) {
    bunkerBar = `<div class="game-panel" style="border-color:rgba(71,85,105,.6);margin-bottom:12px">
      <div class="game-head"><div>
        <div class="game-title" style="color:#94a3b8">🏚 Бункер · ур. ${w.bunker.level}</div>
      </div></div>
    </div>`;
  }

  const storyHtml = NB.story.renderPanel ? NB.story.renderPanel() : '';

  /* ---------- Экономика ---------- */
  const econClass = net.net >= 0 ? 'positive' : 'negative';
  const economyPanel = `
    <div class="economy-panel ${econClass}">
      <div class="econ-header">
        <h3>💵 Экономика дня</h3>
        <span class="econ-net ${econClass}">${net.net >= 0 ? '+' : ''}${NB.money(net.net)}/день</span>
      </div>
      <div class="econ-rows">
        <div class="econ-row"><span>📈 Доход клиентов</span><b class="positive">+${NB.money(income.base)}</b></div>
        ${income.neon > 0 ? `<div class="econ-row"><span>🌟 Neon Shadow</span><b class="positive">+${NB.money(income.neon)}</b></div>` : ''}
        <div class="econ-row"><span>🏢 Базовые расходы</span><b class="negative">−${NB.money(cost.base)}</b></div>
        ${cost.upkeep > 0 ? `<div class="econ-row"><span>⚙ Обслуживание</span><b class="negative">−${NB.money(cost.upkeep)}</b></div>` : ''}
      </div>
      ${net.net < 0 ? `<div class="econ-warning">⚠ Вы в минусе. Повысьте тарифы или купите маркетинг.</div>` : ''}
    </div>`;

  /* ---------- Касса ---------- */
  const goalPct = Math.min(100, (g.cash / g.goal) * 100);
  const status = g.stats.won ? '<span class="game-status win">Победа</span>'
    : g.stats.lost ? '<span class="game-status lose">Провал</span>'
    : '<span class="game-status playing">В игре</span>';

  return `
    <div class="page-head">
      <div>
        <h1>День ${g.daily.dayNumber}</h1>
        <p class="muted">${NB.dayLabel(st.simDate)} · ${openTickets} заявок · «${levelLabel}»</p>
      </div>
      <div class="head-actions">
        <button class="btn ghost" data-action="export">Экспорт</button>
      </div>
    </div>
    ${eventBanner}
    ${threatBar}
    ${bunkerBar}
    ${storyHtml}
    ${dailyTasksHtml}
    ${pendingHtml}
    ${ticketsHtml}
    ${logHtml}
    ${economyPanel}
    <div class="game-panel">
      <div class="game-head">
        <div>
          <div class="game-title">Касса</div>
          <div class="game-cash" id="game-cash">${NB.money(g.cash)}<small>из ${NB.money(g.goal)}</small></div>
          <div class="game-goal-wrap">
            <div class="game-goal-labels"><span>Прогресс</span><b>${Math.round(goalPct)}%</b></div>
            <div class="game-goal-bar"><i id="game-goal-bar" style="width:${goalPct}%"></i></div>
          </div>
        </div>
        <div class="game-stats">
          <div class="game-stat"><b>${g.level}</b><span>уровень</span></div>
          <div class="game-stat"><b>${g.reputation}</b><span>репутация</span></div>
          <div class="game-stat"><b>${g.stats.eventsResolved}</b><span>событий</span></div>
          <div class="game-stat">${status}</div>
        </div>
      </div>
    </div>
    <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
      <button class="btn ${canAdv.ok ? 'primary' : 'ghost'} advance-day-btn" data-action="advance-day" ${canAdv.ok ? '' : 'disabled'} style="padding:12px 24px;font-size:14px">
        ${canAdv.ok ? '📅 Следующий день →' : `⬜ ${canAdv.reason}`}
      </button>
    </div>
    <div class="stats">
      ${NB.statCard('Абоненты', stats.clients, `${st.clients.filter(c => c.status === 'active').length} активных`, false, '#ff6b00', 'clients')}
      ${NB.statCard('MRR', stats.mrr, 'выручка/мес', true, '#ff9500', 'mrr')}
      ${NB.statCard('Выручка', stats.revenue, 'за 14 дней', true, '#ffb347', 'revenue')}
      ${NB.statCard('К оплате', stats.due, 'неоплачено', true, '#f59e0b', 'due')}
    </div>
    <div class="panel" style="margin-bottom:12px">
      <div class="panel-head"><h2>Доля рынка</h2><span class="muted small">Вы: <b style="color:var(--primary-3)">${g.marketShare}%</b></span></div>
      <div class="market-bar">
        <i style="width:${g.marketShare}%;background:linear-gradient(90deg,var(--primary),var(--primary-2))"></i>
        ${g.competitors.map(c => `<i style="width:${c.share}%;background:${c.color}"></i>`).join('')}
      </div>
      <div class="market-legend">
        <span><i style="background:linear-gradient(90deg,var(--primary),var(--primary-2))"></i>NetBill</span>
        ${g.competitors.map(c => `<span><i style="background:${c.color}"></i>${NB.esc(c.name)} ${c.share}%</span>`).join('')}
      </div>
    </div>
    <div class="panel" style="margin-bottom:12px">
      <div class="panel-head"><h2>Выручка по дням</h2><span class="muted small">${st.revenue.length} дней</span></div>
      <canvas id="revenue-chart" class="revenue-chart"></canvas>
      <div class="chart-foot">
        <span>Итого: <b>${NB.money(stats.revenue)}</b></span>
        <span class="muted">Расходы: ${NB.money(cost.total)}/день</span>
      </div>
    </div>
    <div class="grid-2">
      <div class="panel">
        <div class="panel-head"><h2>Трафик</h2><span class="live-badge"><i></i>live</span></div>
        <canvas id="traffic-chart" class="traffic-chart"></canvas>
        <div class="chart-foot"><span>Сейчас: <b id="traffic-now">—</b></span><span class="muted">Пик: <b id="traffic-peak">—</b></span></div>
      </div>
      <div class="panel">
        <div class="panel-head"><h2>Новости мира</h2></div>
        <div class="news-list">
          ${w.news.slice(0, 8).map(n => `<div class="news-item"><small>${NB.fmtDateTime(n.at)}</small>${NB.esc(n.text)}</div>`).join('') || '<p class="empty">Пока тихо</p>'}
        </div>
      </div>
    </div>
  `;
};

/* ============================================================
   КЛИЕНТЫ
   ============================================================ */
S.clients = function () {
  const q = NB.ui.query.trim().toLowerCase();
  let list = NB.state.clients.filter(c => !q ||
    c.name.toLowerCase().includes(q) ||
    c.address.toLowerCase().includes(q) ||
    c.phone.toLowerCase().includes(q));
  const dir = NB.ui.clientSort.dir === 'asc' ? 1 : -1;
  list.sort((a, b) => {
    if (NB.ui.clientSort.key === 'name')    return a.name.localeCompare(b.name) * dir;
    if (NB.ui.clientSort.key === 'balance') return (a.balance - b.balance) * dir;
    if (NB.ui.clientSort.key === 'tariff')  return (NB.price(a.tariffId) - NB.price(b.tariffId)) * dir;
    return 0;
  });
  const droneCount = NB.state.clients.filter(c => c.isDrone).length;
  const humanCount = NB.state.clients.filter(c => !c.isDrone).length;

  const rows = list.map(c => {
    const t = NB.tariff(c.tariffId) || { name:'—', color:'#7a7a86' };
    const droneIcon = c.isDrone ? ' 🤖' : '';
    const riskBadge = c.risk === 'good' ? '<span class="pc-risk good">✓</span>'
                    : c.risk === 'risky' ? '<span class="pc-risk risky">⚠</span>'
                    : '';
    return `<tr class="fade">
      <td><div class="who" data-action="open-client" data-id="${c.id}">
        <div class="ava" style="background:${t.color}26;color:${t.color}">${NB.initials(c.name)}</div>
        <div><b>${NB.esc(c.name)}${droneIcon} ${riskBadge}</b><small>${NB.esc(c.phone)}</small></div>
      </div></td>
      <td class="muted">${NB.esc(c.address)}</td>
      <td><span class="tag" style="--c:${t.color}">${NB.esc(t.name)}</span></td>
      <td class="num ${c.balance < 0 ? 'neg' : ''}">${NB.money(c.balance)}</td>
      <td>${c.status === 'active' ? '<span class="pill ok">Активен</span>' : '<span class="pill off">Блок</span>'}</td>
      <td class="actions">
        <button class="icon" title="Пополнить" data-action="recharge" data-id="${c.id}">＋</button>
        <button class="icon" title="Изменить" data-action="edit-client" data-id="${c.id}">✎</button>
        <button class="icon" title="${c.status === 'active' ? 'Блок' : 'Разблок'}" data-action="toggle" data-id="${c.id}">${c.status === 'active' ? '❙' : '▶'}</button>
        <button class="icon danger" title="Удалить" data-action="del-client" data-id="${c.id}">✕</button>
      </td>
    </tr>`;
  }).join('');

  return `
    <div class="page-head">
      <div><h1>Клиенты</h1>
        <p class="muted">${NB.state.clients.length} всего · 👤 ${humanCount} · 🤖 ${droneCount}</p>
      </div>
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

/* ============================================================
   ТАРИФЫ
   ============================================================ */
S.tariffs = function () {
  return `
    <div class="page-head">
      <div><h1>Тарифы</h1><p class="muted">${NB.state.tariffs.length} планов</p></div>
      <button class="btn primary" data-action="add-tariff">＋ Новый тариф</button>
    </div>
    <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px">
      ${NB.state.tariffs.map((t, i) => {
        const count = NB.state.clients.filter(c => c.tariffId === t.id).length;
        return `<article class="tariff-card fade" style="position:relative;overflow:hidden;background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:20px;animation-delay:${i * 60}ms">
          <div style="position:absolute;inset:-40% 60% 70% -30%;border-radius:50%;background:${t.color};opacity:.16;filter:blur(32px);pointer-events:none"></div>
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
            <h3 style="font-size:15.5px;color:#fff">${NB.esc(t.name)}</h3>
            <div style="display:flex;gap:4px">
              <button class="icon" data-action="edit-tariff" data-id="${t.id}" title="Изменить">✎</button>
              <button class="icon danger" data-action="del-tariff" data-id="${t.id}" title="Удалить">✕</button>
            </div>
          </div>
          <p style="color:var(--muted);font-size:12.5px;margin-bottom:14px;min-height:16px">${NB.esc(t.desc || '')}</p>
          <div style="font-size:13px;color:var(--muted)">
            <b style="font-size:24px;color:var(--primary-3);margin-right:3px">${t.speed}</b> Мбит/с
          </div>
          <div style="font-size:20px;font-weight:700;margin:8px 0 16px;color:#fff">${NB.money(t.price)}<small style="font-size:12px;color:var(--muted);margin-left:3px">/мес</small></div>
          <div style="display:flex;justify-content:space-between;font-size:12.5px;color:var(--muted);border-top:1px solid var(--line);padding-top:12px">
            <span>${count} клиентов</span>
            <span>${NB.money(count * t.price)}</span>
          </div>
        </article>`;
      }).join('')}
    </div>`;
};

/* ============================================================
   СЧЕТА
   ============================================================ */
S.invoices = function () {
  let list = [...NB.state.invoices].sort((a, b) => b.id - a.id);
  if (NB.ui.invoiceFilter !== 'all') list = list.filter(i => i.status === NB.ui.invoiceFilter);
  const rows = list.map(i => {
    const c = NB.client(i.clientId) || { name:'—' };
    return `<tr class="fade">
      <td class="muted">#${i.id}</td>
      <td><b>${NB.esc(c.name)}</b></td>
      <td class="muted">${NB.periodLabel(i.period)}</td>
      <td class="num">${NB.money(i.amount)}</td>
      <td>${i.status === 'paid' ? '<span class="pill ok">Оплачен</span>' : '<span class="pill wait">Ожидает</span>'}</td>
      <td class="actions">
        ${i.status === 'unpaid'
          ? `<button class="btn tiny" data-action="pay-invoice" data-id="${i.id}">Оплатить</button>
             <button class="icon danger" data-action="del-invoice" data-id="${i.id}">✕</button>`
          : `<span class="muted small">${NB.fmtDate(i.paidAt)}</span>`}
      </td>
    </tr>`;
  }).join('');
  const totalUnpaid = NB.state.invoices.filter(i => i.status === 'unpaid').reduce((s, i) => s + i.amount, 0);
  return `
    <div class="page-head">
      <div><h1>Счета</h1><p class="muted">${NB.periodLabel(NB.period())} · к оплате ${NB.money(totalUnpaid)}</p></div>
      <button class="btn primary" data-action="gen-invoices">Выставить счета</button>
    </div>
    <div class="panel">
      <div class="toolbar"><div class="filters">
        ${['all','unpaid','paid'].map(f => `<button class="chip ${NB.ui.invoiceFilter === f ? 'active' : ''}" data-filter="${f}">
          ${f === 'all' ? 'Все' : f === 'unpaid' ? 'Неоплачено' : 'Оплачено'}</button>`).join('')}
      </div></div>
      ${list.length ? `<div class="table-wrap"><table class="table">
        <thead><tr><th>№</th><th>Клиент</th><th>Период</th><th class="num">Сумма</th><th>Статус</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>` : '<p class="empty">Счетов нет</p>'}
    </div>`;
};

/* ============================================================
   ЗАЯВКИ
   ============================================================ */
S.tickets = function () {
  const list = [...NB.state.tickets].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const open = list.filter(t => t.status === 'open').length;
  return `
    <div class="page-head">
      <div><h1>Заявки</h1><p class="muted">${open} в работе · ${list.length} всего</p></div>
    </div>
    <div class="panel">
      ${list.length ? list.map(t => {
        const c = NB.client(t.clientId) || { name:'—' };
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

/* ============================================================
   МАГАЗИН
   ============================================================ */
S.upgrades = function () {
  const g = NB.state.game;
  const allKeys = Object.keys(NB.game.UPGRADES);
  const visible = allKeys.filter(key => {
    if (key === 'bunker' && g.world.threat < 5 && (g.upgrades.bunker || 0) === 0) return false;
    return true;
  });
  return `
    <div class="page-head">
      <div><h1>Магазин улучшений</h1><p class="muted">Касса: <b style="color:var(--primary-3)">${NB.money(g.cash)}</b></p></div>
    </div>
    <div class="upgrades-grid">
      ${visible.map((key, i) => {
        const u = NB.game.UPGRADES[key];
        const lvl = g.upgrades[key] || 0;
        const cost = NB.game.upgradeCost(key);
        const maxed = cost === null;
        const canBuy = !maxed && g.cash >= cost;
        const locked = key === 'quantum' && !g.unlockedTech.includes('quantum');
        const upkeepNow = lvl > 0 ? u.upkeep.slice(0, lvl).reduce((a, b) => a + b, 0) : 0;
        const upkeepNext = !maxed ? (u.upkeep[lvl] || 0) : 0;
        return `<div class="upgrade fade ${maxed ? 'maxed' : ''}" style="animation-delay:${i * 70}ms">
          <div class="upgrade-head"><div class="upgrade-icon">${u.icon}</div><div style="flex:1"><h3>${u.name}</h3></div></div>
          <div class="upgrade-desc">${u.desc}</div>
          <div class="upgrade-levels">${(u.costs || [1,2,3]).map((_, j) => `<i class="${j < lvl ? 'filled' : ''}"></i>`).join('')}</div>
          <div class="upgrade-effect ${lvl === 0 ? 'neutral' : ''}">${lvl === 0 ? (locked ? '🔒 Заблокировано' : 'Не куплено') : `Ур. ${lvl}: ${u.levels[lvl - 1]}`}</div>
          <div class="upgrade-foot" style="margin-top:14px">
            <div class="upgrade-price">${maxed ? '— MAX —' : locked ? '🔒' : NB.money(cost)}</div>
            ${maxed
              ? '<button class="btn ghost small" disabled>Максимум</button>'
              : `<button class="btn ${canBuy ? 'primary' : 'ghost'} small" data-action="buy-upgrade" data-key="${key}" ${canBuy ? '' : 'disabled'}>${lvl === 0 ? 'Купить' : 'Улучшить'}</button>`}
          </div>
          <div style="font-size:11.5px;color:var(--muted);margin-top:10px">Обслуживание: ${upkeepNow}${upkeepNext > 0 ? ` → ${upkeepNow + upkeepNext}` : ''} ₽/день</div>
        </div>`;
      }).join('')}
    </div>`;
};

/* ============================================================
   АКТИВНОСТЬ
   ============================================================ */
S.activity = function () {
  return `
    <div class="page-head">
      <div><h1>Активность</h1><p class="muted">журнал событий</p></div>
      <button class="btn ghost" data-action="clear-activity">Очистить</button>
    </div>
    <div class="panel">
      <div class="activity-list" id="activity-list">
        ${NB.state.activity.slice().reverse().map(S._activityItem).join('') || '<p class="empty">Пусто</p>'}
      </div>
    </div>`;
};

/* ============================================================
   НАСТРОЙКИ — только визуал и данные
   ============================================================ */
S.settings = function () {
  const st = NB.state.settings;
  return `
    <div class="page-head"><div><h1>Настройки</h1><p class="muted">Данные и визуал</p></div></div>
    <div class="panel">
      <div class="settings-section">
        <h3>Визуал</h3>
        <p>Не влияет на геймплей — только на внешний вид.</p>
        <div class="setting-row">
          <div class="setting-row-info"><b>Меньше рекламы</b><small>Снижает частоту всплывающего спама</small></div>
          <label class="switch"><input type="checkbox" ${st.reduceAds ? 'checked' : ''} data-setting="reduceAds"><span class="switch-track"></span></label>
        </div>
      </div>
      <div class="settings-section">
        <h3>Данные</h3>
        <div class="detail-actions">
          <button class="btn ghost" data-action="export">📥 Экспорт JSON</button>
          <button class="btn danger" data-action="reset-data">🗑 Сбросить всё</button>
        </div>
      </div>
    </div>`;
};

S._activityItem = function (a) {
  const icons = { pay:'₽', recharge:'＋', ticket:'✉', net:'◈', sys:'⚙', block:'❙', tariff:'◆' };
  const colors = { pay:'#22c55e', recharge:'#ff6b00', ticket:'#f59e0b', net:'#ff9500', sys:'#7a7a86', block:'#ef4444', tariff:'#ffb347' };
  const c = colors[a.type] || '#7a7a86';
  return `<div class="activity-item">
    <div class="activity-icon" style="background:${c}26;color:${c}">${icons[a.type] || '•'}</div>
    <div class="activity-body">${NB.esc(a.text)}<small>${NB.fmtDateTime(a.at)}</small></div>
  </div>`;
};

})(window);