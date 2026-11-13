/* isp_billing_story.js — сюжет */
(function (global) {
'use strict';
const NB = global.NB;
const S = NB.story = NB.story || {};

S.ARCS = [
  { id:'ordinary',     title:'Обычный провайдер', from:0,   theme:'#ff6b00' },
  { id:'first_signal', title:'Странный сигнал',   from:5,   theme:'#ff9500' },
  { id:'neon_shadow',  title:'Neon Shadow',       from:15,  theme:'#ff7a00' },
  { id:'whispers',     title:'Шёпот в сети',      from:30,  theme:'#a855f7' },
  { id:'the_gala',     title:'Гала-вечер',        from:50,  theme:'#dc2626' },
  { id:'drones',       title:'Век дронов',        from:70,  theme:'#0ea5e9' },
  { id:'bunker',       title:'Под землёй',        from:95,  theme:'#475569' },
  { id:'silence',      title:'Тишина',            from:130, theme:'#0f172a' },
  { id:'resolution',   title:'Развязка',          from:180, theme:'#22c55e' }
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

S.SCENES = [
  /* ============ ORDINARY ============ */
  { id:'family_intro', arc:'ordinary', title:'Вечер дома',
    text:'После рабочего дня вы возвращаетесь домой. Жена на кухне, ребёнок играет. Она смотрит с тревогой: «Ты всё время на работе. Мы почти не видимся».',
    day:3, requires:g=>g.family.wife,
    choices:[
      { label:'Остаться дома (1 AP)', ap:1, run:g=>{ g.family.wifeHappiness=Math.min(100,g.family.wifeHappiness+15); return 'Она улыбнулась впервые за неделю.'; }},
      { label:'Работа важна', run:g=>{ g.family.wifeHappiness=Math.max(0,g.family.wifeHappiness-10); return 'Она промолчала. Но глаза сказали всё.'; }},
      { label:'В парк с семьёй (1500 ₽)', cost:1500, run:g=>{ g.family.wifeHappiness=Math.min(100,g.family.wifeHappiness+25); return 'Хороший день. Ребёнок смеялся.'; }}
    ]
  },
  { id:'family_second_kid', arc:'ordinary', title:'Ещё один?',
    text:'Жена говорит: «Может, второго?» Смотрит с надеждой. Денег не так много, но она права — жизнь не только работа.',
    day:20, requires:g=>g.family.wife && g.family.kids.length === 1 && g.family.wifeHappiness > 50,
    choices:[
      { label:'Согласиться (1 AP)', ap:1, run:g=>{ g.family.kids.push({ name: NB.genKid(), age: 0 }); g.family.wifeHappiness=Math.min(100,g.family.wifeHappiness+20); return 'Семья стала больше.'; }},
      { label:'Сейчас не время', run:g=>{ g.family.wifeHappiness=Math.max(0,g.family.wifeHappiness-15); return 'Она грустно кивнула.'; }}
    ]
  },
  { id:'family_school', arc:'ordinary', title:'Школа',
    text:'Жена звонит: «У ребёнка проблемы в школе. Учительница говорит — нужен репетитор. Это стоит денег».',
    day:30, requires:g=>g.family.wife && g.family.kids.length > 0,
    choices:[
      { label:'Нанять репетитора (5000₽)', cost:5000, run:g=>{ g.family.wifeHappiness=Math.min(100,g.family.wifeHappiness+15); return 'Учительница довольна. Жена улыбается.'; }},
      { label:'«Справимся сами»', run:g=>{ g.family.wifeHappiness=Math.max(0,g.family.wifeHappiness-5); return 'Жена кивнула. Но взгляд был недовольный.'; }},
      { label:'Сходить к директору (1 AP)', ap:1, run:g=>{ g.family.wifeHappiness=Math.min(100,g.family.wifeHappiness+20); return 'Проблема решена. Ребёнок счастлив.'; }}
    ]
  },
  { id:'family_crisis', arc:'ordinary', title:'Кризис в семье',
    text:'Жена собирает вещи. «Я больше не могу так. Ты живёшь на работе. Мы для тебя — фон».',
    day:40, requires:g=>g.family.wife && g.family.wifeHappiness < 25 && !g.family.crisisShown,
    choices:[
      { label:'Умолять остаться (1 AP)', ap:1, run:g=>{
        g.family.crisisShown = true;
        if (g.family.wifeHappiness < 15) { g.family.wife = null; return 'Она всё равно ушла. Слишком поздно.'; }
        g.family.wifeHappiness = Math.min(100, g.family.wifeHappiness + 40);
        return 'Она осталась. Но едва-едва.';
      }},
      { label:'Сказать «уходи»', run:g=>{ g.family.crisisShown = true; g.family.wife = null; g.reputation = Math.max(0, g.reputation - 20); return 'Она ушла. Вы остались один.'; }}
    ]
  },

  /* ============ FIRST SIGNAL ============ */
  { id:'signal_1', arc:'first_signal', title:'Странное письмо',
    text:'Поздний вечер. Письмо от «[ДАННЫЕ УДАЛЕНЫ]». Внутри: «Я знаю, что ты меня видишь. Не бойся». Вложение: attachment_404.txt',
    day:5,
    choices:[
      { label:'Открыть', run:g=>{ g.world.threat=1; NB.effects.shake(600); return 'Файл открылся. На долю секунды в отражении — чьё-то лицо.'; }},
      { label:'Удалить', run:g=>'Стёрто. Но чувство осталось.' },
      { label:'Переслать в поддержку', run:g=>'«Источник не определяется. Это невозможно».' }
    ]
  },
  { id:'signal_2', arc:'first_signal', title:'Шорох в проводах',
    text:'Сотрудник жалуется: кто-то ходит по логам. В 03:33 кто-то обращался к биллингу. Адрес пустой.',
    day:9,
    choices:[
      { label:'Проверить ночью (1 AP)', ap:1, run:g=>{ g.world.threat=Math.min(8,g.world.threat+1); NB.effects.shake(400); return 'В темноте экрана моргнула точка. Она посмотрела в ответ.'; }},
      { label:'Аудит (3000 ₽)', cost:3000, run:g=>'Аудит ничего не нашёл. Или нашёл и промолчал.' },
      { label:'Забыть', run:g=>'Вы отвлеклись на работу.' }
    ]
  },

  /* ============ NEON SHADOW ============ */
  { id:'neon_contact', arc:'neon_shadow', title:'Neon Shadow',
    text:'Стук в дверь. На пороге — уставший человек лет тридцати в худи. «Я — Neon Shadow. Разработчик Starve Neon. Мне нужна помощь. Моя игра — не просто игра. Это канал».',
    day:15,
    choices:[
      { label:'Впустить', run:g=>{ g.world.neon.met=true; g.world.neon.trust=10; return 'Он говорил о «сигнале», «канале», «девочке в поместье Эллиот».'; }},
      { label:'Отказать', run:g=>'Он ушёл. Через час — DDoS.' },
      { label:'Сначала — что знаешь?', run:g=>{ g.world.neon.met=true; g.world.neon.trust=5; return '«Она уже близко. Та, что решает».'; }}
    ]
  },
  { id:'neon_request_1', arc:'neon_shadow', title:'Первая просьба',
    text:'«Мне нужен доступ к твоему трафику. Ненадолго. Клиенты не заметят».',
    day:19, requires:g=>g.world.neon.met,
    choices:[
      { label:'Разрешить', run:g=>{ g.world.neon.trust+=20; g.world.neon.helped++; return 'Утром трафик был чище обычного.'; }},
      { label:'За 5000 ₽', run:g=>{ g.cash+=5000; g.world.neon.trust+=10; g.world.neon.helped++; return 'Он улыбнулся — впервые.'; }},
      { label:'Отказать', run:g=>{ g.world.neon.trust-=10; return 'Он замолчал на несколько дней.'; }}
    ]
  },
  { id:'neon_request_2', arc:'neon_shadow', title:'Нужна помощь',
    text:'«У меня закончились деньги. Я разрабатываю игру, которая может всех спасти. Но я один».',
    day:24, requires:g=>g.world.neon.trust>=5,
    choices:[
      { label:'Дать 15 000 ₽', cost:15000, run:g=>{ g.world.neon.trust+=30; g.world.neon.helped++; return 'Он расплакался. «Я этого не забуду».'; }},
      { label:'Дать 5 000 ₽', cost:5000, run:g=>{ g.world.neon.trust+=10; g.world.neon.helped++; return 'Он кивнул. «Любая помощь важна».'; }},
      { label:'Отказать', run:g=>{ g.world.neon.trust-=15; return 'Он больше не писал два дня.'; }}
    ]
  },

  /* ============ WHISPERS ============ */
  { id:'whisper_1', arc:'whispers', title:'Новости из Осло',
    text:'Утренняя сводка: «На конференции в Осло 40 участников пропали. Очевидцы говорят о фиолетовых точках в воздухе».',
    day:32,
    choices:[
      { label:'Позвонить Neon', run:g=>{ g.world.neon.trust+=3; return '«Не лезь. Пока рано».'; }},
      { label:'Игнорировать', run:g=>'Работа важнее.' },
      { label:'Написать в редакцию (500 ₽)', cost:500, run:g=>'«Будьте осторожны. За нами уже следят».' }
    ]
  },
  { id:'whisper_2', arc:'whispers', title:'Гость в офисе',
    text:'Сотрудник не вышел. Второй видел ночью фигуру в кабинете. Камеры — помехи. Записка: «Не называй её имя».',
    day:38, requires:g=>g.world.neon.met,
    choices:[
      { label:'Камеры (4000 ₽)', cost:4000, run:g=>{ NB.effects.shake(400); return 'Записано 4 секунды помех. И улыбка, которая длилась дольше.'; }},
      { label:'Не верить', run:g=>{ g.world.threat=Math.min(10,g.world.threat+1); return 'Ночью вы сами увидели тень в коридоре.'; }},
      { label:'Спросить Neon', run:g=>{ g.world.neon.trust+=5; return '«Она за всеми нами. Готовься».'; }}
    ]
  },
  { id:'whisper_signal_strength', arc:'whispers', title:'Странный сигнал',
    text:'В логах сети появился сигнал не из вашей инфраструктуры. Частота — 13.3 ГГц. Фиолетовая точка в центре.',
    day:42, requires:g=>g.world.threat>=3,
    choices:[
      { label:'Записать сигнал (1 AP)', ap:1, run:g=>{ g.world.flags.signalRecorded=true; g.world.threat=Math.min(10,g.world.threat+1); return 'Записано. Сигнал усилился. Она знает.'; }},
      { label:'Отключить узел', run:g=>{ g.world.threat=Math.max(0,g.world.threat-1); if(NB.state.clients[0]) NB.state.clients=NB.state.clients.filter(c=>c.id!==NB.state.clients[0].id); return 'Узел отключён. Один клиент потерян.'; }},
      { label:'Спросить Neon', run:g=>{ if(!g.world.neon.met) return 'Связаться не с кем'; g.world.neon.trust+=5; return '«Не пытайся понять. Просто запомни: она везде».'; }}
    ]
  },
  { id:'whisper_3', arc:'whispers', title:'Имена',
    text:'Neon присылает 12 имён. «Эти люди уже не люди. Они её аватары. Пока они среди нас — она не действует открыто».',
    day:45, requires:g=>g.world.neon.trust>=25,
    choices:[
      { label:'Сохранить', run:g=>'Спрятали в сейф.' },
      { label:'Опубликовать', run:g=>{ g.world.threat=Math.min(10,g.world.threat+2); NB.effects.shake(800); return 'Через 10 минут все имена стёрты из всех баз. И ваше тоже.'; }},
      { label:'Удалить', run:g=>'Удалили. Один из списка пришёл лично.' }
    ]
  },
  { id:'whisper_cyn_named', arc:'whispers', title:'Имя произнесено',
    text:'На записи с камер — голос: «Меня зовут Cynessa. Я — Абсолютный решатель. Скоро вы все поймёте».',
    day:48, requires:g=>g.world.threat>=3,
    choices:[
      { label:'Записать в файл (1 AP)', ap:1, run:g=>{ g.world.threatNamed = true; return 'Вы записали. Теперь знаете, с кем имеете дело.'; }},
      { label:'Забыть', run:g=>{ g.world.threat=Math.min(10,g.world.threat+1); return 'Вы попытались забыть. Не получилось.'; }}
    ]
  },
  { id:'neon_truth', arc:'whispers', title:'Neon рассказывает',
    text:'Neon приходит сам. Без стука. «Я расскажу тебе, что происходит. Она — решатель. Она хочет решить всё. Даже нас».',
    day:53, requires:g=>g.world.neon.met && g.world.neon.trust>30,
    choices:[
      { label:'«Помогу чем смогу» (1 AP)', ap:1, run:g=>{ g.world.neon.trust+=20; g.world.flags.receivedTruth=true; return 'Он кивнул. Вы теперь знаете правду.'; }},
      { label:'«Мне не нужны проблемы»', run:g=>{ g.world.neon.trust-=15; return 'Он ушёл. Не оборачиваясь.'; }}
    ]
  },

  /* ============ THE GALA ============ */
  { id:'gala_invite', arc:'the_gala', title:'Приглашение',
    text:'Официальное приглашение: «Гала-вечер технологической элиты. Только для избранных». Neon: «Не ходи. Что бы ни случилось — не ходи».',
    day:50,
    choices:[
      { label:'Пойти', run:g=>{ g.world.threat=Math.min(10,g.world.threat+2); NB.effects.shake(500); return 'Вы были там. Вы видели её. Вы единственный, кто вышел.'; }},
      { label:'Отказать', run:g=>'Дома с семьёй. Плохо спали.' },
      { label:'Отправить сотрудника (1 AP)', ap:1, requires:g=>g.employees.length>0, run:g=>{ const e=NB.pick(g.employees); g.employees=g.employees.filter(x=>x.id!==e.id); g.world.threat=Math.min(10,g.world.threat+1); return `${e.name} ушёл. Больше вы его не видели.`; }}
    ]
  },
  { id:'gala_catastrophe', arc:'the_gala', title:'Трагедия',
    text:'«Гала-вечер: 200 гостей пропали. На кадрах — фиолетовая точка среди людей. Правительство закрывает город».',
    day:55,
    choices:[
      { label:'Связаться с Neon (1 AP)', ap:1, run:g=>{ g.world.neon.trust+=5; return '«Это она. Её зовут Cynessa. И она только начала».'; }},
      { label:'Закрыть офис', run:g=>{ g.world.threat=Math.max(0,g.world.threat-1); return 'Отменили все встречи на неделю.'; }},
      { label:'Публичное заявление', run:g=>{ g.reputation=Math.min(100,g.reputation+5); g.world.threat=Math.min(10,g.world.threat+1); return 'Вас заметили.'; }}
    ]
  },
  { id:'gala_bunker', arc:'the_gala', title:'Бункер',
    text:'Neon: «Строй бункер. У меня есть чертежи. У тебя несколько дней. Я не шучу».',
    day:62, requires:g=>g.world.neon.met,
    choices:[
      { label:'Спросить о бункере (1 AP)', ap:1, run:g=>{ g.world.flags.bunkerBlueprints=true; g.world.bunker.ultimatumDay=g.daily.dayNumber+5; return 'Чертежи. У вас 5 дней. Бункер — 70 000 ₽.'; }},
      { label:'Игнорировать', run:g=>{ g.world.threat=Math.min(10,g.world.threat+3); return 'Вы пожалеете.'; }},
      { label:'Спросить о девочке', run:g=>{ g.world.neon.trust+=3; return '«Абсолютный решатель. Я видел её в поместье Эллиот. Я бежал».'; }}
    ]
  },
  { id:'anomaly_breach', arc:'the_gala', title:'Прорыв',
    text:'Экран мерцает. Появляется текст, которого вы не писали: «Я ВИЖУ ТЕБЯ. 5 ДНЕЙ».',
    day:65, requires:g=>g.world.threat>=5,
    choices:[
      { label:'Усилить защиту (1 AP)', ap:1, run:g=>{ g.world.threat=Math.max(0,g.world.threat-1); NB.effects.shake(500); return 'Она отступила. Пока.'; }},
      { label:'Игнорировать', run:g=>{ g.world.threat=Math.min(10,g.world.threat+2); NB.effects.redFlash(); return 'Она приблизилась.'; }},
      { label:'Запросить помощь Neon', run:g=>{ if(g.world.neon.state!=='active') return 'Neon недоступен'; g.world.neon.trust+=3; g.world.flags.neonHelp=true; return '«Строй бункер. У тебя меньше времени, чем ты думаешь».'; }}
    ]
  },

  /* ============ DRONES ============ */
  { id:'drones_offer', arc:'drones', title:'Замена',
    text:'Neon: «Дроны дешевле. Не устают. Не увольняются. Замени сотрудников».',
    day:70,
    choices:[
      { label:'Заменить', run:g=>{ const n=g.employees.length; g.world.drones.enabled=true; g.world.drones.replaced=n; g.employees=[]; g.cash+=n*3000; g.unlocks.drones=true; return `Дроны приступили. ${n} человек уволены.`; }},
      { label:'Оставить людей', run:g=>{ g.world.neon.trust-=10; return 'Neon сжал кулаки.'; }},
      { label:'Гибрид', run:g=>{ g.world.drones.enabled=true; g.world.drones.replaced=2; g.unlocks.drones=true; return 'Дроны и люди. Пока.'; }}
    ]
  },
  { id:'drones_clients', arc:'drones', title:'Дроны-клиенты',
    text:'Люди умирают. Заявки от UNIT-4728: «Требуется подключение». Обычные клиенты редеют.',
    day:78, requires:g=>g.world.drones.enabled,
    choices:[
      { label:'Подключать дронов', run:g=>{ g.world.drones.count+=10; g.world.drones.droneClients+=10; return 'Дроны — ваши основные клиенты.'; }},
      { label:'Только людей', run:g=>{ g.reputation=Math.min(100,g.reputation+10); return 'Верность людям. Пока.'; }}
    ]
  },
  { id:'drones_choice_humanity', arc:'drones', title:'Один человек',
    text:'На пороге — живой человек. Измождённый. «Вы последний провайдер в городе. У меня больная дочь. Нужна связь. Пожалуйста».',
    day:80, requires:g=>g.world.drones.enabled,
    choices:[
      { label:'Подключить бесплатно', run:g=>{ g.reputation=Math.min(100,g.reputation+10); g.world.flags.helpedHuman=true; return 'Он плакал. Вы помогли.'; }},
      { label:'По стандартному тарифу', run:g=>{ const t=NB.state.tariffs[0]; NB.state.clients.push({id:NB.state.seq.client++,name:'Выживший',address:NB.genAddress(),phone:NB.genPhone(),tariffId:t.id,balance:0,status:'active',createdAt:new Date().toISOString(),password:NB.DEFAULT_PASS,isDrone:false,risk:'good',revealed:true}); return '+1 человеческий клиент'; }},
      { label:'«Мы работаем только с дронами»', run:g=>{ g.reputation=Math.max(0,g.reputation-15); g.world.flags.refusedHuman=true; return 'Он ушёл. Вы видели его глаза.'; }}
    ]
  },
  { id:'drone_uprising', arc:'drones', title:'Странное поведение',
    text:'Несколько дронов одновременно перестали выполнять команды. Просто... стоят и смотрят.',
    day:90, requires:g=>g.world.drones.enabled,
    choices:[
      { label:'Отключить партию (5000₽)', cost:5000, run:g=>{ g.reputation=Math.min(100,g.reputation+3); return 'Порядок восстановлен.'; }},
      { label:'Наблюдать', run:g=>{ g.world.threat=Math.min(10,g.world.threat+2); return 'Они снова двинулись. Как ни в чём не бывало.'; }}
    ]
  },

  /* ============ BUNKER ============ */
  { id:'bunker_ultimatum', arc:'bunker', title:'Ультиматум',
    text:'Cynessa атакует города. 3 дня до полного уничтожения. Neon: «Строй БУНКЕР. Сейчас».',
    day:95, requires:g=>g.world.flags.bunkerBlueprints,
    choices:[
      { label:'Строить (70 000 ₽)', cost:70000, run:g=>{ g.world.bunker.built=true; g.world.bunker.level=1; return 'Бетон, сталь, фильтры. Вы готовы.'; }},
      { label:'Кредит + бункер', run:g=>{ const need=Math.max(0,70000-g.cash); if(need>0) NB.invoices.takeLoan(Math.max(10000,Math.ceil(need/10000)*10000)); if(g.cash<70000) return 'Не хватило'; g.cash-=70000; g.world.bunker.built=true; g.world.bunker.level=1; return 'Готово. Долг остался.'; }},
      { label:'Не строить', run:g=>{ g.world.flags.noBunker=true; g.world.threat=10; return 'Вы остались на поверхности. Да поможет вам бог.'; }}
    ]
  },
  { id:'bunker_upgrade', arc:'bunker', title:'Расширение',
    text:'Бункер тесен. Семья, вы, дроны. Нужны новые уровни.',
    day:105, requires:g=>g.world.bunker.built && g.world.bunker.level===1,
    choices:[
      { label:'Расширить (50 000 ₽)', cost:50000, run:g=>{ g.world.bunker.level=2; return 'Второй уровень готов.'; }},
      { label:'Пока хватит', run:g=>'Вы экономите.' }
    ]
  },
  { id:'bunker_neon_leave', arc:'bunker', title:'Neon уходит',
    text:'Neon приходит. Уставший. «Я ухожу. Она идёт за мной. Если выживешь — я вернусь. Обещаю».',
    day:120, requires:g=>g.world.bunker.built,
    choices:[
      { label:'Отпустить', run:g=>{ g.world.neon.state='missing'; return 'Он ушёл в темноту.'; }},
      { label:'Удержать (1 AP)', ap:1, run:g=>{ g.world.threat=Math.min(10,g.world.threat+1); return 'Он мягко отвёл вашу руку.'; }}
    ]
  },

  /* ============ SILENCE ============ */
  { id:'silence_life', arc:'silence', title:'Жизнь под землёй',
    text:'В бункере. Клиенты — дроны. Люди — единицы. Neon молчит. Снаружи тишина.',
    day:140, requires:g=>g.world.bunker.built,
    choices:[
      { label:'Поддерживать (1 AP)', ap:1, run:g=>{ g.reputation=Math.min(100,g.reputation+5); NB.addCompanyXp(20); return 'Вы держитесь.'; }},
      { label:'Искать выход', run:g=>{ g.world.flags.searchExit=true; return 'Вы нашли старый канал связи.'; }}
    ]
  },
  { id:'silence_news', arc:'silence', title:'Новости с поверхности',
    text:'Радио: «Cynessa перестала атаковать. Колонии возвращаются. Связь восстанавливается».',
    day:155, requires:g=>g.world.bunker.built,
    choices:[
      { label:'Поверить', run:g=>{ g.world.flags.believedNews=true; return 'Вы готовитесь выйти.'; }},
      { label:'Не верить', run:g=>{ g.world.flags.distrustedNews=true; return 'Вы остаётесь.'; }}
    ]
  },

  /* ============ RESOLUTION ============ */
  { id:'resolution_neon_returns', arc:'resolution', title:'Neon вернулся',
    text:'Стук в дверь бункера. На пороге — Neon. Живой. Рядом с ним — тень. «Мы всё решили. Она больше не тронет вас. Я обещал».',
    day:180, requires:g=>g.world.neon.state==='missing',
    choices:[
      { label:'Поверить', run:g=>{ g.world.flags.worldSaved=true; return 'Neon улыбнулся. Тень исчезла.'; }},
      { label:'Не верить', run:g=>'Neon не стал спорить. Он ушёл.' },
      { label:'Спросить о Cynessa (1 AP)', ap:1, run:g=>{ g.world.flags.worldSaved=true; return '«Она не злая. Она просто следует программе. Я показал ей другой путь».'; }}
    ]
  },
  { id:'resolution_corp_win', arc:'resolution', title:'Корпоративный триумф',
    text:'Вы выжили. Конкуренты либо мертвы, либо под вами. Вы — единственный крупный провайдер в регионе.',
    day:200, requires:g=>g.unlocks.competitors && g.competitors.filter(c=>c.alive).length === 0,
    choices:[
      { label:'Праздновать', action:()=>{ if (NB.showEndingScreen) NB.showEndingScreen('corporate_win'); return '🏆'; }},
      { label:'Двигаться дальше', run:g=>'Империя растёт.' }
    ]
  }
];

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
  S.maybeNews();
  S.maybeVideoNews();
};

S.maybeNews = function () {
  const g = NB.state.game;
  if (g.world.lastNewsDay === g.daily.dayNumber) return;
  if (Math.random() > 0.4) return;
  g.world.lastNewsDay = g.daily.dayNumber;
  const n = S.pickNews();
  if (n) NB.addNews(n, { cooldown: 5 });
};

S.maybeVideoNews = function () {
  const g = NB.state.game;
  if (!g.world.neon.met && !g.world.flags.galaAttended) return;
  if (Math.random() > 0.15) return;
  const videos = [
    { src: 'images/video1.webm', title: 'Starve Neon — трейлер', text: 'В сети появился трейлер Starve Neon. Разработчик снова не показывает лица.' },
    { src: 'images/video2.webm', title: 'Starve Neon — геймплей', text: 'Neon выложил геймплей Starve Neon. Фиолетовые точки мелькают даже в игре.' },
    { src: 'images/video3.webm', title: 'Starve Neon — тизер', text: 'Новый тизер Starve Neon. В конце — знакомый силуэт.' },
    { src: 'images/video4.webm', title: 'Starve Neon — послание', text: 'Последнее сообщение от Neon. Смотреть до конца.' }
  ];
  const v = NB.pick(videos);
  NB.addVideoNews(v.src, v.title, v.text, 30);
};

S.pickNews = function () {
  const arc = S.currentArc().id;
  const pool = {
    ordinary: [
      'Рынок ISP стабилен.', 'Спрос на гигабит растёт на 12% в квартал.',
      'Мелкий провайдер обанкротился.', 'Тарифы растут по всей стране.',
      'Аналитики предсказывают бум домашнего интернета.'
    ],
    first_signal: [
      'В сети появился странный вирус.', 'Сосед сообщил о «шёпоте в проводах».',
      'Рост электромагнитного фона в городах.', 'Провайдер из Осло жалуется на «фиолетовые точки».',
      'Учёные: «аномальные сигналы в сетях».'
    ],
    neon_shadow: [
      'Starve Neon награждена. Разработчик не пришёл.', 'Слух: за игрой стоит «кто-то большой».',
      'Neon Shadow в тренде.', 'Starve Neon обновлена — фанаты в восторге.',
      'Разработчик Starve Neon снова пропал.'
    ],
    whispers: [
      'Три инженера пропали без вести.', 'Видения после работы с серверами.',
      'Запись: «Она уже здесь».', 'Странные сообщения в логах провайдеров.',
      'Правительство начало расследование.'
    ],
    the_gala: [
      'Гала-вечер: 200 пропавших.', 'Комендантский час в трёх городах.',
      'Фиолетовое свечение над городами.', 'Аэропорты закрыты.',
      'Военные патрули на улицах.'
    ],
    drones: [
      'Дроны заменяют 40% сотрудников.', 'Профсоюзы протестуют.',
      'Первые дроны-клиенты подключились.', 'Дроны-курьеры повсюду.',
      'Странные сбои в работе дронов.'
    ],
    bunker: [
      'Города пустеют.', 'Колонии Марса принимают переселенцев.',
      'Найден бункер провайдера.', 'Правительства ушли в подземные убежища.',
      'Связь с колониями нестабильна.'
    ],
    silence: [
      'Тишина. Атаки прекратились.', 'Первые люди выходят из бункеров.',
      'Связь с колониями восстановлена.', 'Выжившие не верят в конец.',
      'Спутники фиксируют тишину.'
    ],
    resolution: [
      'Мир медленно восстанавливается.', 'Neon и Cynessa ушли.',
      'Колонии возвращаются.', 'Начинается новая эпоха.',
      'Выжившие пересчитывают потери.'
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
  const choicesHtml = sc.choices.map((c, i) => {
    const meta = [];
    if (c.ap) meta.push(`−${c.ap} AP`);
    if (c.cost) meta.push(`${c.cost} ₽`);
    const disabled = (c.ap && c.ap > g.ap.current) || (c.cost && c.cost > g.cash) || (c.requires && !c.requires(g));
    return `<button type="button" class="story-choice fade-in" data-story-scene="${i}" style="animation-delay:${i*80}ms" ${disabled ? 'disabled style="opacity:.4"' : ''}>
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
  setTimeout(() => {
    S.tick();
    if (g.world.storyQueue.length) setTimeout(S.showNextInQueue, 400);
    else NB.render();
  }, 200);
};

S.renderPanel = function () {
  const g = NB.state.game;
  const arc = S.currentArc();
  if (g.world.bunker.ultimatumDay > 0 && g.daily.dayNumber < g.world.bunker.ultimatumDay && !g.world.bunker.built) {
    const left = g.world.bunker.ultimatumDay - g.daily.dayNumber;
    return `<div class="ultimatum-banner">
      <h3>⚠ Ультиматум</h3>
      <p>Постройте бункер за <b>${left} дн.</b>, иначе всё потеряно.</p>
      <div class="ultimatum-timer">${left} дн.</div>
      <button class="btn primary" data-action="build-bunker">Построить бункер</button>
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