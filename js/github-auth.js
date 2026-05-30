// github-auth.js - Encrypted token, full API, retries (DOOM removed)
window.GitHubAuth = (function() {
    const GIST_ID_KEY = 'starve_gist_id';
    const TOKEN_KEY = 'starve_github_token';
    const USERNAME_KEY = 'starve_github_user';
    const FILENAME = 'starve_save.json';

    let token = null;
    let username = null;
    let gistId = null;
    let isAuthenticated = false;

    function saveState() {
        if (token) SecureStorage.setItem(TOKEN_KEY, token);
        if (username) localStorage.setItem(USERNAME_KEY, username);
        if (gistId) localStorage.setItem(GIST_ID_KEY, gistId);
    }

    function loadState() {
        token = SecureStorage.getItem(TOKEN_KEY);
        username = localStorage.getItem(USERNAME_KEY);
        gistId = localStorage.getItem(GIST_ID_KEY);
        isAuthenticated = !!(token && username);
    }

    async function apiRequest(endpoint, method = 'GET', body = null, retries = 2) {
        const url = `https://api.github.com/${endpoint}`;
        const headers = {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
        };
        if (body) headers['Content-Type'] = 'application/json';
        try {
            const response = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : null });
            if (response.status === 403 && response.headers.get('X-RateLimit-Remaining') === '0' && retries > 0) {
                const resetTime = parseInt(response.headers.get('X-RateLimit-Reset')) * 1000;
                const wait = Math.min(resetTime - Date.now() + 1000, 60000);
                if (wait > 0) {
                    await new Promise(r => setTimeout(r, wait));
                    return apiRequest(endpoint, method, body, retries - 1);
                }
            }
            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`GitHub API error ${response.status}: ${errText}`);
            }
            if (response.status === 204) return null;
            return await response.json();
        } catch(e) {
            if (retries > 0) {
                await new Promise(r => setTimeout(r, 2000));
                return apiRequest(endpoint, method, body, retries - 1);
            }
            throw e;
        }
    }

    async function fetchUserInfo() { return await apiRequest('user'); }

    async function findOrCreateGist() {
        try {
            const gists = await apiRequest('gists');
            for (const gist of gists) {
                if (gist.description === 'Starve Neon Game Save' && gist.files[FILENAME]) {
                    gistId = gist.id;
                    localStorage.setItem(GIST_ID_KEY, gistId);
                    return;
                }
            }
        } catch(e) { console.warn(e); }
        await createNewGist();
    }

    async function createNewGist() {
        const defaultData = getDefaultSaveData();
        const content = JSON.stringify(defaultData, null, 2);
        const result = await apiRequest('gists', 'POST', {
            description: 'Starve Neon Game Save',
            public: false,
            files: { [FILENAME]: { content } }
        });
        gistId = result.id;
        localStorage.setItem(GIST_ID_KEY, gistId);
    }

    function getDefaultSaveData() {
        return {
            version: 2,
            clicker: { score: 0, perClick: 1, perSec: 0, critChance: 0.1, critMult: 2,
                doubleClickChance: 0, maxCombo: 0, comboMultiplier: 0, poisonDps: 0,
                meteorActive: false, meteorInterval: 15, cloneActive: false, bankPercent: 0,
                tickRate: 1000, magnetFieldActive: false, magnetPercent: 0, magnetInterval: 15,
                bossBounty: 1, quantumActive: false, blackHoleActive: false,
                stats: { totalClicks: 0, totalEarned: 0, bossesDefeated: 0 },
                prestige: { level: 0, multiplier: 1, nextAt: 1000000, baseReq: 1000000 },
                upgrades: {} },
            tetris: { currency: 0, upgrades: {} },
            snake: { currency: 0, upgrades: {} },
            pong: {}
        };
    }

    async function register(newToken) {
        if (!newToken || newToken.trim() === '') throw new Error('Токен не может быть пустым');
        token = newToken.trim();
        const userInfo = await fetchUserInfo();
        if (!userInfo || !userInfo.login) {
            token = null;
            throw new Error('Неверный токен или недостаточно прав. Требуются права: user, gist');
        }
        username = userInfo.login;
        try {
            await findOrCreateGist();
        } catch(err) {
            token = null;
            throw new Error('Токен не имеет права на работу с gist. Добавьте разрешение "gist".');
        }
        isAuthenticated = true;
        saveState();
        return { username, gistId };
    }

    async function loadSave() {
        if (!isAuthenticated || !gistId) throw new Error('Не авторизован или нет gist');
        const gist = await apiRequest(`gists/${gistId}`);
        const file = gist.files[FILENAME];
        if (!file) throw new Error('Файл сохранения не найден');
        return JSON.parse(file.content);
    }

    async function saveSave(data) {
        if (!isAuthenticated || !gistId) throw new Error('Не авторизован или нет gist');
        await apiRequest(`gists/${gistId}`, 'PATCH', { files: { [FILENAME]: { content: JSON.stringify(data, null, 2) } } });
    }

    function collectGameData() {
        const save = getDefaultSaveData();
        if (window.clicker && window.clicker.exportState) save.clicker = window.clicker.exportState();
        if (window.tetris && window.tetris.exportState) save.tetris = window.tetris.exportState();
        if (window.snake && window.snake.exportState) save.snake = window.snake.exportState();
        return save;
    }

    function applyGameData(data) {
        if (window.clicker && window.clicker.importState && data.clicker) window.clicker.importState(data.clicker);
        if (window.tetris && window.tetris.importState && data.tetris) window.tetris.importState(data.tetris);
        if (window.snake && window.snake.importState && data.snake) window.snake.importState(data.snake);
        EventBus.emit('gameDataLoaded');
    }

    async function syncLoad() {
        try {
            const data = await loadSave();
            applyGameData(data);
            showToast('Прогресс загружен из GitHub!', 3000);
            return true;
        } catch(e) {
            console.error(e);
            showToast('Ошибка загрузки: ' + e.message, 4000);
            return false;
        }
    }

    async function syncSave() {
        try {
            const data = collectGameData();
            await saveSave(data);
            showToast('Прогресс сохранён в GitHub!', 3000);
            return true;
        } catch(e) {
            console.error(e);
            showToast('Ошибка сохранения: ' + e.message, 4000);
            return false;
        }
    }

    function logout() {
        SecureStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USERNAME_KEY);
        localStorage.removeItem(GIST_ID_KEY);
        token = null;
        username = null;
        gistId = null;
        isAuthenticated = false;
        showToast('Вы вышли из GitHub аккаунта', 2000);
    }

    loadState();
    return {
        get token() { return token; },
        get username() { return username; },
        get isAuthenticated() { return isAuthenticated; },
        register,
        syncLoad,
        syncSave,
        logout,
        collectGameData,
        applyGameData
    };
})();