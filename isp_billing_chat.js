/* isp_billing_chat.js — чат-тикеты */
(function (global) {
'use strict';
const NB = global.NB;
const C = NB.chat = NB.chat || {};

C.TEMPLATES = {
  slow_speed: {
    subject: 'Медленная скорость',
    intro: [
      { from: 'client', text: 'Здравствуйте! У меня вечером интернет работает ужасно. Видео не грузятся.' },
      { from: 'client', text: 'Что можно сделать?' }
    ],
    stages: {
      initial: {
        replies: [
          { label: 'Давайте проверю линию', apCost: 1, leadsTo: 'check_line' },
          { label: 'Перезагрузите роутер', apCost: 0, leadsTo: 'reboot' },
          { label: 'Отправить техника', apCost: 0, employeeSkill: 'repair', leadsTo: 'send_tech', reward: { reputation: 1 } }
        ]
      },
      check_line: {
        messages: [{ from: 'client', text: 'Хорошо, жду' }],
        replies: [
          { label: 'Нашёл проблему — сейчас исправлю', apCost: 1, minigame: 'bitflip', leadsTo: 'resolved', reward: { reputation: 2, cash: 100 } },
          { label: 'Нужна замена кабеля, платно', apCost: 0, leadsTo: 'paid_repair' }
        ]
      },
      reboot: {
        messages: [{ from: 'client', text: 'Перезагрузил. Не помогло...' }],
        replies: [
          { label: 'Тогда проверим линию', apCost: 1, leadsTo: 'check_line' },
          { label: 'Завтра посмотрим', apCost: 0, leadsTo: 'resolved', penalty: { reputation: -1 } }
        ]
      },
      send_tech: {
        messages: [{ from: 'client', text: 'Спасибо, техник всё починил!' }],
        replies: [{ label: 'Рады помочь!', apCost: 0, leadsTo: 'resolved', reward: { reputation: 3 } }]
      },
      paid_repair: {
        messages: [{ from: 'client', text: 'Сколько это будет стоить?' }],
        replies: [
          { label: '500 ₽, мастер сегодня', apCost: 0, leadsTo: 'resolved', reward: { cash: 500, reputation: 1 } },
          { label: 'Бесплатно, за наш счёт', apCost: 0, leadsTo: 'resolved', reward: { reputation: 4 } },
          { label: 'Отменим заявку', apCost: 0, leadsTo: 'resolved', penalty: { reputation: -2 } }
        ]
      }
    }
  },
  broken_router: {
    subject: 'Не работает роутер',
    intro: [{ from: 'client', text: 'Роутер сгорел, ничего не работает. Что делать?' }],
    stages: {
      initial: {
        replies: [
          { label: 'Новый роутер за 1500 ₽', apCost: 0, leadsTo: 'resolved', reward: { cash: 1500, reputation: 2 } },
          { label: 'Попробуйте сброс', apCost: 1, minigame: 'sequence', leadsTo: 'resolved', reward: { reputation: 1 } },
          { label: 'Это не наша проблема', apCost: 0, leadsTo: 'resolved', penalty: { reputation: -3 } }
        ]
      }
    }
  },
  billing_error: {
    subject: 'Ошибка в счёте',
    intro: [{ from: 'client', text: 'В моём счёте ошибка! Я платил за 500 Мбит, а указано 200.' }],
    stages: {
      initial: {
        replies: [
          { label: 'Проверю ваш тариф', apCost: 1, leadsTo: 'check_tariff' },
          { label: 'Оплатите, потом разберёмся', apCost: 0, leadsTo: 'resolved', penalty: { reputation: -2 } },
          { label: 'Прошу прощения, пересчитаем', apCost: 0, leadsTo: 'resolved', reward: { reputation: 3 } }
        ]
      },
      check_tariff: {
        messages: [{ from: 'client', text: 'И?' }],
        replies: [
          { label: 'Ошибка наша. Пересчёт сделан.', apCost: 0, cost: 100, leadsTo: 'resolved', reward: { reputation: 2 } },
          { label: 'Всё верно, тариф такой', apCost: 0, leadsTo: 'resolved', penalty: { reputation: -1 } }
        ]
      }
    }
  },
  hacker_threat: {
    subject: 'Угроза взлома',
    intro: [
      { from: 'client', text: 'Привет. Я взломал твой сервер. У меня база клиентов.' },
      { from: 'client', text: 'Заплати 20 000 ₽ — или солью всё.' }
    ],
    stages: {
      initial: {
        replies: [
          { label: 'Заплатить 20 000 ₽', apCost: 0, cost: 20000, leadsTo: 'paid' },
          { label: 'Я вызову ФСБ', apCost: 1, minigame: 'codebreak', leadsTo: 'caught', reward: { reputation: 5 } },
          { label: 'Сам тебя взломаю', apCost: 2, employeeSkill: 'hack', leadsTo: 'counter_hack', reward: { reputation: 3, cash: 5000 } },
          { label: 'Проигнорировать', apCost: 0, leadsTo: 'leaked', penalty: { reputation: -15 } }
        ]
      },
      paid: {
        messages: [{ from: 'client', text: 'Умный ход.' }],
        replies: [{ label: 'Понял', apCost: 0, leadsTo: 'resolved' }]
      },
      caught: {
        messages: [{ from: 'client', text: 'Ладно, ладно! Я не хотел!' }],
        replies: [{ label: 'Хорошо', apCost: 0, leadsTo: 'resolved', reward: { reputation: 3 } }]
      },
      counter_hack: {
        messages: [{ from: 'client', text: 'Как ты... это невозможно...' }],
        replies: [{ label: 'Это тебе урок', apCost: 0, leadsTo: 'resolved', reward: { reputation: 5 } }]
      },
      leaked: {
        messages: [{ from: 'client', text: 'Твоя репутация теперь в открытом доступе.' }],
        replies: [{ label: '...', apCost: 0, leadsTo: 'resolved' }]
      }
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
          { label: 'Смените пароль', apCost: 0, leadsTo: 'resolved', reward: { reputation: 1 } },
          { label: 'Это вы сами', apCost: 0, leadsTo: 'resolved', penalty: { reputation: -1 } }
        ]
      },
      analyzed: {
        messages: [{ from: 'client', text: 'И что там?' }],
        replies: [
          { label: 'Ложная тревога', apCost: 0, leadsTo: 'resolved', reward: { reputation: 2 } },
          { label: 'Попытка взлома. Блокирую', apCost: 0, leadsTo: 'resolved', reward: { reputation: 4, cash: 500 } }
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
          { label: 'Вы заблокированы', apCost: 0, leadsTo: 'resolved', reward: { reputation: 2 } },
          { label: 'Расскажи подробнее', apCost: 1, leadsTo: 'info' },
          { label: 'Не пишите нам больше', apCost: 0, leadsTo: 'resolved' }
        ]
      },
      info: {
        messages: [{ from: 'client', text: 'Отлично! Переведи 5000₽ — получишь 50000₽ через неделю.' }],
        replies: [
          { label: 'Вы точно мошенник. Блокирую.', apCost: 0, leadsTo: 'resolved', reward: { reputation: 3 } },
          { label: 'Попробую (5000₽)', apCost: 0, cost: 5000, leadsTo: 'scammed', penalty: { reputation: -3 } }
        ]
      },
      scammed: {
        messages: [{ from: 'client', text: 'Спасибо! Деньги придут через неделю.' }],
        replies: [{ label: 'Буду ждать', apCost: 0, leadsTo: 'resolved' }]
      }
    }
  },
  business_offer: {
    subject: 'Подключение офиса',
    intro: [{ from: 'client', text: 'Добрый день! Открываем офис, нужно 10 точек. Что предложите?' }],
    stages: {
      initial: {
        replies: [
          { label: 'Давайте обсудим условия', apCost: 1, minigame: 'negotiate', leadsTo: 'negotiate', reward: { cash: 3000, reputation: 3 } },
          { label: 'Стандартный тариф 1200 ₽', apCost: 0, leadsTo: 'resolved', reward: { cash: 1000 } },
          { label: 'Слишком мелкий заказ', apCost: 0, leadsTo: 'resolved', penalty: { reputation: -2 } }
        ]
      },
      negotiate: {
        messages: [{ from: 'client', text: 'Приятно иметь дело! Договор завтра.' }],
        replies: [{ label: 'Отлично', apCost: 0, leadsTo: 'resolved', reward: { cash: 2000, reputation: 2 } }]
      }
    }
  },
  refund_request: {
    subject: 'Возврат средств',
    intro: [{ from: 'client', text: 'Меня не устроило качество. Верните за 3 месяца.' }],
    stages: {
      initial: {
        replies: [
          { label: 'Вернём полную сумму (1500₽)', apCost: 0, cost: 1500, leadsTo: 'resolved', reward: { reputation: 4 } },
          { label: 'Вернём 50% (750₽)', apCost: 0, cost: 750, leadsTo: 'resolved', reward: { reputation: 1 } },
          { label: 'Отказать', apCost: 0, leadsTo: 'refuse' }
        ]
      },
      refuse: {
        messages: [{ from: 'client', text: 'Тогда жалоба в Роспотребнадзор!' }],
        replies: [
          { label: 'Давайте всё же вернём (1500₽)', apCost: 0, cost: 1500, leadsTo: 'resolved', reward: { reputation: 2 } },
          { label: 'Жалуйтесь', apCost: 0, leadsTo: 'resolved', penalty: { reputation: -5 } }
        ]
      }
    }
  },
  sla_complaint: {
    subject: 'Жалоба на скорость',
    intro: [{ from: 'client', text: 'Уже третий день скорость ниже заявленной! Я платил за 500, а получаю 50!' }],
    stages: {
      initial: {
        replies: [
          { label: 'Проверю линию (1 AP)', apCost: 1, minigame: 'sequence', leadsTo: 'checked' },
          { label: 'Компенсировать (500₽)', apCost: 0, cost: 500, leadsTo: 'resolved', reward: { reputation: 2 } },
          { label: 'Это ваш роутер', apCost: 0, leadsTo: 'refused', penalty: { reputation: -3 } }
        ]
      },
      checked: {
        messages: [{ from: 'client', text: 'И что показало?' }],
        replies: [
          { label: 'Проблема у нас. Исправлено.', apCost: 0, leadsTo: 'resolved', reward: { reputation: 4 } },
          { label: 'Требуется замена оборудования (1000₽)', apCost: 0, cost: 1000, leadsTo: 'resolved', reward: { reputation: 1 } }
        ]
      },
      refused: {
        messages: [{ from: 'client', text: 'Ну и сервис...' }],
        replies: [{ label: 'До свидания', apCost: 0, leadsTo: 'resolved' }]
      }
    }
  },
  upsell_biz: {
    subject: 'Хочу улучшить тариф',
    intro: [{ from: 'client', text: 'Мне нравится ваш сервис. Думаю перейти на более дорогой тариф. Что посоветуете?' }],
    stages: {
      initial: {
        replies: [
          { label: 'Предложить VIP', apCost: 0, employeeSkill: 'pitch', leadsTo: 'upsold' },
          { label: 'Предложить стандартный', apCost: 0, leadsTo: 'upsold_std' },
          { label: 'Ничего не предлагать', apCost: 0, leadsTo: 'resolved', penalty: { reputation: -1 } }
        ]
      },
      upsold: {
        messages: [{ from: 'client', text: 'Отлично! Оформляйте.' }],
        replies: [{ label: 'Готово', apCost: 0, leadsTo: 'resolved', reward: { cash: 3000, reputation: 2 } }]
      },
      upsold_std: {
        messages: [{ from: 'client', text: 'Хорошо, подойдёт.' }],
        replies: [{ label: 'Оформлено', apCost: 0, leadsTo: 'resolved', reward: { cash: 800, reputation: 1 } }]
      }
    }
  }
};

C.createTicket = function (clientId) {
  const st = NB.state;
  const keys = Object.keys(C.TEMPLATES);
  const tplKey = NB.pick(keys);
  const tpl = C.TEMPLATES[tplKey];
  const id = st.seq.ticket++;
  st.tickets.push({
    id, clientId, subject: tpl.subject,
    status: 'open',
    createdAt: new Date().toISOString(),
    templateId: tplKey,
    stage: 'initial',
    chat: tpl.intro.map(m => ({ from: m.from, text: m.text, at: Date.now() }))
  });
  return id;
};

C.renderView = function () {
  const st = NB.state;
  const tickets = st.tickets.filter(t => t.status === 'open');

  if (!NB.ui.chatThreadId && tickets[0]) NB.ui.chatThreadId = tickets[0].id;

  let selected = NB.ui.chatThreadId
    ? tickets.find(t => t.id === NB.ui.chatThreadId)
    : null;
  if (!selected && tickets[0]) {
    selected = tickets[0];
    NB.ui.chatThreadId = selected.id;
  }

  return `
    <div class="page-head">
      <div><h1>Поддержка (чат)</h1><p class="muted">${tickets.length} открытых обращений</p></div>
    </div>
    <div class="chat-wrap">
      <div class="chat-sidebar">
        ${tickets.length ? tickets.map(t => {
          const c = NB.client(t.clientId) || { name: '—' };
          const last = t.chat[t.chat.length - 1];
          return `<div class="chat-thread-item ${selected && selected.id === t.id ? 'active' : ''}" data-chat-thread="${t.id}">
            <b>${NB.esc(c.name)}</b>
            <small>${NB.esc(t.subject)}</small>
            <small style="color:var(--text-2);margin-top:4px">${last ? NB.esc(last.text.slice(0, 50)) : ''}</small>
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

  return `
    <div class="chat-header">
      <div>
        <h3>${NB.esc(t.subject)}</h3>
        <small class="muted" style="font-size:11.5px">${NB.esc(c.name)} · ${NB.esc(c.phone)}</small>
      </div>
      <span class="pill wait">${t.status === 'open' ? 'Открыта' : 'Решена'}</span>
    </div>
    <div class="chat-messages" id="chat-messages">
      ${t.chat.map(m => `<div class="chat-msg ${m.from}">${NB.esc(m.text)}<small>${new Date(m.at).toLocaleTimeString('ru-RU', { hour:'2-digit', minute:'2-digit' })}</small></div>`).join('')}
    </div>
    ${stage && stage.replies ? `<div class="chat-choices">
      ${stage.replies.map((r, i) => C.renderChoice(r, i, t)).join('')}
    </div>` : ''}
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

  const disabled =
    (r.apCost > 0 && g.ap.current < r.apCost) ||
    (r.cost && g.cash < r.cost) ||
    (r.employeeSkill && !NB.employees.bestFor(r.employeeSkill));

  return `<button class="chat-choice" data-chat-reply="${idx}" ${disabled ? 'disabled' : ''}>
    <span>${NB.esc(r.label)}</span>
    <span class="ch-meta">${meta.join('')}</span>
  </button>`;
};

C.handleReply = function (ticketId, replyIdx) {
  const t = NB.state.tickets.find(x => x.id === ticketId);
  if (!t) return;
  const tpl = C.TEMPLATES[t.templateId];
  const stage = tpl.stages[t.stage];
  const reply = stage.replies[replyIdx];
  if (!reply) return;
  const g = NB.state.game;

  if (reply.apCost > 0 && g.ap.current < reply.apCost) return NB.toast('Не хватает AP', 'err');
  if (reply.cost && g.cash < reply.cost) return NB.toast('Недостаточно денег', 'err');
  let employee = null;
  if (reply.employeeSkill) {
    employee = NB.employees.bestFor(reply.employeeSkill);
    if (!employee) return NB.toast('Нужен сотрудник с навыком', 'err');
    if (employee.ap.current < 1) return NB.toast('У сотрудника нет AP', 'err');
  }

  if (reply.apCost > 0) NB.spendAp(reply.apCost);
  if (reply.cost) g.cash -= reply.cost;
  if (employee) NB.employees.spendAp(employee.id, 1);

  t.chat.push({ from: 'staff', text: reply.label, at: Date.now() });

  if (reply.minigame) {
    NB.save();
    NB.minigames.start(reply.minigame, (success) => {
      C.resolveTicket(t, reply, success, employee);
    });
    return;
  }

  if (reply.leadsTo === 'resolved') {
    C.resolveTicket(t, reply, true, employee);
  } else if (tpl.stages[reply.leadsTo]) {
    t.stage = reply.leadsTo;
    const next = tpl.stages[reply.leadsTo];
    if (next.messages) next.messages.forEach(m => t.chat.push({ from: m.from, text: m.text, at: Date.now() }));
    NB.save();
    NB.render();
  }
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