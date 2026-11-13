/* isp_billing_employees.js — сотрудники */
(function (global) {
'use strict';
const NB = global.NB;
const E = NB.employees = NB.employees || {};

const SPECS = {
  support:  { label: 'Поддержка',  color: '#ffb347', skills: ['chat', 'empathy'],           baseSalary: 80, baseAp: 2 },
  tech:     { label: 'Техник',     color: '#38bdf8', skills: ['repair', 'diagnose'],         baseSalary: 100, baseAp: 2 },
  security: { label: 'Безопасник', color: '#f87171', skills: ['hack', 'protect'],            baseSalary: 120, baseAp: 2 },
  sales:    { label: 'Менеджер',   color: '#4ade80', skills: ['negotiate', 'pitch'],         baseSalary: 90, baseAp: 2 },
  ops:      { label: 'Оператор',   color: '#c084fc', skills: ['organize', 'multitask'],      baseSalary: 70, baseAp: 3 }
};

const NAMES = [
  { name: 'Анна Соколова',    bio: 'Бывший инженер из крупного ISP. Уволилась из-за конфликта с начальством.' },
  { name: 'Михаил Ветров',    bio: 'Увлекается пентестом. Слегка параноидален, но знает своё дело.' },
  { name: 'Дарья Лебедева',   bio: 'Молодая, но очень толковая. Работает быстро, но берёт дорого.' },
  { name: 'Сергей Громов',    bio: 'В прошлой жизни — военный связист. Дисциплинирован, неразговорчив.' },
  { name: 'Кирилл Зайцев',    bio: 'Специалист по клиентам. Умеет успокоить даже самого злого абонента.' },
  { name: 'Елена Морозова',   bio: 'Мать двоих детей, работала в поддержке 10 лет. Терпеливая.' },
  { name: 'Артём Новиков',    bio: 'Бывший хакер, решил завязать. Взял на поруки после инцидента с DDoS.' },
  { name: 'Вера Кузнецова',   bio: 'Аналитик. Находит проблемы до того, как они случаются.' },
  { name: 'Олег Орлов',       bio: 'Старый знакомый по прошлой компании. Любит пиво и свою работу.' },
  { name: 'Полина Павлова',   bio: 'Талантливый переговорщик. Ведёт сложных клиентов играючи.' }
];

const SPEC_KEYS = Object.keys(SPECS);

E.generateEmployee = function (level) {
  const spec = NB.pick(SPEC_KEYS);
  const specData = SPECS[spec];
  const nameData = NB.pick(NAMES);
  const lvl = level || 1;
  const salary = Math.round(specData.baseSalary * (1 + (lvl - 1) * 0.4));
  const apMax = specData.baseAp + Math.floor((lvl - 1) / 2);
  const skills = specData.skills.slice();
  return {
    id: NB.state.seq.emp++,
    name: nameData.name,
    bio: nameData.bio,
    spec: spec,
    specLabel: specData.label,
    specColor: specData.color,
    level: lvl,
    xp: 0,
    xpNext: 50 + lvl * 30,
    ap: { current: apMax, max: apMax },
    salary: salary,
    skills: skills
  };
};

E.generatePool = function (count) {
  const pool = [];
  for (let i = 0; i < count; i++) {
    pool.push(E.generateEmployee(1));
  }
  return pool;
};

E.hireCost = function (emp) {
  return 5000 * emp.level;
};

E.hire = function (empId) {
  const g = NB.state.game;
  const pool = g.employeesPool.find(e => e.id === empId);
  if (!pool) return;
  const cost = E.hireCost(pool);
  if (g.cash < cost) return NB.toast('Недостаточно средств', 'err');
  g.cash -= cost;
  g.employeesPool = g.employeesPool.filter(e => e.id !== empId);
  g.employees.push(pool);
  NB.notify(`Нанят: ${pool.name}`, 'ok');
  NB.addLog(`Нанят сотрудник: ${pool.name}`, 'success');
  NB.addCompanyXp(20);
  NB.save();
  NB.render();
};

E.fire = function (empId) {
  const g = NB.state.game;
  const emp = g.employees.find(e => e.id === empId);
  if (!emp) return;
  if (!confirm(`Уволить ${emp.name}?`)) return;
  g.employees = g.employees.filter(e => e.id !== empId);
  NB.notify(`Уволен: ${emp.name}`, 'warn');
  NB.addLog(`Уволен: ${emp.name}`, 'warn');
  NB.save();
  NB.render();
};

E.levelUp = function (empId) {
  const emp = NB.state.game.employees.find(e => e.id === empId);
  if (!emp) return;
  emp.xp += 10;
  if (emp.xp >= emp.xpNext) {
    emp.xp -= emp.xpNext;
    emp.level++;
    emp.xpNext = Math.round(emp.xpNext * 1.4);
    emp.ap.max = SPECS[emp.spec].baseAp + Math.floor((emp.level - 1) / 2);
    emp.salary = Math.round(SPECS[emp.spec].baseSalary * (1 + (emp.level - 1) * 0.4));
    NB.notify(`${emp.name} повысил уровень до ${emp.level}`, 'ok');
  }
  NB.save();
};

/* Проверка навыка */
E.hasSkill = function (empId, skill) {
  const emp = NB.state.game.employees.find(e => e.id === empId);
  if (!emp) return false;
  return emp.skills.includes(skill);
};

E.available = function (spec) {
  return NB.state.game.employees.filter(e => e.ap.current > 0 && (!spec || e.spec === spec));
};

/* Найти лучшего для задачи */
E.bestFor = function (skill) {
  const avail = NB.state.game.employees.filter(e => e.ap.current > 0 && e.skills.includes(skill));
  if (avail.length === 0) return null;
  return avail.sort((a, b) => b.level - a.level)[0];
};

E.spendAp = function (empId, cost) {
  const emp = NB.state.game.employees.find(e => e.id === empId);
  if (!emp || emp.ap.current < cost) return false;
  emp.ap.current -= cost;
  NB.save();
  return true;
};

/* ============================================================
   РЕНДЕР
   ============================================================ */
E.renderView = function () {
  const g = NB.state.game;
  const hired = g.employees;
  const pool = g.employeesPool;
  return `
    <div class="page-head">
      <div><h1>Сотрудники</h1>
        <p class="muted">${hired.length} в штате · ${NB.money(hired.reduce((s, e) => s + e.salary, 0))}/день на зарплаты</p>
      </div>
      <button class="btn primary" data-action="refresh-employees-pool">🔄 Обновить пул (500 ₽)</button>
    </div>
    <h2 style="font-size:15px;margin:20px 0 12px;color:#fff">В штате</h2>
    ${hired.length ? `<div class="employees-grid">
      ${hired.map(e => E.renderCard(e, true)).join('')}
    </div>` : '<p class="empty">Нет сотрудников. Наймите кого-нибудь ниже.</p>'}
    <h2 style="font-size:15px;margin:28px 0 12px;color:#fff">Доступны для найма</h2>
    ${pool.length ? `<div class="employees-grid">
      ${pool.map(e => E.renderCard(e, false)).join('')}
    </div>` : '<p class="empty">Пул пуст. Обновите за 500 ₽.</p>'}
  `;
};

E.renderCard = function (e, hired) {
  const hireCost = E.hireCost(e);
  const canHire = NB.state.game.cash >= hireCost;
  return `<div class="emp-card ${hired ? 'hired' : ''}">
    <div class="emp-head">
      <div class="emp-avatar">${NB.initials(e.name)}</div>
      <div class="emp-info">
        <h3>${NB.esc(e.name)}</h3>
        <small>Уровень ${e.level}</small>
        <span class="emp-spec ${e.spec}">${e.specLabel}</span>
      </div>
    </div>
    <div class="emp-bio">${NB.esc(e.bio)}</div>
    <div class="emp-stats">
      <div class="emp-stat">
        <b>${e.ap.max}</b>
        AP
        <div class="emp-ap">${Array.from({length: e.ap.max}).map((_, i) => `<i class="${i < e.ap.current ? 'filled' : ''}"></i>`).join('')}</div>
      </div>
      <div class="emp-stat">
        <b>${e.salary}</b>
        ₽/день
      </div>
    </div>
    <div class="emp-level-bar"><i style="width:${(e.xp / e.xpNext) * 100}%"></i></div>
    <div class="emp-foot">
      ${hired
        ? `<span class="emp-salary">Навыки: ${e.skills.join(', ')}</span>
           <div style="display:flex;gap:6px">
             <button class="btn ghost small" data-action="fire-employee" data-id="${e.id}" style="color:var(--danger)">Уволить</button>
           </div>`
        : `<span class="emp-salary">Найм: <b>${NB.money(hireCost)}</b></span>
           <button class="btn ${canHire ? 'primary' : 'ghost'} small" data-action="hire-employee" data-id="${e.id}" ${canHire ? '' : 'disabled'}>Нанять</button>`}
    </div>
  </div>`;
};

E.refreshPool = function () {
  const g = NB.state.game;
  if (g.cash < 500) return NB.toast('Нужно 500 ₽', 'err');
  g.cash -= 500;
  g.employeesPool = E.generatePool(4);
  NB.save(); NB.render();
};

})(window);