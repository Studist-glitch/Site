/* isp_billing_employees.js — сотрудники с пассивными бонусами */
(function (global) {
'use strict';
const NB = global.NB;
const E = NB.employees = NB.employees || {};

/* ============================================================
   СПЕЦИАЛИЗАЦИИ С ПАССИВНЫМИ ЭФФЕКТАМИ
   ============================================================ */
const SPECS = {
  support:  {
    label: 'Поддержка', color: '#ffb347',
    skills: ['chat', 'empathy'],
    baseSalary: 120, baseAp: 2,
    hireCost: 8000,
    passive: 'Меньше оттока (−8% за уровень), выше шанс автоплатежа'
  },
  tech: {
    label: 'Техник', color: '#38bdf8',
    skills: ['repair', 'diagnose'],
    baseSalary: 150, baseAp: 2,
    hireCost: 10000,
    passive: 'Автопочинка сломанного оборудования (8% за уровень)'
  },
  security: {
    label: 'Безопасник', color: '#f87171',
    skills: ['hack', 'protect'],
    baseSalary: 180, baseAp: 2,
    hireCost: 14000,
    passive: 'Меньше шанс взлома (−2% за уровень), +защита от аномалий'
  },
  sales: {
    label: 'Менеджер', color: '#4ade80',
    skills: ['negotiate', 'pitch'],
    baseSalary: 130, baseAp: 2,
    hireCost: 11000,
    passive: 'Больше новых клиентов (+0.5/день за уровень)'
  },
  ops: {
    label: 'Оператор', color: '#c084fc',
    skills: ['organize', 'multitask'],
    baseSalary: 100, baseAp: 3,
    hireCost: 9000,
    passive: '+1 AP max каждые 2 уровня'
  }
};

const NAMES = [
  { name: 'Анна Соколова',    bio: 'Бывший инженер из крупного ISP. Уволилась из-за конфликта с начальством.' },
  { name: 'Михаил Ветров',    bio: 'Увлекается пентестом. Слегка параноидален, но знает своё дело.' },
  { name: 'Дарья Лебедева',   bio: 'Молодая, но очень толковая. Работает быстро, но берёт дорого.' },
  { name: 'Сергей Громов',    bio: 'В прошлом — военный связист. Дисциплинирован, неразговорчив.' },
  { name: 'Кирилл Зайцев',    bio: 'Специалист по клиентам. Умеет успокоить даже самого злого абонента.' },
  { name: 'Елена Морозова',   bio: 'Мать двоих детей, работала в поддержке 10 лет. Терпеливая.' },
  { name: 'Артём Новиков',    bio: 'Бывший хакер, решил завязать. Взял на поруки после инцидента с DDoS.' },
  { name: 'Вера Кузнецова',   bio: 'Аналитик. Находит проблемы до того, как они случаются.' },
  { name: 'Олег Орлов',       bio: 'Старый знакомый по прошлой компании. Любит пиво и свою работу.' },
  { name: 'Полина Павлова',   bio: 'Талантливый переговорщик. Ведёт сложных клиентов играючи.' },
  { name: 'Игорь Белов',      bio: 'Инженер-самоучка. Собрал свою первую сеть в 16 лет.' },
  { name: 'Мария Захарова',   bio: 'Бывший менеджер. Умеет продать что угодно кому угодно.' }
];

const SPEC_KEYS = Object.keys(SPECS);

E.generateEmployee = function (level) {
  const spec = NB.pick(SPEC_KEYS);
  const specData = SPECS[spec];
  const nameData = NB.pick(NAMES);
  const lvl = level || 1;
  const salary = Math.round(specData.baseSalary * (1 + (lvl - 1) * 0.35));
  const apMax = specData.baseAp + Math.floor((lvl - 1) / 2);
  return {
    id: NB.state.seq.emp++,
    name: nameData.name,
    bio: nameData.bio,
    spec: spec,
    specLabel: specData.label,
    specColor: specData.color,
    passive: specData.passive,
    level: lvl,
    xp: 0,
    xpNext: 50 + lvl * 40,
    ap: { current: apMax, max: apMax },
    salary: salary,
    hireCost: Math.round(specData.hireCost * (1 + (lvl - 1) * 0.5)),
    skills: specData.skills.slice()
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
  return emp.hireCost || (5000 * emp.level);
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
  NB.addLog(`Нанят сотрудник: ${pool.name} (${pool.specLabel})`, 'success');
  NB.addCompanyXp(20);
  /* Обновляем AP max */
  if (NB.daily && NB.daily.processEmployeePassives) NB.daily.processEmployeePassives();
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
  if (NB.daily && NB.daily.processEmployeePassives) NB.daily.processEmployeePassives();
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
    emp.salary = Math.round(SPECS[emp.spec].baseSalary * (1 + (emp.level - 1) * 0.35));
    emp.hireCost = Math.round(SPECS[emp.spec].hireCost * (1 + (emp.level - 1) * 0.5));
    NB.notify(`⬆ ${emp.name} достиг ур.${emp.level}`, 'ok');
    NB.addLog(`${emp.name} повысил уровень до ${emp.level}`, 'success');
  }
  NB.save();
};

E.hasSkill = function (empId, skill) {
  const emp = NB.state.game.employees.find(e => e.id === empId);
  if (!emp) return false;
  return emp.skills.includes(skill);
};

E.available = function (spec) {
  return NB.state.game.employees.filter(e => e.ap.current > 0 && (!spec || e.spec === spec));
};

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
  const totalSalary = hired.reduce((s, e) => s + e.salary, 0);

  /* Сводка бонусов */
  const bonuses = NB.daily && NB.daily.getEmployeeBonuses ? NB.daily.getEmployeeBonuses() : { support:0, tech:0, security:0, sales:0, ops:0 };
  const bonusSummary = hired.length > 0 ? `
    <div class="panel" style="margin-bottom:16px;border-left:3px solid var(--primary)">
      <div class="panel-head"><h2>📊 Активные бонусы</h2></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px">
        ${bonuses.support > 0 ? `<div style="padding:8px 12px;background:rgba(255,179,71,.08);border-radius:8px;font-size:12.5px"><b style="color:#ffb347">Support ${bonuses.support}</b><br><span style="color:var(--muted)">−${bonuses.support * 8}% оттока</span></div>` : ''}
        ${bonuses.tech > 0 ? `<div style="padding:8px 12px;background:rgba(56,189,248,.08);border-radius:8px;font-size:12.5px"><b style="color:#38bdf8">Tech ${bonuses.tech}</b><br><span style="color:var(--muted)">${bonuses.tech * 8}% автопочинка</span></div>` : ''}
        ${bonuses.security > 0 ? `<div style="padding:8px 12px;background:rgba(248,113,113,.08);border-radius:8px;font-size:12.5px"><b style="color:#f87171">Security ${bonuses.security}</b><br><span style="color:var(--muted)">−${bonuses.security * 2}% взлом</span></div>` : ''}
        ${bonuses.sales > 0 ? `<div style="padding:8px 12px;background:rgba(74,222,128,.08);border-radius:8px;font-size:12.5px"><b style="color:#4ade80">Sales ${bonuses.sales}</b><br><span style="color:var(--muted)">+${(bonuses.sales * 0.5).toFixed(1)} клиентов/день</span></div>` : ''}
        ${bonuses.ops > 0 ? `<div style="padding:8px 12px;background:rgba(192,132,252,.08);border-radius:8px;font-size:12.5px"><b style="color:#c084fc">Ops ${bonuses.ops}</b><br><span style="color:var(--muted)">+${Math.floor(bonuses.ops / 2)} AP max</span></div>` : ''}
        ${hired.length === 0 ? '<p class="muted small">Наймите сотрудников для пассивных бонусов</p>' : ''}
      </div>
    </div>` : '';

  return `
    <div class="page-head">
      <div><h1>Сотрудники</h1>
        <p class="muted">${hired.length} в штате · ${NB.money(totalSalary)}/день на зарплаты</p>
      </div>
      <button class="btn primary" data-action="refresh-employees-pool">🔄 Обновить пул (${NB.money(500)})</button>
    </div>
    ${bonusSummary}
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
        <small>Уровень ${e.level} · ${e.specLabel}</small>
      </div>
    </div>
    <div class="emp-bio">${NB.esc(e.bio)}</div>
    <div style="font-size:11.5px;color:var(--muted);padding:8px 10px;background:var(--surface-3);border-radius:8px;margin-bottom:10px;line-height:1.4">
      <b style="color:${e.specColor};display:block;margin-bottom:3px">⚡ Пассивный эффект</b>
      ${NB.esc(e.passive)}
    </div>
    <div class="emp-stats">
      <div class="emp-stat">
        <b>${e.ap.max}</b>AP
        <div class="emp-ap">${Array.from({length: e.ap.max}).map((_, i) => `<i class="${i < e.ap.current ? 'filled' : ''}"></i>`).join('')}</div>
      </div>
      <div class="emp-stat">
        <b>${e.salary}</b>₽/день
      </div>
    </div>
    <div class="emp-level-bar"><i style="width:${(e.xp / e.xpNext) * 100}%"></i></div>
    <div class="emp-foot">
      ${hired
        ? `<span class="emp-salary">Навыки: ${e.skills.join(', ')}</span>
           <button class="btn ghost small" data-action="fire-employee" data-id="${e.id}" style="color:var(--danger)">Уволить</button>`
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