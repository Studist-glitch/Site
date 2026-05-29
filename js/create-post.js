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

    // Открыть модалку (не трогает ленту постов)
    function openModal() {
        if (!modal) return;
        modal.style.display = 'flex';
        statusDiv.innerHTML = '';
        form.reset();
        // Не перезагружаем посты, не очищаем контейнер
    }

    function closeModal() {
        if (!modal) return;
        modal.style.display = 'none';
        statusDiv.innerHTML = '';
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
            statusDiv.innerHTML = '<span style="color:#ff8888;">❌ Заполните заголовок и текст</span>';
            return;
        }

        statusDiv.innerHTML = '<span>⏳ Публикация...</span>';
        try {
            const result = await createIssue(title, body, labelsArray);
            statusDiv.innerHTML = `<span style="color:#88ff88;">✅ Пост опубликован! <a href="${result.html_url}" target="_blank" style="color:#c44eff;">Открыть на GitHub</a></span>`;
            // Обновляем ленту постов без потери фильтров и страницы
            if (window.refreshPosts) {
                await window.refreshPosts();
            } else if (window.fetchPosts) {
                await window.fetchPosts();
            }
            // Закрываем модалку через 1.5 секунды
            setTimeout(() => {
                closeModal();
            }, 1500);
        } catch (err) {
            console.error(err);
            statusDiv.innerHTML = `<span style="color:#ff8888;">❌ Ошибка: ${err.message}</span>`;
        }
    });

    // Инициализация: следим за авторизацией
    if (window.GitHubAuth) {
        updateCreatePostButtonVisibility();
        // Перехватываем регистрацию и выход для обновления видимости кнопки
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
        // Также периодически проверяем (на всякий случай)
        setInterval(updateCreatePostButtonVisibility, 5000);
    }

    if (openBtn) openBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
})();