// js/create-post.js

(function() {
    // Элементы для создания поста
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

    function updateCreatePostButtonVisibility() {
        if (!wrapper) return;
        if (window.GitHubAuth && window.GitHubAuth.isAuthenticated && window.GitHubAuth.token) {
            wrapper.style.display = 'block';
        } else {
            wrapper.style.display = 'none';
        }
    }

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

    // Обработчик создания
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

    // Обработчик редактирования
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

    // Глобальная функция для открытия модалки редактирования
    window.openEditPostModal = openEditModal;

    // Навешиваем обработчики открытия/закрытия, если элементы существуют
    if (openCreateBtn) openCreateBtn.addEventListener('click', openCreateModal);
    if (closeCreateBtn) closeCreateBtn.addEventListener('click', closeCreateModal);
    if (closeEditBtn) closeEditBtn.addEventListener('click', closeEditModal);
    window.addEventListener('click', (e) => {
        if (e.target === createModal) closeCreateModal();
        if (e.target === editModal) closeEditModal();
    });

    // Отслеживание авторизации
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