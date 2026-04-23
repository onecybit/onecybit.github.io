// news.js — live cybersecurity news aggregation for news/index.html
// Fetches RSS feeds via rss2json.com proxy, renders cards, supports ?source= filter.

const NEWS = {

    FEEDS: {
        hackernews: {
            label: 'The Hacker News',
            url: 'https://feeds.feedburner.com/TheHackersNews',
        },
        bleeping: {
            label: 'BleepingComputer',
            url: 'https://www.bleepingcomputer.com/feed/',
        },
        krebs: {
            label: 'Krebs on Security',
            url: 'https://krebsonsecurity.com/feed/',
        },
        darkreading: {
            label: 'Dark Reading',
            url: 'https://www.darkreading.com/rss/all.xml',
        },
    },

    API_BASE: 'https://api.rss2json.com/v1/api.json?rss_url=',

    articles:     [],
    activeSource: '',
    sourcesEl:    null,
    filterBar:    null,
    activeEl:     null,
    gridEl:       null,

    init() {
        NEWS.sourcesEl = document.getElementById('js-news-sources');
        NEWS.filterBar = document.getElementById('js-news-filter-bar');
        NEWS.activeEl  = document.getElementById('js-news-active');
        NEWS.gridEl    = document.getElementById('js-news-grid');

        const clearBtn = document.getElementById('js-news-clear');
        if (!NEWS.gridEl) return;

        if (clearBtn) { clearBtn.addEventListener('click', NEWS.handleClear); }
        if (NEWS.sourcesEl) { NEWS.sourcesEl.addEventListener('click', NEWS.handleSourceClick); }

        NEWS.buildSourceButtons();
        NEWS.fetchAll();
    },

    buildSourceButtons() {
        if (!NEWS.sourcesEl) return;
        const keys = Object.keys(NEWS.FEEDS);
        keys.forEach(function addBtn(key) {
            NEWS.sourcesEl.appendChild(NEWS.buildSourceBtn(key));
        });
    },

    buildSourceBtn(key) {
        const btn     = document.createElement('button');
        btn.type    = 'button';
        btn.className = 'tag-btn';
        btn.setAttribute('data-source', key);
        btn.setAttribute('aria-pressed', 'false');

        const nameSpan       = document.createElement('span');
        nameSpan.className = 'tag-btn-name';
        nameSpan.textContent = NEWS.FEEDS[key].label;

        btn.appendChild(nameSpan);
        return btn;
    },

    fetchAll() {
        const keys     = Object.keys(NEWS.FEEDS);
        const promises = keys.map(function fetchOne(key) {
            const feedUrl = NEWS.FEEDS[key].url;
            const apiUrl  = NEWS.API_BASE + encodeURIComponent(feedUrl);

            return fetch(apiUrl)
                .then(function parseJson(r) { return r.json(); })
                .then(function onData(data) {
                    if (data.status !== 'ok' || !Array.isArray(data.items)) return [];
                    return data.items.map(function toArticle(item) {
                        return {
                            title:     NEWS.sanitizeText(item.title || ''),
                            link:      NEWS.sanitizeUrl(item.link || ''),
                            date:      item.pubDate || '',
                            excerpt:   NEWS.sanitizeText(item.description || ''),
                            source:    key,
                            sourceLabel: NEWS.FEEDS[key].label,
                        };
                    });
                })
                .catch(function onError() { return []; });
        });

        Promise.all(promises).then(function onAll(results) {
            NEWS.articles = [];
            results.forEach(function merge(arr) {
                NEWS.articles = NEWS.articles.concat(arr);
            });

            // Sort newest-first by date
            NEWS.articles.sort(function byDate(a, b) {
                return new Date(b.date) - new Date(a.date);
            });

            NEWS.initFromUrl();
            NEWS.render();
        });
    },

    sanitizeText(str) {
        // Strip HTML tags
        let text = str.replace(/<[^>]*>/g, '');
        // Strip dangerous chars
        text = text.replace(/[<>"'&]/g, '');
        // Trim and cap length
        text = text.trim();
        if (text.length > 500) { text = text.substring(0, 500) + '...'; }
        return text;
    },

    sanitizeUrl(url) {
        const trimmed = url.trim();
        if (/^https?:\/\//i.test(trimmed)) return trimmed;
        return '';
    },

    initFromUrl() {
        const raw = new URLSearchParams(window.location.search).get('source');
        if (!raw) return;
        const source = raw.trim().substring(0, 30).replace(/[<>"'&]/g, '');
        if (NEWS.FEEDS[source]) {
            NEWS.applyFilter(source);
        }
    },

    handleSourceClick(e) {
        const btn = e.target.closest('.tag-btn');
        if (!btn) return;
        const source = btn.getAttribute('data-source');
        if (!source) return;

        if (NEWS.activeSource === source) {
            NEWS.clearFilter();
        } else {
            NEWS.applyFilter(source);
        }
        NEWS.pushUrl(NEWS.activeSource);
        NEWS.render();
    },

    applyFilter(source) {
        NEWS.activeSource = source;

        if (NEWS.sourcesEl) {
            NEWS.sourcesEl.querySelectorAll('.tag-btn').forEach(function setPressed(btn) {
                const on = btn.getAttribute('data-source') === source;
                btn.classList.toggle('is-active', on);
                btn.setAttribute('aria-pressed', String(on));
            });
        }

        if (NEWS.filterBar) { NEWS.filterBar.hidden = false; }
        if (NEWS.activeEl)  { NEWS.activeEl.textContent = NEWS.FEEDS[source].label; }
    },

    handleClear() {
        NEWS.clearFilter();
        NEWS.pushUrl('');
        NEWS.render();
    },

    clearFilter() {
        NEWS.activeSource = '';

        if (NEWS.sourcesEl) {
            NEWS.sourcesEl.querySelectorAll('.tag-btn').forEach(function deactivate(btn) {
                btn.classList.remove('is-active');
                btn.setAttribute('aria-pressed', 'false');
            });
        }

        if (NEWS.filterBar) { NEWS.filterBar.hidden = true; }
    },

    render() {
        if (!NEWS.gridEl) return;
        NEWS.gridEl.replaceChildren();

        let items = NEWS.articles;
        if (NEWS.activeSource) {
            items = items.filter(function matchSource(a) {
                return a.source === NEWS.activeSource;
            });
        }

        if (!items.length) {
            const empty       = document.createElement('p');
            empty.className = 'empty-state';
            empty.textContent = 'No articles found.';
            NEWS.gridEl.appendChild(empty);
            return;
        }

        const grid     = document.createElement('div');
        grid.className = 'posts-grid';
        items.forEach(function addCard(article) {
            grid.appendChild(NEWS.buildCard(article));
        });
        NEWS.gridEl.appendChild(grid);
    },

    buildCard(article) {
        const card     = document.createElement('article');
        card.className = 'post-item';

        // Meta row: date + source badge
        const meta     = document.createElement('div');
        meta.className = 'post-meta';

        const time       = document.createElement('time');
        time.className = 'post-date';
        const dateStr    = NEWS.formatDate(article.date);
        time.setAttribute('datetime', article.date);
        time.textContent = dateStr;

        const badge       = document.createElement('span');
        badge.className = 'cat-badge news-badge';
        badge.textContent = article.sourceLabel;

        meta.appendChild(time);
        meta.appendChild(badge);

        // Title
        const h3     = document.createElement('h3');
        h3.className = 'post-title';
        if (article.link) {
            const a       = document.createElement('a');
            a.href      = article.link;
            a.target    = '_blank';
            a.rel       = 'noopener noreferrer';
            a.textContent = article.title;
            h3.appendChild(a);
        } else {
            h3.textContent = article.title;
        }

        // Excerpt
        const excerpt       = document.createElement('p');
        excerpt.className = 'post-excerpt';
        excerpt.textContent = article.excerpt;

        // External link indicator
        const ext       = document.createElement('span');
        ext.className = 'news-external';
        ext.textContent = article.sourceLabel + ' ↗';

        card.appendChild(meta);
        card.appendChild(h3);
        card.appendChild(excerpt);
        card.appendChild(ext);
        return card;
    },

    formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        const year  = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day   = String(d.getDate()).padStart(2, '0');
        return year + '-' + month + '-' + day;
    },

    pushUrl(source) {
        const url = new URL(window.location.href);
        if (source) {
            url.searchParams.set('source', source);
        } else {
            url.searchParams.delete('source');
        }
        history.pushState({}, '', url.toString());
    },

};

document.addEventListener('DOMContentLoaded', function initNews() { NEWS.init(); });
