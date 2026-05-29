// js/blog.js

// --- Конфигурация ---
const REPO_OWNER = 'Studist-glitch';
const REPO_NAME = 'Site';
const POSTS_PER_PAGE = 5;

const CATEGORY_LABELS = {
    'all': 'Все',
    'Новости': 'Новости',
    'Обновления': 'Обновления',
    'События': 'События',
    'DevLog': 'DevLog'
};

// --- DOM элементы ---
const postsContainer = document.getElementById('posts-container');
const paginationContainer = document.getElementById('pagination-container');
const categoriesContainer = document.getElementById('categories-container');

let allPosts = [];
let currentPosts = [];
let currentPage = 1;
let currentCategory = 'all';
let totalPages = 0;

/**
 * Рендеринг Markdown в HTML с поддержкой таблиц
 * Если подключена библиотека marked, используем её, иначе простой парсер таблиц.
 */
function renderMarkdown(markdown) {
    if (!markdown) return '';
    if (typeof marked !== 'undefined') {
        // Используем marked.js с поддержкой таблиц (включена по умолчанию)
        return marked.parse(markdown);
    }
    // Встроенный простой парсер для таблиц (базовый)
    return simpleMarkdownParser(markdown);
}

function simpleMarkdownParser(md) {
    // Сначала обрабатываем таблицы: ищем блоки вида | ... | ... |
    const lines = md.split('\n');
    let inTable = false;
    let tableRows = [];
    let result = '';
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('|') && line.endsWith('|')) {
            if (!inTable) {
                inTable = true;
                tableRows = [];
            }
            tableRows.push(line);
            continue;
        } else {
            if (inTable) {
                result += renderSimpleTable(tableRows);
                inTable = false;
                tableRows = [];
            }
            // Обработка обычного текста (базовые Markdown элементы)
            let htmlLine = line
                .replace(/^# (.*)$/, '<h1>$1</h1>')
                .replace(/^## (.*)$/, '<h2>$1</h2>')
                .replace(/^### (.*)$/, '<h3>$1</h3>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>')
                .replace(/^- (.*)$/gm, '<li>$1</li>')
                .replace(/^\d+\. (.*)$/gm, '<li>$1</li>');
            if (htmlLine.match(/<li>/)) {
                htmlLine = '<ul>' + htmlLine + '</ul>';
            }
            result += htmlLine + (line === '' ? '' : '<br>');
        }
    }
    if (inTable && tableRows.length) {
        result += renderSimpleTable(tableRows);
    }
    return result;
}

function renderSimpleTable(rows) {
    if (!rows.length) return '';
    // Определяем количество столбцов по первой строке
    const headers = rows[0].split('|').slice(1, -1).map(h => h.trim());
    let html = '<table class="markdown-table"><thead><tr>';
    headers.forEach(h => html += `<th>${escapeHtml(h)}</th>`);
    html += '</tr></thead><tbody>';
    for (let i = 2; i < rows.length; i++) { // пропускаем строку с разделителями ---
        const cells = rows[i].split('|').slice(1, -1).map(c => c.trim());
        html += '<tr>';
        cells.forEach(cell => html += `<td>${escapeHtml(cell)}</td>`);
        html += '</tr>';
    }
    html += '</tbody></table>';
    return html;
}

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
        if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
        const issues = await response.json();
        allPosts = issues.filter(issue => !issue.pull_request);
        applyFilterAndRender();
    } catch (error) {
        console.error("Error fetching posts:", error);
        postsContainer.innerHTML = `<p class="error-message">❌ Не удалось загрузить новости.</p>`;
        paginationContainer.innerHTML = '';
    }
}

function applyFilterAndRender() {
    if (currentCategory === 'all') {
        currentPosts = [...allPosts];
    } else {
        currentPosts = allPosts.filter(post =>
            post.labels && post.labels.some(label => label.name === currentCategory)
        );
    }
    currentPage = 1;
    renderCategories();
    renderPostsForCurrentPage();
}

function showLoadingState() {
    postsContainer.innerHTML = '<div class="loading-spinner">🌀 Загрузка новостей...</div>';
    paginationContainer.innerHTML = '';
}

function renderCategories() {
    const availableLabels = new Set();
    allPosts.forEach(post => {
        if (post.labels) {
            post.labels.forEach(label => {
                if (CATEGORY_LABELS[label.name]) availableLabels.add(label.name);
            });
        }
    });
    let categoriesHtml = `<button class="category-btn ${currentCategory === 'all' ? 'active' : ''}" data-category="all">Все</button>`;
    Array.from(availableLabels).sort().forEach(label => {
        categoriesHtml += `<button class="category-btn ${currentCategory === label ? 'active' : ''}" data-category="${label}">${CATEGORY_LABELS[label]}</button>`;
    });
    categoriesContainer.innerHTML = categoriesHtml;
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const category = e.target.dataset.category;
            if (category === currentCategory) return;
            currentCategory = category;
            applyFilterAndRender();
        });
    });
}

function renderPostsForCurrentPage() {
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
    const paginatedPosts = currentPosts.slice(startIndex, startIndex + POSTS_PER_PAGE);
    totalPages = Math.ceil(currentPosts.length / POSTS_PER_PAGE);

    if (!paginatedPosts.length) {
        postsContainer.innerHTML = '<p class="info-message">📭 В этой категории пока нет постов.</p>';
        paginationContainer.innerHTML = '';
        return;
    }

    let postsHtml = '';
    const currentUser = (window.GitHubAuth && window.GitHubAuth.username) ? window.GitHubAuth.username : null;

    for (const post of paginatedPosts) {
        const publishDate = new Date(post.created_at);
        const formattedDate = publishDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
        
        let labelsHtml = '';
        if (post.labels && post.labels.length) {
            labelsHtml = '<div class="post-labels">';
            post.labels.forEach(label => {
                labelsHtml += `<span class="post-label">${escapeHtml(CATEGORY_LABELS[label.name] || label.name)}</span>`;
            });
            labelsHtml += '</div>';
        }

        // Рендерим тело поста в HTML (с таблицами)
        const renderedBody = renderMarkdown(post.body || '');
        
        // Обрезаем для превью (первые 400 символов текста, без HTML-тегов)
        let excerpt = renderedBody.replace(/<[^>]*>/g, '').slice(0, 300);
        if (excerpt.length >= 300) excerpt += '...';

        const isAuthor = (currentUser && post.user && post.user.login === currentUser);
        const editButton = isAuthor ? `<button class="edit-post-btn" data-issue-number="${post.number}" data-issue-title="${escapeHtml(post.title)}" data-issue-body="${escapeHtml(post.body || '')}" data-issue-labels="${escapeHtml(post.labels ? post.labels.map(l => l.name).join(',') : '')}">✏️ Редактировать</button>` : '';

        postsHtml += `
            <article class="post-card" data-issue-id="${post.number}">
                <div class="post-card-header">
                    <h3 class="post-title">${escapeHtml(post.title)}</h3>
                    <div class="post-meta">
                        <span class="post-date">📅 ${formattedDate}</span>
                        <span class="post-author">✍️ ${escapeHtml(post.user.login)}</span>
                    </div>
                    ${labelsHtml}
                </div>
                <div class="post-excerpt">
                    <p>${excerpt}</p>
                </div>
                <div class="post-card-footer">
                    <a href="${post.html_url}" class="read-more-btn" target="_blank" rel="noopener noreferrer">Читать полностью →</a>
                    ${editButton}
                </div>
            </article>
        `;
    }
    postsContainer.innerHTML = postsHtml;

    // Добавляем обработчики для кнопок редактирования
    document.querySelectorAll('.edit-post-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const issueNumber = btn.dataset.issueNumber;
            const title = btn.dataset.issueTitle;
            const body = btn.dataset.issueBody;
            const labels = btn.dataset.issueLabels;
            if (window.openEditPostModal) {
                window.openEditPostModal(issueNumber, title, body, labels);
            }
        });
    });

    renderPaginationControls();
}

function renderPaginationControls() {
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    let paginationHtml = '<div class="pagination">';
    if (currentPage > 1) paginationHtml += `<button class="page-btn" data-page="${currentPage - 1}">← Назад</button>`;
    for (let i = 1; i <= totalPages; i++) {
        paginationHtml += `<button class="page-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    if (currentPage < totalPages) paginationHtml += `<button class="page-btn" data-page="${currentPage + 1}">Вперед →</button>`;
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

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

async function refreshPosts() {
    const savedCategory = currentCategory;
    const savedPage = currentPage;
    await fetchPosts();
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

window.fetchPosts = fetchPosts;
window.refreshPosts = refreshPosts;

document.addEventListener('DOMContentLoaded', () => {
    if (postsContainer) fetchPosts();
    else console.warn("#posts-container not found");
});