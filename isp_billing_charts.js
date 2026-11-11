/* isp_billing_charts.js — график трафика, спидометр, счётчики */
(function (global) {
'use strict';
const NB = global.NB;
const C = NB.charts = {};

C.trafficData = Array.from({ length: 50 }, () => NB.rand(20, 70));
let timer = null;

C.drawLine = function (canvas, data) {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  if (canvas.width !== w * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const max = Math.max(...data, 10) * 1.15;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => [i * step, h - 6 - (v / max) * (h - 14)]);

  ctx.beginPath();
  ctx.moveTo(0, h);
  pts.forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.lineTo(w, h); ctx.closePath();
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(255,107,0,0.32)');
  grad.addColorStop(1, 'rgba(255,107,0,0)');
  ctx.fillStyle = grad; ctx.fill();

  ctx.beginPath();
  pts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
  ctx.strokeStyle = '#ff8c33'; ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(255,107,0,0.9)'; ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.shadowBlur = 0;

  const [lx, ly] = pts[pts.length - 1];
  ctx.beginPath(); ctx.arc(lx, ly, 8, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,107,0,0.28)'; ctx.fill();
  ctx.beginPath(); ctx.arc(lx, ly, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = '#ffb347'; ctx.fill();
};

function updateLabels() {
  const now = document.getElementById('traffic-now');
  const peak = document.getElementById('traffic-peak');
  if (now) now.textContent = Math.round(C.trafficData[C.trafficData.length - 1]);
  if (peak) peak.textContent = Math.round(Math.max(...C.trafficData));
}

C.startTraffic = function () {
  C.stopTraffic();
  const canvas = document.getElementById('traffic-chart');
  if (!canvas) return;
  const s = NB.state.session;
  const limit = s.role === 'client'
    ? (NB.tariff(NB.client(s.id)?.tariffId)?.speed || 100)
    : 1000;
  C.drawLine(canvas, C.trafficData);
  updateLabels();
  timer = setInterval(() => {
    const next = Math.max(5, NB.rand(20, limit * 0.85) + Math.sin(Date.now() / 2200) * (limit * 0.12));
    C.trafficData.push(next);
    if (C.trafficData.length > 50) C.trafficData.shift();
    const c = document.getElementById('traffic-chart');
    if (c) C.drawLine(c, C.trafficData);
    updateLabels();
  }, 1000);
};

C.stopTraffic = function () { if (timer) { clearInterval(timer); timer = null; } };

C.animateCounters = function () {
  document.querySelectorAll('.stat-value[data-count]').forEach(el => {
    const to = Number(el.dataset.count) || 0;
    const isMoney = el.dataset.money === '1';
    const dur = 650, t0 = performance.now();
    const step = now => {
      const p = Math.min(1, (now - t0) / dur);
      const v = to * (1 - Math.pow(1 - p, 3));
      el.textContent = isMoney ? NB.money(v) : Math.round(v);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
};

C.runSpeedTest = function () {
  const btn = document.getElementById('start-speed');
  const num = document.getElementById('speed-value');
  const fg = document.querySelector('.speed-gauge .fg');
  if (!btn || !num || !fg) return;
  btn.disabled = true;
  btn.textContent = 'Измерение…';

  const c = NB.client(NB.state.session.id);
  const limit = NB.tariff(c.tariffId)?.speed || 100;
  const target = Math.min(limit, NB.rand(limit * 0.72, limit * 1.02));
  const R = 2 * Math.PI * 90;
  const dur = 1800, t0 = performance.now();

  const step = now => {
    const p = Math.min(1, (now - t0) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    const v = target * eased;
    num.textContent = v.toFixed(0);
    fg.style.strokeDashoffset = R * (1 - (v / limit) * 0.9);
    if (p < 1) requestAnimationFrame(step);
    else {
      num.textContent = Math.round(target);
      btn.disabled = false;
      btn.textContent = 'Запустить тест';
      NB.toast(`Скорость: ${Math.round(target)} Мбит/с`, 'ok');
    }
  };
  requestAnimationFrame(step);
};

})(window);