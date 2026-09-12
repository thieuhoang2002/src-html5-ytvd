// ==UserScript==
// @name         Hack Speed Tool by thhoang
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Chỉ hack speed (setInterval/setTimeout/Date.now/performance.now) với UI đơn giản
// @author       thhoang
// @thhoangdeptrai123
// @match        https://cdn-vietnam-shjmini.kgogame.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // ===== Hack Speed Menu =====
    let speedHack = {
        enabled: false,
        speed: 1,
        origSetInterval: window.setInterval,
        origSetTimeout: window.setTimeout,
        origDateNow: Date.now,
        origPerformanceNow: window.performance && window.performance.now ? window.performance.now : null
    };

    function showToast(msg, color = '#19be6b', opts = {}) {
        let toast = document.getElementById('hackspeed-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'hackspeed-toast';
            toast.style.position = 'fixed';
            toast.style.top = '22px';
            toast.style.right = '22px';
            toast.style.zIndex = 100001;
            toast.style.background = color;
            toast.style.color = '#fff';
            toast.style.padding = '10px 18px';
            toast.style.borderRadius = '8px';
            toast.style.fontSize = '15px';
            toast.style.fontWeight = 'bold';
            toast.style.boxShadow = '0 2px 8px rgba(0,0,0,0.18)';
            toast.style.opacity = 0;
            toast.style.transition = 'opacity 0.25s';
            toast.style.pointerEvents = 'none';
            toast.style.maxWidth = '60vw';
            toast.style.textAlign = 'left';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.style.background = color;
        toast.style.opacity = 1;
        clearTimeout(toast._hideTimeout);
        toast._hideTimeout = setTimeout(() => { toast.style.opacity = 0; }, opts.duration || 3500);
    }

    function applySpeedHack(factor) {
        if (factor === 1) {
            // Restore
            window.setInterval = speedHack.origSetInterval;
            window.setTimeout = speedHack.origSetTimeout;
            Date.now = speedHack.origDateNow;
            if (window.performance && speedHack.origPerformanceNow) {
                window.performance.now = speedHack.origPerformanceNow;
            }
            speedHack.enabled = false;
            speedHack.speed = 1;
            showToast('Đã tắt hack speed!', '#2d8cf0');
            updateMenuDisableState();
            return;
        }
        // Patch setInterval
        window.setInterval = function (fn, delay, ...args) {
            return speedHack.origSetInterval(fn, delay / factor, ...args);
        };
        // Patch setTimeout
        window.setTimeout = function (fn, delay, ...args) {
            return speedHack.origSetTimeout(fn, delay / factor, ...args);
        };
        // Patch Date.now
        let base = speedHack.origDateNow();
        let start = base;
        Date.now = function () {
            return base + (speedHack.origDateNow() - start) * factor;
        };
        // Patch performance.now
        if (window.performance && speedHack.origPerformanceNow) {
            let perfBase = speedHack.origPerformanceNow.call(window.performance);
            let perfStart = perfBase;
            window.performance.now = function () {
                return perfBase + (speedHack.origPerformanceNow.call(window.performance) - perfStart) * factor;
            };
        }
        speedHack.enabled = true;
        speedHack.speed = factor;
        showToast('Đã bật hack speed x' + factor + '!', '#19be6b');
        updateMenuDisableState();
    }

    // Hack speed menu UI
    function showSpeedHackPopup() {
        let popup = document.getElementById('hackspeed-popup');
        if (popup) { popup.style.display = 'block'; return; }
        popup = document.createElement('div');
        popup.id = 'hackspeed-popup';
        popup.style.position = 'fixed';
        popup.style.left = '50%';
        popup.style.top = '50%';
        popup.style.transform = 'translate(-50%, -50%)';
        popup.style.zIndex = 100002;
        popup.style.background = '#232946';
        popup.style.color = '#fff';
        popup.style.padding = '22px 24px 14px 24px';
        popup.style.borderRadius = '12px';
        popup.style.boxShadow = '0 4px 24px rgba(0,0,0,0.28)';
        popup.style.minWidth = '220px';
        popup.style.maxWidth = '90vw';
        popup.style.fontSize = '13px';
        popup.innerHTML = `
            <div style="font-weight:bold;font-size:15px;color:#FFD600;margin-bottom:8px;">Hack Speed (setInterval/setTimeout/Date.now)</div>
            <div style="margin-bottom:8px;">Chọn tốc độ mong muốn:</div>
            <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
                <button class="hackspeed-speed-btn" data-speed="1" style="background:#2d8cf0;color:#fff;border:none;border-radius:5px;padding:5px 12px;font-size:12px;font-weight:bold;cursor:pointer;">1x</button>
                <button class="hackspeed-speed-btn" data-speed="2" style="background:#19be6b;color:#fff;border:none;border-radius:5px;padding:5px 12px;font-size:12px;font-weight:bold;cursor:pointer;">2x</button>
                <button class="hackspeed-speed-btn" data-speed="3" style="background:#19be6b;color:#fff;border:none;border-radius:5px;padding:5px 12px;font-size:12px;font-weight:bold;cursor:pointer;">3x</button>
                <button class="hackspeed-speed-btn" data-speed="5" style="background:#19be6b;color:#fff;border:none;border-radius:5px;padding:5px 12px;font-size:12px;font-weight:bold;cursor:pointer;">5x</button>
                <button class="hackspeed-speed-btn" data-speed="10" style="background:#19be6b;color:#fff;border:none;border-radius:5px;padding:5px 12px;font-size:12px;font-weight:bold;cursor:pointer;">10x</button>
                <button class="hackspeed-speed-btn" data-speed="20" style="background:#19be6b;color:#fff;border:none;border-radius:5px;padding:5px 12px;font-size:12px;font-weight:bold;cursor:pointer;">20x</button>
            </div>
            <div style="margin-bottom:8px;">Hoặc nhập tốc độ tuỳ chỉnh:</div>
            <input id="hackspeed-input" type="number" min="0.1" step="0.1" placeholder="Ví dụ: 7" style="width:80px;padding:4px 8px;border-radius:4px;border:1px solid #888;font-size:13px;"> <button id="hackspeed-set" style="background:#FFD600;color:#222;border:none;border-radius:5px;padding:4px 10px;font-size:12px;font-weight:bold;cursor:pointer;">OK</button>
            <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end;">
                <button id="hackspeed-close" style="background:#B71C1C;color:#fff;border:none;border-radius:5px;padding:5px 12px;font-size:12px;font-weight:bold;cursor:pointer;">Đóng</button>
            </div>
            <div style="margin-top:10px;text-align:center;font-size:12px;color:#FFD600;font-weight:bold;">@thhoangdeptrai123</div>
        `;
        document.body.appendChild(popup);
        // Nút chọn nhanh
        popup.querySelectorAll('.hackspeed-speed-btn').forEach(btn => {
            btn.onclick = function () {
                const speed = parseFloat(btn.getAttribute('data-speed'));
                applySpeedHack(speed);
                popup.style.display = 'none';
            };
        });
        // Nút nhập custom
        document.getElementById('hackspeed-set').onclick = function () {
            const val = parseFloat(document.getElementById('hackspeed-input').value);
            if (!isNaN(val) && val > 0) {
                applySpeedHack(val);
                popup.style.display = 'none';
            } else {
                showToast('Nhập tốc độ hợp lệ!', '#B71C1C');
            }
        };
        // Nút đóng
        document.getElementById('hackspeed-close').onclick = function () {
            popup.style.display = 'none';
        };
    }

    // ===== UI Icon =====
    function createUI() {
        // Remove old UI if exists
        const oldIcon = document.getElementById('hackspeed-setting-icon');
        if (oldIcon) oldIcon.remove();

        // Create small draggable settings icon
        const icon = document.createElement('div');
        icon.id = 'hackspeed-setting-icon';
        icon.style.position = 'fixed';
        icon.style.right = '18px';
        icon.style.bottom = '18px';
        icon.style.width = '38px';
        icon.style.height = '38px';
        icon.style.background = 'rgba(30,34,54,0.92)';
        icon.style.borderRadius = '50%';
        icon.style.boxShadow = '0 2px 8px rgba(0,0,0,0.18)';
        icon.style.display = 'flex';
        icon.style.alignItems = 'center';
        icon.style.justifyContent = 'center';
        icon.style.zIndex = 10000;
        icon.style.cursor = 'pointer';
        icon.style.border = '2px solid #2d8cf0';
        icon.style.userSelect = 'none';
        icon.style.transition = 'box-shadow 0.2s';
        icon.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2d8cf0" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.5"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.09a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';

        // Drag logic (mouse + touch) với phân biệt click/drag
        let isDragging = false, dragOffsetX = 0, dragOffsetY = 0;
        let dragMoved = false, dragStartX = 0, dragStartY = 0;
        // Mouse
        icon.addEventListener('mousedown', function (e) {
            isDragging = true;
            dragMoved = false;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            dragOffsetX = e.clientX - icon.getBoundingClientRect().left;
            dragOffsetY = e.clientY - icon.getBoundingClientRect().top;
            icon.style.boxShadow = '0 4px 16px #2d8cf0';
            document.body.style.userSelect = 'none';
        });
        document.addEventListener('mousemove', function (e) {
            if (!isDragging) return;
            const dx = e.clientX - dragStartX, dy = e.clientY - dragStartY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved = true;
            icon.style.right = '';
            icon.style.bottom = '';
            icon.style.left = (e.clientX - dragOffsetX) + 'px';
            icon.style.top = (e.clientY - dragOffsetY) + 'px';
        });
        icon.addEventListener('mouseup', function (e) {
            if (!isDragging) return;
            isDragging = false;
            icon.style.boxShadow = '0 2px 8px rgba(0,0,0,0.18)';
            document.body.style.userSelect = '';
            // Nếu không kéo thì coi là click
            if (!dragMoved) {
                e.stopPropagation();
                showSpeedHackPopup();
            }
        });
        document.addEventListener('mouseup', function () {
            isDragging = false;
            icon.style.boxShadow = '0 2px 8px rgba(0,0,0,0.18)';
            document.body.style.userSelect = '';
        });
        // Touch
        icon.addEventListener('touchstart', function (e) {
            if (e.touches.length !== 1) return;
            isDragging = true;
            dragMoved = false;
            const touch = e.touches[0];
            dragStartX = touch.clientX;
            dragStartY = touch.clientY;
            dragOffsetX = touch.clientX - icon.getBoundingClientRect().left;
            dragOffsetY = touch.clientY - icon.getBoundingClientRect().top;
            icon.style.boxShadow = '0 4px 16px #2d8cf0';
            document.body.style.userSelect = 'none';
            e.preventDefault();
        }, { passive: false });
        document.addEventListener('touchmove', function (e) {
            if (!isDragging || e.touches.length !== 1) return;
            const touch = e.touches[0];
            const dx = touch.clientX - dragStartX, dy = touch.clientY - dragStartY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved = true;
            icon.style.right = '';
            icon.style.bottom = '';
            icon.style.left = (touch.clientX - dragOffsetX) + 'px';
            icon.style.top = (touch.clientY - dragOffsetY) + 'px';
            e.preventDefault();
        }, { passive: false });
        icon.addEventListener('touchend', function (e) {
            if (!isDragging) return;
            isDragging = false;
            icon.style.boxShadow = '0 2px 8px rgba(0,0,0,0.18)';
            document.body.style.userSelect = '';
            // Nếu không kéo thì coi là tap/click
            if (!dragMoved) {
                e.stopPropagation();
                showSpeedHackPopup();
            }
        });
        document.addEventListener('touchend', function () {
            isDragging = false;
            icon.style.boxShadow = '0 2px 8px rgba(0,0,0,0.18)';
            document.body.style.userSelect = '';
        });

        document.body.appendChild(icon);
    }

    function updateMenuDisableState() {
        // No-op for this minimal version, but kept for compatibility
    }

    // Đợi window.onload rồi mới tạo UI
    if (document.readyState === 'complete') {
        setTimeout(createUI, 1000);
    } else {
        window.addEventListener('load', function () {
            setTimeout(createUI, 1000);
        });
    }
})();
