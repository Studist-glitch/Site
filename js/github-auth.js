// github-auth.js
window.GitHubAuth = {
    // Константы
    GIST_ID_KEY: 'starve_gist_id',
    TOKEN_KEY: 'starve_github_token',
    USERNAME_KEY: 'starve_github_user',
    FILENAME: 'starve_save.json',

    token: null,
    username: null,
    gistId: null,
    isAuthenticated: false,

    // Инициализация при загрузке страницы
    init: function() {
        this.token = localStorage.getItem(this.TOKEN_KEY);
        this.username = localStorage.getItem(this.USERNAME_KEY);
        this.gistId = localStorage.getItem(this.GIST_ID_KEY);
        if (this.token && this.username) {
            this.isAuthenticated = true;
            console.log('[GitHubAuth] Загружен токен для', this.username);
            return true;
        }
        return false;
    },

    // Основной метод регистрации / входа
    register: async function(token) {
        if (!token || token.trim() === '') {
            throw new Error('Токен не может быть пустым');
        }
        this.token = token.trim();

        // 1. Проверяем токен и получаем пользователя
        const userInfo = await this.fetchUserInfo();
        if (!userInfo || !userInfo.login) {
            this.token = null;
            throw new Error('Неверный токен или недостаточно прав. Требуются права: user, gist');
        }
        this.username = userInfo.login;

        // 2. Проверяем наличие права на gist (пробуем создать или найти)
        try {
            await this.findOrCreateGist();
        } catch (err) {
            this.token = null;
            throw new Error('Токен не имеет права на работу с gist. Добавьте разрешение "gist" в настройках токена.');
        }

        this.isAuthenticated = true;
        localStorage.setItem(this.TOKEN_KEY, this.token);
        localStorage.setItem(this.USERNAME_KEY, this.username);
        return { username: this.username, gistId: this.gistId };
    },

    // Запрос к GitHub API
    async apiRequest(endpoint, method = 'GET', body = null) {
        const url = `https://api.github.com/${endpoint}`;
        const headers = {
            'Authorization': `token ${this.token}`,
            'Accept': 'application/vnd.github.v3+json'
        };
        if (body) {
            headers['Content-Type'] = 'application/json';
        }
        const response = await fetch(url, {
            method: method,
            headers: headers,
            body: body ? JSON.stringify(body) : null
        });
        if (!response.ok) {
            let errorText = await response.text();
            throw new Error(`GitHub API error ${response.status}: ${errorText}`);
        }
        if (response.status === 204) return null;
        return await response.json();
    },

    async fetchUserInfo() {
        try {
            const data = await this.apiRequest('user');
            return data;
        } catch(e) {
            console.error('Ошибка получения пользователя:', e);
            return null;
        }
    },

    // Найти существующий gist по описанию или создать новый
    async findOrCreateGist() {
        // Пробуем загрузить все gist'ы текущего пользователя
        try {
            const gists = await this.apiRequest('gists');
            for (const gist of gists) {
                if (gist.description === 'Starve Neon Game Save' && gist.files[this.FILENAME]) {
                    this.gistId = gist.id;
                    localStorage.setItem(this.GIST_ID_KEY, this.gistId);
                    console.log('[GitHubAuth] Найден существующий gist:', this.gistId);
                    return;
                }
            }
        } catch(e) {
            console.warn('Не удалось получить список gistов', e);
        }
        // Создаём новый
        await this.createNewGist();
    },

    async createNewGist() {
        const defaultData = this.getDefaultSaveData();
        const content = JSON.stringify(defaultData, null, 2);
        const gistData = {
            description: 'Starve Neon Game Save',
            public: false,
            files: {
                [this.FILENAME]: {
                    content: content
                }
            }
        };
        const result = await this.apiRequest('gists', 'POST', gistData);
        this.gistId = result.id;
        localStorage.setItem(this.GIST_ID_KEY, this.gistId);
        console.log('[GitHubAuth] Создан новый gist:', this.gistId);
    },

    // Загрузить сохранение из gist
    async loadSave() {
        if (!this.isAuthenticated || !this.gistId) {
            throw new Error('Не авторизован или нет gist');
        }
        const gist = await this.apiRequest(`gists/${this.gistId}`);
        const file = gist.files[this.FILENAME];
        if (!file) throw new Error('Файл сохранения не найден');
        const content = file.content;
        return JSON.parse(content);
    },

    // Сохранить данные в gist
    async saveSave(data) {
        if (!this.isAuthenticated || !this.gistId) {
            throw new Error('Не авторизован или нет gist');
        }
        const content = JSON.stringify(data, null, 2);
        const updateData = {
            files: {
                [this.FILENAME]: {
                    content: content
                }
            }
        };
        await this.apiRequest(`gists/${this.gistId}`, 'PATCH', updateData);
        console.log('[GitHubAuth] Сохранение записано');
    },

    // Стандартная структура данных
    getDefaultSaveData() {
        return {
            version: 1,
            clicker: {
                score: 0,
                perClick: 1,
                perSec: 0,
                critChance: 0.1,
                critMult: 2,
                doubleClickChance: 0,
                maxCombo: 0,
                comboMultiplier: 0,
                poisonDps: 0,
                meteorActive: false,
                meteorInterval: 15,
                cloneActive: false,
                bankPercent: 0,
                tickRate: 1000,
                magnetFieldActive: false,
                magnetPercent: 0,
                magnetInterval: 15,
                bossBounty: 1,
                quantumActive: false,
                blackHoleActive: false,
                stats: { totalClicks: 0, totalEarned: 0, bossesDefeated: 0 },
                prestige: { level: 0, multiplier: 1, nextAt: 1000000, baseReq: 1000000 },
                upgrades: {}
            },
            tetris: {
                currency: 0,
                upgrades: {
                    speed: 0, lineBonus: 0, startRows: 0, specialChance: 0,
                    abilityPower: 0, pieceSet: 0, holdPiece: false, ghostPiece: false
                }
            },
            snake: {
                currency: 0,
                upgrades: {
                    length: 0, speed: 1.0, scoreMult: 1.0, magnet: false,
                    shieldStart: false, dashCooldown: 0, extraPowerups: 0, skinLevel: 0
                }
            },
            pong: {}
        };
    },

    // Собрать текущее состояние из глобальных объектов игр
    collectGameData() {
        const save = this.getDefaultSaveData();

        // Кликер
        if (window.clicker) {
            save.clicker.score = window.clicker.score || 0;
            save.clicker.perClick = window.clicker.perClick || 1;
            save.clicker.perSec = window.clicker.perSec || 0;
            save.clicker.critChance = window.clicker.critChance || 0.1;
            save.clicker.critMult = window.clicker.critMult || 2;
            save.clicker.doubleClickChance = window.clicker.doubleClickChance || 0;
            save.clicker.maxCombo = window.clicker.maxCombo || 0;
            save.clicker.comboMultiplier = window.clicker.comboMultiplier || 0;
            save.clicker.poisonDps = window.clicker.poisonDps || 0;
            save.clicker.meteorActive = window.clicker.meteorActive || false;
            save.clicker.meteorInterval = window.clicker.meteorInterval || 15;
            save.clicker.cloneActive = window.clicker.cloneActive || false;
            save.clicker.bankPercent = window.clicker.bankPercent || 0;
            save.clicker.tickRate = window.clicker.tickRate || 1000;
            save.clicker.magnetFieldActive = window.clicker.magnetFieldActive || false;
            save.clicker.magnetPercent = window.clicker.magnetPercent || 0;
            save.clicker.magnetInterval = window.clicker.magnetInterval || 15;
            save.clicker.bossBounty = window.clicker.bossBounty || 1;
            save.clicker.quantumActive = window.clicker.quantumActive || false;
            save.clicker.blackHoleActive = window.clicker.blackHoleActive || false;
            if (window.clicker.stats) save.clicker.stats = { ...window.clicker.stats };
            if (window.clicker.prestige) save.clicker.prestige = { ...window.clicker.prestige };
            if (window.clicker.upgrades) {
                for (let key in window.clicker.upgrades) {
                    if (window.clicker.upgrades[key]) {
                        save.clicker.upgrades[key] = window.clicker.upgrades[key].level;
                    }
                }
            }
        }

        // Тетрис
        if (window.tetris) {
            save.tetris.currency = window.tetris.currency || 0;
            if (window.tetris.upgrades) save.tetris.upgrades = { ...window.tetris.upgrades };
        }

        // Змейка
        if (window.snake) {
            save.snake.currency = window.snake.currency || 0;
            if (window.snake.upgrades) save.snake.upgrades = { ...window.snake.upgrades };
        }

        return save;
    },

    // Применить загруженные данные к глобальным объектам игр
    applyGameData(data) {
        // Кликер
        if (window.clicker && data.clicker) {
            window.clicker.score = data.clicker.score || 0;
            window.clicker.perClick = data.clicker.perClick || 1;
            window.clicker.perSec = data.clicker.perSec || 0;
            window.clicker.critChance = data.clicker.critChance || 0.1;
            window.clicker.critMult = data.clicker.critMult || 2;
            window.clicker.doubleClickChance = data.clicker.doubleClickChance || 0;
            window.clicker.maxCombo = data.clicker.maxCombo || 0;
            window.clicker.comboMultiplier = data.clicker.comboMultiplier || 0;
            window.clicker.poisonDps = data.clicker.poisonDps || 0;
            window.clicker.meteorActive = data.clicker.meteorActive || false;
            window.clicker.meteorInterval = data.clicker.meteorInterval || 15;
            window.clicker.cloneActive = data.clicker.cloneActive || false;
            window.clicker.bankPercent = data.clicker.bankPercent || 0;
            window.clicker.tickRate = data.clicker.tickRate || 1000;
            window.clicker.magnetFieldActive = data.clicker.magnetFieldActive || false;
            window.clicker.magnetPercent = data.clicker.magnetPercent || 0;
            window.clicker.magnetInterval = data.clicker.magnetInterval || 15;
            window.clicker.bossBounty = data.clicker.bossBounty || 1;
            window.clicker.quantumActive = data.clicker.quantumActive || false;
            window.clicker.blackHoleActive = data.clicker.blackHoleActive || false;
            if (data.clicker.stats) window.clicker.stats = { ...data.clicker.stats };
            if (data.clicker.prestige) window.clicker.prestige = { ...data.clicker.prestige };
            if (data.clicker.upgrades) {
                for (let key in data.clicker.upgrades) {
                    if (window.clicker.upgrades[key]) {
                        window.clicker.upgrades[key].level = data.clicker.upgrades[key];
                    }
                }
                // Переприменяем эффекты улучшений
                for (let key in window.clicker.upgrades) {
                    const up = window.clicker.upgrades[key];
                    if (up && up.effect) {
                        for (let i = 1; i <= up.level; i++) {
                            up.effect(i);
                        }
                    }
                }
            }
            // Обновляем UI кликера, если есть метод
            if (window.clicker.updateUI) window.clicker.updateUI();
            if (window.clicker.updateBossUI) window.clicker.updateBossUI();
            if (window.clicker.save) window.clicker.save();
        }

        // Тетрис
        if (window.tetris && data.tetris) {
            window.tetris.currency = data.tetris.currency || 0;
            if (data.tetris.upgrades) {
                for (let k in data.tetris.upgrades) {
                    if (window.tetris.upgrades && window.tetris.upgrades.hasOwnProperty(k)) {
                        window.tetris.upgrades[k] = data.tetris.upgrades[k];
                    }
                }
            }
            if (window.tetris.saveUpgrades) window.tetris.saveUpgrades();
        }

        // Змейка
        if (window.snake && data.snake) {
            window.snake.currency = data.snake.currency || 0;
            if (data.snake.upgrades) {
                for (let k in data.snake.upgrades) {
                    if (window.snake.upgrades && window.snake.upgrades.hasOwnProperty(k)) {
                        window.snake.upgrades[k] = data.snake.upgrades[k];
                    }
                }
            }
            if (window.snake.saveUpgrades) window.snake.saveUpgrades();
        }
    },

    // Синхронизация: загрузить с сервера и применить
    async syncLoad() {
        try {
            const data = await this.loadSave();
            this.applyGameData(data);
            this.showToast('Прогресс загружен из GitHub!', 3000);
            return true;
        } catch(e) {
            console.error('Ошибка загрузки сохранения:', e);
            this.showToast('Ошибка загрузки: ' + e.message, 4000);
            return false;
        }
    },

    // Синхронизация: сохранить текущее состояние на сервер
    async syncSave() {
        try {
            const data = this.collectGameData();
            await this.saveSave(data);
            this.showToast('Прогресс сохранён в GitHub!', 3000);
            return true;
        } catch(e) {
            console.error('Ошибка сохранения:', e);
            this.showToast('Ошибка сохранения: ' + e.message, 4000);
            return false;
        }
    },

    // Выход (удаление токена)
    logout() {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USERNAME_KEY);
        localStorage.removeItem(this.GIST_ID_KEY);
        this.token = null;
        this.username = null;
        this.gistId = null;
        this.isAuthenticated = false;
        this.showToast('Вы вышли из GitHub аккаунта', 2000);
    },

    // Вспомогательная функция для уведомлений
    showToast: function(msg, duration = 3000) {
        if (window.showToast) {
            window.showToast(msg, duration);
        } else {
            const toast = document.createElement('div');
            toast.className = 'toast-msg';
            toast.textContent = msg;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), duration);
        }
    }
};