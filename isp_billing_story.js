/* isp_billing_story.js — длинный, медленный, ветвистый сюжет */
(function (global) {
'use strict';
const NB = global.NB;
const S = NB.story = NB.story || {};

/* ============================================================
   АРКИ СЮЖЕТА (медленное продвижение)
   ============================================================ */
S.ARCS = [
  { id: 'ordinary',       title: 'Обычный провайдер',     from: 0,   to: 5,    theme: '#ff6b00' },
  { id: 'first_signal',   title: 'Странный сигнал',       from: 5,   to: 15,   theme: '#ff9500' },
  { id: 'neon_shadow',    title: 'Neon Shadow',           from: 15,  to: 30,   theme: '#ff7a00' },
  { id: 'whispers',       title: 'Шёпот в сети',          from: 30,  to: 50,   theme: '#a855f7' },
  { id: 'the_gala',       title: 'Гала-вечер',            from: 50,  to: 70,   theme: '#dc2626' },
  { id: 'drones',         title: 'Век дронов',            from: 70,  to: 95,   theme: '#0ea5e9' },
  { id: 'bunker',         title: 'Под землёй',            from: 95,  to: 130,  theme: '#475569' },
  { id: 'silence',        title: 'Тишина',                from: 130, to: 180,  theme: '#0f172a' },
  { id: 'resolution',     title: 'Развязка',              from: 180, to: 999,  theme: '#22c55e' }
];

S.currentArc = function () {
  const d = NB.state.game.daily.dayNumber;
  for (let i = S.ARCS.length - 1; i >= 0; i--) {
    if (d >= S.ARCS[i].from) return S.ARCS[i];
  }
  return S.ARCS[0];
};

S.applyTheme = function () {
  const arc = S.currentArc();
  document.documentElement.style.setProperty('--story-theme', arc.theme);
  document.body.dataset.arc = arc.id;
};

/* ============================================================
   СЦЕНЫ СЮЖЕТА
   ============================================================ */
S.SCENES = [
  /* ---------- АРКА "Странный сигнал" ---------- */
  {
    id: 'signal_1',
    arc: 'first_signal',
    title: 'Странное письмо',
    text: 'Поздний вечер. На общий ящик приходит сообщение без темы. Отправитель — [ДАННЫЕ УДАЛЕНЫ]. Внутри только картинка: тёмный экран, на нём — маленькая фиолетовая точка и подпись «Твой провайдер — мой билет». Вложение: attachment_404.txt',
    day: 5,
    choices: [
      { label: 'Открыть вложение', hint: 'Узнать больше', run: (g) => {
          g.world.flags.openedFile = true;
          g.world.threat = 1;
          NB.effects.shake(600);
          return 'Файл открылся. Пусто. Или... кто-то оставил след.';
        }},
      { label: 'Удалить и забыть', hint: 'Спокойнее', run: (g) => {
          g.world.flags.deletedFile = true;
          return 'Вы стёрли письмо. Но чувство осталось.';
        }},
      { label: 'Переслать в техподдержку', hint: 'Проверить источник', run: (g) => {
          g.world.flags.reportedSpam = true;
          return 'Специалист ответил через час: «источник не определяется».';
        }}
    ]
  },
  {
    id: 'signal_2',
    arc: 'first_signal',
    title: 'Шорох в проводах',
    text: 'Спустя несколько дней в офисе мерцает свет. Сотрудник жалуется: «Кто-то ходит по нашим логам». В журнале — запись в 03:33 с обращением к вашему биллингу. Обратный адрес — пустой.',
    day: 9,
    requires: g => g.world.flags.openedFile,
    choices: [
      { label: 'Проверить лично ночью', hint: 'Возможно, опасно', run: (g) => {
          g.world.flags.nightShift = true;
          g.world.threat = Math.min(5, g.world.threat + 1);
          NB.effects.shake(400);
          return 'Ночью вы видите, как в темноте экрана моргает точка. Она смотрит в ответ.';
        }},
      { label: 'Заплатить аудит', hint: '-3000 ₽', run: (g) => {
          if (g.cash < 3000) return 'Не хватило денег';
          g.cash -= 3000;
          g.world.flags.auditDone = true;
          return 'Аудит ничего не нашёл. Или нашёл и промолчал.';
        }},
      { label: 'Забыть', hint: 'Нейтрально', run: (g) => {
          return 'Вы отвлеклись на работу.';
        }}
    ]
  },

  /* ---------- АРКА "Neon Shadow" ---------- */
  {
    id: 'neon_contact',
    arc: 'neon_shadow',
    title: 'Neon Shadow',
    text: 'Неделя прошла. Сегодня в дверь постучали. На пороге — человек в светящейся фиолетовой куртке. «Я — Neon Shadow. Разработчик Starve Neon. Мне нужна помощь. Моя игра — не просто игра. Это... канал. Мне нужны серверы и защита. Если поможешь — я не останусь в долгу.»',
    day: 15,
    choices: [
      { label: 'Впустить', hint: 'Начать долгий путь', run: (g) => {
          g.world.neon.met = true;
          g.world.neon.trust = 10;
          g.world.flags.neonEntered = true;
          g.world.arc = 'neon_shadow';
          return 'Он провёл у вас три часа. Говорит — «всё сложнее, чем кажется».';
        }},
      { label: 'Отказать', hint: 'Безопаснее', run: (g) => {
          g.world.flags.neonRefused = true;
          return 'Он ушёл, не оборачиваясь. Через час ваши серверы подверглись странной атаке.';
        }}
    ]
  },
  {
    id: 'neon_request_1',
    arc: 'neon_shadow',
    title: 'Первая просьба',
    text: 'Neon Shadow присылает сообщение: «Мне нужен доступ к твоему трафику. Ненадолго. Твои клиенты ничего не заметят. Но мне это очень поможет».',
    day: 20,
    requires: g => g.world.flags.neonEntered,
    choices: [
      { label: 'Разрешить', hint: 'Доверие +', run: (g) => {
          g.world.neon.trust += 15;
          g.world.neon.helped++;
          return 'Он загрузил что-то ночью. Утром ваш трафик был чище, чем обычно.';
        }},
      { label: 'Спросить подробности', hint: 'Осторожно', run: (g) => {
          g.world.neon.trust += 5;
          g.world.flags.neonSkeptical = true;
          return 'Он долго молчал. Потом сказал: «Ты прав. Я всё объясню».';
        }},
      { label: 'Отказать', hint: 'Он расстроится', run: (g) => {
          g.world.neon.trust -= 10;
          return 'Он поблагодарил и отключился.';
        }}
    ]
  },
  {
    id: 'neon_request_2',
    arc: 'neon_shadow',
    title: 'Просьба о деньгах',
    text: 'Neon просит 15 000 ₽. «Это на разработку. У меня закончились сбережения. Я обещаю вернуть. Или ты получишь эксклюзивный контент для клиентов».',
    day: 26,
    requires: g => g.world.neon.met && g.world.neon.trust > 5,
    choices: [
      { label: 'Дать денег', hint: '-15 000 ₽, доверие +25', run: (g) => {
          if (g.cash < 15000) return 'Не хватило денег';
          g.cash -= 15000;
          g.world.neon.trust += 25;
          g.world.neon.helped++;
          return 'Он расплакался. «Я запомню это».';
        }},
      { label: 'Дать меньше', hint: '-5 000 ₽, доверие +10', run: (g) => {
          if (g.cash < 5000) return 'Не хватило';
          g.cash -= 5000;
          g.world.neon.trust += 10;
          g.world.neon.helped++;
          return 'Он кивнул. «Любая помощь важна».';
        }},
      { label: 'Отказать', hint: 'Доверие −15', run: (g) => {
          g.world.neon.trust -= 15;
          return 'Он больше не писал два дня.';
        }}
    ]
  },

  /* ---------- АРКА "Шёпот в сети" ---------- */
  {
    id: 'whisper_1',
    arc: 'whispers',
    title: 'Странные новости',
    text: 'В утренней сводке — заметка: «На технологической конференции в Осло произошёл инцидент: 40 участников не выходят на связь. Сотрудники сообщают о странных видениях перед пропажей».',
    day: 32,
    choices: [
      { label: 'Связаться с Neon', hint: 'Спросить напрямую', run: (g) => {
          g.world.flags.askedAboutOslo = true;
          g.world.neon.trust += 5;
          return 'Neon ответил сухо: «Не лезь. Пока рано».';
        }},
      { label: 'Проигнорировать', hint: 'Это не моё дело', run: (g) => {
          return 'Вы переключились на работу.';
        }},
      { label: 'Написать в редакцию', hint: 'Узнать больше', run: (g) => {
          g.cash -= 500;
          g.world.flags.pressContact = true;
          return 'Журналист ответил: «Будьте осторожны. За нами уже следят».';
        }}
    ]
  },
  {
    id: 'whisper_2',
    arc: 'whispers',
    title: 'Гость в офисе',
    text: 'Сотрудники жалуются: в кабинете кто-то есть ночью. Камеры пишут только помехи. Один охранник уволился. На столе — записка: «Она уже здесь. Не называй её имя».',
    day: 40,
    choices: [
      { label: 'Установить камеры', hint: '-4000 ₽', run: (g) => {
          if (g.cash < 4000) return 'Не хватило';
          g.cash -= 4000;
          g.world.flags.cameras = true;
          NB.effects.shake(300);
          return 'Камеры записали 4 секунды помех. И лицо, которое улыбнулось.';
        }},
      { label: 'Не верить слухам', hint: '—', run: (g) => {
          g.world.threat = Math.min(8, g.world.threat + 1);
          return 'Ночью вы сами увидели тень в коридоре.';
        }},
      { label: 'Спросить Neon', hint: 'Он знает больше', run: (g) => {
          g.world.neon.trust += 3;
          g.world.flags.neonHints = true;
          return 'Neon: «Она придёт за всеми нами. Готовься».';
        }}
    ]
  },

  /* ---------- АРКА "Гала-вечер" ---------- */
  {
    id: 'gala_1',
    arc: 'the_gala',
    title: 'Гала-вечер',
    text: 'В новостях — экстренный выпуск: «Гала-вечер технологической элиты закончился трагедией. 200 гостей. Все пропали. На кадрах — фиолетовая точка, которая движется среди людей».',
    day: 50,
    choices: [
      { label: 'Написать Neon', hint: '—', run: (g) => {
          g.world.flags.galaAsked = true;
          g.world.neon.trust += 5;
          return 'Neon: «Это она. Её зовут не так, как ты думаешь. Скоро ты узнаешь».';
        }},
      { label: 'Закрыть офис', hint: 'Осторожно', run: (g) => {
          g.world.flags.officeClosed = true;
          g.world.threat = Math.max(0, g.world.threat - 1);
          return 'Вы отменили все встречи на неделю.';
        }},
      { label: 'Сделать заявление', hint: 'Публично', run: (g) => {
          g.world.reputation = Math.min(100, g.world.reputation + 5);
          g.world.threat = Math.min(8, g.world.threat + 1);
          return 'Ваше заявление разлетелось по сети. Вас заметили.';
        }}
    ]
  },
  {
    id: 'gala_2',
    arc: 'the_gala',
    title: 'Список',
    text: 'Neon присылает список из 12 имён. «Эти люди — не люди. Они уже давно не люди. Но пока они среди нас — она не действует открыто».',
    day: 58,
    requires: g => g.world.flags.galaAsked,
    choices: [
      { label: 'Удалить список', hint: 'Не связываться', run: (g) => {
          g.world.flags.listDeleted = true;
          return 'Вы удалили. Через час один из списка сам пришёл к вам.';
        }},
      { label: 'Сохранить список', hint: 'Пригодится', run: (g) => {
          g.world.flags.listSaved = true;
          return 'Вы спрятали его в сейф.';
        }},
      { label: 'Опубликовать', hint: 'Опасно', run: (g) => {
          g.world.flags.listPublished = true;
          g.world.threat = Math.min(9, g.world.threat + 2);
          NB.effects.shake(800);
          return 'Через 10 минут все 12 имён были стёрты из всех баз. И ваши тоже.';
        }}
    ]
  },

  /* ---------- АРКА "Дроны" ---------- */
  {
    id: 'drones_choice',
    arc: 'drones',
    title: 'Век дронов',
    text: 'Neon присылает предложение: «Дроны дешевле. Не устают. Не увольняются. Замени часть сотрудников — освободишь бюджет».',
    day: 70,
    requires: g => g.world.neon.met,
    choices: [
      { label: 'Заменить часть сотрудников', hint: 'Сотрудники −30%, доход +', run: (g) => {
          g.world.drones.enabled = true;
          g.world.drones.replaced = 30;
          g.world.flags.dronesStarted = true;
          g.cash += 8000;
          return 'Дроны приступили к работе. Люди — уволены.';
        }},
      { label: 'Оставить только людей', hint: 'Дроны не появятся', run: (g) => {
          g.world.flags.antiDrones = true;
          g.world.neon.trust -= 10;
          return 'Neon промолчал. Через день ваши серверы атаковали.';
        }},
      { label: 'Гибрид', hint: 'Нейтрально', run: (g) => {
          g.world.drones.enabled = true;
          g.world.drones.replaced = 10;
          g.world.flags.dronesStarted = true;
          return 'Несколько дронов приступили к работе.';
        }}
    ]
  },

  /* ---------- АРКА "Бункер" ---------- */
  {
    id: 'bunker_1',
    arc: 'bunker',
    title: 'Небо темнеет',
    text: 'Тревожные новости: «Над городами — фиолетовое свечение. Люди пропадают. Правительства закрывают границы». Neon: «Тебе нужен бункер. У меня есть чертежи. Купи — я дам».',
    day: 95,
    choices: [
      { label: 'Строить бункер', hint: '-80 000 ₽', run: (g) => {
          if (g.cash < 80000) return 'Не хватило';
          g.cash -= 80000;
          g.world.bunker.built = true;
          g.world.bunker.level = 1;
          return 'Бетон, сталь, фильтры. Вы готовы.';
        }},
      { label: 'Подождать', hint: 'Опасно', run: (g) => {
          g.world.threat = Math.min(10, g.world.threat + 2);
          return 'Через неделю город опустел. Вы едва успели спрятаться.';
        }}
    ]
  },
  {
    id: 'bunker_2',
    arc: 'bunker',
    title: 'Стены',
    text: 'Бункер готов. Neon присылает сообщение: «Я ухожу. Она идёт за мной. Если выживешь — я вернусь». С этого дня он не отвечает.',
    day: 120,
    requires: g => g.world.bunker.built,
    choices: [
      { label: 'Ждать', hint: '—', run: (g) => {
          g.world.neon.state = 'missing';
          g.world.flags.neonMissing = true;
          return 'Дни идут. Neon молчит.';
        }},
      { label: 'Искать его', hint: 'Опасно', run: (g) => {
          g.world.threat = Math.min(10, g.world.threat + 1);
          g.world.flags.searchedNeon = true;
          return 'Ничего. Только его фиолетовая куртка на пустом сервере.';
        }}
    ]
  },

  /* ---------- АРКА "Тишина" ---------- */
  {
    id: 'silence_1',
    arc: 'silence',
    title: 'Мир под землёй',
    text: 'Вы в бункере. Клиенты — дроны. Люди — единицы. Каждый день вы обслуживаете тех, кто не может уйти. Neon молчит. Атаки продолжаются, но реже.',
    day: 140,
    requires: g => g.world.bunker.built,
    choices: [
      { label: 'Поддерживать связь', hint: '—', run: (g) => {
          g.world.flags.keepContact = true;
          return 'Вы продолжаете обслуживать дронов. Это работа.';
        }},
      { label: 'Искать выход', hint: '—', run: (g) => {
          g.world.flags.searchExit = true;
          return 'Вы находите старый канал связи. На той стороне — кто-то отвечает.';
        }}
    ]
  },

  /* ---------- АРКА "Развязка" ---------- */
  {
    id: 'resolution_1',
    arc: 'resolution',
    title: 'Развязка',
    text: 'Внезапно — тишина. Атаки прекратились. Через день в бункер стучат. На пороге — Neon. Живой. Уставший. Рядом с ним — тень. Он говорит: «Мы всё решили. Она больше не тронет вас. Я обещал».',
    day: 180,
    requires: g => g.world.neon.state === 'missing' || g.world.flags.neonMissing,
    choices: [
      { label: 'Поверить', hint: 'Светлая развязка', run: (g) => {
          g.world.flags.trustedNeon = true;
          return 'Neon улыбнулся. Тень рядом с ним исчезла.';
        }},
      { label: 'Не поверить', hint: 'Тёмная развязка', run: (g) => {
          g.world.flags.distrustedNeon = true;
          return 'Neon не стал спорить. Он ушёл. Но атаки прекратились.';
        }}
    ]
  }
];

/* ============================================================
   СИСТЕМА ОЧЕРЕДИ И ТРИГГЕРОВ
   ============================================================ */
S.tick = function () {
  const g = NB.state.game;
  const day = g.daily.dayNumber;
  const seen = NB.state.story.seenEvents;

  S.SCENES.forEach(sc => {
    if (seen.includes(sc.id)) return;
    if (sc.day && day < sc.day) return;
    if (sc.arc && sc.arc !== S.currentArc().id && day < (S.ARCS.find(a => a.id === sc.arc)?.from || 0)) return;
    if (sc.requires && !sc.requires(g)) return;
    if (g.world.storyQueue.includes(sc.id)) return;
    g.world.storyQueue.push(sc.id);
  });

  /* Обновляем тему */
  S.applyTheme();

  /* Микро-новости раз в несколько дней */
  S.maybeNews();
};

S.maybeNews = function () {
  const g = NB.state.game;
  if (g.world.lastNewsDay === g.daily.dayNumber) return;
  if (Math.random() > 0.35) return;
  g.world.lastNewsDay = g.daily.dayNumber;
  const news = S.pickNews();
  if (news) {
    g.world.news.unshift({ id: NB.state.seq.story++, text: news, at: new Date().toISOString() });
    if (g.world.news.length > 40) g.world.news = g.world.news.slice(0, 40);
    NB.save();
  }
};

S.pickNews = function () {
  const arc = S.currentArc().id;
  const pool = {
    ordinary: [
      'Рынок ISP стабилен. Конкуренты готовят новые тарифы.',
      'Аналитики: спрос на гигабит растёт на 12% в квартал.',
      'Мелкий провайдер обанкротился — клиенты ищут нового оператора.'
    ],
    first_signal: [
      'В сети появился странный вирус: он не вредит, но оставляет фиолетовый след.',
      'Провайдер из соседнего города сообщил о «шёпоте в проводах».',
      'Учёные фиксируют рост электромагнитного фона в крупных городах.'
    ],
    neon_shadow: [
      'Starve Neon получила награду «Инди-игра года». Разработчик не пришёл на церемонию.',
      'В сети распространяется слух: за Starve Neon стоит «кто-то большой».',
      'Neon Shadow в тренде. Кто он на самом деле — неизвестно.'
    ],
    whispers: [
      'Три инженера крупной компании пропали без вести за неделю.',
      'Пользователи сообщают о видениях после работы с серверами.',
      'Найдена странная запись: «Она уже здесь». Автор неизвестен.'
    ],
    the_gala: [
      'Гала-вечер: 200 пропавших. Следствие зашло в тупик.',
      'Правительство вводит комендантский час в трёх городах.',
      'Спутники фиксируют фиолетовое свечение над крупными городами.'
    ],
    drones: [
      'Дроны заменяют сотрудников в 40% компаний. Рынок труда рушится.',
      'Профсоюзы требуют запретить массовое использование дронов.',
      'Первые дроны-клиенты подключились к сети. Что это значит для провайдеров?'
    ],
    bunker: [
      'Города пустеют. Правительства уходят в подземные убежища.',
      'Канализация Марса приняла первых переселенцев. Связь с Землёй нестабильна.',
      'Найден бункер, построенный провайдером. Внутри — серверы и дроны.'
    ],
    silence: [
      'Тишина. Атаки прекратились. Выжившие не верят.',
      'Из бункеров выходят первые люди. Дроны больше не атакуют.',
      'Связь с колониями восстановлена. Они возвращаются.'
    ],
    resolution: [
      'Мир медленно восстанавливается.',
      'Neon Shadow и «она» больше не атакуют.',
      'Колонии возвращаются. Начинается новая эпоха.'
    ]
  };
  return NB.pick(pool[arc] || pool.ordinary);
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
  const choicesHtml = sc.choices.map((c, i) =>
    `<button type="button" class="story-choice fade-in" data-story-scene="${i}" style="animation-delay:${i*80}ms">
       <span>${c.label}</span>
       <span class="story-choice-hint">${c.hint || ''}</span>
     </button>`).join('');

  NB.openModal({
    title: '',
    submit: null,
    noSubmit: true,
    boxClass: 'story-modal-box',
    html: `
      <div class="story-chapter">${S.currentArc().title}</div>
      <div class="story-title fade-in">${NB.esc(sc.title)}</div>
      <div class="story-text typewriter-target fade-in" id="story-text-el">${NB.esc(sc.text)}</div>
      <div class="story-choices">${choicesHtml}</div>
    `
  });

  setTimeout(() => {
    const txt = document.getElementById('story-text-el');
    if (txt) NB.effects.typewriter(txt, sc.text);
    document.querySelectorAll('[data-story-scene]').forEach(btn => {
      btn.addEventListener('click', () => S.resolveScene(sc, Number(btn.dataset.storyScene)));
    });
  }, 40);
};

S.resolveScene = function (sc, idx) {
  const c = sc.choices[idx];
  if (!c) return;
  const result = c.run(NB.state.game);
  NB.state.story.seenEvents.push(sc.id);
  NB.state.story.choices[sc.id] = idx;
  NB.state.game.world.storyQueue = NB.state.game.world.storyQueue.filter(x => x !== sc.id);
  NB.closeModal();

  if (result && typeof result === 'string') {
    NB.notify(sc.title + ': ' + result, 'info');
    NB.addActivity(sc.title + ' — ' + result, 'sys');
  }

  NB.state.game.stats.eventsResolved++;
  NB.checkGameState();
  NB.save();
  setTimeout(() => {
    S.tick();
    if (NB.state.game.world.storyQueue.length) setTimeout(S.showNextInQueue, 400);
    else NB.renderView();
  }, 200);
};

/* ============================================================
   РЕКЛАМА-СПАМ (не связана со Starve Neon)
   ============================================================ */
const SPAM_TEXTS = [
  '📡 Новый тариф «Космос» — 2 Гбит/с за 999 ₽!',
  '🔧 Скидка на прокладку оптики — 20%',
  '📺 IPTV 300 каналов — всего 199 ₽/мес',
  '🛡 Защити дом от DDoS — 49 ₽/мес',
  '⚡ Апгрейд до 500 Мбит — бесплатно при переходе',
  '🌐 Домен .net за 1 ₽ — только сегодня',
  '📶 Wi-Fi 7 роутер в подарок при подключении'
];

S.showSpam = function () {
  if (!NB.state.settings.spamEnabled) return;
  const el = document.createElement('div');
  el.className = 'sn-spam';
  const x = Math.random() * (window.innerWidth - 240);
  const y = Math.random() * (window.innerHeight - 160);
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.innerHTML = `<div class="sn-spam-brand">📣 Реклама <span>×</span></div>
    <div class="sn-spam-body">${NB.pick(SPAM_TEXTS)}</div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  const close = () => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); };
  el.querySelector('span').addEventListener('click', e => { e.stopPropagation(); close(); });
  el.addEventListener('click', close);
  setTimeout(close, 6000);
};

/* ============================================================
   РЕНДЕР ПАНЕЛИ СЮЖЕТА НА ДАШБОРДЕ
   ============================================================ */
S.renderPanel = function () {
  const g = NB.state.game;
  const arc = S.currentArc();
  if (g.world.storyQueue.length) {
    const next = S.SCENES.find(s => s.id === g.world.storyQueue[0]);
    return `<div class="story-panel fade-in">
      <div class="story-chapter">${arc.title}</div>
      <div class="story-title">◆ Сюжетное событие ждёт</div>
      <div class="story-text">${next ? next.title : '—'}</div>
      <div class="story-choices">
        <button class="story-choice" data-action="open-story">Открыть →</button>
      </div>
    </div>`;
  }
  return `<div class="story-panel fade-in">
    <div class="story-chapter">${arc.title}</div>
    <div class="story-title">Текущая глава</div>
    <div class="story-text">День ${g.daily.dayNumber}. ${g.world.neon.met ? `Neon Shadow: ${g.world.neon.state === 'active' ? 'на связи' : g.world.neon.state === 'missing' ? 'молчит' : '—'}` : 'Пока ни с кем не связались.'}</div>
  </div>`;
};

/* ============================================================
   ЭКРАН КОНЦОВКИ (глобальная трагедия / разные финалы)
   ============================================================ */
S.showEnding = function (type) {
  const g = NB.state.game;
  const configs = {
    global_tragedy: {
      icon: '🌍', title: 'Тишина',
      desc: 'Neon Shadow нашёл её. Они вместе. Атаки прекратились. Вы вышли из бункера. Мир почти пуст, но жив. Колонисты возвращаются. Вы — оператор, вокруг которого всё вертелось.',
      stats: [['дней', g.stats.daysPlayed], ['угроза', g.world.threat], ['касса', NB.money(g.cash)]]
    },
    neon_merged: {
      icon: '🌟', title: 'Слияние',
      desc: 'Neon Shadow предложил вам стать частью его компании. Вы согласились. Теперь вы — часть нового мира.',
      stats: [['дней', g.stats.daysPlayed], ['касса', NB.money(g.cash)]]
    },
    drone_dark: {
      icon: '🤖', title: 'Век дронов',
      desc: 'Людей больше нет. Только дроны. Вы — последний оператор. И, возможно, единственный, кто ещё помнит, что было иначе.',
      stats: [['дней', g.stats.daysPlayed], ['дронов', g.world.drones.droneClients], ['касса', NB.money(g.cash)]]
    },
    anti_drone: {
      icon: '👥', title: 'Свой путь',
      desc: 'Вы отказались от дронов. Мир сохранил людей. Немного. Но сохранил.',
      stats: [['дней', g.stats.daysPlayed], ['людей', NB.state.clients.filter(c => !c.isDrone).length]]
    }
  };
  const cfg = configs[type] || configs.global_tragedy;

  const wrap = document.createElement('div');
  wrap.className = 'ending-screen';
  wrap.innerHTML = `<div class="ending-card">
    <div class="ending-icon">${cfg.icon}</div>
    <div class="ending-title">${cfg.title}</div>
    <div class="ending-desc">${cfg.desc}</div>
    <div class="ending-stats">
      ${cfg.stats.map(([k, v]) => `<div><b>${v}</b><span>${k}</span></div>`).join('')}
    </div>
    <button class="btn primary" id="ending-close">Продолжить</button>
  </div>`;
  document.body.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('show'));
  wrap.querySelector('#ending-close').addEventListener('click', () => {
    wrap.classList.remove('show');
    setTimeout(() => wrap.remove(), 500);
  });
  g.stats.endings.push(type);
  NB.save();
};

})(window);