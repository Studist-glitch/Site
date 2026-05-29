// js/create-post.js

(function() {
    // Элементы
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

    // --- Панель инструментов для вставки markdown ---
    function setupToolbar(textareaId, toolbarId) {
        const textarea = document.getElementById(textareaId);
        if (!textarea) return;
        const toolbar = document.getElementById(toolbarId);
        if (!toolbar) return;

        const insertText = (before, after, defaultText = 'текст') => {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
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
            link: () => {
                const url = prompt('Введите URL:', 'https://');
                if (url) insertText('[', `](${url})`, 'текст ссылки');
            },
            table: () => {
                const tableMarkdown = `
| Заголовок 1 | Заголовок 2 |
|-------------|-------------|
| Ячейка 1    | Ячейка 2    |
| Ячейка 3    | Ячейка 4    |
`.trim();
                insertText('', '', tableMarkdown);
            }
        };

        toolbar.querySelectorAll('[data-cmd]').forEach(btn => {
            btn.addEventListener('click', () => {
                const cmd = btn.dataset.cmd;
                if (commands[cmd]) commands[cmd]();
            });
        });
    }

    // --- Инициализация тулбаров для создания и редактирования ---
    setupToolbar('postBody', 'createToolbar');
    setupToolbar('editPostBody', 'editToolbar');

    // --- Функции видимости кнопки создания ---
    function updateCreatePostButtonVisibility() {
        if (!wrapper) return;
        if (window.GitHubAuth && window.GitHubAuth.isAuthenticated && window.GitHubAuth.token) {
            wrapper.style.display = 'block';
        } else {
            wrapper.style.display = 'none';
        }
    }

    // --- Открытие/закрытие модалок ---
    function openCreateModal() {
        if (createModal) {
            createModal.style.display = 'flex';
            if (createStatus) createStatus.innerHTML = '';
            if (createForm) createForm.reset();
        }
    }

    function closeCreateModal() {
        if (createModal) createModal.style.display = 'none';
    }

    function openEditModal(issueNumber, title, body, labels) {
        if (!editModal) return;
        currentEditIssueNumber = issueNumber;
        const titleInput = document.getElementById('editPostTitle');
        const bodyInput = document.getElementById('editPostBody');
        const labelsInput = document.getElementById('editPostLabels');
        if (titleInput) titleInput.value = title;
        if (bodyInput) bodyInput.value = body;
        if (labelsInput) labelsInput.value = labels;
        if (editStatus) editStatus.innerHTML = '';
        editModal.style.display = 'flex';
    }

    function closeEditModal() {
        if (editModal) editModal.style.display = 'none';
        currentEditIssueNumber = null;
    }

    // --- API вызовы ---
    async function createIssue(title, body, labelsArray) {
        const token = window.GitHubAuth.token;
        if (!token) throw new Error('Не авторизован');
        const response = await fetch(`https://api.github.com/repos/Studist-glitch/Site/issues`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, body, labels: labelsArray })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Ошибка создания Issue');
        }
        return await response.json();
    }

    async function updateIssue(issueNumber, title, body, labelsArray) {
        const token = window.GitHubAuth.token;
        if (!token) throw new Error('Не авторизован');
        const response = await fetch(`https://api.github.com/repos/Studist-glitch/Site/issues/${issueNumber}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, body, labels: labelsArray })
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Ошибка обновления Issue');
        }
        return await response.json();
    }

    // --- Обработчики форм ---
    if (createForm) {
        createForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('postTitle')?.value.trim();
            const body = document.getElementById('postBody')?.value.trim();
            const labelsInput = document.getElementById('postLabels')?.value.trim();
            let labelsArray = labelsInput ? labelsInput.split(',').map(l => l.trim()).filter(l => l) : [];
            if (!title || !body) {
                if (createStatus) createStatus.innerHTML = '<span style="color:#ff8888;">❌ Заполните заголовок и текст</span>';
                return;
            }
            if (createStatus) createStatus.innerHTML = '<span>⏳ Публикация...</span>';
            try {
                await createIssue(title, body, labelsArray);
                if (createStatus) createStatus.innerHTML = '<span style="color:#88ff88;">✅ Пост опубликован! Обновление...</span>';
                if (window.refreshPosts) await window.refreshPosts();
                setTimeout(closeCreateModal, 1500);
            } catch (err) {
                if (createStatus) createStatus.innerHTML = `<span style="color:#ff8888;">❌ Ошибка: ${err.message}</span>`;
            }
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
            if (!title || !body) {
                if (editStatus) editStatus.innerHTML = '<span style="color:#ff8888;">❌ Заполните заголовок и текст</span>';
                return;
            }
            if (editStatus) editStatus.innerHTML = '<span>⏳ Сохранение...</span>';
            try {
                await updateIssue(currentEditIssueNumber, title, body, labelsArray);
                if (editStatus) editStatus.innerHTML = '<span style="color:#88ff88;">✅ Пост обновлён! Обновление...</span>';
                if (window.refreshPosts) await window.refreshPosts();
                setTimeout(closeEditModal, 1500);
            } catch (err) {
                if (editStatus) editStatus.innerHTML = `<span style="color:#ff8888;">❌ Ошибка: ${err.message}</span>`;
            }
        });
    }

    window.openEditPostModal = openEditModal;

    // --- Навешивание событий ---
    if (openCreateBtn) openCreateBtn.addEventListener('click', openCreateModal);
    if (closeCreateBtn) closeCreateBtn.addEventListener('click', closeCreateModal);
    if (closeEditBtn) closeEditBtn.addEventListener('click', closeEditModal);
    window.addEventListener('click', (e) => {
        if (e.target === createModal) closeCreateModal();
        if (e.target === editModal) closeEditModal();
    });

    // --- Авторизация ---
    if (window.GitHubAuth) {
        updateCreatePostButtonVisibility();
        const originalRegister = window.GitHubAuth.register;
        if (originalRegister) {
            window.GitHubAuth.register = async function(...args) {
                const result = await originalRegister.apply(this, args);
                updateCreatePostButtonVisibility();
                return result;
            };
        }
        const originalLogout = window.GitHubAuth.logout;
        if (originalLogout) {
            window.GitHubAuth.logout = function(...args) {
                const result = originalLogout.apply(this, args);
                updateCreatePostButtonVisibility();
                return result;
            };
        }
        setInterval(updateCreatePostButtonVisibility, 5000);
    }
})();