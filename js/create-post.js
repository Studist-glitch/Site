// js/create-post.js

(function() {
    const modal = document.getElementById('createPostModal');
    const editModal = document.getElementById('editPostModal');
    const openBtn = document.getElementById('openCreatePostModal');
    const closeCreateBtn = document.getElementById('closeCreatePostModal');
    const closeEditBtn = document.getElementById('closeEditPostModal');
    const createForm = document.getElementById('createPostForm');
    const editForm = document.getElementById('editPostForm');
    const statusDiv = document.getElementById('postCreationStatus');
    const editStatusDiv = document.getElementById('editPostStatus');
    const wrapper = document.getElementById('createPostBtnWrapper');
    
    let currentEditIssueNumber = null;

    function updateCreatePostButtonVisibility() {
        if (window.GitHubAuth && window.GitHubAuth.isAuthenticated && window.GitHubAuth.token) {
            wrapper.style.display = 'block';
        } else {
            wrapper.style.display = 'none';
        }
    }

    function openCreateModal() {
        if (!modal) return;
        modal.style.display = 'flex';
        if (statusDiv) statusDiv.innerHTML = '';
        if (createForm) createForm.reset();
    }

    function closeCreateModal() {
        if (modal) modal.style.display = 'none';
    }

    function openEditModal(issueNumber, title, body, labels) {
        if (!editModal) return;
        currentEditIssueNumber = issueNumber;
        document.getElementById('editPostTitle').value = title;
        document.getElementById('editPostBody').value = body;
        document.getElementById('editPostLabels').value = labels;
        if (editStatusDiv) editStatusDiv.innerHTML = '';
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

    createForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('postTitle').value.trim();
        const body = document.getElementById('postBody').value.trim();
        const labelsInput = document.getElementById('postLabels').value.trim();
        let labelsArray = labelsInput ? labelsInput.split(',').map(l => l.trim()).filter(l => l) : [];
        if (!title || !body) {
            statusDiv.innerHTML = '<span style="color:#ff8888;">❌ Заполните заголовок и текст</span>';
            return;
        }
        statusDiv.innerHTML = '<span>⏳ Публикация...</span>';
        try {
            await createIssue(title, body, labelsArray);
            statusDiv.innerHTML = '<span style="color:#88ff88;">✅ Пост опубликован! Обновление...</span>';
            if (window.refreshPosts) await window.refreshPosts();
            setTimeout(closeCreateModal, 1500);
        } catch (err) {
            statusDiv.innerHTML = `<span style="color:#ff8888;">❌ Ошибка: ${err.message}</span>`;
        }
    });

    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentEditIssueNumber) return;
        const title = document.getElementById('editPostTitle').value.trim();
        const body = document.getElementById('editPostBody').value.trim();
        const labelsInput = document.getElementById('editPostLabels').value.trim();
        let labelsArray = labelsInput ? labelsInput.split(',').map(l => l.trim()).filter(l => l) : [];
        if (!title || !body) {
            editStatusDiv.innerHTML = '<span style="color:#ff8888;">❌ Заполните заголовок и текст</span>';
            return;
        }
        editStatusDiv.innerHTML = '<span>⏳ Сохранение...</span>';
        try {
            await updateIssue(currentEditIssueNumber, title, body, labelsArray);
            editStatusDiv.innerHTML = '<span style="color:#88ff88;">✅ Пост обновлён! Обновление...</span>';
            if (window.refreshPosts) await window.refreshPosts();
            setTimeout(closeEditModal, 1500);
        } catch (err) {
            editStatusDiv.innerHTML = `<span style="color:#ff8888;">❌ Ошибка: ${err.message}</span>`;
        }
    });

    // Глобальный вызов для открытия модалки редактирования
    window.openEditPostModal = openEditModal;

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

    if (openBtn) openBtn.addEventListener('click', openCreateModal);
    if (closeCreateBtn) closeCreateBtn.addEventListener('click', closeCreateModal);
    if (closeEditBtn) closeEditBtn.addEventListener('click', closeEditModal);
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeCreateModal();
        if (e.target === editModal) closeEditModal();
    });
})();