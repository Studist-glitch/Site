(function (global) {
'use strict';
const NB = global.NB;
const T = NB.tariffs = NB.tariffs || {};

T.SPEED_STEPS = [25, 50, 100, 150, 200, 300, 500, 700, 1000, 1500, 2000, 3000, 5000];

/* Диапазон скоростей зависит от апгрейдов */
T.getRange = function () {
  const g = NB.state.game.upgrades;
  const cLvl = NB.state.game.company.level;

  /* Базовая скорость — 300 (индекс 5). Апгрейды расширяют. */
  let maxIdx = 5;
  maxIdx += (g.bandwidth || 0);
  maxIdx += (g.fiber || 0);
  maxIdx += (g.satellite || 0);
  maxIdx += Math.min(2, Math.floor((cLvl - 1) / 3));
  maxIdx = Math.min(maxIdx, T.SPEED_STEPS.length - 1);

  const maxSpeed = T.SPEED_STEPS[maxIdx];

  return {
    speedMin: 25,
    speedMax: maxSpeed,
    steps: T.SPEED_STEPS.filter(s => s <= maxSpeed)
  };
};

/* Цена — per-speed bounds */
T.getPriceBounds = function (speed) {
  const minP = Math.round(speed * 3 + 100);
  const maxP = Math.round(speed * 15 + 500);
  return { min: minP, max: maxP };
};

T.validate = function (speed, price) {
  const r = T.getRange();
  if (speed > r.speedMax) return { ok: false, reason: `Макс. скорость ${r.speedMax} Мбит/с` };
  if (speed < r.speedMin) return { ok: false, reason: `Мин. скорость ${r.speedMin}` };
  const b = T.getPriceBounds(speed);
  if (price < b.min) return { ok: false, reason: `Минимум ${b.min} ₽ для ${speed} Мбит` };
  if (price > b.max) return { ok: false, reason: `Максимум ${b.max} ₽ для ${speed} Мбит` };
  return { ok: true };
};

T.recommendedPrice = function (speed) {
  const b = T.getPriceBounds(speed);
  return Math.round((b.min + b.max) / 2);
};

T.formHtml = function (t) {
  const r = T.getRange();
  const speedIdx = t ? Math.max(0, r.steps.indexOf(t.speed)) : 0;
  const speed = t ? t.speed : r.steps[0];
  const price = t ? t.price : T.recommendedPrice(speed);
  const b = T.getPriceBounds(speed);
  return `
    <div class="tariff-range-info">
      <span>⚡ Скорость: <b>${r.speedMin}–${r.speedMax}</b> Мбит/с</span>
    </div>
    ${NB.field('Название', 'name', 'text', t ? t.name : '', 'required')}
    ${NB.field('Описание', 'desc', 'text', t ? (t.desc || '') : '')}
    <div class="slider-field">
      <label class="slider-label"><span>Скорость</span><b id="speed-display">${speed} Мбит/с</b></label>
      <input type="range" name="speedIdx" min="0" max="${r.steps.length - 1}" step="1" value="${speedIdx}" id="speed-slider">
      <div class="slider-marks">${r.steps.map(s => `<span>${s}</span>`).join('')}</div>
    </div>
    <div class="slider-field">
      <label class="slider-label"><span>Цена</span><b id="price-display">${price} ₽/мес</b></label>
      <input type="range" name="price" min="${b.min}" max="${b.max}" step="10" value="${price}" id="price-slider">
      <div class="slider-hint">Диапазон: <b id="price-range">${b.min}–${b.max} ₽</b></div>
    </div>
  `;
};

T.bindSliders = function () {
  setTimeout(() => {
    const r = T.getRange();
    const sS = document.getElementById('speed-slider');
    const pS = document.getElementById('price-slider');
    const sD = document.getElementById('speed-display');
    const pD = document.getElementById('price-display');
    const pR = document.getElementById('price-range');
    if (!sS || !pS) return;
    sS.addEventListener('input', () => {
      const speed = r.steps[Number(sS.value)];
      const b = T.getPriceBounds(speed);
      sD.textContent = speed + ' Мбит/с';
      pS.min = b.min;
      pS.max = b.max;
      const rec = T.recommendedPrice(speed);
      pS.value = Math.min(b.max, Math.max(b.min, rec));
      pD.textContent = pS.value + ' ₽/мес';
      pR.textContent = `${b.min}–${b.max} ₽`;
    });
    pS.addEventListener('input', () => {
      pD.textContent = pS.value + ' ₽/мес';
    });
  }, 50);
};

})(window);