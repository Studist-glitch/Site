// js/doom.js - Refactored with export/import, cleanup
window.doom = (function() {
    'use strict';

    const DEFAULT_UPGRADES = { damage: 1, health: 1, speed: 1, reloadSpeed: 1 };
    let upgradeManager = null;

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
            this.lastEnemyAttackTime = 0;
            this.attackCooldown = 0.4;
            this.onGameOver = null;

            // Map 10x10
            this.map = [
                [1,1,1,1,1,1,1,1,1,1],
                [1,0,0,0,0,0,0,0,0,1],
                [1,0,1,0,1,0,0,1,0,1],
                [1,0,0,0,0,0,0,0,0,1],
                [1,0,0,1,0,0,1,0,0,1],
                [1,0,0,0,0,0,0,0,0,1],
                [1,0,1,0,0,1,0,0,0,1],
                [1,0,0,0,0,0,0,1,0,1],
                [1,0,0,0,0,0,0,0,0,1],
                [1,1,1,1,1,1,1,1,1,1]
            ];
            this.mapWidth = this.map[0].length;
            this.mapHeight = this.map.length;

            this.player = { x: 2.5, y: 2.5, dirX: 1, dirY: 0, planeX: 0, planeY: 0.66, health: 100, maxHealth: 100 };
            this.score = 0;
            this.enemies = [];
            this.upgrades = { ...DEFAULT_UPGRADES };

            this.bindEvents();
        }

        bindEvents() {
            this.handleKeyDown = this.handleKeyDown.bind(this);
            this.handleKeyUp = this.handleKeyUp.bind(this);
            this.handleShoot = this.handleShoot.bind(this);
            this.restart = this.restart.bind(this);
        }

        loadUpgrades() {
            if (!upgradeManager) {
                upgradeManager = new UpgradeManager('doomUpgrades', DEFAULT_UPGRADES);
            }
            this.upgrades = { ...DEFAULT_UPGRADES, ...upgradeManager.upgrades };
            this.player.maxHealth = Math.floor(100 * this.upgrades.health);
            this.player.health = this.player.maxHealth;
            this.attackCooldown = 0.4 / this.upgrades.reloadSpeed;
        }

        saveUpgrades() {
            for (let k in this.upgrades) upgradeManager.set(k, this.upgrades[k]);
        }

        exportState() {
            return { upgrades: { ...this.upgrades }, score: this.score };
        }

        importState(state) {
            if (!state) return;
            this.upgrades = { ...DEFAULT_UPGRADES, ...(state.upgrades || {}) };
            this.score = state.score || 0;
            for (let k in this.upgrades) upgradeManager.set(k, this.upgrades[k]);
            this.player.maxHealth = Math.floor(100 * this.upgrades.health);
            this.player.health = this.player.maxHealth;
            this.attackCooldown = 0.4 / this.upgrades.reloadSpeed;
            this.saveUpgrades();
        }

        isWall(x, y) {
            const ix = Math.floor(x), iy = Math.floor(y);
            if (ix < 0 || iy < 0 || ix >= this.mapWidth || iy >= this.mapHeight) return true;
            return this.map[iy][ix] === 1;
        }

        spawnEnemies() {
            this.enemies = [];
            const enemyCount = 6 + Math.floor(this.score / 500);
            for (let i = 0; i < enemyCount; i++) {
                let x, y;
                do {
                    x = 1 + Math.random() * (this.mapWidth - 2);
                    y = 1 + Math.random() * (this.mapHeight - 2);
                } while (this.isWall(x, y) || Math.hypot(x - this.player.x, y - this.player.y) < 2);
                const health = 30 + Math.floor(Math.random() * 30) * (this.score / 1000);
                this.enemies.push({ x, y, health: Math.min(200, health), maxHealth: Math.min(200, health) });
            }
        }

        init() {
            this.loadUpgrades();
            this.gameActive = true;
            this.start();
        }

        start() {
            window.addEventListener('keydown', this.handleKeyDown);
            window.addEventListener('keyup', this.handleKeyUp);
            this.canvas.addEventListener('click', this.handleShoot);
            this.lastTimestamp = null;
            this.updateLoop();
        }

        stop() {
            this.gameActive = false;
            if (this.animationId) cancelAnimationFrame(this.animationId);
            window.removeEventListener('keydown', this.handleKeyDown);
            window.removeEventListener('keyup', this.handleKeyUp);
            this.canvas.removeEventListener('click', this.handleShoot);
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

            let closestDist = Infinity, closestEnemy = null;
            for (let enemy of this.enemies) {
                const dx = enemy.x - this.player.x, dy = enemy.y - this.player.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 6) continue;
                const dirDot = (dx * this.player.dirX + dy * this.player.dirY) / dist;
                if (dirDot > Math.cos(Math.PI / 3) && dist < closestDist) {
                    closestDist = dist;
                    closestEnemy = enemy;
                }
            }
            if (closestEnemy) {
                const damage = 35 * this.upgrades.damage;
                closestEnemy.health -= damage;
                if (closestEnemy.health <= 0) {
                    const idx = this.enemies.indexOf(closestEnemy);
                    if (idx !== -1) this.enemies.splice(idx, 1);
                    this.score += 100;
                    this.saveUpgrades();
                    this.spawnRandomEnemy();
                }
                this.flashScreen();
                this.spawnMuzzleFlash(e.clientX, e.clientY);
            }
        }

        spawnRandomEnemy() {
            for (let attempt = 0; attempt < 50; attempt++) {
                const x = 1 + Math.random() * (this.mapWidth - 2);
                const y = 1 + Math.random() * (this.mapHeight - 2);
                if (!this.isWall(x, y) && Math.hypot(x - this.player.x, y - this.player.y) > 2) {
                    const health = 30 + Math.floor(Math.random() * 20);
                    this.enemies.push({ x, y, health, maxHealth: health });
                    break;
                }
            }
        }

        flashScreen() {
            const flash = document.createElement('div');
            flash.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,255,255,0.4);pointer-events:none;z-index:10000';
            document.body.appendChild(flash);
            setTimeout(() => flash.remove(), 80);
        }

        spawnMuzzleFlash(x, y) {
            const flash = document.createElement('div');
            flash.style.cssText = `position:fixed;left:${x-15}px;top:${y-15}px;width:30px;height:30px;border-radius:50%;background:radial-gradient(circle,#ffaa44,#ff4400);pointer-events:none;z-index:10001`;
            document.body.appendChild(flash);
            setTimeout(() => flash.remove(), 100);
        }

        updateMovement(deltaTime) {
            const moveSpeed = 5.0 * deltaTime * this.upgrades.speed;
            const rotSpeed = 3.0 * deltaTime;
            let moveX = 0, moveY = 0;
            if (this.keys.w) { moveX += this.player.dirX; moveY += this.player.dirY; }
            if (this.keys.s) { moveX -= this.player.dirX; moveY -= this.player.dirY; }
            if (this.keys.a) {
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
                moveX /= len; moveY /= len;
                const newX = this.player.x + moveX * moveSpeed;
                if (!this.isWall(newX, this.player.y)) this.player.x = newX;
                const newY = this.player.y + moveY * moveSpeed;
                if (!this.isWall(this.player.x, newY)) this.player.y = newY;
            }

            const now = performance.now() / 1000;
            for (let enemy of this.enemies) {
                const dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
                if (dist < 1.2 && (!this.lastEnemyAttackTime || now - this.lastEnemyAttackTime > 1.0)) {
                    this.lastEnemyAttackTime = now;
                    this.player.health -= 15;
                    if (this.player.health <= 0) this.gameOver();
                    this.showDamageEffect();
                }
            }
        }

        showDamageEffect() {
            const flash = document.createElement('div');
            flash.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,0,0,0.4);pointer-events:none;z-index:10000';
            document.body.appendChild(flash);
            setTimeout(() => flash.remove(), 150);
        }

        gameOver() {
            this.gameActive = false;
            if (this.onGameOver) this.onGameOver();
        }

        updateLoop() {
            if (!this.gameActive) return;
            const now = performance.now();
            if (!this.lastTimestamp) this.lastTimestamp = now;
            const delta = Math.min(0.033, (now - this.lastTimestamp) / 1000);
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
                const cameraX = 2 * x / this.width - 1;
                const rayDirX = this.player.dirX + this.player.planeX * cameraX;
                const rayDirY = this.player.dirY + this.player.planeY * cameraX;
                let mapX = Math.floor(this.player.x), mapY = Math.floor(this.player.y);
                const deltaDistX = Math.abs(1 / rayDirX), deltaDistY = Math.abs(1 / rayDirY);
                let stepX, stepY, sideDistX, sideDistY;
                if (rayDirX < 0) { stepX = -1; sideDistX = (this.player.x - mapX) * deltaDistX; }
                else { stepX = 1; sideDistX = (mapX + 1 - this.player.x) * deltaDistX; }
                if (rayDirY < 0) { stepY = -1; sideDistY = (this.player.y - mapY) * deltaDistY; }
                else { stepY = 1; sideDistY = (mapY + 1 - this.player.y) * deltaDistY; }
                let hit = 0, side = 0;
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
                    if (mapX < 0 || mapY < 0 || mapX >= this.mapWidth || mapY >= this.mapHeight) { hit = 1; break; }
                    if (this.map[mapY][mapX] > 0) hit = 1;
                }
                let perpWallDist = side === 0 ? (sideDistX - deltaDistX) : (sideDistY - deltaDistY);
                if (perpWallDist < 0.01) perpWallDist = 0.01;
                const lineHeight = Math.floor(this.height / perpWallDist);
                const drawStart = Math.max(0, -lineHeight / 2 + this.height / 2);
                const drawEnd = Math.min(this.height - 1, lineHeight / 2 + this.height / 2);
                let r = 120 + (side === 0 ? 40 : 20), g = 80 + (side === 0 ? 30 : 10), b = 60;
                const shade = 1 - Math.min(0.7, perpWallDist / 10);
                r = Math.min(255, r * shade); g = Math.min(255, g * shade); b = Math.min(255, b * shade);
                this.ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
                this.ctx.fillRect(x, drawStart, 1, drawEnd - drawStart);
                this.ctx.fillStyle = 'rgb(30,20,30)';
                this.ctx.fillRect(x, 0, 1, drawStart);
                this.ctx.fillStyle = 'rgb(60,50,40)';
                this.ctx.fillRect(x, drawEnd, 1, this.height - drawEnd);
            }
        }

        renderSprites() {
            const sprites = this.enemies.map((e, idx) => {
                const dx = e.x - this.player.x, dy = e.y - this.player.y;
                return { enemy: e, dist: Math.hypot(dx, dy), idx };
            }).sort((a,b) => b.dist - a.dist);
            for (let s of sprites) {
                const e = s.enemy;
                const dx = e.x - this.player.x, dy = e.y - this.player.y;
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
                        for (let y = drawStartY; y < drawEndY; y++) {
                            const healthPercent = e.health / e.maxHealth;
                            const r = 200 + Math.floor(55 * (1 - healthPercent));
                            const g = 50 + Math.floor(100 * healthPercent);
                            this.ctx.fillStyle = `rgb(${r}, ${g}, 50)`;
                            this.ctx.fillRect(x, y, 1, 1);
                        }
                    }
                    const healthBarWidth = (e.health / e.maxHealth) * spriteWidth;
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
            this.ctx.fillText(`❤️ ${Math.floor(this.player.health)} / ${this.player.maxHealth}`, 10, 30);
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
            this.player = { x: 2.5, y: 2.5, dirX: 1, dirY: 0, planeX: 0, planeY: 0.66, health: this.player.maxHealth, maxHealth: this.player.maxHealth };
            this.spawnEnemies();
            this.gameActive = true;
            this.lastAttackTime = 0;
            this.lastEnemyAttackTime = 0;
            this.start();
        }

        showShop() {
            const self = this;
            const render = () => {
                const modalInner = document.getElementById('modalInner');
                if (!modalInner) return;
                modalInner.innerHTML = `
                    <h3>🔫 Улучшения DOOM</h3>
                    <p>Очки: <strong>${self.score}</strong></p>
                    <div class="snake-shop" id="doomShopUpgrades"></div>
                    <button class="game-btn" id="playDoomAgain">Играть снова</button>
                    <button class="back-btn" id="backToDoomMenu">В меню</button>
                `;
                const container = document.getElementById('doomShopUpgrades');
                const upgrades = [
                    { key: 'damage', name: 'Урон +25%', cost: 200, inc: 200, max: 5, val: self.upgrades.damage, desc: 'Увеличивает урон оружия' },
                    { key: 'health', name: 'Здоровье +25%', cost: 150, inc: 150, max: 5, val: self.upgrades.health, desc: 'Увеличивает максимальное здоровье' },
                    { key: 'speed', name: 'Скорость +20%', cost: 180, inc: 180, max: 5, val: self.upgrades.speed, desc: 'Быстрее передвижение' },
                    { key: 'reloadSpeed', name: 'Перезарядка -20%', cost: 250, inc: 200, max: 5, val: self.upgrades.reloadSpeed, desc: 'Меньше задержка между выстрелами' }
                ];
                upgrades.forEach(up => {
                    const currentVal = up.val;
                    const maxed = up.max && currentVal >= up.max;
                    const nextCost = Math.floor(up.cost + (currentVal - 1) * up.inc);
                    const item = document.createElement('div');
                    item.className = 'shop-upgrade';
                    item.innerHTML = `
                        <div class="desc"><strong>${up.name}</strong><br>${up.desc}</div>
                        <span class="cost">${maxed ? 'МАКС' : nextCost + '💎'}</span>
                        <button class="buy-btn" ${(self.score >= nextCost && !maxed) ? '' : 'disabled'}>Купить</button>
                    `;
                    if (!maxed && self.score >= nextCost) {
                        item.querySelector('.buy-btn').onclick = () => {
                            self.score -= nextCost;
                            self.upgrades[up.key] = currentVal + 1;
                            upgradeManager.set(up.key, self.upgrades[up.key]);
                            self.player.maxHealth = Math.floor(100 * self.upgrades.health);
                            self.player.health = self.player.maxHealth;
                            self.attackCooldown = 0.4 / self.upgrades.reloadSpeed;
                            self.saveUpgrades();
                            render();
                        };
                    }
                    container.appendChild(item);
                });
                document.getElementById('playDoomAgain').onclick = () => { self.restart(); document.dispatchEvent(new CustomEvent('startDoomSingle')); };
                document.getElementById('backToDoomMenu').onclick = () => document.dispatchEvent(new CustomEvent('openMiniGamesMenu'));
            };
            render();
        }
    }

    let currentGame = null;

    function initDoom(canvas) {
        if (currentGame) { currentGame.stop(); currentGame = null; }
        currentGame = new DoomGame(canvas);
        currentGame.onGameOver = () => { if (currentGame) currentGame.showShop(); };
        currentGame.init();
        return currentGame;
    }

    function stopDoom() { if (currentGame) { currentGame.stop(); currentGame = null; } }
    function exportState() { return currentGame ? currentGame.exportState() : null; }
    function importState(state) { if (currentGame) currentGame.importState(state); }

    return { init: initDoom, stop: stopDoom, exportState, importState, getGame: () => currentGame };
})();