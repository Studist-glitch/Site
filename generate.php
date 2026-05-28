<?php
ob_start();

// Генерация начальных чисел на PHP
$arr = [rand(1, 100), rand(1, 100), rand(1, 100)];
$sum = array_sum($arr);
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>сумма | ячейки</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            background: #0b0b0f;
            font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, sans-serif;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 1.5rem;
            position: relative;
            overflow: hidden;
        }

        /* Живой шум */
        body::before {
            content: "";
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.045'/%3E%3C/svg%3E");
            background-repeat: repeat;
            background-size: 180px 180px;
            animation: grain 0.4s steps(3) infinite;
            pointer-events: none;
            z-index: 0;
        }

        @keyframes grain {
            0%, 100% { transform: translate(0, 0); }
            33% { transform: translate(-2px, 1px); }
            66% { transform: translate(2px, -1px); }
        }

        #particles-canvas {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 1;
            pointer-events: none;
        }

        .content {
            position: relative;
            z-index: 2;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(130px, 160px));
            gap: 1.25rem;
            justify-content: center;
            align-items: center;
            margin-bottom: 2rem;
        }

        .cell {
            background: rgba(20, 22, 28, 0.85);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 1.75rem;
            box-shadow: 0 8px 18px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.04);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 1.5rem 0.5rem;
            aspect-ratio: 1/1;
            position: relative;
        }

        .number {
            font-size: 2.6rem;
            font-weight: 540;
            color: #e4e6ef;
            line-height: 1.2;
            margin-bottom: 0.5rem;
            letter-spacing: -0.01em;
            text-shadow: 0 2px 6px rgba(0,0,0,0.6);
        }

        .number.pop {
            animation: numberPop 0.45s cubic-bezier(0.2, 0.9, 0.4, 1.2) forwards;
        }

        @keyframes numberPop {
            0% { transform: scale(1); filter: brightness(1); }
            30% { transform: scale(1.5); filter: brightness(2.5); }
            100% { transform: scale(1); filter: brightness(1); }
        }

        .label {
            font-size: 0.7rem;
            font-weight: 430;
            color: #8b8fa6;
            text-transform: uppercase;
            letter-spacing: 0.4px;
        }

        .refresh-btn {
            background: rgba(20, 22, 28, 0.8);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 2.5rem;
            padding: 0.9rem 2.2rem;
            font-size: 0.95rem;
            font-weight: 500;
            color: #d0d3e0;
            box-shadow: 0 6px 16px rgba(0,0,0,0.4);
            cursor: pointer;
            transition: background 0.2s, border-color 0.2s;
            letter-spacing: -0.01em;
            outline: none;
        }

        .refresh-btn:hover {
            background: rgba(30, 33, 42, 0.85);
            border-color: rgba(255, 255, 255, 0.12);
        }

        .refresh-btn:active {
            background: rgba(18, 20, 26, 0.9);
        }

        @media (max-width: 700px) {
            .grid { grid-template-columns: repeat(2, minmax(125px, 145px)); gap: 1rem; }
            .number { font-size: 2.2rem; }
            .label { font-size: 0.65rem; }
            .cell { padding: 1.2rem 0.3rem; }
        }

        @media (max-width: 480px) {
            .grid { grid-template-columns: repeat(2, minmax(100px, 115px)); gap: 0.9rem; }
            .number { font-size: 1.9rem; }
            .label { font-size: 0.6rem; }
            .cell { padding: 1rem 0.2rem; }
        }

        @media (max-width: 380px) {
            .grid { grid-template-columns: repeat(2, minmax(92px, 105px)); gap: 0.75rem; }
            .number { font-size: 1.7rem; }
        }
    </style>
</head>
<body>
    <canvas id="particles-canvas"></canvas>

    <div class="content">
        <div class="grid" id="cellsGrid">
            <div class="cell">
                <div class="number" id="val1"><?= $arr[0] ?></div>
                <div class="label">число 1</div>
            </div>
            <div class="cell">
                <div class="number" id="val2"><?= $arr[1] ?></div>
                <div class="label">число 2</div>
            </div>
            <div class="cell">
                <div class="number" id="val3"><?= $arr[2] ?></div>
                <div class="label">число 3</div>
            </div>
            <div class="cell">
                <div class="number" id="sumTotal"><?= $sum ?></div>
                <div class="label">сумма</div>
            </div>
        </div>
        <button class="refresh-btn" id="refreshButton">обновить числа</button>
    </div>

    <script>
        (function() {
            // ---------- Обновление чисел с последовательной анимацией ----------
            const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

            function animateNumber(el, delay = 0) {
                setTimeout(() => {
                    el.classList.add('pop');
                    el.addEventListener('animationend', function handler() {
                        el.classList.remove('pop');
                        el.removeEventListener('animationend', handler);
                    }, { once: true });
                }, delay);
            }

            const refreshCells = () => {
                const MIN = 1;
                const MAX = 100;
                const a = getRandomInt(MIN, MAX);
                const b = getRandomInt(MIN, MAX);
                const c = getRandomInt(MIN, MAX);
                const sum = a + b + c;
                
                const v1 = document.getElementById('val1');
                const v2 = document.getElementById('val2');
                const v3 = document.getElementById('val3');
                const sumEl = document.getElementById('sumTotal');
                
                v1.textContent = a;
                v2.textContent = b;
                v3.textContent = c;
                sumEl.textContent = sum;
                
                // Последовательный запуск анимации: 0ms, 60ms, 120ms, 180ms
                animateNumber(v1, 0);
                animateNumber(v2, 60);
                animateNumber(v3, 120);
                animateNumber(sumEl, 180);
            };

            document.getElementById('refreshButton').addEventListener('click', refreshCells);

            // ---------- Направленная обводка (чёткая линия) ----------
            const cells = document.querySelectorAll('.cell');
            
            cells.forEach(cell => {
                cell.addEventListener('mousemove', (e) => {
                    const rect = cell.getBoundingClientRect();
                    // Координаты курсора относительно центра (нормированы к -1..1)
                    const x = e.clientX - rect.left - rect.width / 2;
                    const y = e.clientY - rect.top - rect.height / 2;
                    const dx = x / (rect.width / 2);
                    const dy = y / (rect.height / 2);
                    
                    // Небольшое смещение для чёткой линии (без размытия)
                    const offsetX = dx * 8;
                    const offsetY = dy * 8;
                    // Яркость обводки зависит от расстояния до центра: чем ближе к краю, тем ярче
                    const distance = Math.sqrt(dx*dx + dy*dy);
                    const alpha = 0.05 + distance * 0.7;
                    
                    // Чёткая обводка: spread 1px, blur 0, цвет белый с прозрачностью
                    cell.style.boxShadow = `
                        0 8px 18px rgba(0, 0, 0, 0.5),
                        inset 0 1px 0 rgba(255, 255, 255, 0.04),
                        ${offsetX}px ${offsetY}px 0 1px rgba(255, 255, 255, ${alpha})
                    `;
                });
                
                cell.addEventListener('mouseleave', () => {
                    // Возвращаем стандартную тень без обводки
                    cell.style.boxShadow = `0 8px 18px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.04)`;
                });
            });

            // ---------- Динамичные пылинки (canvas) ----------
            const canvas = document.getElementById('particles-canvas');
            const ctx = canvas.getContext('2d');
            let width, height;
            const particles = [];
            const PARTICLE_COUNT = 55;
            const MAX_SIZE = 2.2;
            const MIN_SIZE = 0.8;
            const SPEED_FACTOR = 0.25;

            class Particle {
                constructor() {
                    this.x = Math.random() * width;
                    this.y = Math.random() * height;
                    this.size = Math.random() * (MAX_SIZE - MIN_SIZE) + MIN_SIZE;
                    this.speedX = (Math.random() - 0.5) * SPEED_FACTOR;
                    this.speedY = (Math.random() - 0.5) * SPEED_FACTOR;
                    this.opacity = Math.random() * 0.25 + 0.08;
                }
                update() {
                    this.x += this.speedX;
                    this.y += this.speedY;
                    if (this.x < 0) { this.x = 0; this.speedX *= -1; }
                    if (this.x > width) { this.x = width; this.speedX *= -1; }
                    if (this.y < 0) { this.y = 0; this.speedY *= -1; }
                    if (this.y > height) { this.y = height; this.speedY *= -1; }
                }
                draw(ctx) {
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
                    ctx.fill();
                }
            }

            function resizeCanvas() {
                width = window.innerWidth;
                height = window.innerHeight;
                canvas.width = width;
                canvas.height = height;
                particles.length = 0;
                for (let i = 0; i < PARTICLE_COUNT; i++) {
                    particles.push(new Particle());
                }
            }

            function animate() {
                ctx.clearRect(0, 0, width, height);
                for (let p of particles) {
                    p.update();
                    p.draw(ctx);
                }
                requestAnimationFrame(animate);
            }

            window.addEventListener('resize', resizeCanvas);
            resizeCanvas();
            animate();
        })();
    </script>
</body>
</html>
<?php
file_put_contents('Числа.html', ob_get_clean());