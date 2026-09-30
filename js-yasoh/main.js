/* =========================================================
   ЯСОШ · Логика
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {

    /* -------------------------------------------------------
       1. МОБИЛЬНОЕ МЕНЮ
       ------------------------------------------------------- */
    const burger = document.getElementById('burger');
    const nav = document.getElementById('nav');

    burger.addEventListener('click', () => {
        burger.classList.toggle('active');
        nav.classList.toggle('open');
        document.body.style.overflow = nav.classList.contains('open') ? 'hidden' : '';
    });

    document.querySelectorAll('.nav__link').forEach(link => {
        link.addEventListener('click', () => {
            burger.classList.remove('active');
            nav.classList.remove('open');
            document.body.style.overflow = '';
        });
    });

    /* -------------------------------------------------------
       2. ШАПКА + КНОПКА НАВЕРХ
       ------------------------------------------------------- */
    const header = document.getElementById('header');
    const toTop = document.getElementById('toTop');

    const onScroll = () => {
        header.classList.toggle('scrolled', window.scrollY > 20);
        toTop.classList.toggle('visible', window.scrollY > 500);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    toTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    /* -------------------------------------------------------
       3. REVEAL-АНИМАЦИЯ
       ------------------------------------------------------- */
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
                setTimeout(() => entry.target.classList.add('visible'), i * 70);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    /* -------------------------------------------------------
       4. ПЛАВНАЯ ПРОКРУТКА
       ------------------------------------------------------- */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const id = anchor.getAttribute('href');
            if (id === '#' || id.length < 2) return;
            const target = document.querySelector(id);
            if (!target) return;
            e.preventDefault();
            const offset = header.offsetHeight + 12;
            const top = target.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top, behavior: 'smooth' });
        });
    });

    /* -------------------------------------------------------
       5. РЕНДЕР НОВОСТЕЙ
       ------------------------------------------------------- */
    const newsList = document.getElementById('newsList');

    const iconEye = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';
    const iconHeart = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-4.5-7-10a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 5.5-7 10-7 10z"/></svg>';
    const iconComment = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z"/></svg>';

    const initials = (name) => name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

    NEWS.forEach((n, i) => {
        const card = document.createElement('article');
        card.className = 'news-card reveal' + (i === 0 ? ' news-card--featured' : '');
        card.innerHTML = `
            <div class="news-card__top">
                <span class="news-tag news-tag--${n.tag}">${n.tagLabel}</span>
                <span class="news-card__date">${n.date}</span>
            </div>
            <h3 class="news-card__title">${n.title}</h3>
            <p class="news-card__text">${n.text}</p>
            <div class="news-card__reactions">
                <button class="reaction" data-action="view">${iconEye}<span>${n.views}</span></button>
                <button class="reaction" data-action="like">${iconHeart}<span>${n.likes}</span></button>
                <button class="reaction reaction--toggle" data-action="toggle-comments">${iconComment}<span>${n.comments.length}</span></button>
            </div>
            <div class="news-card__comments" hidden>
                ${n.comments.map(c => `
                    <div class="comment${c.meme ? ' comment--meme' : ''}">
                        <div class="comment__avatar">${initials(c.name)}</div>
                        <div class="comment__body">
                            <div class="comment__name">${c.name}</div>
                            <div class="comment__text">${c.text}</div>
                        </div>
                    </div>
                `).join('') || '<p style="color:var(--text-muted);font-size:.86rem;">Комментариев пока нет</p>'}
            </div>
        `;
        newsList.appendChild(card);

        // Реакции
        card.querySelectorAll('.reaction').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                const numEl = btn.querySelector('span');

                if (action === 'view') {
                    numEl.textContent = Number(numEl.textContent) + 1;
                } else if (action === 'like') {
                    const liked = btn.classList.toggle('is-liked');
                    const base = Number(numEl.textContent);
                    numEl.textContent = liked ? base + 1 : base - 1;
                } else if (action === 'toggle-comments') {
                    const box = card.querySelector('.news-card__comments');
                    box.hidden = !box.hidden;
                }
            });
        });
    });

    /* -------------------------------------------------------
       6. РАСПИСАНИЕ
       ------------------------------------------------------- */
    const classTabs   = document.getElementById('classTabs');
    const dayTabs     = document.getElementById('dayTabs');
    const scheduleBody = document.getElementById('scheduleBody');
    const scheduleEmpty = document.getElementById('scheduleEmpty');

    const classes = Object.keys(SCHEDULE);
    let activeClass = classes[0];
    let activeDay = 'Пн';

    // Табы классов
    classes.forEach((cls, idx) => {
        const b = document.createElement('button');
        b.className = 'tab' + (idx === 0 ? ' is-active' : '');
        b.textContent = cls;
        b.dataset.class = cls;
        b.addEventListener('click', () => {
            activeClass = cls;
            classTabs.querySelectorAll('.tab').forEach(t => t.classList.remove('is-active'));
            b.classList.add('is-active');
            renderSchedule();
        });
        classTabs.appendChild(b);
    });

    // Табы дней
    DAYS.forEach((day, idx) => {
        const b = document.createElement('button');
        b.className = 'tab' + (idx === 0 ? ' is-active' : '');
        b.textContent = day;
        b.dataset.day = day;
        b.addEventListener('click', () => {
            activeDay = day;
            dayTabs.querySelectorAll('.tab').forEach(t => t.classList.remove('is-active'));
            b.classList.add('is-active');
            renderSchedule();
        });
        dayTabs.appendChild(b);
    });

    function renderSchedule() {
        const lessons = (SCHEDULE[activeClass] && SCHEDULE[activeClass][activeDay]) || [];
        scheduleBody.innerHTML = '';

        if (!lessons.length) {
            scheduleEmpty.hidden = false;
            document.querySelector('.schedule__table-wrap table').hidden = true;
            return;
        }

        scheduleEmpty.hidden = true;
        document.querySelector('.schedule__table-wrap table').hidden = false;

        lessons.forEach((l, i) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="sched__num">${i + 1}</td>
                <td class="sched__time">${LESSON_TIMES[i]}</td>
                <td>${l.subject}</td>
                <td class="sched__room">${l.room}</td>
            `;
            scheduleBody.appendChild(tr);
        });
    }

    renderSchedule();

    /* -------------------------------------------------------
       7. УЧИТЕЛЯ
       ------------------------------------------------------- */
    const teacherList = document.getElementById('teacherList');
    const teacherFilters = document.getElementById('teacherFilters');

    function renderTeachers(filter = 'all') {
        teacherList.innerHTML = '';
        const filtered = filter === 'all'
            ? TEACHERS
            : TEACHERS.filter(t => t.stage === filter);

        filtered.forEach(t => {
            const stageLabel = { junior: '1–4', middle: '5–7', senior: '8–11' }[t.stage];
            const card = document.createElement('article');
            card.className = 'teacher reveal';
            card.innerHTML = `
                <div class="teacher__photo">
                    <img src="${t.photo}" alt="${t.name}" loading="lazy">
                    <span class="teacher__stage teacher__stage--${t.stage}">${stageLabel}</span>
                </div>
                <div class="teacher__body">
                    <h3 class="teacher__name">${t.name}</h3>
                    <p class="teacher__subject">${t.subject}</p>
                    <p class="teacher__meta">
                        <span>Стаж: ${t.exp} лет</span>
                        <span>${t.bio}</span>
                    </p>
                </div>
            `;
            teacherList.appendChild(card);

            // Повторное подключение анимации
            requestAnimationFrame(() => {
                observer.observe(card);
            });
        });
    }

    teacherFilters.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter');
        if (!btn) return;
        teacherFilters.querySelectorAll('.filter').forEach(f => f.classList.remove('is-active'));
        btn.classList.add('is-active');
        renderTeachers(btn.dataset.filter);
    });

    renderTeachers();

    // Кнопки на карточках ступеней — переключают фильтр и скроллят
    document.querySelectorAll('.level-card__btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetFilter = btn.dataset.filter;
            const fBtn = teacherFilters.querySelector(`.filter[data-filter="${targetFilter}"]`);
            if (fBtn) fBtn.click();
            document.getElementById('teachers').scrollIntoView({ behavior: 'smooth' });
        });
    });

    /* -------------------------------------------------------
       8. СТОЛОВАЯ
       ------------------------------------------------------- */
    const canteenTabs = document.getElementById('canteenTabs');
    const canteenPanel = document.getElementById('canteenPanel');

    const dayKeys = Object.keys(CANTEEN_MENU);
    let activeCanteenDay = dayKeys[0];

    dayKeys.forEach((key, idx) => {
        const b = document.createElement('button');
        b.className = 'tab' + (idx === 0 ? ' is-active' : '');
        b.textContent = CANTEEN_MENU[key].label;
        b.dataset.day = key;
        b.addEventListener('click', () => {
            activeCanteenDay = key;
            canteenTabs.querySelectorAll('.tab').forEach(t => t.classList.remove('is-active'));
            b.classList.add('is-active');
            renderCanteen();
        });
        canteenTabs.appendChild(b);
    });

    function renderCanteen() {
        const data = CANTEEN_MENU[activeCanteenDay];
        canteenPanel.innerHTML = '';
        data.dishes.forEach(d => {
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
                <div class="dish__price">${d.price}</div>
            `;
            canteenPanel.appendChild(row);
        });
    }

    renderCanteen();

    /* -------------------------------------------------------
       9. ФОРМА
       ------------------------------------------------------- */
    const form = document.getElementById('contactForm');
    const statusEl = document.getElementById('status');
    const submitBtn = document.getElementById('submitBtn');

    const rules = {
        name: (v) => {
            if (v.trim().length < 2) return 'Введите ФИО (минимум 2 символа)';
            if (!/^[А-Яа-яЁёA-Za-z\s\-]+$/.test(v.trim())) return 'Только буквы, пробелы и дефис';
            return true;
        },
        phone: (v) => {
            const digits = v.replace(/\D/g, '');
            if (digits.length < 11) return 'Введите корректный телефон';
            return true;
        },
        message: (v) => {
            if (v.trim().length < 10) return 'Опишите вопрос (минимум 10 символов)';
            return true;
        },
    };

    function validateField(input) {
        const rule = rules[input.name];
        if (!rule) return true;
        const result = rule(input.value);
        const errorEl = document.querySelector(`.error[data-for="${input.name}"]`);

        if (result === true) {
            input.classList.remove('invalid');
            if (errorEl) errorEl.textContent = '';
            return true;
        } else {
            input.classList.add('invalid');
            if (errorEl) errorEl.textContent = result;
            return false;
        }
    }

    form.querySelectorAll('input, textarea').forEach(input => {
        input.addEventListener('blur', () => validateField(input));
        input.addEventListener('input', () => {
            if (input.classList.contains('invalid')) validateField(input);
        });
    });

    // Маска телефона
    const phoneInput = document.getElementById('phone');
    phoneInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.startsWith('8')) value = '7' + value.slice(1);
        if (value && !value.startsWith('7')) value = '7' + value;

        let formatted = '';
        if (value.length > 0) formatted = '+7';
        if (value.length > 1) formatted += ' (' + value.slice(1, 4);
        if (value.length >= 5) formatted += ') ' + value.slice(4, 7);
        if (value.length >= 8) formatted += '-' + value.slice(7, 9);
        if (value.length >= 10) formatted += '-' + value.slice(9, 11);

        e.target.value = formatted;
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const inputs = [...form.querySelectorAll('input, textarea')];
        const allValid = inputs.map(validateField).every(Boolean);

        if (!allValid) {
            statusEl.textContent = 'Пожалуйста, исправьте ошибки в форме';
            statusEl.className = 'status error';
            const firstInvalid = form.querySelector('.invalid');
            if (firstInvalid) firstInvalid.focus();
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Отправка...';
        statusEl.textContent = '';
        statusEl.className = 'status';

        try {
            const response = await fetch('https://jsonplaceholder.typicode.com/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name.value.trim(),
                    phone: form.phone.value.trim(),
                    message: form.message.value.trim(),
                    createdAt: new Date().toISOString(),
                }),
            });

            if (!response.ok) throw new Error('Ошибка сервера');

            statusEl.textContent = '✅ Обращение отправлено! Мы свяжемся с вами в течение рабочего дня.';
            statusEl.className = 'status success';
            form.reset();
        } catch (err) {
            console.error(err);
            statusEl.textContent = '❌ Не удалось отправить. Позвоните нам: +7 (38564) 2-45-10';
            statusEl.className = 'status error';
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Отправить';
        }
    });

    /* -------------------------------------------------------
       10. ГОД В ПОДВАЛЕ
       ------------------------------------------------------- */
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

});