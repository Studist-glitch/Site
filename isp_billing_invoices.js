/* isp_billing_invoices.js — система счетов: клиентские + расходные */
(function (global) {
'use strict';
const NB = global.NB;
const I = NB.invoices = NB.invoices || {};

/* Типы расходных счетов */
I.BILL_TYPES = {
  salary:     { icon: '👥', label: 'Зарплаты',                interval: 7,  growRate: 0 },
  tax:        { icon: '🏛', label: 'Налоги',                    interval: 30, growRate: 0.02 },
  utility:    { icon: '⚡', label: 'Электричество и офис',      interval: 30, growRate: 0.03 },
  family:     { icon: '👨‍👩‍👧', label: 'Семья',                    interval: 7,  growRate: 0.02 },
  rent:       { icon: '🏢', label: 'Аренда офиса',              interval: 30, growRate: 0.01 },
  loan:       { icon: '💳', label: 'Платёж по кредиту',         interval: 30, growRate: 0 },
  fine:       { icon: '⚖', label: 'Штраф',                     interval: 0,  growRate: 0.1 },
  maintenance:{ icon: '🔧', label: 'Обслуживание оборудования',  interval: 0,  growRate: 0 }
};

/* ============================================================
   Создание счёта
   ============================================================ */
I.addBill = function (type, amount, opts) {
  opts = opts || {};
  const g = NB.state.game;
  const meta = I.BILL_TYPES[type] || { icon: '📄', label: opts.label || 'Счёт', growRate: 0 };
  const bill = {
    id: g.billsSeq++,
    type,
    label: opts.label || meta.label,
    amount: Math.max(0, Math.round(amount)),
    dueDay: opts.dueDay || (g.daily.dayNumber + (meta.interval || 7)),
    createdAtDay: g.daily.dayNumber,
    status: 'pending',
    growRate: opts.growRate !== undefined ? opts.growRate : (meta.growRate || 0),
    overdueDays: 0,
    consequenceId: opts.consequenceId || type
  };
  g.bills.push(bill);
  return bill;
};

/* ============================================================
   Начисление счетов за день (вызывается из daily.js)
   ============================================================ */
I.generateForDay = function () {
  const g = NB.state.game;
  const day = g.daily.dayNumber;

  /* Зарплаты — каждые 7 дней */
  if (day % 7 === 0 && g.employees.length > 0) {
    const total = g.employees.reduce((s, e) => s + e.salary, 0) * 7;
    I.addBill('salary', total, { label: `Зарплаты (${g.employees.length} чел. × 7 дн.)` });
    NB.addLog(`Начислены зарплаты: ${NB.money(total)}`, 'info');
  }

  /* Семья — каждые 7 дней, растёт с детьми */
  if (day % 7 === 0) {
    const kidsCount = g.family.kids.length;
    const base = 300 + kidsCount * 200 + (g.family.wife ? 100 : 0);
    I.addBill('family', base, { label: `Семья: продукты, одежда, нужды (${kidsCount + (g.family.wife ? 1 : 0)} чел.)` });
    NB.addLog(`Счёт за семью: ${NB.money(base)}`, 'info');
  }

  /* Налоги — каждые 30 дней, 15% от месячной выручки */
  if (day % 30 === 0) {
    const monthlyRevenue = NB.state.revenue.slice(-30).reduce((s, r) => s + r.amount, 0);
    const tax = Math.max(200, Math.round(monthlyRevenue * 0.15));
    I.addBill('tax', tax, { label: `Налог (15% от выручки за месяц)` });
    NB.addLog(`Налог: ${NB.money(tax)}`, 'info');
  }

  /* Электричество — каждые 30 дней, растёт с оборудованием */
  if (day % 30 === 0) {
    const totalUpgrades = Object.values(g.upgrades).reduce((s, v) => s + v, 0);
    const clientCount = NB.state.clients.length;
    const utility = 500 + totalUpgrades * 80 + clientCount * 5;
    I.addBill('utility', utility, { label: `Электричество, интернет, офис (${totalUpgrades} апгр., ${clientCount} клиентов)` });
    NB.addLog(`Коммуналка: ${NB.money(utility)}`, 'info');
  }

  /* Аренда офиса — каждые 30 дней, растёт по уровням компании */
  if (day % 30 === 0) {
    const rent = 800 + g.company.level * 100;
    I.addBill('rent', rent, { label: 'Аренда офиса' });
  }

  /* Штрафы — если есть просрочки/нарушения */
  /* Это начисляется из событий */

  NB.save();
};

/* ============================================================
   Оплата
   ============================================================ */
I.payBill = function (billId) {
  const g = NB.state.game;
  const bill = g.bills.find(b => b.id === billId);
  if (!bill || bill.status !== 'pending') return;
  if (g.cash < bill.amount) return NB.toast('Недостаточно средств', 'err');
  g.cash -= bill.amount;
  bill.status = 'paid';
  bill.paidAt = new Date().toISOString();
  NB.addLog(`Оплачен счёт: ${bill.label} (${NB.money(bill.amount)})`, 'success');
  NB.addCompanyXp(5);
  NB.save();
  NB.render();
};

/* ============================================================
   Просрочка — вызывается раз в день
   ============================================================ */
I.processOverdue = function () {
  const g = NB.state.game;
  const today = g.daily.dayNumber;

  g.bills.forEach(bill => {
    if (bill.status !== 'pending') return;
    if (bill.dueDay >= today) return;

    /* Просрочено */
    bill.overdueDays = (bill.overdueDays || 0) + 1;

    /* Начисляем проценты */
    if (bill.growRate > 0) {
      const growth = Math.round(bill.amount * bill.growRate);
      if (growth > 0) {
        bill.amount += growth;
        NB.addLog(`${bill.label}: +${NB.money(growth)} за просрочку`, 'warn');
      }
    }

    /* Последствия по типу */
    I.applyOverdueConsequence(bill);
  });

  NB.save();
};

I.applyOverdueConsequence = function (bill) {
  const g = NB.state.game;

  /* Конкретные типы */
  if (bill.type === 'salary' && bill.overdueDays === 3) {
    if (g.employees.length > 0) {
      const victim = NB.pick(g.employees);
      g.employees = g.employees.filter(e => e.id !== victim.id);
      NB.notify(`⚡ ${victim.name} уволился из-за невыплаты зарплаты`, 'warn');
      NB.addLog(`${victim.name} уволился (зарплата)`, 'warn');
    }
  }
  if (bill.type === 'salary' && bill.overdueDays === 7) {
    g.reputation = Math.max(0, g.reputation - 5);
  }

  if (bill.type === 'tax' && bill.overdueDays === 5) {
    const fine = Math.round(bill.amount * 0.3);
    g.reputation = Math.max(0, g.reputation - 5);
    I.addBill('fine', fine, { label: 'Штраф от налоговой', dueDay: g.daily.dayNumber + 7 });
    NB.notify(`🏛 Налоговая выписала штраф ${NB.money(fine)}`, 'warn');
  }
  if (bill.type === 'tax' && bill.overdueDays === 10) {
    g.reputation = Math.max(0, g.reputation - 10);
    g.cash = Math.max(0, g.cash - Math.round(bill.amount * 0.5));
    NB.notify(`🏛 Принудительное списание налоговой`, 'warn');
  }

  if (bill.type === 'utility' && bill.overdueDays === 5) {
    /* Случайное оборудование ломается */
    const broken = Object.keys(g.upgrades).filter(k => g.upgrades[k] > 0 && !g.upgradesBroken[k]);
    if (broken.length > 0) {
      const victim = NB.pick(broken);
      g.upgradesBroken[victim] = { brokenAt: g.daily.dayNumber, reason: 'Отключение' };
      NB.notify(`⚡ Отключено: ${victim}`, 'warn');
      NB.addLog(`Оборудование ${victim} отключено`, 'warn');
    }
  }

  if (bill.type === 'family' && bill.overdueDays === 3) {
    g.family.wifeHappiness = Math.max(0, g.family.wifeHappiness - 15);
    NB.notify(`💔 Жена недовольна`, 'warn');
  }
  if (bill.type === 'family' && bill.overdueDays === 10 && g.family.wife) {
    if (g.family.wifeHappiness < 30) {
      NB.notify(`💔 ${g.family.wife.name} ушла к родителям`, 'warn');
      g.family.wife = null;
      g.reputation = Math.max(0, g.reputation - 10);
    }
  }

  if (bill.type === 'loan' && bill.overdueDays === 3) {
    const grab = Math.round(bill.amount * 0.4);
    g.cash = Math.max(0, g.cash - grab);
    NB.notify(`💳 Кредитор забрал ${NB.money(grab)}`, 'warn');
  }
};

/* ============================================================
   Взять кредит (опция)
   ============================================================ */
I.takeLoan = function (amount) {
  const g = NB.state.game;
  if (amount < 10000 || amount > 500000) return NB.toast('Кредит 10 000 – 500 000', 'err');
  const existingLoans = g.bills.filter(b => b.type === 'loan' && b.status === 'pending');
  if (existingLoans.length >= 2) return NB.toast('Максимум 2 кредита одновременно', 'err');
  g.cash += amount;
  /* Кредит: 130% от суммы, платёж 13% в месяц (10 месяцев) */
  const monthlyPayment = Math.round(amount * 0.13);
  for (let i = 1; i <= 10; i++) {
    I.addBill('loan', monthlyPayment, {
      label: `Кредит ${NB.money(amount)} — платёж ${i}/10`,
      dueDay: g.daily.dayNumber + i * 30
    });
  }
  NB.notify(`💰 Получен кредит ${NB.money(amount)}`, 'ok');
  NB.addLog(`Взят кредит ${NB.money(amount)}`, 'info');
  NB.save();
  NB.render();
};

/* ============================================================
   Счета — рендер
   ============================================================ */
I.renderClientInvoices = function () {
  const st = NB.state;
  let list = [...st.invoices].sort((a, b) => b.id - a.id);
  if (NB.ui.invoiceFilter !== 'all') list = list.filter(i => i.status === NB.ui.invoiceFilter);
  const totalUnpaid = st.invoices.filter(i => i.status === 'unpaid').reduce((s, i) => s + i.amount, 0);

  const rows = list.map(i => {
    const c = NB.client(i.clientId) || { name: '—' };
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

  return `
    <div class="bills-summary">
      <div class="bills-sum-card">
        <b>${NB.money(totalUnpaid)}</b>
        <small>Не оплачено клиентами</small>
      </div>
      <div class="bills-sum-card">
        <b>${st.invoices.length}</b>
        <small>Всего счетов</small>
      </div>
      <div class="bills-sum-card paid">
        <b>${st.invoices.filter(i => i.status === 'paid').length}</b>
        <small>Оплачено</small>
      </div>
    </div>
    <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
      <button class="btn primary" data-action="gen-invoices">Выставить счета клиентам</button>
    </div>
    <div class="panel">
      <div class="toolbar">
        <div class="filters">
          ${['all','unpaid','paid'].map(f => `<button class="chip ${NB.ui.invoiceFilter === f ? 'active' : ''}" data-filter="${f}">
            ${f === 'all' ? 'Все' : f === 'unpaid' ? 'Неоплачено' : 'Оплачено'}</button>`).join('')}
        </div>
      </div>
      ${list.length ? `<div class="table-wrap"><table class="table">
        <thead><tr><th>№</th><th>Клиент</th><th>Период</th><th class="num">Сумма</th><th>Статус</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>` : '<p class="empty">Счетов нет</p>'}
    </div>`;
};

I.renderCompanyBills = function () {
  const g = NB.state.game;
  const today = g.daily.dayNumber;
  const pending = g.bills.filter(b => b.status === 'pending').sort((a, b) => a.dueDay - b.dueDay);
  const overdue = pending.filter(b => b.dueDay < today);
  const totalPending = pending.reduce((s, b) => s + b.amount, 0);

  const rows = pending.map(b => {
    const daysLeft = b.dueDay - today;
    const isOverdue = daysLeft < 0;
    const rowClass = isOverdue ? 'overdue' : daysLeft === 0 ? 'due-1' : daysLeft <= 3 ? 'due-3' : '';
    const meta = I.BILL_TYPES[b.type] || { icon: '📄' };
    const dueLabel = isOverdue
      ? `Просрочен на ${b.overdueDays} дн.`
      : daysLeft === 0 ? 'Срок — сегодня'
      : `Срок через ${daysLeft} дн.`;
    return `<div class="bill-row ${rowClass}">
      <div class="bill-icon">${meta.icon}</div>
      <div class="bill-info">
        <b>${NB.esc(b.label)}</b>
        <small>${dueLabel}${b.growRate > 0 && isOverdue ? ` · +${Math.round(b.growRate * 100)}%/день` : ''}</small>
      </div>
      <div class="bill-amount">${NB.money(b.amount)}</div>
      <div class="bill-actions">
        <button class="btn ${g.cash >= b.amount ? 'primary' : 'ghost'} small" data-action="pay-bill" data-id="${b.id}" ${g.cash >= b.amount ? '' : 'disabled'}>Оплатить</button>
      </div>
    </div>`;
  }).join('');

  return `
    <div class="bills-summary">
      <div class="bills-sum-card ${overdue.length > 0 ? 'overdue' : ''}">
        <b>${NB.money(totalPending)}</b>
        <small>К оплате</small>
      </div>
      <div class="bills-sum-card ${overdue.length > 0 ? 'overdue' : ''}">
        <b>${overdue.length}</b>
        <small>Просрочено</small>
      </div>
      <div class="bills-sum-card">
        <b>${pending.length}</b>
        <small>Всего счетов</small>
      </div>
    </div>
    <div style="display:flex;justify-content:flex-end;margin-bottom:12px;gap:8px">
      <button class="btn ghost" data-action="take-loan">💳 Взять кредит</button>
    </div>
    ${pending.length ? rows : '<div class="panel"><p class="empty">Нет активных счетов</p></div>'}
  `;
};

/* ============================================================
   Рендер вкладки (общая)
   ============================================================ */
I.renderView = function () {
  const tab = NB.ui.invoiceTab || 'client';
  return `
    <div class="page-head">
      <div><h1>Счета</h1><p class="muted">Клиентские счета и расходы компании</p></div>
    </div>
    <div class="invoice-tabs">
      <button class="chip ${tab === 'client' ? 'active' : ''}" data-invoice-tab="client">💵 Клиенты платят нам</button>
      <button class="chip ${tab === 'company' ? 'active' : ''}" data-invoice-tab="company">💸 Мы платим</button>
    </div>
    ${tab === 'client' ? I.renderClientInvoices() : I.renderCompanyBills()}
  `;
};

})(window);