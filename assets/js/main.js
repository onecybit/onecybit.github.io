// Clickjacking protection — runs before DOMContentLoaded
if (window.self !== window.top) {
    window.top.location = window.self.location;
}

const OCB = {

    init() {
        this.initScrollProgress();
        this.initReadingProgress();
        this.initCursor();
        this.initNav();
        this.initHamburger();
        this.initGlitch();
        this.initClock();
        this.initScrollAnimations();
        this.initBackToTop();
        this.initCopyButtons();
    },

    // ── Scroll progress bar (non-post pages) ──────────────────────────────────

    initScrollProgress() {
        // Post pages use initReadingProgress() instead — avoids two listeners
        // fighting over the same bar.
        if (document.querySelector('.post-body')) return;

        const bar = document.querySelector('.scroll-progress');
        if (!bar) return;

        function updateBar() {
            const scrolled  = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const pct       = docHeight > 0 ? (scrolled / docHeight) * 100 : 0;
            bar.style.width = pct + '%';
        }

        window.addEventListener('scroll', updateBar, { passive: true });
    },

    // ── Reading progress bar (post pages only) ────────────────────────────────

    initReadingProgress() {
        const bar     = document.querySelector('.scroll-progress');
        const content = document.querySelector('.post-body');
        if (!bar || !content) return;

        function updateProgress() {
            const contentTop    = content.getBoundingClientRect().top + window.scrollY;
            const contentHeight = content.offsetHeight;
            const viewHeight    = window.innerHeight;
            const scrollable    = contentHeight - viewHeight;
            const pct = scrollable > 0
                ? Math.min(100, Math.max(0, (window.scrollY - contentTop) / scrollable * 100))
                : 100;
            bar.style.width = pct + '%';
        }

        window.addEventListener('scroll', updateProgress, { passive: true });
        updateProgress();
    },

    // ── Custom cursor ──────────────────────────────────────────────────────────

    initCursor() {
        const cursor = document.querySelector('.cursor');
        // Skip on touch devices — coarse pointer means no mouse
        if (!cursor || window.matchMedia('(pointer: coarse)').matches) return;

        function moveCursor(e) {
            cursor.style.left = e.clientX + 'px';
            cursor.style.top  = e.clientY + 'px';
        }

        function onHoverStart() { document.body.classList.add('cursor-hover'); }
        function onHoverEnd()   { document.body.classList.remove('cursor-hover'); }

        document.addEventListener('mousemove', moveCursor);

        document.querySelectorAll('a, button, [role="button"]').forEach(function(el) {
            el.addEventListener('mouseenter', onHoverStart);
            el.addEventListener('mouseleave', onHoverEnd);
        });
    },

    // ── Navigation active state ────────────────────────────────────────────────

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

    // ── Mobile hamburger menu ──────────────────────────────────────────────────

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

        function handleLinkClick() {
            closeMenu();
        }

        btn.addEventListener('click', toggleMenu);
        navList.querySelectorAll('.nav-link').forEach(function(link) {
            link.addEventListener('click', handleLinkClick);
        });
    },

    // ── Glitch effect ──────────────────────────────────────────────────────────

    initGlitch() {
        const targets = document.querySelectorAll('[data-glitch]');
        if (!targets.length) return;

        targets.forEach(function(el) {
            scheduleGlitch(el);
        });

        function triggerGlitch(el) {
            el.classList.add('is-glitching');
            setTimeout(function() { removeGlitch(el); }, 200);
            scheduleGlitch(el);
        }

        function removeGlitch(el) {
            el.classList.remove('is-glitching');
        }

        function scheduleGlitch(el) {
            const delay = 2000 + Math.random() * 6000;
            setTimeout(function() { triggerGlitch(el); }, delay);
        }
    },

    // ── Live clock ─────────────────────────────────────────────────────────────

    initClock() {
        const clockEl = document.getElementById('js-clock');
        if (!clockEl) return;

        function updateClock() {
            const now = new Date();
            const h   = String(now.getHours()).padStart(2, '0');
            const m   = String(now.getMinutes()).padStart(2, '0');
            const s   = String(now.getSeconds()).padStart(2, '0');
            clockEl.textContent = h + ':' + m + ':' + s;
            clockEl.setAttribute('datetime', now.toISOString());
        }

        updateClock();
        setInterval(updateClock, 1000);
    },

    // ── Scroll-triggered fade-up ───────────────────────────────────────────────

    initScrollAnimations() {
        const targets = document.querySelectorAll('.fade-up-target');
        if (!targets.length) return;

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

    // ── Copy buttons on code blocks ───────────────────────────────────────────

    initCopyButtons() {
        const blocks = document.querySelectorAll('.code-block');
        if (!blocks.length) return;

        blocks.forEach(function(block) {
            // Inject button if build.py didn't produce one (template/future-proofing)
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

    // ── Back to top ────────────────────────────────────────────────────────────

    initBackToTop() {
        const btn = document.getElementById('js-back-top');
        if (!btn) return;

        function toggleBtn() { btn.hidden = window.scrollY < 400; }
        function scrollUp()  { window.scrollTo({ top: 0, behavior: 'smooth' }); }

        window.addEventListener('scroll', toggleBtn, { passive: true });
        btn.addEventListener('click', scrollUp);
    },

};

document.addEventListener('DOMContentLoaded', function() { OCB.init(); });
