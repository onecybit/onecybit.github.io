if (window.self !== window.top) {
    window.top.location = window.self.location;
}

const OCB = {

    init() {
        this.initScrollProgress();
        this.initReadingProgress();
        this.initNav();
        this.initHamburger();
        this.initScrollAnimations();
        this.initTocSpy();
        this.initHeadingAnchors();
        this.initBackToTop();
        this.initCopyButtons();
    },

    /* True when the OS asks for reduced motion. Checked at call time rather
       than cached so a mid-session preference change is respected. */
    prefersReducedMotion() {
        return window.matchMedia
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    },

    initScrollProgress() {
        if (document.querySelector('.post-body')) return;

        const bar = document.querySelector('.scroll-progress');
        if (!bar) return;

        let rafId = null;
        function updateBar() {
            rafId = null;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const pct       = docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0;
            bar.style.width = pct + '%';
        }

        window.addEventListener('scroll', function() {
            if (!rafId) rafId = requestAnimationFrame(updateBar);
        }, { passive: true });
    },

    initReadingProgress() {
        const bar     = document.querySelector('.scroll-progress');
        const content = document.querySelector('.post-body');
        if (!bar || !content) return;

        const contentTop    = content.getBoundingClientRect().top + window.scrollY;
        const contentHeight = content.offsetHeight;

        let rafId = null;
        function updateProgress() {
            rafId = null;
            const viewHeight = window.innerHeight;
            const scrollable = contentHeight - viewHeight;
            const pct = scrollable > 0
                ? Math.min(100, Math.max(0, (window.scrollY - contentTop) / scrollable * 100))
                : 100;
            bar.style.width = pct + '%';
        }

        window.addEventListener('scroll', function() {
            if (!rafId) rafId = requestAnimationFrame(updateProgress);
        }, { passive: true });
        updateProgress();
    },

    initNav() {
        const links = document.querySelectorAll('.nav-link');
        const path  = window.location.pathname;

        links.forEach(function(link) {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            if (!href) return;

            const isHome    = href === '/' && (path === '/' || path === '/index.html');
            const isSection = href !== '/' && path.startsWith(href);

            if (isHome || isSection) {
                link.classList.add('active');
            }
        });
    },

    initHamburger() {
        const btn     = document.getElementById('js-nav-hamburger');
        const navList = document.getElementById('js-nav-links');
        if (!btn || !navList) return;

        function openMenu() {
            navList.classList.add('is-open');
            btn.setAttribute('aria-expanded', 'true');
            btn.setAttribute('aria-label', 'Close navigation menu');
        }

        function closeMenu() {
            navList.classList.remove('is-open');
            btn.setAttribute('aria-expanded', 'false');
            btn.setAttribute('aria-label', 'Open navigation menu');
        }

        function toggleMenu() {
            if (navList.classList.contains('is-open')) {
                closeMenu();
            } else {
                openMenu();
            }
        }

        btn.addEventListener('click', toggleMenu);
        navList.querySelectorAll('.nav-link').forEach(function(link) {
            link.addEventListener('click', closeMenu);
        });
    },

    initScrollAnimations() {
        const targets = document.querySelectorAll('.fade-up-target');
        if (!targets.length) return;

        if (OCB.prefersReducedMotion()) {
            targets.forEach(function reveal(el) { el.classList.add('is-visible'); });
            return;
        }

        const observer = new IntersectionObserver(handleEntries, {
            threshold:  0.1,
            rootMargin: '0px 0px -40px 0px',
        });

        function handleEntries(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }

        targets.forEach(function(el) { observer.observe(el); });
    },

    /* Maps each TOC anchor to the heading id it points at. */
    tocLinksById(toc) {
        const links = {};
        toc.querySelectorAll('.toc-list a[href^="#"]').forEach(function map(a) {
            links[decodeURIComponent(a.getAttribute('href').slice(1))] = a;
        });
        return links;
    },

    /* Highlights the TOC entry for the heading currently being read. */
    initTocSpy() {
        const toc = document.getElementById('js-toc');
        if (!toc) return;

        const links    = OCB.tocLinksById(toc);
        const headings = document.querySelectorAll('.post-body h2[id], .post-body h3[id]');
        if (!headings.length) return;

        let current = null;
        function setActive(id) {
            if (id === current) return;
            if (current && links[current]) { links[current].classList.remove('is-active'); }
            if (links[id]) { links[id].classList.add('is-active'); }
            current = id;
        }

        function handleEntries(entries) {
            entries.forEach(function pick(entry) {
                if (entry.isIntersecting) { setActive(entry.target.id); }
            });
        }

        const observer = new IntersectionObserver(handleEntries, {
            rootMargin: '-80px 0px -70% 0px',
        });
        headings.forEach(function watch(h) { observer.observe(h); });
    },

    /* The '#' beside each heading is a real link, so it already works with
       JS off. This only adds the convenience of copying the absolute URL. */
    initHeadingAnchors() {
        const links = document.querySelectorAll('.post-body .heading-anchor');
        if (!links.length) return;

        links.forEach(function bind(link) {
            link.addEventListener('click', handleAnchorClick);
        });

        function handleAnchorClick() {
            const hash = this.getAttribute('href') || '';
            const url  = window.location.origin + window.location.pathname + hash;
            const link = this;
            if (!navigator.clipboard || !navigator.clipboard.writeText) return;
            navigator.clipboard.writeText(url)
                .then(function ok() { flash(link); })
                .catch(function ignore() { /* clipboard blocked — link still works */ });
        }

        function flash(link) {
            link.classList.add('is-copied');
            setTimeout(function clear() { link.classList.remove('is-copied'); }, 1200);
        }
    },

    initCopyButtons() {
        const blocks = document.querySelectorAll('.code-block');
        if (!blocks.length) return;

        blocks.forEach(function(block) {
            let btn = block.querySelector('.copy-btn');
            if (!btn) {
                btn = document.createElement('button');
                btn.className = 'copy-btn';
                btn.setAttribute('aria-label', 'Copy code');
                btn.textContent = 'copy';
                block.insertBefore(btn, block.firstChild);
            }
            btn.addEventListener('click', handleCopy);
        });

        function handleCopy() {
            const block  = this.closest('.code-block');
            const codeEl = block ? block.querySelector('code') : null;
            if (!codeEl) return;
            const text = codeEl.textContent;
            const btn  = this;

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text)
                    .then(function() { markCopied(btn); })
                    .catch(function() { fallbackCopy(text, btn); });
            } else {
                fallbackCopy(text, btn);
            }
        }

        function fallbackCopy(text, btn) {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed';
            ta.style.opacity  = '0';
            ta.style.top      = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            try {
                document.execCommand('copy');
                markCopied(btn);
            } catch (err) {
                // clipboard unavailable — silently fail
            }
            document.body.removeChild(ta);
        }

        function markCopied(btn) {
            btn.textContent = 'copied!';
            btn.classList.add('is-copied');
            setTimeout(function() {
                btn.textContent = 'copy';
                btn.classList.remove('is-copied');
            }, 2000);
        }
    },

    initBackToTop() {
        const btn = document.getElementById('js-back-top');
        if (!btn) return;

        function toggleBtn() { btn.hidden = window.scrollY < 400; }
        function scrollUp()  {
            const mode = OCB.prefersReducedMotion() ? 'auto' : 'smooth';
            window.scrollTo({ top: 0, behavior: mode });
        }

        window.addEventListener('scroll', toggleBtn, { passive: true });
        btn.addEventListener('click', scrollUp);
    },

};

document.addEventListener('DOMContentLoaded', function() { OCB.init(); });
