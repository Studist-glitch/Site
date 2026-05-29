// js/create-post.js

(function() {
    // ---------- DOM элементы ----------
    const createModal = document.getElementById('createPostModal');
    const editModal = document.getElementById('editPostModal');
    const openCreateBtn = document.getElementById('openCreatePostModal');
    const closeCreateBtn = document.getElementById('closeCreatePostModal');
    const closeEditBtn = document.getElementById('closeEditPostModal');
    const createForm = document.getElementById('createPostForm');
    const editForm = document.getElementById('editPostForm');
    const createStatus = document.getElementById('postCreationStatus');
    const editStatus = document.getElementById('editPostStatus');
    const wrapper = document.getElementById('createPostBtnWrapper');

    let currentEditIssueNumber = null;

    // ---------- Визуальный редактор таблиц (заменяет старый диалог) ----------
    function openTableEditor(textareaId) {
        const textarea = document.getElementById(textareaId);
        if (!textarea) return;

        // Начальные размеры: 3 строки, 3 столбца
        let rows = 3, cols = 3;
        let tableData = Array(rows).fill().map(() => Array(cols).fill(''));

        // Функция перестроения таблицы по данным
        function rebuildTable(container) {
            container.innerHTML = '';
            const table = document.createElement('table');
            table.className = 'visual-table-editor';

            // Заголовки (только для удобства, не влияют на Markdown)
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            for (let c = 0; c < cols; c++) {
                const th = document.createElement('th');
                th.textContent = `Столбец ${c+1}`;
                th.style.position = 'relative';
                // Кнопка удаления столбца
                const delColBtn = document.createElement('button');
                delColBtn.textContent = '✖';
                delColBtn.className = 'table-col-del';
                delColBtn.style.position = 'absolute';
                delColBtn.style.right = '2px';
                delColBtn.style.top = '2px';
                delColBtn.style.fontSize = '10px';
                delColBtn.style.padding = '0 4px';
                delColBtn.style.background = 'rgba(200,0,0,0.6)';
                delColBtn.style.border = 'none';
                delColBtn.style.borderRadius = '10px';
                delColBtn.style.cursor = 'pointer';
                delColBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (cols <= 1) return;
                    // Удаляем столбец
                    for (let r = 0; r < rows; r++) {
                        tableData[r].splice(c, 1);
                    }
                    cols--;
                    rebuildTable(container);
                });
                th.appendChild(delColBtn);
                headerRow.appendChild(th);
            }
            thead.appendChild(headerRow);
            table.appendChild(thead);

            const tbody = document.createElement('tbody');
            for (let r = 0; r < rows; r++) {
                const tr = document.createElement('tr');
                for (let c = 0; c < cols; c++) {
                    const td = document.createElement('td');
                    td.contentEditable = 'true';
                    td.textContent = tableData[r][c];
                    td.addEventListener('input', (e) => {
                        tableData[r][c] = e.target.textContent;
                    });
                    tr.appendChild(td);
                }
                // Кнопка удаления строки
                const delRowTd = document.createElement('td');
                delRowTd.style.width = '30px';
                delRowTd.style.textAlign = 'center';
                const delRowBtn = document.createElement('button');
                delRowBtn.textContent = '✖';
                delRowBtn.className = 'table-row-del';
                delRowBtn.style.background = 'rgba(200,0,0,0.6)';
                delRowBtn.style.border = 'none';
                delRowBtn.style.borderRadius = '12px';
                delRowBtn.style.cursor = 'pointer';
                delRowBtn.style.padding = '2px 6px';
                delRowBtn.addEventListener('click', () => {
                    if (rows <= 1) return;
                    tableData.splice(r, 1);
                    rows--;
                    rebuildTable(container);
                });
                delRowTd.appendChild(delRowBtn);
                tr.appendChild(delRowTd);
                tbody.appendChild(tr);
            }
            table.appendChild(tbody);

            container.appendChild(table);
        }

        // Создание модального окна редактора
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.display = 'flex';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0,0,0,0.8)';
        modal.style.zIndex = '10001';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.maxWidth = '90vw';
        modalContent.style.maxHeight = '85vh';
        modalContent.style.overflow = 'auto';
        modalContent.style.backgroundColor = '#12121a';
        modalContent.style.border = '2px solid #c44eff';
        modalContent.style.borderRadius = '12px';
        modalContent.style.padding = '1rem';

        modalContent.innerHTML = `
            <h3 style="color:#c44eff; margin-bottom:0.8rem;">✏️ Редактор таблицы</h3>
            <div class="table-editor-toolbar" style="display:flex; flex-wrap:wrap; gap:0.5rem; margin-bottom:1rem;">
                <button type="button" id="addRowBtn" class="game-btn" style="width:auto;">➕ Добавить строку</button>
                <button type="button" id="addColBtn" class="game-btn" style="width:auto;">➕ Добавить столбец</button>
                <button type="button" id="clearTableBtn" class="game-btn" style="width:auto;">🗑 Очистить</button>
                <button type="button" id="insertTableBtn" class="game-btn" style="width:auto;">✅ Вставить таблицу</button>
                <button type="button" id="cancelTableBtn" class="back-btn" style="margin:0;">Отмена</button>
            </div>
            <div id="tableEditorContainer" style="overflow-x:auto;"></div>
        `;

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        const container = modalContent.querySelector('#tableEditorContainer');
        function refreshUI() {
            rebuildTable(container);
        }
        refreshUI();

        // Обработчики кнопок
        modalContent.querySelector('#addRowBtn').addEventListener('click', () => {
            rows++;
            tableData.push(Array(cols).fill(''));
            refreshUI();
        });
        modalContent.querySelector('#addColBtn').addEventListener('click', () => {
            cols++;
            for (let r = 0; r < rows; r++) {
                tableData[r].push('');
            }
            refreshUI();
        });
        modalContent.querySelector('#clearTableBtn').addEventListener('click', () => {
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    tableData[r][c] = '';
                }
            }
            refreshUI();
        });
        modalContent.querySelector('#insertTableBtn').addEventListener('click', () => {
            // Генерация Markdown
            let md = '';
            // Заголовок (первая строка)
            for (let c = 0; c < cols; c++) {
                md += `| Столбец ${c+1} `;
            }
            md += '|\n|' + Array(cols).fill('---').join('|') + '|\n';
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    let cellText = tableData[r][c] || '';
                    // Экранируем только опасные символы для Markdown (но оставляем возможность форматирования)
                    cellText = cellText.replace(/\|/g, '\\|');
                    md += `| ${cellText} `;
                }
                md += '|\n';
            }
            // Вставка в textarea
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const currentText = textarea.value;
            textarea.value = currentText.substring(0, start) + '\n\n' + md + '\n\n' + currentText.substring(end);
            textarea.focus();
            textarea.selectionStart = start + md.length + 4;
            textarea.selectionEnd = start + md.length + 4;
            // Закрыть модалку
            modal.remove();
        });
        modalContent.querySelector('#cancelTableBtn').addEventListener('click', () => {
            modal.remove();
        });
        // Закрытие по клику на фон
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    // ---------- Панель инструментов для Markdown ----------
    function setupToolbar(textareaId, toolbarId) {
        const textarea = document.getElementById(textareaId);
        if (!textarea) return;
        const toolbar = document.getElementById(toolbarId);
        if (!toolbar) return;

        const insertText = (before, after, defaultText = 'текст') => {
            const start = textarea.selectionStart, end = textarea.selectionEnd;
            const selected = textarea.value.substring(start, end);
            const replacement = before + (selected || defaultText) + after;
            textarea.value = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
            textarea.focus();
            textarea.selectionStart = start + before.length;
            textarea.selectionEnd = start + before.length + (selected || defaultText).length;
        };

        const commands = {
            bold: () => insertText('**', '**', 'жирный текст'),
            italic: () => insertText('*', '*', 'курсив'),
            h1: () => insertText('# ', '', 'Заголовок 1'),
            h2: () => insertText('## ', '', 'Заголовок 2'),
            ul: () => insertText('- ', '', 'пункт списка'),
            ol: () => insertText('1. ', '', 'пункт'),
            link: () => { const url = prompt('Введите URL:', 'https://'); if (url) insertText('[', `](${url})`, 'текст ссылки'); },
            table: () => openTableEditor(textareaId)   // ВЫЗОВ НОВОГО РЕДАКТОРА
        };

        toolbar.querySelectorAll('[data-cmd]').forEach(btn => {
            btn.addEventListener('click', () => { const cmd = btn.dataset.cmd; if (commands[cmd]) commands[cmd](); });
        });
    }

    // ---------- Показать/скрыть кнопку создания ----------
    function updateCreatePostButtonVisibility() {
        if (!wrapper) return;
        if (window.GitHubAuth && window.GitHubAuth.isAuthenticated && window.GitHubAuth.token) wrapper.style.display = 'block';
        else wrapper.style.display = 'none';
    }

    function openCreateModal() {
        if (createModal) {
            createModal.style.display = 'flex';
            if (createStatus) createStatus.innerHTML = '';
            if (createForm) createForm.reset();
        }
    }
    function closeCreateModal() { if (createModal) createModal.style.display = 'none'; }

    function openEditModal(issueNumber, title, body, labels) {
        if (!editModal) return;
        currentEditIssueNumber = issueNumber;
        document.getElementById('editPostTitle').value = title;
        document.getElementById('editPostBody').value = body;
        document.getElementById('editPostLabels').value = labels;
        if (editStatus) editStatus.innerHTML = '';
        editModal.style.display = 'flex';
    }
    function closeEditModal() { if (editModal) editModal.style.display = 'none'; currentEditIssueNumber = null; }

    // ---------- API вызовы ----------
    async function createIssue(title, body, labelsArray) {
        const token = window.GitHubAuth.token;
        if (!token) throw new Error('Не авторизован');
        const response = await fetch(`https://api.github.com/repos/Studist-glitch/Site/issues`, {
            method: 'POST',
            headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, body, labels: labelsArray })
        });
        if (!response.ok) { const err = await response.json(); throw new Error(err.message || 'Ошибка создания Issue'); }
        return await response.json();
    }

    async function updateIssue(issueNumber, title, body, labelsArray) {
        const token = window.GitHubAuth.token;
        if (!token) throw new Error('Не авторизован');
        const response = await fetch(`https://api.github.com/repos/Studist-glitch/Site/issues/${issueNumber}`, {
            method: 'PATCH',
            headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, body, labels: labelsArray })
        });
        if (!response.ok) { const err = await response.json(); throw new Error(err.message || 'Ошибка обновления Issue'); }
        return await response.json();
    }

    // ---------- Обработчики форм ----------
    if (createForm) {
        createForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('postTitle')?.value.trim();
            const body = document.getElementById('postBody')?.value.trim();
            const labelsInput = document.getElementById('postLabels')?.value.trim();
            let labelsArray = labelsInput ? labelsInput.split(',').map(l => l.trim()).filter(l => l) : [];
            if (!title || !body) { if (createStatus) createStatus.innerHTML = '<span style="color:#ff8888;">❌ Заполните заголовок и текст</span>'; return; }
            if (createStatus) createStatus.innerHTML = '<span>⏳ Публикация...</span>';
            try {
                await createIssue(title, body, labelsArray);
                if (createStatus) createStatus.innerHTML = '<span style="color:#88ff88;">✅ Пост опубликован! Обновление...</span>';
                if (window.refreshPosts) await window.refreshPosts();
                setTimeout(closeCreateModal, 1500);
            } catch (err) { if (createStatus) createStatus.innerHTML = `<span style="color:#ff8888;">❌ Ошибка: ${err.message}</span>`; }
        });
    }

    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentEditIssueNumber) return;
            const title = document.getElementById('editPostTitle')?.value.trim();
            const body = document.getElementById('editPostBody')?.value.trim();
            const labelsInput = document.getElementById('editPostLabels')?.value.trim();
            let labelsArray = labelsInput ? labelsInput.split(',').map(l => l.trim()).filter(l => l) : [];
            if (!title || !body) { if (editStatus) editStatus.innerHTML = '<span style="color:#ff8888;">❌ Заполните заголовок и текст</span>'; return; }
            if (editStatus) editStatus.innerHTML = '<span>⏳ Сохранение...</span>';
            try {
                await updateIssue(currentEditIssueNumber, title, body, labelsArray);
                if (editStatus) editStatus.innerHTML = '<span style="color:#88ff88;">✅ Пост обновлён! Обновление...</span>';
                if (window.refreshPosts) await window.refreshPosts();
                setTimeout(closeEditModal, 1500);
            } catch (err) { if (editStatus) editStatus.innerHTML = `<span style="color:#ff8888;">❌ Ошибка: ${err.message}</span>`; }
        });
    }

    window.openEditPostModal = openEditModal;

    // ---------- Навешивание событий ----------
    if (openCreateBtn) openCreateBtn.addEventListener('click', openCreateModal);
    if (closeCreateBtn) closeCreateBtn.addEventListener('click', closeCreateModal);
    if (closeEditBtn) closeEditBtn.addEventListener('click', closeEditModal);
    window.addEventListener('click', (e) => { if (e.target === createModal) closeCreateModal(); if (e.target === editModal) closeEditModal(); });

    // Инициализация тулбаров
    document.addEventListener('DOMContentLoaded', () => {
        setupToolbar('postBody', 'createToolbar');
        setupToolbar('editPostBody', 'editToolbar');
    });

    if (window.GitHubAuth) {
        updateCreatePostButtonVisibility();
        const originalRegister = window.GitHubAuth.register;
        if (originalRegister) window.GitHubAuth.register = async function(...args) { const result = await originalRegister.apply(this, args); updateCreatePostButtonVisibility(); return result; };
        const originalLogout = window.GitHubAuth.logout;
        if (originalLogout) window.GitHubAuth.logout = function(...args) { const result = originalLogout.apply(this, args); updateCreatePostButtonVisibility(); return result; };
        setInterval(updateCreatePostButtonVisibility, 5000);
    }
})();