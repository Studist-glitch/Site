(function () {
  'use strict';

  /* ================= утилиты ================= */
  const LS = 'netbill_v1';
  const esc = s => String(s).replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const money = n => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Math.round(n)) + ' ₽';
  const period = () => new Date().toISOString().slice(0, 7);
  const periodLabel = p => {
    const [y, m] = p.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  };
  const initials = n => n.replace(/[«»"]/g, '').split(/\s+/).slice(0, 2)
    .map(w => w[0] || '').join('').toUpperCase();

  /* ================= данные ================= */
  function seed() {
    const tariffs = [
      { id: 1, name: 'Старт',       speed: 100,  price: 450,  color: '#38bdf8' },
      { id: 2, name: 'Оптимальный', speed: 300,  price: 650,  color: '#8b5cf6' },
      { id: 3, name: 'Гигабит',     speed: 1000, price: 990,  color: '#10b981' },
      { id: 4, name: 'Бизнес',      speed: 500,  price: 1500, color: '#f59e0b' }
    ];
    const raw = [
      ['Иванов Алексей',   'ул. Ленина, 12–45',       '+7 912 345-67-01', 2,  820],
      ['Петрова Мария',    'пр. Мира, 8–3',           '+7 912 345-67-02', 1,  140],
      ['Сидоров Дмитрий',  'ул. Гагарина, 21–77',     '+7 912 345-67-03', 3, 2100],
      ['Кузнецова Анна',   'ул. Садовая, 5–12',       '+7 912 345-67-04', 2, -320],
      ['ООО «Вектор»',     'ул. Промышленная, 3',     '+7 495 100-20-30', 4, 7400],
      ['Смирнов Павел',    'ул. Северная, 44–9',      '+7 912 345-67-06', 1,   60],
      ['Волкова Ольга',    'ул. Речная, 17–2',        '+7 912 345-67-07', 3, 1450],
      ['ООО «Логистик»',   'ул. Складская, 11',       '+7 495 200-40-50', 4,  320]
    ];
    const clients = raw.map((r, i) => ({
      id: i + 1, name: r[0], address: r[1], phone: r[2],
      tariffId: r[3], balance: r[4], status: r[4] < 0 ? 'blocked' : 'active'
    }));
    const p = period();
    const invoices = clients.map((c, i) => {
      const t = tariffs.find(t => t.id === c.tariffId);
      const paid = i % 3 !== 0;
      return {
        id: i + 1, clientId: c.id, period: p, amount: t.price,
        status: paid ? 'paid' : 'unpaid',
        paidAt: paid ? new Date().toISOString() : null
      };
    });
    return {
      tariffs, clients, invoices,
      seq: { client: clients.length + 1, invoice: invoices.length + 1, tariff: tariffs.length + 1 }
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(LS);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    const s = seed();
    localStorage.setItem(LS, JSON.stringify(s));
    return s;
  }

  let state = load();
  let view = 'overview';
  let query = '';

  const save = () => localStorage.setItem(LS, JSON.stringify(state));
  const tariffById = id => state.tariffs.find(t => t.id === id);
  const clientById = id => state.clients.find(c => c.id === id);
  const price = id => (tariffById(id) || { price: 0 }).price;

  /* ================= toast ================= */
  const toastWrap = document.getElementById('toasts');
  function toast(msg, type) {
    const t = document.createElement('div');
    t.className = 'toast' + (type === 'err' ? ' err' : '');
    t.textContent = msg;
    toastWrap.appendChild(t);
    requestAnimationFrame(() => t.classList.add('in'));
    setTimeout(() => {
      t.classList.remove('in');
      setTimeout(() => t.remove(), 320);
    }, 2600);
  }

  /* ================= modal ================= */
  const modal = document.getElementById('modal');
  let modalHandler = null;

  function openModal({ title, html, submit = 'Сохранить', onSubmit }) {
    modal.innerHTML = `<div class="modal-box">
      <h3>${title}</h3>
      <form id="modal-form" novalidate>
        ${html}
        <div class="modal-actions">
          <button type="button" class="btn ghost" data-close>Отмена</button>
          <button type="submit" class="btn primary">${submit}</button>
        </div>
      </form>
    </div>`;
    modal.classList.remove('hidden');
    requestAnimationFrame(() => modal.classList.add('show'));

    const form = modal.querySelector('#modal-form');
    modalHandler = onSubmit;
    form.addEventListener('submit', e => {
      e.preventDefault();
      modalHandler(new FormData(form), form);
    });
    modal.querySelector('[data-close]').addEventListener('click', closeModal);
    setTimeout(() => {
      const f = form.querySelector('input,select');
      if (f) f.focus();
    }, 70);
  }

  function closeModal() {
    modal.classList.remove('show');
    setTimeout(() => modal.classList.add('hidden'), 220);
  }

  modal.addEventListener('click', e => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
  });

  const field = (label, name, type = 'text', value = '', extra = '') =>
    `<label class="field"><span>${label}</span>
       <input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;

  const selectField = (label, name, options) =>
    `<label class="field"><span>${label}</span>
       <select name="${name}">${options.map(o =>
         `<option value="${o.value}">${esc(o.label)}</option>`).join('')}</select></label>`;

  /* ================= views ================= */
  function card(label, value, sub, fmt, color) {
    return `<div class="stat fade">
      <div class="stat-top"><span>${label}</span><i class="dot" style="background:${color}"></i></div>
      <div class="stat-value" data-count="${value}" data-fmt="${fmt || ''}">0</div>
      <div class="stat-sub">${sub}</div>
    </div>`;
  }

  function viewOverview() {
    const total = state.clients.length;
    const active = state.clients.filter(c => c.status === 'active');
    const mrr = active.reduce((s, c) => s + price(c.tariffId), 0);
    const paid = state.invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
    const due = state.invoices.filter(i => i.status === 'unpaid').reduce((s, i) => s + i.amount, 0);

    const dist = state.tariffs.map(t => {
      const count = state.clients.filter(c => c.tariffId === t.id).length;
      return { ...t, count, pct: total ? (count / total) * 100 : 0, sum: count * t.price };
    }).sort((a, b) => b.count - a.count);

    const recent = state.invoices.filter(i => i.status === 'paid').slice(-5).reverse();

    return `
    <div class="page-head">
      <div><h1>Обзор</h1><p class="muted">Период: ${periodLabel(period())}</p></div>
      <button class="btn primary" data-action="gen-invoices">Выставить счета</button>
    </div>

    <div class="grid stats">
      ${card('Клиенты', total, `${active.length} активных · ${total - active.length} заблокировано`, '', '#2f6bff')}
      ${card('MRR', mrr, 'ожидаемая выручка / мес', 'money', '#8b5cf6')}
      ${card('Оплачено', paid, 'за текущий период', 'money', '#10b981')}
      ${card('К оплате', due, 'неоплаченные счета', 'money', '#f59e0b')}
    </div>

    <div class="grid two">
      <section class="panel fade">
        <h2>Распределение по тарифам</h2>
        ${dist.map(d => `
          <div class="bar-row">
            <div class="bar-top">
              <span>${esc(d.name)} · ${d.speed} Мбит/с</span>
              <b>${d.count}</b>
            </div>
            <div class="bar"><i style="width:${d.pct}%;background:${d.color}"></i></div>
          </div>`).join('')}
      </section>

      <section class="panel fade">
        <h2>Последние оплаты</h2>
        ${recent.length ? recent.map(i => {
          const c = clientById(i.clientId) || { name: '—' };
          return `<div class="bar-row" style="display:flex;justify-content:space-between;align-items:center">
            <span style="font-size:13.5px">${esc(c.name)}</span>
            <b style="font-size:13.5px;color:#15803d">+${money(i.amount)}</b>
          </div>`;
        }).join('') : '<p class="empty">Пока нет оплат</p>'}
      </section>
    </div>`;
  }

  function viewClients() {
    const q = query.trim().toLowerCase();
    const list = state.clients.filter(c =>
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q));

    const rows = list.map(c => {
      const t = tariffById(c.tariffId) || { name: '—', price: 0, color: '#94a3b8' };
      return `<tr class="fade">
        <td>
          <div class="who">
            <div class="ava" style="background:${t.color}1f;color:${t.color}">${initials(c.name)}</div>
            <div><b>${esc(c.name)}</b><small>${esc(c.phone)}</small></div>
          </div>
        </td>
        <td class="muted">${esc(c.address)}</td>
        <td><span class="tag" style="--c:${t.color}">${esc(t.name)}</span></td>
        <td class="num ${c.balance < 0 ? 'neg' : ''}">${money(c.balance)}</td>
        <td>${c.status === 'active'
          ? '<span class="pill ok">Активен</span>'
          : '<span class="pill off">Заблокирован</span>'}</td>
        <td class="actions">
          <button class="icon" title="Пополнить" data-action="recharge" data-id="${c.id}">＋</button>
          <button class="icon" title="${c.status === 'active' ? 'Блокировать' : 'Разблокировать'}"
                  data-action="toggle" data-id="${c.id}">${c.status === 'active' ? '❙❙' : '▶'}</button>
          <button class="icon danger" title="Удалить" data-action="del-client" data-id="${c.id}">✕</button>
        </td>
      </tr>`;
    }).join('');

    return `
    <div class="page-head">
      <div><h1>Клиенты</h1><p class="muted">${state.clients.length} абонентов в базе</p></div>
      <button class="btn primary" data-action="add-client">＋ Новый клиент</button>
    </div>

    <div class="panel fade">
      <div class="toolbar">
        <input id="client-search" class="search" placeholder="Поиск по имени, адресу или телефону…" value="${esc(query)}">
      </div>
      ${list.length ? `
      <div class="table-wrap">
        <table class="table">
          <thead><tr>
            <th>Клиент</th><th>Адрес</th><th>Тариф</th>
            <th class="num">Баланс</th><th>Статус</th><th></th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>` : '<p class="empty">Ничего не найдено</p>'}
    </div>`;
  }

  function viewTariffs() {
    return `
    <div class="page-head">
      <div><h1>Тарифы</h1><p class="muted">${state.tariffs.length} планов</p></div>
      <button class="btn primary" data-action="add-tariff">＋ Новый тариф</button>
    </div>

    <div class="grid tariffs">
      ${state.tariffs.map((t, i) => {
        const count = state.clients.filter(c => c.tariffId === t.id).length;
        return `<article class="tariff fade" style="--c:${t.color};animation-delay:${i * 60}ms">
          <div class="tariff-glow"></div>
          <h3>${esc(t.name)}</h3>
          <div class="speed"><b>${t.speed}</b> Мбит/с</div>
          <div class="price">${money(t.price)}<small>/мес</small></div>
          <div class="tariff-foot">
            <span>${count} клиентов</span>
            <span>${money(count * t.price)}</span>
          </div>
        </article>`;
      }).join('')}
    </div>`;
  }

  function viewInvoices() {
    const list = [...state.invoices].sort((a, b) => b.id - a.id);
    const unpaid = list.filter(i => i.status === 'unpaid').length;

    const rows = list.map(i => {
      const c = clientById(i.clientId) || { name: '—' };
      return `<tr class="fade">
        <td class="muted">#${i.id}</td>
        <td><b>${esc(c.name)}</b></td>
        <td class="muted">${periodLabel(i.period)}</td>
        <td class="num">${money(i.amount)}</td>
        <td>${i.status === 'paid'
          ? '<span class="pill ok">Оплачен</span>'
          : '<span class="pill wait">Ожидает</span>'}</td>
        <td class="actions">${i.status === 'unpaid'
          ? `<button class="btn tiny" data-action="pay" data-id="${i.id}">Оплатить</button>`
          : `<span class="muted small">${new Date(i.paidAt).toLocaleDateString('ru-RU')}</span>`}</td>
      </tr>`;
    }).join('');

    return `
    <div class="page-head">
      <div><h1>Счета</h1><p class="muted">Период ${periodLabel(period())} · ${unpaid} не оплачено</p></div>
      <button class="btn primary" data-action="gen-invoices">Выставить счета</button>
    </div>

    <div class="panel fade">
      ${list.length ? `
      <div class="table-wrap">
        <table class="table">
          <thead><tr>
            <th>№</th><th>Клиент</th><th>Период</th>
            <th class="num">Сумма</th><th>Статус</th><th></th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>` : '<p class="empty">Счетов пока нет</p>'}
    </div>`;
  }

  /* ================= render ================= */
  function render() {
    const app = document.getElementById('app');
    app.innerHTML =
      view === 'overview' ? viewOverview() :
      view === 'clients'  ? viewClients() :
      view === 'tariffs'  ? viewTariffs() :
                            viewInvoices();
    animateCounts();
  }

  function animateCounts() {
    document.querySelectorAll('.stat-value[data-count]').forEach(el => {
      const to = Number(el.dataset.count) || 0;
      const isMoney = el.dataset.fmt === 'money';
      const t0 = performance.now(), dur = 650;
      const step = now => {
        const p = Math.min(1, (now - t0) / dur);
        const v = to * (1 - Math.pow(1 - p, 3));
        el.textContent = isMoney ? money(v) : Math.round(v);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  /* ================= действия ================= */
  function genInvoices() {
    const p = period();
    let created = 0;
    state.clients.forEach(c => {
      if (state.invoices.some(i => i.clientId === c.id && i.period === p)) return;
      state.invoices.push({
        id: state.seq.invoice++, clientId: c.id, period: p,
        amount: price(c.tariffId), status: 'unpaid', paidAt: null
      });
      created++;
    });
    save(); render();
    toast(created ? `Выставлено счетов: ${created}` : 'Все счета уже выставлены');
  }

  function addClient() {
    openModal({
      title: 'Новый клиент',
      html:
        field('ФИО', 'name', 'text', '', 'required') +
        field('Адрес', 'address', 'text', '', 'required') +
        field('Телефон', 'phone', 'text', '', 'required') +
        selectField('Тариф', 'tariffId', state.tariffs.map(t =>
          ({ value: t.id, label: `${t.name} · ${t.price} ₽` }))),
      onSubmit(fd) {
        const name = String(fd.get('name') || '').trim();
        if (!name) return toast('Укажите имя клиента', 'err');
        state.clients.push({
          id: state.seq.client++,
          name,
          address: String(fd.get('address') || '').trim() || '—',
          phone: String(fd.get('phone') || '').trim() || '—',
          tariffId: Number(fd.get('tariffId')),
          balance: 0,
          status: 'active'
        });
        save(); closeModal(); render();
        toast(`Клиент «${name}» добавлен`);
      }
    });
  }

  function recharge(id) {
    const c = clientById(id);
    if (!c) return;
    openModal({
      title: 'Пополнить баланс',
      submit: 'Пополнить',
      html: `<p class="muted" style="margin-bottom:14px">${esc(c.name)} · баланс ${money(c.balance)}</p>` +
            field('Сумма, ₽', 'amount', 'number', '500', 'min="1" step="50" required'),
      onSubmit(fd) {
        const amt = Number(fd.get('amount')) || 0;
        if (amt <= 0) return toast('Введите положительную сумму', 'err');
        c.balance += amt;
        save(); closeModal(); render();
        toast(`Баланс пополнен на ${money(amt)}`);
      }
    });
  }

  function toggleClient(id) {
    const c = clientById(id);
    if (!c) return;
    c.status = c.status === 'active' ? 'blocked' : 'active';
    save(); render();
    toast(c.status === 'active' ? 'Доступ восстановлен' : 'Клиент заблокирован');
  }

  function delClient(id) {
    const c = clientById(id);
    if (!c) return;
    if (!confirm(`Удалить клиента «${c.name}»?`)) return;
    state.clients = state.clients.filter(x => x.id !== id);
    state.invoices = state.invoices.filter(i => i.clientId !== id);
    save(); render();
    toast('Клиент удалён');
  }

  function payInvoice(id) {
    const inv = state.invoices.find(i => i.id === id);
    if (!inv || inv.status === 'paid') return;
    const c = clientById(inv.clientId);
    if (!c) return;
    if (c.balance < inv.amount) {
      toast('Недостаточно средств на балансе', 'err');
      return;
    }
    c.balance -= inv.amount;
    inv.status = 'paid';
    inv.paidAt = new Date().toISOString();
    save(); render();
    toast(`Счёт #${inv.id} оплачен · ${money(inv.amount)}`);
  }

  function addTariff() {
    openModal({
      title: 'Новый тариф',
      html:
        field('Название', 'name', 'text', '', 'required') +
        field('Скорость, Мбит/с', 'speed', 'number', '100', 'min="1" required') +
        field('Цена, ₽/мес', 'price', 'number', '500', 'min="1" required'),
      onSubmit(fd) {
        const name = String(fd.get('name') || '').trim();
        if (!name) return toast('Укажите название', 'err');
        const palette = ['#38bdf8', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9'];
        state.tariffs.push({
          id: state.seq.tariff++,
          name,
          speed: Number(fd.get('speed')) || 100,
          price: Number(fd.get('price')) || 500,
          color: palette[(state.tariffs.length) % palette.length]
        });
        save(); closeModal(); render();
        toast(`Тариф «${name}» создан`);
      }
    });
  }

  /* ================= события ================= */
  const actions = {
    'gen-invoices': genInvoices,
    'add-client': addClient,
    'add-tariff': addTariff,
    'recharge': id => recharge(id),
    'toggle': id => toggleClient(id),
    'del-client': id => delClient(id),
    'pay': id => payInvoice(id)
  };

  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const fn = actions[btn.dataset.action];
    if (fn) fn(Number(btn.dataset.id));
  });

  document.addEventListener('input', e => {
    if (e.target.id !== 'client-search') return;
    query = e.target.value;
    render();
    const el = document.getElementById('client-search');
    if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
  });

  document.getElementById('tabs').addEventListener('click', e => {
    const btn = e.target.closest('button[data-view]');
    if (!btn) return;
    view = btn.dataset.view;
    query = '';
    document.querySelectorAll('.tabs button')
      .forEach(b => b.classList.toggle('active', b === btn));
    render();
  });

  /* ================= старт ================= */
  render();
})();