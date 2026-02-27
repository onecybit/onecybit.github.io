// category.js — cybersecurity tiles page + generic category listings
// Cybersecurity page: tile click → filter → render articles from posts.json
// Generic pages (projects, etc.): flat listing filtered by data-category

const CAT = {

    TILES: [
        { filter: 'ctf',         label: 'Writeups CTF' },
        { filter: 'labs',        label: 'Labs' },
        { filter: 'malware',     label: 'Malware Analysis' },
        { filter: 'cheatsheets', label: 'Cheatsheets' },
    ],

    BADGE_MAP: {
        ctf:         'cat-badge--writeup',
        labs:        'cat-badge--writeup',
        malware:     'cat-badge--writeup',
        cheatsheets: 'cat-badge--cheatsheet',
    },

    posts: [],
    activeFilter: null,
    tilesEl: null,
    articlesGrid: null,
    articlesHeading: null,

    init() {
        const tilesEl = document.getElementById('js-cyber-tiles');
        if (tilesEl) {
            CAT.initCyber(tilesEl);
            return;
        }

        const container = document.getElementById('js-posts-container');
        if (container) {
            CAT.initGeneric(container);
        }
    },

    // ── Cybersecurity tiles page ─────────────────────────────────────────────

    initCyber(tilesEl) {
        CAT.tilesEl = tilesEl;
        CAT.articlesGrid = document.getElementById('js-articles-grid');
        CAT.articlesHeading = document.getElementById('js-articles-heading');

        const params = new URLSearchParams(window.location.search);
        const f = params.get('filter');
        if (f && typeof f === 'string') {
            const safe = f.trim().slice(0, 30);
            if (CAT.TILES.some(function match(t) { return t.filter === safe; })) {
                CAT.activeFilter = safe;
            }
        }

        CAT.bindTiles();

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
                CAT.updateTileStates();
                CAT.renderArticles();
            })
            .catch(function handleError() { CAT.renderCyberError(); });
    },

    bindTiles() {
        const tiles = CAT.tilesEl.querySelectorAll('.cyber-tile');
        tiles.forEach(function bind(tile) {
            tile.addEventListener('click', function handleTileClick() {
                const f = tile.dataset.filter;
                CAT.activeFilter = (CAT.activeFilter === f) ? null : f;
                CAT.updateTileStates();
                CAT.renderArticles();
                CAT.updateUrl();
            });
        });
    },

    fillCounts() {
        CAT.TILES.forEach(function countTile(t) {
            const n = CAT.posts.filter(function match(p) {
                return p.subcategory === t.filter;
            }).length;
            const el = CAT.tilesEl.querySelector('[data-subcat="' + t.filter + '"]');
            if (el) {
                el.textContent = String(n).padStart(2, '0');
            }
        });
    },

    updateTileStates() {
        const tiles = CAT.tilesEl.querySelectorAll('.cyber-tile');
        tiles.forEach(function update(tile) {
            if (tile.dataset.filter === CAT.activeFilter) {
                tile.classList.add('cyber-tile--active');
            } else {
                tile.classList.remove('cyber-tile--active');
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
            const tile = CAT.activeFilter
                ? CAT.TILES.find(function find(t) { return t.filter === CAT.activeFilter; })
                : null;
            CAT.articlesHeading.textContent = tile
                ? '// ' + tile.label.toLowerCase()
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

    // ── Generic category page (projects, etc.) ──────────────────────────────

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

        const grid = document.createElement('div');
        grid.className = 'posts-grid';
        filtered.forEach(function addCard(p) { grid.appendChild(CAT.buildCard(p)); });
        container.appendChild(grid);
    },

    renderGenericError(container) {
        container.replaceChildren();
        const p = document.createElement('p');
        p.className = 'empty-state';
        p.textContent = 'Failed to load posts.';
        container.appendChild(p);
    },

    // ── Shared ──────────────────────────────────────────────────────────────

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
