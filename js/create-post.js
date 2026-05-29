// js/create-post.js

(function() {
    const modal = document.getElementById('createPostModal');
    const openBtn = document.getElementById('openCreatePostModal');
    const closeBtn = document.getElementById('closeCreatePostModal');
    const form = document.getElementById('createPostForm');
    const statusDiv = document.getElementById('postCreationStatus');
    const wrapper = document.getElementById('createPostBtnWrapper');

    // Показываем кнопку только если пользователь авторизован (есть токен)
    function updateCreatePostButtonVisibility() {
        if (window.GitHubAuth && window.GitHubAuth.isAuthenticated && window.GitHubAuth.token) {
            wrapper.style.display = 'block';
        } else {
            wrapper.style.display = 'none';
        }
    }

    // Открыть / закрыть модалку
    function openModal() {
        modal.style.display = 'flex';
        statusDiv.innerHTML = '';
        form.reset();
    }
    function closeModal() {
        modal.style.display = 'none';
    }

    // Создание Issue через GitHub API
    async function createIssue(title, body, labelsArray) {
        const token = window.GitHubAuth.token;
        if (!token) throw new Error('Не авторизован');

        const url = `https://api.github.com/repos/Studist-glitch/Site/issues`;
        const payload = {
            title: title,
            body: body,
            labels: labelsArray
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.message || 'Ошибка создания Issue');
        }
        return await response.json();
    }

    // Обработчик отправки формы
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('postTitle').value.trim();
        const body = document.getElementById('postBody').value.trim();
        const labelsInput = document.getElementById('postLabels').value.trim();
        let labelsArray = [];
        if (labelsInput) {
            labelsArray = labelsInput.split(',').map(l => l.trim()).filter(l => l);
        }
        if (!title || !body) {
            statusDiv.innerHTML = '<span style="color:#ff8888;">Заполните заголовок и текст</span>';
            return;
        }

        statusDiv.innerHTML = '<span>Публикация...</span>';
        try {
            const result = await createIssue(title, body, labelsArray);
            statusDiv.innerHTML = `<span style="color:#88ff88;">✅ Пост опубликован! <a href="${result.html_url}" target="_blank">Открыть на GitHub</a></span>`;
            // Обновляем ленту постов через 2 секунды
            setTimeout(() => {
                if (window.fetchPosts) window.fetchPosts();
                closeModal();
            }, 2000);
        } catch (err) {
            console.error(err);
            statusDiv.innerHTML = `<span style="color:#ff8888;">Ошибка: ${err.message}</span>`;
        }
    });

    // Инициализация: следим за авторизацией
    if (window.GitHubAuth) {
        // Первоначальная проверка
        updateCreatePostButtonVisibility();
        // Подписываемся на изменение статуса (например, после логина)
        const originalRegister = window.GitHubAuth.register;
        if (originalRegister) {
            window.GitHubAuth.register = async function(...args) {
                const result = await originalRegister.apply(this, args);
                updateCreatePostButtonVisibility();
                return result;
            };
        }
        // Также при логауте
        const originalLogout = window.GitHubAuth.logout;
        if (originalLogout) {
            window.GitHubAuth.logout = function(...args) {
                const result = originalLogout.apply(this, args);
                updateCreatePostButtonVisibility();
                return result;
            };
        }
    }

    openBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
})();