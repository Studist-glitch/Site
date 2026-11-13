/* isp_billing_employees.js — прокачка, деревья навыков, воины, развёртывание */
(function (global) {
'use strict';
const NB = global.NB;
const E = NB.employees = NB.employees || {};

/* ============================================================
   СПЕЦИАЛИЗАЦИИ + ДЕРЕВЬЯ НАВЫКОВ
   ============================================================ */
const SPECS = {
  support: {
    label:'Поддержка', color:'#ffb347', icon:'💬',
    baseSkills:['chat','empathy'],
    skillTree:{ 2:['patience'], 4:['multitask'], 6:['salesPitch'], 8:['leadership'] },
    baseSalary:120, baseAp:2, hireCost:8000,
    passive:'Меньше оттока, выше шанс автоплатежа'
  },
  tech: {
    label:'Техник', color:'#38bdf8', icon:'🔧',
    baseSkills:['repair','diagnose'],
    skillTree:{ 2:['hardware'], 4:['network'], 6:['hacking'], 8:['architect'] },
    baseSalary:150, baseAp:2, hireCost:10000,
    passive:'Автопочинка оборудования'
  },
  security: {
    label:'Безопасник', color:'#f87171', icon:'🛡',
    baseSkills:['hack','protect'],
    skillTree:{ 2:['counterHack'], 4:['forensics'], 6:['honeyPot'], 8:['cyberCommand'] },
    baseSalary:180, baseAp:2, hireCost:14000,
    passive:'Защита от взломов'
  },
  sales: {
    label:'Менеджер', color:'#4ade80', icon:'📈',
    baseSkills:['negotiate','pitch'],
    skillTree:{ 2:['upsell'], 4:['business'], 6:['enterprise'], 8:['monopoly'] },
    baseSalary:130, baseAp:2, hireCost:11000,
    passive:'Больше новых клиентов'
  },
  ops: {
    label:'Оператор', color:'#c084fc', icon:'⚙',
    baseSkills:['organize','multitask'],
    skillTree:{ 2:['logistics'], 4:['command'], 6:['tactics'], 8:['strategist'] },
    baseSalary:100, baseAp:3, hireCost:9000,
    passive:'Больше AP'
  },
  warrior: {
    label:'Воин', color:'#ef4444', icon:'⚔',
    baseSkills:['combat','raid'],
    skillTree:{ 2:['marksman'], 4:['breach'], 6:['squadLeader'], 8:['veteran'] },
    baseSalary:200, baseAp:2, hireCost:16000,
    passive:'Защита бункера, успех вылазок'
  }
};

const SKILL_LABELS = {
  chat:'Чат', empathy:'Эмпатия', patience:'Терпение', multitask:'Многозадачность',
  salesPitch:'Продажи', leadership:'Лидерство',
  repair:'Ремонт', diagnose:'Диагностика', hardware:'Железо', network:'Сети',
  hacking:'Хакинг', architect:'Архитектура',
  hack:'Взлом', protect:'Защита', counterHack:'Контр-взлом', forensics:'Форензика',
  honeyPot:'Ханипот', cyberCommand:'Кибер-командование',
  negotiate:'Переговоры', pitch:'Питч', upsell:'Апсейл', business:'Бизнес',
  enterprise:'Энтерпрайз', monopoly:'Монополия',
  organize:'Организация', logistics:'Логистика', command:'Командование',
  tactics:'Тактика', strategist:'Стратегия',
  combat:'Бой', raid:'Рейды', marksman:'Стрельба', breach:'Взлом дверей',
  squadLeader:'Командир отряда', veteran:'Ветеран'
};
E.skillLabel = s => SKILL_LABELS[s] || s;
E.specInfo = spec => SPECS[spec] || SPECS.support;

/* ============================================================
   ИМЕНА И БИО
   ============================================================ */
const NAMES = {
  support: [
    { name:'Анна Соколова', bio:'Бывший инженер из крупного ISP. Уволилась из-за конфликта с начальством.' },
    { name:'Елена Морозова', bio:'Мать двоих детей, работала в поддержке 10 лет. Терпеливая.' },
    { name:'Кирилл Зайцев', bio:'Умеет успокоить даже самого злого абонента.' }
  ],
  tech: [
    { name:'Михаил Ветров', bio:'Увлекается пентестом. Слегка параноидален.' },
    { name:'Игорь Белов', bio:'Инженер-самоучка. Собрал свою первую сеть в 16 лет.' },
    { name:'Дарья Лебедева', bio:'Молодая, но очень толковая.' }
  ],
  security: [
    { name:'Артём Новиков', bio:'Бывший хакер, решил завязать. Взял на поруки.' },
    { name:'Вера Кузнецова', bio:'Аналитик. Находит проблемы до того, как они случаются.' }
  ],
  sales: [
    { name:'Полина Павлова', bio:'Талантливый переговорщик.' },
    { name:'Мария Захарова', bio:'Бывший менеджер. Умеет продать что угодно.' }
  ],
  ops: [
    { name:'Сергей Громов', bio:'В прошлом — военный связист. Дисциплинирован.' },
    { name:'Олег Орлов', bio:'Старый знакомый. Любит пиво и свою работу.' }
  ],
  warrior: [
    { name:'Иван Стальной', bio:'Ветеран ЧВК. Молчаливый, надёжный.' },
    { name:'Марат Волков', bio:'Бывший спецназовец. Умеет работать в команде.' },
    { name:'Соня Ковалёва', bio:'Снайпер. Холодная голова, точный глаз.' },
    { name:'Дима Щит', bio:'Тяжёлый пехотинец. Прикрывает отряд.' }
  ]
};

/* ============================================================
   ГЕНЕРАЦИЯ
   ============================================================ */
E.generateEmployee = function (level, forceSpec) {
  const specKey = forceSpec || NB.pick(Object.keys(SPECS));
  const spec = SPECS[specKey];
  const nameData = NB.pick(NAMES[specKey] || NAMES.support);
  const lvl = level || 1;
  const salary = Math.round(spec.baseSalary * (1 + (lvl - 1) * 0.35));
  const apMax = spec.baseAp + Math.floor((lvl - 1) / 2);
  const skills = [...spec.baseSkills];
  /* Применить навыки за предыдущие уровни */
  Object.keys(spec.skillTree).forEach(req => {
    if (lvl >= Number(req)) skills.push(...spec.skillTree[req]);
  });
  const combat = specKey === 'warrior' ? {
    attack: 5 + lvl * 3 + (skills.includes('marksman') ? 5 : 0) + (skills.includes('breach') ? 5 : 0),
    defense: 4 + lvl * 2 + (skills.includes('squadLeader') ? 4 : 0) + (skills.includes('veteran') ? 6 : 0)
  } : { attack: 0, defense: 0 };

  return {
    id: NB.state.seq.emp++,
    name: nameData.name,
    bio: nameData.bio,
    spec: specKey,
    specLabel: spec.label,
    specColor: spec.color,
    specIcon: spec.icon,
    passive: spec.passive,
    level: lvl,
    xp: 0, xpNext: 50 + lvl * 40,
    ap: { current: apMax, max: apMax },
    salary,
    hireCost: Math.round(spec.hireCost * (1 + (lvl - 1) * 0.5)),
    skills,
    combat
  };
};

E.generatePool = function (count) {
  const pool = [];
  for (let i = 0; i < count; i++) pool.push(E.generateEmployee(1));
  return pool;
};

E.hireCost = emp => emp.hireCost || (5000 * emp.level);

/* ============================================================
   НАЙМ / УВОЛЬНЕНИЕ
   ============================================================ */
E.hire = function (empId) {
  const g = NB.state.game;
  const pool = g.employeesPool.find(e => e.id === empId);
  if (!pool) return;
  const cost = E.hireCost(pool);
  if (g.cash < cost) return NB.toast('Недостаточно средств', 'err');
  /* Лимит воинов — по апгрейду soldier */
  if (pool.spec === 'warrior') {
    const cap = (g.upgrades.soldier || 0) * 10;
    const current = g.employees.filter(e => e.spec === 'warrior').length;
    if (current >= cap) return NB.toast(`Лимит воинов: ${cap}. Улучшите «Добровольцев».`, 'err');
    if (!g.upgrades.barracks) return NB.toast('Нужны казармы', 'err');
  }
  g.cash -= cost;
  g.employeesPool = g.employeesPool.filter(e => e.id !== empId);
  g.employees.push(pool);
  NB.notify(`Нанят: ${pool.name}`, 'ok');
  NB.addLog(`Нанят: ${pool.name} (${pool.specLabel})`, 'success');
  NB.addCompanyXp(20);
  if (NB.daily?.processEmployeePassives) NB.daily.processEmployeePassives();
  NB.save(); NB.render();
};

E.fire = function (empId) {
  const g = NB.state.game;
  const emp = g.employees.find(e => e.id === empId);
  if (!emp) return;
  if (!confirm(`Уволить ${emp.name}?`)) return;
  g.employees = g.employees.filter(e => e.id !== empId);
  NB.notify(`Уволен: ${emp.name}`, 'warn');
  NB.addLog(`Уволен: ${emp.name}`, 'warn');
  if (NB.daily?.processEmployeePassives) NB.daily.processEmployeePassives();
  NB.save(); NB.render();
};

/* ============================================================
   ПРОКАЧКА
   ============================================================ */
E.upgradeCost = function (emp) {
  return Math.round(emp.salary * 12 * (1 + emp.level * 0.25));
};

E.upgrade = function (empId, free) {
  const g = NB.state.game;
  const emp = g.employees.find(e => e.id === empId);
  if (!emp) return false;
  const cost = E.upgradeCost(emp);
  if (!free && g.cash < cost) { NB.toast(`Нужно ${NB.money(cost)}`, 'err'); return false; }
  if (!free) g.cash -= cost;
  emp.level++;
  emp.xp = 0;
  emp.xpNext = Math.round(emp.xpNext * 1.4);
  const spec = SPECS[emp.spec];
  emp.salary = Math.round(spec.baseSalary * (1 + (emp.level - 1) * 0.35));
  emp.ap.max = spec.baseAp + Math.floor((emp.level - 1) / 2);
  emp.ap.current = emp.ap.max;
  /* Новые навыки за уровень */
  const newSkills = spec.skillTree[emp.level];
  const gained = [];
  if (newSkills) {
    newSkills.forEach(s => { if (!emp.skills.includes(s)) { emp.skills.push(s); gained.push(E.skillLabel(s)); } });
  }
  /* Боевые статы для воина */
  if (emp.spec === 'warrior') {
    emp.combat.attack = 5 + emp.level * 3 + (emp.skills.includes('marksman') ? 5 : 0) + (emp.skills.includes('breach') ? 5 : 0);
    emp.combat.defense = 4 + emp.level * 2 + (emp.skills.includes('squadLeader') ? 4 : 0) + (emp.skills.includes('veteran') ? 6 : 0);
  }
  NB.notify(`${emp.specIcon} ${emp.name} → ур.${emp.level}${gained.length ? ` (${gained.join(', ')})` : ''}`, 'ok');
  NB.addLog(`${emp.name} повышен до ур.${emp.level}`, 'success');
  NB.addCompanyXp(10);
  if (NB.daily?.processEmployeePassives) NB.daily.processEmployeePassives();
  NB.save();
  NB.render();
  return true;
};

E.levelUp = function (empId) {
  const emp = NB.state.game.employees.find(e => e.id === empId);
  if (!emp) return;
  emp.xp += 10;
  if (emp.xp >= emp.xpNext) {
    emp.xp -= emp.xpNext;
    E.upgrade(empId, true);
  } else {
    NB.save();
  }
};

E.hasSkill = function (empId, skill) {
  const emp = NB.state.game.employees.find(e => e.id === empId);
  return emp ? emp.skills.includes(skill) : false;
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

E.loseRandom = function (n) {
  const g = NB.state.game;
  for (let i = 0; i < n && g.employees.length; i++) {
    const e = NB.pick(g.employees);
    g.employees = g.employees.filter(x => x.id !== e.id);
    NB.addLog(`${e.name} погиб`, 'warn');
  }
};

/* ============================================================
   БОЕВАЯ МОЩЬ / РАЗВЁРТЫВАНИЕ
   ============================================================ */
E.combatPower = function () {
  const eff = NB.game.getUpgradeEffects();
  const fromSoldiers = NB.state.game.employees
    .filter(e => e.spec === 'warrior')
    .reduce((s, e) => s + (e.combat?.attack || 0) + (e.combat?.defense || 0), 0);
  return fromSoldiers + eff.combatPower;
};

E.deployWarriors = function (count) {
  const g = NB.state.game;
  const warriors = g.employees.filter(e => e.spec === 'warrior' && e.ap.current >= 1);
  if (warriors.length === 0) return NB.toast('Нет доступных воинов', 'err');
  const n = Math.min(count, warriors.length);
  for (let i = 0; i < n; i++) E.spendAp(warriors[i].id, 1);
  return warriors.slice(0, n);
};

/* ============================================================
   ПУЛ
   ============================================================ */
E.refreshPool = function () {
  const g = NB.state.game;
  if (g.cash < 500) return NB.toast('Нужно 500 ₽', 'err');
  g.cash -= 500;
  g.employeesPool = E.generatePool(4);
  NB.save(); NB.render();
};

/* ============================================================
   РЕНДЕР
   ============================================================ */
E.renderView = function () {
  const g = NB.state.game;
  const hired = g.employees;
  const pool = g.employeesPool;
  const totalSalary = hired.reduce((s, e) => s + e.salary, 0);
  const warriors = hired.filter(e => e.spec === 'warrior');
  const warriorCap = (g.upgrades.soldier || 0) * 10;

  /* Сводка бонусов */
  const bonuses = NB.daily?.getEmployeeBonuses ? NB.daily.getEmployeeBonuses() : {};
  const bonusTags = [];
  if (bonuses.support > 0) bonusTags.push(`<span class="upgrade-effect-tag">💬 −${bonuses.support*8}% отток</span>`);
  if (bonuses.tech > 0) bonusTags.push(`<span class="upgrade-effect-tag">🔧 ${bonuses.tech*8}% автопочинка</span>`);
  if (bonuses.security > 0) bonusTags.push(`<span class="upgrade-effect-tag">🛡 −${bonuses.security*2}% взлом</span>`);
  if (bonuses.sales > 0) bonusTags.push(`<span class="upgrade-effect-tag">📈 +${(bonuses.sales*0.5).toFixed(1)} клиентов/день</span>`);
  if (bonuses.ops > 0) bonusTags.push(`<span class="upgrade-effect-tag">⚙ +${Math.floor(bonuses.ops/2)} AP max</span>`);
  if (warriors.length > 0) bonusTags.push(`<span class="upgrade-effect-tag">⚔ ${E.combatPower()} боевой мощи</span>`);

  return `<div class="page-head">
    <div><h1>Сотрудники</h1>
      <p class="muted">${hired.length} в штате · ${NB.money(totalSalary)}/день${warriorCap > 0 ? ` · ⚔ ${warriors.length}/${warriorCap} воинов` : ''}</p>
    </div>
    <button class="btn primary" data-action="refresh-employees-pool">🔄 Обновить пул (${NB.money(500)})</button>
  </div>
  ${bonusTags.length ? `<div class="upgrade-effects-panel"><div class="panel-head" style="margin-bottom:8px"><h2>⚙ Активные бонусы</h2></div><div class="upgrade-effects-list">${bonusTags.join('')}</div></div>` : ''}
  ${warriors.length > 0 ? `<div class="panel" style="margin-bottom:12px;border-left:3px solid #ef4444">
    <div class="panel-head"><h2>⚔ Боевая мощь</h2></div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
      <div class="traffic-stat ok"><b>${E.combatPower()}</b><small>всего</small></div>
      <div class="traffic-stat warn"><b>${warriors.reduce((s,e)=>s+(e.combat?.attack||0),0)}</b><small>атака</small></div>
      <div class="traffic-stat ok"><b>${warriors.reduce((s,e)=>s+(e.combat?.defense||0),0)}</b><small>защита</small></div>
    </div>
  </div>` : ''}
  <h2 style="font-size:15px;margin:20px 0 12px;color:#fff">В штате</h2>
  ${hired.length ? `<div class="employees-grid">${hired.map(e => E.renderCard(e, true)).join('')}</div>` : '<p class="empty">Нет сотрудников.</p>'}
  <h2 style="font-size:15px;margin:28px 0 12px;color:#fff">Доступны для найма</h2>
  ${pool.length ? `<div class="employees-grid">${pool.map(e => E.renderCard(e, false)).join('')}</div>` : '<p class="empty">Пул пуст. Обновите за 500 ₽.</p>'}`;
};

E.renderCard = function (e, hired) {
  const hireCost = E.hireCost(e);
  const canHire = NB.state.game.cash >= hireCost;
  const spec = SPECS[e.spec] || SPECS.support;
  const skillBadges = e.skills.slice(0, 6).map(s => `<span class="emp-skill-badge" title="${NB.esc(E.skillLabel(s))}">${NB.esc(E.skillLabel(s))}</span>`).join('');
  const more = e.skills.length > 6 ? `<span class="emp-skill-badge">+${e.skills.length - 6}</span>` : '';
  const upgradeCost = E.upgradeCost(e);
  const canUpgrade = hired && NB.state.game.cash >= upgradeCost;
  const nextSkills = spec.skillTree[e.level + 1];
  const nextSkillHint = nextSkills && nextSkills.length ? `На ур.${e.level + 1}: ${nextSkills.map(E.skillLabel).join(', ')}` : '';

  return `<div class="emp-card ${hired ? 'hired' : ''} ${e.spec === 'warrior' ? 'warrior' : ''}">
    <div class="emp-head">
      <div class="emp-avatar" style="background:linear-gradient(135deg,${e.specColor},${e.specColor}99)">
        <span class="emp-spec-icon">${e.specIcon || '👤'}</span>
      </div>
      <div class="emp-info">
        <h3>${NB.esc(e.name)}</h3>
        <small>Ур.${e.level} · <span class="emp-spec ${e.spec}">${NB.esc(e.specLabel)}</span></small>
      </div>
    </div>
    <div class="emp-bio">${NB.esc(e.bio)}</div>
    <div class="emp-skills">${skillBadges}${more}</div>
    <div style="font-size:11.5px;color:var(--muted);padding:6px 10px;background:var(--surface-3);border-radius:8px;margin-bottom:10px;line-height:1.4">
      <b style="color:${e.specColor};display:block;margin-bottom:2px">⚡ Пассивный эффект</b>
      ${NB.esc(e.passive)}
    </div>
    <div class="emp-stats">
      <div class="emp-stat"><b>${e.ap.max}</b>AP
        <div class="emp-ap">${Array.from({length: e.ap.max}).map((_, i) => `<i class="${i < e.ap.current ? 'filled' : ''}"></i>`).join('')}</div>
      </div>
      <div class="emp-stat"><b>${e.salary}</b>₽/день</div>
      ${e.spec === 'warrior' ? `<div class="emp-stat"><b>${e.combat.attack}/${e.combat.defense}</b>атака/защ.</div>` : ''}
    </div>
    <div class="emp-level-bar"><i style="width:${(e.xp / e.xpNext) * 100}%"></i></div>
    ${nextSkillHint ? `<div style="font-size:10.5px;color:var(--muted);margin:4px 0">${NB.esc(nextSkillHint)}</div>` : ''}
    <div class="emp-foot">
      ${hired
        ? `<button class="btn primary small emp-upgrade-btn" data-action="upgrade-employee" data-id="${e.id}" ${canUpgrade ? '' : 'disabled'} title="Повысить уровень">⬆ ${NB.money(upgradeCost)}</button>
           <button class="btn ghost small" data-action="fire-employee" data-id="${e.id}" style="color:var(--danger)">Уволить</button>`
        : `<span class="emp-salary">Найм: <b>${NB.money(hireCost)}</b></span>
           <button class="btn ${canHire ? 'primary' : 'ghost'} small" data-action="hire-employee" data-id="${e.id}" ${canHire ? '' : 'disabled'}>Нанять</button>`}
    </div>
  </div>`;
};

/* ============================================================
   ХУК В daily.js — обработка воинов
   ============================================================ */
if (NB.daily && NB.daily.getEmployeeBonuses && !NB.daily.getEmployeeBonuses.__warriorPatched) {
  const orig = NB.daily.getEmployeeBonuses;
  NB.daily.getEmployeeBonuses = function () {
    const b = orig.apply(this, arguments);
    const warriors = NB.state.game.employees.filter(e => e.spec === 'warrior');
    b.warrior = warriors.length;
    return b;
  };
  NB.daily.getEmployeeBonuses.__warriorPatched = true;
}

})(window);