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
        // Hiển thị thông báo nổi trên trình duyệt
        function showToast(msg, color = '#B71C1C', opts = {}) {
            let toast = document.getElementById('vandu-toast');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'vandu-toast';
                toast.style.position = 'fixed';
                toast.style.left = '50%';
                toast.style.top = '50%';
                toast.style.transform = 'translate(-50%, -50%)';
                toast.style.zIndex = 100001;
                toast.style.background = color;
                toast.style.color = '#fff';
                toast.style.padding = '32px 48px';
                toast.style.borderRadius = '16px';
                toast.style.fontSize = '32px';
                toast.style.fontWeight = 'bold';
                toast.style.boxShadow = '0 4px 24px rgba(0,0,0,0.25)';
                toast.style.opacity = 0;
                toast.style.transition = 'opacity 0.3s';
                toast.style.pointerEvents = 'none';
                document.body.appendChild(toast);
            }
            toast.textContent = msg;
            toast.style.background = color;
            toast.style.opacity = 1;
            setTimeout(() => { toast.style.opacity = 0; }, opts.duration || 6000);
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
            logPatch('Đang tạo UI tool chuyên nghiệp...');
            // UI nhỏ gọn
            const uiContainer = document.createElement('div');
            uiContainer.id = 'vandu-ui-container';
            uiContainer.style.position = 'fixed';
            uiContainer.style.right = '18px';
            uiContainer.style.bottom = '18px';
            uiContainer.style.zIndex = 10000;
            uiContainer.style.pointerEvents = 'none';
            uiContainer.style.background = 'rgba(30,34,54,0.92)';
            uiContainer.style.borderRadius = '12px';
            uiContainer.style.boxShadow = '0 4px 16px rgba(0,0,0,0.18)';
            uiContainer.style.padding = '16px 18px 12px 18px';
            uiContainer.style.display = 'flex';
            uiContainer.style.flexDirection = 'column';
            uiContainer.style.alignItems = 'center';
            uiContainer.style.gap = '10px';
            uiContainer.style.minWidth = '180px';
            uiContainer.style.border = '1px solid #2d8cf0';

            // Tiêu đề nhỏ gọn
            const title = document.createElement('div');
            title.textContent = 'Vân Du Auto Tool';
            title.style.fontSize = '16px';
            title.style.fontWeight = 'bold';
            title.style.color = '#2d8cf0';
            title.style.letterSpacing = '0.5px';
            title.style.marginBottom = '2px';
            title.style.textShadow = '0 1px 4px rgba(45,140,240,0.10)';
            uiContainer.appendChild(title);

            // Nút bật/tắt auto
            const btn = document.createElement('button');
            btn.id = 'vandu-auto-btn';
            btn.style.background = '#19be6b';
            btn.style.color = '#fff';
            btn.style.border = 'none';
            btn.style.borderRadius = '6px';
            btn.style.padding = '8px 18px';
            btn.style.fontSize = '14px';
            btn.style.fontWeight = 'bold';
            btn.style.boxShadow = '0 1px 6px rgba(25,190,107,0.10)';
            btn.style.cursor = 'pointer';
            btn.style.pointerEvents = 'auto';
            btn.style.transition = 'background 0.2s';
            btn.textContent = 'Bật Auto Vân Du';
            btn.onclick = function () {
                autoEnabled = !autoEnabled;
                btn.textContent = autoEnabled ? 'Tắt Auto Vân Du' : 'Bật Auto Vân Du';
                btn.style.background = autoEnabled ? '#B71C1C' : '#19be6b';
                if (autoEnabled) {
                    patchAuto();
                } else {
                    unpatchAuto();
                }
            };
            uiContainer.appendChild(btn);

            // Nút chặn bán item đặc biệt
            const blockBtn = document.createElement('button');
            blockBtn.id = 'vandu-block-special-btn';
            blockBtn.style.background = blockSpecialSell ? '#2d8cf0' : '#B71C1C';
            blockBtn.style.color = '#fff';
            blockBtn.style.border = 'none';
            blockBtn.style.borderRadius = '6px';
            blockBtn.style.padding = '7px 14px';
            blockBtn.style.fontSize = '13px';
            blockBtn.style.fontWeight = 'bold';
            blockBtn.style.boxShadow = '0 1px 6px rgba(45,140,240,0.10)';
            blockBtn.style.cursor = 'pointer';
            blockBtn.style.pointerEvents = 'auto';
            blockBtn.style.transition = 'background 0.2s';
            blockBtn.textContent = blockSpecialSell ? 'Chặn bán item đặc biệt: ON' : 'Chặn bán item đặc biệt: OFF';
            blockBtn.onclick = function () {
                toggleBlockSpecialSell();
                blockBtn.style.background = blockSpecialSell ? '#2d8cf0' : '#B71C1C';
                blockBtn.textContent = blockSpecialSell ? 'Chặn bán item đặc biệt: ON' : 'Chặn bán item đặc biệt: OFF';
            };
            uiContainer.appendChild(blockBtn);

            // Nút cài đặt chỉnh sửa keepIds
            const settingsBtn = document.createElement('button');
            settingsBtn.id = 'vandu-settings-btn';
            settingsBtn.textContent = 'Cài đặt';
            settingsBtn.style.background = '#FFD600';
            settingsBtn.style.color = '#222';
            settingsBtn.style.border = 'none';
            settingsBtn.style.borderRadius = '6px';
            settingsBtn.style.padding = '7px 14px';
            settingsBtn.style.fontSize = '13px';
            settingsBtn.style.fontWeight = 'bold';
            settingsBtn.style.boxShadow = '0 1px 6px rgba(255,214,0,0.10)';
            settingsBtn.style.cursor = 'pointer';
            settingsBtn.style.pointerEvents = 'auto';
            settingsBtn.style.transition = 'background 0.2s';
            settingsBtn.style.marginBottom = '2px';
            settingsBtn.onclick = function () {
                showSettingsPopup();
            };
            uiContainer.appendChild(settingsBtn);

            // Popup chỉnh sửa keepIds (cho phép để trống)
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
                popup.style.padding = '28px 32px 18px 32px';
                popup.style.borderRadius = '14px';
                popup.style.boxShadow = '0 4px 32px rgba(0,0,0,0.28)';
                popup.style.minWidth = '320px';
                popup.style.maxWidth = '90vw';
                popup.style.fontSize = '15px';
                popup.innerHTML = `
                    <div style="font-weight:bold;font-size:18px;color:#2d8cf0;margin-bottom:10px;">Cài đặt danh sách ID cần giữ</div>
                    <div style="margin-bottom:8px;">Nhập các ID vật phẩm cần giữ lại, cách nhau bằng dấu phẩy (,):</div>
                    <textarea id="vandu-keepids-input" style="width:100%;height:60px;font-size:15px;border-radius:6px;padding:6px 8px;resize:vertical;">${keepIds.join(', ')}</textarea>
                    <div style="margin-top:14px;display:flex;gap:10px;justify-content:flex-end;">
                        <button id="vandu-keepids-save" style="background:#19be6b;color:#fff;border:none;border-radius:6px;padding:7px 18px;font-size:14px;font-weight:bold;cursor:pointer;">Lưu</button>
                        <button id="vandu-keepids-cancel" style="background:#B71C1C;color:#fff;border:none;border-radius:6px;padding:7px 18px;font-size:14px;font-weight:bold;cursor:pointer;">Hủy</button>
                    </div>
                `;
                document.body.appendChild(popup);
                document.getElementById('vandu-keepids-save').onclick = function () {
                    const val = document.getElementById('vandu-keepids-input').value;
                    let arr = [];
                    if (val.trim() !== '') {
                        arr = val.split(',').map(x => parseInt(x.trim(), 10)).filter(x => !isNaN(x));
                    }
                    // Cho phép arr rỗng
                    keepIds = arr;
                    saveKeepIds();
                    showToast('✅ Đã lưu danh sách ID cần giữ!', '#19be6b');
                    popup.style.display = 'none';
                };
                document.getElementById('vandu-keepids-cancel').onclick = function () {
                    popup.style.display = 'none';
                };
            }

            // Footer nhỏ gọn
            const footer = document.createElement('div');
            footer.textContent = '© thhoangdeptraivippro12345';
            footer.style.fontSize = '11px';
            footer.style.color = '#aaa';
            footer.style.marginTop = '4px';
            footer.style.letterSpacing = '0.3px';
            uiContainer.appendChild(footer);

            document.body.appendChild(uiContainer);
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
                        showToast('⭐ Giữ lại item phẩm chất 3', '#FF9800');
                        if (typeof treasureCtrl.saveTreasure === 'function') {
                            treasureCtrl.saveTreasure();
                        }
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
        }

        // ========== Tích hợp màn hình console log Vân Du ==========
        function createMonitorUI() {
            if (document.getElementById('vandu-monitor-panel')) return;
            const panel = document.createElement('div');
            panel.id = 'vandu-monitor-panel';
            panel.style.cssText = `
                position: fixed; top: 60px; right: 12px; width: 350px; max-height: 500px;
                background: rgba(0,0,0,0.92); border: 2px solid #4CAF50; border-radius: 8px; padding: 12px;
                color: #fff; font-family: monospace; font-size: 12px; z-index: 999998; overflow-y: auto; display: none;`;
                        panel.innerHTML = `
                            <div style="font-weight: bold; margin-bottom: 8px; color: #4CAF50; border-bottom: 1px solid #4CAF50; padding-bottom: 4px;">📊 VÂN DU MONITOR</div>
                            <div id="vandu-status" style="margin-bottom: 8px;"><span style="color: #888;">Đang khởi tạo...</span></div>
                            <div id="vandu-statistics" style="margin-bottom: 8px; padding: 8px; background: rgba(255,152,0,0.1); border-radius: 4px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                    <span style="font-weight: bold; color: #FF9800;">📈 Thống kê tỉ lệ:</span>
                                    <button id="vandu-reset-stats-btn" style="padding: 2px 8px; font-size: 10px; background: #FF5252; border: 1px solid #C62828; border-radius: 3px; color: white; cursor: pointer;">Reset</button>
                                </div>
                                <div id="vandu-statistics-content" style="color: #ccc; font-size: 11px; margin-top: 4px;">Chưa có dữ liệu</div>
                            </div>
                            <div id="vandu-current-event" style="margin-bottom: 8px; padding: 8px; background: rgba(76,175,80,0.1); border-radius: 4px;">
                                <div style="font-weight: bold; color: #4CAF50;">Sự kiện hiện tại:</div>
                                <div id="vandu-current-event-content" style="color: #ccc; margin-top: 4px;">Không có</div>
                            </div>
                        `;
            const toggleBtn = document.createElement('button');
            toggleBtn.id = 'vandu-monitor-toggle-btn';
            toggleBtn.innerText = 'Monitor: OFF';
            toggleBtn.style.cssText = `position: fixed; right: 12px; top: 52px; z-index: 999999; padding: 8px 12px; background: #4CAF50; border: 2px solid #2E7D32; border-radius: 6px; color: white; font-size: 13px; cursor: pointer; font-weight: bold;`;
            toggleBtn.addEventListener('click', () => {
                vanduMonitor.running ? stopMonitor() : startMonitor();
            });
            document.body.appendChild(panel);
            document.body.appendChild(toggleBtn);
            setTimeout(() => {
                const resetBtn = document.getElementById('vandu-reset-stats-btn');
                if (resetBtn) resetBtn.addEventListener('click', () => { resetStatistics(); });
            }, 100);
        }

        // Monitor logic
        const vanduMonitor = {
            running: false,
            intervalId: null,
            lastEventId: null,
            eventHistory: [],
            statistics: { totalEvents: 0, items: {}, monsters: 0, others: 0, itemsByQuality: {}, startTime: null },
        };
        function updateStatus(text, color = '#4CAF50') {
            const el = document.getElementById('vandu-status');
            if (el) el.innerHTML = `<span style="color: ${color};">${text}</span>`;
        }
        function resetStatistics() {
            vanduMonitor.statistics = { totalEvents: 0, items: {}, monsters: 0, others: 0, itemsByQuality: {}, startTime: Date.now() };
            updateStatisticsDisplay();
        }
        function updateStatistics(eventData) {
            const stats = vanduMonitor.statistics;
            if (!stats.startTime) stats.startTime = Date.now();
            stats.totalEvents++;
            if (eventData.item) {
                const item = eventData.item;
                const itemKey = `${item.name || item.id || 'Unknown'}`;
                if (!stats.items[itemKey]) stats.items[itemKey] = { count: 0, quality: item.quality || 'N/A', id: item.id };
                stats.items[itemKey].count++;
                const quality = item.quality || 'Unknown';
                stats.itemsByQuality[quality] = (stats.itemsByQuality[quality] || 0) + 1;
            } else if (eventData.monsterId || eventData.type === 'monster' || eventData.type === 2) {
                stats.monsters++;
            } else {
                stats.others++;
            }
            updateStatisticsDisplay();
        }
        function updateStatisticsDisplay() {
            const el = document.getElementById('vandu-statistics-content');
            if (!el) return;
            const stats = vanduMonitor.statistics;
            if (stats.totalEvents === 0) { el.innerHTML = '<span style="color: #888;">Chưa có dữ liệu</span>'; return; }
            const duration = stats.startTime ? Math.floor((Date.now() - stats.startTime) / 1000) : 0;
            const minutes = Math.floor(duration / 60);
            const seconds = duration % 60;
            let html = '<div style="line-height: 1.6;">';
            html += `<div style="margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid #444;">`;
            html += `<div><strong>Tổng sự kiện:</strong> <span style="color: #4CAF50;">${stats.totalEvents}</span></div>`;
            html += `<div><strong>Thời gian:</strong> ${minutes}p ${seconds}s</div>`;
            html += `</div>`;
            const totalItems = Object.values(stats.items).reduce((sum, item) => sum + item.count, 0);
            const itemPercent = ((totalItems / stats.totalEvents) * 100).toFixed(1);
            const monsterPercent = ((stats.monsters / stats.totalEvents) * 100).toFixed(1);
            const otherPercent = ((stats.others / stats.totalEvents) * 100).toFixed(1);
            html += `<div style="margin-bottom: 6px;">`;
            html += `<div>🎁 Vật phẩm: <span style="color: #FFD700;">${totalItems}</span> (<span style="color: #8BC34A;">${itemPercent}%</span>)</div>`;
            html += `<div>⚔️ Quái vật: <span style="color: #FF5252;">${stats.monsters}</span> (<span style="color: #8BC34A;">${monsterPercent}%</span>)</div>`;
            html += `<div>❓ Khác: <span style="color: #9C27B0;">${stats.others}</span> (<span style="color: #8BC34A;">${otherPercent}%</span>)</div>`;
            html += `</div>`;
            if (Object.keys(stats.itemsByQuality).length > 0) {
                html += `<div style="margin-bottom: 6px; padding-top: 4px; border-top: 1px solid #444;">`;
                html += `<div style="color: #FFB84D; margin-bottom: 2px;"><strong>Theo phẩm chất:</strong></div>`;
                Object.entries(stats.itemsByQuality).sort((a, b) => b[1] - a[1]).forEach(([quality, count]) => {
                    const percent = ((count / totalItems) * 100).toFixed(1);
                    html += `<div style="margin-left: 8px;">${quality}: ${count} (<span style="color: #8BC34A;">${percent}%</span>)</div>`;
                });
                html += `</div>`;
            }
            const topItems = Object.entries(stats.items).sort((a, b) => b[1].count - a[1].count).slice(0, 5);
            if (topItems.length > 0) {
                html += `<div style="padding-top: 4px; border-top: 1px solid #444;">`;
                html += `<div style="color: #FFB84D; margin-bottom: 2px;"><strong>Top vật phẩm:</strong></div>`;
                topItems.forEach(([name, data]) => {
                    const percent = ((data.count / totalItems) * 100).toFixed(1);
                    html += `<div style="margin-left: 8px; font-size: 10px;">${name} (${data.quality}): ${data.count} (<span style="color: #8BC34A;">${percent}%</span>)</div>`;
                });
                html += `</div>`;
            }
            html += '</div>';
            el.innerHTML = html;
        }
        function updateCurrentEvent(eventData) {
            const el = document.getElementById('vandu-current-event-content');
            if (!el) return;
            if (!eventData) { el.innerHTML = '<span style="color: #888;">Không có sự kiện</span>'; return; }
            let html = '<div style="line-height: 1.5;">';
            let eventType = '❓ Sự kiện khác';
            let eventColor = '#9C27B0';
            if (eventData.item) { eventType = '🎁 Vật phẩm'; eventColor = '#FFD700'; }
            else if (eventData.monsterId || eventData.type === 'monster' || eventData.type === 2) { eventType = '⚔️ Quái vật'; eventColor = '#FF5252'; }
            html += `<div style="color: ${eventColor}; font-weight: bold; margin-bottom: 6px;">${eventType}</div>`;
            const renderObject = (obj, level = 0) => {
                let result = '', indent = '&nbsp;'.repeat(level * 4);
                if (obj === null || obj === undefined) return `${indent}<span style="color: #888;">null</span>`;
                if (typeof obj !== 'object' || obj instanceof Date) {
                    const val = typeof obj === 'string' ? `"${obj}"` : String(obj);
                    return `${indent}<span style="color: #8BC34A;">${val}</span>`;
                }
                if (Array.isArray(obj)) {
                    if (obj.length === 0) return `${indent}[]`;
                    result += `${indent}[<br>`;
                    obj.forEach((item, idx) => { result += `${indent}&nbsp;&nbsp;${idx}: ${renderObject(item, level + 1)}<br>`; });
                    result += `${indent}]`;
                    return result;
                }
                const entries = Object.entries(obj);
                if (entries.length === 0) return `${indent}{}`;
                entries.forEach(([key, value]) => {
                    result += `${indent}<span style="color: #64B5F6;">${key}</span>: `;
                    if (value === null || value === undefined) result += `<span style="color: #888;">null</span><br>`;
                    else if (typeof value === 'object') { result += `<br>`; result += renderObject(value, level + 1); }
                    else { const displayValue = typeof value === 'string' ? `"${value}"` : String(value); result += `<span style="color: #8BC34A;">${displayValue}</span><br>`; }
                });
                return result;
            };
            html += '<div style="margin-left: 8px; font-size: 11px;">';
            html += renderObject(eventData, 0);
            html += '</div></div>';
            el.innerHTML = html;
        }
        function updateTreasureInfo(treasureVo) {
            const el = document.getElementById('vandu-info-content');
            if (!el || !treasureVo) return;
            let html = '<div style="line-height: 1.6; font-size: 11px;">';
            const entries = Object.entries(treasureVo).filter(([key]) => key !== 'event');
            entries.forEach(([key, value]) => {
                let displayValue, icon = '';
                if (key === 'progress' || key.includes('progress')) icon = '🎲 ';
                else if (key === 'money' || key.includes('money')) icon = '💰 ';
                else if (key === 'score' || key.includes('score')) icon = '⭐ ';
                else if (key === 'isAuto' || key.includes('auto')) icon = '🤖 ';
                else if (key.includes('qua') || key.includes('Qua')) icon = '📍 ';
                if (value === null || value === undefined) displayValue = '<span style="color: #888;">null</span>';
                else if (typeof value === 'boolean') { const color = value ? '#4CAF50' : '#FF5252'; displayValue = `<span style="color: ${color}; font-weight: bold;">${value ? 'BẬT' : 'TẮT'}</span>`; }
                else if (typeof value === 'object') {
                    if (Array.isArray(value)) {
                        displayValue = `<span style="color: #FF9800;">[Array(${value.length})]</span>`;
                        if (value.length > 0 && value.length <= 5) {
                            displayValue += '<div style="margin-left: 16px; margin-top: 2px;">';
                            value.forEach((item, idx) => { displayValue += `<div style="color: #888;">[${idx}]: ${typeof item === 'object' ? JSON.stringify(item) : item}</div>`; });
                            displayValue += '</div>';
                        }
                    } else {
                        displayValue = `<span style="color: #9C27B0;">{Object}</span>`;
                        const subEntries = Object.entries(value).slice(0, 3);
                        if (subEntries.length > 0) {
                            displayValue += '<div style="margin-left: 16px; margin-top: 2px;">';
                            subEntries.forEach(([k, v]) => { displayValue += `<div style="color: #888;">${k}: ${typeof v === 'object' ? '{...}' : v}</div>`; });
                            if (Object.keys(value).length > 3) displayValue += '<div style="color: #666;">...</div>';
                            displayValue += '</div>';
                        }
                    }
                } else if (typeof value === 'string') displayValue = `<span style="color: #8BC34A;">\"${value}\"</span>`;
                else displayValue = `<span style="color: #64B5F6;">${value}</span>`;
                html += `<div style="margin-bottom: 4px;">${icon}<span style="color: #FFB84D;">${key}</span>: ${displayValue}</div>`;
            });
            if (entries.length === 0) html += '<span style="color: #888;">Không có dữ liệu</span>';
            html += '</div>';
            el.innerHTML = html;
        }
        function addToHistory(eventData, timestamp = Date.now()) {
            let type = '❓ Khác', desc = 'Sự kiện không xác định';
            if (eventData.item) { type = '🎁 Vật phẩm'; desc = `${eventData.item.name || eventData.item.id} (${eventData.item.quality || 'N/A'})`; }
            else if (eventData.monsterId || eventData.type === 'monster' || eventData.type === 2) { type = '⚔️ Quái vật'; desc = `Monster ${eventData.monsterId || eventData.type}`; }
            const time = new Date(timestamp).toLocaleTimeString('vi-VN');
            vanduMonitor.eventHistory.unshift({ type, desc, time });
            vanduMonitor.eventHistory = vanduMonitor.eventHistory.slice(0, 5);
            const historyEl = document.getElementById('vandu-history');
            if (historyEl) historyEl.innerHTML = vanduMonitor.eventHistory.map(h => `<div style="padding: 3px 0; border-bottom: 1px solid #333;">[${h.time}] ${h.type} - ${h.desc}</div>`).join('');
        }
        function monitorLoop() {
            const mvc = getMvc();
            const model = mvc?.TreasureModel?.instance || mvc?.treasureModel;
            if (!model) { updateStatus('❌ Chưa kết nối', '#FF5252'); return; }
            const vo = model.treasureVo;
            if (!vo) { updateStatus('⚠️ Không có treasureVo', '#FF9800'); return; }
            updateStatus('✅ Đang theo dõi...', '#4CAF50');
            updateTreasureInfo(vo);
            if (vo.event) {
                const eventId = JSON.stringify(vo.event);
                if (eventId !== vanduMonitor.lastEventId) {
                    vanduMonitor.lastEventId = eventId;
                    updateCurrentEvent(vo.event);
                    addToHistory(vo.event);
                    updateStatistics(vo.event);
                }
            } else {
                if (vanduMonitor.lastEventId !== null) {
                    vanduMonitor.lastEventId = null;
                    updateCurrentEvent(null);
                }
            }
        }
        function startMonitor() {
            if (vanduMonitor.running) return;
            createMonitorUI();
            const btn = document.getElementById('vandu-monitor-toggle-btn');
            if (btn) { btn.innerText = 'Monitor: ON'; btn.style.background = '#FF5252'; btn.style.borderColor = '#C62828'; }
            const panel = document.getElementById('vandu-monitor-panel');
            if (panel) panel.style.display = 'block';
            vanduMonitor.running = true;
            vanduMonitor.lastEventId = null;
            vanduMonitor.eventHistory = [];
            resetStatistics();
            vanduMonitor.intervalId = setInterval(monitorLoop, 500);
        }
        function stopMonitor() {
            if (!vanduMonitor.running) return;
            const btn = document.getElementById('vandu-monitor-toggle-btn');
            if (btn) { btn.innerText = 'Monitor: OFF'; btn.style.background = '#4CAF50'; btn.style.borderColor = '#2E7D32'; }
            const panel = document.getElementById('vandu-monitor-panel');
            if (panel) panel.style.display = 'none';
            vanduMonitor.running = false;
            clearInterval(vanduMonitor.intervalId);
            vanduMonitor.intervalId = null;
            updateStatus('⏸️ Đã dừng', '#888');
        }

        // Đợi window.onload rồi mới bắt đầu patch và tạo UI
        function initAll() {
            createUI();
            createMonitorUI();
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
