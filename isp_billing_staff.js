/* isp_billing_staff.js — все вьюхи */
(function (global) {
'use strict';
const NB = global.NB;
const S = NB.views.staff;

/* ============================================================
   ХЕЛПЕРЫ
   ============================================================ */
const riskMeta = {
  good:    { label: '✓ Надёжный',        cls: 'good',    icon: '✓' },
  normal:  { label: '— Обычный',         cls: 'normal',  icon: '' },
  risky:   { label: '⚠ Рискованный',     cls: 'risky',   icon: '⚠' },
  hacker:  { label: '⚠ Возможен взлом',  cls: 'hacker',  icon: '⚠' },
  spammer: { label: '⚠ Возможен спам',   cls: 'spammer', icon: '📢' },
  unknown: { label: '❓ Нет данных',      cls: 'unknown', icon: '❓' }
};

function riskBadge(risk) {
  const m = riskMeta[risk] || riskMeta.normal;
  return `<span class="pc-risk ${m.cls}">${m.label}</span>`;
}

function trafficColor(p) {
  if (p > 100) return '#ef4444';
  if (p > 80) return '#f59e0b';
  if (p > 60) return '#fbbf24';
  return '#22c55e';
}

/* Рекомендации — приоритезированные подсказки */
function buildRecommendations() {
  const g = NB.state.game;
  const st = NB.state;
  const out = [];

  const overdueBills = g.bills.filter(b => b.status === 'pending' && b.dueDay < g.daily.dayNumber);
  if (overdueBills.length > 0) {
    const total = overdueBills.reduce((s, b) => s + b.amount, 0);
    out.push({
      level: 'critical',
      icon: '🔥',
      title: `${overdueBills.length} просроченных счетов на ${NB.money(total)}`,
      action: { label: 'Оплатить', view: 'invoices', tab: 'company' }
    });
  }

  const load = NB.traffic.getLoad();
  if (load.percent > 100) {
    out.push({
      level: 'critical',
      icon: '📶',
      title: `Сеть перегружена (${load.percent}%). Клиенты уходят.`,
      action: { label: 'Расширить канал', view: 'upgrades' }
    });
  } else if (load.percent > 80) {
    out.push({
      level: 'warning',
      icon: '📶',
      title: `Нагрузка ${load.percent}% — скоро перегрузка`,
      action: { label: 'Улучшить канал', view: 'upgrades' }
    });
  }

  const net = NB.netDailyEstimate();
  if (net.net < 0) {
    out.push({
      level: 'critical',
      icon: '📉',
      title: `Убыток ${NB.money(-net.net)}/день. Что-то делать!`,
      action: { label: 'Открыть магазин', view: 'upgrades' }
    });
  }

  if (g.family.wife && g.family.wifeHappiness < 25 && !g.family.crisisShown) {
    out.push({
      level: 'warning',
      icon: '💔',
      title: `${g.family.wife.name} недовольна (${g.family.wifeHappiness}%). Скоро уйдёт.`,
      action: { label: 'Провести вечер', action: 'family-evening' }
    });
  }

  if (g.reputation < 40) {
    out.push({
      level: 'warning',
      icon: '⭐',
      title: `Репутация ${g.reputation}. Клиенты уходят чаще.`,
      action: { label: 'Решить заявки', view: 'chat' }
    });
  }

  const openTickets = st.tickets.filter(t => t.status === 'open').length;
  if (openTickets >= 5) {
    out.push({
      level: 'warning',
      icon: '✉',
      title: `${openTickets} открытых заявок — к концу дня −${openTickets * 2} репутации`,
      action: { label: 'Разобрать', view: 'chat' }
    });
  }

  if (g.pendingClients.length >= 5) {
    out.push({
      level: 'info',
      icon: '🆕',
      title: `${g.pendingClients.length} клиентов ждут решения`,
      action: { label: 'Принять', scroll: '.pending-clients-section' }
    });
  }

  return out.slice(0, 4);
}

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
  const traffic = NB.traffic.getLoad();

  /* === Рекомендации === */
  const recs = buildRecommendations();
  const recsHtml = recs.length ? `
    <div class="recs-panel" style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px">
      ${recs.map(r => {
        const colors = {
          critical: { bg: 'rgba(239,68,68,.08)', border: 'rgba(239,68,68,.4)', color: '#f87171' },
          warning:  { bg: 'rgba(245,158,11,.06)', border: 'rgba(245,158,11,.35)', color: '#fbbf24' },
          info:     { bg: 'rgba(255,107,0,.06)', border: 'rgba(255,107,0,.3)', color: 'var(--primary-3)' }
        }[r.level] || { bg: 'var(--surface-2)', border: 'var(--line)', color: 'var(--muted)' };
        const act = r.action;
        const attrs = act.view ? `data-view="${act.view}"` : (act.action ? `data-action="${act.action}"` : (act.scroll ? `data-scroll-to="${act.scroll}"` : ''));
        return `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:${colors.bg};border:1px solid ${colors.border};border-radius:10px">
          <span style="font-size:18px">${r.icon}</span>
          <span style="flex:1;font-size:13px;color:${colors.color}">${NB.esc(r.title)}</span>
          <button class="btn primary small" ${attrs} style="white-space:nowrap">${NB.esc(act.label)}</button>
        </div>`;
      }).join('')}
    </div>` : '';

  /* === Быстрые действия === */
  const quickActions = [];
  if (g.pendingClients.length > 0) quickActions.push({ view:'dashboard', scroll:'.pending-clients-section', icon:'🆕', label:`Клиенты ${g.pendingClients.length}` });
  if (openTickets > 0) quickActions.push({ view:'chat', icon:'💬', label:`Заявки ${openTickets}` });
  const overdueBillsQuick = g.bills.filter(b => b.status === 'pending' && b.dueDay < g.daily.dayNumber).length;
  if (overdueBillsQuick > 0) quickActions.push({ view:'invoices', icon:'🔥', label:`Счета ${overdueBillsQuick}` });

  /* === Дневные задачи === */
  const revenueDone = g.daily.pendingRevenue === 0 || g.upgrades.autoCollect > 0;
  const clientsDone = pendingClients.length === 0;
  const tasksDone = (revenueDone ? 1 : 0) + (clientsDone ? 1 : 0) + (openTickets === 0 ? 1 : 0);
  const tasksTotal = 3;

  const dailyTasksHtml = `
    <div class="daily-tasks-panel">
      <div class="dt-header">
        <div>
          <h3>📋 Задачи на сегодня</h3>
          <p class="muted small">Выполните всё — можно завершать день</p>
        </div>
        <span class="dt-progress">${tasksDone}/${tasksTotal}</span>
      </div>
      <div class="daily-tasks-list">
        <div class="dt-item ${revenueDone ? 'done' : ''}">
          <span class="dt-icon">${revenueDone ? '✅' : '⬜'}</span>
          <span class="dt-text">Собрать выручку${g.daily.pendingRevenue > 0 ? ` (${NB.money(g.daily.pendingRevenue)})` : ''}</span>
          ${!revenueDone ? `<button class="btn tiny collect-revenue-btn" data-action="collect-revenue">Собрать</button>` : ''}
        </div>
        <div class="dt-item ${clientsDone ? 'done' : ''}">
          <span class="dt-icon">${clientsDone ? '✅' : '⬜'}</span>
          <span class="dt-text">Принять клиентов (${pendingClients.length})</span>
          ${!clientsDone ? `<button class="btn tiny" data-scroll-to=".pending-clients-section">К клиентам</button>` : ''}
        </div>
        <div class="dt-item ${openTickets === 0 ? 'done' : ''}">
          <span class="dt-icon">${openTickets === 0 ? '✅' : '🟡'}</span>
          <span class="dt-text">${openTickets > 0 ? `Заявки: ${openTickets} (штраф −${openTickets * 2} реп)` : 'Заявок нет'}</span>
          ${openTickets > 0 ? `<button class="btn tiny" data-view="chat">Открыть</button>` : ''}
        </div>
      </div>
    </div>`;

  /* === Pending клиенты === */
  let pendingHtml = '';
  if (pendingClients.length > 0) {
    pendingHtml = `
      <div class="panel pending-clients-section" style="border-color:rgba(255,107,0,.5);margin-bottom:12px">
        <div class="panel-head"><h2>🆕 Новые клиенты</h2><span class="muted small">${pendingClients.length}</span></div>
        <div class="pending-list">
          ${pendingClients.map(pc => {
            const t = NB.tariff(pc.tariffId) || { name:'—', price:0, color:'#7a7a86' };
            const dailyInc = Math.round(t.price / NB.INCOME_DIVISOR);
            const m = riskMeta[pc.risk] || riskMeta.normal;
            return `<div class="pending-client">
              <div class="pc-info">
                <b>${NB.esc(pc.name)}</b>
                <small>${NB.esc(pc.phone)} · ${NB.esc(pc.address)}${pc.referredBy ? ' · 👥 от ' + NB.esc(pc.referredBy) : ''}</small>
                ${riskBadge(pc.risk)}
              </div>
              <div class="pc-tariff">
                <span class="tag" style="--c:${t.color}">${NB.esc(t.name)}</span>
                <small>${NB.money(t.price)}/мес · +${NB.money(dailyInc)}/день</small>
              </div>
              <div class="pc-actions">
                <button class="btn primary small" data-action="accept-client" data-id="${pc.id}">✓</button>
                <button class="btn ghost small" data-action="reject-client" data-id="${pc.id}">✕</button>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  /* === Просроченные счета === */
  const overdueBills = g.bills.filter(b => b.status === 'pending' && b.dueDay < g.daily.dayNumber);
  let overdueHtml = '';
  if (overdueBills.length > 0) {
    overdueHtml = `
      <div class="panel" style="border-color:rgba(239,68,68,.5);margin-bottom:12px;background:rgba(239,68,68,.04)">
        <div class="panel-head"><h2 style="color:#f87171">🔥 Просроченные счета</h2></div>
        ${overdueBills.slice(0, 3).map(b => {
          const meta = NB.invoices.BILL_TYPES[b.type] || { icon: '📄' };
          return `<div class="bill-row overdue">
            <div class="bill-icon">${meta.icon}</div>
            <div class="bill-info"><b>${NB.esc(b.label)}</b><small>Просрочен на ${b.overdueDays || 1} дн.</small></div>
            <div class="bill-amount">${NB.money(b.amount)}</div>
            <button class="btn primary small" data-action="pay-bill" data-id="${b.id}">Оплатить</button>
          </div>`;
        }).join('')}
        <button class="btn ghost small" data-view="invoices" style="margin-top:8px">Все счета →</button>
      </div>`;
  }

  /* === Заявки — preview === */
  let ticketsHtml = '';
  if (openTicketsList.length > 0) {
    ticketsHtml = `
      <div class="panel tickets-section" style="margin-bottom:12px">
        <div class="panel-head"><h2>✉ Открытые заявки</h2><span class="muted small">${openTicketsList.length}</span></div>
        <div class="tickets-list">
          ${openTicketsList.slice(0, 3).map(t => {
            const c = NB.client(t.clientId) || { name:'—' };
            return `<div class="ticket-inline">
              <div class="ti-body"><b>${NB.esc(t.subject)}</b><small>${NB.esc(c.name)} · ${NB.fmtDateTime(t.createdAt)}</small></div>
              <button class="btn tiny" data-view="chat">Открыть</button>
            </div>`;
          }).join('')}
        </div>
        ${openTicketsList.length > 3 ? `<button class="btn ghost small" data-view="chat" style="margin-top:8px">Все ${openTicketsList.length} →</button>` : ''}
      </div>`;
  }

  /* === Журнал дня === */
  const logHtml = g.daily.log && g.daily.log.length > 1
    ? `<div class="panel day-log-panel" style="margin-bottom:12px">
        <div class="panel-head"><h2>📖 Что произошло сегодня</h2></div>
        <div class="day-log-list">
          ${g.daily.log.slice(-8).reverse().map(l => `<div class="log-entry log-${l.type || 'info'}">${NB.esc(l.text)}</div>`).join('')}
        </div>
      </div>` : '';

  /* === Семья === */
  let familyHtml = '';
  if (g.family.wife) {
    const isCrisis = g.family.wifeHappiness < 25;
    familyHtml = `
      <div class="family-panel" style="${isCrisis ? 'border-color:rgba(239,68,68,.5);background:rgba(239,68,68,.04)' : ''}">
        <div class="family-header">
          <h3>${isCrisis ? '💔' : '👨‍👩‍👧'} Семья</h3>
          ${isCrisis ? `<span class="pill off">Кризис</span>` : ''}
        </div>
        <div class="family-members">
          <div class="family-member">
            <div class="family-member-avatar" style="${isCrisis ? 'background:linear-gradient(135deg,#fca5a5,#dc2626)' : ''}">${NB.initials(g.family.wife.name)}</div>
            <div class="family-member-info">
              <b>${NB.esc(g.family.wife.name)}</b>
              <small>Счастье: ${g.family.wifeHappiness}%</small>
            </div>
          </div>
          ${g.family.kids.map(k => `<div class="family-member">
            <div class="family-member-avatar" style="background:linear-gradient(135deg,#fbbf24,#f59e0b)">${NB.initials(k.name)}</div>
            <div class="family-member-info"><b>${NB.esc(k.name)}</b><small>${k.age} лет</small></div>
          </div>`).join('')}
        </div>
      </div>`;
  }

  /* === Событие / угроза === */
  const eventBanner = g.activeEvent ? `
    <div class="game-panel" style="border-color:rgba(239,68,68,.6);margin-bottom:12px">
      <div class="game-head"><div>
        <div class="game-title" style="color:#f87171">⚠ Требуется решение</div>
        <div style="font-size:16px;font-weight:700;color:#fff;margin-top:4px">${g.activeEvent.title}</div>
        <div style="font-size:12.5px;color:var(--muted);margin-top:4px;max-width:520px">${g.activeEvent.desc}</div>
      </div><button class="btn primary" data-action="resolve-event-modal">Решить →</button></div>
    </div>` : '';

  let threatBar = '';
  if (w.threat > 0 && w.arc !== 'ordinary') {
    const lvl = w.threat >= 7 ? 'КРИТИЧЕСКИЙ' : w.threat >= 5 ? 'ВЫСОКИЙ' : w.threat >= 3 ? 'СРЕДНИЙ' : 'НИЗКИЙ';
    threatBar = `<div class="game-panel cyn-warning" style="border-color:rgba(168,85,247,.6);margin-bottom:12px">
      <div class="game-head"><div>
        <div class="game-title" style="color:#c084fc">⚠ Аномалия в сети</div>
        <div style="font-size:16px;font-weight:700;color:#fff;margin-top:4px">Угроза: ${lvl} (${w.threat})${w.threatNamed ? ' · Cynessa' : ''}</div>
      </div></div>
    </div>`;
  }

  const storyHtml = NB.story.renderPanel ? NB.story.renderPanel() : '';

  /* === Экономика === */
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
        ${cost.salary > 0 ? `<div class="econ-row"><span>👥 Зарплаты</span><b class="negative">−${NB.money(cost.salary)}</b></div>` : ''}
      </div>
      ${net.net < 0 ? `<div class="econ-warning">⚠ Вы в минусе. Повысьте тарифы, купите маркетинг или сократите расходы.</div>` : ''}
    </div>`;

  /* === Касса === */
  const goalPct = Math.min(100, (g.cash / g.goal) * 100);
  const canAdv = NB.canAdvanceDay();
  const status = g.stats.won ? '<span class="game-status win">Победа</span>'
    : g.stats.lost ? '<span class="game-status lose">Провал</span>'
    : '<span class="game-status playing">В игре</span>';

  /* === Доля рынка === */
  let marketHtml = '';
  if (g.unlocks.competitors) {
    marketHtml = `
      <div class="panel" style="margin-bottom:12px">
        <div class="panel-head">
          <h2>Доля рынка</h2>
          <button class="btn tiny" data-view="competitors">Все →</button>
        </div>
        <div class="market-bar">
          <i style="width:${g.marketShare}%;background:linear-gradient(90deg,var(--primary),var(--primary-2))"></i>
          ${g.competitors.filter(c => c.alive).map(c => `<i style="width:${c.share}%;background:${c.color}"></i>`).join('')}
        </div>
        <div class="market-legend">
          <span><i style="background:linear-gradient(90deg,var(--primary),var(--primary-2))"></i>NetBill ${g.marketShare}%</span>
          ${g.competitors.filter(c => c.alive).map(c => `<span><i style="background:${c.color}"></i>${NB.esc(c.name)} ${Math.round(c.share * 10) / 10}%</span>`).join('')}
        </div>
      </div>`;
  }

  /* === Топ клиентов === */
  const paidByClient = {};
  st.invoices.filter(i => i.status === 'paid').forEach(i => {
    paidByClient[i.clientId] = (paidByClient[i.clientId] || 0) + i.amount;
  });
  const top = Object.entries(paidByClient)
    .map(([id, sum]) => ({ client: NB.client(Number(id)), sum }))
    .filter(x => x.client).sort((a, b) => b.sum - a.sum).slice(0, 5);

  /* === Распределение по тарифам === */
  const dist = st.tariffs.map(t => ({
    ...t, count: st.clients.filter(c => c.tariffId === t.id).length
  })).sort((a, b) => b.count - a.count);
  const maxCount = Math.max(1, ...dist.map(d => d.count));

  return `
    <div class="page-head">
      <div>
        <h1>День ${g.daily.dayNumber}</h1>
        <p class="muted">${NB.dayLabel(st.simDate)} · ${openTickets} заявок · «${levelLabel}»</p>
      </div>
      <div class="head-actions">
        ${quickActions.map(q => `<button class="btn ghost small" data-view="${q.view}" ${q.scroll ? `data-scroll-to="${q.scroll}"` : ''} style="gap:6px">
          <span>${q.icon}</span><span>${q.label}</span>
        </button>`).join('')}
        <button class="btn ghost small" data-action="export">📥 Экспорт</button>
      </div>
    </div>
    ${recsHtml}
    ${eventBanner}
    ${threatBar}
    ${storyHtml}
    ${overdueHtml}
    ${dailyTasksHtml}
    ${pendingHtml}
    ${ticketsHtml}
    ${logHtml}
    ${familyHtml}
    ${economyPanel}
    <div class="game-panel">
      <div class="game-head">
        <div>
          <div class="game-title">Касса</div>
          <div class="game-cash" id="game-cash">${NB.money(g.cash)}<small>из ${NB.money(g.goal)}</small></div>
          <div class="game-goal-wrap">
            <div class="game-goal-labels"><span>Прогресс к цели</span><b>${Math.round(goalPct)}%</b></div>
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
    ${marketHtml}
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
        <div class="panel-head"><h2>Сетевой трафик</h2><span class="live-badge"><i></i>live</span></div>
        <div class="traffic-widget" style="grid-template-columns:1fr 1fr 1fr;margin-bottom:10px">
          <div class="traffic-stat ${traffic.status === 'ok' ? 'ok' : traffic.status === 'elevated' || traffic.status === 'warning' ? 'warn' : 'bad'}">
            <b>${traffic.usage}</b>
            <small>Мбит/с</small>
          </div>
          <div class="traffic-stat ${traffic.status === 'ok' ? 'ok' : traffic.status === 'elevated' || traffic.status === 'warning' ? 'warn' : 'bad'}">
            <b>${traffic.percent}%</b>
            <small>нагрузка</small>
          </div>
          <div class="traffic-stat ${traffic.stability > 70 ? 'ok' : traffic.stability > 40 ? 'warn' : 'bad'}">
            <b>${traffic.stability}%</b>
            <small>стабильность</small>
          </div>
        </div>
        <canvas id="traffic-chart" class="traffic-chart"></canvas>
        <div class="chart-foot">
          <span>Лимит: <b>${traffic.cap}</b> Мбит/с</span>
          ${traffic.percent > 80 ? `<button class="btn tiny" data-view="upgrades">⚡ Улучшить канал</button>` : ''}
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><h2>Новости мира</h2></div>
        <div class="news-list">
          ${w.news.slice(0, 8).map(n => `<div class="news-item"><small>${NB.fmtDateTime(n.at)}</small>${NB.esc(n.text)}</div>`).join('') || '<p class="empty">Пока тихо</p>'}
        </div>
      </div>
    </div>
    <div class="grid-2">
      <div class="panel">
        <div class="panel-head"><h2>Топ клиентов</h2><button class="btn tiny" data-view="clients">Все →</button></div>
        ${top.length ? `<div class="top-list">${top.map((t, i) => `
          <div class="top-item">
            <div class="top-rank">${i + 1}</div>
            <div class="top-body">
              <b>${NB.esc(t.client.name)}</b>
              <small>${NB.esc(t.client.phone)}</small>
            </div>
            <div class="top-amount">${NB.money(t.sum)}</div>
          </div>`).join('')}</div>` : '<p class="empty">Нет данных</p>'}
      </div>
      <div class="panel">
        <div class="panel-head"><h2>Распределение по тарифам</h2><button class="btn tiny" data-view="tariffs">Все →</button></div>
        ${dist.map(d => `
          <div class="tariff-bar">
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

/* ============================================================
   КЛИЕНТЫ
   ============================================================ */
S.clients = function () {
  const q = NB.ui.query.trim().toLowerCase();
  let list = NB.state.clients.filter(c => !q ||
    c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q));

  const dir = NB.ui.clientSort.dir === 'asc' ? 1 : -1;
  const riskOrder = { hacker: 0, spammer: 1, unknown: 2, risky: 3, normal: 4, good: 5 };
  list.sort((a, b) => {
    const k = NB.ui.clientSort.key;
    if (k === 'name')    return a.name.localeCompare(b.name) * dir;
    if (k === 'balance') return (a.balance - b.balance) * dir;
    if (k === 'tariff')  return (NB.price(a.tariffId) - NB.price(b.tariffId)) * dir;
    if (k === 'risk')    return ((riskOrder[a.risk] ?? 4) - (riskOrder[b.risk] ?? 4)) * dir;
    return 0;
  });

  const droneCount = NB.state.clients.filter(c => c.isDrone).length;
  const humanCount = NB.state.clients.filter(c => !c.isDrone).length;
  const riskyCount = NB.state.clients.filter(c => ['hacker', 'spammer', 'risky', 'unknown'].includes(c.risk)).length;
  const blockedCount = NB.state.clients.filter(c => c.status === 'blocked').length;

  const rows = list.map(c => {
    const t = NB.tariff(c.tariffId) || { name:'—', color:'#7a7a86' };
    const droneIcon = c.isDrone ? ' 🤖' : '';
    const m = riskMeta[c.risk] || riskMeta.normal;
    return `<tr class="fade">
      <td><div class="who" data-action="open-client" data-id="${c.id}">
        <div class="ava" style="background:${t.color}26;color:${t.color}">${NB.initials(c.name)}</div>
        <div><b>${NB.esc(c.name)}${droneIcon}</b><small>${NB.esc(c.phone)}</small></div>
      </div></td>
      <td class="muted">${NB.esc(c.address)}</td>
      <td><span class="tag" style="--c:${t.color}">${NB.esc(t.name)}</span></td>
      <td>${riskBadge(c.risk)}</td>
      <td class="num ${c.balance < 0 ? 'neg' : ''}">${NB.money(c.balance)}</td>
      <td>${c.status === 'active' ? '<span class="pill ok">Активен</span>' : '<span class="pill off">Блок</span>'}</td>
      <td class="actions">
        <button class="icon" data-action="recharge" data-id="${c.id}" title="Пополнить">＋</button>
        <button class="icon" data-action="edit-client" data-id="${c.id}" title="Изменить">✎</button>
        <button class="icon" data-action="toggle" data-id="${c.id}" title="${c.status === 'active' ? 'Блок' : 'Разблок'}">${c.status === 'active' ? '❙' : '▶'}</button>
        <button class="icon danger" data-action="del-client" data-id="${c.id}" title="Удалить">✕</button>
      </td>
    </tr>`;
  }).join('');

  return `
    <div class="page-head">
      <div>
        <h1>Клиенты</h1>
        <p class="muted">${NB.state.clients.length} всего · 👤 ${humanCount} · 🤖 ${droneCount}${riskyCount ? ` · ⚠ ${riskyCount} рискованных` : ''}${blockedCount ? ` · 🚫 ${blockedCount} заблок.` : ''}</p>
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
          <th class="sortable" data-sort="risk">Риск</th>
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
  const r = NB.tariffs.getRange();
  return `
    <div class="page-head">
      <div><h1>Тарифы</h1><p class="muted">${NB.state.tariffs.length} планов · скорость до ${r.speedMax} Мбит/с</p></div>
      <button class="btn primary" data-action="add-tariff">＋ Новый</button>
    </div>
    <div class="tariff-grid">
      ${NB.state.tariffs.map((t, i) => {
        const count = NB.state.clients.filter(c => c.tariffId === t.id).length;
        const monthlyIncome = count * t.price;
        return `<article class="tariff-card fade" style="position:relative;overflow:hidden;background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:14px;animation-delay:${i * 60}ms">
          <div style="position:absolute;inset:-40% 60% 70% -30%;border-radius:50%;background:${t.color};opacity:.16;filter:blur(32px);pointer-events:none"></div>
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;position:relative">
            <h3 style="font-size:13.5px;color:#fff">${NB.esc(t.name)}</h3>
            <div style="display:flex;gap:2px">
              <button class="icon" style="width:24px;height:24px;font-size:11px" data-action="edit-tariff" data-id="${t.id}" title="Изменить">✎</button>
              <button class="icon danger" style="width:24px;height:24px;font-size:11px" data-action="del-tariff" data-id="${t.id}" title="Удалить">✕</button>
            </div>
          </div>
          <p style="color:var(--muted);font-size:11.5px;margin-bottom:10px;min-height:14px;position:relative">${NB.esc(t.desc || '')}</p>
          <div style="font-size:12px;color:var(--muted);position:relative">
            <b class="tariff-speed" style="font-size:20px;color:var(--primary-3)">${t.speed}</b> Мбит/с
          </div>
          <div class="tariff-price" style="font-size:16px;font-weight:700;margin:6px 0 10px;color:#fff;position:relative">${NB.money(t.price)}<small style="font-size:11px;color:var(--muted);margin-left:2px">/мес</small></div>
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);border-top:1px solid var(--line);padding-top:8px;position:relative">
            <span>${count} кл.</span><span>${NB.money(monthlyIncome)}</span>
          </div>
        </article>`;
      }).join('')}
    </div>
    <div class="panel" style="margin-top:14px">
      <div class="panel-head"><h2>Диапазон возможностей</h2></div>
      <p class="muted small" style="margin-bottom:8px">Скорость и цена зависят от пропускной способности (апгрейды).</p>
      <div class="tariff-range-info">
        <span>⚡ Скорость: <b>${r.speedMin}–${r.speedMax}</b> Мбит/с</span>
        <span>💰 Апгрейды: <b>${NB.state.game.upgrades.bandwidth}</b> уровней</span>
        <button class="btn tiny" data-view="upgrades" style="margin-left:auto">Улучшить канал →</button>
      </div>
    </div>`;
};

/* ============================================================
   СЧЕТА
   ============================================================ */
S.invoices = function () {
  return NB.invoices.renderView();
};

/* ============================================================
   ЧАТ
   ============================================================ */
S.chat = function () {
  return NB.chat.renderView();
};

/* ============================================================
   СОТРУДНИКИ
   ============================================================ */
S.employees = function () {
  return NB.employees.renderView();
};

/* ============================================================
   МАГАЗИН
   ============================================================ */
S.upgrades = function () {
  const g = NB.state.game;
  const allKeys = Object.keys(NB.game.UPGRADES);
  const visible = allKeys.filter(key => NB.game.upgradeVisible(key));

  /* Следующий, который скоро откроется */
  const blocked = allKeys.filter(k => !NB.game.upgradeVisible(k))
    .map(k => {
      const u = NB.game.UPGRADES[k];
      let eta = null;
      if (u.minDay && g.daily.dayNumber < u.minDay) eta = `с ${u.minDay}-го дня`;
      else if (u.requiresUpgrade && !g.upgrades[u.requiresUpgrade]) eta = `нужен ${NB.game.UPGRADES[u.requiresUpgrade]?.name || u.requiresUpgrade}`;
      else if (u.requiresFlag) eta = 'по сюжету';
      return { key: k, u, eta };
    })
    .filter(x => x.eta)
    .slice(0, 2);

  const blockedHint = blocked.length
    ? `<div class="panel" style="margin-top:14px;border-style:dashed;opacity:.7">
        <div class="panel-head"><h2>🔒 Скоро откроется</h2></div>
        ${blocked.map(b => `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;font-size:13px;color:var(--muted)">
          <span style="font-size:18px">${b.u.icon}</span>
          <span style="flex:1">${NB.esc(b.u.name)}</span>
          <span class="small">${NB.esc(b.eta)}</span>
        </div>`).join('')}
      </div>`
    : '';

  return `
    <div class="page-head">
      <div>
        <h1>Магазин</h1>
        <p class="muted">Касса: <b style="color:var(--primary-3)">${NB.money(g.cash)}</b> · ${visible.length} доступно</p>
      </div>
    </div>
    ${visible.length ? `<div class="upgrades-grid">
      ${visible.map((key, i) => {
        const u = NB.game.UPGRADES[key];
        const lvl = g.upgrades[key] || 0;
        const cost = NB.game.upgradeCost(key);
        const maxed = cost === null;
        const canBuy = !maxed && g.cash >= cost;
        const broken = NB.game.isBroken(key);
        const upkeepNow = lvl > 0 ? u.upkeep.slice(0, lvl).reduce((a, b) => a + b, 0) : 0;
        const nextEffect = lvl < u.costs.length ? u.levels[lvl] : null;
        return `<div class="upgrade fade ${maxed ? 'maxed' : ''} ${broken ? 'broken' : ''}" style="animation-delay:${i * 50}ms">
          <div class="upgrade-head"><div class="upgrade-icon">${u.icon}</div><div style="flex:1"><h3>${u.name}</h3></div></div>
          <div class="upgrade-desc">${u.desc}</div>
          <div class="upgrade-levels">${(u.costs || [1,2,3]).map((_, j) => `<i class="${j < lvl ? 'filled' : ''}"></i>`).join('')}</div>
          <div class="upgrade-effect ${lvl === 0 ? 'neutral' : ''}">${broken ? '⚠ Сломано — работает неэффективно' : (lvl === 0 ? `Следующее: ${nextEffect || '—'}` : `Ур. ${lvl}: ${u.levels[lvl - 1]}`)}</div>
          <div class="upgrade-foot" style="margin-top:14px">
            <div class="upgrade-price">${maxed ? '— MAX —' : NB.money(cost)}</div>
            <div style="display:flex;gap:6px">
              ${broken ? `<button class="btn primary small" data-action="repair-upgrade" data-key="${key}">Починить</button>` : ''}
              ${maxed
                ? '<button class="btn ghost small" disabled>Максимум</button>'
                : `<button class="btn ${canBuy ? 'primary' : 'ghost'} small" data-action="buy-upgrade" data-key="${key}" ${canBuy ? '' : 'disabled'}>${lvl === 0 ? 'Купить' : 'Улучшить'}</button>`}
            </div>
          </div>
          <div style="font-size:11.5px;color:var(--muted);margin-top:10px">Обслуживание: ${upkeepNow} ₽/день</div>
        </div>`;
      }).join('')}
    </div>` : '<div class="panel"><p class="empty">Улучшения появятся по мере роста компании</p></div>'}
    ${blockedHint}
  `;
};

/* ============================================================
   КОНКУРЕНТЫ
   ============================================================ */
S.competitors = function () {
  return NB.competitors.renderView();
};

/* ============================================================
   АКТИВНОСТЬ
   ============================================================ */
S.activity = function () {
  const all = NB.state.activity.slice().reverse();
  const filter = NB.ui.activityFilter || 'all';
  const filtered = filter === 'all' ? all : all.filter(a => a.type === filter);

  const filters = [
    { id: 'all', label: 'Все', icon: '◷' },
    { id: 'pay', label: 'Оплаты', icon: '₽' },
    { id: 'tariff', label: 'Тарифы', icon: '◆' },
    { id: 'ticket', label: 'Заявки', icon: '✉' },
    { id: 'block', label: 'Инциденты', icon: '❙' },
    { id: 'sys', label: 'Система', icon: '⚙' }
  ];

  return `
    <div class="page-head">
      <div><h1>Активность</h1><p class="muted">журнал событий · ${all.length} записей</p></div>
      <button class="btn ghost" data-action="clear-activity">Очистить</button>
    </div>
    <div class="panel">
      <div class="toolbar">
        <div class="filters">
          ${filters.map(f => `<button class="chip ${filter === f.id ? 'active' : ''}" data-activity-filter="${f.id}">${f.icon} ${f.label}</button>`).join('')}
        </div>
      </div>
      <div class="activity-list" id="activity-list">
        ${filtered.length ? filtered.map(S._activityItem).join('') : '<p class="empty">Пусто</p>'}
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

/* ============================================================
   НАСТРОЙКИ
   ============================================================ */
S.settings = function () {
  const st = NB.state.settings;
  const g = NB.state.game;
  return `
    <div class="page-head"><div><h1>Настройки</h1><p class="muted">Данные и визуал</p></div></div>
    <div class="panel">
      <div class="settings-section">
        <h3>Визуал</h3>
        <div class="setting-row">
          <div class="setting-row-info"><b>Меньше рекламы</b><small>Снижает частоту всплывающего спама</small></div>
          <label class="switch"><input type="checkbox" ${st.reduceAds ? 'checked' : ''} data-setting="reduceAds"><span class="switch-track"></span></label>
        </div>
      </div>
      <div class="settings-section">
        <h3>Прогресс</h3>
        <div class="setting-row">
          <div class="setting-row-info">
            <b>Дней в игре: ${g.daily.dayNumber}</b>
            <small>Уровень компании: ${g.company.level} · событий решено: ${g.stats.eventsResolved}</small>
          </div>
        </div>
        <div class="setting-row">
          <div class="setting-row-info">
            <b>Всего заработано: ${NB.money(g.stats.totalRevenue)}</b>
            <small>Потрачено: ${NB.money(g.stats.totalExpenses)}</small>
          </div>
        </div>
      </div>
      <div class="settings-section">
        <h3>Данные</h3>
        <div class="detail-actions">
          <button class="btn ghost" data-action="export">📥 Экспорт JSON</button>
          <button class="btn danger" data-action="reset-data">🗑 Сбросить всё</button>
        </div>
        <p class="muted small" style="margin-top:10px">Экспорт сохраняет всё состояние в JSON. Сброс удалит прогресс безвозвратно.</p>
      </div>
    </div>`;
};

})(window);