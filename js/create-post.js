// js/create-post.js
// Полностью переработанный файл с встроенным WYSIWYG-редактором таблиц

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

    // ---------- Вспомогательные функции для работы с Markdown-таблицами ----------
    function parseMarkdownTable(md) {
        // Парсит простую Markdown-таблицу в объект { headers: string[], rows: string[][] }
        const lines = md.trim().split('\n');
        if (lines.length < 2) return null;
        const headerLine = lines[0];
        const separatorLine = lines[1];
        if (!separatorLine.includes('|') || !separatorLine.includes('---')) return null;
        const headers = headerLine.split('|').slice(1, -1).map(h => h.trim());
        const rows = [];
        for (let i = 2; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const cells = line.split('|').slice(1, -1).map(c => c.trim());
            if (cells.length === headers.length) rows.push(cells);
        }
        return { headers, rows };
    }

    function tableToMarkdown(headers, rows, alignments = null) {
        // alignments: массив строк 'left'/'center'/'right' или null
        let md = '| ' + headers.join(' | ') + ' |\n|';
        for (let i = 0; i < headers.length; i++) {
            let align = (alignments && alignments[i]) ? alignments[i] : 'left';
            let sep = '---';
            if (align === 'center') sep = ':---:';
            else if (align === 'right') sep = '---:';
            md += sep + '|';
        }
        md += '\n';
        for (const row of rows) {
            md += '| ' + row.map(cell => cell.replace(/\|/g, '\\|')).join(' | ') + ' |\n';
        }
        return md;
    }

    // ---------- Создание встроенного редактора таблиц (заменяет textarea) ----------
    function createInlineTableEditor(textarea, containerId) {
        // containerId – ID контейнера, куда будет помещён редактор (временно)
        const container = document.createElement('div');
        container.className = 'inline-table-editor';
        container.style.background = '#1e1e2a';
        container.style.border = '1px solid #c44eff';
        container.style.borderRadius = '8px';
        container.style.padding = '1rem';
        container.style.marginTop = '0.5rem';

        let headers = [];
        let rows = [];
        let alignments = []; // выравнивание для каждого столбца

        // Инициализация данных из textarea (пытаемся распарсить таблицу, иначе пустая)
        const currentText = textarea.value;
        const parsed = parseMarkdownTable(currentText);
        if (parsed) {
            headers = parsed.headers;
            rows = parsed.rows;
            alignments = headers.map(() => 'left');
        } else {
            headers = ['Столбец 1', 'Столбец 2', 'Столбец 3'];
            rows = [
                ['Ячейка 1:1', 'Ячейка 1:2', 'Ячейка 1:3'],
                ['Ячейка 2:1', 'Ячейка 2:2', 'Ячейка 2:3']
            ];
            alignments = ['left', 'left', 'left'];
        }

        function renderTable() {
            const tableDiv = container.querySelector('.table-render-area');
            if (!tableDiv) return;
            tableDiv.innerHTML = '';
            const table = document.createElement('table');
            table.className = 'visual-table-editor';
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';

            // Заголовки с редактируемыми инпутами и выравниванием
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            for (let i = 0; i < headers.length; i++) {
                const th = document.createElement('th');
                th.style.border = '1px solid #c44eff';
                th.style.padding = '0.5rem';
                th.style.backgroundColor = 'rgba(196,78,255,0.2)';
                th.style.position = 'relative';

                // Поле ввода названия
                const input = document.createElement('input');
                input.type = 'text';
                input.value = headers[i];
                input.style.width = '100%';
                input.style.backgroundColor = 'transparent';
                input.style.border = 'none';
                input.style.color = '#fff';
                input.style.textAlign = 'center';
                input.addEventListener('change', (function(idx) {
                    return function(e) { headers[idx] = e.target.value; };
                })(i));
                th.appendChild(input);

                // Выбор выравнивания
                const alignSelect = document.createElement('select');
                alignSelect.style.position = 'absolute';
                alignSelect.style.right = '4px';
                alignSelect.style.bottom = '2px';
                alignSelect.style.fontSize = '10px';
                alignSelect.style.background = '#2a2a3a';
                alignSelect.style.color = '#c44eff';
                alignSelect.style.border = 'none';
                alignSelect.style.borderRadius = '4px';
                alignSelect.innerHTML = `
                    <option value="left" ${alignments[i] === 'left' ? 'selected' : ''}>⬅️</option>
                    <option value="center" ${alignments[i] === 'center' ? 'selected' : ''}>⬌</option>
                    <option value="right" ${alignments[i] === 'right' ? 'selected' : ''}>➡️</option>
                `;
                alignSelect.addEventListener('change', (function(idx) {
                    return function(e) { alignments[idx] = e.target.value; };
                })(i));
                th.appendChild(alignSelect);

                // Кнопка сортировки по столбцу
                const sortUp = document.createElement('button');
                sortUp.textContent = '▲';
                sortUp.title = 'Сортировать по возрастанию';
                sortUp.style.position = 'absolute';
                sortUp.style.left = '4px';
                sortUp.style.top = '2px';
                sortUp.style.fontSize = '10px';
                sortUp.style.background = 'rgba(0,0,0,0.5)';
                sortUp.style.border = 'none';
                sortUp.style.color = '#c44eff';
                sortUp.style.cursor = 'pointer';
                sortUp.style.borderRadius = '4px';
                sortUp.addEventListener('click', (function(idx) {
                    return function() { sortRows(idx, 'asc'); };
                })(i));
                th.appendChild(sortUp);

                const sortDown = document.createElement('button');
                sortDown.textContent = '▼';
                sortDown.title = 'Сортировать по убыванию';
                sortDown.style.position = 'absolute';
                sortDown.style.left = '4px';
                sortDown.style.bottom = '2px';
                sortDown.style.fontSize = '10px';
                sortDown.style.background = 'rgba(0,0,0,0.5)';
                sortDown.style.border = 'none';
                sortDown.style.color = '#c44eff';
                sortDown.style.cursor = 'pointer';
                sortDown.style.borderRadius = '4px';
                sortDown.addEventListener('click', (function(idx) {
                    return function() { sortRows(idx, 'desc'); };
                })(i));
                th.appendChild(sortDown);

                // Кнопка удаления столбца
                const delCol = document.createElement('button');
                delCol.textContent = '✖';
                delCol.title = 'Удалить столбец';
                delCol.style.position = 'absolute';
                delCol.style.right = '2px';
                delCol.style.top = '2px';
                delCol.style.fontSize = '10px';
                delCol.style.background = 'rgba(200,0,0,0.6)';
                delCol.style.border = 'none';
                delCol.style.borderRadius = '10px';
                delCol.style.cursor = 'pointer';
                delCol.addEventListener('click', (function(idx) {
                    return function() {
                        if (headers.length <= 1) return;
                        headers.splice(idx, 1);
                        alignments.splice(idx, 1);
                        for (let r = 0; r < rows.length; r++) rows[r].splice(idx, 1);
                        renderTable();
                    };
                })(i));
                th.appendChild(delCol);

                headerRow.appendChild(th);
            }
            thead.appendChild(headerRow);
            table.appendChild(thead);

            // Тело таблицы
            const tbody = document.createElement('tbody');
            for (let r = 0; r < rows.length; r++) {
                const tr = document.createElement('tr');
                for (let c = 0; c < headers.length; c++) {
                    const td = document.createElement('td');
                    td.contentEditable = 'true';
                    td.textContent = rows[r][c];
                    td.style.border = '1px solid #c44eff';
                    td.style.padding = '0.5rem';
                    td.style.backgroundColor = '#0f0f17';
                    td.style.color = '#fff';
                    td.style.textAlign = alignments[c] === 'left' ? 'left' : (alignments[c] === 'center' ? 'center' : 'right');
                    td.addEventListener('input', (function(row, col) {
                        return function(e) { rows[row][col] = e.target.textContent; };
                    })(r, c));
                    tr.appendChild(td);
                }
                // Кнопка удаления строки
                const tdDel = document.createElement('td');
                tdDel.style.border = '1px solid #c44eff';
                tdDel.style.textAlign = 'center';
                tdDel.style.verticalAlign = 'middle';
                const delRowBtn = document.createElement('button');
                delRowBtn.textContent = '✖';
                delRowBtn.style.background = 'rgba(200,0,0,0.6)';
                delRowBtn.style.border = 'none';
                delRowBtn.style.borderRadius = '12px';
                delRowBtn.style.cursor = 'pointer';
                delRowBtn.style.padding = '2px 6px';
                delRowBtn.addEventListener('click', (function(rowIdx) {
                    return function() {
                        if (rows.length <= 1) return;
                        rows.splice(rowIdx, 1);
                        renderTable();
                    };
                })(r));
                tdDel.appendChild(delRowBtn);
                tr.appendChild(tdDel);
                tbody.appendChild(tr);
            }
            table.appendChild(tbody);
            tableDiv.appendChild(table);
        }

        function sortRows(colIndex, order) {
            const allNumeric = rows.every(row => {
                const val = row[colIndex];
                return val !== '' && !isNaN(parseFloat(val)) && isFinite(val);
            });
            rows.sort((a, b) => {
                let aVal = a[colIndex];
                let bVal = b[colIndex];
                if (allNumeric) {
                    aVal = parseFloat(aVal) || 0;
                    bVal = parseFloat(bVal) || 0;
                } else {
                    aVal = String(aVal).toLowerCase();
                    bVal = String(bVal).toLowerCase();
                }
                if (order === 'asc') return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
                else return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
            });
            renderTable();
        }

        function sortColumnsByRow(rowIndex, order) {
            if (rowIndex >= rows.length) return;
            const colIndices = Array.from({ length: headers.length }, (_, i) => i);
            const allNumeric = colIndices.every(c => {
                const val = rows[rowIndex][c];
                return val !== '' && !isNaN(parseFloat(val)) && isFinite(val);
            });
            colIndices.sort((a, b) => {
                let aVal = rows[rowIndex][a];
                let bVal = rows[rowIndex][b];
                if (allNumeric) {
                    aVal = parseFloat(aVal) || 0;
                    bVal = parseFloat(bVal) || 0;
                } else {
                    aVal = String(aVal).toLowerCase();
                    bVal = String(bVal).toLowerCase();
                }
                if (order === 'asc') return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
                else return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
            });
            const newHeaders = colIndices.map(i => headers[i]);
            const newAlignments = colIndices.map(i => alignments[i]);
            const newRows = rows.map(row => colIndices.map(i => row[i]));
            headers = newHeaders;
            alignments = newAlignments;
            rows = newRows;
            renderTable();
        }

        function importFromCSV(csvText) {
            const lines = csvText.trim().split(/\r?\n/);
            if (lines.length === 0) return;
            const newHeaders = lines[0].split(',').map(s => s.trim());
            const newRows = [];
            for (let i = 1; i < lines.length; i++) {
                const cells = lines[i].split(',').map(s => s.trim());
                if (cells.length === newHeaders.length) newRows.push(cells);
                else if (cells.length > newHeaders.length) newRows.push(cells.slice(0, newHeaders.length));
                else {
                    const padded = [...cells];
                    while (padded.length < newHeaders.length) padded.push('');
                    newRows.push(padded);
                }
            }
            headers = newHeaders;
            rows = newRows;
            alignments = headers.map(() => 'left');
            renderTable();
        }

        function exportToCSV() {
            const csvRows = [headers.join(',')];
            for (const row of rows) csvRows.push(row.join(','));
            const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'table.csv';
            a.click();
            URL.revokeObjectURL(url);
        }

        // Панель инструментов
        const toolbar = document.createElement('div');
        toolbar.className = 'table-editor-toolbar';
        toolbar.style.display = 'flex';
        toolbar.style.flexWrap = 'wrap';
        toolbar.style.gap = '0.5rem';
        toolbar.style.marginBottom = '1rem';
        toolbar.style.justifyContent = 'center';
        toolbar.innerHTML = `
            <button type="button" class="game-btn" id="addRowInline">➕ Добавить строку</button>
            <button type="button" class="game-btn" id="addColInline">➕ Добавить столбец</button>
            <button type="button" class="game-btn" id="clearTableInline">🗑 Очистить</button>
            <button type="button" class="game-btn" id="sortColsByRowInline">↕️ Сортировать столбцы по 1-й строке</button>
            <button type="button" class="game-btn" id="importCSVInline">📂 Импорт CSV</button>
            <button type="button" class="game-btn" id="exportCSVInline">💾 Экспорт CSV</button>
            <button type="button" class="game-btn" id="applyTableInline">✅ Применить</button>
            <button type="button" class="back-btn" id="cancelTableInline">Отмена</button>
        `;
        container.appendChild(toolbar);

        const tableArea = document.createElement('div');
        tableArea.className = 'table-render-area';
        tableArea.style.overflowX = 'auto';
        container.appendChild(tableArea);

        renderTable();

        // Обработчики
        toolbar.querySelector('#addRowInline').addEventListener('click', () => {
            rows.push(Array(headers.length).fill(''));
            renderTable();
        });
        toolbar.querySelector('#addColInline').addEventListener('click', () => {
            headers.push(`Столбец ${headers.length+1}`);
            alignments.push('left');
            for (let r = 0; r < rows.length; r++) rows[r].push('');
            renderTable();
        });
        toolbar.querySelector('#clearTableInline').addEventListener('click', () => {
            for (let r = 0; r < rows.length; r++) {
                for (let c = 0; c < headers.length; c++) rows[r][c] = '';
            }
            renderTable();
        });
        toolbar.querySelector('#sortColsByRowInline').addEventListener('click', () => {
            if (rows.length === 0) { alert('Нет данных'); return; }
            const order = confirm('Сортировать столбцы по возрастанию? (OK - да, Отмена - убывание)') ? 'asc' : 'desc';
            sortColumnsByRow(0, order);
        });
        toolbar.querySelector('#importCSVInline').addEventListener('click', () => {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.csv';
            fileInput.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    importFromCSV(ev.target.result);
                };
                reader.readAsText(file, 'UTF-8');
            };
            fileInput.click();
        });
        toolbar.querySelector('#exportCSVInline').addEventListener('click', exportToCSV);
        toolbar.querySelector('#applyTableInline').addEventListener('click', () => {
            const markdown = tableToMarkdown(headers, rows, alignments);
            textarea.value = markdown;
            // Скрыть редактор, показать textarea
            container.style.display = 'none';
            textarea.style.display = 'block';
            // Удаляем контейнер редактора из DOM
            container.remove();
        });
        toolbar.querySelector('#cancelTableInline').addEventListener('click', () => {
            container.style.display = 'none';
            textarea.style.display = 'block';
            container.remove();
        });

        return container;
    }

    // Встраиваем кнопку вызова редактора рядом с textarea
    function attachTableEditorToTextarea(textareaId) {
        const textarea = document.getElementById(textareaId);
        if (!textarea) return;
        // Создаём контейнер для кнопки (если ещё нет)
        const wrapperDiv = document.createElement('div');
        wrapperDiv.style.marginBottom = '0.5rem';
        textarea.parentNode.insertBefore(wrapperDiv, textarea);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'game-btn';
        btn.textContent = '📊 Визуальный редактор таблиц';
        btn.style.width = 'auto';
        btn.style.marginRight = '0.5rem';
        btn.addEventListener('click', () => {
            // Скрываем textarea, создаём редактор
            textarea.style.display = 'none';
            const editorContainer = createInlineTableEditor(textarea, `editor-${textareaId}`);
            textarea.parentNode.insertBefore(editorContainer, textarea.nextSibling);
        });
        wrapperDiv.appendChild(btn);
        // Добавляем кнопку очистки форматирования для удобства
        const clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.className = 'back-btn';
        clearBtn.textContent = '🗑 Очистить поле';
        clearBtn.style.marginLeft = '0.5rem';
        clearBtn.addEventListener('click', () => {
            if (confirm('Очистить весь текст поста?')) textarea.value = '';
        });
        wrapperDiv.appendChild(clearBtn);
    }

    // ---------- Панель инструментов для Markdown (оставляем как есть) ----------
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
            // Кнопка таблицы теперь вызывает не модальное окно, а просто фокусирует внимание на кнопке визуального редактора
            table: () => {
                const visualBtn = textarea.parentNode.querySelector('.game-btn');
                if (visualBtn && visualBtn.textContent.includes('Визуальный')) visualBtn.click();
                else alert('Нажмите кнопку "Визуальный редактор таблиц" под полем');
            }
        };

        toolbar.querySelectorAll('[data-cmd]').forEach(btn => {
            btn.addEventListener('click', () => { const cmd = btn.dataset.cmd; if (commands[cmd]) commands[cmd](); });
        });
    }

    // ---------- Показать/скрыть кнопку создания поста (GitHub Auth) ----------
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

    // ---------- API GitHub ----------
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

    // ---------- Инициализация ----------
    document.addEventListener('DOMContentLoaded', () => {
        setupToolbar('postBody', 'createToolbar');
        setupToolbar('editPostBody', 'editToolbar');
        attachTableEditorToTextarea('postBody');
        attachTableEditorToTextarea('editPostBody');
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