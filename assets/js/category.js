// category.js — post listing pages
// Fetches /posts.json and renders filtered post cards.
// Data attributes on #js-posts-container drive behaviour:
//   data-category    — filter by category (required)
//   data-subcategory — further filter by subcategory (optional)
// When only data-category is set, posts are grouped by subcategory.

const CAT = {

    // Subcategory display order on the grouped category page
    SUBCAT_ORDER: ['writeups', 'cheatsheets'],

    BADGE_MAP: {
        writeups:    'cat-badge--writeup',
        cheatsheets: 'cat-badge--cheatsheet',
    },

    init() {
        const container = document.getElementById('js-posts-container');
        if (!container) return;

        fetch('/posts.json')
            .then(function parseJson(r) { return r.json(); })
            .then(function handleData(posts) { CAT.render(posts, container); })
            .catch(function handleError() { CAT.renderError(container); });
    },

    render(posts, container) {
        const filterCat    = container.dataset.category    || '';
        const filterSubcat = container.dataset.subcategory || '';

        const filtered = posts.filter(function matchPost(p) {
            const catOk    = !filterCat    || p.category    === filterCat;
            const subcatOk = !filterSubcat || p.subcategory === filterSubcat;
            return catOk && subcatOk;
        });

        container.replaceChildren();

        if (filterCat && !filterSubcat) {
            CAT.renderGrouped(filtered, container, filterCat);
        } else {
            CAT.renderFlat(filtered, container);
        }
    },

    renderGrouped(posts, container, category) {
        const groups = {};
        posts.forEach(function groupPost(p) {
            const sub = p.subcategory || 'other';
            if (!groups[sub]) groups[sub] = [];
            groups[sub].push(p);
        });

        // Render in defined order, then any remaining subcategories
        const ordered = CAT.SUBCAT_ORDER.filter(function known(s) {
            return groups[s];
        });
        const rest = Object.keys(groups).filter(function unknown(s) {
            return !CAT.SUBCAT_ORDER.includes(s);
        });

        const subs = ordered.concat(rest);

        if (!subs.length) {
            CAT.renderEmpty(container);
            return;
        }

        subs.forEach(function buildSec(sub) {
            container.appendChild(
                CAT.buildSubcatSection(sub, groups[sub], category)
            );
        });
    },

    renderFlat(posts, container) {
        if (!posts.length) {
            CAT.renderEmpty(container);
            return;
        }
        const grid = document.createElement('div');
        grid.className = 'posts-grid';
        posts.forEach(function addCard(p) { grid.appendChild(CAT.buildCard(p)); });
        container.appendChild(grid);
    },

    buildSubcatSection(sub, posts, category) {
        const section = document.createElement('section');
        section.className = 'subcat-section';
        section.setAttribute('aria-label', sub);

        const header = document.createElement('div');
        header.className = 'subcat-header';

        const title = document.createElement('h2');
        title.className = 'section-title';
        title.textContent = '// ' + sub;

        const link = document.createElement('a');
        link.href      = '/' + category + '/' + sub + '/';
        link.className = 'view-all';
        link.textContent = 'view all →';

        header.appendChild(title);
        header.appendChild(link);

        const grid = document.createElement('div');
        grid.className = 'posts-grid';
        posts.forEach(function addCard(p) { grid.appendChild(CAT.buildCard(p)); });

        section.appendChild(header);
        section.appendChild(grid);
        return section;
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

        const h3 = document.createElement('h3');
        h3.className = 'post-title';

        const a = document.createElement('a');
        a.href = post.url;
        a.textContent = post.title;   // textContent — XSS safe

        h3.appendChild(a);

        const excerpt = document.createElement('p');
        excerpt.className = 'post-excerpt';
        excerpt.textContent = post.excerpt;   // textContent — XSS safe

        const tagList = document.createElement('ul');
        tagList.className = 'post-tags';
        tagList.setAttribute('aria-label', 'Tags');

        (post.tags || []).forEach(function addTag(tag) {
            const li = document.createElement('li');
            li.className = 'post-tag';
            li.textContent = tag;   // textContent — XSS safe
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

    renderError(container) {
        container.replaceChildren();
        const p = document.createElement('p');
        p.className = 'empty-state';
        p.textContent = 'Failed to load posts.';
        container.appendChild(p);
    },

};

document.addEventListener('DOMContentLoaded', function initCat() { CAT.init(); });
