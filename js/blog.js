// js/blog.js

// --- Конфигурация ---
const REPO_OWNER = 'Studist-glitch';
const REPO_NAME = 'Site';
const POSTS_PER_PAGE = 5;

// Определяем ваши категории и соответствующие им метки (Labels) в GitHub Issues
// Убедитесь, что метки с такими именами созданы в вашем репозитории
const CATEGORY_LABELS = {
    'all': 'Все',
    'Новости': 'Новости',
    'Обновления': 'Обновления',
    'События': 'События',
    'DevLog': 'DevLog'
};

// --- DOM Элементы ---
const postsContainer = document.getElementById('posts-container');
const paginationContainer = document.getElementById('pagination-container');
const categoriesContainer = document.getElementById('categories-container');
let currentPosts = [];
let currentPage = 1;
let currentCategory = 'all';
let totalPages = 0;

/**
 * Получает список Issues из репозитория GitHub.
 */
async function fetchPosts() {
    showLoadingState();
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues?state=open&per_page=100&sort=created&direction=desc`;

    try {
        const response = await fetch(url, {
            headers: { 'Accept': 'application/vnd.github.v3+json' }
        });

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }

        const issues = await response.json();
        // Фильтруем: убираем Pull Requests (у них есть поле pull_request) и оставляем только с нашей кастомной меткой для постов
        // Для упрощения пока убираем фильтр по метке, чтобы показывать любые Issue.
        // Но вы можете добавить специальную метку, например "blog-post", и фильтровать по ней.
        const posts = issues.filter(issue => !issue.pull_request);
        currentPosts = posts;
        setupCategories(currentPosts);
        renderPostsForCurrentPage();
    } catch (error) {
        console.error("Error fetching posts:", error);
        postsContainer.innerHTML = `<p class="error-message">Не удалось загрузить новости. Пожалуйста, попробуйте позже.</p>`;
        paginationContainer.innerHTML = '';
    }
}

/**
 * Отображает индикатор загрузки.
 */
function showLoadingState() {
    postsContainer.innerHTML = '<div class="loading-spinner">Загрузка новостей...</div>';
    paginationContainer.innerHTML = '';
}

/**
 * Настраивает кнопки фильтрации категорий на основе загруженных постов.
 */
function setupCategories(posts) {
    const availableLabels = new Set();
    posts.forEach(post => {
        if (post.labels && post.labels.length > 0) {
            post.labels.forEach(label => {
                if (CATEGORY_LABELS[label.name]) {
                    availableLabels.add(label.name);
                }
            });
        }
    });

    let categoriesHtml = `<button class="category-btn ${currentCategory === 'all' ? 'active' : ''}" data-category="all">Все</button>`;
    availableLabels.forEach(label => {
        if (CATEGORY_LABELS[label]) {
            categoriesHtml += `<button class="category-btn ${currentCategory === label ? 'active' : ''}" data-category="${label}">${CATEGORY_LABELS[label]}</button>`;
        }
    });
    categoriesContainer.innerHTML = categoriesHtml;

    // Добавляем обработчики событий для кнопок категорий
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const category = e.target.dataset.category;
            if (category === currentCategory) return;
            currentCategory = category;
            currentPage = 1;
            renderPostsForCurrentPage();
            updateActiveCategoryButton(category);
        });
    });
}

/**
 * Обновляет активное состояние кнопок категорий.
 */
function updateActiveCategoryButton(activeCategory) {
    document.querySelectorAll('.category-btn').forEach(btn => {
        if (btn.dataset.category === activeCategory) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

/**
 * Отображает посты для текущей страницы и категории.
 */
function renderPostsForCurrentPage() {
    let filteredPosts = currentPosts;
    if (currentCategory !== 'all') {
        filteredPosts = currentPosts.filter(post =>
            post.labels && post.labels.some(label => label.name === currentCategory)
        );
    }

    const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
    const endIndex = startIndex + POSTS_PER_PAGE;
    const paginatedPosts = filteredPosts.slice(startIndex, endIndex);
    totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);

    renderPostCards(paginatedPosts);
    renderPaginationControls();
}

/**
 * Отрисовывает HTML-код карточек постов.
 */
function renderPostCards(postsToRender) {
    if (!postsToRender.length) {
        postsContainer.innerHTML = '<p class="info-message">В этой категории пока нет постов.</p>';
        return;
    }

    let postsHtml = '';
    for (const post of postsToRender) {
        // Форматируем дату
        const publishDate = new Date(post.created_at);
        const formattedDate = publishDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

        // Получаем метки для отображения
        let labelsHtml = '';
        if (post.labels && post.labels.length > 0) {
            labelsHtml = '<div class="post-labels">';
            post.labels.forEach(label => {
                labelsHtml += `<span class="post-label">${CATEGORY_LABELS[label.name] || label.name}</span>`;
            });
            labelsHtml += '</div>';
        }

        // Преобразуем Markdown в HTML (используем простой парсер или доверяемся API)
        // GitHub API возвращает body в Markdown, но мы можем использовать simple-markdown или другой парсер.
        // Для простоты оставим body как есть или обработаем через DOMPurify для безопасности.
        // Здесь для примера я использую простую замену, но в реальном проекте лучше добавить библиотеку marked.js.
        let postContent = post.body ? post.body.slice(0, 300) + '...' : '';
        postContent = postContent.replace(/\n/g, '<br>');
        
        postsHtml += `
            <article class="post-card" data-issue-id="${post.number}">
                <div class="post-card-header">
                    <h3 class="post-title">${escapeHtml(post.title)}</h3>
                    <div class="post-meta">
                        <span class="post-date">📅 ${formattedDate}</span>
                        ${post.user ? `<span class="post-author">✍️ ${escapeHtml(post.user.login)}</span>` : ''}
                    </div>
                    ${labelsHtml}
                </div>
                <div class="post-excerpt">
                    <p>${postContent}</p>
                </div>
                <div class="post-card-footer">
                    <a href="${post.html_url}" class="read-more-btn" target="_blank" rel="noopener noreferrer">Читать далее →</a>
                </div>
            </article>
        `;
    }
    postsContainer.innerHTML = postsHtml;
}

/**
 * Генерирует элементы управления пагинацией.
 */
function renderPaginationControls() {
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let paginationHtml = '<div class="pagination">';
    if (currentPage > 1) {
        paginationHtml += `<button class="page-btn" data-page="${currentPage - 1}">← Назад</button>`;
    }

    for (let i = 1; i <= totalPages; i++) {
        paginationHtml += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }

    if (currentPage < totalPages) {
        paginationHtml += `<button class="page-btn" data-page="${currentPage + 1}">Вперед →</button>`;
    }
    paginationHtml += '</div>';

    paginationContainer.innerHTML = paginationHtml;

    // Добавляем обработчики событий для кнопок пагинации
    document.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const newPage = parseInt(e.target.dataset.page);
            if (!isNaN(newPage) && newPage !== currentPage) {
                currentPage = newPage;
                renderPostsForCurrentPage();
                // Прокручиваем к началу ленты
                document.getElementById('blog-posts').scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

/**
 * Простая функция для экранирования HTML-символов.
 */
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    }).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, function(c) {
        return c;
    });
}

// --- Инициализация при загрузке страницы ---
document.addEventListener('DOMContentLoaded', () => {
    if (postsContainer) {
        fetchPosts();
    } else {
        console.warn("Элемент #posts-container не найден. Убедитесь, что блок для постов добавлен в index.html");
    }
});