// ==UserScript==
// @name         Vân Du Auto Tool by thhoang
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Tự động Vân Du, bỏ qua điều kiện đặc quyền/quảng cáo, có UI, inject page context
// @author       thhoang
// @match        https://cdn-vietnam-shjmini.kgogame.com/*
// @grant        none
// ==/UserScript==


alert('[Vân Du Auto Tool] Script đã được inject!');
(function () {
    'use strict';

    // Code thực thi trong page context

    const realCode = function () {
        // Patch hàm bán item ngay khi inject, không phụ thuộc bật/tắt auto
        // Trạng thái công tắc chặn bán item đặc biệt
        let blockSpecialSell = true;
        // Danh sách ID cần giữ, có thể chỉnh qua UI
        let keepIds = [];
        // Load keepIds từ localStorage nếu có
        function loadKeepIds() {
            try {
                const raw = localStorage.getItem('vandu_keep_ids');
                if (raw) {
                    keepIds = JSON.parse(raw);
                } else {
                    // Mặc định nếu chưa có thì dùng danh sách cũ
                    keepIds = [501207, 501101, 501402, 501203, 501102, 501103, 501104, 501105, 501107, 501108, 501111, 501114];
                }
            } catch {
                keepIds = [501207, 501101, 501402, 501203, 501102, 501103, 501104, 501105, 501107, 501108, 501111, 501114];
            }
        }
        function saveKeepIds() {
            localStorage.setItem('vandu_keep_ids', JSON.stringify(keepIds));
        }
        loadKeepIds();

        // Hàm cập nhật trạng thái nút UI
        function updateBlockSpecialSellBtn() {
            const btn = document.getElementById('vandu-block-special-btn');
            if (btn) {
                btn.textContent = 'Chặn bán item đặc biệt: ' + (blockSpecialSell ? 'ON' : 'OFF');
                btn.style.background = blockSpecialSell ? '#B71C1C' : '#2d8cf0';
            }
        }

        // Hàm bật công tắc (dùng khi gặp item đặc biệt)
        function enableBlockSpecialSell() {
            blockSpecialSell = true;
            updateBlockSpecialSellBtn();
        }

        // Hàm tắt công tắc (dùng khi người chơi bấm nút)
        function toggleBlockSpecialSell() {
            blockSpecialSell = !blockSpecialSell;
            updateBlockSpecialSellBtn();
        }

        function patchSellTreasureGlobal() {
            // Danh sách vật phẩm đặc biệt cần giữ lại (đồng bộ với specialIds ở dưới)
            // Sử dụng biến keepIds động
            function patchSell(obj, label) {
                if (obj && typeof obj.sellTreasure === 'function' && !obj._autoSellTreasurePatched) {
                    obj._autoSellTreasurePatched = true;
                    const originalSell = obj.sellTreasure;
                    obj.sellTreasure = function (itemId) {
                        const idNum = Number(itemId);
                        let item = null;
                        try {
                            const model = getModel();
                            item = model?.treasureVo?.event?.item;
                        } catch { }
                        if (!item) item = { id: idNum, name: 'Unknown' };
                        if (keepIds.includes(idNum) && blockSpecialSell) {
                            logPatch(`[PATCH-GLOBAL][${label}] Chặn bán item đặc biệt: id=${idNum}, name=${item.name}, this=`, this);
                            showToast('⛔ Đã chặn bán item đặc biệt: ' + (item.name || idNum) + ' (Tắt công tắc để bán)', '#B71C1C', { duration: 6000 });
                            console.log('[Vân Du Auto Tool] [PATCH-GLOBAL][' + label + '] Chặn bán item đặc biệt:', idNum, item.name, this);
                            return;
                        }
                        return originalSell.call(this, itemId);
                    };
                }
            }
            function patchReqSell(obj, label) {
                if (obj && typeof obj.reqSell === 'function' && !obj._autoReqSellPatched) {
                    obj._autoReqSellPatched = true;
                    const originalReqSell = obj.reqSell;
                    obj.reqSell = function (itemId) {
                        const idNum = Number(itemId);
                        let item = null;
                        try {
                            const model = getModel();
                            item = model?.treasureVo?.event?.item;
                        } catch { }
                        if (!item) item = { id: idNum, name: 'Unknown' };
                        if (keepIds.includes(idNum) && blockSpecialSell) {
                            logPatch(`[PATCH-GLOBAL][${label}] Chặn reqSell item đặc biệt: id=${idNum}, name=${item.name}, this=`, this);
                            showToast('⛔ Đã chặn bán item đặc biệt (reqSell): ' + (item.name || idNum) + ' (Tắt công tắc để bán)', '#B71C1C', { duration: 6000 });
                            console.log('[Vân Du Auto Tool] [PATCH-GLOBAL][' + label + '] Chặn reqSell item đặc biệt:', idNum, item.name, this);
                            return;
                        }
                        return originalReqSell.call(this, itemId);
                    };
                }
            }
            const mvc = getMvc();
            patchSell(mvc?.TreasureController?.prototype, 'prototype');
            patchSell(mvc?.TreasureController?.instance, 'instance');
            patchSell(mvc?.treasureCtrl, 'treasureCtrl');
            patchReqSell(mvc?.TreasureController?.prototype, 'prototype');
            patchReqSell(mvc?.TreasureController?.instance, 'instance');
            patchReqSell(mvc?.treasureCtrl, 'treasureCtrl');
        }
        // Hàm tắt auto và cập nhật UI
        function turnOffAuto() {
            autoEnabled = false;
            const btn = document.getElementById('vandu-auto-btn');
            if (btn) {
                btn.textContent = 'Vân Du Auto: OFF';
                btn.style.background = '#2d8cf0';
            }
            unpatchAuto();
            logPatch('Đã tự động tắt Vân Du Auto do gặp item đặc biệt!');
            showToast('⏹️ Đã tự động tắt Vân Du Auto!', '#B71C1C');
        }
        // Hiển thị thông báo nhỏ gọn ở góc trên phải
        function showToast(msg, color = '#19be6b', opts = {}) {
            let toast = document.getElementById('vandu-toast');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'vandu-toast';
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
        let autoEnabled = false;
        let treasureModel = null;
        let treasureCtrl = null;
        let original = { model: {}, ctrl: {} };

        function logPatch(msg) {
            console.log('[Vân Du Auto Tool]', msg);
        }

        function getMvc() {
            return window.mvc || window.MVC || null;
        }
        function getModel() {
            const mvc = getMvc();
            return mvc?.TreasureModel?.instance || mvc?.treasureModel || null;
        }
        function getCtrl() {
            const mvc = getMvc();
            return mvc?.TreasureController?.instance || mvc?.treasureCtrl || null;
        }

        function createUI() {
            // Remove old UI if exists
            const oldIcon = document.getElementById('vandu-setting-icon');
            if (oldIcon) oldIcon.remove();
            const oldMenu = document.getElementById('vandu-setting-menu');
            if (oldMenu) oldMenu.remove();

            // Create small draggable settings icon
            const icon = document.createElement('div');
            icon.id = 'vandu-setting-icon';
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

            // Drag logic
            let isDragging = false, dragOffsetX = 0, dragOffsetY = 0;
            icon.addEventListener('mousedown', function (e) {
                isDragging = true;
                dragOffsetX = e.clientX - icon.getBoundingClientRect().left;
                dragOffsetY = e.clientY - icon.getBoundingClientRect().top;
                icon.style.boxShadow = '0 4px 16px #2d8cf0';
                document.body.style.userSelect = 'none';
            });
            document.addEventListener('mousemove', function (e) {
                if (!isDragging) return;
                icon.style.right = '';
                icon.style.bottom = '';
                icon.style.left = (e.clientX - dragOffsetX) + 'px';
                icon.style.top = (e.clientY - dragOffsetY) + 'px';
            });
            document.addEventListener('mouseup', function () {
                isDragging = false;
                icon.style.boxShadow = '0 2px 8px rgba(0,0,0,0.18)';
                document.body.style.userSelect = '';
            });

            // Create compact menu (hidden by default)
            const menu = document.createElement('div');
            menu.id = 'vandu-setting-menu';
            menu.style.position = 'fixed';
            menu.style.display = 'none';
            menu.style.minWidth = '140px';
            menu.style.background = 'rgba(30,34,54,0.98)';
            menu.style.borderRadius = '10px';
            menu.style.boxShadow = '0 2px 12px rgba(0,0,0,0.18)';
            menu.style.padding = '8px 0 6px 0';
            menu.style.zIndex = 10001;
            menu.style.border = '1.5px solid #2d8cf0';
            menu.style.fontSize = '13px';
            menu.style.color = '#fff';
            menu.style.userSelect = 'none';
            menu.style.transition = 'opacity 0.18s';

            // Helper to position menu below icon
            function positionMenu() {
                const rect = icon.getBoundingClientRect();
                menu.style.left = rect.left + 'px';
                menu.style.top = (rect.bottom + 6) + 'px';
            }


            // Menu items with disable logic
            function makeMenuBtn(text, onClick, color, id) {
                const btn = document.createElement('div');
                btn.textContent = text;
                btn.style.padding = '7px 16px';
                btn.style.cursor = 'pointer';
                btn.style.borderRadius = '7px';
                btn.style.margin = '2px 8px';
                btn.style.background = color || 'transparent';
                btn.style.fontWeight = 'bold';
                if (id) btn.id = id;
                btn.onmouseenter = () => {
                    if (!btn.classList.contains('vandu-disabled')) btn.style.background = '#2d8cf0';
                };
                btn.onmouseleave = () => btn.style.background = color || 'transparent';
                btn.onclick = function (e) {
                    e.stopPropagation();
                    if (btn.classList.contains('vandu-disabled')) {
                        showToast('Vui lòng reload lại game!', '#B71C1C');
                        return;
                    }
                    menu.style.display = 'none';
                    onClick();
                };
                return btn;
            }

            // ===== Hack Speed Menu =====
            let speedHack = {
                enabled: false,
                speed: 1,
                origSetInterval: window.setInterval,
                origSetTimeout: window.setTimeout,
                origDateNow: Date.now,
                origPerformanceNow: window.performance && window.performance.now ? window.performance.now : null
            };

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
                    if (typeof updateMenuDisableState === 'function') updateMenuDisableState();
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
                if (typeof updateMenuDisableState === 'function') updateMenuDisableState();
            }

            // Hack speed menu UI
            function showSpeedHackPopup() {
                let popup = document.getElementById('vandu-speedhack-popup');
                if (popup) { popup.style.display = 'block'; return; }
                popup = document.createElement('div');
                popup.id = 'vandu-speedhack-popup';
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
                        <button class="vandu-speed-btn" data-speed="1" style="background:#2d8cf0;color:#fff;border:none;border-radius:5px;padding:5px 12px;font-size:12px;font-weight:bold;cursor:pointer;">1x</button>
                        <button class="vandu-speed-btn" data-speed="2" style="background:#19be6b;color:#fff;border:none;border-radius:5px;padding:5px 12px;font-size:12px;font-weight:bold;cursor:pointer;">2x</button>
                        <button class="vandu-speed-btn" data-speed="3" style="background:#19be6b;color:#fff;border:none;border-radius:5px;padding:5px 12px;font-size:12px;font-weight:bold;cursor:pointer;">3x</button>
                        <button class="vandu-speed-btn" data-speed="5" style="background:#19be6b;color:#fff;border:none;border-radius:5px;padding:5px 12px;font-size:12px;font-weight:bold;cursor:pointer;">5x</button>
                        <button class="vandu-speed-btn" data-speed="10" style="background:#19be6b;color:#fff;border:none;border-radius:5px;padding:5px 12px;font-size:12px;font-weight:bold;cursor:pointer;">10x</button>
                        <button class="vandu-speed-btn" data-speed="20" style="background:#19be6b;color:#fff;border:none;border-radius:5px;padding:5px 12px;font-size:12px;font-weight:bold;cursor:pointer;">20x</button>
                    </div>
                    <div style="margin-bottom:8px;">Hoặc nhập tốc độ tuỳ chỉnh:</div>
                    <input id="vandu-speedhack-input" type="number" min="0.1" step="0.1" placeholder="Ví dụ: 7" style="width:80px;padding:4px 8px;border-radius:4px;border:1px solid #888;font-size:13px;"> <button id="vandu-speedhack-set" style="background:#FFD600;color:#222;border:none;border-radius:5px;padding:4px 10px;font-size:12px;font-weight:bold;cursor:pointer;">OK</button>
                    <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end;">
                        <button id="vandu-speedhack-close" style="background:#B71C1C;color:#fff;border:none;border-radius:5px;padding:5px 12px;font-size:12px;font-weight:bold;cursor:pointer;">Đóng</button>
                    </div>
                `;
                document.body.appendChild(popup);
                // Nút chọn nhanh
                popup.querySelectorAll('.vandu-speed-btn').forEach(btn => {
                    btn.onclick = function () {
                        const speed = parseFloat(btn.getAttribute('data-speed'));
                        applySpeedHack(speed);
                        popup.style.display = 'none';
                    };
                });
                // Nút nhập custom
                document.getElementById('vandu-speedhack-set').onclick = function () {
                    const val = parseFloat(document.getElementById('vandu-speedhack-input').value);
                    if (!isNaN(val) && val > 0) {
                        applySpeedHack(val);
                        popup.style.display = 'none';
                    } else {
                        showToast('Nhập tốc độ hợp lệ!', '#B71C1C');
                    }
                };
                // Nút đóng
                document.getElementById('vandu-speedhack-close').onclick = function () {
                    popup.style.display = 'none';
                };
            }

            // Auto toggle

            // Auto Vân Du
            const autoBtn = makeMenuBtn('Auto: ' + (autoEnabled ? 'ON' : 'OFF'), function () {
                autoEnabled = !autoEnabled;
                autoBtn.textContent = 'Auto: ' + (autoEnabled ? 'ON' : 'OFF');
                autoBtn.style.background = autoEnabled ? '#B71C1C' : 'transparent';
                if (autoEnabled) {
                    patchAuto();
                } else {
                    unpatchAuto();
                }
                updateMenuDisableState();
            }, autoEnabled ? '#B71C1C' : 'transparent', 'vandu-auto-btn-menu');
            menu.appendChild(autoBtn);

            // Block special sell toggle
            const blockBtn = makeMenuBtn('Chặn bán đặc biệt: ' + (blockSpecialSell ? 'ON' : 'OFF'), function () {
                toggleBlockSpecialSell();
                blockBtn.textContent = 'Chặn bán đặc biệt: ' + (blockSpecialSell ? 'ON' : 'OFF');
                blockBtn.style.background = blockSpecialSell ? '#2d8cf0' : 'transparent';
            }, blockSpecialSell ? '#2d8cf0' : 'transparent', 'vandu-block-btn-menu');
            menu.appendChild(blockBtn);

            // Hack speed
            const speedBtn = makeMenuBtn('Hack Speed', function () {
                showSpeedHackPopup();
            }, '#FF9800', 'vandu-speed-btn-menu');
            speedBtn.style.color = '#222';
            menu.appendChild(speedBtn);

            // Settings
            const settingsBtn = makeMenuBtn('Cài đặt ID giữ', function () {
                showSettingsPopup();
            }, '#FFD600', 'vandu-settings-btn-menu');
            settingsBtn.style.color = '#222';
            menu.appendChild(settingsBtn);

            // Lưu ý
            const noteBtn = document.createElement('div');
            noteBtn.textContent = '⚠️ Lưu ý: Không dùng Auto và Hack Speed cùng lúc!';
            noteBtn.style.fontSize = '12px';
            noteBtn.style.color = '#FFD600';
            noteBtn.style.fontWeight = 'bold';
            noteBtn.style.margin = '8px 8px 0 8px';
            noteBtn.style.textAlign = 'center';
            menu.appendChild(noteBtn);

            // Hàm cập nhật trạng thái disable các nút menu
            function updateMenuDisableState() {
                // Nếu hack speed đang bật thì disable 3 nút còn lại
                if (speedHack.enabled) {
                    autoBtn.classList.add('vandu-disabled');
                    blockBtn.classList.add('vandu-disabled');
                    settingsBtn.classList.add('vandu-disabled');
                    autoBtn.style.opacity = '0.5';
                    blockBtn.style.opacity = '0.5';
                    settingsBtn.style.opacity = '0.5';
                    speedBtn.classList.remove('vandu-disabled');
                    speedBtn.style.opacity = '1';
                } else if (autoEnabled) {
                    speedBtn.classList.add('vandu-disabled');
                    speedBtn.style.opacity = '0.5';
                    autoBtn.classList.remove('vandu-disabled');
                    blockBtn.classList.remove('vandu-disabled');
                    settingsBtn.classList.remove('vandu-disabled');
                    autoBtn.style.opacity = '1';
                    blockBtn.style.opacity = '1';
                    settingsBtn.style.opacity = '1';
                } else {
                    autoBtn.classList.remove('vandu-disabled');
                    blockBtn.classList.remove('vandu-disabled');
                    settingsBtn.classList.remove('vandu-disabled');
                    speedBtn.classList.remove('vandu-disabled');
                    autoBtn.style.opacity = '1';
                    blockBtn.style.opacity = '1';
                    settingsBtn.style.opacity = '1';
                    speedBtn.style.opacity = '1';
                }
            }

            // Cập nhật trạng thái disable khi mở menu
            updateMenuDisableState();

            // Footer
            const footer = document.createElement('div');
            footer.textContent = '© thhoang';
            footer.style.fontSize = '10px';
            footer.style.color = '#aaa';
            footer.style.textAlign = 'center';
            footer.style.margin = '6px 0 0 0';
            menu.appendChild(footer);

            // Show/hide menu on icon click
            icon.addEventListener('click', function (e) {
                e.stopPropagation();
                if (menu.style.display === 'none') {
                    positionMenu();
                    menu.style.display = 'block';
                    setTimeout(() => {
                        document.addEventListener('click', hideMenu, { once: true });
                    }, 0);
                } else {
                    menu.style.display = 'none';
                }
            });
            function hideMenu() { menu.style.display = 'none'; }

            // Reposition menu on window resize
            window.addEventListener('resize', positionMenu);

            // Settings popup (reuse old logic)
            function showSettingsPopup() {
                let popup = document.getElementById('vandu-settings-popup');
                if (popup) { popup.style.display = 'block'; return; }
                popup = document.createElement('div');
                popup.id = 'vandu-settings-popup';
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
                    <div style="font-weight:bold;font-size:15px;color:#2d8cf0;margin-bottom:8px;">Cài đặt ID cần giữ</div>
                    <div style="margin-bottom:6px;">Nhập các ID vật phẩm cần giữ lại, cách nhau bằng dấu phẩy (,):</div>
                    <textarea id="vandu-keepids-input" style="width:100%;height:38px;font-size:13px;border-radius:5px;padding:5px 7px;resize:vertical;">${keepIds.join(', ')}</textarea>
                    <div style="margin-top:10px;display:flex;gap:8px;justify-content:flex-end;">
                        <button id="vandu-keepids-save" style="background:#19be6b;color:#fff;border:none;border-radius:5px;padding:5px 12px;font-size:12px;font-weight:bold;cursor:pointer;">Lưu</button>
                        <button id="vandu-keepids-cancel" style="background:#B71C1C;color:#fff;border:none;border-radius:5px;padding:5px 12px;font-size:12px;font-weight:bold;cursor:pointer;">Hủy</button>
                    </div>
                `;
                document.body.appendChild(popup);
                document.getElementById('vandu-keepids-save').onclick = function () {
                    const val = document.getElementById('vandu-keepids-input').value;
                    let arr = [];
                    if (val.trim() !== '') {
                        arr = val.split(',').map(x => parseInt(x.trim(), 10)).filter(x => !isNaN(x));
                    }
                    keepIds = arr;
                    saveKeepIds();
                    showToast('✅ Đã lưu danh sách ID cần giữ!', '#19be6b');
                    popup.style.display = 'none';
                };
                document.getElementById('vandu-keepids-cancel').onclick = function () {
                    popup.style.display = 'none';
                };
            }

            document.body.appendChild(icon);
            document.body.appendChild(menu);
        }

        // Tự động xử lý event và gọi startAuto mỗi 5s nếu autoEnabled
        setInterval(function () {
            if (!autoEnabled) return;
            treasureModel = getModel();
            treasureCtrl = getCtrl();
            // Nếu đang có event thì chỉ xử lý event, không gọi startAuto
            if (treasureModel && treasureModel.treasureVo && treasureModel.treasureVo.event) {
                const e = treasureModel.treasureVo.event;
                if (e.item && treasureCtrl) {
                    const item = e.item;
                    console.log('[Vân Du Auto Tool] Xử lý event item:', item);
                    const itemId = Number(item.id);
                    logPatch(`[DEBUG] Gặp item: id=${itemId}, name=${item.name}, quaIdx=${item.quaIdx}, quality=${item.quality}`);
                    // Điều kiện nhận diện các vật phẩm đặc biệt cần giữ lại
                    if (keepIds.includes(itemId)) {
                        logPatch('Đã gặp item đặc biệt! Dừng auto và bật chặn bán, KHÔNG gán isTask/type.');
                        // KHÔNG gán e.isTask, e.type, item.isTask, item.type để không ảnh hưởng popup
                        // Gọi stopAuto(true) để game dừng auto hoàn toàn như logic gốc
                        let stopped = false;
                        if (typeof treasureCtrl.stopAuto === 'function') {
                            treasureCtrl.stopAuto(true);
                            stopped = true;
                        }
                        if (typeof treasureModel.stopAuto === 'function') {
                            treasureModel.stopAuto(true);
                            stopped = true;
                        }
                        // Bật lại công tắc chặn bán khi gặp item đặc biệt
                        enableBlockSpecialSell();
                        showToast('⏹️ Đã gặp item đặc biệt, dừng auto!', '#B71C1C');
                        turnOffAuto();
                        return;
                    } else if (typeof item.quaIdx === 'number' && item.quaIdx === 2) {
                        // quaIdx === 2 <=> quality = 3
                        logPatch('Giữ lại item quaIdx === 2 (quality = 3)');
                        //showToast('⭐ Giữ lại item phẩm chất 3', '#FF9800');
                        // if (typeof treasureCtrl.saveTreasure === 'function') {
                        //     treasureCtrl.saveTreasure();
                        // }
                        //turnOffAuto();
                        //return;
                    } else {
                        if (typeof treasureCtrl.sellTreasure === 'function') {
                            treasureCtrl.sellTreasure(itemId);
                            logPatch('Bán item không phải Trúc Tử Lôi, Bạc, Trận Bàn, Hoàn Hồn Thảo và quaIdx !== 2');
                            showToast('🗑️ Đã bán item: ' + (item.name || itemId), '#B71C1C');
                        }
                    }
                } else if ((e.monsterId || e.type === 'monster' || e.type === 2) && treasureCtrl && treasureCtrl.autoFinishBattle) {
                    treasureCtrl.autoFinishBattle(e.monsterId);
                } else if (treasureCtrl && treasureCtrl.autoDealEvent) {
                    treasureCtrl.autoDealEvent();
                }
                // Không ép event = null, để game tự clear khi callback xong
                return;
            }
            // Nếu không có event thì mới gọi startAuto để duy trì auto
            // === PATCH: Chỉ gọi startAuto nếu đã hết thời gian moveEndTime ===
            let moveEndTime = 0;
            if (treasureModel && treasureModel.treasureVo && typeof treasureModel.treasureVo.moveEndTime === 'number') {
                moveEndTime = treasureModel.treasureVo.moveEndTime;
            }
            const now = (window.sg && window.sg.time && typeof window.sg.time.getSecondTime === 'function') ? window.sg.time.getSecondTime() : Math.floor(Date.now() / 1000);
            if (moveEndTime && now < moveEndTime) {
                // Đang di chuyển, chưa đến thời gian, không gọi startAuto
                logPatch(`[PATCH] Đang di chuyển, chờ moveEndTime (${now} < ${moveEndTime})`);
                return;
            }
            if (treasureCtrl && typeof treasureCtrl.startAuto === 'function') {
                try {
                    treasureCtrl.startAuto();
                } catch (e) { }
            } else if (treasureModel && typeof treasureModel.startAuto === 'function') {
                try {
                    treasureModel.startAuto();
                } catch (e) { }
            }
        }, 5000);

        function patchGetter(obj, prop, value) {
            try {
                let desc = Object.getOwnPropertyDescriptor(obj, prop);
                if (!desc || !desc.configurable) {
                    Object.defineProperty(obj, prop, {
                        configurable: true,
                        get: function () { logPatch('GETTER ' + prop + ' => ' + value); return value; },
                        set: function (v) { logPatch('SETTER ' + prop + ' = ' + v + ' (ignored, always ' + value + ')'); }
                    });
                } else {
                    Object.defineProperty(obj, prop, {
                        configurable: true,
                        get: function () { logPatch('GETTER ' + prop + ' => ' + value); return value; },
                        set: function (v) { logPatch('SETTER ' + prop + ' = ' + v + ' (ignored, always ' + value + ')'); }
                    });
                }
            } catch (e) { logPatch('patchGetter failed for ' + prop + ': ' + e); }
        }

        function patchObj(obj, orig, label) {
            // Patch sâu vào hàm bán item để chặn bán các item đặc biệt
            if (obj && typeof obj.sellTreasure === 'function' && !obj._autoSellTreasurePatched) {
                obj._autoSellTreasurePatched = true;
                const originalSell = obj.sellTreasure;
                obj.sellTreasure = function (itemId) {
                    // Tìm item hiện tại trong event
                    let item = null;
                    try {
                        const model = getModel();
                        item = model?.treasureVo?.event?.item;
                    } catch { }
                    const idNum = Number(itemId);
                    // Sử dụng biến keepIds toàn cục (có thể chỉnh qua UI)
                    if (item && keepIds.includes(idNum)) {
                        logPatch(`[PATCH] Chặn bán item đặc biệt: id=${idNum}, name=${item.name}`);
                        showToast('⛔ Đã chặn bán item đặc biệt: ' + (item.name || idNum), '#B71C1C');
                        if (typeof this.saveTreasure === 'function') {
                            this.saveTreasure();
                        }
                        return;
                    }
                    // Nếu không phải item đặc biệt thì bán bình thường
                    return originalSell.call(this, itemId);
                };
            }
            if (!obj) return;
            try {
                // Backup originals
                if (!orig.isAutoCardActive) orig.isAutoCardActive = obj.isAutoCardActive;
                if (!orig.isAutoAdActive) orig.isAutoAdActive = obj.isAutoAdActive;
                if (!orig.isCanAuto) orig.isCanAuto = obj.isCanAuto;
                // Patch methods
                obj.isAutoCardActive = function () { logPatch(label + '.isAutoCardActive() called'); return true; };
                obj.isAutoAdActive = function () { logPatch(label + '.isAutoAdActive() called'); return true; };
                obj.isCanAuto = function () { logPatch(label + '.isCanAuto() called'); return true; };
                // Patch properties (deep)
                patchGetter(obj, '_autoCardActive', true);
                patchGetter(obj, '_autoAdActive', true);
                patchGetter(obj, 'autoCardActive', true);
                patchGetter(obj, 'autoAdActive', true);
                patchGetter(obj, 'canAuto', true);
                // Patch all boolean properties containing 'auto' or 'card' or 'ad'
                for (let key in obj) {
                    if (typeof obj[key] === 'boolean' && /(auto|card|ad)/i.test(key)) {
                        patchGetter(obj, key, true);
                    }
                }
                logPatch('Đã patch ' + label + ' auto!');
            } catch (e) { logPatch('Patch lỗi ' + label + ': ' + e); }
        }

        function patchAuto() {
            treasureModel = getModel();
            treasureCtrl = getCtrl();
            patchObj(treasureModel, original.model, 'model');
            patchObj(treasureCtrl, original.ctrl, 'ctrl');
            patchSellTreasureGlobal();
        }

        function unpatchObj(obj, orig, label) {
            if (!obj) return;
            try {
                if (orig.isAutoCardActive) obj.isAutoCardActive = orig.isAutoCardActive;
                if (orig.isAutoAdActive) obj.isAutoAdActive = orig.isAutoAdActive;
                if (orig.isCanAuto) obj.isCanAuto = orig.isCanAuto;
                obj._autoCardActive = false;
                obj._autoAdActive = false;
                obj.autoCardActive = false;
                obj.autoAdActive = false;
                obj.canAuto = false;
            } catch (e) { }
            logPatch('Đã tắt patch ' + label + ' auto!');
        }

        function unpatchAuto() {
            treasureModel = getModel();
            treasureCtrl = getCtrl();
            unpatchObj(treasureModel, original.model, 'model');
            unpatchObj(treasureCtrl, original.ctrl, 'ctrl');
            // Cập nhật trạng thái disable menu
            if (typeof updateMenuDisableState === 'function') updateMenuDisableState();
        }


        // Đợi window.onload rồi mới bắt đầu patch và tạo UI
        function initAll() {
            createUI();
            patchSellTreasureGlobal();
        }
        // Patch lại sellTreasure liên tục mỗi 2 giây để không bị ghi đè
        setInterval(() => {
            try { patchSellTreasureGlobal(); } catch (e) { }
            // Log mọi object trên window có hàm sellTreasure để debug context thực sự
            for (const key in window) {
                try {
                    const obj = window[key];
                    if (obj && typeof obj.sellTreasure === 'function' && !obj._autoSellTreasurePatched) {
                        console.log('[Vân Du Auto Tool][DEBUG] Found sellTreasure on window.' + key, obj);
                    }
                } catch {}
            }
        }, 2000);
        if (document.readyState === 'complete') {
            setTimeout(initAll, 1000);
        } else {
            window.addEventListener('load', function () {
                setTimeout(initAll, 1000);
            });
        }
    };

    // Inject code vào page context
    const script = document.createElement('script');
    script.textContent = '(' + realCode.toString() + ')();';
    document.documentElement.appendChild(script);
    script.remove();
})();
