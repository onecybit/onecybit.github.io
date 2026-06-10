const CAT = {

    FILTERS: [
        { filter: 'ctf',         label: 'ctf' },
        { filter: 'labs',        label: 'labs' },
        { filter: 'malware',     label: 'malware' },
        { filter: 'cheatsheets', label: 'cheatsheets' },
    ],

    posts: [],
    activeFilter: null,
    navEl: null,
    articlesGrid: null,
    articlesHeading: null,

    init() {
        const navEl = document.getElementById('js-cyber-nav');
        if (navEl) {
            CAT.initCyber(navEl);
        }
    },

    initCyber(navEl) {
        CAT.navEl = navEl;
        CAT.articlesGrid = document.getElementById('js-articles-grid');
        CAT.articlesHeading = document.getElementById('js-articles-heading');

        const params = new URLSearchParams(window.location.search);
        const f = params.get('filter');
        if (f && typeof f === 'string') {
            const safe = f.trim().slice(0, 30);
            if (CAT.FILTERS.some(function match(t) { return t.filter === safe; })) {
                CAT.activeFilter = safe;
            }
        }

        CAT.bindNav();

        fetch('/posts.json')
            .then(function parseJson(r) { return r.json(); })
            .then(function handleData(posts) {
                CAT.posts = posts.filter(function isCyber(p) {
                    return p.category === 'cybersecurity';
                });
                CAT.posts.sort(function byDate(a, b) {
                    return b.date.localeCompare(a.date);
                });
                CAT.fillCounts();
                CAT.updateNavStates();
                CAT.renderArticles();
            })
            .catch(function handleError() { CAT.renderCyberError(); });
    },

    bindNav() {
        const btns = CAT.navEl.querySelectorAll('.cyber-nav-btn');
        btns.forEach(function bind(btn) {
            btn.addEventListener('click', function handleNavClick(e) {
                // Real links so crawlers reach the subcategory hubs;
                // with JS we intercept and filter in place instead.
                e.preventDefault();
                const f = btn.dataset.filter;
                CAT.activeFilter = (f === 'all') ? null : f;
                CAT.updateNavStates();
                CAT.renderArticles();
                CAT.updateUrl();
            });
        });
    },

    fillCounts() {
        CAT.FILTERS.forEach(function countFilter(t) {
            const n = CAT.posts.filter(function match(p) {
                return p.subcategory === t.filter;
            }).length;
            const el = CAT.navEl.querySelector('[data-subcat="' + t.filter + '"]');
            if (el) { el.textContent = n; }
        });
        const allEl = CAT.navEl.querySelector('[data-subcat="all"]');
        if (allEl) { allEl.textContent = CAT.posts.length; }
    },

    updateNavStates() {
        const btns = CAT.navEl.querySelectorAll('.cyber-nav-btn');
        btns.forEach(function update(btn) {
            const f = btn.dataset.filter;
            const isActive = (f === 'all' && !CAT.activeFilter) ||
                             (f === CAT.activeFilter);
            if (isActive) {
                btn.classList.add('cyber-nav-btn--active');
            } else {
                btn.classList.remove('cyber-nav-btn--active');
            }
        });
    },

    updateUrl() {
        const url = new URL(window.location);
        if (CAT.activeFilter) {
            url.searchParams.set('filter', CAT.activeFilter);
        } else {
            url.searchParams.delete('filter');
        }
        history.replaceState(null, '', url);
    },

    renderArticles() {
        const filtered = CAT.activeFilter
            ? CAT.posts.filter(function match(p) { return p.subcategory === CAT.activeFilter; })
            : CAT.posts;

        if (CAT.articlesHeading) {
            const entry = CAT.activeFilter
                ? CAT.FILTERS.find(function find(t) { return t.filter === CAT.activeFilter; })
                : null;
            CAT.articlesHeading.textContent = entry
                ? '// ' + entry.label
                : '// all articles';
        }

        CAT.articlesGrid.replaceChildren();

        if (!filtered.length) {
            const p = document.createElement('p');
            p.className = 'empty-state';
            p.textContent = 'no posts yet in this category';
            CAT.articlesGrid.appendChild(p);
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'posts-grid';
        filtered.forEach(function addCard(post) {
            grid.appendChild(OCB_CARDS.buildCard(post));
        });
        CAT.articlesGrid.appendChild(grid);
    },

    renderCyberError() {
        if (CAT.articlesGrid) {
            CAT.articlesGrid.replaceChildren();
            const p = document.createElement('p');
            p.className = 'empty-state';
            p.textContent = 'Failed to load posts.';
            CAT.articlesGrid.appendChild(p);
        }
    },

};

document.addEventListener('DOMContentLoaded', function initCat() { CAT.init(); });
