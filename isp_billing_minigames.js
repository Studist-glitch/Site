(function (global) {
'use strict';
const NB = global.NB;
const M = NB.minigames = NB.minigames || {};

/* ============ 1. Sequence ============ */
M.sequence = function (callback) {
  const colors = ['0', '1', '2', '3'];
  const rounds = 3;
  let round = 0, sequence = [], playerIdx = 0;

  NB.openModal({
    title: '', noSubmit: true, boxClass: 'mg-modal',
    html: `<div class="mg-modal">
      <div class="mg-title">🔐 Взлом системы</div>
      <div class="mg-desc">Запомните последовательность и повторите. ${rounds} раунда.</div>
      <div class="mg-status" id="mg-status">Готовы?</div>
      <div class="mg-sequence" id="mg-seq">
        ${colors.map(c => `<button class="mg-seq-btn" data-color="${c}"></button>`).join('')}
      </div>
      <div class="mg-actions"><button class="btn ghost" id="mg-skip">Пропустить</button></div>
    </div>`
  });

  const btns = NB.$$('.mg-seq-btn');
  const status = document.getElementById('mg-status');
  const flash = i => { const b = btns[i]; if (!b) return; b.classList.add('active'); setTimeout(() => b.classList.remove('active'), 350); };

  const startRound = () => {
    if (round >= rounds) {
      status.textContent = '✅ Успех!';
      setTimeout(() => { NB.closeModal(); callback && callback(true); }, 700);
      return;
    }
    sequence = [];
    for (let i = 0; i < 2 + round; i++) sequence.push(NB.randInt(0, 3));
    playerIdx = 0;
    status.textContent = `Раунд ${round + 1}/${rounds} — смотрите...`;
    let i = 0;
    const play = () => {
      if (i >= sequence.length) { status.textContent = 'Ваш ход'; return; }
      flash(sequence[i]); i++; setTimeout(play, 600);
    };
    setTimeout(play, 600);
  };

  btns.forEach((b, i) => {
    b.addEventListener('click', () => {
      if (i === sequence[playerIdx]) {
        flash(i); playerIdx++;
        if (playerIdx === sequence.length) { round++; setTimeout(startRound, 500); }
      } else {
        status.textContent = '❌ Ошибка';
        setTimeout(() => { NB.closeModal(); callback && callback(false); }, 700);
      }
    });
  });
  document.getElementById('mg-skip').addEventListener('click', () => { NB.closeModal(); callback && callback(false); });
  startRound();
};

/* ============ 2. Pairs ============ */
M.pairs = function (callback) {
  const icons = ['🔧', '🔌', '💾', '📡', '⚡', '🔋', '🖥', '📱'];
  const deck = [...icons, ...icons].sort(() => Math.random() - 0.5);
  let flipped = [], matched = 0, timeLeft = 30, timer = null;

  NB.openModal({ title: '', noSubmit: true, boxClass: 'mg-modal',
    html: `<div class="mg-modal">
      <div class="mg-title">🔧 Ремонт</div>
      <div class="mg-desc">Найдите все пары за 30 секунд</div>
      <div class="mg-timer" id="mg-timer">30</div>
      <div class="mg-pairs" id="mg-pairs">
        ${deck.map((icon, i) => `<button class="mg-pair" data-idx="${i}" data-icon="${icon}"></button>`).join('')}
      </div>
    </div>`
  });

  const pairs = NB.$$('.mg-pair');
  const timerEl = document.getElementById('mg-timer');
  timer = setInterval(() => {
    timeLeft--;
    timerEl.textContent = timeLeft;
    if (timeLeft <= 0) { clearInterval(timer); NB.closeModal(); callback && callback(false); }
  }, 1000);

  pairs.forEach(p => {
    p.addEventListener('click', () => {
      if (p.classList.contains('flipped') || p.classList.contains('matched')) return;
      p.classList.add('flipped'); p.textContent = p.dataset.icon; flipped.push(p);
      if (flipped.length === 2) {
        if (flipped[0].dataset.icon === flipped[1].dataset.icon) {
          flipped.forEach(f => { f.classList.remove('flipped'); f.classList.add('matched'); });
          flipped = []; matched++;
          if (matched === icons.length) { clearInterval(timer); setTimeout(() => { NB.closeModal(); callback && callback(true); }, 400); }
        } else {
          const tf = [...flipped]; flipped = [];
          setTimeout(() => { tf.forEach(f => { f.classList.remove('flipped'); f.textContent = ''; }); }, 700);
        }
      }
    });
  });
};

/* ============ 3. Codebreak — ввод кода по таймеру ============ */
M.codebreak = function (callback) {
  const code = Array.from({ length: 6 }, () => NB.randInt(0, 9)).join('');
  let timeLeft = 8, timer = null, done = false;

  const finish = (ok) => {
    if (done) return; done = true;
    clearInterval(timer);
    NB.closeModal();
    callback && callback(ok);
  };

  NB.openModal({ title: '', noSubmit: true, boxClass: 'mg-modal',
    html: `<div class="mg-modal">
      <div class="mg-title">🔢 Ввод кода</div>
      <div class="mg-desc">Введите код доступа. Быстрее!</div>
      <div class="mg-timer" id="cb-timer">${timeLeft}</div>
      <div style="font-size:32px;font-family:monospace;letter-spacing:8px;color:var(--primary-3);margin:16px 0;user-select:none">${code}</div>
      <label class="field"><span>Код</span>
        <input id="cb-input" type="text" maxlength="6" inputmode="numeric" pattern="[0-9]*" autocomplete="off" style="text-align:center;font-size:24px;letter-spacing:8px;font-family:monospace">
      </label>
      <div class="mg-actions" style="margin-top:14px">
        <button class="btn primary" id="cb-submit">Проверить</button>
        <button class="btn ghost" id="cb-skip">Пропустить</button>
      </div>
    </div>`
  });

  const timerEl = document.getElementById('cb-timer');
  const input = document.getElementById('cb-input');
  timer = setInterval(() => {
    timeLeft--; timerEl.textContent = timeLeft;
    if (timeLeft <= 0) finish(false);
  }, 1000);

  const check = () => {
    if (input.value === code) finish(true);
    else {
      input.value = '';
      input.style.borderColor = 'var(--danger)';
      setTimeout(() => { input.style.borderColor = ''; }, 400);
    }
  };
  document.getElementById('cb-submit').addEventListener('click', check);
  document.getElementById('cb-skip').addEventListener('click', () => finish(false));
  input.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
  setTimeout(() => input.focus(), 80);
};

/* ============ 4. Negotiate — диалог-переговоры (3 раунда) ============ */
M.negotiate = function (opts, callback) {
  opts = opts || {};
  const rounds = opts.rounds || [
    { prompt: 'Начнём с главного. Чего ты хочешь?',
      options: [
        { label: '«Давай сразу к делу — вот моё предложение»', weight: 2, reply: 'Хорошо, слушаю.' },
        { label: '«Расскажи, что тебя беспокоит»', weight: 3, reply: 'Спасибо, что спросил...' },
        { label: '«У меня нет времени. Говори коротко»', weight: 1, reply: 'Ладно, коротко.' }
      ]
    },
    { prompt: 'Это всё звучит неплохо, но...',
      options: [
        { label: '«Я готов пойти на уступки»', weight: 3, reply: 'Приятно слышать.' },
        { label: '«Мои условия окончательные»', weight: 1, reply: 'Понятно.' },
        { label: '«Давай найдём компромисс»', weight: 3, reply: 'Вот это разговор.' }
      ]
    },
    { prompt: 'Итак, что скажешь?',
      options: [
        { label: '«Согласен на твои условия»', weight: 1, reply: 'Хорошо.' },
        { label: '«Предлагаю встречное — 50/50»', weight: 3, reply: 'Интересно.' },
        { label: '«Забирай всё»', weight: 2, reply: 'Щедро.' }
      ]
    }
  ];
  const threshold = opts.threshold || 6;
  let idx = 0, score = 0, log = [];

  const render = () => {
    if (idx >= rounds.length) {
      const success = score >= threshold;
      NB.openModal({ title: '', noSubmit: true, boxClass: 'mg-modal',
        html: `<div class="mg-modal">
          <div class="mg-title">${success ? '✅ Договорились' : '❌ Не договорились'}</div>
          <div class="mg-desc">${success ? (opts.successText || 'Соглашение достигнуто.') : (opts.failText || 'Переговоры провалились.')}</div>
          <div style="font-size:12px;color:var(--muted);margin-bottom:14px">Очки: ${score} / ${threshold}</div>
          <div class="mg-actions"><button class="btn primary" id="ng-close">Далее</button></div>
        </div>`
      });
      document.getElementById('ng-close').addEventListener('click', () => {
        NB.closeModal();
        callback && callback(success, score);
      });
      return;
    }
    const r = rounds[idx];
    NB.openModal({ title: '', noSubmit: true, boxClass: 'mg-modal',
      html: `<div class="mg-modal">
        <div class="mg-title">💬 Переговоры (${idx + 1}/${rounds.length})</div>
        <div style="font-size:13px;color:var(--text-2);background:var(--surface-2);padding:14px;border-radius:10px;margin-bottom:14px;text-align:left;line-height:1.5">
          <b style="color:var(--primary-3);display:block;margin-bottom:6px">Собеседник:</b>
          ${NB.esc(r.prompt)}
        </div>
        ${log.length ? `<div style="font-size:11px;color:var(--muted);text-align:left;margin-bottom:10px">${log.map(l => `• ${NB.esc(l)}`).join('<br>')}</div>` : ''}
        <div style="display:flex;flex-direction:column;gap:8px;text-align:left">
          ${r.options.map((o, i) => `<button class="chat-choice" data-ng-opt="${i}">${NB.esc(o.label)}</button>`).join('')}
        </div>
      </div>`
    });
    setTimeout(() => {
      NB.$$('[data-ng-opt]').forEach(btn => btn.addEventListener('click', () => {
        const o = r.options[Number(btn.dataset.ngOpt)];
        score += o.weight;
        log.push(o.reply);
        idx++;
        render();
      }));
    }, 30);
  };
  render();
};

/* ============ 5. Bitflip — переключение битов ============ */
M.bitflip = function (callback) {
  const target = Array.from({ length: 8 }, () => Math.random() < 0.5 ? 1 : 0);
  const current = Array.from({ length: 8 }, () => 0);
  let moves = 5;

  const render = () => {
    const done = target.every((v, i) => v === current[i]);
    if (done) {
      NB.openModal({ title: '', noSubmit: true, boxClass: 'mg-modal',
        html: `<div class="mg-modal">
          <div class="mg-title">✅ Расшифровано</div>
          <div class="mg-desc">Сигнал восстановлен.</div>
          <div class="mg-actions"><button class="btn primary" id="bf-close">Далее</button></div>
        </div>`
      });
      document.getElementById('bf-close').addEventListener('click', () => { NB.closeModal(); callback && callback(true); });
      return;
    }
    if (moves <= 0) {
      NB.openModal({ title: '', noSubmit: true, boxClass: 'mg-modal',
        html: `<div class="mg-modal">
          <div class="mg-title">❌ Не удалось</div>
          <div class="mg-desc">Не хватило ходов.</div>
          <div class="mg-actions"><button class="btn ghost" id="bf-close">Закрыть</button></div>
        </div>`
      });
      document.getElementById('bf-close').addEventListener('click', () => { NB.closeModal(); callback && callback(false); });
      return;
    }
    NB.openModal({ title: '', noSubmit: true, boxClass: 'mg-modal',
      html: `<div class="mg-modal">
        <div class="mg-title">📡 Восстановление сигнала</div>
        <div class="mg-desc">Кликайте по битам, чтобы получить нужный сигнал. Ходов: ${moves}</div>
        <div style="display:flex;flex-direction:column;gap:14px;align-items:center;margin:18px 0">
          <div style="font-size:11px;color:var(--muted)">Цель:</div>
          <div style="display:flex;gap:6px">${target.map(v => `<span style="width:24px;height:24px;border-radius:5px;display:grid;place-items:center;font-family:monospace;font-weight:800;font-size:13px;background:${v ? 'rgba(34,197,94,.2)' : 'rgba(255,255,255,.05)'};color:${v ? '#4ade80' : 'var(--muted)'}">${v}</span>`).join('')}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:6px">Сейчас:</div>
          <div style="display:flex;gap:6px">${current.map((v, i) => `<button data-bf-i="${i}" style="width:24px;height:24px;border-radius:5px;border:1px solid var(--line);cursor:pointer;font-family:monospace;font-weight:800;font-size:13px;background:${v ? 'rgba(34,197,94,.2)' : 'rgba(255,255,255,.05)'};color:${v ? '#4ade80' : 'var(--muted)'}">${v}</button>`).join('')}</div>
        </div>
        <div class="mg-actions"><button class="btn ghost" id="bf-skip">Сдаться</button></div>
      </div>`
    });
    setTimeout(() => {
      NB.$$('[data-bf-i]').forEach(btn => btn.addEventListener('click', () => {
        const i = Number(btn.dataset.bfI);
        current[i] = current[i] ? 0 : 1;
        moves--;
        render();
      }));
      const skip = document.getElementById('bf-skip');
      if (skip) skip.addEventListener('click', () => { NB.closeModal(); callback && callback(false); });
    }, 30);
  };
  render();
};

M.start = function (type, callback, opts) {
  if (type === 'sequence') M.sequence(callback);
  else if (type === 'pairs') M.pairs(callback);
  else if (type === 'codebreak') M.codebreak(callback);
  else if (type === 'negotiate') M.negotiate(opts, callback);
  else if (type === 'bitflip') M.bitflip(callback);
  else callback && callback(true);
};

})(window);