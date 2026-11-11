// js/upgrade-manager.js - Shared upgrade handling
class UpgradeManager {
    constructor(storageKey, defaultUpgrades) {
        this.storageKey = storageKey;
        this.defaults = { ...defaultUpgrades };
        this.upgrades = { ...defaultUpgrades };
        this.load();
    }

    load() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                this.upgrades = { ...this.defaults, ...parsed };
            }
        } catch(e) { console.warn(`[UpgradeManager] load error:`, e); }
    }

    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.upgrades));
        } catch(e) { console.warn(`[UpgradeManager] save error:`, e); }
    }

    get(key) { return this.upgrades[key]; }
    set(key, value) { this.upgrades[key] = value; this.save(); }
    increment(key, delta = 1) { this.upgrades[key] = (this.upgrades[key] || 0) + delta; this.save(); return this.upgrades[key]; }
    reset() { this.upgrades = { ...this.defaults }; this.save(); }
}