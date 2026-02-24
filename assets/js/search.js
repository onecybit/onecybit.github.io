// search.js — keyword search across posts
// Reads ?q= on page load, filters posts by title / excerpt / tags.
// Debounced input updates results and URL parameter live.

const SEARCH = {

    MAX_QUERY:   100,
    DEBOUNCE_MS: 200,

    posts:     [],
    timer:     null,
    inputEl:   null,
    resultsEl: null,
    countEl:   null,

    BADGE_MAP: {
        writeups:    'cat-badge--writeup',
        cheatsheets: 'cat-badge--cheatsheet',
    },

    init() {
        SEARCH.inputEl   = document.getElementById('js-search-input');
        SEARCH.resultsEl = document.getElementById('js-search-results');
        SEARCH.countEl   = document.getElementById('js-search-count');

        if (!SEARCH.inputEl || !SEARCH.resultsEl) return;

        const form = SEARCH.inputEl.closest('form');
        if (form) { form.addEventListener('submit', SEARCH.handleSubmit); }

        SEARCH.inputEl.addEventListener('input', SEARCH.handleInput);

        fetch('/posts.json')
            .then(function parseJson(r) { return r.json(); })
            .then(function onData(data) {
                SEARCH.posts = data;
                SEARCH.initFromUrl();
            })
            .catch(function onError() { SEARCH.renderError(); });
    },

    initFromUrl() {
        const q = new URLSearchParams(window.location.search).get('q');
        if (!q) return;
        const clean = SEARCH.sanitize(q);
        SEARCH.inputEl.value = clean;
        SEARCH.run(clean);
    },

    handleSubmit(e) {
        e.preventDefault();
    },

    handleInput() {
        clearTimeout(SEARCH.timer);
        SEARCH.timer = setTimeout(function execSearch() {
            const q = SEARCH.sanitize(SEARCH.inputEl.value);
            SEARCH.run(q);
            SEARCH.pushUrl(q);
        }, SEARCH.DEBOUNCE_MS);
    },

    sanitize(raw) {
        return String(raw).trim().slice(0, SEARCH.MAX_QUERY).replace(/[<>"'&]/g, '');
    },

    run(q) {
        if (!q) {
            SEARCH.renderClear();
            return;
        }
        const lower   = q.toLowerCase();
        const matched = SEARCH.posts.filter(function matchPost(p) {
            const inTitle   = p.title.toLowerCase().includes(lower);
            const inExcerpt = p.excerpt.toLowerCase().includes(lower);
            const inTags    = (p.tags || []).some(function matchTag(t) {
                return t.toLowerCase().includes(lower);
            });
            return inTitle || inExcerpt || inTags;
        });
        SEARCH.render(matched, q);
    },

    render(posts, q) {
        SEARCH.resultsEl.replaceChildren();
        SEARCH.setCount(posts.length, q);

        if (!posts.length) {
            const p       = document.createElement('p');
            p.className   = 'empty-state';
            p.textContent = "No posts matched '" + q + "'.";
            SEARCH.resultsEl.appendChild(p);
            return;
        }

        const grid     = document.createElement('div');
        grid.className = 'posts-grid';
        posts.forEach(function addCard(p) {
            grid.appendChild(SEARCH.buildCard(p, q));
        });
        SEARCH.resultsEl.appendChild(grid);
    },

    setCount(n, q) {
        if (!SEARCH.countEl) return;
        const noun = n === 1 ? 'result' : 'results';
        SEARCH.countEl.textContent = n + ' ' + noun + " for '" + q + "'";
    },

    buildCard(post, q) {
        const article     = document.createElement('article');
        article.className = 'post-item';

        const h3     = document.createElement('h3');
        h3.className = 'post-title';
        const a      = document.createElement('a');
        a.href       = post.url;
        SEARCH.highlight(a, post.title, q);
        h3.appendChild(a);

        article.appendChild(SEARCH.buildMeta(post));
        article.appendChild(h3);
        article.appendChild(SEARCH.buildExcerpt(post));
        article.appendChild(SEARCH.buildTagList(post));
        return article;
    },

    buildMeta(post) {
        const meta     = document.createElement('div');
        meta.className = 'post-meta';

        const time = document.createElement('time');
        time.className = 'post-date';
        time.setAttribute('datetime', post.date);
        time.textContent = post.date;

        const badge     = document.createElement('span');
        const cls       = SEARCH.BADGE_MAP[post.subcategory] || 'cat-badge--project';
        badge.className = 'cat-badge ' + cls;
        badge.textContent = post.subcategory || post.category;

        meta.appendChild(time);
        meta.appendChild(badge);
        return meta;
    },

    buildExcerpt(post) {
        const p       = document.createElement('p');
        p.className   = 'post-excerpt';
        p.textContent = post.excerpt;
        return p;
    },

    buildTagList(post) {
        const ul     = document.createElement('ul');
        ul.className = 'post-tags';
        ul.setAttribute('aria-label', 'Tags');
        (post.tags || []).forEach(function addTag(t) {
            const li       = document.createElement('li');
            li.className   = 'post-tag';
            li.textContent = t;
            ul.appendChild(li);
        });
        return ul;
    },

    // Wraps matched substrings in <mark> via DOM nodes — no innerHTML
    highlight(parent, text, q) {
        if (!q) {
            parent.appendChild(document.createTextNode(text));
            return;
        }
        const lower  = text.toLowerCase();
        const lowerQ = q.toLowerCase();
        let   cursor = 0;
        let   idx;

        while ((idx = lower.indexOf(lowerQ, cursor)) !== -1) {
            if (idx > cursor) {
                parent.appendChild(document.createTextNode(text.slice(cursor, idx)));
            }
            const mark = document.createElement('mark');
            mark.appendChild(document.createTextNode(text.slice(idx, idx + q.length)));
            parent.appendChild(mark);
            cursor = idx + q.length;
        }
        if (cursor < text.length) {
            parent.appendChild(document.createTextNode(text.slice(cursor)));
        }
    },

    pushUrl(q) {
        const url = new URL(window.location.href);
        if (q) {
            url.searchParams.set('q', q);
        } else {
            url.searchParams.delete('q');
        }
        history.pushState({}, '', url.toString());
    },

    renderClear() {
        SEARCH.resultsEl.replaceChildren();
        if (SEARCH.countEl) { SEARCH.countEl.textContent = ''; }
    },

    renderError() {
        if (!SEARCH.resultsEl) return;
        SEARCH.resultsEl.replaceChildren();
        const p       = document.createElement('p');
        p.className   = 'empty-state';
        p.textContent = 'Failed to load posts.';
        SEARCH.resultsEl.appendChild(p);
    },

};

document.addEventListener('DOMContentLoaded', function initSearch() { SEARCH.init(); });
