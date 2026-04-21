/* ==========================================================
   Admin panel real-time auto-refresh
   Dashboard KPI kartalarini har 15 soniyada yangilab turadi
   ========================================================== */
(function () {
    'use strict';

    const INTERVAL_MS = 15000; // 15 soniya
    const ADMIN_ROOT = '/17210707admin/';

    // Faqat dashboard (admin'ning bosh sahifasi) da ishlasin
    const path = window.location.pathname.replace(/\/+$/, '/');
    const isDashboard = (
        path === ADMIN_ROOT ||
        path === ADMIN_ROOT.replace(/\/$/, '') + '/'
    );

    if (!isDashboard) return;

    // Countdown ko'rsatkich qo'shish
    const indicator = document.createElement('div');
    indicator.style.cssText = [
        'position:fixed',
        'bottom:16px',
        'right:16px',
        'background:rgba(147,51,234,0.9)',
        'color:#fff',
        'padding:6px 12px',
        'border-radius:8px',
        'font-size:11px',
        'font-family:system-ui,sans-serif',
        'font-weight:600',
        'box-shadow:0 4px 12px rgba(0,0,0,0.3)',
        'z-index:9999',
        'display:flex',
        'align-items:center',
        'gap:6px',
        'pointer-events:none',
        'user-select:none',
    ].join(';');
    indicator.innerHTML = '<span style="width:6px;height:6px;background:#10b981;border-radius:50%;animation:pulse 1.5s infinite"></span><span id="rt-countdown">15s</span>';

    // Pulse animatsiyasi
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.3); }
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(indicator);

    let secondsLeft = INTERVAL_MS / 1000;
    const countdownEl = document.getElementById('rt-countdown');

    // Har soniyada countdown yangilansin
    setInterval(() => {
        secondsLeft -= 1;
        if (secondsLeft <= 0) secondsLeft = INTERVAL_MS / 1000;
        if (countdownEl) countdownEl.textContent = `${secondsLeft}s`;
    }, 1000);

    // KPI'larni fetch orqali yangilash
    async function refreshDashboard() {
        try {
            const res = await fetch(window.location.href, {
                cache: 'no-store',
                credentials: 'same-origin',
                headers: { 'X-Requested-With': 'realtime' },
            });
            if (!res.ok) return;

            const html = await res.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // KPI kartalari — Unfold dashboard.html da bo'lgan bloklarni yangilaymiz
            const currentMain = document.querySelector('#content, main, .dashboard, [class*="kpi"]')
                || document.querySelector('main, #content');
            const newMain = doc.querySelector('#content, main, .dashboard, [class*="kpi"]')
                || doc.querySelector('main, #content');

            if (!currentMain || !newMain) return;

            // Faqat kpi kartalarining ichini yangilab, boshqa narsaga tegmaymiz
            currentMain.innerHTML = newMain.innerHTML;

            // Kichkina "yangilandi" sezilishi uchun flash
            indicator.style.background = 'rgba(16,185,129,0.95)';
            setTimeout(() => {
                indicator.style.background = 'rgba(147,51,234,0.9)';
            }, 400);

            secondsLeft = INTERVAL_MS / 1000;
        } catch (err) {
            // Sekin o'tkazib yuboramiz — qayta urinadi
            console.debug('[realtime-refresh]', err);
        }
    }

    setInterval(refreshDashboard, INTERVAL_MS);
    console.log(`[realtime-refresh] Har ${INTERVAL_MS / 1000} soniyada dashboard yangilanadi`);
})();
