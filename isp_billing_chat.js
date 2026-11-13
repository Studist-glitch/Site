/* isp_billing_chat.js — поддержка: уникальные обращения, микро-сюжеты, мини-игры */
(function (global) {
'use strict';
const NB = global.NB;
const C = NB.chat = NB.chat || {};

/* ============================================================
   ШАБЛОНЫ
   intro: массив { from, text } ИЛИ функция (g) => массив
   ============================================================ */
C.TEMPLATES = {

  /* ---------- БАЗОВЫЕ ---------- */
  slow_speed: {
    subject: 'Медленная скорость', repeatable: true,
    intro: [
      { from: 'client', text: 'Здравствуйте! Вечером интернет работает ужасно. Видео не грузятся.' },
      { from: 'client', text: 'Что можно сделать?' }
    ],
    stages: {
      initial: {
        replies: [
          { label: 'Проверю линию', apCost: 1, leadsTo: 'check_line' },
          { label: 'Перезагрузите роутер', leadsTo: 'reboot' },
          { label: 'Отправить техника', employeeSkill: 'repair', leadsTo: 'send_tech' }
        ]
      },
      check_line: {
        messages: [{ from: 'client', text: 'Хорошо, жду.' }],
        replies: [
          { label: 'Нашёл — исправляю', apCost: 1, minigame: 'bitflip', leadsTo: 'resolved', reward: { reputation: 2, cash: 100 } },
          { label: 'Нужна замена кабеля (500₽)', cost: 500, leadsTo: 'resolved', reward: { reputation: 1 } },
          { label: 'Извините, не могу', leadsTo: 'resolved', penalty: { reputation: -2 } }
        ]
      },
      reboot: {
        messages: [{ from: 'client', text: 'Перезагрузил. Не помогло.' }],
        replies: [
          { label: 'Тогда проверю линию', apCost: 1, leadsTo: 'check_line' },
          { label: 'Завтра посмотрим', leadsTo: 'resolved', penalty: { reputation: -1 } }
        ]
      },
      send_tech: {
        waitDays: 1,
        messages: [{ from: 'client', text: 'Спасибо! Техник всё починил.' }],
        replies: [{ label: 'Рады помочь!', leadsTo: 'resolved', reward: { reputation: 3 } }]
      }
    }
  },

  broken_router: {
    subject: 'Не работает роутер', repeatable: true,
    intro: [{ from: 'client', text: 'Роутер сгорел, ничего не работает. Что делать?' }],
    stages: {
      initial: {
        replies: [
          { label: 'Новый роутер (1500₽)', cost: 1500, leadsTo: 'resolved', reward: { reputation: 2 } },
          { label: 'Попробуйте сброс', apCost: 1, minigame: 'sequence', leadsTo: 'resolved', reward: { reputation: 1 } },
          { label: 'Это не наша проблема', leadsTo: 'resolved', penalty: { reputation: -3 } }
        ]
      }
    }
  },

  business_offer: {
    subject: 'Подключение офиса', repeatable: true,
    intro: [{ from: 'client', text: 'Добрый день! Открываем офис, нужно 10 точек. Что предложите?' }],
    stages: {
      initial: {
        replies: [
          { label: 'Обсудим условия', apCost: 1, minigame: 'negotiate', leadsTo: 'negotiate', reward: { cash: 3000, reputation: 3 } },
          { label: 'Стандартный тариф (1200₽)', leadsTo: 'resolved', reward: { cash: 1000 } },
          { label: 'Слишком мелкий заказ', leadsTo: 'resolved', penalty: { reputation: -2 } }
        ]
      },
      negotiate: {
        messages: [{ from: 'client', text: 'Приятно иметь дело! Договор завтра.' }],
        replies: [{ label: 'Отлично', leadsTo: 'resolved', reward: { cash: 2000, reputation: 2 } }]
      }
    }
  },

  refund_request: {
    subject: 'Возврат средств', repeatable: true,
    intro: [{ from: 'client', text: 'Меня не устроило качество. Верните за 3 месяца.' }],
    stages: {
      initial: {
        replies: [
          { label: 'Полный возврат (1500₽)', cost: 1500, leadsTo: 'resolved', reward: { reputation: 4 } },
          { label: '50% (750₽)', cost: 750, leadsTo: 'resolved', reward: { reputation: 1 } },
          { label: 'Отказать', leadsTo: 'refuse' }
        ]
      },
      refuse: {
        messages: [{ from: 'client', text: 'Тогда жалоба в Роспотребнадзор!' }],
        replies: [
          { label: 'Всё же вернём (1500₽)', cost: 1500, leadsTo: 'resolved', reward: { reputation: 2 } },
          { label: 'Жалуйтесь', leadsTo: 'resolved', penalty: { reputation: -5 } }
        ]
      }
    }
  },

  upsell_biz: {
    subject: 'Хочу улучшить тариф', repeatable: true,
    intro: [{ from: 'client', text: 'Мне нравится ваш сервис. Думаю перейти на более дорогой тариф. Что посоветуете?' }],
    stages: {
      initial: {
        replies: [
          { label: 'Предложить VIP', employeeSkill: 'pitch', leadsTo: 'upsold' },
          { label: 'Предложить стандартный', leadsTo: 'upsold_std' },
          { label: 'Ничего не предлагать', leadsTo: 'resolved', penalty: { reputation: -1 } }
        ]
      },
      upsold: {
        messages: [{ from: 'client', text: 'Отлично! Оформляйте.' }],
        replies: [{ label: 'Готово', leadsTo: 'resolved', reward: { cash: 3000, reputation: 2 } }]
      },
      upsold_std: {
        messages: [{ from: 'client', text: 'Хорошо, подойдёт.' }],
        replies: [{ label: 'Оформлено', leadsTo: 'resolved', reward: { cash: 800, reputation: 1 } }]
      }
    }
  },

  billing_error: {
    subject: 'Ошибка в счёте', repeatable: true,
    intro: [{ from: 'client', text: 'В моём счёте ошибка! Я платил за 500 Мбит, а указано 200.' }],
    stages: {
      initial: {
        replies: [
          { label: 'Проверю ваш тариф', apCost: 1, leadsTo: 'check_tariff' },
          { label: 'Оплатите, потом разберёмся', leadsTo: 'resolved', penalty: { reputation: -2 } },
          { label: 'Прошу прощения, пересчитаем', leadsTo: 'resolved', reward: { reputation: 3 } }
        ]
      },
      check_tariff: {
        messages: [{ from: 'client', text: 'И что?' }],
        replies: [
          { label: 'Ошибка наша. Пересчёт сделан.', cost: 100, leadsTo: 'resolved', reward: { reputation: 2 } },
          { label: 'Всё верно, тариф такой', leadsTo: 'resolved', penalty: { reputation: -1 } }
        ]
      }
    }
  },

  sla_complaint: {
    subject: 'Жалоба на скорость', repeatable: true,
    intro: [{ from: 'client', text: 'Третий день скорость ниже заявленной! Я платил за 500, а получаю 50!' }],
    stages: {
      initial: {
        replies: [
          { label: 'Проверю линию (1 AP)', apCost: 1, minigame: 'sequence', leadsTo: 'checked' },
          { label: 'Компенсировать (500₽)', cost: 500, leadsTo: 'resolved', reward: { reputation: 2 } },
          { label: 'Это ваш роутер', leadsTo: 'refused', penalty: { reputation: -3 } }
        ]
      },
      checked: {
        messages: [{ from: 'client', text: 'И что показало?' }],
        replies: [
          { label: 'Проблема у нас. Исправлено.', leadsTo: 'resolved', reward: { reputation: 4 } },
          { label: 'Замена оборудования (1000₽)', cost: 1000, leadsTo: 'resolved', reward: { reputation: 1 } }
        ]
      },
      refused: {
        messages: [{ from: 'client', text: 'Ну и сервис...' }],
        replies: [{ label: 'До свидания', leadsTo: 'resolved' }]
      }
    }
  },

  /* ---------- УГРОЗЫ ---------- */
  hacker_threat: {
    subject: 'Угроза взлома',
    intro: [
      { from: 'client', text: 'Привет. Я взломал твой сервер. У меня база клиентов.' },
      { from: 'client', text: 'Заплати 20 000 ₽ — или солью всё.' }
    ],
    stages: {
      initial: {
        replies: [
          { label: 'Заплатить 20 000₽', cost: 20000, leadsTo: 'paid' },
          { label: 'Я вызову ФСБ', apCost: 1, minigame: 'codebreak', leadsTo: 'caught', reward: { reputation: 5 } },
          { label: 'Сам тебя взломаю', apCost: 2, employeeSkill: 'hack', leadsTo: 'counter_hack', reward: { reputation: 3, cash: 5000 } },
          { label: 'Проигнорировать', leadsTo: 'leaked', penalty: { reputation: -15 } }
        ]
      },
      paid: { messages: [{ from: 'client', text: 'Умный ход.' }], replies: [{ label: 'Понял', leadsTo: 'resolved' }] },
      caught: { messages: [{ from: 'client', text: 'Ладно, ладно! Я не хотел!' }], replies: [{ label: 'Хорошо', leadsTo: 'resolved', reward: { reputation: 3 } }] },
      counter_hack: { messages: [{ from: 'client', text: 'Как ты... это невозможно...' }], replies: [{ label: 'Урок', leadsTo: 'resolved', reward: { reputation: 5 } }] },
      leaked: { messages: [{ from: 'client', text: 'Твоя репутация в открытом доступе.' }], replies: [{ label: '...', leadsTo: 'resolved' }] }
    }
  },

  hacker_subtle: {
    subject: 'Странное сообщение',
    intro: [
      { from: 'client', text: 'Привет. Заметил странную активность в моём аккаунте.' },
      { from: 'client', text: 'Хотя... возможно, я сам что-то нажал.' }
    ],
    stages: {
      initial: {
        replies: [
          { label: 'Проверю логи', apCost: 1, employeeSkill: 'hack', leadsTo: 'analyzed' },
          { label: 'Смените пароль', leadsTo: 'resolved', reward: { reputation: 1 } },
          { label: 'Это вы сами', leadsTo: 'resolved', penalty: { reputation: -1 } }
        ]
      },
      analyzed: {
        messages: [{ from: 'client', text: 'И что там?' }],
        replies: [
          { label: 'Ложная тревога', leadsTo: 'resolved', reward: { reputation: 2 } },
          { label: 'Попытка взлома. Блокирую.', leadsTo: 'resolved', reward: { reputation: 4, cash: 500 } }
        ]
      }
    }
  },

  spammer_caught: {
    subject: 'Подозрительная активность',
    intro: [{ from: 'client', text: 'Привет! Хочешь заработать? У меня есть отличная схема...' }],
    stages: {
      initial: {
        replies: [
          { label: 'Заблокировать', leadsTo: 'resolved', reward: { reputation: 2 } },
          { label: 'Расскажи подробнее', apCost: 1, leadsTo: 'info' },
          { label: 'Не пишите больше', leadsTo: 'resolved' }
        ]
      },
      info: {
        messages: [{ from: 'client', text: 'Переведи 5000₽ — получишь 50000₽ через неделю.' }],
        replies: [
          { label: 'Вы мошенник', leadsTo: 'resolved', reward: { reputation: 3 } },
          { label: 'Попробую (5000₽)', cost: 5000, leadsTo: 'scammed', penalty: { reputation: -3 } }
        ]
      },
      scammed: { messages: [{ from: 'client', text: 'Деньги придут через неделю.' }], replies: [{ label: 'Буду ждать', leadsTo: 'resolved' }] }
    }
  },

  /* ---------- МИКРО-СЮЖЕТЫ ---------- */
  neighbor_stealing: {
    subject: 'Сосед крадёт интернет',
    intro: [
      { from: 'client', text: 'Заметил, что мой Wi-Fi медленнее по вечерам.' },
      { from: 'client', text: 'Кажется, сосед подключился.' }
    ],
    stages: {
      initial: {
        replies: [
          { label: 'Помогу сменить пароль', apCost: 1, leadsTo: 'new_password' },
          { label: 'Это не наша проблема', leadsTo: 'resolved', penalty: { reputation: -2 } }
        ]
      },
      new_password: {
        messages: [{ from: 'client', text: 'Сменил пароль. Наблюдаю.' }],
        replies: [{ label: 'Хорошо, следите', waitDays: 2, leadsTo: 'check_result' }]
      },
      check_result: {
        waitDays: 2,
        messages: [
          { from: 'client', text: 'Сосед ругается! Говорит, я «сломал интернет».' },
          { from: 'client', text: 'Он признался, что платил кому-то за подключение.' }
        ],
        replies: [
          { label: 'Предложите легальный тариф', leadsTo: 'resolved', reward: { reputation: 3, cash: 500 } },
          { label: 'Пусть разбираются', leadsTo: 'resolved', reward: { reputation: 1 } }
        ]
      }
    }
  },

  missing_equipment: {
    subject: 'Пропал роутер',
    intro: [{ from: 'client', text: 'Мой роутер исчез! Был на полке — и нет.' }],
    stages: {
      initial: {
        replies: [
          { label: 'Проверю по логам', apCost: 1, leadsTo: 'logs' },
          { label: 'Вы уверены?', leadsTo: 'resolved', penalty: { reputation: -1 } }
        ]
      },
      logs: {
        messages: [{ from: 'client', text: 'И что в логах?' }],
        replies: [{ label: 'Кто-то подключался с другого адреса', waitDays: 1, leadsTo: 'trace' }]
      },
      trace: {
        waitDays: 1,
        messages: [{ from: 'client', text: 'Нашёл! Сосед забрал. Подключил у себя.' }],
        replies: [
          { label: 'Поможем вернуть', leadsTo: 'resolved', reward: { reputation: 3 } },
          { label: 'Вызовите полицию', leadsTo: 'resolved', reward: { reputation: 1 } }
        ]
      }
    }
  },

  love_letter: {
    subject: 'Личное сообщение',
    intro: [{ from: 'client', text: 'Здравствуйте. Я давно хотел(а) кое-что сказать...' }],
    stages: {
      initial: {
        replies: [
          { label: 'Слушаю', leadsTo: 'confession' },
          { label: 'Это техподдержка', leadsTo: 'resolved', penalty: { reputation: -1 } }
        ]
      },
      confession: {
        messages: [
          { from: 'client', text: 'Мне нравится ваш голос. И как вы помогаете.' },
          { from: 'client', text: 'Можно встретиться?' }
        ],
        replies: [
          { label: 'Это неэтично', leadsTo: 'resolved', reward: { reputation: 1 } },
          { label: 'Останемся профессионалами', leadsTo: 'resolved', reward: { reputation: 2 } },
          { label: 'Согласиться (риск)', chance: 0.3, leadsTo: 'date_ok', failsTo: 'date_fail' }
        ]
      },
      date_ok: {
        messages: [{ from: 'client', text: 'Спасибо за вечер...' }],
        replies: [{ label: 'Было приятно', leadsTo: 'resolved', reward: { reputation: -2, cash: 2000 } }]
      },
      date_fail: {
        messages: [{ from: 'client', text: 'Плохо. Я напишу в прокуратуру.' }],
        replies: [{ label: '...', leadsTo: 'resolved', penalty: { reputation: -8 } }]
      }
    }
  },

  corporate_spy: {
    subject: 'Странный клиент',
    intro: [
      { from: 'client', text: 'Здравствуйте. Хочу подключиться.' },
      { from: 'client', text: 'Заодно расскажите, как у вас устроена сеть?' }
    ],
    stages: {
      initial: {
        replies: [
          { label: 'Это коммерческая тайна', leadsTo: 'suspicious' },
          { label: 'Расскажу общие детали', leadsTo: 'spy_win', penalty: { reputation: -3 } }
        ]
      },
      suspicious: {
        messages: [{ from: 'client', text: 'Ладно. Тогда просто подключите.' }],
        replies: [{ label: 'Хорошо', waitDays: 2, leadsTo: 'spy_caught' }]
      },
      spy_caught: {
        waitDays: 2,
        messages: [{ from: 'client', text: 'Вы поняли, кто я. Отчёт конкурента уже ушёл.' }],
        replies: [
          { label: 'Ищите другого провайдера', leadsTo: 'resolved', reward: { reputation: 3 } },
          { label: 'Оставайтесь клиентом', leadsTo: 'resolved', reward: { reputation: 1, cash: 500 } }
        ]
      },
      spy_win: {
        messages: [{ from: 'client', text: 'Спасибо за информацию!' }],
        replies: [{ label: '...', leadsTo: 'resolved', penalty: { reputation: -5 } }]
      }
    }
  },

  elderly_confused: {
    subject: 'Как включить телевизор?',
    intro: [{ from: 'client', text: 'Здравствуйте. Извините, я не понимаю, как включить ваш интернет.' }],
    stages: {
      initial: {
        replies: [
          { label: 'Объясню по шагам', apCost: 1, leadsTo: 'explain' },
          { label: 'Отправить техника (1000₽)', cost: 1000, leadsTo: 'tech_visit' }
        ]
      },
      explain: {
        messages: [{ from: 'client', text: 'Спасибо! Кажется, получилось.' }],
        replies: [{ label: 'Проверьте через день', waitDays: 1, leadsTo: 'follow_up' }]
      },
      tech_visit: {
        waitDays: 1,
        messages: [{ from: 'client', text: 'Техник всё показал. Спасибо, милый человек.' }],
        replies: [{ label: 'Обращайтесь', leadsTo: 'resolved', reward: { reputation: 2 } }]
      },
      follow_up: {
        waitDays: 1,
        messages: [{ from: 'client', text: 'Не работает. Может, придёте?' }],
        replies: [
          { label: 'Отправить техника (1000₽)', cost: 1000, leadsTo: 'resolved', reward: { reputation: 3 } },
          { label: 'Извините, не можем', leadsTo: 'resolved', penalty: { reputation: -3 } }
        ]
      }
    }
  },

  child_prodigy: {
    subject: 'Мама сказала написать',
    intro: [
      { from: 'client', text: 'Привет! Мне 11 лет. Мама сказала написать вам.' },
      { from: 'client', text: 'У меня медленный интернет. Наверное, мамин.' }
    ],
    stages: {
      initial: {
        replies: [
          { label: 'Поговорить с мамой', apCost: 1, leadsTo: 'mom' },
          { label: 'Просто помочь', leadsTo: 'help_kid' }
        ]
      },
      mom: {
        messages: [{ from: 'client', text: 'Мама сказала, что заплатит, если поможете.' }],
        replies: [{ label: 'Хорошо', leadsTo: 'resolved', reward: { cash: 500, reputation: 2 } }]
      },
      help_kid: {
        messages: [{ from: 'client', text: 'Спасибо! Я всё сделал сам, по вашей подсказке.' }],
        replies: [{ label: 'Молодец', leadsTo: 'resolved', reward: { reputation: 3 } }]
      }
    }
  },

  ransomware: {
    subject: 'Угроза данных',
    intro: [
      { from: 'client', text: 'Здравствуйте! Мой компьютер заблокирован. Требуют выкуп.' },
      { from: 'client', text: 'На экране — жёлтый символ. Три стрелки.' }
    ],
    stages: {
      initial: {
        replies: [
          { label: 'Помогу восстановить (1 AP)', apCost: 1, minigame: 'bitflip', leadsTo: 'restored', reward: { reputation: 5 } },
          { label: 'Это не наш сервис', leadsTo: 'resolved', penalty: { reputation: -5 } }
        ]
      },
      restored: {
        messages: [{ from: 'client', text: 'Спасибо! Всё работает.' }],
        replies: [{ label: 'Обращайтесь', leadsTo: 'resolved', reward: { reputation: 3 } }]
      }
    }
  },

  data_leak: {
    subject: 'Утечка данных',
    intro: [{ from: 'client', text: 'В открытом доступе мои данные! Это из вашей базы?' }],
    stages: {
      initial: {
        replies: [
          { label: 'Проверю (1 AP)', apCost: 1, leadsTo: 'check' },
          { label: 'Это не к нам', leadsTo: 'angry' }
        ]
      },
      check: {
        messages: [{ from: 'client', text: 'И?' }],
        replies: [{ label: 'Расследование идёт', waitDays: 2, leadsTo: 'result' }]
      },
      result: {
        waitDays: 2,
        messages: [{ from: 'client', text: 'Ну что там?' }],
        replies: [
          { label: 'Нашли. Компенсация (2000₽)', cost: 2000, leadsTo: 'resolved', reward: { reputation: 3 } },
          { label: 'Это старый инцидент', leadsTo: 'resolved', reward: { reputation: 1 } }
        ]
      },
      angry: {
        messages: [{ from: 'client', text: 'Тогда я в суд!' }],
        replies: [{ label: '...', leadsTo: 'resolved', penalty: { reputation: -8 } }]
      }
    }
  },

  journalist: {
    subject: 'Интервью?',
    intro: [{ from: 'client', text: 'Здравствуйте! Я журналист. Хочу написать о вашей компании.' }],
    stages: {
      initial: {
        replies: [
          { label: 'Согласиться', leadsTo: 'interview' },
          { label: 'Отказать', leadsTo: 'resolved', penalty: { reputation: -2 } }
        ]
      },
      interview: {
        messages: [{ from: 'client', text: 'Спасибо! Статья выйдет через день.' }],
        replies: [{ label: 'Жду', waitDays: 1, leadsTo: 'published' }]
      },
      published: {
        waitDays: 1,
        messages: [{ from: 'client', text: 'Статья вышла! Очень положительная.' }],
        replies: [
          { label: 'Спасибо', leadsTo: 'resolved', reward: { reputation: 5, cash: 300 } },
          { label: 'Просили не публиковать', leadsTo: 'resolved', penalty: { reputation: -1 } }
        ]
      }
    }
  },

  government_audit: {
    subject: 'Проверка',
    intro: [{ from: 'client', text: 'Государственная инспекция. Проверка документов.' }],
    stages: {
      initial: {
        replies: [
          { label: 'Документы в порядке', leadsTo: 'fine' },
          { label: 'Дать взятку (10 000₽)', cost: 10000, chance: 0.5, leadsTo: 'bribe_ok', failsTo: 'bribe_fail' }
        ]
      },
      fine: {
        messages: [{ from: 'client', text: 'Найдены нарушения. Штраф 5000₽.' }],
        replies: [{ label: 'Оплатить', cost: 5000, leadsTo: 'resolved', penalty: { reputation: -3 } }]
      },
      bribe_ok: {
        messages: [{ from: 'client', text: 'Всё чисто. До свидания.' }],
        replies: [{ label: 'Спасибо', leadsTo: 'resolved', reward: { reputation: 1 } }]
      },
      bribe_fail: {
        messages: [{ from: 'client', text: 'Вы пытались дать взятку. Это уголовное дело.' }],
        replies: [{ label: '...', leadsTo: 'resolved', penalty: { reputation: -15 } }]
      }
    }
  },

  /* ---------- С УСЛОВИЯМИ ---------- */
  mysterious_caller: {
    subject: 'Звонок в 3:33',
    condition: g => g.world.threat >= 3,
    intro: [
      { from: 'client', text: 'Я получил(а) странный звонок. Голос сказал: «Передай ему, что я вижу».' },
      { from: 'client', text: 'Это было в 3:33. Кто это может быть?' }
    ],
    stages: {
      initial: {
        replies: [
          { label: 'Проверю (1 AP)', apCost: 1, leadsTo: 'check' },
          { label: 'Игнорировать', leadsTo: 'resolved', penalty: { reputation: -1 } }
        ]
      },
      check: {
        messages: [{ from: 'client', text: 'Они позвонили снова. Сказали: «Скажи ему — я приду».' }],
        replies: [{ label: 'Заблокируйте номер', leadsTo: 'resolved', reward: { reputation: 1 } }]
      }
    }
  },

  survivor_after_gala: {
    subject: 'Я был там',
    condition: g => g.world.flags.galaSurvived,
    intro: [
      { from: 'client', text: 'Здравствуйте. Я был(а) на гала-вечере.' },
      { from: 'client', text: 'Видел(а) её. Ту, что убивает. Она смеялась.' }
    ],
    stages: {
      initial: {
        replies: [
          { label: 'Расскажите всё', apCost: 1, leadsTo: 'story' },
          { label: 'Мне жаль', leadsTo: 'resolved', reward: { reputation: 1 } }
        ]
      },
      story: {
        messages: [{ from: 'client', text: 'Она сказала, что «все будут решены». Что это значит?' }],
        replies: [
          { label: 'Я не знаю', leadsTo: 'resolved', reward: { reputation: 2 } },
          { label: 'Готовьтесь к худшему', leadsTo: 'resolved', reward: { reputation: 3 } }
        ]
      }
    }
  },

  drone_friend: {
    subject: 'Дрон просит помощи',
    condition: g => g.world.drones.enabled,
    intro: [
      { from: 'client', text: '...Я... не должен... писать...' },
      { from: 'client', text: '...Помогите... меня заразили...' }
    ],
    stages: {
      initial: {
        replies: [
          { label: 'Проверю (1 AP)', apCost: 1, leadsTo: 'check' },
          { label: 'Отключить', leadsTo: 'resolved', penalty: { reputation: -1 } }
        ]
      },
      check: {
        messages: [{ from: 'client', text: 'Спасибо... Я... свободен...' }],
        replies: [
          { label: 'Хорошо', leadsTo: 'resolved', reward: { reputation: 2 } },
          { label: 'Откуда ты?', waitDays: 1, leadsTo: 'lore' }
        ]
      },
      lore: {
        waitDays: 1,
        messages: [{ from: 'client', text: 'Поместье Эллиот. Там много таких, как я.' }],
        replies: [{ label: 'Понятно', leadsTo: 'resolved', reward: { reputation: 3 } }]
      }
    }
  },

  ark_complaint: {
    subject: 'Жалоба из ковчега',
    condition: g => g.world.flags.arkBuilt,
    intro: [{ from: 'client', text: 'Служба поддержки? У нас проблемы с вентиляцией.' }],
    stages: {
      initial: {
        replies: [
          { label: 'Отправить ремонтников', apCost: 1, leadsTo: 'fix' },
          { label: 'Потерпите', leadsTo: 'resolved', penalty: { reputation: -3 } }
        ]
      },
      fix: {
        messages: [{ from: 'client', text: 'Всё работает. Спасибо.' }],
        replies: [{ label: 'Обращайтесь', leadsTo: 'resolved', reward: { reputation: 2 } }]
      }
    }
  },

  /* Сообщение от Neon — только после личного знакомства */
  neon_message: {
    subject: 'Сообщение через клиента',
    condition: g => g.world.neon.met && g.world.neon.state === 'active',
    intro: [
      { from: 'client', text: 'Мне сказали передать: «Она движется».' },
      { from: 'client', text: 'Кто такой Neon?' }
    ],
    stages: {
      initial: {
        replies: [
          { label: 'Ничего не знаю', leadsTo: 'resolved' },
          { label: 'Передайте: понял', leadsTo: 'acknowledged' }
        ]
      },
      acknowledged: {
        messages: [{ from: 'client', text: 'Передал(а). Что-то нехорошее происходит?' }],
        replies: [{ label: 'Берегите себя', leadsTo: 'resolved', reward: { reputation: 1 } }]
      }
    }
  },

  hacker_gift: {
    subject: 'Странная посылка',
    condition: g => g.world.threat >= 2,
    intro: [
      { from: 'client', text: 'Мне пришла посылка. Внутри — флешка.' },
      { from: 'client', text: 'На ней надпись: «От друга».' }
    ],
    stages: {
      initial: {
        replies: [
          { label: 'Не вставляйте!', leadsTo: 'safe' },
          { label: 'Что там?', chance: 0.5, leadsTo: 'risky', failsTo: 'virus' }
        ]
      },
      safe: { messages: [{ from: 'client', text: 'Уничтожил(а). Спасибо.' }], replies: [{ label: 'Правильно', leadsTo: 'resolved', reward: { reputation: 2 } }] },
      risky: {
        messages: [{ from: 'client', text: 'Там данные о клиентах... чьих-то.' }],
        replies: [
          { label: 'Отдайте в полицию', leadsTo: 'resolved', reward: { reputation: 3 } },
          { label: 'Оставьте себе', leadsTo: 'resolved', penalty: { reputation: -2 } }
        ]
      },
      virus: {
        messages: [{ from: 'client', text: 'Флешка заразила компьютер! На экране — жёлтый символ!' }],
        replies: [{ label: 'Извините', leadsTo: 'resolved', penalty: { reputation: -5 } }]
      }
    }
  },

  /* ---------- РЕДКИЕ ---------- */
  ghost_client: {
    subject: 'Я умираю',
    intro: [
      { from: 'client', text: 'Здравствуйте. Я старый клиент.' },
      { from: 'client', text: 'Я умираю. Хочу попрощаться.' }
    ],
    stages: {
      initial: {
        replies: [
          { label: 'Выслушать', leadsTo: 'story' },
          { label: 'Это не к нам', leadsTo: 'resolved', penalty: { reputation: -5 } }
        ]
      },
      story: {
        messages: [
          { from: 'client', text: 'Спасибо. Вы были единственными, кто отвечал.' },
          { from: 'client', text: 'Передайте дочке — я её люблю.' }
        ],
        replies: [{ label: 'Обязательно', leadsTo: 'resolved', reward: { reputation: 5, cash: 1000 } }]
      }
    }
  },

  /* ВАЖНО: intro — функция, подставляет реальное имя сотрудника */
  employee_defection: {
    subject: 'Ваш сотрудник',
    condition: g => g.employees.length > 0,
    intro: (g) => {
      const emp = NB.pick(g.employees);
      return [
        { from: 'client', text: `У вас работает ${emp.name}. Хочу переманить.` },
        { from: 'client', text: `Предлагаю ему больше. Что скажете?` }
      ];
    },
    stages: {
      initial: {
        replies: [
          { label: 'Не отдам', leadsTo: 'resolved', reward: { reputation: 2 } },
          { label: 'Обсудим условия (5000₽)', cost: 5000, leadsTo: 'negotiate' }
        ]
      },
      negotiate: {
        messages: [{ from: 'client', text: 'Спасибо за сотрудничество!' }],
        replies: [{ label: '...', leadsTo: 'resolved', penalty: { reputation: -3 } }]
      }
    }
  },

  tv_show: {
    subject: 'Хотим снять шоу',
    condition: g => g.reputation > 60,
    intro: [{ from: 'client', text: 'Здравствуйте! Мы телеканал. Хотим снять шоу о вашей компании.' }],
    stages: {
      initial: {
        replies: [
          { label: 'Согласиться (1 AP)', apCost: 1, leadsTo: 'filming' },
          { label: 'Отказать', leadsTo: 'resolved', penalty: { reputation: -1 } }
        ]
      },
      filming: {
        waitDays: 3,
        messages: [{ from: 'client', text: 'Шоу вышло! Огромная аудитория.' }],
        replies: [{ label: 'Отлично', leadsTo: 'resolved', reward: { reputation: 10, cash: 5000 } }]
      }
    }
  },

  apocalypse_scavenger: {
    subject: 'Обмен?',
    condition: g => g.world.threat >= 6,
    intro: [{ from: 'client', text: 'У меня есть припасы. Хочу обменять на интернет.' }],
    stages: {
      initial: {
        replies: [
          { label: 'Принять обмен', leadsTo: 'resolved', reward: { cash: 1000, reputation: 2 } },
          { label: 'У нас нет припасов', leadsTo: 'resolved' }
        ]
      }
    }
  }
};

/* ============================================================
   СОЗДАНИЕ ОБРАЩЕНИЯ
   ============================================================ */
C.createTicket = function (clientId, forcedKey) {
  const st = NB.state, g = st.game;
  if (!st.story) st.story = {};
  if (!st.story.usedTickets) st.story.usedTickets = [];
  const used = st.story.usedTickets;

  const available = Object.keys(C.TEMPLATES).filter(k => {
    const tpl = C.TEMPLATES[k];
    if (tpl.condition && !tpl.condition(g)) return false;
    if (!tpl.repeatable && used.includes(k)) return false;
    return true;
  });
  if (!available.length) return null;

  const rare = available.filter(k => C.TEMPLATES[k].condition);
  const tplKey = forcedKey ||
    (rare.length && Math.random() < 0.4 ? NB.pick(rare) : NB.pick(available));
  const tpl = C.TEMPLATES[tplKey];
  if (!tpl) return null;

  if (!tpl.repeatable) used.push(tplKey);

  /* intro может быть функцией — вызываем с game */
  const introArr = typeof tpl.intro === 'function' ? tpl.intro(g) : tpl.intro;
  if (!introArr || !introArr.length) return null;

  const id = st.seq.ticket++;
  st.tickets.push({
    id, clientId, subject: tpl.subject,
    status: 'open',
    createdAt: new Date().toISOString(),
    templateId: tplKey,
    stage: 'initial',
    chat: introArr.map(m => ({ from: m.from, text: m.text, at: Date.now() }))
  });
  return id;
};

/* ============================================================
   ТИК — отложенные этапы
   ============================================================ */
C.tickTickets = function () {
  const currentDay = NB.state.game.daily.dayNumber;
  let changed = false;
  NB.state.tickets.forEach(t => {
    if (t.status !== 'open') return;
    if (t.waitUntil && currentDay >= t.waitUntil && t.pendingStage) {
      const tpl = C.TEMPLATES[t.templateId];
      if (!tpl || !tpl.stages[t.pendingStage]) return;
      t.stage = t.pendingStage;
      t.pendingStage = null;
      t.waitUntil = null;
      const stage = tpl.stages[t.stage];
      if (stage.messages) {
        stage.messages.forEach(m => t.chat.push({ from: m.from, text: m.text, at: Date.now() }));
      }
      changed = true;
    }
  });
  if (changed) NB.save();
};

if (NB.daily && NB.daily.advanceDay && !NB.daily.advanceDay.__chatWrapped) {
  const orig = NB.daily.advanceDay;
  NB.daily.advanceDay = function () {
    const r = orig.apply(this, arguments);
    try { C.tickTickets(); } catch (e) { console.warn('[chat] tick', e); }
    return r;
  };
  NB.daily.advanceDay.__chatWrapped = true;
}

C.reset = function () {
  if (NB.state && NB.state.story) NB.state.story.usedTickets = [];
};

/* ============================================================
   РЕНДЕР
   ============================================================ */
C.renderView = function () {
  const st = NB.state;
  C.tickTickets();
  const tickets = st.tickets.filter(t => t.status === 'open');

  if (!NB.ui.chatThreadId && tickets[0]) NB.ui.chatThreadId = tickets[0].id;
  let selected = NB.ui.chatThreadId ? tickets.find(t => t.id === NB.ui.chatThreadId) : null;
  if (!selected && tickets[0]) {
    selected = tickets[0];
    NB.ui.chatThreadId = selected.id;
  }

  return `
    <div class="page-head">
      <div><h1>Поддержка</h1><p class="muted">${tickets.length} открытых обращений</p></div>
    </div>
    <div class="chat-wrap">
      <div class="chat-sidebar">
        ${tickets.length ? tickets.map(t => {
          const c = NB.client(t.clientId) || { name: '—' };
          const last = t.chat[t.chat.length - 1];
          const waiting = t.waitUntil ? '⌛' : '';
          return `<div class="chat-thread-item ${selected && selected.id === t.id ? 'active' : ''}" data-chat-thread="${t.id}">
            <b>${NB.esc(c.name)}</b>
            <small>${NB.esc(t.subject)} ${waiting}</small>
            <small style="color:var(--text-2);margin-top:4px">${last ? NB.esc((last.text || '').slice(0, 50)) : ''}</small>
          </div>`;
        }).join('') : '<p class="empty" style="padding:20px">Нет открытых заявок</p>'}
      </div>
      <div class="chat-main">
        ${selected ? C.renderChat(selected) : '<p class="empty" style="padding:40px">Выберите обращение</p>'}
      </div>
    </div>`;
};

C.renderChat = function (t) {
  const c = NB.client(t.clientId) || { name: '—' };
  const tpl = C.TEMPLATES[t.templateId];
  const stage = tpl && tpl.stages ? tpl.stages[t.stage] : null;
  const isWaiting = !!t.waitUntil;

  return `
    <div class="chat-header">
      <div>
        <h3>${NB.esc(t.subject)}</h3>
        <small class="muted" style="font-size:11.5px">${NB.esc(c.name)} · ${NB.esc(c.phone)}</small>
      </div>
      <span class="pill ${isWaiting ? 'wait' : 'ok'}">${isWaiting ? '⏳ Ожидание' : 'Открыта'}</span>
    </div>
    <div class="chat-messages" id="chat-messages">
      ${t.chat.map(m => `<div class="chat-msg ${m.from}${m.system ? ' system' : ''}">${NB.esc(m.text)}<small>${new Date(m.at).toLocaleTimeString('ru-RU', { hour:'2-digit', minute:'2-digit' })}</small></div>`).join('')}
    </div>
    ${isWaiting
      ? `<div class="chat-waiting">⏳ Ждём ответа — вернитесь через день</div>`
      : (stage && stage.replies ? `<div class="chat-choices">${stage.replies.map((r, i) => C.renderChoice(r, i, t)).join('')}</div>` : '')}
  `;
};

C.renderChoice = function (r, idx, t) {
  const g = NB.state.game;
  const meta = [];
  if (r.apCost > 0) meta.push(`<span class="ap">−${r.apCost} AP</span>`);
  if (r.cost) meta.push(`<span class="free" style="color:#f87171">−${r.cost}₽</span>`);
  if (r.employeeSkill) {
    const best = NB.employees.bestFor(r.employeeSkill);
    if (best) meta.push(`<span class="emp">👤 ${best.name}</span>`);
    else meta.push(`<span class="emp" style="opacity:.5">нужен сотрудник</span>`);
  }
  if (r.minigame) meta.push(`<span class="mg">🎮</span>`);
  if (r.chance !== undefined) meta.push(`<span class="chance">${Math.round(r.chance*100)}%</span>`);

  const disabled =
    (r.apCost > 0 && g.ap.current < r.apCost) ||
    (r.cost && g.cash < r.cost) ||
    (r.employeeSkill && !NB.employees.bestFor(r.employeeSkill));

  return `<button class="chat-choice" data-chat-reply="${idx}" ${disabled ? 'disabled' : ''}>
    <span>${NB.esc(r.label)}</span>
    <span class="ch-meta">${meta.join('')}</span>
  </button>`;
};

/* ============================================================
   ОБРАБОТКА ОТВЕТА
   ============================================================ */
C.handleReply = function (ticketId, replyIdx) {
  const t = NB.state.tickets.find(x => x.id === ticketId);
  if (!t) return;
  const tpl = C.TEMPLATES[t.templateId];
  if (!tpl || !tpl.stages[t.stage]) return;
  const stage = tpl.stages[t.stage];
  const reply = stage.replies[replyIdx];
  if (!reply) return;
  const g = NB.state.game;

  if (reply.apCost > 0 && g.ap.current < reply.apCost) return NB.toast('Не хватает AP', 'err');
  if (reply.cost && g.cash < reply.cost) return NB.toast('Недостаточно денег', 'err');
  let employee = null;
  if (reply.employeeSkill) {
    employee = NB.employees.bestFor(reply.employeeSkill);
    if (!employee) return NB.toast('Нужен сотрудник', 'err');
    if (employee.ap.current < 1) return NB.toast('У сотрудника нет AP', 'err');
  }

  if (reply.apCost > 0) NB.spendAp(reply.apCost);
  if (reply.cost) g.cash -= reply.cost;
  if (employee) NB.employees.spendAp(employee.id, 1);

  t.chat.push({ from: 'staff', text: reply.label, at: Date.now() });

  if (reply.minigame) {
    NB.save();
    NB.minigames.start(reply.minigame, (success) => {
      const finalTarget = success
        ? (reply.leadsTo || 'resolved')
        : (reply.failsTo || 'resolved');
      C.advanceToStage(t, finalTarget, reply, success, employee, tpl);
    });
    return;
  }

  let finalTarget = reply.leadsTo || 'resolved';
  let success = true;
  if (reply.chance !== undefined) {
    success = Math.random() < reply.chance;
    if (!success) finalTarget = reply.failsTo || 'resolved';
  }
  C.advanceToStage(t, finalTarget, reply, success, employee, tpl);
};

C.advanceToStage = function (t, targetStage, reply, success, employee, tpl) {
  if (targetStage === 'resolved') {
    C.resolveTicket(t, reply, success, employee);
    return;
  }
  const next = tpl.stages[targetStage];
  if (!next) { C.resolveTicket(t, reply, success, employee); return; }

  if (next.waitDays && next.waitDays > 0) {
    t.pendingStage = targetStage;
    t.waitUntil = NB.state.game.daily.dayNumber + next.waitDays;
    t.stage = 'waiting';
    t.chat.push({ from: 'staff', text: `— ожидание ${next.waitDays} дн. —`, at: Date.now(), system: true });
  } else {
    t.stage = targetStage;
    if (next.messages) next.messages.forEach(m => t.chat.push({ from: m.from, text: m.text, at: Date.now() }));
  }
  NB.save();
  NB.render();
};

C.resolveTicket = function (t, reply, success, employee) {
  t.status = 'resolved';
  const g = NB.state.game;
  const reward = reply.reward || {};
  const penalty = reply.penalty || {};

  if (success) {
    if (reward.reputation) g.reputation = Math.min(100, g.reputation + reward.reputation);
    if (reward.cash) g.cash += reward.cash;
    NB.addLog(`Заявка «${t.subject}» решена${employee ? ' (' + employee.name + ')' : ''}`, 'success');
  } else {
    if (penalty.reputation) g.reputation = Math.max(0, g.reputation + penalty.reputation);
    else g.reputation = Math.max(0, g.reputation - 1);
    NB.addLog(`Заявка «${t.subject}» решена плохо`, 'warn');
  }

  if (employee) NB.employees.levelUp(employee.id);
  NB.addCompanyXp(success ? 8 : 3);

  const c = NB.client(t.clientId);
  if (c && success && c.risk === 'risky') c.risk = 'normal';

  NB.save();
  NB.ui.chatThreadId = null;
  NB.render();
};

})(window);