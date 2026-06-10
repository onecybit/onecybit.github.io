const SEARCH = {

    MAX_QUERY:   100,
    DEBOUNCE_MS: 200,

    posts:     [],
    timer:     null,
    inputEl:   null,
    resultsEl: null,
    countEl:   null,

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
        return OCB_CARDS.buildCard(post, function fillTitle(anchor, p) {
            SEARCH.highlight(anchor, p.title, q);
        });
    },

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
        history.replaceState({}, '', url.toString());
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
