/* isp_billing_auth.js — вход, регистрация, быстрый вход, выход */
(function (global) {
'use strict';
const NB = global.NB;
const A = NB.auth = {};

/* ============================================================
   ЭКРАН ВХОДА
   ============================================================ */
A.renderLogin = function () {
  document.getElementById('root').innerHTML = `
    <div class="login">
      <div class="login-bg"></div>
      <div class="login-orb o1"></div>
      <div class="login-orb o2"></div>
      <div class="login-orb o3"></div>
      <div class="login-card">
        <div class="login-brand">
          <div class="login-logo">◉</div>
          <h1>NetBill</h1>
          <p>Биллинговая система интернет-провайдера</p>
        </div>
        <div class="login-tabs">
          <button data-login-tab="client" class="active">Абонент</button>
          <button data-login-tab="staff">Сотрудник</button>
        </div>
        <div id="login-panel"></div>
      </div>
    </div>`;
  A._panel('client', 'login');
  document.querySelectorAll('[data-login-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-login-tab]').forEach(b => b.classList.toggle('active', b === btn));
      A._panel(btn.dataset.loginTab, 'login');
    });
  });
};

/* ============================================================
   ПАНЕЛЬ (login / register)
   ============================================================ */
A._panel = function (tab, mode) {
  const panel = document.getElementById('login-panel');
  panel.innerHTML = (tab === 'staff')
    ? (mode === 'register' ? A._staffRegister() : A._staffLogin())
    : (mode === 'register' ? A._clientRegister() : A._clientLogin());

  /* Быстрый вход */
  panel.querySelectorAll('[data-quick]').forEach(b => {
    b.addEventListener('click', () => A._quickLogin(tab, Number(b.dataset.quick)));
  });
  panel.querySelectorAll('[data-quick-del]').forEach(b => {
    b.addEventListener('click', e => {
      e.stopPropagation();
      const list = NB.state.favorites[tab === 'staff' ? 'staff' : 'clients'];
      list.splice(Number(b.dataset.quickDel), 1);
      NB.save();
      A._panel(tab, 'login');
    });
  });
  /* Переключение login/register */
  panel.querySelectorAll('[data-switch]').forEach(b => {
    b.addEventListener('click', e => { e.preventDefault(); A._panel(tab, b.dataset.switch); });
  });
  /* Тариф-плитки */
  panel.querySelectorAll('.tariff-pick').forEach(el => {
    el.addEventListener('click', () => {
      panel.querySelectorAll('.tariff-pick').forEach(x => x.classList.remove('selected'));
      el.classList.add('selected');
      const r = el.querySelector('input[type=radio]');
      if (r) r.checked = true;
    });
  });
  /* Submit */
  const form = panel.querySelector('form');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const fd = new FormData(form);
      if (mode === 'register') A._handleRegister(tab, fd);
      else A._handleLogin(tab, fd);
    });
  }
};

/* ============================================================
   БЛОК БЫСТРОГО ВХОДА
   ============================================================ */
A._quickLogins = function (tab) {
  const list = NB.state.favorites[tab === 'staff' ? 'staff' : 'clients'] || [];
  if (!list.length) return '';
  return `<div class="quick-accounts">
    <h4>Быстрый вход</h4>
    ${list.map((f, i) => `
      <div class="quick-account">
        <button type="button" class="qa-main" data-quick="${i}">
          <div class="qa-ava">${NB.esc(NB.initials(f.name || f.username || '?'))}</div>
          <div class="qa-body">
            <b>${NB.esc(f.name || f.username)}</b>
            <small>${NB.esc(f.phone || f.username)}</small>
          </div>
        </button>
        <button type="button" class="qa-del" data-quick-del="${i}" title="Забыть">×</button>
      </div>`).join('')}
  </div>`;
};

/* ============================================================
   ФОРМЫ — АБОНЕНТ
   ============================================================ */
A._clientLogin = function () {
  return `
    ${A._quickLogins('client')}
    <form class="login-form" id="client-form">
      <label class="field"><span>Телефон</span>
        <input name="phone" type="tel" required placeholder="+7 912 345-67-89" autocomplete="off"></label>
      <label class="field"><span>Пароль</span>
        <input name="p" type="password" required></label>
      <button class="btn primary full" type="submit">Войти</button>
      <p class="toggle-link">Нет аккаунта? <a data-switch="register">Зарегистрироваться</a></p>
    </form>`;
};

A._clientRegister = function () {
  return `
    <form class="login-form" id="reg-form">
      <div class="register-grid">
        <div class="full"><label class="field"><span>Ваше имя</span>
          <input name="name" required placeholder="Иванов Иван"></label></div>
        <div class="full"><label class="field"><span>Телефон</span>
          <input name="phone" type="tel" required placeholder="+7 912 345-67-89"></label></div>
        <div class="full"><label class="field"><span>Адрес</span>
          <input name="address" placeholder="ул. Ленина, 12–45"></label></div>
        <label class="field"><span>Пароль</span>
          <input name="password" type="password" required minlength="1"></label>
        <label class="field"><span>Повторите</span>
          <input name="password2" type="password" required></label>
        <div class="full">
          <span style="display:block;font-size:12.5px;color:var(--muted);margin-bottom:6px">Тариф</span>
          <div class="tariff-picker">
            ${NB.state.tariffs.map((t, i) => `
              <label class="tariff-pick ${i === 1 ? 'selected' : ''}">
                <input type="radio" name="tariff" value="${t.id}" ${i === 1 ? 'checked' : ''}>
                <h4>${NB.esc(t.name)}</h4>
                <p>${t.speed} Мбит/с</p>
                <div class="price">${NB.money(t.price)}/мес</div>
              </label>`).join('')}
          </div>
        </div>
      </div>
      <button class="btn primary full" type="submit" style="margin-top:16px">Зарегистрироваться</button>
      <p class="toggle-link">Уже есть аккаунт? <a data-switch="login">Войти</a></p>
    </form>`;
};

/* ============================================================
   ФОРМЫ — СОТРУДНИК
   ============================================================ */
A._staffLogin = function () {
  return `
    ${A._quickLogins('staff')}
    <form class="login-form" id="staff-form">
      <label class="field"><span>Логин</span>
        <input name="u" value="admin" required autocomplete="off"></label>
      <label class="field"><span>Пароль</span>
        <input name="p" type="password" value="admin" required></label>
      <button class="btn primary full" type="submit">Войти как сотрудник</button>
      <p class="hint">Демо: <b>admin</b> / <b>admin</b></p>
      <p class="toggle-link">Нет аккаунта? <a data-switch="register">Создать</a></p>
    </form>`;
};

A._staffRegister = function () {
  return `
    <form class="login-form" id="reg-form">
      <label class="field"><span>Логин</span>
        <input name="username" required autocomplete="off" placeholder="ivanov"></label>
      <label class="field"><span>Отображаемое имя</span>
        <input name="name" placeholder="Иван Иванов (опционально)"></label>
      <label class="field"><span>Пароль</span>
        <input name="password" type="password" required></label>
      <label class="field"><span>Повторите</span>
        <input name="password2" type="password" required></label>
      <button class="btn primary full" type="submit">Создать аккаунт</button>
      <p class="toggle-link">Уже есть? <a data-switch="login">Войти</a></p>
    </form>`;
};

/* ============================================================
   ЛОГИН
   ============================================================ */
A._handleLogin = function (tab, fd) {
  if (tab === 'staff') {
    const username = String(fd.get('u') || '').trim();
    const password = String(fd.get('p') || '');
    const acc = NB.state.staffAccounts.find(a => a.username === username && a.password === password);
    if (!acc) return NB.toast('Неверный логин или пароль', 'err');
    NB.state.session = { role: 'staff', username: acc.username, displayName: acc.name || acc.username };
    NB.save();
    NB.addActivity(`Сотрудник ${acc.username} вошёл`, 'sys');
    NB.ui.view = 'dashboard';
    NB.render();
    if (!NB.state.onboarded.staff) {
      setTimeout(() => NB.game.startTour('staff'), 400);
    }
    return;
  }

  const phone = String(fd.get('phone') || '').trim();
  const password = String(fd.get('p') || '');
  const c = NB.state.clients.find(x => x.phone === phone);
  if (!c || c.password !== password) return NB.toast('Неверный телефон или пароль', 'err');
  if (c.status === 'blocked') return NB.toast('Аккаунт заблокирован', 'err');
  NB.state.session = { role: 'client', id: c.id };
  NB.save();
  NB.ui.view = 'dashboard';
  NB.render();
  if (!NB.state.onboarded.clients.includes(c.id)) {
    setTimeout(() => NB.game.startTour('client'), 400);
  }
};

/* ============================================================
   РЕГИСТРАЦИЯ
   ============================================================ */
A._handleRegister = function (tab, fd) {
  const pw = String(fd.get('password') || '');
  const pw2 = String(fd.get('password2') || '');
  if (!pw) return NB.toast('Введите пароль', 'err');
  if (pw !== pw2) return NB.toast('Пароли не совпадают', 'err');

  if (tab === 'client') {
    const name = String(fd.get('name') || '').trim();
    const phone = String(fd.get('phone') || '').trim();
    const address = String(fd.get('address') || '').trim() || NB.genAddress();
    const tariffId = Number(fd.get('tariff'));
    if (!name || !phone) return NB.toast('Заполните обязательные поля', 'err');
    if (NB.state.clients.some(c => c.phone === phone)) return NB.toast('Телефон уже зарегистрирован', 'err');

    const nc = {
      id: NB.state.seq.client++, name, phone, address, tariffId,
      balance: 1000, status: 'active',
      createdAt: new Date().toISOString(),
      password: pw,
      isDrone: false
    };
    NB.state.clients.push(nc);
    NB.state.invoices.push({
      id: NB.state.seq.invoice++, clientId: nc.id, period: NB.period(),
      amount: NB.price(tariffId), status: 'unpaid', paidAt: null
    });
    NB.state.favorites.clients.push({ phone, password: pw, name });
    NB.state.session = { role: 'client', id: nc.id };
    NB.save();
    NB.addActivity(`Зарегистрирован клиент «${name}»`, 'sys');
    NB.ui.view = 'dashboard';
    NB.render();
    setTimeout(() => NB.game.startTour('client'), 400);
    return;
  }

  /* Сотрудник */
  const username = String(fd.get('username') || '').trim();
  const name = String(fd.get('name') || '').trim() || username;
  if (!username) return NB.toast('Введите логин', 'err');
  if (NB.state.staffAccounts.some(a => a.username === username)) return NB.toast('Логин занят', 'err');
  NB.state.staffAccounts.push({ username, password: pw, name });
  NB.state.favorites.staff.push({ username, password: pw, name });
  NB.state.session = { role: 'staff', username, displayName: name };
  NB.save();
  NB.addActivity(`Зарегистрирован сотрудник «${username}»`, 'sys');
  NB.ui.view = 'dashboard';
  NB.render();
  setTimeout(() => NB.game.startTour('staff'), 400);
};

/* ============================================================
   БЫСТРЫЙ ВХОД
   ============================================================ */
A._quickLogin = function (tab, idx) {
  const list = NB.state.favorites[tab === 'staff' ? 'staff' : 'clients'];
  const f = list[idx];
  if (!f) return;
  if (tab === 'staff') {
    const acc = NB.state.staffAccounts.find(a => a.username === f.username);
    if (!acc) return NB.toast('Аккаунт не найден', 'err');
    NB.state.session = { role: 'staff', username: acc.username, displayName: acc.name || acc.username };
  } else {
    const c = NB.state.clients.find(x => x.phone === f.phone);
    if (!c) return NB.toast('Аккаунт не найден', 'err');
    if (c.status === 'blocked') return NB.toast('Аккаунт заблокирован', 'err');
    NB.state.session = { role: 'client', id: c.id };
  }
  NB.save();
  NB.ui.view = 'dashboard';
  NB.render();
};

/* ============================================================
   ВЫХОД
   ============================================================ */
A.logout = function () {
  NB.state.session = null;
  NB.save();
  if (NB.sim && NB.sim.stop) NB.sim.stop();
  NB.ui.view = 'dashboard';
  NB.render();
};

})(window);