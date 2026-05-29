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

    // ---------- Визуальный редактор таблиц с сортировкой и редактируемыми заголовками ----------
    function openTableEditor(textareaId) {
        const textarea = document.getElementById(textareaId);
        if (!textarea) return;

        let rows = 3, cols = 3;
        // Заголовки столбцов (массив строк)
        let colHeaders = Array(cols).fill().map((_, i) => `Столбец ${i+1}`);
        // Данные таблицы: rows x cols
        let tableData = Array(rows).fill().map(() => Array(cols).fill(''));

        // Функция перестроения таблицы
        function rebuildTable(container) {
            container.innerHTML = '';
            const table = document.createElement('table');
            table.className = 'visual-table-editor';

            // Заголовок с редактируемыми ячейками
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            for (let c = 0; c < cols; c++) {
                const th = document.createElement('th');
                th.style.position = 'relative';
                th.style.minWidth = '80px';
                th.style.padding = '0.5rem';
                th.style.backgroundColor = 'rgba(196,78,255,0.2)';

                // Редактируемый текст заголовка
                const headerInput = document.createElement('input');
                headerInput.type = 'text';
                headerInput.value = colHeaders[c];
                headerInput.style.width = '100%';
                headerInput.style.backgroundColor = 'rgba(0,0,0,0.5)';
                headerInput.style.border = '1px solid #c44eff';
                headerInput.style.color = '#fff';
                headerInput.style.borderRadius = '4px';
                headerInput.style.padding = '0.2rem';
                headerInput.style.textAlign = 'center';
                headerInput.addEventListener('change', (e) => {
                    colHeaders[c] = e.target.value;
                });
                th.appendChild(headerInput);

                // Кнопка сортировки по этому столбцу (возрастание/убывание)
                const sortGroup = document.createElement('div');
                sortGroup.style.position = 'absolute';
                sortGroup.style.right = '4px';
                sortGroup.style.bottom = '2px';
                sortGroup.style.display = 'flex';
                sortGroup.style.gap = '2px';

                const sortAscBtn = document.createElement('button');
                sortAscBtn.textContent = '▲';
                sortAscBtn.title = 'Сортировать по возрастанию';
                sortAscBtn.style.background = 'rgba(0,0,0,0.5)';
                sortAscBtn.style.border = 'none';
                sortAscBtn.style.color = '#c44eff';
                sortAscBtn.style.cursor = 'pointer';
                sortAscBtn.style.fontSize = '10px';
                sortAscBtn.style.borderRadius = '4px';
                sortAscBtn.style.padding = '0 4px';
                sortAscBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    sortRowsByColumn(c, 'asc');
                    rebuildTable(container);
                });

                const sortDescBtn = document.createElement('button');
                sortDescBtn.textContent = '▼';
                sortDescBtn.title = 'Сортировать по убыванию';
                sortDescBtn.style.background = 'rgba(0,0,0,0.5)';
                sortDescBtn.style.border = 'none';
                sortDescBtn.style.color = '#c44eff';
                sortDescBtn.style.cursor = 'pointer';
                sortDescBtn.style.fontSize = '10px';
                sortDescBtn.style.borderRadius = '4px';
                sortDescBtn.style.padding = '0 4px';
                sortDescBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    sortRowsByColumn(c, 'desc');
                    rebuildTable(container);
                });

                sortGroup.appendChild(sortAscBtn);
                sortGroup.appendChild(sortDescBtn);
                th.appendChild(sortGroup);

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
                    colHeaders.splice(c, 1);
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

        // Сортировка строк по столбцу
        function sortRowsByColumn(colIndex, order) {
            const sortedData = [...tableData];
            const allNumeric = sortedData.every(row => {
                const val = row[colIndex];
                return val !== '' && !isNaN(parseFloat(val)) && isFinite(val);
            });
            sortedData.sort((a, b) => {
                let aVal = a[colIndex];
                let bVal = b[colIndex];
                if (allNumeric) {
                    aVal = parseFloat(aVal) || 0;
                    bVal = parseFloat(bVal) || 0;
                } else {
                    aVal = String(aVal).toLowerCase();
                    bVal = String(bVal).toLowerCase();
                }
                if (order === 'asc') {
                    return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
                } else {
                    return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
                }
            });
            tableData = sortedData;
        }

        // Сортировка столбцов по горизонтали (по указанной строке)
        function sortColumnsByRow(rowIndex, order) {
            if (rowIndex >= rows) return;
            const colPairs = [];
            for (let c = 0; c < cols; c++) {
                let val = tableData[rowIndex][c];
                let numeric = (val !== '' && !isNaN(parseFloat(val)) && isFinite(val));
                let sortVal = numeric ? parseFloat(val) : String(val).toLowerCase();
                colPairs.push({ originalIndex: c, sortValue: sortVal, numeric: numeric });
            }
            colPairs.sort((a, b) => {
                if (order === 'asc') {
                    return a.sortValue > b.sortValue ? 1 : a.sortValue < b.sortValue ? -1 : 0;
                } else {
                    return a.sortValue < b.sortValue ? 1 : a.sortValue > b.sortValue ? -1 : 0;
                }
            });
            const newData = Array(rows).fill().map(() => Array(cols).fill(''));
            const newHeaders = Array(cols);
            for (let newIdx = 0; newIdx < colPairs.length; newIdx++) {
                const oldIdx = colPairs[newIdx].originalIndex;
                newHeaders[newIdx] = colHeaders[oldIdx];
                for (let r = 0; r < rows; r++) {
                    newData[r][newIdx] = tableData[r][oldIdx];
                }
            }
            tableData = newData;
            colHeaders = newHeaders;
        }

        // Создание модального окна
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
                <button type="button" id="sortColsByRow0Btn" class="game-btn" style="width:auto;">↕️ Сортировать столбцы по 1-й строке</button>
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

        // Обработчики
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
            colHeaders.push(`Столбец ${cols}`);
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
        modalContent.querySelector('#sortColsByRow0Btn').addEventListener('click', () => {
            if (rows > 0) {
                const order = confirm('Сортировать столбцы по возрастанию? (OK - возрастание, Отмена - убывание)') ? 'asc' : 'desc';
                sortColumnsByRow(0, order);
                refreshUI();
            } else {
                alert('Нет строк для сортировки');
            }
        });
        modalContent.querySelector('#insertTableBtn').addEventListener('click', () => {
            let md = '';
            for (let c = 0; c < cols; c++) {
                let headerText = colHeaders[c] || `Столбец ${c+1}`;
                headerText = headerText.replace(/\|/g, '\\|');
                md += `| ${headerText} `;
            }
            md += '|\n|' + Array(cols).fill('---').join('|') + '|\n';
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    let cellText = tableData[r][c] || '';
                    cellText = cellText.replace(/\|/g, '\\|');
                    md += `| ${cellText} `;
                }
                md += '|\n';
            }
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const currentText = textarea.value;
            textarea.value = currentText.substring(0, start) + '\n\n' + md + '\n\n' + currentText.substring(end);
            textarea.focus();
            textarea.selectionStart = start + md.length + 4;
            textarea.selectionEnd = start + md.length + 4;
            modal.remove();
        });
        modalContent.querySelector('#cancelTableBtn').addEventListener('click', () => {
            modal.remove();
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    // ---------- Панель инструментов Markdown ----------
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
            table: () => openTableEditor(textareaId)
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

    // ---------- API ----------
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

    // ---------- События ----------
    if (openCreateBtn) openCreateBtn.addEventListener('click', openCreateModal);
    if (closeCreateBtn) closeCreateBtn.addEventListener('click', closeCreateModal);
    if (closeEditBtn) closeEditBtn.addEventListener('click', closeEditModal);
    window.addEventListener('click', (e) => { if (e.target === createModal) closeCreateModal(); if (e.target === editModal) closeEditModal(); });

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