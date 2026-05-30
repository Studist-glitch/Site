// js/core.js - Encrypted storage, event bus, utilities + shared game helpers
(function(window) {
    'use strict';

    // ---------- Encryption helpers (XOR with random key) ----------
    const ENCRYPTION_KEY_STORAGE = '__enc_key_v1';
    let encryptionKey = null;

    function getOrCreateKey() {
        if (encryptionKey) return encryptionKey;
        const stored = localStorage.getItem(ENCRYPTION_KEY_STORAGE);
        if (stored) {
            encryptionKey = stored;
        } else {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let key = '';
            for (let i = 0; i < 32; i++) key += chars.charAt(Math.floor(Math.random() * chars.length));
            encryptionKey = key;
            localStorage.setItem(ENCRYPTION_KEY_STORAGE, encryptionKey);
        }
        return encryptionKey;
    }

    function xorEncrypt(text, key) {
        let result = '';
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            result += String.fromCharCode(charCode);
        }
        return btoa(result);
    }

    function xorDecrypt(encoded, key) {
        const decoded = atob(encoded);
        let result = '';
        for (let i = 0; i < decoded.length; i++) {
            const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            result += String.fromCharCode(charCode);
        }
        return result;
    }

    window.SecureStorage = {
        setItem: function(key, value) {
            const k = getOrCreateKey();
            const encrypted = xorEncrypt(JSON.stringify(value), k);
            localStorage.setItem(key, encrypted);
        },
        getItem: function(key) {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            try {
                const k = getOrCreateKey();
                const decrypted = xorDecrypt(raw, k);
                return JSON.parse(decrypted);
            } catch(e) {
                return null;
            }
        },
        removeItem: function(key) {
            localStorage.removeItem(key);
        }
    };

    // ---------- Event Bus ----------
    const listeners = {};
    window.EventBus = {
        on: function(event, callback) {
            if (!listeners[event]) listeners[event] = [];
            listeners[event].push(callback);
        },
        off: function(event, callback) {
            if (!listeners[event]) return;
            const idx = listeners[event].indexOf(callback);
            if (idx !== -1) listeners[event].splice(idx, 1);
        },
        emit: function(event, data) {
            if (!listeners[event]) return;
            listeners[event].forEach(cb => { try { cb(data); } catch(e) { console.warn(e); } });
        }
    };

    // ---------- Глобальный showToast (уже был) ----------
    window.showToast = function(message, duration = 3000) {
        const toast = document.createElement('div');
        toast.className = 'toast-msg';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), duration);
    };

    // ---------- Общие игровые утилиты (для устранения дублирования) ----------
    window.addGlobalEvent = function(text, containerId = 'eventsContainer') {
        const container = document.getElementById(containerId);
        if (!container) return;
        const div = document.createElement('div');
        div.className = 'event-message';
        div.textContent = text;
        container.appendChild(div);
        setTimeout(() => div.remove(), 3000);
    };

    window.globalFlashScreen = function() {
        const flash = document.createElement('div');
        flash.className = 'screen-flash';
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 400);
    };

    window.globalShowFloatingNumber = function(value, parentId) {
        const container = document.getElementById(parentId);
        if (!container) return;
        const el = document.createElement('span');
        el.className = 'float-number';
        el.textContent = '+' + Math.floor(value);
        el.style.left = (40 + Math.random() * 30) + '%';
        el.style.top = (20 + Math.random() * 30) + '%';
        container.appendChild(el);
        setTimeout(() => el.remove(), 800);
    };

    window.globalCreateRipple = function(e, btn) {
        const rect = btn.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        btn.appendChild(ripple);
        setTimeout(() => ripple.remove(), 500);
    };

    window.requestTimeoutFrame = function(callback, delay) {
        let start = null, id = null;
        function step(timestamp) {
            if (!start) start = timestamp;
            if (timestamp - start >= delay) callback();
            else id = requestAnimationFrame(step);
        }
        id = requestAnimationFrame(step);
        return id;
    };
})(window);