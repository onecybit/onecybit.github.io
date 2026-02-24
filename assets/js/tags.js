// tags.js — tag cloud and post filtering for tags/index.html
// Reads ?tag= on page load and applies filter.
// Event delegation on the cloud container handles tag button clicks.

const TAGS = {

    BADGE_MAP: {
        writeups:    'cat-badge--writeup',
        cheatsheets: 'cat-badge--cheatsheet',
    },

    posts:     [],
    activeTag: '',
    cloudEl:   null,
    filterBar: null,
    activeEl:  null,
    postsEl:   null,

    init() {
        TAGS.cloudEl   = document.getElementById('js-tag-cloud');
        TAGS.filterBar = document.getElementById('js-tag-filter-bar');
        TAGS.activeEl  = document.getElementById('js-tag-active');
        TAGS.postsEl   = document.getElementById('js-tag-posts');

        const clearBtn = document.getElementById('js-tag-clear');
        if (!TAGS.cloudEl) return;

        if (clearBtn) { clearBtn.addEventListener('click', TAGS.handleClear); }
        TAGS.cloudEl.addEventListener('click', TAGS.handleTagClick);

        fetch('/posts.json')
            .then(function parseJson(r) { return r.json(); })
            .then(function onData(data) {
                TAGS.posts = data;
                TAGS.buildCloud();
                TAGS.initFromUrl();
            })
            .catch(function onError() { TAGS.renderError(); });
    },

    buildCloud() {
        const counts = {};
        TAGS.posts.forEach(function countTags(p) {
            (p.tags || []).forEach(function tally(t) {
                counts[t] = (counts[t] || 0) + 1;
            });
        });

        const sorted = Object.keys(counts).sort();
        TAGS.cloudEl.replaceChildren();
        sorted.forEach(function addBtn(tag) {
            TAGS.cloudEl.appendChild(TAGS.buildTagBtn(tag, counts[tag]));
        });
    },

    buildTagBtn(tag, count) {
        const btn     = document.createElement('button');
        btn.type      = 'button';
        btn.className = 'tag-btn';
        btn.setAttribute('data-tag', tag);
        btn.setAttribute('aria-pressed', 'false');

        const nameSpan       = document.createElement('span');
        nameSpan.className   = 'tag-btn-name';
        nameSpan.textContent = '#' + tag;

        const countSpan       = document.createElement('span');
        countSpan.className   = 'tag-btn-count';
        countSpan.textContent = '(' + count + ')';

        btn.appendChild(nameSpan);
        btn.appendChild(countSpan);
        return btn;
    },

    // Event delegation — single listener on the cloud container
    handleTagClick(e) {
        const btn = e.target.closest('.tag-btn');
        if (!btn) return;
        const tag = btn.getAttribute('data-tag');
        if (!tag) return;

        if (TAGS.activeTag === tag) {
            TAGS.clearFilter();
        } else {
            TAGS.applyFilter(tag);
        }
        TAGS.pushUrl(TAGS.activeTag);
    },

    initFromUrl() {
        const tag = new URLSearchParams(window.location.search).get('tag');
        if (tag) { TAGS.applyFilter(tag); }
    },

    applyFilter(tag) {
        TAGS.activeTag = tag;

        TAGS.cloudEl.querySelectorAll('.tag-btn').forEach(function setPressed(btn) {
            const on = btn.getAttribute('data-tag') === tag;
            btn.classList.toggle('is-active', on);
            btn.setAttribute('aria-pressed', String(on));
        });

        if (TAGS.filterBar) { TAGS.filterBar.hidden = false; }
        if (TAGS.activeEl)  { TAGS.activeEl.textContent = '#' + tag; }

        const matched = TAGS.posts.filter(function matchPost(p) {
            return (p.tags || []).includes(tag);
        });
        TAGS.renderPosts(matched);
    },

    handleClear() {
        TAGS.clearFilter();
        TAGS.pushUrl('');
    },

    clearFilter() {
        TAGS.activeTag = '';

        TAGS.cloudEl.querySelectorAll('.tag-btn').forEach(function deactivate(btn) {
            btn.classList.remove('is-active');
            btn.setAttribute('aria-pressed', 'false');
        });

        if (TAGS.filterBar) { TAGS.filterBar.hidden = true; }
        TAGS.renderPosts([]);
    },

    renderPosts(posts) {
        if (!TAGS.postsEl) return;
        TAGS.postsEl.replaceChildren();
        if (!posts.length) return;

        const grid     = document.createElement('div');
        grid.className = 'posts-grid';
        posts.forEach(function addCard(p) {
            grid.appendChild(TAGS.buildCard(p));
        });
        TAGS.postsEl.appendChild(grid);
    },

    buildCard(post) {
        const article     = document.createElement('article');
        article.className = 'post-item';

        const h3     = document.createElement('h3');
        h3.className = 'post-title';
        const a      = document.createElement('a');
        a.href       = post.url;
        a.textContent = post.title;   // textContent — XSS safe
        h3.appendChild(a);

        article.appendChild(TAGS.buildMeta(post));
        article.appendChild(h3);
        article.appendChild(TAGS.buildExcerpt(post));
        article.appendChild(TAGS.buildTagList(post));
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
        const cls       = TAGS.BADGE_MAP[post.subcategory] || 'cat-badge--project';
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

    pushUrl(tag) {
        const url = new URL(window.location.href);
        if (tag) {
            url.searchParams.set('tag', tag);
        } else {
            url.searchParams.delete('tag');
        }
        history.pushState({}, '', url.toString());
    },

    renderError() {
        if (!TAGS.cloudEl) return;
        TAGS.cloudEl.replaceChildren();
        const p       = document.createElement('p');
        p.className   = 'empty-state';
        p.textContent = 'Failed to load tags.';
        TAGS.cloudEl.appendChild(p);
    },

};

document.addEventListener('DOMContentLoaded', function initTags() { TAGS.init(); });
