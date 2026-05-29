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
    let currentEditMode = false;

    // ---------- Редактор таблиц ----------
    class TableEditor {
        constructor(containerId, textareaId) {
            this.container = document.getElementById(containerId);
            this.textarea = document.getElementById(textareaId);
            if (!this.container || !this.textarea) return;
            this.tableData = [['Ячейка 1', 'Ячейка 2'], ['Ячейка 3', 'Ячейка 4']];
            this.init();
        }

        init() {
            this.renderTableUI();
            this.attachEvents();
        }

        renderTableUI() {
            this.container.innerHTML = `
                <div class="table-editor-toolbar">
                    <button type="button" class="table-btn-add-row">➕ Добавить строку</button>
                    <button type="button" class="table-btn-add-col">➕ Добавить столбец</button>
                    <button type="button" class="table-btn-remove-row">➖ Удалить строку</button>
                    <button type="button" class="table-btn-remove-col">➖ Удалить столбец</button>
                    <button type="button" class="table-btn-insert-markdown">📋 Вставить Markdown в текст</button>
                </div>
                <div class="table-editor-grid"></div>
            `;
            this.gridContainer = this.container.querySelector('.table-editor-grid');
            this.renderGrid();
        }

        renderGrid() {
            if (!this.gridContainer) return;
            this.gridContainer.innerHTML = '';
            const table = document.createElement('table');
            table.className = 'visual-table-editor';
            // Заголовки строк (нумерация)
            for (let i = 0; i <= this.tableData.length; i++) {
                const row = document.createElement('tr');
                for (let j = 0; j <= this.tableData[0].length; j++) {
                    if (i === 0 && j === 0) {
                        const th = document.createElement('th');
                        th.textContent = '';
                        row.appendChild(th);
                    } else if (i === 0) {
                        const th = document.createElement('th');
                        th.textContent = `Столбец ${j}`;
                        th.style.backgroundColor = '#2a2a3a';
                        row.appendChild(th);
                    } else if (j === 0) {
                        const th = document.createElement('th');
                        th.textContent = `Строка ${i}`;
                        th.style.backgroundColor = '#2a2a3a';
                        row.appendChild(th);
                    } else {
                        const td = document.createElement('td');
                        const input = document.createElement('input');
                        input.type = 'text';
                        input.value = this.tableData[i-1][j-1] || '';
                        input.addEventListener('change', (function(rowIdx, colIdx) {
                            return (e) => { this.tableData[rowIdx][colIdx] = e.target.value; this.updateMarkdownPreview(); };
                        })(i-1, j-1));
                        td.appendChild(input);
                        row.appendChild(td);
                    }
                }
                table.appendChild(row);
            }
            this.gridContainer.appendChild(table);
            this.updateMarkdownPreview();
        }

        updateMarkdownPreview() {
            let md = '';
            // Заголовок
            md += '| ' + this.tableData[0].map(cell => cell.replace(/\|/g, '\\|')).join(' | ') + ' |\n';
            md += '|' + this.tableData[0].map(() => '---').join('|') + '|\n';
            for (let i = 1; i < this.tableData.length; i++) {
                md += '| ' + this.tableData[i].map(cell => cell.replace(/\|/g, '\\|')).join(' | ') + ' |\n';
            }
            this.currentMarkdown = md;
            // Показываем preview в текстовом поле (можно опционально)
            if (this.textarea && !currentEditMode) {
                // Не перезаписываем весь текст, только вставляем или показываем
            }
        }

        insertMarkdownIntoTextarea() {
            if (!this.textarea) return;
            const start = this.textarea.selectionStart;
            const end = this.textarea.selectionEnd;
            const currentText = this.textarea.value;
            const tableMarkdown = '\n\n' + this.currentMarkdown + '\n\n';
            this.textarea.value = currentText.substring(0, start) + tableMarkdown + currentText.substring(end);
            this.textarea.focus();
            this.textarea.selectionStart = start + tableMarkdown.length;
            this.textarea.selectionEnd = start + tableMarkdown.length;
        }

        attachEvents() {
            const addRowBtn = this.container.querySelector('.table-btn-add-row');
            const addColBtn = this.container.querySelector('.table-btn-add-col');
            const removeRowBtn = this.container.querySelector('.table-btn-remove-row');
            const removeColBtn = this.container.querySelector('.table-btn-remove-col');
            const insertBtn = this.container.querySelector('.table-btn-insert-markdown');

            if (addRowBtn) addRowBtn.onclick = () => { this.tableData.push(new Array(this.tableData[0].length).fill('Новая ячейка')); this.renderGrid(); };
            if (addColBtn) addColBtn.onclick = () => { this.tableData.forEach(row => row.push('Новая ячейка')); this.renderGrid(); };
            if (removeRowBtn) removeRowBtn.onclick = () => { if (this.tableData.length > 1) { this.tableData.pop(); this.renderGrid(); } };
            if (removeColBtn) removeColBtn.onclick = () => { if (this.tableData[0].length > 1) { this.tableData.forEach(row => row.pop()); this.renderGrid(); } };
            if (insertBtn) insertBtn.onclick = () => this.insertMarkdownIntoTextarea();
        }
    }

    let tableEditorCreate = null, tableEditorEdit = null;

    // ---------- Инициализация табличных редакторов ----------
    function initTableEditors() {
        const createTableContainer = document.getElementById('createTableEditor');
        const editTableContainer = document.getElementById('editTableEditor');
        if (createTableContainer) tableEditorCreate = new TableEditor('createTableEditor', 'postBody');
        if (editTableContainer) tableEditorEdit = new TableEditor('editTableEditor', 'editPostBody');
    }

    // ---------- Панель инструментов для Markdown (обычная) ----------
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
            table: () => {
                if (tableEditorCreate && textarea.id === 'postBody') tableEditorCreate.insertMarkdownIntoTextarea();
                else if (tableEditorEdit && textarea.id === 'editPostBody') tableEditorEdit.insertMarkdownIntoTextarea();
                else insertText('\n\n| Заголовок 1 | Заголовок 2 |\n|-------------|-------------|\n| Ячейка 1    | Ячейка 2    |\n| Ячейка 3    | Ячейка 4    |\n\n', '', '');
            }
        };
        toolbar.querySelectorAll('[data-cmd]').forEach(btn => {
            btn.addEventListener('click', () => { const cmd = btn.dataset.cmd; if (commands[cmd]) commands[cmd](); });
        });
    }

    // ---------- Отображение/скрытие кнопки создания ----------
    function updateCreatePostButtonVisibility() {
        if (!wrapper) return;
        if (window.GitHubAuth && window.GitHubAuth.isAuthenticated && window.GitHubAuth.token) wrapper.style.display = 'block';
        else wrapper.style.display = 'none';
    }

    // ---------- Модалки ----------
    function openCreateModal() {
        if (createModal) {
            createModal.style.display = 'flex';
            if (createStatus) createStatus.innerHTML = '';
            if (createForm) createForm.reset();
            if (tableEditorCreate) tableEditorCreate.tableData = [['Ячейка 1', 'Ячейка 2'], ['Ячейка 3', 'Ячейка 4']];
            if (tableEditorCreate) tableEditorCreate.renderGrid();
            currentEditMode = false;
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
        currentEditMode = true;
        // Попробуем распарсить таблицы из body (просто для инициализации редактора, но можно оставить как есть)
        if (tableEditorEdit) {
            // Можно попробовать извлечь первую таблицу из markdown (упрощённо)
            const tableMatch = body.match(/(\|[^\n]+\|\n\|[-:| ]+\|\n(?:\|[^\n]+\|\n?)+)/);
            if (tableMatch) {
                // Парсинг в tableData – сложно, оставляем как демо, но пользователь может создать новую таблицу
            }
        }
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

    // ---------- Инициализация после загрузки DOM ----------
    document.addEventListener('DOMContentLoaded', () => {
        setupToolbar('postBody', 'createToolbar');
        setupToolbar('editPostBody', 'editToolbar');
        initTableEditors();
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