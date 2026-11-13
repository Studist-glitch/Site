/* Добавить в G.EVENTS новые события: */
G.EVENTS.push(
  { id:'salary_negotiation', title:'💰 Повышение', desc:'Сотрудник просит повышения. Его работа важна.', weight:0.8,
    condition:()=>NB.state.game.employees.length>0,
    opts:[
      { label:'Переговоры (мини-игра)', action:()=>{
        NB.closeModal();
        setTimeout(() => {
          NB.minigames.start('negotiate', (success) => {
            const g = NB.state.game;
            const emp = NB.pick(g.employees);
            if (success) {
              if (g.cash < 5000) { NB.notify('Переговоры выиграны, но денег нет', 'warn'); return; }
              g.cash -= 5000;
              emp.salary = Math.round(emp.salary * 1.2);
              NB.notify(`${emp.name} доволен. Зарплата повышена.`, 'ok');
            } else {
              g.employees = g.employees.filter(e => e.id !== emp.id);
              NB.notify(`${emp.name} уволился после провала переговоров`, 'warn');
            }
            NB.save(); NB.render();
          }, {
            successText: 'Сотрудник согласен на повышение зарплаты.',
            failText: 'Переговоры провалились. Сотрудник ушёл.'
          });
        }, 250);
        return 'Переговоры начались.';
      }},
      { label:'Дать премию (5000₽)', run:()=>{
        if(NB.state.game.cash<5000) return 'Нет денег';
        NB.state.game.cash-=5000;
        NB.state.game.reputation=Math.min(100,NB.state.game.reputation+2);
        return 'Сотрудник благодарен.';
      }},
      { label:'Отказать', run:()=>{
        if (NB.state.game.employees.length) {
          const emp = NB.pick(NB.state.game.employees);
          NB.state.game.employees = NB.state.game.employees.filter(e => e.id !== emp.id);
          return `${emp.name} ушёл.`;
        }
        return 'Никого не было.';
      }}
    ]
  },
  { id:'hostile_takeover', title:'🏴 Враждебный конкурент', desc:'Starlink атакует: DDoS + переманивание клиентов. За 3 дня можно потерять 20 клиентов.', weight:0.7,
    condition:()=>NB.state.game.unlocks.competitors && NB.state.game.competitors.some(c=>c.alive),
    opts:[
      { label:'Контратака (мини-игра)', action:()=>{
        NB.closeModal();
        setTimeout(() => {
          NB.minigames.start('codebreak', (success) => {
            const g = NB.state.game;
            if (success) {
              g.reputation = Math.min(100, g.reputation + 10);
              NB.notify('Атака отбита. Репутация выросла.', 'ok');
            } else {
              for (let i = 0; i < 5 && i < NB.state.clients.length; i++) {
                const v = NB.state.clients[i];
                NB.state.clients = NB.state.clients.filter(c => c.id !== v.id);
              }
              g.reputation = Math.max(0, g.reputation - 10);
              NB.notify('Контратака провалилась. Потери клиентов.', 'warn');
            }
            NB.save(); NB.render();
          });
        }, 250);
        return 'Контратака начинается...';
      }},
      { label:'Откупиться (10 000₽)', run:()=>{
        if(NB.state.game.cash<10000) return 'Нет денег';
        NB.state.game.cash-=10000;
        return 'Откупились. Атака прекратилась.';
      }},
      { label:'Терпеть', run:()=>{
        for(let i=0;i<8&&i<NB.state.clients.length;i++){const v=NB.state.clients[i]; NB.state.clients=NB.state.clients.filter(c=>c.id!==v.id);}
        NB.state.game.reputation = Math.max(0, NB.state.game.reputation - 15);
        return '−8 клиентов, −15 репутации';
      }}
    ]
  },
  { id:'client_complaint', title:'📢 Массовая жалоба', desc:'10 клиентов жалуются на качество. Требуют компенсацию.', weight:0.9,
    condition:()=>NB.state.game.daily.dayNumber > 15 && NB.state.clients.length > 5,
    opts:[
      { label:'Компенсировать (3000₽)', run:()=>{
        if(NB.state.game.cash<3000) return 'Нет денег';
        NB.state.game.cash-=3000;
        NB.state.game.reputation = Math.min(100, NB.state.game.reputation + 5);
        return '+5 репутации';
      }},
      { label:'Ответить лично (1 AP)', action:()=>{
        if (!NB.spendAp(1)) return 'Нет AP';
        NB.state.game.reputation = Math.min(100, NB.state.game.reputation + 8);
        return '+8 репутации';
      }},
      { label:'Проигнорировать', run:()=>{
        NB.state.game.reputation = Math.max(0, NB.state.game.reputation - 10);
        for(let i=0;i<3&&i<NB.state.clients.length;i++){const v=NB.state.clients[i]; NB.state.clients=NB.state.clients.filter(c=>c.id!==v.id);}
        return '−3 клиента, −10 репутации';
      }}
    ]
  }
);

/* === НОВАЯ СИСТЕМА ТУРОВ === */
G.TOURS_BY_VIEW = {
  dashboard: [
    { selector:'.daily-tasks-panel', icon:'📋', title:'Задачи дня', text:'Главное: собрать выручку, принять клиентов, разобрать заявки. Пока не выполнено — «Следующий день» заблокирован.' },
    { selector:'.pending-clients-section', icon:'🆕', title:'Клиенты', text:'Принимайте клиентов — деньги. Рискованные (взломщики, спамеры, неизвестные) — риск. Неизвестные раскрываются через 3 дня.' },
    { selector:'.economy-panel', icon:'💵', title:'Экономика', text:'Net/день = доход − расход. Минус — плохо. Проверьте пропускную способность и маркетинг.' },
    { selector:'.advance-day-btn', icon:'📅', title:'Следующий день', text:'Завершает день. Спишутся расходы, придут новые клиенты и заявки.' }
  ],
  chat: [
    { selector:'.chat-wrap', icon:'💬', title:'Поддержка', text:'Клиенты пишут. Отвечайте. Некоторые ответы требуют AP, сотрудников с навыком или мини-игру.' }
  ],
  employees: [
    { selector:'.employees-grid', icon:'👥', title:'Сотрудники', text:'Нанятые помогают в чате и событиях. У них свой AP. Прокачиваются с успешными решениями.' }
  ],
  competitors: [
    { selector:'.comp-list', icon:'🏢', title:'Конкуренты', text:'Можно договариваться (1 AP) или саботировать (2 AP + 10 000 ₽). Отношения влияют на агрессию.' }
  ],
  upgrades: [
    { selector:'.upgrades-grid', icon:'⚙', title:'Магазин', text:'Открывается постепенно. Пропускная способность — ключевая: без неё нельзя ставить высокие тарифы.' }
  ],
  invoices: [
    { selector:'.invoice-tabs', icon:'📄', title:'Счета', text:'Слева — клиенты платят нам. Справа — мы платим (зарплаты, семья, налоги). Просрочки бьют по репутации.' }
  ],
  tariffs: [
    { selector:'.tariff-grid', icon:'◆', title:'Тарифы', text:'Диапазон скорости растёт от пропускной способности. Цена — от скорости. Нельзя ставить максимум без апгрейдов.' }
  ]
};

G.startViewTour = function (view) {
  if (!G.TOURS_BY_VIEW[view]) return;
  if (NB.state.onboarded.views[view]) return;
  if (document.querySelector('.tour-overlay')) return;
  const steps = G.TOURS_BY_VIEW[view];
  let idx = 0;
  const overlay = document.createElement('div');
  overlay.className = 'tour-overlay';
  overlay.innerHTML = `<div class="tour-highlight" id="tour-hl"></div>
    <div class="tour-bubble left" id="tour-bubble">
      <div class="tour-icon" id="tour-icon"></div>
      <div class="tour-title" id="tour-title"></div>
      <div class="tour-text" id="tour-text"></div>
      <div class="tour-dots" id="tour-dots"></div>
      <div class="tour-actions">
        <button type="button" class="tour-skip" id="tour-skip">Пропустить</button>
        <div class="right">
          <button type="button" class="tour-back" id="tour-back" style="display:none">Назад</button>
          <button type="button" class="tour-next" id="tour-next">Далее</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const hl = overlay.querySelector('#tour-hl');
  const bubble = overlay.querySelector('#tour-bubble');

  const step = () => {
    const s = steps[idx];
    NB.$$('.tutorial-pulse').forEach(el => el.classList.remove('tutorial-pulse'));
    let target = s.selector ? document.querySelector(s.selector) : null;
    if (target) {
      target.classList.add('tutorial-pulse');
      const r = target.getBoundingClientRect();
      hl.style.display = 'block';
      hl.style.left = (r.left - 6) + 'px';
      hl.style.top = (r.top - 6) + 'px';
      hl.style.width = (r.width + 12) + 'px';
      hl.style.height = (r.height + 12) + 'px';
      const mob = window.innerWidth <= 760;
      if (mob) {
        bubble.className = 'tour-bubble below';
        bubble.style.left = '12px'; bubble.style.right = '12px'; bubble.style.width = 'auto';
        bubble.style.top = (r.bottom + 18) + 'px'; bubble.style.transform = 'none';
      } else {
        bubble.className = 'tour-bubble left';
        bubble.style.width = '320px';
        bubble.style.transform = 'none';
        bubble.style.left = Math.min(r.right + 20, window.innerWidth - 340) + 'px';
        bubble.style.top = Math.max(12, r.top - 22) + 'px';
      }
    } else {
      hl.style.display = 'none';
      bubble.className = 'tour-bubble left';
      bubble.style.width = '360px';
      bubble.style.left = '50%';
      bubble.style.transform = 'translateX(-50%)';
      bubble.style.top = '160px';
    }
    overlay.querySelector('#tour-icon').textContent = s.icon;
    overlay.querySelector('#tour-title').textContent = s.title;
    overlay.querySelector('#tour-text').textContent = s.text;
    overlay.querySelector('#tour-dots').innerHTML = steps.map((_, i) => `<i class="${i === idx ? 'active' : ''}"></i>`).join('');
    overlay.querySelector('#tour-next').textContent = idx === steps.length - 1 ? 'Понятно!' : 'Далее';
    overlay.querySelector('#tour-back').style.display = idx > 0 ? '' : 'none';
  };
  const finish = () => {
    NB.$$('.tutorial-pulse').forEach(el => el.classList.remove('tutorial-pulse'));
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 300);
    NB.state.onboarded.views[view] = true;
    NB.save();
  };
  overlay.querySelector('#tour-next').addEventListener('click', () => {
    if (idx === steps.length - 1) finish(); else { idx++; step(); }
  });
  overlay.querySelector('#tour-back').addEventListener('click', () => { if (idx > 0) { idx--; step(); } });
  overlay.querySelector('#tour-skip').addEventListener('click', finish);
  overlay.style.pointerEvents = 'auto';
  requestAnimationFrame(step);
};

/* Главный тур при старте — это dashboard тур */
G.startTour = function () {
  if (!NB.state.onboarded.tour) {
    NB.state.onboarded.tour = true;
    NB.save();
    G.startViewTour('dashboard');
  } else {
    // Показать гид заново — все доступные вкладки
    NB.state.onboarded.views = {};
    NB.save();
    G.startViewTour(NB.ui.view);
  }
};

NB.startTour = () => G.startTour();