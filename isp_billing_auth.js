/* isp_billing_auth.js — вход/выход */
(function (global) {
'use strict';
const NB = global.NB;
const A = NB.auth = {};

A.renderLogin = function () {
  const root = document.getElementById('root');
  root.innerHTML = `
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
  A._panel('client');
  document.querySelectorAll('[data-login-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-login-tab]').forEach(b => b.classList.toggle('active', b === btn));
      A._panel(btn.dataset.loginTab);
    });
  });
};

A._panel = function (tab) {
  const panel = document.getElementById('login-panel');
  if (tab === 'staff') {
    panel.innerHTML = `
      <form class="login-form" id="staff-form">
        <label class="field"><span>Логин сотрудника</span>
          <input name="u" value="admin" required autocomplete="off"></label>
        <label class="field"><span>Пароль</span>
          <input name="p" type="password" value="admin" required></label>
        <button class="btn primary full" type="submit">Войти как сотрудник</button>
        <p class="hint">Демо-доступ: <b>admin</b> / <b>admin</b></p>
      </form>`;
    document.getElementById('staff-form').addEventListener('submit', e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      if (fd.get('u') === NB.STAFF_CREDS.u && fd.get('p') === NB.STAFF_CREDS.p) {
        NB.state.session = { role: 'staff' }; NB.save();
        NB.addActivity('Сотрудник вошёл в систему', 'sys');
        NB.ui.view = 'dashboard'; NB.render();
      } else NB.toast('Неверный логин или пароль', 'err');
    });
    return;
  }
  const opts = NB.state.clients.map(c =>
    `<option value="${NB.esc(c.phone)}">${NB.esc(c.name)} · ${NB.esc(c.phone)}</option>`).join('');
  panel.innerHTML = `
    <form class="login-form" id="client-form">
      <label class="field"><span>Телефон абонента</span><select name="phone" required>${opts}</select></label>
      <label class="field"><span>Пароль</span>
        <input name="p" type="password" value="1234" required></label>
      <button class="btn primary full" type="submit">Войти как абонент</button>
      <p class="hint">Демо-пароль для всех абонентов: <b>1234</b></p>
    </form>`;
  document.getElementById('client-form').addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const c = NB.state.clients.find(x => x.phone === fd.get('phone'));
    if (!c || c.password !== fd.get('p')) return NB.toast('Неверный телефон или пароль', 'err');
    if (c.status === 'blocked') return NB.toast('Аккаунт заблокирован', 'err');
    NB.state.session = { role: 'client', id: c.id }; NB.save();
    NB.ui.view = 'dashboard'; NB.render();
  });
};

A.logout = function () {
  NB.state.session = null; NB.save();
  NB.ui.view = 'dashboard'; NB.render();
};

})(window);