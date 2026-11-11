/* isp_billing_story.js — сюжетные линии */
(function (global) {
'use strict';
const NB = global.NB;
const S = NB.story = NB.story || {};

/* =========== STARVE NEON =========== */
S.CHAPTERS = [
  {
    id: 0, title: 'Странный сигнал',
    text: 'Поздний вечер. В почту падает письмо без темы. Внутри — только одно предложение: «Твой провайдер — идеальный плацдарм. Играй с нами. — Starve Neon».',
    choices: [
      { label: 'Ответить на письмо', hint: 'Начать альянс', run: () => { NB.state.game.sn.ally = true; NB.state.game.sn.trust = 10; NB.story.next(1); } },
      { label: 'Удалить', hint: 'Продолжить без альянса', run: () => { NB.story.next(1); } }
    ]
  },
  {
    id: 1, title: 'Неоновый гость',
    text: 'Через день в офис заходит человек в светящейся куртке. «Я из Starve Neon. Мы хотим предложить твоим клиентам эксклюзивный контент. Взамен — небольшой процент и реклама».',
    choices: [
      { label: 'Согласиться на сотрудничество', hint: '+ доход, реклама', run: () => { NB.state.game.sn.ally = true; NB.state.game.sn.trust += 15; NB.story.next(2); } },
      { label: 'Отказать', hint: 'Без альянса', run: () => { NB.story.next(2); } }
    ]
  },
  {
    id: 2, title: 'Квест: украденные данные',
    text: 'Starve Neon просит помочь: их сервер атакован, нужно перенаправить трафик через твою сеть. «Мы заплатим. Но если облажаешься — будет плохо».',
    choices: [
      { label: 'Помочь', hint: '-5 000 ₽, +20 доверия', run: () => { if (NB.state.game.cash < 5000) return 'Не хватило денег'; NB.state.game.cash -= 5000; NB.state.game.sn.trust += 20; NB.state.game.sn.questsDone.push('data'); NB.story.next(3); } },
      { label: 'Отказать', hint: '-10 доверия', run: () => { NB.state.game.sn.trust -= 10; NB.story.next(3); } }
    ]
  },
  {
    id: 3, title: 'Тень конкурента',
    text: 'Starve Neon делится секретом: Starlink готовит демпинг. Они предлагают либо совместную акцию, либо «грязную игру».',
    choices: [
      { label: 'Честная акция', hint: '-10 000 ₽, +реп', run: () => { NB.state.game.cash -= 10000; NB.state.game.reputation = Math.min(100, NB.state.game.reputation + 15); NB.state.game.sn.trust += 10; NB.story.next(4); } },
      { label: 'Грязная игра', hint: '+деньги, -реп', run: () => { NB.state.game.cash += 20000; NB.state.game.reputation = Math.max(0, NB.state.game.reputation - 20); NB.story.next(4); } },
      { label: 'Отказаться', hint: 'Нейтрально', run: () => NB.story.next(4) }
    ]
  },
  {
    id: 4, title: 'Последний выбор',
    text: 'Starve Neon предлагает полное слияние. Ты можешь стать частью их империи — или остаться независимым. Решение изменит всё.',
    choices: [
      { label: 'Слияние', hint: 'Концовка «Неоновый гигант»', run: () => NB.story.ending('neon_giant') },
      { label: 'Независимость', hint: 'Концовка «Свой путь»', run: () => NB.story.ending('indie') },
      { label: 'Предать Starve Neon', hint: 'Концовка «Технологический прорыв»', run: () => NB.story.ending('tech_breakthrough') }
    ]
  }
];

S.startSN = function () {
  NB.state.story.chapter = 0;
  NB.state.story.step = 0;
  NB.state.game.sn.discovered = true;
  NB.save();
  NB.renderView();
};

S.next = function (chapter) {
  NB.state.story.chapter = chapter;
  NB.state.story.step = 0;
  NB.save();
  NB.renderView();
  if (chapter >= S.CHAPTERS.length) S.showEnding();
};

S.ending = function (type) {
  const g = NB.state.game;
  g.stats.endings.push(type);
  if (type === 'neon_giant') { g.cash += 100000; g.unlockedTech.push('quantum'); NB.notify('🏆 Концовка: Неоновый гигант! +100 000 ₽, открыт квантовый шифр', 'ok'); }
  else if (type === 'indie') { g.reputation = Math.min(100, g.reputation + 30); NB.notify('🏆 Концовка: Свой путь! +30 репутации', 'ok'); }
  else if (type === 'tech_breakthrough') { g.cash += 50000; g.unlockedTech.push('quantum'); NB.notify('🏆 Концовка: Технологический прорыв! +50 000 ₽, открыт квантовый шифр', 'ok'); }
  NB.save();
  S.showEnding();
};

S.showEnding = function () {
  const wrap = document.createElement('div');
  wrap.className = 'ending-screen';
  wrap.innerHTML = `<div class="ending-card">
    <div class="ending-icon">🌟</div>
    <div class="ending-title">Сюжет завершён</div>
    <div class="ending-desc">Вы прошли путь от простого провайдера до легенды. Starve Neon запомнит вас.</div>
    <div class="ending-stats">
      <div><b>${NB.state.game.stats.daysPlayed}</b><span>дней</span></div>
      <div><b>${NB.state.game.stats.eventsResolved}</b><span>событий</span></div>
      <div><b>${NB.money(NB.state.game.cash)}</b><span>касса</span></div>
    </div>
    <button class="btn primary" id="ending-close">Продолжить</button>
  </div>`;
  document.body.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('show'));
  wrap.querySelector('#ending-close').addEventListener('click', () => {
    wrap.classList.remove('show');
    setTimeout(() => wrap.remove(), 500);
    NB.story.next(S.CHAPTERS.length);
  });
};

S.renderPanel = function () {
  const st = NB.state.story;
  const ch = S.CHAPTERS[st.chapter];
  if (!ch) return '';
  return `<div class="story-panel fade">
    <div class="story-chapter">Глава ${st.chapter + 1} · Starve Neon</div>
    <div class="story-title">${ch.title}</div>
    <div class="story-text">${ch.text}</div>
    <div class="story-choices">
      ${ch.choices.map((c, i) => `<button class="story-choice" data-story-choice="${i}">
        <span>${c.label}</span><span class="story-choice-hint">${c.hint || ''}</span>
      </button>`).join('')}
    </div>
  </div>`;
};

/* =========== КОНЦОВКА СИНЕССЫ =========== */
S.cynEnding = function () {
  const g = NB.state.game;
  g.cyn.endingSeen = true;
  g.cyn.finalTriggered = true;
  NB.save();

  const wrap = document.createElement('div');
  wrap.className = 'video-ad-wrap';
  wrap.style.background = 'rgba(0,0,0,0.95)';
  wrap.innerHTML = `<div class="video-ad-box" style="box-shadow:0 0 100px -20px #ff0000">
    <button class="video-ad-close">✕</button>
    <div class="video-ad-label" style="color:#ff4444">⚠ СИГНАЛ ПОТЕРЯН</div>
    <video src="images/404.webm" autoplay playsinline></video>
  </div>`;
  document.body.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('show'));
  NB.effects.shake(1500);
  NB.effects.redFlash();

  wrap.querySelector('.video-ad-close').addEventListener('click', () => {
    wrap.classList.remove('show');
    setTimeout(() => {
      wrap.remove();
      S.showCynEndingScreen();
    }, 400);
  });
  setTimeout(() => {
    if (wrap.parentNode) {
      wrap.classList.remove('show');
      setTimeout(() => { wrap.remove(); S.showCynEndingScreen(); }, 400);
    }
  }, 12000);
};

S.showCynEndingScreen = function () {
  const wrap = document.createElement('div');
  wrap.className = 'ending-screen';
  wrap.style.background = 'radial-gradient(circle at 50% 30%, #1a0000, #08080a 70%)';
  wrap.innerHTML = `<div class="ending-card">
    <div class="ending-icon" style="font-size:72px">💀</div>
    <div class="ending-title" style="color:#ff4444">Абсолютный решатель</div>
    <div class="ending-desc" style="color:#f87171">Синесса добралась до тебя. Твой биллинг стал частью её сингулярности. Игра окончена.</div>
    <div class="ending-stats">
      <div><b>${NB.state.game.stats.daysPlayed}</b><span>дней</span></div>
      <div><b>${NB.state.game.cyn.threat}</b><span>угроза</span></div>
      <div><b>${NB.money(NB.state.game.cash)}</b><span>касса</span></div>
    </div>
    <button class="btn primary" id="cyn-ending-close">Начать заново</button>
  </div>`;
  document.body.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('show'));
  wrap.querySelector('#cyn-ending-close').addEventListener('click', () => {
    wrap.classList.remove('show');
    setTimeout(() => { wrap.remove(); NB.resetState(); }, 500);
  });
};

/* =========== СПАМ STARVE NEON =========== */
const SPAM_TEXTS = [
  '⭐ Starve Neon — выживи в неоне',
  '⭐ Starve Neon: скидка 20% на первый сезон',
  '⭐ Starve Neon ищет союзников',
  '⭐ Starve Neon: твой провайдер — твой билет',
  '⭐ Starve Neon: кооп на 4 игрока уже в бете',
  '⭐ Starve Neon: неон не спит'
];

S.showSpam = function () {
  if (!NB.state.settings.snSpam) return;
  const el = document.createElement('div');
  el.className = 'sn-spam';
  const x = Math.random() * (window.innerWidth - 240);
  const y = Math.random() * (window.innerHeight - 160);
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.innerHTML = `<div class="sn-spam-brand">⭐ Starve Neon <span>×</span></div>
    <div class="sn-spam-body">${NB.pick(SPAM_TEXTS)}</div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  const close = () => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); };
  el.querySelector('span').addEventListener('click', e => { e.stopPropagation(); close(); });
  el.addEventListener('click', () => { close(); if (!NB.state.game.sn.discovered) S.startSN(); });
  setTimeout(close, 6000);
  NB.state.game.sn.spamShown = (NB.state.game.sn.spamShown || 0) + 1;
  NB.save();
};

/* =========== ВИДЕО-РЕКЛАМА =========== */
S.showVideo = function () {
  if (document.querySelector('.video-ad-wrap')) return;
  const videos = [
    'images/video1.webm',
    'images/video1.webm',
    'images/video1.webm',
    'images/video1.webm'
  ];
  const wrap = document.createElement('div');
  wrap.className = 'video-ad-wrap';
  wrap.innerHTML = `<div class="video-ad-box">
    <button class="video-ad-close">✕</button>
    <div class="video-ad-label">⭐ Starve Neon</div>
    <video src="${NB.pick(videos)}" autoplay muted playsinline loop></video>
  </div>`;
  document.body.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('show'));
  const close = () => { wrap.classList.remove('show'); setTimeout(() => wrap.remove(), 300); };
  wrap.querySelector('.video-ad-close').addEventListener('click', close);
  wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
  setTimeout(close, 8000);
  NB.state.game.sn.videoShown = (NB.state.game.sn.videoShown || 0) + 1;
  NB.save();
};

})(window);