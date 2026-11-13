(function (global) {
'use strict';
const NB = global.NB;
const C = NB.charts = {};

C.trafficData = Array.from({ length: 50 }, () => NB.rand(20, 60));
let timer = null;

C.drawLine = function (canvas, data, capacity) {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  if (canvas.width !== w * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const max = Math.max(...data, capacity || 100, 10) * 1.15;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => [i * step, h - 6 - (v / max) * (h - 14)]);

  if (capacity) {
    const capY = h - 6 - (capacity / max) * (h - 14);
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(239,68,68,.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, capY);
    ctx.lineTo(w, capY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(239,68,68,.7)';
    ctx.font = '10px Inter,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Лимит ${Math.round(capacity)}`, 4, capY - 4);
  }

  ctx.beginPath();
  ctx.moveTo(0, h);
  pts.forEach(([x,y]) => ctx.lineTo(x, y));
  ctx.lineTo(w, h); ctx.closePath();
  const grad = ctx.createLinearGradient(0,0,0,h);
  grad.addColorStop(0, 'rgba(255,107,0,.32)');
  grad.addColorStop(1, 'rgba(255,107,0,0)');
  ctx.fillStyle = grad; ctx.fill();

  ctx.beginPath();
  pts.forEach(([x,y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
  ctx.strokeStyle = '#ff8c33'; ctx.lineWidth = 2.2;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(255,107,0,.9)'; ctx.shadowBlur = 10;
  ctx.stroke(); ctx.shadowBlur = 0;

  const [lx, ly] = pts[pts.length - 1];
  ctx.beginPath(); ctx.arc(lx, ly, 8, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,107,0,.28)'; ctx.fill();
  ctx.beginPath(); ctx.arc(lx, ly, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = '#ffb347'; ctx.fill();
};

function updateLabels() {
  const now = document.getElementById('traffic-now');
  const peak = document.getElementById('traffic-peak');
  const load = NB.traffic.getLoad();
  if (now) now.textContent = Math.round(load.usage);
  if (peak) peak.textContent = Math.round(load.cap);
}

C.startTraffic = function () {
  C.stopTraffic();
  const canvas = document.getElementById('traffic-chart');
  if (!canvas) return;
  const load = NB.traffic.getLoad();
  C.drawLine(canvas, C.trafficData, load.cap);
  updateLabels();
  timer = setInterval(() => {
    const loadNow = NB.traffic.getLoad();
    const base = loadNow.usage * NB.rand(.75, 1.15);
    const next = Math.max(5, Math.min(loadNow.cap * 1.2, base));
    C.trafficData.push(next);
    if (C.trafficData.length > 50) C.trafficData.shift();
    const c = document.getElementById('traffic-chart');
    if (c) C.drawLine(c, C.trafficData, loadNow.cap);
    updateLabels();
  }, 2000);
};

C.stopTraffic = () => { if (timer) { clearInterval(timer); timer = null; } };

C.drawRevenue = function (canvas, data) {
  if (!canvas || !Array.isArray(data) || data.length < 2) return;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  if (canvas.width !== w * dpr) { canvas.width = w * dpr; canvas.height = h * dpr; }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const amounts = data.map(d => d.amount || 0);
  const max = Math.max(...amounts, 1000) * 1.15;
  const step = w / (data.length - 1);
  const pts = amounts.map((v, i) => [i * step, h - 8 - (v / max) * (h - 24)]);

  ctx.strokeStyle = 'rgba(255,255,255,.05)';
  ctx.lineWidth = 1;
  for (let i = 1; i <= 3; i++) {
    const y = h - 8 - (i / 4) * (h - 24);
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  ctx.beginPath();
  ctx.moveTo(0, h);
  pts.forEach(([x,y]) => ctx.lineTo(x, y));
  ctx.lineTo(w, h); ctx.closePath();
  const grad = ctx.createLinearGradient(0,0,0,h);
  grad.addColorStop(0, 'rgba(34,197,94,.28)');
  grad.addColorStop(1, 'rgba(34,197,94,0)');
  ctx.fillStyle = grad; ctx.fill();

  ctx.beginPath();
  pts.forEach(([x,y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
  ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 2;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(34,197,94,.8)'; ctx.shadowBlur = 8;
  ctx.stroke(); ctx.shadowBlur = 0;

  const [lx, ly] = pts[pts.length - 1];
  ctx.beginPath(); ctx.arc(lx, ly, 7, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(34,197,94,.25)'; ctx.fill();
  ctx.beginPath(); ctx.arc(lx, ly, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = '#4ade80'; ctx.fill();
};

C.animateCounters = () => {
  NB.$$('.stat-value[data-count]').forEach(el => {
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
  const load = NB.traffic.getLoad();
  const limit = Math.max(1, load.cap - load.usage);
  const target = Math.min(load.cap, NB.rand(load.cap * 0.6, load.cap * 0.95));
  const R = 2 * Math.PI * 90;
  const dur = 1800, t0 = performance.now();
  const step = now => {
    const p = Math.min(1, (now - t0) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    const v = target * eased;
    num.textContent = v.toFixed(0);
    fg.style.strokeDashoffset = R * (1 - (v / Math.max(load.cap, 100)) * 0.9);
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