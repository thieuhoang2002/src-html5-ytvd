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
(function() {
    'use strict';

    // Code thực thi trong page context

    const realCode = function() {
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
            logPatch('Đang tạo UI nút auto...');
            const btn = document.createElement('button');
            btn.id = 'vandu-auto-btn';
            btn.style.position = 'fixed';
            btn.style.top = '20px';
            btn.style.right = '20px';
            btn.style.zIndex = 99999;
            btn.style.background = '#2d8cf0';
            btn.style.color = '#fff';
            btn.style.border = 'none';
            btn.style.borderRadius = '6px';
            btn.style.padding = '10px 18px';
            btn.style.fontSize = '16px';
            btn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
            btn.style.cursor = 'pointer';
            btn.textContent = 'Vân Du Auto: OFF';
            btn.onclick = function() {
                autoEnabled = !autoEnabled;
                btn.textContent = 'Vân Du Auto: ' + (autoEnabled ? 'ON' : 'OFF');
                if (autoEnabled) {
                    patchAuto();
                    btn.style.background = '#19be6b';
                } else {
                    unpatchAuto();
                    btn.style.background = '#2d8cf0';
                }
            };
            document.body.appendChild(btn);
            logPatch('Đã tạo xong UI nút auto!');
        }

        // Tự động gọi startAuto mỗi 5s nếu autoEnabled
        setInterval(function() {
            if (autoEnabled) {
                if (treasureCtrl && typeof treasureCtrl.startAuto === 'function') {
                    try {
                        treasureCtrl.startAuto();
                        logPatch('Đã gọi treasureCtrl.startAuto()');
                    } catch (e) { logPatch('Lỗi khi gọi treasureCtrl.startAuto: ' + e); }
                } else if (treasureModel && typeof treasureModel.startAuto === 'function') {
                    try {
                        treasureModel.startAuto();
                        logPatch('Đã gọi treasureModel.startAuto()');
                    } catch (e) { logPatch('Lỗi khi gọi treasureModel.startAuto: ' + e); }
                }
            }
        }, 5000);

        function patchGetter(obj, prop, value) {
            try {
                let desc = Object.getOwnPropertyDescriptor(obj, prop);
                if (!desc || !desc.configurable) {
                    Object.defineProperty(obj, prop, {
                        configurable: true,
                        get: function() { logPatch('GETTER ' + prop + ' => ' + value); return value; },
                        set: function(v) { logPatch('SETTER ' + prop + ' = ' + v + ' (ignored, always ' + value + ')'); }
                    });
                } else {
                    Object.defineProperty(obj, prop, {
                        configurable: true,
                        get: function() { logPatch('GETTER ' + prop + ' => ' + value); return value; },
                        set: function(v) { logPatch('SETTER ' + prop + ' = ' + v + ' (ignored, always ' + value + ')'); }
                    });
                }
            } catch (e) { logPatch('patchGetter failed for ' + prop + ': ' + e); }
        }

        function patchObj(obj, orig, label) {
            if (!obj) return;
            try {
                // Backup originals
                if (!orig.isAutoCardActive) orig.isAutoCardActive = obj.isAutoCardActive;
                if (!orig.isAutoAdActive) orig.isAutoAdActive = obj.isAutoAdActive;
                if (!orig.isCanAuto) orig.isCanAuto = obj.isCanAuto;
                // Patch methods
                obj.isAutoCardActive = function() { logPatch(label + '.isAutoCardActive() called'); return true; };
                obj.isAutoAdActive = function() { logPatch(label + '.isAutoAdActive() called'); return true; };
                obj.isCanAuto = function() { logPatch(label + '.isCanAuto() called'); return true; };
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
            } catch (e) {}
            logPatch('Đã tắt patch ' + label + ' auto!');
        }

        function unpatchAuto() {
            treasureModel = getModel();
            treasureCtrl = getCtrl();
            unpatchObj(treasureModel, original.model, 'model');
            unpatchObj(treasureCtrl, original.ctrl, 'ctrl');
        }

        // Đợi window.onload rồi mới bắt đầu patch
        if (document.readyState === 'complete') {
            setTimeout(createUI, 1000);
        } else {
            window.addEventListener('load', function() {
                setTimeout(createUI, 1000);
            });
        }
    };

    // Inject code vào page context
    const script = document.createElement('script');
    script.textContent = '(' + realCode.toString() + ')();';
    document.documentElement.appendChild(script);
    script.remove();
})();
