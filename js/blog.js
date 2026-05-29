// js/blog.js

// --- Конфигурация ---
const REPO_OWNER = 'Studist-glitch';
const REPO_NAME = 'Site';
const POSTS_PER_PAGE = 5;

// Определяем ваши категории и соответствующие им метки (Labels) в GitHub Issues
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

let allPosts = [];          // все загруженные посты
let currentPosts = [];      // отфильтрованные по категории
let currentPage = 1;
let currentCategory = 'all';
let totalPages = 0;

/**
 * Загружает посты из GitHub Issues
 */
async function fetchPosts() {
    if (!postsContainer) return;
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
        // Фильтруем: убираем Pull Requests (у них есть поле pull_request)
        allPosts = issues.filter(issue => !issue.pull_request);
        applyFilterAndRender();
    } catch (error) {
        console.error("Error fetching posts:", error);
        postsContainer.innerHTML = `<p class="error-message">❌ Не удалось загрузить новости. Пожалуйста, попробуйте позже.</p>`;
        paginationContainer.innerHTML = '';
    }
}

/**
 * Применяет текущую категорию и перерисовывает
 */
function applyFilterAndRender() {
    if (currentCategory === 'all') {
        currentPosts = [...allPosts];
    } else {
        currentPosts = allPosts.filter(post =>
            post.labels && post.labels.some(label => label.name === currentCategory)
        );
    }
    currentPage = 1;
    renderCategories();     // обновляем активную кнопку
    renderPostsForCurrentPage();
}

/**
 * Отображает индикатор загрузки
 */
function showLoadingState() {
    postsContainer.innerHTML = '<div class="loading-spinner">🌀 Загрузка новостей...</div>';
    paginationContainer.innerHTML = '';
}

/**
 * Рендерит кнопки категорий на основе всех постов
 */
function renderCategories() {
    const availableLabels = new Set();
    allPosts.forEach(post => {
        if (post.labels && post.labels.length > 0) {
            post.labels.forEach(label => {
                if (CATEGORY_LABELS[label.name]) {
                    availableLabels.add(label.name);
                }
            });
        }
    });

    let categoriesHtml = `<button class="category-btn ${currentCategory === 'all' ? 'active' : ''}" data-category="all">Все</button>`;
    const sortedLabels = Array.from(availableLabels).sort();
    sortedLabels.forEach(label => {
        categoriesHtml += `<button class="category-btn ${currentCategory === label ? 'active' : ''}" data-category="${label}">${CATEGORY_LABELS[label]}</button>`;
    });
    categoriesContainer.innerHTML = categoriesHtml;

    // Добавляем обработчики
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const category = e.target.dataset.category;
            if (category === currentCategory) return;
            currentCategory = category;
            applyFilterAndRender();
        });
    });
}

/**
 * Отображает посты для текущей страницы
 */
function renderPostsForCurrentPage() {
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
    const endIndex = startIndex + POSTS_PER_PAGE;
    const paginatedPosts = currentPosts.slice(startIndex, endIndex);
    totalPages = Math.ceil(currentPosts.length / POSTS_PER_PAGE);

    if (!paginatedPosts.length) {
        postsContainer.innerHTML = '<p class="info-message">📭 В этой категории пока нет постов.</p>';
        paginationContainer.innerHTML = '';
        return;
    }

    let postsHtml = '';
    for (const post of paginatedPosts) {
        const publishDate = new Date(post.created_at);
        const formattedDate = publishDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

        let labelsHtml = '';
        if (post.labels && post.labels.length > 0) {
            labelsHtml = '<div class="post-labels">';
            post.labels.forEach(label => {
                const displayName = CATEGORY_LABELS[label.name] || label.name;
                labelsHtml += `<span class="post-label">${escapeHtml(displayName)}</span>`;
            });
            labelsHtml += '</div>';
        }

        let postContent = post.body ? post.body.slice(0, 300) : '';
        if (post.body && post.body.length > 300) postContent += '...';
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
    renderPaginationControls();
}

/**
 * Рендерит пагинацию
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

    document.querySelectorAll('.page-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const newPage = parseInt(e.target.dataset.page);
            if (!isNaN(newPage) && newPage !== currentPage) {
                currentPage = newPage;
                renderPostsForCurrentPage();
                document.querySelector('.blog-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

/**
 * Экранирование HTML
 */
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Обновление после создания нового поста (сохраняя категорию и страницу)
async function refreshPosts() {
    const savedCategory = currentCategory;
    const savedPage = currentPage;
    await fetchPosts();        // заново загружает allPosts, вызывает applyFilterAndRender
    // После fetchPosts currentCategory и currentPage сбросятся на all и 1, поэтому восстанавливаем
    if (savedCategory !== currentCategory) {
        currentCategory = savedCategory;
        applyFilterAndRender();
        currentPage = Math.min(savedPage, totalPages);
        renderPostsForCurrentPage();
    } else {
        currentPage = Math.min(savedPage, totalPages);
        renderPostsForCurrentPage();
    }
}

// Делаем функции доступными глобально для других скриптов (create-post.js)
window.fetchPosts = fetchPosts;
window.refreshPosts = refreshPosts;

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    if (postsContainer) {
        fetchPosts();
    } else {
        console.warn("Элемент #posts-container не найден");
    }
});