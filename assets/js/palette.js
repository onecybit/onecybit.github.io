/* Command palette — site-wide search overlay.
   Opened with Ctrl/Cmd+K or "/" from any page, or the header search button.
   Reads posts.json lazily on first open and matches title, tags, excerpt and
   indexed body text. All result DOM is built with createElement — never
   innerHTML — because post fields are untrusted content. */

const OCB_PALETTE = {

    MAX_QUERY:   100,
    MAX_RESULTS: 8,
    DEBOUNCE_MS: 120,

    /* Static destinations, always searchable alongside posts. */
    LINKS: [
        { label: 'Home',          url: '/' },
        { label: 'Cybersecurity', url: '/cybersecurity/' },
        { label: 'CTF',           url: '/cybersecurity/ctf/' },
        { label: 'Labs',          url: '/cybersecurity/labs/' },
        { label: 'Malware',       url: '/cybersecurity/malware/' },
        { label: 'Cheatsheets',   url: '/cybersecurity/cheatsheets/' },
        { label: 'Projects',      url: '/projects/' },
        { label: 'News',          url: '/news/' },
        { label: 'Notes',         url: '/notes/' },
        { label: 'Tags',          url: '/tags/' },
        { label: 'About',         url: '/about.html' },
        { label: 'RSS feed',      url: '/feed.xml' },
    ],

    posts:     [],
    loaded:    false,
    loading:   false,
    items:     [],
    cursor:    0,
    timer:     null,
    lastFocus: null,

    overlay:  null,
    inputEl:  null,
    listEl:   null,
    statusEl: null,

    init() {
        OCB_PALETTE.build();
        document.addEventListener('keydown', OCB_PALETTE.handleHotkey);
        document.querySelectorAll('.js-palette-open').forEach(function bind(btn) {
            btn.addEventListener('click', OCB_PALETTE.open);
        });
    },

    /* ── DOM construction ── */

    build() {
        const overlay = document.createElement('div');
        overlay.className = 'palette';
        overlay.id = 'js-palette';
        overlay.hidden = true;
        overlay.addEventListener('click', OCB_PALETTE.handleBackdrop);

        const panel = document.createElement('div');
        panel.className = 'palette-panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-modal', 'true');
        panel.setAttribute('aria-label', 'Search posts');

        panel.appendChild(OCB_PALETTE.buildHeader());
        panel.appendChild(OCB_PALETTE.buildList());
        panel.appendChild(OCB_PALETTE.buildFooter());

        overlay.appendChild(panel);
        document.body.appendChild(overlay);
        OCB_PALETTE.overlay = overlay;
    },

    buildHeader() {
        const header = document.createElement('div');
        header.className = 'palette-header';

        const prompt = document.createElement('span');
        prompt.className = 'palette-prompt';
        prompt.setAttribute('aria-hidden', 'true');
        prompt.textContent = '>';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'palette-input';
        input.id = 'js-palette-input';
        input.placeholder = 'search posts, tags, content...';
        input.autocomplete = 'off';
        input.maxLength = OCB_PALETTE.MAX_QUERY;
        input.setAttribute('role', 'combobox');
        input.setAttribute('aria-expanded', 'true');
        input.setAttribute('aria-controls', 'js-palette-list');
        input.setAttribute('aria-autocomplete', 'list');
        input.setAttribute('aria-label', 'Search posts');
        input.addEventListener('input', OCB_PALETTE.handleInput);

        header.appendChild(prompt);
        header.appendChild(input);
        OCB_PALETTE.inputEl = input;
        return header;
    },

    buildList() {
        const list = document.createElement('ul');
        list.className = 'palette-list';
        list.id = 'js-palette-list';
        list.setAttribute('role', 'listbox');
        list.setAttribute('aria-label', 'Search results');
        OCB_PALETTE.listEl = list;
        return list;
    },

    buildFooter() {
        const footer = document.createElement('div');
        footer.className = 'palette-footer';

        const status = document.createElement('span');
        status.className = 'palette-status';
        status.setAttribute('aria-live', 'polite');
        status.setAttribute('aria-atomic', 'true');

        const hint = document.createElement('span');
        hint.className = 'palette-hint';
        hint.setAttribute('aria-hidden', 'true');
        hint.textContent = '↑↓ navigate · enter open · esc close';

        footer.appendChild(status);
        footer.appendChild(hint);
        OCB_PALETTE.statusEl = status;
        return footer;
    },

    /* ── Open and close ── */

    open(event) {
        if (event) { event.preventDefault(); }
        if (!OCB_PALETTE.overlay || !OCB_PALETTE.overlay.hidden) return;

        OCB_PALETTE.lastFocus = document.activeElement;
        OCB_PALETTE.overlay.hidden = false;
        document.body.classList.add('palette-open');
        OCB_PALETTE.inputEl.value = '';
        OCB_PALETTE.inputEl.focus();
        OCB_PALETTE.render(OCB_PALETTE.search(''), '');
        OCB_PALETTE.load();
    },

    close() {
        if (!OCB_PALETTE.overlay || OCB_PALETTE.overlay.hidden) return;
        clearTimeout(OCB_PALETTE.timer);
        OCB_PALETTE.overlay.hidden = true;
        document.body.classList.remove('palette-open');
        if (OCB_PALETTE.lastFocus && OCB_PALETTE.lastFocus.focus) {
            OCB_PALETTE.lastFocus.focus();
        }
    },

    isOpen() {
        return Boolean(OCB_PALETTE.overlay) && !OCB_PALETTE.overlay.hidden;
    },

    load() {
        if (OCB_PALETTE.loaded || OCB_PALETTE.loading) return;
        OCB_PALETTE.loading = true;

        fetch('/posts.json')
            .then(function parseJson(r) { return r.json(); })
            .then(function onData(data) {
                OCB_PALETTE.posts   = Array.isArray(data) ? data : [];
                OCB_PALETTE.loaded  = true;
                OCB_PALETTE.loading = false;
                if (OCB_PALETTE.isOpen()) { OCB_PALETTE.runNow(); }
            })
            .catch(function onError() {
                OCB_PALETTE.loading = false;
                OCB_PALETTE.setStatus('Could not load the post index.');
            });
    },

    /* ── Event handlers ── */

    handleHotkey(e) {
        const hotK = (e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K');

        if (hotK) {
            e.preventDefault();
            if (OCB_PALETTE.isOpen()) { OCB_PALETTE.close(); } else { OCB_PALETTE.open(); }
            return;
        }

        if (OCB_PALETTE.isOpen()) {
            OCB_PALETTE.handleNavKey(e);
            return;
        }

        if (e.key === '/' && !OCB_PALETTE.isTyping(e.target)) {
            e.preventDefault();
            OCB_PALETTE.open();
        }
    },

    handleNavKey(e) {
        if (e.key === 'Escape') {
            e.preventDefault();
            OCB_PALETTE.close();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            OCB_PALETTE.move(1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            OCB_PALETTE.move(-1);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            OCB_PALETTE.activate();
        } else if (e.key === 'Tab') {
            e.preventDefault();
            OCB_PALETTE.inputEl.focus();
        }
    },

    handleBackdrop(e) {
        if (e.target === OCB_PALETTE.overlay) { OCB_PALETTE.close(); }
    },

    handleInput() {
        clearTimeout(OCB_PALETTE.timer);
        OCB_PALETTE.timer = setTimeout(OCB_PALETTE.runNow, OCB_PALETTE.DEBOUNCE_MS);
    },

    runNow() {
        const q = OCB_PALETTE.sanitize(OCB_PALETTE.inputEl.value);
        OCB_PALETTE.render(OCB_PALETTE.search(q), q);
    },

    isTyping(el) {
        if (!el) return false;
        const tag = el.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
    },

    sanitize(raw) {
        return String(raw).trim().slice(0, OCB_PALETTE.MAX_QUERY).replace(/[<>"'&]/g, '');
    },

    /* ── Matching ── */

    /* Returns up to MAX_RESULTS items of { kind, label, url, meta, score }.
       Lower score sorts first: a title hit beats a tag hit beats body text. */
    search(q) {
        const lower = q.toLowerCase();

        if (!lower) {
            return OCB_PALETTE.posts.slice(0, OCB_PALETTE.MAX_RESULTS)
                .map(OCB_PALETTE.toPostItem);
        }

        const hits = [];
        OCB_PALETTE.posts.forEach(function scorePost(p) {
            const score = OCB_PALETTE.scorePost(p, lower);
            if (score === null) return;
            const item = OCB_PALETTE.toPostItem(p);
            item.score = score;
            hits.push(item);
        });

        OCB_PALETTE.LINKS.forEach(function scoreLink(l) {
            if (!l.label.toLowerCase().includes(lower)) return;
            hits.push({ kind: 'page', label: l.label, url: l.url, meta: 'page', score: 1 });
        });

        hits.sort(function byScore(a, b) { return a.score - b.score; });
        return hits.slice(0, OCB_PALETTE.MAX_RESULTS);
    },

    scorePost(p, lower) {
        if ((p.title || '').toLowerCase().includes(lower))  return 0;
        if ((p.tags || []).some(function hit(t) {
            return String(t).toLowerCase().includes(lower);
        })) return 2;
        if ((p.excerpt || '').toLowerCase().includes(lower)) return 3;
        if ((p.text || '').toLowerCase().includes(lower))    return 4;
        return null;
    },

    toPostItem(p) {
        const meta = [p.subcategory || p.category, p.date]
            .filter(Boolean).join(' · ');
        return { kind: 'post', label: p.title, url: p.url, meta: meta, score: 0 };
    },

    /* ── Rendering ── */

    render(items, q) {
        OCB_PALETTE.items  = items;
        OCB_PALETTE.cursor = 0;
        OCB_PALETTE.listEl.replaceChildren();

        if (!items.length) {
            OCB_PALETTE.setStatus(OCB_PALETTE.loaded
                ? 'No matches'
                : 'Loading index...');
            OCB_PALETTE.inputEl.removeAttribute('aria-activedescendant');
            return;
        }

        items.forEach(function addRow(item, i) {
            OCB_PALETTE.listEl.appendChild(OCB_PALETTE.buildRow(item, i, q));
        });

        const noun = items.length === 1 ? 'result' : 'results';
        OCB_PALETTE.setStatus(items.length + ' ' + noun + (q ? '' : ' · latest posts'));
        OCB_PALETTE.highlightCursor();
    },

    buildRow(item, index, q) {
        const li = document.createElement('li');
        li.className = 'palette-item';
        li.id = 'js-palette-item-' + index;
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', 'false');
        li.dataset.index = String(index);
        li.addEventListener('click', OCB_PALETTE.handleRowClick);

        const label = document.createElement('span');
        label.className = 'palette-item-label';
        OCB_PALETTE.fillHighlighted(label, item.label, q);

        const meta = document.createElement('span');
        meta.className = 'palette-item-meta';
        meta.textContent = item.meta;

        li.appendChild(label);
        li.appendChild(meta);
        return li;
    },

    /* Appends text to parent, wrapping each case-insensitive match of q in
       <mark>. Text nodes only — no markup is ever parsed from post data. */
    fillHighlighted(parent, text, q) {
        const value = String(text || '');
        if (!q) {
            parent.appendChild(document.createTextNode(value));
            return;
        }
        const lower  = value.toLowerCase();
        const lowerQ = q.toLowerCase();
        let   cursor = 0;
        let   idx    = lower.indexOf(lowerQ);

        while (idx !== -1) {
            if (idx > cursor) {
                parent.appendChild(document.createTextNode(value.slice(cursor, idx)));
            }
            const mark = document.createElement('mark');
            mark.appendChild(document.createTextNode(value.slice(idx, idx + q.length)));
            parent.appendChild(mark);
            cursor = idx + q.length;
            idx = lower.indexOf(lowerQ, cursor);
        }
        if (cursor < value.length) {
            parent.appendChild(document.createTextNode(value.slice(cursor)));
        }
    },

    setStatus(msg) {
        if (OCB_PALETTE.statusEl) { OCB_PALETTE.statusEl.textContent = msg; }
    },

    /* ── Selection ── */

    move(delta) {
        const n = OCB_PALETTE.items.length;
        if (!n) return;
        OCB_PALETTE.cursor = (OCB_PALETTE.cursor + delta + n) % n;
        OCB_PALETTE.highlightCursor();
    },

    highlightCursor() {
        const rows = OCB_PALETTE.listEl.querySelectorAll('.palette-item');
        rows.forEach(function mark(row, i) {
            const active = i === OCB_PALETTE.cursor;
            row.classList.toggle('is-active', active);
            row.setAttribute('aria-selected', active ? 'true' : 'false');
            if (active) {
                OCB_PALETTE.inputEl.setAttribute('aria-activedescendant', row.id);
                row.scrollIntoView({ block: 'nearest' });
            }
        });
    },

    handleRowClick() {
        OCB_PALETTE.cursor = Number(this.dataset.index) || 0;
        OCB_PALETTE.activate();
    },

    activate() {
        const item = OCB_PALETTE.items[OCB_PALETTE.cursor];
        if (!item || !OCB_PALETTE.isSafeUrl(item.url)) return;
        OCB_PALETTE.close();
        window.location.assign(item.url);
    },

    /* Only same-origin, root-relative paths from the index are navigable. */
    isSafeUrl(url) {
        return typeof url === 'string'
            && url.charAt(0) === '/'
            && url.charAt(1) !== '/';
    },

};

document.addEventListener('DOMContentLoaded', function initPalette() {
    OCB_PALETTE.init();
});
