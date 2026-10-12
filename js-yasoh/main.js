/* =========================================================
   ЯСОШ · Логика · v7
   ---------------------------------------------------------
   Файл отвечает за ВСЮ интерактивность сайта:
   тема, меню, анимации, расписание, учителя, столовая,
   новости, галерея, форма, кнопка «наверх».
   Данные (NEWS, TEACHERS, SCHEDULE и т.д.) лежат в data.js
   и подключаются ПЕРЕД этим файлом.
   ========================================================= */

// Ждём, пока DOM полностью построится — иначе getElementById вернёт null.
document.addEventListener('DOMContentLoaded', () => {

    /* ---------- 1. Убираем класс no-js ----------
       В <html> стоит class="no-js". Если JS выключен — .reveal
       не прячется (CSS-правило .no-js .reveal { opacity:1 }),
       т.е. сайт остаётся видимым. Как только JS заработал — снимаем. */
    document.documentElement.classList.remove('no-js');

    /* ---------- 2. Страховка для .reveal ----------
       Если IntersectionObserver по какой-то причине не сработал
       (старый браузер, ошибка) — через 1.8 сек принудительно
       показываем все скрытые блоки. Иначе часть контента навсегда
       останется с opacity:0. */
    setTimeout(() => {
        document.querySelectorAll('.reveal:not(.visible)')
            .forEach(el => el.classList.add('visible'));
    }, 1800);

    /* ---------- 3. Переключатель темы (светлая / тёмная) ----------
       Тема хранится в localStorage под ключом 'yasoh-theme'.
       При загрузке читаем её и, если 'dark', вешаем класс dark
       на <body>. CSS сам подменит переменные. */
    const themeToggle = document.getElementById('themeToggle');
    if (localStorage.getItem('yasoh-theme') === 'dark') document.body.classList.add('dark');

    themeToggle?.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        // Пишем текущее состояние в хранилище, чтобы сохранить выбор между визитами.
        localStorage.setItem('yasoh-theme', document.body.classList.contains('dark') ? 'dark' : 'light');
    });

    /* ---------- 4. Мобильное меню (бургер) ----------
       На экранах <768px nav становится выезжающей панелью.
       Открытие = класс .open + блокировка скролла body,
       чтобы фон не прокручивался под меню. */
    const burger = document.getElementById('burger');
    const nav    = document.getElementById('nav');

    burger?.addEventListener('click', () => {
        burger.classList.toggle('active');
        nav.classList.toggle('open');
        document.body.style.overflow = nav.classList.contains('open') ? 'hidden' : '';
    });

    // Клик по любой ссылке в меню закрывает панель.
    document.querySelectorAll('.nav__link').forEach(link => {
        link.addEventListener('click', () => {
            burger.classList.remove('active');
            nav.classList.remove('open');
            document.body.style.overflow = '';
        });
    });

    /* ---------- 5. Шапка + кнопка «наверх» ----------
       onScroll вызывается при каждом скролле (passive:true = не блокирует
       отрисовку, лучше для производительности). */
    const header = document.getElementById('header');
    const toTop  = document.getElementById('toTop');

    const onScroll = () => {
        header.classList.toggle('scrolled', window.scrollY > 20);  // тень у шапки
        toTop.classList.toggle('visible', window.scrollY > 500);   // показать ↑
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // вызов сразу — на случай, если страница открыта уже прокрученной

    toTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    /* ---------- 6. Анимация появления (reveal) ----------
       IntersectionObserver следит за элементами .reveal.
       Как только элемент входит во вьюпорт — добавляем .visible.
       Для «каскада» делаем маленькую задержку по индексу (i*70 мс).
       После срабатывания отписываемся (unobserve) — экономим ресурсы. */
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
                setTimeout(() => entry.target.classList.add('visible'), i * 70);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    /* ---------- 7. Плавная прокрутка по якорям ----------
       Перехватываем клики по ссылкам вида href="#id".
       Считаем позицию с учётом высоты фиксированной шапки,
       иначе цель уедет под шапку. */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const id = anchor.getAttribute('href');
            if (!id || id.length < 2) return;
            const target = document.querySelector(id);
            if (!target) return;
            e.preventDefault();
            const offset = header.offsetHeight + 12;
            window.scrollTo({
                top: target.getBoundingClientRect().top + window.scrollY - offset,
                behavior: 'smooth'
            });
        });
    });

    /* ---------- 8. Новости ----------
       Берём массив NEWS из data.js и на каждый объект строим карточку.
       Первая новость получает класс --featured (широкая).
       Иконки сделаны SVG-строками, чтобы не тянуть сторонние библиотеки.
       Реакции: лайк (локальный счётчик) и показать/скрыть комментарии. */
    const newsList = document.getElementById('newsList');
    const iconEye     = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';
    const iconHeart   = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-4.5-7-10a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 5.5-7 10-7 10z"/></svg>';
    const iconComment = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z"/></svg>';

    // Из ФИО делаем инициалы для аватарки комментария: «Иванов Иван» → «ИИ».
    const initials = (n) => n.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

    if (newsList && typeof NEWS !== 'undefined') {
        NEWS.forEach((n, i) => {
            const card = document.createElement('article');
            card.className = 'news-card' + (i === 0 ? ' news-card--featured' : '');
            card.innerHTML = `
                <div class="news-card__top"><span class="news-tag news-tag--${n.tag}">${n.tagLabel}</span><span class="news-card__date">${n.date}</span></div>
                <h3 class="news-card__title">${n.title}</h3>
                <p class="news-card__text">${n.text}</p>
                <div class="news-card__reactions">
                    <span class="reaction reaction--static">${iconEye}<span>${n.views}</span></span>
                    <button class="reaction" data-action="like">${iconHeart}<span>${n.likes}</span></button>
                    <button class="reaction reaction--toggle" data-action="toggle-comments">${iconComment}<span>${n.comments.length}</span></button>
                </div>
                <div class="news-card__comments" hidden>
                    ${n.comments.map(c => `<div class="comment${c.meme?' comment--meme':''}"><div class="comment__avatar">${initials(c.name)}</div><div class="comment__body"><div class="comment__name">${c.name}</div><div class="comment__text">${c.text}</div></div></div>`).join('') || '<p style="color:var(--text-muted);font-size:.84rem;">Комментариев пока нет</p>'}
                </div>`;
            newsList.appendChild(card);

            // Навешиваем обработчики на «лайк» и «комментарии» внутри карточки.
            card.querySelectorAll('.reaction[data-action]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const a = btn.dataset.action;
                    const num = btn.querySelector('span');
                    if (a === 'like') {
                        // toggle возвращает true, если класс ТОЛЬКО ЧТО добавлен.
                        const liked = btn.classList.toggle('is-liked');
                        num.textContent = +num.textContent + (liked ? 1 : -1);
                    } else if (a === 'toggle-comments') {
                        const box = card.querySelector('.news-card__comments');
                        box.hidden = !box.hidden;
                    }
                });
            });
        });
    }

    /* ---------- 9. Расписание ----------
       1) Заполняем два <select> — классы и дни.
       2) renderSchedule() читает выбранные значения, берёт уроки
          из SCHEDULE[класс][день] и строит <tr> в tbody.
       3) Если уроков нет — показываем заглушку «Отдыхайте». */
    const classSelect  = document.getElementById('classSelect');
    const daySelect    = document.getElementById('daySelect');
    const scheduleBody = document.getElementById('scheduleBody');
    const scheduleEmpty = document.getElementById('scheduleEmpty');
    const schedTable   = document.querySelector('.schedule__table-wrap table');

    if (classSelect && typeof SCHEDULE !== 'undefined') {
        // Классы (ключи объекта SCHEDULE): 1а, 2а, ..., 11
        Object.keys(SCHEDULE).forEach(cls => {
            const o = document.createElement('option');
            o.value = cls; o.textContent = cls + ' класс';
            classSelect.appendChild(o);
        });
        // Дни: Пн..Сб из массива DAYS.
        DAYS.forEach(d => {
            const o = document.createElement('option');
            o.value = d; o.textContent = d;
            daySelect.appendChild(o);
        });

        function renderSchedule() {
            const lessons = (SCHEDULE[classSelect.value]?.[daySelect.value]) || [];
            scheduleBody.innerHTML = '';

            if (!lessons.length) {            // пустой день
                scheduleEmpty.hidden = false;
                schedTable.hidden = true;
                return;
            }
            scheduleEmpty.hidden = true;
            schedTable.hidden = false;

            // LESSON_TIMES — общий список времён уроков из data.js.
            lessons.forEach((l, i) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td class="sched__num">${i + 1}</td><td class="sched__time">${LESSON_TIMES[i]}</td><td>${l.subject}</td><td class="sched__room">${l.room}</td>`;
                scheduleBody.appendChild(tr);
            });
        }

        classSelect.addEventListener('change', renderSchedule);
        daySelect.addEventListener('change', renderSchedule);
        renderSchedule(); // первый рендер — при загрузке
    }

    /* ---------- 10. Учителя ----------
       Фильтр по ступени (junior/middle/senior/all).
       Кнопки-фильтры делегируются одним слушателем на контейнер —
       это экономнее, чем вешать обработчик на каждую кнопку. */
    const teacherList    = document.getElementById('teacherList');
    const teacherFilters = document.getElementById('teacherFilters');

    function renderTeachers(filter = 'all') {
        if (!teacherList || typeof TEACHERS === 'undefined') return;
        teacherList.innerHTML = '';
        const filtered = filter === 'all' ? TEACHERS : TEACHERS.filter(t => t.stage === filter);

        filtered.forEach(t => {
            // Короткая метка ступени для бейджа на фото.
            const stageLabel = { junior: '1–4', middle: '5–7', senior: '8–11' }[t.stage];
            const card = document.createElement('article');
            card.className = 'teacher';
            card.innerHTML = `
                <div class="teacher__photo">
                    <img src="${t.photo}" alt="${t.name}" loading="lazy">
                    <span class="teacher__stage teacher__stage--${t.stage}">${stageLabel}</span>
                </div>
                <div class="teacher__body">
                    <h3 class="teacher__name">${t.name}</h3>
                    <p class="teacher__subject">${t.subject}</p>
                    <p class="teacher__meta"><span>Стаж: ${t.exp} лет · ${t.category}</span><span>${t.education}</span><span>${t.bio}</span></p>
                </div>`;
            teacherList.appendChild(card);
        });
    }

    if (teacherFilters) {
        teacherFilters.addEventListener('click', (e) => {
            const btn = e.target.closest('.filter'); if (!btn) return;
            // Меняем активную кнопку и рендерим нужную группу.
            teacherFilters.querySelectorAll('.filter').forEach(f => f.classList.remove('is-active'));
            btn.classList.add('is-active');
            renderTeachers(btn.dataset.filter);
        });
    }
    renderTeachers(); // стартовый рендер — все учителя

    /* Кнопки «Учителя ступени →» на карточках ступеней.
       Программно кликаем соответствующий фильтр и скроллим к блоку. */
    document.querySelectorAll('.level-card__btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const f = teacherFilters?.querySelector(`.filter[data-filter="${btn.dataset.filter}"]`);
            if (f) f.click();
            document.getElementById('teachers').scrollIntoView({ behavior: 'smooth' });
        });
    });

    /* ---------- 11. Столовая ----------
       CANTEEN_MENU — объект вида { 'Пн': { label, dishes:[...] }, ... }.
       Табы генерируем по ключам, панель — по массиву dishes. */
    const canteenTabs  = document.getElementById('canteenTabs');
    const canteenPanel = document.getElementById('canteenPanel');

    if (canteenTabs && typeof CANTEEN_MENU !== 'undefined') {
        const dayKeys = Object.keys(CANTEEN_MENU);

        function renderCanteen(key) {
            canteenPanel.innerHTML = '';
            CANTEEN_MENU[key].dishes.forEach(d => {
                const row = document.createElement('div');
                row.className = 'dish'
                    + (d.free ? ' dish--free' : '')
                    + (d.meme ? ' dish--meme' : '');
                row.innerHTML = `
                    <div class="dish__emoji">${d.emoji}</div>
                    <div class="dish__info">
                        <div class="dish__name">${d.name}</div>
                        ${d.note ? `<div class="dish__note">${d.note}</div>` : ''}
                    </div>
                    <div class="dish__price">${d.price}</div>`;
                canteenPanel.appendChild(row);
            });
        }

        // Строим табы + сразу открываем первый день недели.
        dayKeys.forEach((key, idx) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'tab' + (idx === 0 ? ' is-active' : '');
            b.textContent = CANTEEN_MENU[key].label;
            b.addEventListener('click', () => {
                canteenTabs.querySelectorAll('.tab').forEach(t => t.classList.remove('is-active'));
                b.classList.add('is-active');
                renderCanteen(key);
            });
            canteenTabs.appendChild(b);
        });
        renderCanteen(dayKeys[0]);
    }

    /* ---------- 12. Достижения ----------
       Динамически создаём блоки из ACHIEVEMENTS.
       requestAnimationFrame — чтобы observer подхватил новые
       элементы ПОСЛЕ их вставки в DOM и запустил им .reveal. */
    const achList = document.getElementById('achievementsList');
    if (achList && typeof ACHIEVEMENTS !== 'undefined') {
        ACHIEVEMENTS.forEach(a => {
            const el = document.createElement('div');
            el.className = `achievement achievement--${a.type} reveal`;
            el.innerHTML = `<div class="achievement__icon">${a.icon}</div><div class="achievement__body"><h3>${a.title}</h3><p>${a.text}</p></div>`;
            achList.appendChild(el);
            requestAnimationFrame(() => observer.observe(el));
        });
    }

    /* ---------- 13. Галерея ----------
       Аналогично достижениям: строим figure из массива GALLERY.
       Флаг wide даёт элементу span на 2 колонки. */
    const galleryGrid = document.getElementById('galleryGrid');
    if (galleryGrid && typeof GALLERY !== 'undefined') {
        GALLERY.forEach(g => {
            const fig = document.createElement('figure');
            fig.className = 'gallery__item reveal' + (g.wide ? ' gallery__item--wide' : '');
            fig.innerHTML = `<img src="${g.src}" alt="${g.caption}" loading="lazy"><figcaption>${g.caption}</figcaption>`;
            galleryGrid.appendChild(fig);
            requestAnimationFrame(() => observer.observe(fig));
        });
    }

    /* ---------- 14. Форма обратной связи ----------
       - Валидация по правилам (rules).
       - Маска телефона приводит номер к виду +7 (XXX) XXX-XX-XX.
       - Отправка через fetch на jsonplaceholder (демо-эндпоинт).
       - Статус success/error выводим в #status.
    */
    const form      = document.getElementById('contactForm');
    const statusEl  = document.getElementById('status');
    const submitBtn = document.getElementById('submitBtn');

    if (form) {
        // Каждое правило возвращает true (ок) или строку-сообщение об ошибке.
        const rules = {
            name:    v => { if (v.trim().length < 2) return 'Введите ФИО';
                            if (!/^[А-Яа-яЁёA-Za-z\s\-]+$/.test(v.trim())) return 'Только буквы';
                            return true; },
            phone:   v => v.replace(/\D/g, '').length < 11 ? 'Введите корректный телефон' : true,
            message: v => v.trim().length < 10 ? 'Минимум 10 символов' : true,
        };

        function validate(input) {
            const r = rules[input.name]; if (!r) return true;
            const res = r(input.value);
            const err = document.querySelector(`.error[data-for="${input.name}"]`);
            if (res === true) {
                input.classList.remove('invalid');
                if (err) err.textContent = '';
                return true;
            }
            input.classList.add('invalid');
            if (err) err.textContent = res;
            return false;
        }

        // Проверка при уходе с поля + перепроверка при исправлении,
        // но только если поле уже было помечено invalid — чтобы не мигало.
        form.querySelectorAll('input, textarea').forEach(inp => {
            inp.addEventListener('blur',  () => validate(inp));
            inp.addEventListener('input', () => { if (inp.classList.contains('invalid')) validate(inp); });
        });

        // Маска телефона: удаляем всё лишнее, начинаем с 7, форматируем по шаблону.
        const phoneInput = document.getElementById('phone');
        phoneInput.addEventListener('input', (e) => {
            let v = e.target.value.replace(/\D/g, '');
            if (v.startsWith('8')) v = '7' + v.slice(1);
            if (v && !v.startsWith('7')) v = '7' + v;

            let f = '';
            if (v.length > 0) f  = '+7';
            if (v.length > 1) f += ' (' + v.slice(1, 4);
            if (v.length >= 5) f += ') ' + v.slice(4, 7);
            if (v.length >= 8) f += '-'  + v.slice(7, 9);
            if (v.length >= 10) f += '-' + v.slice(9, 11);
            e.target.value = f;
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Валидируем все поля. .map(validate).every(Boolean) — true,
            // если каждое вернуло true.
            const ok = [...form.querySelectorAll('input, textarea')].map(validate).every(Boolean);
            if (!ok) {
                statusEl.textContent = 'Исправьте ошибки';
                statusEl.className = 'status error';
                return;
            }

            // Блокируем кнопку и показываем «Отправка…», чтобы не спамили.
            submitBtn.disabled = true;
            submitBtn.textContent = 'Отправка...';
            statusEl.textContent = ''; statusEl.className = 'status';

            try {
                const res = await fetch('https://jsonplaceholder.typicode.com/posts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: form.name.value.trim(),
                        phone: form.phone.value.trim(),
                        message: form.message.value.trim()
                    })
                });
                if (!res.ok) throw new Error();
                statusEl.textContent = '✅ Обращение отправлено! Мы свяжемся с вами в течение рабочего дня.';
                statusEl.className = 'status success';
                form.reset();
            } catch {
                statusEl.textContent = '❌ Не удалось отправить. Позвоните: +7 (38564) 2-45-10';
                statusEl.className = 'status error';
            } finally {
                // Разблокировка кнопки — в любом случае.
                submitBtn.disabled = false;
                submitBtn.textContent = 'Отправить';
            }
        });
    }

    /* ---------- 15. Год в подвале ----------
       Вместо «2026» руками — new Date().getFullYear(). */
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
});