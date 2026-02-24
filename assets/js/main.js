// Clickjacking protection — runs before DOMContentLoaded
if (window.self !== window.top) {
    window.top.location = window.self.location;
}

const OCB = {

    init() {
        this.initScrollProgress();
        this.initCursor();
        this.initNav();
        this.initGlitch();
        this.initClock();
        this.initScrollAnimations();
        this.initBackToTop();
        this.initCopyButtons();
    },

    // ── Scroll progress bar ────────────────────────────────────────────────────

    initScrollProgress() {
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
        const buttons = document.querySelectorAll('.copy-btn');
        if (!buttons.length) return;

        buttons.forEach(function(btn) {
            btn.addEventListener('click', handleCopy);
        });

        function handleCopy() {
            const codeEl = this.closest('.code-block').querySelector('code');
            if (!codeEl) return;

            navigator.clipboard.writeText(codeEl.textContent).then(function() {
                markCopied(this);
            }.bind(this));
        }

        function markCopied(btn) {
            btn.textContent = 'copied';
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
