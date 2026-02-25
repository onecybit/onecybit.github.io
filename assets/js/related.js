const OCB_RELATED = {

    init() {
        const section = document.getElementById('js-related-posts');
        const grid    = document.getElementById('js-related-grid');
        if (!section || !grid) return;

        const currentTags = this.readCurrentTags();
        if (!currentTags.length) return;

        const currentUrl = window.location.pathname.replace(/\/$/, '');

        this.fetchPosts(function(posts) {
            const related = OCB_RELATED.filterAndSort(posts, currentTags, currentUrl);
            if (!related.length) return;
            OCB_RELATED.render(related, grid);
            section.removeAttribute('hidden');
        });
    },

    // ── Tag reader ─────────────────────────────────────────────────────────────

    readCurrentTags() {
        const tagEls = document.querySelectorAll('.post-full-tags .post-tag');
        return Array.from(tagEls).map(function(el) {
            return el.textContent.trim();
        });
    },

    // ── Fetch posts.json ───────────────────────────────────────────────────────

    fetchPosts(callback) {
        fetch('/posts.json')
            .then(function(res) {
                if (!res.ok) throw new Error('fetch failed');
                return res.json();
            })
            .then(callback)
            .catch(function() {
                // posts.json unavailable — section stays hidden
            });
    },

    // ── Filter + sort ──────────────────────────────────────────────────────────

    filterAndSort(posts, currentTags, currentUrl) {
        return posts
            .filter(function(post) {
                const postUrl = (post.url || '').replace(/\/$/, '');
                if (postUrl === currentUrl) return false;
                return (post.tags || []).some(function(tag) {
                    return currentTags.indexOf(tag) !== -1;
                });
            })
            .sort(function(a, b) {
                const aCount = (a.tags || []).filter(function(t) {
                    return currentTags.indexOf(t) !== -1;
                }).length;
                const bCount = (b.tags || []).filter(function(t) {
                    return currentTags.indexOf(t) !== -1;
                }).length;
                if (bCount !== aCount) return bCount - aCount;
                return new Date(b.date) - new Date(a.date);
            })
            .slice(0, 3);
    },

    // ── Render ─────────────────────────────────────────────────────────────────

    render(posts, grid) {
        posts.forEach(function(post) {
            grid.appendChild(OCB_RELATED.buildCard(post));
        });
    },

    buildCard(post) {
        const article = document.createElement('article');
        article.className = 'post-item';

        article.appendChild(OCB_RELATED.buildMeta(post));

        const titleEl = document.createElement('h3');
        titleEl.className = 'post-title';
        const link = document.createElement('a');
        link.href = post.url || '#';
        link.textContent = post.title || '';
        titleEl.appendChild(link);
        article.appendChild(titleEl);

        const excerpt = document.createElement('p');
        excerpt.className = 'post-excerpt';
        excerpt.textContent = post.excerpt || '';
        article.appendChild(excerpt);

        article.appendChild(OCB_RELATED.buildTagList(post.tags || []));
        return article;
    },

    buildMeta(post) {
        const meta = document.createElement('div');
        meta.className = 'post-meta';

        const dateEl = document.createElement('time');
        dateEl.className = 'post-date';
        dateEl.setAttribute('datetime', post.date || '');
        dateEl.textContent = post.date || '';
        meta.appendChild(dateEl);

        const sub        = post.subcategory || '';
        const badgeClass = sub === 'writeups'    ? 'cat-badge--writeup'
                         : sub === 'cheatsheets' ? 'cat-badge--cheatsheet'
                         : 'cat-badge--project';
        const badge = document.createElement('span');
        badge.className = 'cat-badge ' + badgeClass;
        badge.textContent = sub || post.category || '';
        meta.appendChild(badge);

        return meta;
    },

    buildTagList(tags) {
        const list = document.createElement('ul');
        list.className = 'post-tags';
        list.setAttribute('aria-label', 'Tags');
        tags.forEach(function(tag) {
            const li = document.createElement('li');
            li.className = 'post-tag';
            li.textContent = tag;
            list.appendChild(li);
        });
        return list;
    },

};

document.addEventListener('DOMContentLoaded', function() { OCB_RELATED.init(); });
