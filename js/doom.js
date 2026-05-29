// doom.js
window.doom = (function() {
    class DoomGame {
        constructor(canvas) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.width = canvas.width;
            this.height = canvas.height;
            this.gameActive = false;
            this.animationId = null;
            this.keys = { w: false, s: false, a: false, d: false };
            this.lastAttackTime = 0;
            this.attackCooldown = 0.4; // секунды

            // Карта 8x8 (1 - стена)
            this.map = [
                [1,1,1,1,1,1,1,1],
                [1,0,0,0,0,0,0,1],
                [1,0,1,0,1,0,0,1],
                [1,0,0,0,0,0,0,1],
                [1,0,0,1,0,0,0,1],
                [1,0,0,0,0,1,0,1],
                [1,0,0,0,0,0,0,1],
                [1,1,1,1,1,1,1,1]
            ];
            this.mapWidth = this.map[0].length;
            this.mapHeight = this.map.length;

            // Игрок
            this.player = {
                x: 2.5,
                y: 2.5,
                dirX: 1,
                dirY: 0,
                planeX: 0,
                planeY: 0.66, // FOV 66 градусов
                health: 100,
                maxHealth: 100
            };
            this.score = 0;
            this.enemies = [];
            this.spawnEnemies();

            // Привязка обработчиков
            this.handleKeyDown = this.handleKeyDown.bind(this);
            this.handleKeyUp = this.handleKeyUp.bind(this);
            this.handleShoot = this.handleShoot.bind(this);
            this.restart = this.restart.bind(this);
        }

        spawnEnemies() {
            this.enemies = [];
            const positions = [
                { x: 3.5, y: 4.5, health: 30 },
                { x: 5.5, y: 2.5, health: 30 },
                { x: 3.5, y: 6.5, health: 30 },
                { x: 6.5, y: 5.5, health: 30 },
                { x: 1.5, y: 5.5, health: 30 }
            ];
            for (let pos of positions) {
                if (!this.isWall(pos.x, pos.y)) {
                    this.enemies.push({ ...pos, health: pos.health, maxHealth: pos.health });
                }
            }
            if (this.enemies.length === 0) {
                // Запасные враги
                this.enemies.push({ x: 4.5, y: 3.5, health: 30, maxHealth: 30 });
            }
        }

        isWall(x, y) {
            const ix = Math.floor(x);
            const iy = Math.floor(y);
            if (ix < 0 || iy < 0 || ix >= this.mapWidth || iy >= this.mapHeight) return true;
            return this.map[iy][ix] === 1;
        }

        init() {
            this.gameActive = true;
            this.start();
        }

        start() {
            window.addEventListener('keydown', this.handleKeyDown);
            window.addEventListener('keyup', this.handleKeyUp);
            this.canvas.addEventListener('click', this.handleShoot);
            this.updateLoop();
        }

        stop() {
            this.gameActive = false;
            if (this.animationId) cancelAnimationFrame(this.animationId);
            window.removeEventListener('keydown', this.handleKeyDown);
            window.removeEventListener('keyup', this.handleKeyUp);
            this.canvas.removeEventListener('click', this.handleShoot);
            this.keys = { w: false, s: false, a: false, d: false };
        }

        handleKeyDown(e) {
            if (!this.gameActive) return;
            const key = e.key.toLowerCase();
            if (key === 'w') this.keys.w = true;
            if (key === 's') this.keys.s = true;
            if (key === 'a') this.keys.a = true;
            if (key === 'd') this.keys.d = true;
            e.preventDefault();
        }

        handleKeyUp(e) {
            const key = e.key.toLowerCase();
            if (key === 'w') this.keys.w = false;
            if (key === 's') this.keys.s = false;
            if (key === 'a') this.keys.a = false;
            if (key === 'd') this.keys.d = false;
            e.preventDefault();
        }

        handleShoot(e) {
            if (!this.gameActive) return;
            const now = performance.now() / 1000;
            if (now - this.lastAttackTime < this.attackCooldown) return;
            this.lastAttackTime = now;

            // Луч из центра камеры
            let closestDist = Infinity;
            let closestEnemy = null;
            for (let enemy of this.enemies) {
                const dx = enemy.x - this.player.x;
                const dy = enemy.y - this.player.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 5) continue;
                // Угол между направлением взгляда и направлением на врага
                const dirDot = (dx * this.player.dirX + dy * this.player.dirY) / dist;
                if (dirDot > Math.cos(Math.PI / 3)) { // угол обзора 60 градусов
                    if (dist < closestDist) {
                        closestDist = dist;
                        closestEnemy = enemy;
                    }
                }
            }
            if (closestEnemy) {
                closestEnemy.health -= 35; // урон
                if (closestEnemy.health <= 0) {
                    // Убийство
                    const idx = this.enemies.indexOf(closestEnemy);
                    if (idx !== -1) this.enemies.splice(idx, 1);
                    this.score += 100;
                    this.spawnRandomEnemy();
                    this.createHitEffect(closestEnemy.x, closestEnemy.y);
                } else {
                    this.createHitEffect(closestEnemy.x, closestEnemy.y);
                }
                // Эффект вспышки
                this.flashScreen();
            }
        }

        spawnRandomEnemy() {
            for (let attempt = 0; attempt < 50; attempt++) {
                const x = 1 + Math.random() * (this.mapWidth - 2);
                const y = 1 + Math.random() * (this.mapHeight - 2);
                if (!this.isWall(x, y) && Math.hypot(x - this.player.x, y - this.player.y) > 2) {
                    this.enemies.push({ x, y, health: 30, maxHealth: 30 });
                    break;
                }
            }
        }

        createHitEffect(x, y) {
            // Простой визуальный эффект (можно добавить спрайт, но для простоты - ничего)
        }

        flashScreen() {
            const flashDiv = document.createElement('div');
            flashDiv.style.position = 'fixed';
            flashDiv.style.top = 0;
            flashDiv.style.left = 0;
            flashDiv.style.width = '100%';
            flashDiv.style.height = '100%';
            flashDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
            flashDiv.style.pointerEvents = 'none';
            flashDiv.style.zIndex = 10000;
            document.body.appendChild(flashDiv);
            setTimeout(() => flashDiv.remove(), 100);
        }

        updateMovement(deltaTime) {
            const moveSpeed = 5.0 * deltaTime;
            const rotSpeed = 3.0 * deltaTime;
            let moveX = 0, moveY = 0;
            if (this.keys.w) { moveX += this.player.dirX; moveY += this.player.dirY; }
            if (this.keys.s) { moveX -= this.player.dirX; moveY -= this.player.dirY; }
            if (this.keys.a) {
                // поворот влево
                const oldDirX = this.player.dirX;
                this.player.dirX = this.player.dirX * Math.cos(rotSpeed) - this.player.dirY * Math.sin(rotSpeed);
                this.player.dirY = oldDirX * Math.sin(rotSpeed) + this.player.dirY * Math.cos(rotSpeed);
                const oldPlaneX = this.player.planeX;
                this.player.planeX = this.player.planeX * Math.cos(rotSpeed) - this.player.planeY * Math.sin(rotSpeed);
                this.player.planeY = oldPlaneX * Math.sin(rotSpeed) + this.player.planeY * Math.cos(rotSpeed);
            }
            if (this.keys.d) {
                const oldDirX = this.player.dirX;
                this.player.dirX = this.player.dirX * Math.cos(-rotSpeed) - this.player.dirY * Math.sin(-rotSpeed);
                this.player.dirY = oldDirX * Math.sin(-rotSpeed) + this.player.dirY * Math.cos(-rotSpeed);
                const oldPlaneX = this.player.planeX;
                this.player.planeX = this.player.planeX * Math.cos(-rotSpeed) - this.player.planeY * Math.sin(-rotSpeed);
                this.player.planeY = oldPlaneX * Math.sin(-rotSpeed) + this.player.planeY * Math.cos(-rotSpeed);
            }
            if (moveX !== 0 || moveY !== 0) {
                const len = Math.hypot(moveX, moveY);
                moveX /= len;
                moveY /= len;
                const newX = this.player.x + moveX * moveSpeed;
                if (!this.isWall(newX, this.player.y)) this.player.x = newX;
                const newY = this.player.y + moveY * moveSpeed;
                if (!this.isWall(this.player.x, newY)) this.player.y = newY;
            }

            // Атака врагов (каждую секунду, если рядом)
            const now = performance.now() / 1000;
            for (let enemy of this.enemies) {
                const dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
                if (dist < 1.2 && now - (this.lastEnemyAttackTime || 0) > 1.0) {
                    this.lastEnemyAttackTime = now;
                    this.player.health -= 15;
                    if (this.player.health <= 0) {
                        this.gameOver();
                        return;
                    }
                    this.showDamageEffect();
                }
            }
            if (this.player.health <= 0) this.gameOver();
        }

        showDamageEffect() {
            const flashDiv = document.createElement('div');
            flashDiv.style.position = 'fixed';
            flashDiv.style.top = 0;
            flashDiv.style.left = 0;
            flashDiv.style.width = '100%';
            flashDiv.style.height = '100%';
            flashDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
            flashDiv.style.pointerEvents = 'none';
            flashDiv.style.zIndex = 10000;
            document.body.appendChild(flashDiv);
            setTimeout(() => flashDiv.remove(), 150);
        }

        gameOver() {
            this.gameActive = false;
            if (this.onGameOver) this.onGameOver();
        }

        updateLoop() {
            if (!this.gameActive) return;
            const now = performance.now();
            if (!this.lastTimestamp) this.lastTimestamp = now;
            let delta = Math.min(0.033, (now - this.lastTimestamp) / 1000);
            this.lastTimestamp = now;
            this.updateMovement(delta);
            this.render();
            this.animationId = requestAnimationFrame(() => this.updateLoop());
        }

        render() {
            if (!this.ctx) return;
            this.ctx.clearRect(0, 0, this.width, this.height);
            this.renderWalls();
            this.renderSprites();
            this.renderUI();
        }

        renderWalls() {
            for (let x = 0; x < this.width; x++) {
                // Вычисление луча
                const cameraX = 2 * x / this.width - 1;
                const rayDirX = this.player.dirX + this.player.planeX * cameraX;
                const rayDirY = this.player.dirY + this.player.planeY * cameraX;

                let mapX = Math.floor(this.player.x);
                let mapY = Math.floor(this.player.y);
                let sideDistX, sideDistY;
                let deltaDistX = Math.abs(1 / rayDirX);
                let deltaDistY = Math.abs(1 / rayDirY);
                let stepX, stepY;
                let hit = 0;
                let side = 0;

                if (rayDirX < 0) {
                    stepX = -1;
                    sideDistX = (this.player.x - mapX) * deltaDistX;
                } else {
                    stepX = 1;
                    sideDistX = (mapX + 1 - this.player.x) * deltaDistX;
                }
                if (rayDirY < 0) {
                    stepY = -1;
                    sideDistY = (this.player.y - mapY) * deltaDistY;
                } else {
                    stepY = 1;
                    sideDistY = (mapY + 1 - this.player.y) * deltaDistY;
                }

                while (hit === 0) {
                    if (sideDistX < sideDistY) {
                        sideDistX += deltaDistX;
                        mapX += stepX;
                        side = 0;
                    } else {
                        sideDistY += deltaDistY;
                        mapY += stepY;
                        side = 1;
                    }
                    if (mapX < 0 || mapY < 0 || mapX >= this.mapWidth || mapY >= this.mapHeight) {
                        hit = 1;
                        break;
                    }
                    if (this.map[mapY][mapX] > 0) hit = 1;
                }

                let perpWallDist;
                if (side === 0) perpWallDist = (sideDistX - deltaDistX);
                else perpWallDist = (sideDistY - deltaDistY);
                if (perpWallDist < 0.01) perpWallDist = 0.01;

                const lineHeight = Math.floor(this.height / perpWallDist);
                const drawStart = Math.max(0, -lineHeight / 2 + this.height / 2);
                const drawEnd = Math.min(this.height - 1, lineHeight / 2 + this.height / 2);

                let color;
                if (side === 0) color = 100 + (this.map[mapY][mapX] * 20);
                else color = 70 + (this.map[mapY][mapX] * 15);
                const shade = Math.min(255, color);
                let r, g, b;
                if (this.map[mapY][mapX] === 1) {
                    r = 100 + (side === 0 ? 40 : 20);
                    g = 80 + (side === 0 ? 30 : 10);
                    b = 60;
                } else {
                    r = 80; g = 80; b = 80;
                }
                r = Math.min(255, r * (1 - Math.min(0.8, perpWallDist / 8)));
                g = Math.min(255, g * (1 - Math.min(0.8, perpWallDist / 8)));
                b = Math.min(255, b * (1 - Math.min(0.8, perpWallDist / 8)));
                this.ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                this.ctx.fillRect(x, drawStart, 1, drawEnd - drawStart);

                // Пол и потолок
                this.ctx.fillStyle = `rgb(30, 20, 30)`;
                this.ctx.fillRect(x, 0, 1, drawStart);
                this.ctx.fillStyle = `rgb(60, 50, 40)`;
                this.ctx.fillRect(x, drawEnd, 1, this.height - drawEnd);
            }
        }

        renderSprites() {
            // Сортировка спрайтов по расстоянию
            const sprites = this.enemies.map((e, idx) => {
                const dx = e.x - this.player.x;
                const dy = e.y - this.player.y;
                const dist = Math.hypot(dx, dy);
                const angle = Math.atan2(dy, dx) - Math.atan2(this.player.dirY, this.player.dirX);
                return { enemy: e, dist, angle, idx };
            });
            sprites.sort((a, b) => b.dist - a.dist);

            for (let s of sprites) {
                const enemy = s.enemy;
                const dx = enemy.x - this.player.x;
                const dy = enemy.y - this.player.y;
                const invDet = 1.0 / (this.player.planeX * this.player.dirY - this.player.dirX * this.player.planeY);
                const transformX = invDet * (this.player.dirY * dx - this.player.dirX * dy);
                const transformY = invDet * (-this.player.planeY * dx + this.player.planeX * dy);
                const spriteScreenX = Math.floor((this.width / 2) * (1 + transformX / transformY));
                const spriteHeight = Math.abs(Math.floor(this.height / transformY));
                const drawStartY = Math.max(0, -spriteHeight / 2 + this.height / 2);
                const drawEndY = Math.min(this.height, spriteHeight / 2 + this.height / 2);
                const spriteWidth = spriteHeight;
                const drawStartX = Math.max(0, spriteScreenX - spriteWidth / 2);
                const drawEndX = Math.min(this.width, spriteScreenX + spriteWidth / 2);

                if (transformY > 0 && spriteScreenX > -spriteWidth && spriteScreenX < this.width) {
                    for (let x = drawStartX; x < drawEndX; x++) {
                        const texX = Math.floor((x - drawStartX) / (drawEndX - drawStartX) * 32);
                        for (let y = drawStartY; y < drawEndY; y++) {
                            const texY = Math.floor((y - drawStartY) / (spriteHeight) * 32);
                            if (texX >= 0 && texX < 32 && texY >= 0 && texY < 32) {
                                const healthPercent = enemy.health / enemy.maxHealth;
                                const r = 200 + Math.floor(55 * (1 - healthPercent));
                                const g = 50 + Math.floor(100 * healthPercent);
                                const b = 50;
                                this.ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                                this.ctx.fillRect(x, y, 1, 1);
                            }
                        }
                    }
                    // Полоска здоровья
                    const healthBarWidth = (enemy.health / enemy.maxHealth) * spriteWidth;
                    this.ctx.fillStyle = 'rgba(0,0,0,0.6)';
                    this.ctx.fillRect(drawStartX, drawStartY - 8, spriteWidth, 4);
                    this.ctx.fillStyle = '#ff5555';
                    this.ctx.fillRect(drawStartX, drawStartY - 8, healthBarWidth, 4);
                }
            }
        }

        renderUI() {
            this.ctx.font = 'bold 20px monospace';
            this.ctx.fillStyle = '#ffffff';
            this.ctx.shadowBlur = 0;
            this.ctx.fillText(`❤️ ${this.player.health}`, 10, 30);
            this.ctx.fillText(`🎯 ${this.score}`, 10, 60);
            if (!this.gameActive) {
                this.ctx.font = 'bold 28px monospace';
                this.ctx.fillStyle = '#ff0000';
                this.ctx.fillText('GAME OVER', this.width/2-100, this.height/2);
                this.ctx.font = '14px monospace';
                this.ctx.fillStyle = '#aaaaaa';
                this.ctx.fillText('Нажмите "Начать заново"', this.width/2-110, this.height/2+40);
            }
        }

        restart() {
            this.stop();
            this.player = {
                x: 2.5,
                y: 2.5,
                dirX: 1,
                dirY: 0,
                planeX: 0,
                planeY: 0.66,
                health: 100,
                maxHealth: 100
            };
            this.score = 0;
            this.spawnEnemies();
            this.gameActive = true;
            this.lastAttackTime = 0;
            this.lastEnemyAttackTime = 0;
            this.start();
        }
    }

    let currentGame = null;
    let restartCallback = null;

    function initDoom(canvas) {
        if (currentGame) {
            currentGame.stop();
            currentGame = null;
        }
        currentGame = new DoomGame(canvas);
        currentGame.onGameOver = () => {
            if (restartCallback) restartCallback();
        };
        currentGame.init();
        return currentGame;
    }

    function stopDoom() {
        if (currentGame) {
            currentGame.stop();
            currentGame = null;
        }
    }

    function setRestartCallback(cb) {
        restartCallback = cb;
    }

    return {
        init: initDoom,
        stop: stopDoom,
        setRestartCallback: setRestartCallback,
        getGame: () => currentGame
    };
})();