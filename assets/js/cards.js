/* Shared post-card DOM builder, used by category.js and search.js.
   Mirrors render_post_card() in build.py — update both if the card
   markup changes. */

const OCB_CARDS = {

    BADGE_MAP: {
        ctf:         'cat-badge--writeup',
        labs:        'cat-badge--writeup',
        malware:     'cat-badge--writeup',
        cheatsheets: 'cat-badge--cheatsheet',
    },

    subcatUrl(category, subcategory) {
        if (subcategory) { return '/' + category + '/' + subcategory + '/'; }
        return '/' + category + '/';
    },

    tagUrl(tag) {
        return '/tags/' + tag + '/';
    },

    /* fillTitle is optional: function(anchorEl, post) that fills the title
       link (search uses it to add <mark> highlights). Defaults to plain text. */
    buildCard(post, fillTitle) {
        const article = document.createElement('article');
        article.className = 'post-item';
        article.dataset.category    = post.category    || '';
        article.dataset.subcategory = post.subcategory || '';

        article.appendChild(OCB_CARDS.buildMeta(post));
        article.appendChild(OCB_CARDS.buildTitle(post, fillTitle));
        article.appendChild(OCB_CARDS.buildExcerpt(post));
        article.appendChild(OCB_CARDS.buildTagList(post));
        return article;
    },

    buildMeta(post) {
        const meta = document.createElement('div');
        meta.className = 'post-meta';

        const time = document.createElement('time');
        time.className = 'post-date';
        time.setAttribute('datetime', post.date);
        time.textContent = post.date;

        const badge = document.createElement('a');
        badge.className = 'cat-badge ' + (OCB_CARDS.BADGE_MAP[post.subcategory] || 'cat-badge--project');
        badge.href = OCB_CARDS.subcatUrl(post.category, post.subcategory);
        badge.textContent = post.subcategory || post.category;

        meta.appendChild(time);
        meta.appendChild(badge);

        if (post.season) {
            const seasonBadge = document.createElement('span');
            seasonBadge.className = 'season-badge';
            seasonBadge.textContent = 'season ' + post.season;
            meta.appendChild(seasonBadge);
        }
        return meta;
    },

    buildTitle(post, fillTitle) {
        const h3 = document.createElement('h3');
        h3.className = 'post-title';
        const a = document.createElement('a');
        a.href = post.url;
        if (fillTitle) {
            fillTitle(a, post);
        } else {
            a.textContent = post.title;
        }
        h3.appendChild(a);
        return h3;
    },

    buildExcerpt(post) {
        const p = document.createElement('p');
        p.className = 'post-excerpt';
        p.textContent = post.excerpt;
        return p;
    },

    buildTagList(post) {
        const ul = document.createElement('ul');
        ul.className = 'post-tags';
        ul.setAttribute('aria-label', 'Tags');
        (post.tags || []).forEach(function addTag(tag) {
            const li      = document.createElement('li');
            const tagLink = document.createElement('a');
            tagLink.className = 'post-tag';
            tagLink.href      = OCB_CARDS.tagUrl(tag);
            tagLink.textContent = tag;
            li.appendChild(tagLink);
            ul.appendChild(li);
        });
        return ul;
    },

};
