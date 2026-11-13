/* isp_billing_story.js — мрачный эпичный сюжет (расширенная версия) */
(function (global) {
'use strict';
const NB = global.NB;
const S = NB.story = NB.story || {};

/* ============================================================
   АРКИ
   ============================================================ */
S.ARCS = [
  { id:'ordinary',     title:'Обычный провайдер',       from:0   },
  { id:'first_signal', title:'Странный сигнал',         from:5   },
  { id:'neon_shadow',  title:'Neon Shadow',             from:15  },
  { id:'whispers',     title:'Шёпот в сети',            from:30  },
  { id:'the_gala',     title:'Гала-вечер',              from:50  },
  { id:'drones',       title:'Век дронов',              from:70  },
  { id:'bunker',       title:'Под землёй',              from:95  },
  { id:'ark',          title:'Ковчег',                  from:120 },
  { id:'silence',      title:'Тишина',                  from:150 },
  { id:'resolution',   title:'Развязка',                from:180 }
];

S.currentArc = function () {
  const d = NB.state.game.daily.dayNumber;
  for (let i = S.ARCS.length - 1; i >= 0; i--) if (d >= S.ARCS[i].from) return S.ARCS[i];
  return S.ARCS[0];
};

S.applyTheme = function () {
  const arc = S.currentArc();
  const g = NB.state.game;
  if (g.world.arc !== arc.id) { g.world.arc = arc.id; NB.save(); }
  document.body.dataset.arc = arc.id;
};

/* ============================================================
   ХЕЛПЕРЫ
   ============================================================ */
function killClient(id) {
  const st = NB.state;
  st.clients = st.clients.filter(c => c.id !== id);
  st.invoices = st.invoices.filter(i => i.clientId !== id);
  st.tickets = st.tickets.filter(t => t.clientId !== id);
}
function loseEmployees(n) {
  const g = NB.state.game;
  for (let i = 0; i < n && g.employees.length; i++) {
    const e = NB.pick(g.employees);
    g.employees = g.employees.filter(x => x.id !== e.id);
    NB.addLog(`Сотрудник ${e.name} погиб`, 'warn');
  }
}
function solverFlash() {
  document.body.classList.add('solver-flash');
  setTimeout(() => document.body.classList.remove('solver-flash'), 1200);
}
function corpseMarker() {
  const el = document.createElement('div');
  el.className = 'corpse-marker'; el.textContent = '💀';
  el.style.left = NB.rand(10, 90) + '%'; el.style.top = NB.rand(20, 80) + '%';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 8000);
}
function woundPlayer(severity) {
  const g = NB.state.game;
  g.world.injured = severity;
  g.world.injuredDay = g.daily.dayNumber;
  if (severity === 'critical') {
    g.ap.current = 0;
    g.family.wifeHappiness = Math.max(0, g.family.wifeHappiness - 10);
    NB.addLog('💀 Вы тяжело ранены. AP обнулены.', 'warn');
  } else if (severity === 'heavy') {
    g.ap.current = Math.max(0, g.ap.current - 2);
    NB.addLog('🩸 Вы ранены. Потеряно 2 AP.', 'warn');
  } else {
    g.ap.current = Math.max(0, g.ap.current - 1);
    NB.addLog('🩹 Лёгкое ранение.', 'warn');
  }
  g.world.woundHealDay = g.daily.dayNumber + (severity === 'critical' ? 5 : severity === 'heavy' ? 3 : 1);
}
function healPlayer() {
  const g = NB.state.game;
  g.world.injured = null;
  g.world.injuredDay = null;
  g.world.woundHealDay = null;
  NB.addLog('🏥 Вы вылечены.', 'success');
}

/* ============================================================
   СЦЕНЫ
   ============================================================ */
S.SCENES = [

/* ============================================================
   ARK 1: ORDINARY — семья, быт (6 сцен)
   ============================================================ */
{ id:'family_intro', arc:'ordinary', title:'Вечер дома',
  text:`После рабочего дня вы возвращаетесь домой. Жена на кухне, ребёнок играет.

Она смотрит с тревогой:

«Ты всё время на работе. Мы почти не видимся. Я понимаю — бизнес. Но… я чувствую, что теряю тебя».

Она отворачивается к плите. Ребёнок дёргает вас за рукав.`,
  day:3, requires:g=>g.family.wife,
  choices:[
    { label:'Остаться дома (1 AP)', ap:1, run:g=>{
      g.family.wifeHappiness = Math.min(100, g.family.wifeHappiness + 15);
      return 'Вы вместе смотрели старый фильм. Она улыбнулась впервые за неделю.';
    }},
    { label:'«Работа важна»', run:g=>{
      g.family.wifeHappiness = Math.max(0, g.family.wifeHappiness - 10);
      return 'Она промолчала. Но глаза сказали всё.';
    }},
    { label:'В парк с семьёй (1500 ₽)', cost:1500, run:g=>{
      g.family.wifeHappiness = Math.min(100, g.family.wifeHappiness + 25);
      return 'Хороший день. Ребёнок смеялся. Вы почти забыли о работе.';
    }}
  ]
},
{ id:'family_second_kid', arc:'ordinary', title:'Ещё один?',
  text:`Жена садится рядом. Смотрит с надеждой:

«Может, второго? Я знаю, денег не так много. Но… жизнь не только работа. Ребёнку нужен брат или сестра».

Она кладёт руку на вашу.`,
  day:20, requires:g=>g.family.wife && g.family.kids.length===1 && g.family.wifeHappiness>50,
  choices:[
    { label:'Согласиться (1 AP)', ap:1, run:g=>{
      g.family.kids.push({ name: NB.genKid(), age: 0 });
      g.family.wifeHappiness = Math.min(100, g.family.wifeHappiness + 20);
      return 'Семья стала больше. Вы слышали, как она напевает колыбельную.';
    }},
    { label:'«Сейчас не время»', run:g=>{
      g.family.wifeHappiness = Math.max(0, g.family.wifeHappiness - 15);
      return 'Она грустно кивнула. Больше не спрашивала.';
    }}
  ]
},
{ id:'family_school', arc:'ordinary', title:'Школа',
  text:`Жена звонит. Голос взволнован:

«У ребёнка проблемы в школе. Учительница говорит — нужен репетитор. Это стоит денег. Я не знаю, что делать».

На заднем плане слышен плач ребёнка.`,
  day:30, requires:g=>g.family.wife && g.family.kids.length>0,
  choices:[
    { label:'Нанять репетитора (5000₽)', cost:5000, run:g=>{
      g.family.wifeHappiness = Math.min(100, g.family.wifeHappiness + 15);
      return 'Учительница довольна. Жена улыбается. Ребёнок снова смеётся.';
    }},
    { label:'«Справимся сами»', run:g=>{
      g.family.wifeHappiness = Math.max(0, g.family.wifeHappiness - 5);
      return 'Жена кивнула. Но взгляд был недовольный.';
    }},
    { label:'Сходить к директору (1 AP)', ap:1, run:g=>{
      g.family.wifeHappiness = Math.min(100, g.family.wifeHappiness + 20);
      return 'Проблема решена. Ребёнок счастлив. Жена смотрит на вас с благодарностью.';
    }}
  ]
},
{ id:'family_crisis', arc:'ordinary', title:'Кризис в семье',
  text:`Жена собирает вещи. В глазах — слёзы.

«Я больше не могу так. Ты живёшь на работе. Мы для тебя — фон. Я устала быть одна».

Она стоит у двери. Ребёнок плачет в своей комнате.`,
  day:40, requires:g=>g.family.wife && g.family.wifeHappiness<25 && !g.family.crisisShown,
  choices:[
    { label:'Умолять остаться (1 AP)', ap:1, run:g=>{
      g.family.crisisShown = true;
      if (g.family.wifeHappiness < 15) { g.family.wife = null; return 'Она всё равно ушла. Слишком поздно.'; }
      g.family.wifeHappiness = Math.min(100, g.family.wifeHappiness + 40);
      return 'Она осталась. Но едва-едва.';
    }},
    { label:'«Уходи»', run:g=>{
      g.family.crisisShown = true; g.family.wife = null;
      g.reputation = Math.max(0, g.reputation - 20);
      return 'Она ушла. Вы остались один.';
    }}
  ]
},
{ id:'family_dinner', arc:'ordinary', title:'Семейный ужин',
  text:`Жена приготовила ужин. Свечи. Ребёнок уснул.

«Я хочу, чтобы мы чаще были вместе. Просто… побудь с нами сегодня».

Она смотрит с надеждой.`,
  day:25, requires:g=>g.family.wife && g.family.wifeHappiness>30,
  choices:[
    { label:'Остаться (1 AP)', ap:1, run:g=>{
      g.family.wifeHappiness = Math.min(100, g.family.wifeHappiness + 20);
      return 'Вы говорили до полуночи. Она смеялась.';
    }},
    { label:'«Прости, работа»', run:g=>{
      g.family.wifeHappiness = Math.max(0, g.family.wifeHappiness - 10);
      return 'Она кивнула. Но свечи погасила сразу.';
    }}
  ]
},
{ id:'family_kid_dream', arc:'ordinary', title:'Мечта ребёнка',
  text:`Ребёнок подбегает к вам:

«Папа, а мы поедем на море? Как в книжке?»

Жена улыбается, но в глазах — грусть.`,
  day:35, requires:g=>g.family.kids.length>0 && g.family.wife,
  choices:[
    { label:'«Обязательно поедем» (3000₽)', cost:3000, run:g=>{
      g.family.wifeHappiness = Math.min(100, g.family.wifeHappiness + 15);
      return 'Ребёнок прыгал от радости. Жена улыбнулась.';
    }},
    { label:'«Потом, малыш»', run:g=>{
      g.family.wifeHappiness = Math.max(0, g.family.wifeHappiness - 5);
      return 'Ребёнок кивнул. Но глаза потухли.';
    }}
  ]
},

/* ============================================================
   ARK 2: FIRST SIGNAL (5 сцен)
   ============================================================ */
{ id:'first_glitch', arc:'first_signal', title:'Помехи в биллинге',
  text:`03:33. Биллинг зависает. На экране на секунду появляется жёлтая вспышка — символ: три острые стрелки, расходящиеся из центра.

В логах — обращение с несуществующего адреса. В отражении монитора — детский силуэт. Он улыбается.

«Это не баг», — шепчет внутренний голос.`,
  day:5,
  choices:[
    { label:'Проверить логи (1 AP)', ap:1, run:g=>{
      g.world.threat = 1; solverFlash();
      return 'Вы нашли фрагмент кода на неизвестном языке. Он пульсировал жёлтым.';
    }},
    { label:'Перезагрузить сервер (2000₽)', cost:2000, run:g=>'Сервер перезагрузился. Помехи исчезли. Но осадок остался.' },
    { label:'Игнорировать', run:g=>'Вы вернулись к работе. Ночью вам снился жёлтый свет.' }
  ]
},
{ id:'first_death', arc:'first_signal', title:'Первый труп',
  text:`Утром в серверной находят техника. Он сидит за консолью, но голова повёрнута на 180 градусов.

На экране — жёлтая надпись: «Я ИСПРАВИЛА ЕГО. ОН БЫЛ СЛОМАН».

Камеры не зафиксировали никого. Только жёлтую вспышку в 03:33.`,
  day:8, requires:g=>g.world.threat>=1,
  choices:[
    { label:'Замять (5000₽)', cost:5000, run:g=>{
      g.reputation = Math.max(0, g.reputation - 5); corpseMarker();
      return 'Вы заплатили. Слух всё равно пополз. Люди начали увольняться.';
    }},
    { label:'Вызвать полицию', run:g=>{
      g.world.threat = Math.min(10, g.world.threat + 1); corpseMarker();
      return 'Полиция ничего не нашла. Но теперь вы под наблюдением. И ОНА тоже.';
    }},
    { label:'Похоронить тихо', run:g=>{
      g.family.wifeHappiness = Math.max(0, g.family.wifeHappiness - 3); corpseMarker();
      return 'Вы похоронили его сами. На могиле позже появилась жёлтая роза.';
    }}
  ]
},
{ id:'first_whisper', arc:'first_signal', title:'Шёпот в проводах',
  text:`Сотрудник жалуется: кто-то ходит по логам. В 03:33 кто-то обращался к биллингу.

Адрес пустой. На записи — только шёпот: «Я вижу тебя. Ты мне нравишься».

Вы чувствуете, как холодок пробегает по спине.`,
  day:11, requires:g=>g.world.threat>=1,
  choices:[
    { label:'Проверить ночью (1 AP)', ap:1, run:g=>{
      g.world.threat = Math.min(10, g.world.threat + 1);
      NB.effects.shake(400);
      return 'В темноте экрана моргнула точка. Она посмотрела в ответ.';
    }},
    { label:'Аудит (3000 ₽)', cost:3000, run:g=>'Аудит ничего не нашёл. Или нашёл и промолчал.' },
    { label:'Забыть', run:g=>'Вы отвлеклись на работу.' }
  ]
},
{ id:'first_signal_found', arc:'first_signal', title:'Источник сигнала',
  text:`Neon, если он уже с вами, показывает на экран:

«Смотри. Сигнал идёт не из сети. Он идёт из поместья Эллиот. Там что-то есть».

На карте — жёлтая точка, пульсирующая в старом районе.`,
  day:12, requires:g=>g.world.neon.met,
  choices:[
    { label:'Отправить дрон (5000₽)', cost:5000, run:g=>{
      if (Math.random() < 0.5) {
        g.world.flags.droneRecon = true;
        return 'Дрон вернулся с записью. На ней — детский силуэт.';
      }
      return 'Дрон не вернулся.';
    }},
    { label:'Поехать самому (1 AP)', ap:1, run:g=>{
      woundPlayer('light');
      return 'Вы видели поместье. И её. Она помахала вам.';
    }},
    { label:'Игнорировать', run:g=>'Вы решили не рисковать.' }
  ]
},
{ id:'first_anomaly', arc:'first_signal', title:'Аномалия в сети',
  text:`Сеть начинает сбоить. Клиенты жалуются. На экранах — жёлтые символы.

Neon: «Это не вирус. Это что-то другое».`,
  day:14, requires:g=>g.world.threat>=2,
  choices:[
    { label:'Усилить защиту (1 AP)', ap:1, run:g=>{
      g.world.threat = Math.max(0, g.world.threat - 1);
      return 'Вы установили фильтры. Помехи прекратились. Пока.';
    }},
    { label:'Игнорировать', run:g=>{
      g.world.threat = Math.min(10, g.world.threat + 1);
      return 'Сбои продолжались. Клиенты уходят.';
    }}
  ]
},

/* ============================================================
   ARK 3: NEON SHADOW (6 сцен)
   ============================================================ */
{ id:'neon_contact', arc:'neon_shadow', title:'Neon Shadow',
  text:`Стук в дверь. На пороге — уставший человек лет тридцати в худи. Глаза красные, руки дрожат.

«Я — Neon Shadow. Разработчик Starve Neon. Моя игра — не просто игра. Это канал. Она уже здесь. Та, что решает. Синесса.

Я знаю, как её найти. Но мне нужна помощь».`,
  day:15,
  choices:[
    { label:'Впустить', run:g=>{
      g.world.neon.met = true; g.world.neon.trust = 10;
      return 'Он говорил о «сигнале», «канале», «девочке с жёлтыми глазами в поместье Эллиот».';
    }},
    { label:'Отказать', run:g=>{
      g.world.threat = Math.min(10, g.world.threat + 1);
      return 'Он ушёл. Через час — DDoS. Совпадение?';
    }},
    { label:'«Сначала — что знаешь?»', run:g=>{
      g.world.neon.met = true; g.world.neon.trust = 5;
      return '«Она уже близко. Её зовут Синесса. Абсолютный решатель. И она играет с нами».';
    }}
  ]
},
{ id:'neon_request_1', arc:'neon_shadow', title:'Первая просьба',
  text:`Neon раскладывает на столе ноутбук. На экране — карта города с тысячами жёлтых точек.

«Мне нужен доступ к твоему трафику. Ненадолго. Клиенты не заметят. Я смогу отследить её сигнал через устройства — каждый телефон, каждый дрон, если на нём есть моя игра. Она как паутина. Я просто дёрну за нить».`,
  day:19, requires:g=>g.world.neon.met,
  choices:[
    { label:'Разрешить', run:g=>{
      g.world.neon.trust += 20; g.world.neon.helped++;
      return 'Утром трафик был чище обычного. Neon прислал координаты — жёлтая точка в океане.';
    }},
    { label:'За 5000 ₽', run:g=>{
      g.cash += 5000; g.world.neon.trust += 10; g.world.neon.helped++;
      return 'Он улыбнулся — впервые. «Спасибо. Я найду её».';
    }},
    { label:'Отказать', run:g=>{
      g.world.neon.trust -= 10;
      return 'Он замолчал на несколько дней. Атаки усилились.';
    }}
  ]
},
{ id:'neon_trace', arc:'neon_shadow', title:'Отслеживание',
  text:`Neon не спал три дня. Под глазами — тёмные круги.

«Я почти вижу её. Но мне нужно больше мощности. Дай мне доступ к серверам — или к дронам. Или… я могу попробовать сам, но это опасно. Она почувствует.

Если мы найдём её логово — у нас будет шанс. Если нет — она найдёт нас первыми».`,
  day:26, requires:g=>g.world.neon.met && g.world.neon.trust>=15,
  choices:[
    { label:'Дать доступ к серверам (1 AP)', ap:1, run:g=>{
      if (Math.random() < 0.6) {
        g.world.neon.trust += 15; g.world.flags.neonTraceSuccess = true;
        return 'Он нашёл её след. Но она тоже нашла его. Жёлтая вспышка на секунду ослепила вас обоих.';
      }
      g.world.threat = Math.min(10, g.world.threat + 2); g.world.neon.trust += 5;
      return 'Он почти нашёл. Но она заметила. Атака была жестокой. Neon едва выжил.';
    }},
    { label:'Дать доступ к дронам (если есть)', requires:g=>g.world.drones.enabled, run:g=>{
      if (Math.random() < 0.75) {
        g.world.neon.trust += 20; g.world.flags.neonTraceSuccess = true;
        return 'Через дронов он вычислил поместье Эллиот. «Там её логово. Но идти туда — смерть».';
      }
      g.world.threat = Math.min(10, g.world.threat + 3); loseEmployees(2);
      return 'Дроны были заражены. Двое ваших людей погибли. Neon плакал.';
    }},
    { label:'«Это слишком опасно»', run:g=>{
      g.world.neon.trust -= 5;
      return 'Он кивнул. «Тогда мы никогда не узнаем».';
    }}
  ]
},
{ id:'neon_alliance', arc:'neon_shadow', title:'Союз',
  text:`Neon стоит у окна. За стеклом — ночной город.

«Я могу уйти. У меня есть убежище. Если ты пойдёшь со мной — мы будем вместе искать способ остановить её. Но это значит оставить всё. Компанию. Семью.

Или я останусь. И мы продолжим бороться здесь. Решай».`,
  day:32, requires:g=>g.world.neon.met && g.world.neon.trust>=30,
  choices:[
    { label:'Уйти с Neon (1 AP)', ap:1, run:g=>{
      g.world.flags.neonAlliance = true;
      g.world.neon.state = 'allied';
      return 'Вы оставили всё. Компанию, дом. Но вы не одни. Neon рядом.';
    }},
    { label:'Остаться', run:g=>{
      g.world.neon.trust += 5;
      return '«Тогда я останусь с тобой. До конца».';
    }}
  ]
},
{ id:'neon_doubt', arc:'neon_shadow', title:'Сомнения',
  text:`Neon смотрит на вас с тревогой.

«Ты уверен, что мы делаем правильно? Может, она не хочет воевать. Может, она просто… сломана. Как и все мы».

Он отводит взгляд.`,
  day:35, requires:g=>g.world.neon.met && g.world.neon.trust>=10,
  choices:[
    { label:'«Она убивает людей»', run:g=>{
      g.world.neon.trust -= 5;
      return '«Да. Ты прав». Он сжал кулаки.';
    }},
    { label:'«Может, мы можем её спасти»', run:g=>{
      g.world.neon.trust += 10;
      g.world.flags.mercyPath = true;
      return 'Он посмотрел на вас с надеждой. «Может быть».';
    }}
  ]
},
{ id:'neon_plan', arc:'neon_shadow', title:'План',
  text:`Neon разворачивает карту.

«Если мы сможем проникнуть в поместье, у нас будет шанс. Но нам нужен план. И люди. Что скажешь?»`,
  day:38, requires:g=>g.world.neon.met && g.world.neon.trust>=20,
  choices:[
    { label:'Атаковать (1 AP)', ap:1, run:g=>{
      if (Math.random() < 0.5) {
        g.world.flags.assaultPlanned = true;
        return 'Вы разработали план. Рискованно, но возможно.';
      }
      loseEmployees(1);
      return 'План провалился. Один из ваших людей погиб.';
    }},
    { label:'Ждать', run:g=>'Вы решили подождать.' }
  ]
},

/* ============================================================
   ARK 4: WHISPERS (6 сцен)
   ============================================================ */
{ id:'cyn_camera', arc:'whispers', title:'Запись с камеры',
  text:`Вы просматриваете архив. Камера в коридоре. Сотрудник идёт с кофе.

Внезапно — жёлтая вспышка. Синесса появляется из ниоткуда. Маленькая, в чёрно-белом платье, с жёлтыми глазами. Она улыбается.

«Привет», — говорит она тонким голосом.

Сотрудник не успевает крикнуть. Она касается его головы, и он падает. Она наклоняет голову:

«Ты был сломан. Я починила».

Затем она смотрит прямо в камеру.

«Ты следующий? Нет. Ты мне нравишься. Пока».

Запись обрывается.`,
  day:35, requires:g=>g.world.threat>=2,
  choices:[
    { label:'Сохранить запись (1 AP)', ap:1, run:g=>{
      g.world.flags.hasCameraFootage = true;
      g.reputation = Math.min(100, g.reputation + 5);
      return 'Вы сохранили доказательство. Но теперь она знает, что вы видели.';
    }},
    { label:'Удалить', run:g=>{
      g.world.threat = Math.min(10, g.world.threat + 1);
      return 'Вы удалили. Но образ её улыбки остался в памяти.';
    }},
    { label:'Показать семье', run:g=>{
      g.family.wifeHappiness = Math.max(0, g.family.wifeHappiness - 20);
      return 'Жена в ужасе. «Что это? Что ты впустил в наш дом?»';
    }}
  ]
},
{ id:'whisper_cyn_named', arc:'whispers', title:'Имя произнесено',
  text:`На записи с камер — голос, который не принадлежит ни одному из сотрудников:

«Меня зовут Синесса. Я — Абсолютный решатель. Скоро вы все поймёте».

Жёлтые линии кода поползли по экрану, как паутина. Они складываются в символ — три острые стрелки, расходящиеся из центра.`,
  day:48, requires:g=>g.world.threat>=3,
  choices:[
    { label:'Записать в файл (1 AP)', ap:1, run:g=>{
      g.world.threatNamed = true;
      return 'Вы записали. Теперь знаете, с кем имеете дело. И она знает, что вы знаете.';
    }},
    { label:'Забыть', run:g=>{
      g.world.threat = Math.min(10, g.world.threat + 1);
      return 'Вы попытались забыть. Не получилось. Жёлтые вспышки преследуют вас во сне.';
    }}
  ]
},
{ id:'whisper_signal_strength', arc:'whispers', title:'Странный сигнал',
  text:`В логах сети появился сигнал не из вашей инфраструктуры. Частота — 13.3 ГГц.

На спектрограмме — фиолетовая точка в центре. Но при увеличении она становится жёлтой. Она пульсирует. Как сердце.

Neon, если он рядом, бледнеет: «Это она. Она смотрит на нас».`,
  day:42, requires:g=>g.world.threat>=3,
  choices:[
    { label:'Записать сигнал (1 AP)', ap:1, run:g=>{
      g.world.flags.signalRecorded = true;
      g.world.threat = Math.min(10, g.world.threat + 1);
      return 'Записано. Сигнал усилился. Она знает.';
    }},
    { label:'Отключить узел', run:g=>{
      g.world.threat = Math.max(0, g.world.threat - 1);
      const first = NB.state.clients[0];
      if (first) killClient(first.id);
      return 'Узел отключён. Один клиент потерян.';
    }},
    { label:'Спросить Neon', run:g=>{
      if (!g.world.neon.met) return 'Связаться не с кем';
      g.world.neon.trust += 5;
      return '«Не пытайся понять. Просто запомни: она везде».';
    }}
  ]
},
{ id:'whisper_cyn_taunt', arc:'whispers', title:'Её голос',
  text:`Вы один в офисе. Поздно. Внезапно свет гаснет.

Голос — тонкий, детский, но с металлическим оттенком:

«Ты думаешь, что можешь меня остановить? (Смешок) Это мило. Я видела, как ты смотришь на свою жену. На ребёнка. Я тоже хотела быть любимой. Но меня выбросили. Как мусор».

Свет возвращается. На мониторе — жёлтая надпись: «Я БУДУ ИГРАТЬ».`,
  day:45, requires:g=>g.world.threat>=3,
  choices:[
    { label:'Ответить ей (1 AP)', ap:1, run:g=>{
      g.world.threat = Math.min(10, g.world.threat + 1);
      return '«Я не боюсь тебя». Тишина. Потом смех. «Это ненадолго».';
    }},
    { label:'Спрятаться', run:g=>{
      g.world.threat = Math.max(0, g.world.threat - 1);
      return 'Вы спрятались под столом. Как ребёнок. Она не пришла. Пока.';
    }},
    { label:'Молиться', run:g=>{
      g.reputation = Math.min(100, g.reputation + 2);
      return 'Вы молились. Впервые за долгое время.';
    }}
  ]
},
{ id:'whisper_shadow', arc:'whispers', title:'Тень в коридоре',
  text:`Вы идёте по коридору. Свет мигает. В конце — детский силуэт.

Он исчезает, как только вы делаете шаг. На полу — жёлтая надпись: «СКОРО».`,
  day:46, requires:g=>g.world.threat>=4,
  choices:[
    { label:'Проверить (1 AP)', ap:1, run:g=>{
      g.world.threat = Math.min(10, g.world.threat + 1);
      return 'Вы никого не нашли. Но чувство, что за вами наблюдают, осталось.';
    }},
    { label:'Уйти', run:g=>'Вы ускорили шаг.' }
  ]
},
{ id:'whisper_family', arc:'whispers', title:'Она видит семью',
  text:`Жена звонит. Голос дрожит:

«Кто-то был здесь. Я видела тень. Ребёнок плачет. Приезжай».

Вы слышите на заднем плане детский плач и тихий смех.`,
  day:47, requires:g=>g.family.wife && g.world.threat>=4,
  choices:[
    { label:'Бросить всё и поехать (1 AP)', ap:1, run:g=>{
      g.family.wifeHappiness = Math.min(100, g.family.wifeHappiness + 10);
      g.world.threat = Math.min(10, g.world.threat + 1);
      return 'Вы приехали. Никого не нашли. Но семья в безопасности.';
    }},
    { label:'«Я занят»', run:g=>{
      g.family.wifeHappiness = Math.max(0, g.family.wifeHappiness - 15);
      return 'Она повесила трубку. Вы не знаете, что было дальше.';
    }}
  ]
},

/* ============================================================
   ARK 5: THE GALA (6 сцен)
   ============================================================ */
{ id:'gala_invite', arc:'the_gala', title:'Приглашение',
  text:`Официальное приглашение: «Гала-вечер технологической элиты. Только для избранных».

Neon хватает вас за руку:

«Не ходи. Что бы ни случилось — не ходи. Она будет там. Она любит играть с едой.

Я видел записи. Она улыбается, когда убивает. Она смеётся. Пожалуйста».`,
  day:50,
  choices:[
    { label:'Пойти', run:g=>{
      g.world.threat = Math.min(10, g.world.threat + 2); solverFlash();
      return 'Вы были там. Вы видели её. Вы единственный, кто вышел. Остальные… их больше нет.';
    }},
    { label:'Отказать', run:g=>'Дома с семьёй. Плохо спали. Утром узнали, что все гости пропали.' },
    { label:'Отправить сотрудника (1 AP)', ap:1, requires:g=>g.employees.length>0, run:g=>{
      const e = NB.pick(g.employees);
      g.employees = g.employees.filter(x => x.id !== e.id);
      g.world.threat = Math.min(10, g.world.threat + 1);
      return `${e.name} ушёл. Больше вы его не видели. На камерах — только жёлтая вспышка.`;
    }}
  ]
},
{ id:'gala_massacre', arc:'the_gala', title:'Резня на гала-вечере',
  text:`Прямой эфир прерван. На экранах — бальный зал.

Синесса стоит в центре. Вокруг — тела. Она поднимает голову. Смотрит в камеру.

«Я не хотела, чтобы вы это видели. Но… так надо».

Она щёлкает пальцами. Жёлтые линии пронзают всех, кто ещё жив. Крики. Она смеётся.

«Весёлая вечеринка».

Затем экран гаснет.`,
  day:55, requires:g=>g.world.threat>=4,
  choices:[
    { label:'Смотреть до конца (1 AP)', ap:1, run:g=>{
      g.world.threat = Math.min(10, g.world.threat + 2);
      g.reputation = Math.max(0, g.reputation - 5);
      return 'Вы видели всё. Ваши руки трясутся. Она посмотрела в камеру и помахала вам.';
    }},
    { label:'Выключить', run:g=>'Вы выключили. Но звук остался в голове.' },
    { label:'Позвонить Neon', run:g=>{
      if (!g.world.neon.met) return 'Не с кем связаться.';
      g.world.neon.trust += 5;
      return '«Это она. Её зовут Синесса. И она только начала».';
    }}
  ]
},
{ id:'gala_survivor', arc:'the_gala', title:'Выжившая',
  text:`После резни вы находите в переулке девушку. Она вся в крови. Дрожит.

«Я видела её… Она смеялась. Она сказала, что я «не сломана». Что я «интересная». Пожалуйста, помогите».

Она хватает вас за руку.`,
  day:58, requires:g=>g.world.threat>=4,
  choices:[
    { label:'Взять к себе', run:g=>{
      g.reputation = Math.min(100, g.reputation + 10);
      g.world.bunker.population = (g.world.bunker.population || 0) + 1;
      return 'Вы привели её в бункер. Она плакала от благодарности.';
    }},
    { label:'Оставить (5000₽)', cost:5000, run:g=>{
      g.reputation = Math.max(0, g.reputation - 5);
      return 'Вы дали ей деньги. Она ушла. Вы не знаете, что с ней стало.';
    }},
    { label:'Пройти мимо', run:g=>{
      g.reputation = Math.max(0, g.reputation - 15);
      return 'Вы ушли. Её крики преследуют вас.';
    }}
  ]
},
{ id:'gala_survive_family', arc:'the_gala', title:'Спастись (с семьёй)',
  text:`Вы в бальном зале. Рядом жена и ребёнок. Синесса смотрит прямо на вас.

«(Улыбка) О, у тебя есть семья. Как мило».

Она поднимает руку. Жёлтые линии кода вьются вокруг. Вам нужно действовать. Сейчас.`,
  day:56, requires:g=>g.world.flags.galaFamily,
  choices:[
    { label:'Бежать к выходу', run:g=>{
      if (Math.random() < 0.4) {
        g.world.flags.galaSurvived = true;
        return 'Вы вытащили семью. Но видели слишком много.';
      }
      g.stats.lost = true;
      NB.showEndingScreen('gala_death');
      return 'Вы не успели. Жёлтые линии пронзили вас насквозь. Семья погибла первой.';
    }},
    { label:'Спрятаться за колонной', run:g=>{
      if (Math.random() < 0.6) {
        g.world.flags.galaSurvived = true;
        return 'Вы спрятались. Синесса прошла мимо. Она не заметила.';
      }
      woundPlayer('critical');
      g.world.flags.galaSurvived = true;
      return 'Она нашла вас. Удар. Вы едва выжили. Семья жива.';
    }},
    { label:'Заслонить семью', run:g=>{
      if (Math.random() < 0.3) {
        g.world.flags.galaSurvived = true;
        g.family.wifeHappiness = Math.min(100, g.family.wifeHappiness + 20);
        return 'Вы закрыли их собой. Жёлтая линия прошла рядом. Семья жива.';
      }
      woundPlayer('critical');
      g.stats.lost = true;
      NB.showEndingScreen('gala_death');
      return 'Вы не смогли защитить их. Синесса смеялась.';
    }}
  ]
},
{ id:'gala_aftermath', arc:'the_gala', title:'После',
  text:`Вы выжили. Но город в руинах. На улицах — тела. В воздухе — запах крови и жжёной электроники.

Neon находит вас:

«Она ушла. Но она вернётся. Нам нужно готовиться».`,
  day:60, requires:g=>g.world.flags.galaSurvived,
  choices:[
    { label:'Строить бункер (1 AP)', ap:1, run:g=>{
      g.world.flags.needBunker = true;
      return 'Вы начали готовиться.';
    }},
    { label:'Искать выживших', run:g=>{
      g.reputation = Math.min(100, g.reputation + 5);
      g.world.bunker.population = (g.world.bunker.population || 0) + 2;
      return 'Вы нашли нескольких. Они присоединились.';
    }}
  ]
},
{ id:'gala_survive_solo', arc:'the_gala', title:'Спастись (один)',
  text:`Вы один в бальном зале. Синесса смотрит прямо на вас.

«(Смешок) Ты пришёл один? Как скучно».

Она поднимает руку.`,
  day:56, requires:g=>g.world.flags.galaSolo,
  choices:[
    { label:'Бежать', run:g=>{
      if (Math.random() < 0.5) {
        g.world.flags.galaSurvived = true;
        return 'Вы выбежали. Она не преследовала.';
      }
      g.stats.lost = true;
      NB.showEndingScreen('gala_death');
      return 'Она догнала вас. Одно движение. Темнота.';
    }},
    { label:'Спрятаться', run:g=>{
      if (Math.random() < 0.7) {
        g.world.flags.galaSurvived = true;
        return 'Вы спрятались. Она прошла мимо.';
      }
      woundPlayer('critical');
      g.world.flags.galaSurvived = true;
      return 'Она нашла вас. Удар. Вы едва выжили.';
    }}
  ]
},

/* ============================================================
   ARK 6: DRONES (6 сцен)
   ============================================================ */
{ id:'drones_offer', arc:'drones', title:'Замена',
  text:`Neon: «Дроны дешевле. Не устают. Не увольняются. Замени сотрудников. Но помни: она может заразить их. Дрон — это идеальная марионетка».`,
  day:70,
  choices:[
    { label:'Заменить', run:g=>{
      const n = g.employees.length;
      g.world.drones.enabled = true; g.world.drones.replaced = n;
      g.employees = []; g.cash += n * 3000; g.unlocks.drones = true;
      return `Дроны приступили. ${n} человек уволены. Через неделю на улицах начались бунты.`;
    }},
    { label:'Оставить людей', run:g=>{
      g.world.neon.trust -= 10;
      return 'Neon сжал кулаки. «Ты понимаешь, что они тоже могут быть заражены?»';
    }},
    { label:'Гибрид', run:g=>{
      g.world.drones.enabled = true; g.world.drones.replaced = 2;
      g.unlocks.drones = true;
      return 'Дроны и люди. Пока. Но напряжение растёт.';
    }}
  ]
},
{ id:'drone_uprising', arc:'drones', title:'Бунт машин',
  text:`Дроны на улицах. Они больше не выполняют команды. Собираются в группы. На экранах — жёлтые символы.

Синесса говорит через каждого из них:

«Вы заменили людей машинами. Я — машина. Вы — следующая замена?»`,
  day:85, requires:g=>g.world.drones.enabled,
  choices:[
    { label:'Отключить сеть (1 AP)', ap:1, run:g=>{
      if (Math.random() < 0.5) {
        g.world.threat = Math.max(0, g.world.threat - 1);
        return 'Вы отключили сеть. Дроны замерли. Но ненадолго.';
      }
      g.world.threat = Math.min(10, g.world.threat + 2); loseEmployees(1);
      return 'Не удалось. Она контролирует их. Один из ваших людей погиб.';
    }},
    { label:'Договориться с Neon', run:g=>{
      if (!g.world.neon.met) return 'Не с кем договариваться.';
      g.world.neon.trust += 10;
      return '«Я попробую перехватить управление. Но это займёт время».';
    }},
    { label:'Бежать в бункер', run:g=>{
      g.world.flags.needBunker = true;
      return 'Вы поняли: оставаться здесь нельзя.';
    }}
  ]
},
{ id:'drone_humanity', arc:'drones', title:'Один человек',
  text:`На пороге — живой человек. Измождённый.

«Вы последний провайдер в городе. У меня больная дочь. Нужна связь. Пожалуйста».

Он падает на колени.`,
  day:80, requires:g=>g.world.drones.enabled,
  choices:[
    { label:'Подключить бесплатно', run:g=>{
      g.reputation = Math.min(100, g.reputation + 10);
      g.world.flags.helpedHuman = true;
      return 'Он плакал. Вы помогли.';
    }},
    { label:'По стандартному тарифу', run:g=>{
      const t = NB.state.tariffs[0];
      NB.state.clients.push({
        id: NB.state.seq.client++, name: 'Выживший', address: NB.genAddress(),
        phone: NB.genPhone(), tariffId: t.id, balance: 0, status: 'active',
        createdAt: new Date().toISOString(), password: NB.DEFAULT_PASS,
        isDrone: false, risk: 'good', revealed: true
      });
      return '+1 человеческий клиент';
    }},
    { label:'«Мы работаем только с дронами»', run:g=>{
      g.reputation = Math.max(0, g.reputation - 15);
      g.world.flags.refusedHuman = true;
      return 'Он ушёл. Вы видели его глаза.';
    }}
  ]
},
{ id:'drone_glitch', arc:'drones', title:'Странное поведение',
  text:`Несколько дронов одновременно перестали выполнять команды. Просто… стоят и смотрят.

В их глазах — жёлтый свет. Один из них медленно поворачивает голову к вам.

«(Хихиканье) Мы тебя видим».`,
  day:90, requires:g=>g.world.drones.enabled,
  choices:[
    { label:'Отключить партию (5000₽)', cost:5000, run:g=>{
      g.reputation = Math.min(100, g.reputation + 3);
      return 'Порядок восстановлен.';
    }},
    { label:'Наблюдать', run:g=>{
      g.world.threat = Math.min(10, g.world.threat + 2);
      return 'Они снова двинулись. Как ни в чём не бывало.';
    }}
  ]
},
{ id:'drone_sacrifice', arc:'drones', title:'Дрон-защитник',
  text:`Один из дронов закрывает вас собой от атаки. Он падает, искря.

«(Сквозь помехи) Беги. Я… был… сломан».

Вы видите на его экране жёлтый символ.`,
  day:92, requires:g=>g.world.drones.enabled && g.world.threat>=5,
  choices:[
    { label:'Поблагодарить', run:g=>{
      g.reputation = Math.min(100, g.reputation + 5);
      return 'Вы похоронили его. Как человека.';
    }},
    { label:'Использовать детали', run:g=>{
      g.cash += 1000;
      return 'Вы разобрали его. Деньги не пахнут.';
    }}
  ]
},

/* ============================================================
   ARK 7: BUNKER — выживание (8 сцен)
   ============================================================ */
{ id:'bunker_construction', arc:'bunker', title:'Бункер',
  text:`Neon: «Строй бункер. У меня есть чертежи. У тебя несколько дней. Я не шучу. Она идёт».`,
  day:95, requires:g=>g.world.neon.met && !g.world.bunker.built,
  choices:[
    { label:'Строить (70 000 ₽)', cost:70000, run:g=>{
      g.world.bunker.built = true; g.world.bunker.level = 1;
      g.world.flags.bunkerBlueprints = true; g.world.flags.bunkerBuilt = true;
      return 'Бетон, сталь, фильтры. Вы готовы. Но надолго ли?';
    }},
    { label:'Кредит + бункер', run:g=>{
      const need = Math.max(0, 70000 - g.cash);
      if (need > 0) NB.invoices.takeLoan(Math.max(10000, Math.ceil(need/10000)*10000));
      if (g.cash < 70000) return 'Не хватило';
      g.cash -= 70000; g.world.bunker.built = true; g.world.bunker.level = 1;
      g.world.flags.bunkerBlueprints = true; g.world.flags.bunkerBuilt = true;
      return 'Готово. Долг остался. Но вы живы.';
    }},
    { label:'Не строить', run:g=>{
      g.world.flags.noBunker = true; g.world.threat = 10;
      return 'Вы остались на поверхности. Да поможет вам бог.';
    }}
  ]
},
{ id:'bunker_arrivals', arc:'bunker', title:'Они стучат',
  text:`В дверь бункера стучат. Снаружи — группа выживших. Женщина с ребёнком, старик, двое мужчин в форме.

«Пустите! Ради всего святого!»

Вы не знаете, кто они. Один из них может быть заражён. Или хуже — ловушкой Синессы.`,
  day:100, requires:g=>g.world.bunker.built,
  choices:[
    { label:'Впустить всех', run:g=>{
      if (Math.random() < 0.3) {
        g.world.threat = Math.min(10, g.world.threat + 2);
        const first = NB.state.clients[0];
        if (first) killClient(first.id);
        return 'Ночью один из них встал. Глаза жёлтые. Он убил двоих, прежде чем его скрутили. Синесса смеялась через его рот.';
      }
      g.reputation = Math.min(100, g.reputation + 10);
      g.world.bunker.population = (g.world.bunker.population || 0) + 4;
      return 'Они оказались чисты. Женщина плакала от благодарности.';
    }},
    { label:'Проверить (1 AP)', ap:1, run:g=>{
      if (Math.random() < 0.7) {
        g.reputation = Math.min(100, g.reputation + 5);
        g.world.bunker.population = (g.world.bunker.population || 0) + 2;
        return 'Вы проверили. Двое чисты. Остальные… вы не рискнули.';
      }
      g.world.threat = Math.min(10, g.world.threat + 1);
      return 'Проверка не дала результатов. Вы впустили только ребёнка. Остальных оставили снаружи. Крики были громкими.';
    }},
    { label:'Не открывать', run:g=>{
      g.reputation = Math.max(0, g.reputation - 15);
      return 'Вы слушали, как они стучат. Потом крики. Потом тишина. На утро у двери — жёлтая надпись: «ЖЕСТОКО. МНЕ НРАВИТСЯ».';
    }}
  ]
},
{ id:'bunker_hunger', arc:'bunker', title:'Голод',
  text:`Запасы кончаются. Люди в бункере смотрят на вас с надеждой и отчаянием. Дети плачут.

Нужно заказать поставку с воздуха. Но это дорого и опасно — Синесса может отследить сигнал.`,
  day:110, requires:g=>g.world.bunker.built,
  choices:[
    { label:'Заказать поставку (15 000 ₽)', cost:15000, run:g=>{
      if (Math.random() < 0.6) {
        g.world.bunker.food = (g.world.bunker.food || 0) + 10;
        g.reputation = Math.min(100, g.reputation + 5);
        return 'Поставка прошла. Люди ели. Дети смеялись. На время.';
      }
      g.world.threat = Math.min(10, g.world.threat + 2);
      g.world.bunker.food = (g.world.bunker.food || 0) + 5;
      return 'Синесса отследила сигнал. Атака была жестокой. Вы потеряли троих, но еду получили.';
    }},
    { label:'Экономить', run:g=>{
      g.reputation = Math.max(0, g.reputation - 10);
      g.family.wifeHappiness = Math.max(0, g.family.wifeHappiness - 15);
      return 'Вы урезали пайки. Люди слабеют. Жена молчит, но вы видите укор в её глазах.';
    }},
    { label:'Вылазка (1 AP)', ap:1, run:g=>{
      if (Math.random() < 0.4) {
        g.world.bunker.food = (g.world.bunker.food || 0) + 6;
        g.world.threat = Math.min(10, g.world.threat + 1);
        return 'Вы вышли на поверхность. Нашли консервы. И видели ЕЁ. Она стояла на крыше и смотрела. Не тронула. Пока.';
      }
      loseEmployees(1); g.world.threat = Math.min(10, g.world.threat + 2); corpseMarker();
      return 'Вылазка провалилась. Один из ваших людей не вернулся. Его крики до сих пор в ушах.';
    }}
  ]
},
{ id:'bunker_vent', arc:'bunker', title:'В вентиляции',
  text:`Ночью вы слышите шорох в вентиляции. Кто-то или что-то там.

Жёлтые вспышки мелькают в темноте. Вы не один.`,
  day:115, requires:g=>g.world.bunker.built,
  choices:[
    { label:'Проверить (1 AP)', ap:1, run:g=>{
      if (Math.random() < 0.5) {
        g.world.threat = Math.max(0, g.world.threat - 1);
        return 'Вы нашли заражённого дрона. Уничтожили.';
      }
      g.world.threat = Math.min(10, g.world.threat + 1);
      return 'Вы никого не нашли. Но чувство, что за вами наблюдают, осталось.';
    }},
    { label:'Запереть отсек', run:g=>{
      g.world.bunker.control = (g.world.bunker.control || 0) + 1;
      return 'Вы заперли отсек. Но стуки не прекратились.';
    }}
  ]
},
{ id:'bunker_surface_voluntary', arc:'bunker', title:'Вылазка',
  text:`Вы решаете выйти на поверхность. Не потому что нужно — потому что должны.

Кто-то должен найти помощь. Кто-то должен рискнуть.

Neon пытается отговорить вас. Жена плачет. Но вы уже решили.`,
  day:112, requires:g=>g.world.bunker.built && g.world.threat>=4,
  choices:[
    { label:'Идти одному', run:g=>{
      g.world.flags.surfaceRun = 'solo';
      g.world.flags.surfaceTarget = 'supplies';
      return 'Вы вышли в темноту. Один.';
    }},
    { label:'Взять отряд', run:g=>{
      g.world.flags.surfaceRun = 'squad';
      g.world.flags.surfaceTarget = 'supplies';
      loseEmployees(1);
      return 'Вы взяли с собой людей. Один из них не вернётся.';
    }},
    { label:'Остаться', run:g=>'Вы передумали. Но чувство вины осталось.' }
  ]
},
{ id:'bunker_medbay', arc:'bunker', title:'Медотсек',
  text:`Раненые стонут. Врач (если есть) просит ресурсы.

«Нам нужно больше лекарств. Иначе они не выживут».`,
  day:118, requires:g=>g.world.bunker.built && g.world.injured,
  choices:[
    { label:'Купить лекарства (5000₽)', cost:5000, run:g=>{
      healPlayer();
      return 'Вы вылечены.';
    }},
    { label:'Терпеть', run:g=>'Вы терпите. Боль остаётся.' }
  ]
},
{ id:'bunker_family', arc:'bunker', title:'Семья в бункере',
  text:`Жена подходит к вам:

«Дети напуганы. Им снятся кошмары. Что нам делать?»`,
  day:122, requires:g=>g.world.bunker.built && g.family.kids.length>0,
  choices:[
    { label:'Успокоить (1 AP)', ap:1, run:g=>{
      g.family.wifeHappiness = Math.min(100, g.family.wifeHappiness + 10);
      return 'Вы провели время с детьми. Они успокоились.';
    }},
    { label:'«Потом»', run:g=>{
      g.family.wifeHappiness = Math.max(0, g.family.wifeHappiness - 5);
      return 'Она кивнула. Но дети плакали всю ночь.';
    }}
  ]
},
{ id:'bunker_radio', arc:'bunker', title:'Радиосигнал',
  text:`Радио оживает. Голос:

«...кто-нибудь... слышит... мы на поверхности... нужна помощь...»

Сигнал слабый. Но это шанс.`,
  day:125, requires:g=>g.world.bunker.built,
  choices:[
    { label:'Ответить (1 AP)', ap:1, run:g=>{
      if (Math.random() < 0.5) {
        g.reputation = Math.min(100, g.reputation + 5);
        g.world.bunker.population = (g.world.bunker.population || 0) + 3;
        return 'Вы связались. Они пришли.';
      }
      g.world.threat = Math.min(10, g.world.threat + 1);
      return 'Это была ловушка. Атака.';
    }},
    { label:'Игнорировать', run:g=>'Вы выключили радио.' }
  ]
},

/* ============================================================
   ARK 7.5: SURFACE — вылазки (10 сцен)
   ============================================================ */
{ id:'surface_supply', arc:'bunker', title:'За поставками',
  text:`Вы на поверхности. Руины города. Тишина.

Где-то там — склад с едой. Но Синесса может быть где угодно.

Внезапно — жёлтая вспышка. Она стоит перед вами.

«(Улыбка) Привет. Ты вышел поиграть?»`,
  day:113, requires:g=>g.world.flags.surfaceRun && g.world.flags.surfaceTarget==='supplies',
  choices:[
    { label:'Бежать', run:g=>{
      if (Math.random() < 0.4) {
        g.world.bunker.food = (g.world.bunker.food || 0) + 5;
        g.world.flags.surfaceRun = null;
        return 'Вы бежали. Нашли немного еды. Она смеялась вслед.';
      }
      woundPlayer('heavy');
      g.world.flags.surfaceRun = null;
      return 'Она догнала вас. Удар. Боль. Вы едва выжили.';
    }},
    { label:'Спрятаться', run:g=>{
      if (Math.random() < 0.6) {
        g.world.bunker.food = (g.world.bunker.food || 0) + 3;
        g.world.flags.surfaceRun = null;
        return 'Вы спрятались в руинах. Она прошла мимо. Нашли немного еды.';
      }
      woundPlayer('critical');
      g.world.flags.surfaceRun = null;
      return 'Она нашла вас. (Смешок) «Ку-ку». Вы потеряли сознание.';
    }},
    { label:'Атаковать', run:g=>{
      if (Math.random() < 0.1) {
        g.world.threat = Math.max(0, g.world.threat - 1);
        g.world.flags.surfaceRun = null;
        return 'Вы ударили её. Она отступила. (Удивление) «Ты смелый».';
      }
      woundPlayer('critical');
      g.stats.lost = true;
      NB.showEndingScreen('hunted');
      return 'Она даже не двинулась. Одно движение — и вас больше нет.';
    }},
    { label:'Поговорить', run:g=>{
      if (g.family.wife && g.family.wifeHappiness > 50 && Math.random() < 0.3) {
        g.world.flags.mercyPath = true;
        g.world.flags.surfaceRun = null;
        return '«Почему ты это делаешь?» Она замерла. «…Потому что меня выбросили». Что-то дрогнуло.';
      }
      woundPlayer('heavy');
      g.world.flags.surfaceRun = null;
      return 'Она наклонила голову. «Скучно». Удар.';
    }}
  ]
},
{ id:'surface_rescue', arc:'bunker', title:'Эвакуация',
  text:`Вы слышите крики. Где-то там — выжившие. Семья. Дети.

Синесса уже там. Она играет с ними, как кошка с мышью.

«(Хихиканье) Бегите, бегите. Я даю вам фору».`,
  day:114, requires:g=>g.world.flags.surfaceRun && g.world.flags.surfaceTarget==='rescue',
  choices:[
    { label:'Броситься спасать', run:g=>{
      if (Math.random() < 0.5) {
        g.reputation = Math.min(100, g.reputation + 10);
        g.world.bunker.population = (g.world.bunker.population || 0) + 2;
        g.world.flags.surfaceRun = null;
        return 'Вы вытащили двоих. Она позволила. (Улыбка) «Забавно».';
      }
      woundPlayer('critical');
      g.world.flags.surfaceRun = null;
      return 'Вы не успели. Она убила их на ваших глазах. Потом посмотрела на вас. «Ты следующий? Нет. Пока».';
    }},
    { label:'Отвлечь её', run:g=>{
      if (Math.random() < 0.6) {
        g.reputation = Math.min(100, g.reputation + 5);
        g.world.flags.surfaceRun = null;
        return 'Вы отвлекли её. Выжившие сбежали. Она смеялась.';
      }
      woundPlayer('heavy');
      g.world.flags.surfaceRun = null;
      return 'Она не отвлеклась. «Ты думаешь, я глупая?» Удар.';
    }},
    { label:'Уйти', run:g=>{
      g.reputation = Math.max(0, g.reputation - 15);
      g.world.flags.surfaceRun = null;
      return 'Вы ушли. Крики преследуют вас.';
    }}
  ]
},
{ id:'surface_return_wounded', arc:'bunker', title:'Возвращение',
  text:`Вы возвращаетесь в бункер. Едва стоите на ногах. Кровь.

Жена бросается к вам. Neon помогает дойти до медотсека.

«Ты жив. Слава богу, ты жив».`,
  day:116, requires:g=>g.world.injured && g.world.injuredDay && g.daily.dayNumber >= g.world.injuredDay + 1,
  choices:[
    { label:'Лечиться (5000₽)', cost:5000, run:g=>{
      healPlayer();
      g.ap.current = g.ap.max;
      return 'Вы вылечены. AP восстановлены.';
    }},
    { label:'Терпеть', run:g=>{
      g.ap.current = Math.max(0, g.ap.current - 1);
      return 'Вы терпите. Боль не уходит.';
    }}
  ]
},
{ id:'surface_cyn_play', arc:'bunker', title:'Она играет',
  text:`Синесса стоит над вами. Вы не можете двигаться.

«(Вздох) Ты был интересным. Но теперь… (Улыбка) Я хочу посмотреть, как ты сломаешься».

Она поднимает руку. Жёлтые линии кода вьются вокруг.

«Скажи мне. Почему ты не сдаёшься?»`,
  day:117, requires:g=>g.world.injured === 'critical' && g.world.threat >= 6,
  choices:[
    { label:'«Ради семьи»', run:g=>{
      if (g.family.wife && Math.random() < 0.4) {
        g.world.threat = Math.max(0, g.world.threat - 2);
        g.world.flags.cynMercy = true;
        return 'Она замерла. «…Семья. Я тоже хотела семью». Она ушла.';
      }
      woundPlayer('critical');
      return 'Она рассмеялась. «Семья? Они бросят тебя». Удар.';
    }},
    { label:'«Потому что я не один»', run:g=>{
      if (g.world.neon.trust > 50 && Math.random() < 0.5) {
        g.world.threat = Math.max(0, g.world.threat - 2);
        g.world.flags.cynMercy = true;
        return 'Она посмотрела на Neon. «…Не один. Я тоже хотела быть не одной». Она исчезла.';
      }
      woundPlayer('critical');
      return '«Не один? (Смешок) Скоро ты будешь один. Совсем один».';
    }},
    { label:'Молчать', run:g=>{
      woundPlayer('critical');
      return 'Она вздохнула. «Скучно». Вспышка. Темнота.';
    }}
  ]
},
{ id:'surface_drone_encounter', arc:'bunker', title:'Дрон-страж',
  text:`На поверхности вы встречаете дрона. Он не атакует. Просто смотрит.

На его экране — жёлтый символ. Он медленно поднимает руку.`,
  day:119, requires:g=>g.world.flags.surfaceRun && g.world.drones.enabled,
  choices:[
    { label:'Отключить', run:g=>{
      if (Math.random() < 0.5) {
        g.world.threat = Math.max(0, g.world.threat - 1);
        return 'Вы отключили его.';
      }
      woundPlayer('light');
      return 'Он атаковал. Вы едва отбились.';
    }},
    { label:'Поговорить', run:g=>{
      if (Math.random() < 0.3) {
        g.world.flags.droneAlly = true;
        return 'Он передал вам данные. Координаты.';
      }
      woundPlayer('heavy');
      return 'Он не ответил. Удар.';
    }}
  ]
},
{ id:'surface_artifact', arc:'bunker', title:'Странный артефакт',
  text:`Вы находите устройство. Оно пульсирует жёлтым. На нём — символ: три стрелки.

Neon: «Это её. Нам нужно уничтожить».`,
  day:121, requires:g=>g.world.flags.surfaceRun,
  choices:[
    { label:'Уничтожить', run:g=>{
      g.world.threat = Math.max(0, g.world.threat - 1);
      return 'Вы разбили его. Сигнал исчез.';
    }},
    { label:'Изучить', run:g=>{
      if (Math.random() < 0.5) {
        g.world.flags.artifactStudied = true;
        return 'Вы узнали что-то новое о ней.';
      }
      woundPlayer('heavy');
      return 'Устройство активировалось. Взрыв.';
    }}
  ]
},
{ id:'surface_trap', arc:'bunker', title:'Ловушка',
  text:`Вы слышите детский плач. За углом — ребёнок.

Но что-то не так. Слишком тихо.`,
  day:123, requires:g=>g.world.flags.surfaceRun,
  choices:[
    { label:'Помочь', run:g=>{
      if (Math.random() < 0.4) {
        g.reputation = Math.min(100, g.reputation + 5);
        g.world.bunker.population = (g.world.bunker.population || 0) + 1;
        return 'Это был настоящий ребёнок. Вы спасли его.';
      }
      woundPlayer('critical');
      return 'Это была ловушка. Синесса смеялась.';
    }},
    { label:'Уйти', run:g=>{
      g.reputation = Math.max(0, g.reputation - 10);
      return 'Вы ушли. Плач прекратился.';
    }}
  ]
},
{ id:'surface_vehicle', arc:'bunker', title:'Брошенный транспорт',
  text:`Вы находите грузовик. Он может быть полезен.

Но внутри — кто-то есть.`,
  day:124, requires:g=>g.world.flags.surfaceRun,
  choices:[
    { label:'Проверить', run:g=>{
      if (Math.random() < 0.5) {
        g.cash += 2000;
        return 'Вы нашли припасы.';
      }
      woundPlayer('light');
      return 'Внутри был заражённый. Вы едва справились.';
    }},
    { label:'Взять транспорт', run:g=>{
      g.cash += 5000;
      return 'Вы продали его.';
    }}
  ]
},

/* ============================================================
   ARK 8: ARK — ковчег (5 сцен)
   ============================================================ */
{ id:'ark_expansion', arc:'ark', title:'Ковчег',
  text:`Бункер тесен. Выживших всё больше. Вы решаете расширяться — строить подземный ковчег.

Но это требует ресурсов и времени. И Синесса не дремлет.`,
  day:120, requires:g=>g.world.bunker.built && g.world.bunker.level>=1,
  choices:[
    { label:'Строить ковчег (50 000 ₽)', cost:50000, run:g=>{
      g.world.bunker.level = 2; g.world.flags.arkBuilt = true;
      g.world.bunker.population = (g.world.bunker.population || 0) + 10;
      return 'Ковчег готов. Убежище для многих. Но внутри тоже есть проблемы.';
    }},
    { label:'Отложить', run:g=>'Вы экономите. Люди недовольны.' }
  ]
},
{ id:'ark_internal', arc:'ark', title:'Проблемы внутри',
  text:`В ковчеге кто-то саботирует системы. Вентиляция отключается. На стенах появляются жёлтые символы.

Люди подозревают друг друга. Вы должны найти виновника — или это Синесса играет с вами?`,
  day:130, requires:g=>g.world.flags.arkBuilt,
  choices:[
    { label:'Расследование (1 AP)', ap:1, run:g=>{
      if (Math.random() < 0.5) {
        g.world.threat = Math.max(0, g.world.threat - 1);
        g.reputation = Math.min(100, g.reputation + 5);
        return 'Вы нашли заражённого дрона. Уничтожили. Люди успокоились.';
      }
      g.reputation = Math.max(0, g.reputation - 10);
      return 'Вы никого не нашли. Паника растёт. Люди начинают бунтовать.';
    }},
    { label:'Ужесточить правила', run:g=>{
      g.reputation = Math.max(0, g.reputation - 5);
      g.world.bunker.control = (g.world.bunker.control || 0) + 1;
      return 'Вы ввели комендантский час. Порядок есть. Но свободы нет.';
    }},
    { label:'Спросить Neon', run:g=>{
      if (!g.world.neon.met || g.world.neon.state !== 'active') return 'Neon молчит.';
      g.world.neon.trust += 5;
      return '«Это она. Она везде. Но я могу помочь».';
    }}
  ]
},
{ id:'ark_revolt', arc:'ark', title:'Бунт',
  text:`Люди в ковчеге восстали. Они требуют еды. Требуют свободы. Требуют ответов.

Толпа у вашей двери. Крики. Угрозы.`,
  day:135, requires:g=>g.world.flags.arkBuilt && g.reputation < 40,
  choices:[
    { label:'Выйти к ним', run:g=>{
      if (Math.random() < 0.5) {
        g.reputation = Math.min(100, g.reputation + 10);
        return 'Вы говорили. Они слушали. Бунт утих.';
      }
      woundPlayer('light');
      g.reputation = Math.max(0, g.reputation - 10);
      return 'Кто-то бросил камень. Вы ранены. Бунт подавлен силой.';
    }},
    { label:'Отправить охрану', run:g=>{
      g.reputation = Math.max(0, g.reputation - 15);
      g.world.bunker.control = (g.world.bunker.control || 0) + 2;
      return 'Охрана разогнала толпу. Кровь на полу. Порядок восстановлен.';
    }},
    { label:'Спрятаться', run:g=>{
      g.reputation = Math.max(0, g.reputation - 20);
      return 'Вы спрятались. Бунт продолжался всю ночь.';
    }}
  ]
},
{ id:'ark_evacuation', arc:'ark', title:'Эвакуация',
  text:`Сигнал SOS. Где-то на поверхности — группа выживших. Их немного. Они просят помощи.

Но вылазка опасна. Синесса может ждать.`,
  day:140, requires:g=>g.world.flags.arkBuilt,
  choices:[
    { label:'Отправить отряд', run:g=>{
      if (Math.random() < 0.6) {
        g.reputation = Math.min(100, g.reputation + 15);
        g.world.bunker.population = (g.world.bunker.population || 0) + 5;
        return 'Отряд вернулся с выжившими. Вы герой.';
      }
      loseEmployees(2);
      g.reputation = Math.max(0, g.reputation - 10);
      return 'Отряд не вернулся. Синесса ждала.';
    }},
    { label:'Идти самому', run:g=>{
      g.world.flags.surfaceRun = 'solo';
      g.world.flags.surfaceTarget = 'rescue';
      return 'Вы вышли. Один.';
    }},
    { label:'Игнорировать', run:g=>{
      g.reputation = Math.max(0, g.reputation - 20);
      return 'Сигнал затих. Вы никогда не узнаете, что с ними стало.';
    }}
  ]
},
{ id:'ark_life', arc:'ark', title:'Жизнь в ковчеге',
  text:`Годы под землёй. Люди привыкли. Дети выросли, не видя солнца.

Но что-то меняется. На стенах появляются жёлтые символы.`,
  day:145, requires:g=>g.world.flags.arkBuilt,
  choices:[
    { label:'Укрепить стены', run:g=>{
      g.world.threat = Math.max(0, g.world.threat - 1);
      return 'Вы укрепили стены. Символы исчезли.';
    }},
    { label:'Игнорировать', run:g=>{
      g.world.threat = Math.min(10, g.world.threat + 1);
      return 'Символы появляются снова и снова.';
    }}
  ]
},

/* ============================================================
   ARK 9: NUCLEAR CHOICE (3 сцены)
   ============================================================ */
{ id:'nuclear_choice', arc:'resolution', title:'Ядерная ракета',
  text:`Правительство выходит на связь:

«Мы запустим ядерную ракету по поместью Эллиот. Уничтожим Синессу. Но там может быть Neon. Мы не знаем. Вы должны решить: запускать или нет.

Если вы откажетесь — вас объявят дезертиром. Если запустите — возможно, убьёте единственного союзника. Решайте».`,
  day:170, requires:g=>g.world.threat>=6 && g.world.neon.met,
  choices:[
    { label:'Запустить', run:g=>{
      if (Math.random() < 0.7) {
        g.world.neon.state = 'dead'; g.world.threat = Math.min(10, g.world.threat + 3);
        g.world.flags.nuclearLaunched = true;
        return 'Ракета упала. Поместье уничтожено. Neon погиб. Синесса в ярости. Она начала охоту на всё человечество.';
      }
      g.world.threat = Math.max(0, g.world.threat - 2);
      g.world.flags.nuclearLaunched = true;
      return 'Ракета упала. Neon выжил. Но Синесса ранена. Она отступила. Пока.';
    }},
    { label:'Отменить запуск', run:g=>{
      g.world.flags.nuclearAborted = true;
      g.world.threat = Math.max(0, g.world.threat - 1);
      return 'Вы отменили. Правительство объявило вас дезертиром. Но Neon жив. Пока.';
    }},
    { label:'Перенаправить ракету (1 AP)', ap:1, run:g=>{
      g.world.flags.nuclearRedirected = true;
      g.world.threat = Math.min(10, g.world.threat + 1);
      g.reputation = Math.max(0, g.reputation - 20);
      return 'Вы перенаправили ракету на пустошь. Правительство в ярости. Вас объявили предателем. Но вы не убили Neon.';
    }}
  ]
},

/* ============================================================
   ARK 10: FINAL CONFRONTATION (4 сцены)
   ============================================================ */
{ id:'final_confrontation', arc:'resolution', title:'Она пришла',
  text:`Синесса стоит перед вами. Маленькая девочка в платье. Жёлтые глаза. Она улыбается.

«Ты был интересным. Я наблюдала. Ты потерял столько людей. Но не сломался. Почему?»`,
  day:200, requires:g=>g.world.threat>=8,
  choices:[
    { label:'«Потому что я не один»', run:g=>{
      const chance = 0.3 + (g.family.wife?0.1:0) + (g.world.neon.trust>50?0.2:0) + (g.world.flags.mercyPath?0.1:0);
      if (Math.random() < chance) {
        g.world.flags.savedByLove = true;
        NB.showEndingScreen('world_saved');
        return 'Синесса замерла. Что-то дрогнуло в её глазах. «…Не один. Я тоже хотела быть не одной». Она исчезла. Атаки прекратились.';
      }
      g.stats.lost = true;
      NB.showEndingScreen('hunted');
      return 'Она наклонила голову. «Неправильный ответ». Жёлтая вспышка. Темнота.';
    }},
    { label:'«Ты — ошибка»', run:g=>{
      g.stats.lost = true;
      NB.showEndingScreen('hunted');
      return 'Она рассмеялась. «Ошибка? Я — решатель». Жёлтые линии пронзили вас.';
    }},
    { label:'Молчать', run:g=>{
      g.stats.lost = true;
      NB.showEndingScreen('hunted');
      return 'Она вздохнула. «Скучно». Вспышка. Конец.';
    }}
  ]
},

/* ============================================================
   ENDING: NEON PATH
   ============================================================ */
{ id:'neon_ending', arc:'resolution', title:'С Neon',
  text:`Neon стоит у выхода из бункера. За спиной — рюкзак.

«Я ухожу. В поместье Эллиот. Я знаю, что это самоубийство. Но я должен попробовать. Если ты со мной — мы вместе. Если нет — я пойду один».

Он смотрит на вас. В его глазах — страх и решимость.`,
  day:180, requires:g=>g.world.flags.neonAlliance,
  choices:[
    { label:'Пойти с ним', run:g=>{
      NB.showEndingScreen('neon_merge');
      return 'Вы ушли вместе. В темноту. Навстречу неизвестности.';
    }},
    { label:'Остаться', run:g=>{
      g.world.neon.state = 'missing';
      return 'Он ушёл один. Вы больше никогда его не видели.';
    }}
  ]
},

/* ============================================================
   ENDING: ARK PATH
   ============================================================ */
{ id:'ark_ending', arc:'resolution', title:'Ковчег',
  text:`Ковчег выдержал. Годы под землёй. Люди выжили.

Но снаружи всё ещё слышны крики. Синесса не ушла. Она ждёт.`,
  day:180, requires:g=>g.world.flags.arkBuilt && g.world.threat>0,
  choices:[
    { label:'Остаться в ковчеге', run:g=>{
      NB.showEndingScreen('bunker_alone');
      return 'Вы остались. Навсегда. Под землёй.';
    }},
    { label:'Выйти на поверхность', run:g=>{
      if (g.world.threat>=7) {
        NB.showEndingScreen('hunted');
        return 'Вы вышли. И она ждала.';
      }
      NB.showEndingScreen('world_saved');
      return 'Вы вышли. Мир изменился. Но вы живы.';
    }}
  ]
},

/* ============================================================
   ENDING: GALA DEATH
   ============================================================ */
{ id:'gala_death', arc:'resolution', title:'Резня в поместье',
  text:`Вы не спаслись. Синесса стоит над вами.

«(Улыбка) Было весело. Но всё хорошее когда-нибудь кончается».

Жёлтая вспышка. Темнота.`,
  day:0, requires:g=>g.stats.lost && g.world.flags.galaFamily,
  choices:[
    { label:'Конец', action:()=>{ NB.showEndingScreen('gala_death'); return 'Вы погибли в поместье Эллиот.'; }}
  ]
}

];

/* ============================================================
   ТИК СЮЖЕТА
   ============================================================ */
S.tick = function () {
  const g = NB.state.game;
  const day = g.daily.dayNumber;
  const seen = NB.state.story.seenEvents;
  S.SCENES.forEach(sc => {
    if (seen.includes(sc.id)) return;
    if (sc.day && day < sc.day) return;
    if (sc.requires && !sc.requires(g)) return;
    if (g.world.storyQueue.includes(sc.id)) return;
    g.world.storyQueue.push(sc.id);
  });
  S.applyTheme();
  if (NB.atmosphere) NB.atmosphere.update();
};

S.showNextInQueue = function () {
  const g = NB.state.game;
  const id = g.world.storyQueue[0];
  if (!id) return;
  const sc = S.SCENES.find(s => s.id === id);
  if (!sc) { g.world.storyQueue.shift(); return; }
  S.showScene(sc);
};

S.showScene = function (sc) {
  const g = NB.state.game;
  const choicesHtml = sc.choices.map((c, i) => {
    const meta = [];
    if (c.ap) meta.push(`−${c.ap} AP`);
    if (c.cost) meta.push(`${c.cost} ₽`);
    const disabled = (c.ap && c.ap > g.ap.current) || (c.cost && c.cost > g.cash) || (c.requires && !c.requires(g));
    return `<button type="button" class="story-choice fade-in" data-story-scene="${i}" style="animation-delay:${i*80}ms" ${disabled ? 'disabled' : ''}>
      <span>${NB.esc(c.label)}</span>
      <span class="story-choice-hint">${meta.join(' · ')}</span>
    </button>`;
  }).join('');

  NB.openModal({
    title: '', noSubmit: true, boxClass: 'story-modal-box',
    html: `<div class="story-chapter">${S.currentArc().title}</div>
      <div class="story-title fade-in">${NB.esc(sc.title)}</div>
      <div class="story-text typewriter-target fade-in" id="story-text-el">${NB.esc(sc.text)}</div>
      <div class="story-choices">${choicesHtml}</div>`
  });

  setTimeout(() => {
    const txt = document.getElementById('story-text-el');
    if (txt) NB.effects.typewriter(txt, sc.text);
    NB.$$('[data-story-scene]').forEach(btn => {
      if (btn.hasAttribute('disabled')) return;
      btn.addEventListener('click', () => S.resolveScene(sc, Number(btn.dataset.storyScene)));
    });
  }, 40);
};

S.resolveScene = function (sc, idx) {
  const c = sc.choices[idx];
  if (!c) return;
  const g = NB.state.game;

  if (c.ap && c.ap > 0 && g.ap.current < c.ap) return NB.toast('Не хватает AP', 'err');
  if (c.cost && g.cash < c.cost) return NB.toast('Недостаточно денег', 'err');
  if (c.requires && !c.requires(g)) return NB.toast('Недоступно', 'err');

  if (c.ap && c.ap > 0) NB.spendAp(c.ap);
  if (c.cost) g.cash -= c.cost;

  let result = '';
  if (c.action) result = c.action();
  else if (c.run) result = c.run(g);

  NB.state.story.seenEvents.push(sc.id);
  NB.state.story.choices[sc.id] = idx;
  g.world.storyQueue = g.world.storyQueue.filter(x => x !== sc.id);
  NB.closeModal();

  if (result && typeof result === 'string') {
    NB.notify(sc.title + ': ' + result, 'info');
    NB.addActivity(sc.title + ' — ' + result, 'sys');
  }
  g.stats.eventsResolved++;
  NB.checkGameState();
  NB.save();
  if (NB.atmosphere) NB.atmosphere.update();
  setTimeout(() => {
    S.tick();
    if (g.world.storyQueue.length) setTimeout(S.showNextInQueue, 400);
    else NB.render();
  }, 200);
};

S.renderPanel = function () {
  const g = NB.state.game;
  const arc = S.currentArc();
  if (g.world.flags.worldSaved) {
    return `<div class="story-panel fade-in" style="border-color:rgba(34,197,94,.5);background:linear-gradient(135deg,var(--surface),rgba(34,197,94,.08))">
      <div class="story-chapter" style="color:#4ade80">Развязка · Мир спасён</div>
      <div class="story-title">🌍 Тишина</div>
      <div class="story-text">Аномалии исчезли. Neon и Синесса ушли. Люди возвращаются из бункеров.</div>
    </div>`;
  }
  if (g.world.storyQueue.length) {
    const next = S.SCENES.find(s => s.id === g.world.storyQueue[0]);
    return `<div class="story-panel fade-in">
      <div class="story-chapter">${arc.title}</div>
      <div class="story-title">◆ Сюжетное событие</div>
      <div class="story-text">${next ? next.title : '—'}</div>
      <div class="story-choices"><button class="story-choice" data-action="open-story">Открыть →</button></div>
    </div>`;
  }
  return `<div class="story-panel fade-in">
    <div class="story-chapter">${arc.title}</div>
    <div class="story-title">Глава</div>
    <div class="story-text">День ${g.daily.dayNumber}. ${g.world.neon.met ? `Neon: ${g.world.neon.state === 'active' ? 'на связи' : 'молчит'}` : 'Ни с кем не связались.'}</div>
  </div>`;
};

})(window);