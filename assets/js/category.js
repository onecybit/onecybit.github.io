const CAT = {

    FILTERS: [
        { filter: 'ctf',         label: 'ctf' },
        { filter: 'labs',        label: 'labs' },
        { filter: 'malware',     label: 'malware' },
        { filter: 'cheatsheets', label: 'cheatsheets' },
    ],

    BADGE_MAP: {
        ctf:         'cat-badge--writeup',
        labs:        'cat-badge--writeup',
        malware:     'cat-badge--writeup',
        cheatsheets: 'cat-badge--cheatsheet',
    },

    posts: [],
    activeFilter: null,
    navEl: null,
    articlesGrid: null,
    articlesHeading: null,

    init() {
        const navEl = document.getElementById('js-cyber-nav');
        if (navEl) {
            CAT.initCyber(navEl);
            return;
        }

        const container = document.getElementById('js-posts-container');
        if (container) {
            CAT.initGeneric(container);
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
            btn.addEventListener('click', function handleNavClick() {
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
            grid.appendChild(CAT.buildCard(post));
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

    PROJECT_NAMES: {
        'vless-vpn': 'vless-vpn server',
    },

    initGeneric(container) {
        fetch('/posts.json')
            .then(function parseJson(r) { return r.json(); })
            .then(function handleData(posts) { CAT.renderGeneric(posts, container); })
            .catch(function handleError() { CAT.renderGenericError(container); });
    },

    renderGeneric(posts, container) {
        const filterCat    = container.dataset.category    || '';
        const filterSubcat = container.dataset.subcategory || '';

        const filtered = posts.filter(function matchPost(p) {
            const catOk    = !filterCat    || p.category    === filterCat;
            const subcatOk = !filterSubcat || p.subcategory === filterSubcat;
            return catOk && subcatOk;
        });

        container.replaceChildren();

        if (!filtered.length) {
            CAT.renderEmpty(container);
            return;
        }

        if (filterCat === 'projects') {
            CAT.renderGrouped(filtered, container);
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'posts-grid';
        filtered.forEach(function addCard(p) { grid.appendChild(CAT.buildCard(p)); });
        container.appendChild(grid);
    },

    renderGrouped(posts, container) {
        const groups = {};
        const order = [];

        posts.forEach(function groupPost(p) {
            const key = p.subcategory || '_ungrouped';
            if (!groups[key]) {
                groups[key] = [];
                order.push(key);
            }
            groups[key].push(p);
        });

        order.forEach(function sortGroup(key) {
            groups[key].sort(function byDate(a, b) {
                return a.date.localeCompare(b.date);
            });
        });

        order.forEach(function renderGroup(key) {
            const section = document.createElement('div');
            section.className = 'project-group';

            const heading = document.createElement('h2');
            heading.className = 'project-group-title';
            const label = CAT.PROJECT_NAMES[key] || key.replace(/-/g, ' ');
            heading.textContent = '// ' + label;
            section.appendChild(heading);

            const grid = document.createElement('div');
            grid.className = 'posts-grid';
            groups[key].forEach(function addCard(p) {
                grid.appendChild(CAT.buildCard(p));
            });
            section.appendChild(grid);

            container.appendChild(section);
        });
    },

    renderGenericError(container) {
        container.replaceChildren();
        const p = document.createElement('p');
        p.className = 'empty-state';
        p.textContent = 'Failed to load posts.';
        container.appendChild(p);
    },

    buildCard(post) {
        const article = document.createElement('article');
        article.className = 'post-item';

        const meta = document.createElement('div');
        meta.className = 'post-meta';

        const time = document.createElement('time');
        time.className = 'post-date';
        time.setAttribute('datetime', post.date);
        time.textContent = post.date;

        const badge = document.createElement('span');
        badge.className = 'cat-badge ' + (CAT.BADGE_MAP[post.subcategory] || 'cat-badge--project');
        badge.textContent = post.subcategory || post.category;

        meta.appendChild(time);
        meta.appendChild(badge);

        if (post.season) {
            const seasonBadge = document.createElement('span');
            seasonBadge.className = 'season-badge';
            seasonBadge.textContent = 'season ' + post.season;
            meta.appendChild(seasonBadge);
        }

        const h3 = document.createElement('h3');
        h3.className = 'post-title';

        const a = document.createElement('a');
        a.href = post.url;
        a.textContent = post.title;

        h3.appendChild(a);

        const excerpt = document.createElement('p');
        excerpt.className = 'post-excerpt';
        excerpt.textContent = post.excerpt;

        const tagList = document.createElement('ul');
        tagList.className = 'post-tags';
        tagList.setAttribute('aria-label', 'Tags');

        (post.tags || []).forEach(function addTag(tag) {
            const li = document.createElement('li');
            li.className = 'post-tag';
            li.textContent = tag;
            tagList.appendChild(li);
        });

        article.appendChild(meta);
        article.appendChild(h3);
        article.appendChild(excerpt);
        article.appendChild(tagList);
        return article;
    },

    renderEmpty(container) {
        const p = document.createElement('p');
        p.className = 'empty-state';
        p.textContent = 'No posts yet. Check back soon.';
        container.appendChild(p);
    },

};

document.addEventListener('DOMContentLoaded', function initCat() { CAT.init(); });
