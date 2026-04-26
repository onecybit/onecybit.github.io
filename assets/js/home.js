const HOME = {

    BADGE_MAP: {
        ctf:         'cat-badge--writeup',
        labs:        'cat-badge--writeup',
        malware:     'cat-badge--writeup',
        cheatsheets: 'cat-badge--cheatsheet',
    },

    init() {
        fetch('/posts.json')
            .then(function parseJson(r) { return r.json(); })
            .then(function handleData(posts) {
                HOME.renderRecent(posts);
                HOME.renderStats(posts);
            })
            .catch(function handleError() { HOME.renderError(); });
    },

    renderRecent(posts) {
        const container = document.getElementById('js-recent-grid');
        if (!container) return;

        const sorted = posts.slice().sort(function byDate(a, b) {
            return b.date.localeCompare(a.date);
        });
        const top3 = sorted.slice(0, 3);

        container.replaceChildren();

        const grid = document.createElement('div');
        grid.className = 'posts-grid';
        top3.forEach(function addCard(post) {
            grid.appendChild(HOME.buildCard(post));
        });
        container.appendChild(grid);
    },

    renderStats(posts) {
        const unique = function collectUnique(key) {
            const set = new Set();
            posts.forEach(function add(p) {
                if (Array.isArray(p[key])) {
                    p[key].forEach(function addItem(v) { set.add(v); });
                } else if (p[key]) {
                    set.add(p[key]);
                }
            });
            return set.size;
        };

        HOME.setStat('js-stat-posts', posts.length);
        HOME.setStat('js-stat-tags', unique('tags'));
        HOME.setStat('js-stat-categories', unique('category'));
    },

    setStat(id, value) {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = String(value).padStart(2, '0');
        }
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
        badge.className = 'cat-badge ' + (HOME.BADGE_MAP[post.subcategory] || 'cat-badge--project');
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

    renderError() {
        const container = document.getElementById('js-recent-grid');
        if (!container) return;
        container.replaceChildren();
        const p = document.createElement('p');
        p.className = 'empty-state';
        p.textContent = 'Failed to load posts.';
        container.appendChild(p);
    },

};

document.addEventListener('DOMContentLoaded', function initHome() { HOME.init(); });
