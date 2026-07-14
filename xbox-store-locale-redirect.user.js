// ==UserScript==
// @name         Xbox Store Locale Redirect
// @namespace    https://xbox.com/
// @version      2.1.0
// @description  Redirige las páginas de Xbox Store al idioma/región del navegador, y en la lista de deseos (/wishlist) agrega ordenar y filtrar (por agregado, nombre, precio y descuento; filtro "solo con descuento") con recuerdo de la elección y URL compartible.
// @author       g31w0fw0rld
// @license      MIT
// @match        https://www.xbox.com/*/games/store/*
// @match        https://www.xbox.com/*/wishlist*
// @downloadURL  https://github.com/g31w0fw0rld/xbox-store-locale-redirect/raw/main/xbox-store-locale-redirect.user.js
// @updateURL    https://github.com/g31w0fw0rld/xbox-store-locale-redirect/raw/main/xbox-store-locale-redirect.user.js
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // =============================================
    // DETECCIÓN DE RUTA
    // =============================================
    const WISHLIST_PATH_REGEX = /\/wishlist(?:\/|$)/i;
    function isWishlist() { return WISHLIST_PATH_REGEX.test(location.pathname); }

    // =============================================
    // LOCALE REDIRECT (solo en páginas de producto de la tienda)
    // =============================================

    // Patrón para detectar el segmento de locale en la ruta (ej. /en-us/, /pt-br/).
    const LOCALE_PATH_REGEX = /\/([a-z]{2}-[a-z]{2})\//i;

    /**
     * Obtiene el locale del navegador en formato lowercase (ej. "es-mx").
     * @returns {string} El locale del navegador.
     */
    function getBrowserLocale() {
        const lang = navigator.language || navigator.languages[0] || 'en-us';
        return lang.toLowerCase();
    }

    /**
     * Si el locale en la URL difiere del del navegador, reemplaza el segmento
     * y redirige con location.replace() (sin entrada en el historial).
     */
    function redirectIfNeeded() {
        const currentUrl = window.location.href;
        const match = currentUrl.match(LOCALE_PATH_REGEX);
        if (!match) return;

        const currentLocale = match[1].toLowerCase();
        const browserLocale = getBrowserLocale();
        if (currentLocale === browserLocale) return;

        const newUrl = currentUrl.replace(LOCALE_PATH_REGEX, `/${browserLocale}/`);
        if (currentUrl !== newUrl) window.location.replace(newUrl);
    }

    // =============================================
    // WISHLIST — ordenar y filtrar
    // =============================================
    // El wishlist de Xbox usa clases CSS-module hasheadas (el sufijo cambia por
    // build), así que se seleccionan por SUBcadena estable del nombre de módulo
    // (p. ej. [class*="WishlistProductItem-module__itemContainer"]).
    const ITEM_SELECTOR = 'div[class*="WishlistProductItem-module__itemContainer"]';
    const TITLE_SELECTOR = 'a[class*="WishlistProductItem-module__primaryText"]';
    const PRICE_BOX_SELECTOR = 'div[class*="Price-module__priceBaseContainer"]';
    const ORIG_PRICE_SELECTOR = 'span[class*="Price-module__originalPrice"]';
    const DISC_PRICE_SELECTOR = 'span[class*="Price-module__listedDiscountPrice"]';
    const BOLD_PRICE_SELECTOR = 'span[class*="Price-module__boldText"]';

    const ORD_ATTR = 'data-xbwl-ord';
    const TOOLBAR_ID = 'xbwl-toolbar';
    const STYLES_ID = 'xbwl-styles';
    const SETTINGS_KEY = 'xbwl-settings';
    const SORTS = ['added', 'name', 'price', 'discount'];
    const SORT_LABELS = { added: 'Agregado', name: 'Nombre', price: 'Precio', discount: 'Descuento' };

    let settings = loadSettings();
    let applying = false;          // silencia el observer al reordenar
    let listObserver = null;
    let observerDebounce = null;

    // --- Persistencia -----------------------------------------------------------
    function loadSettings() {
        const def = { remember: true, sort: 'added', dir: 'asc', onlyDiscount: false };
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            const parsed = raw ? JSON.parse(raw) : null;
            if (parsed && typeof parsed === 'object') {
                return Object.assign(def, parsed, {
                    sort: SORTS.includes(parsed.sort) ? parsed.sort : 'added',
                    dir: parsed.dir === 'desc' ? 'desc' : 'asc',
                    onlyDiscount: !!parsed.onlyDiscount,
                    remember: parsed.remember !== false,
                });
            }
        } catch (e) { console.error('(xbwl): loadSettings error:', e); }
        return def;
    }
    function saveSettings() {
        try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
        catch (e) { console.error('(xbwl): saveSettings error:', e); }
    }
    function persistIfRemember() { if (settings.remember !== false) saveSettings(); }

    // --- URL compartible (parámetros legibles) ----------------------------------
    function readUrlView() {
        const p = new URLSearchParams(location.search);
        if (!p.has('wlsort') && !p.has('wldir') && !p.has('wldisc')) return null;
        return {
            sort: SORTS.includes(p.get('wlsort')) ? p.get('wlsort') : 'added',
            dir: p.get('wldir') === 'desc' ? 'desc' : 'asc',
            onlyDiscount: p.get('wldisc') === '1',
        };
    }
    function buildShareUrl() {
        const p = new URLSearchParams();
        if (settings.sort && settings.sort !== 'added') p.set('wlsort', settings.sort);
        if (settings.dir && settings.dir !== 'asc') p.set('wldir', settings.dir);
        if (settings.onlyDiscount) p.set('wldisc', '1');
        const qs = p.toString();
        return location.origin + location.pathname + (qs ? ('?' + qs) : '');
    }

    // --- Extracción -------------------------------------------------------------
    function parsePrice(txt) {
        if (!txt) return null;
        const m = txt.replace(/\s/g, '').match(/[\d.,]+/);
        if (!m) return null;
        let s = m[0];
        const lastDot = s.lastIndexOf('.'), lastComma = s.lastIndexOf(',');
        if (lastDot >= 0 && lastComma >= 0) {
            if (lastDot > lastComma) s = s.replace(/,/g, '');
            else s = s.replace(/\./g, '').replace(',', '.');
        } else if (lastComma >= 0) {
            s = (s.length - 1 - lastComma === 3) ? s.replace(/,/g, '') : s.replace(',', '.');
        }
        const n = parseFloat(s);
        return isNaN(n) ? null : n;
    }

    function extract(el) {
        const name = (el.querySelector(TITLE_SELECTOR)?.textContent || '').trim();
        const box = el.querySelector(PRICE_BOX_SELECTOR) || el;
        const original = parsePrice(box.querySelector(ORIG_PRICE_SELECTOR)?.textContent);
        const discPrice = parsePrice(box.querySelector(DISC_PRICE_SELECTOR)?.textContent);
        const bold = parsePrice(box.querySelector(BOLD_PRICE_SELECTOR)?.textContent);
        const price = discPrice != null ? discPrice : bold; // precio vigente
        const discounted = original != null && price != null && original > price;
        const disc = discounted ? (original - price) / original : 0;
        const ord = parseInt(el.getAttribute(ORD_ATTR), 10);
        return { name, price, original, discounted, disc, ord: isNaN(ord) ? 0 : ord };
    }

    // --- Ordenar / filtrar ------------------------------------------------------
    function getItems() { return Array.from(document.querySelectorAll(ITEM_SELECTOR)); }
    function getListEl() { const it = document.querySelector(ITEM_SELECTOR); return it ? it.parentElement : null; }

    function tagOriginalOrder(items) {
        items.forEach((el, i) => { if (el.getAttribute(ORD_ATTR) == null) el.setAttribute(ORD_ATTR, String(i)); });
    }
    function priceCmp(a, b) { const x = a == null ? Infinity : a, y = b == null ? Infinity : b; return x - y; }

    function apply() {
        const list = getListEl();
        if (!list) return;
        const items = getItems();
        if (!items.length) return;
        tagOriginalOrder(items);

        // Desconectar el observer mientras reordenamos: appendChild dispara
        // mutaciones de childList que, como el callback corre en microtask (tras
        // resetear el flag), reentrarían en apply() en bucle. Reconectar al final
        // descarta esas mutaciones propias y deja escuchando cambios externos.
        applying = true;
        if (listObserver) listObserver.disconnect();
        try {
            const mul = settings.dir === 'desc' ? -1 : 1;
            const rows = items.map((el) => ({ el, d: extract(el) }));
            rows.sort((a, b) => {
                let c = 0;
                if (settings.sort === 'name') c = a.d.name.localeCompare(b.d.name, undefined, { sensitivity: 'base' });
                else if (settings.sort === 'price') c = priceCmp(a.d.price, b.d.price);
                else if (settings.sort === 'discount') c = a.d.disc - b.d.disc;
                else c = a.d.ord - b.d.ord;
                if (c === 0) c = a.d.ord - b.d.ord;
                return c * mul;
            });
            rows.forEach(({ el, d }) => {
                el.style.display = (settings.onlyDiscount && !d.discounted) ? 'none' : '';
                list.appendChild(el);
            });
        } finally {
            applying = false;
            if (listObserver) listObserver.observe(document.body || document.documentElement, { childList: true, subtree: true });
        }
    }

    // --- UI ---------------------------------------------------------------------
    function injectStyles() {
        if (document.getElementById(STYLES_ID)) return;
        const style = document.createElement('style');
        style.id = STYLES_ID;
        style.textContent = `
            #${TOOLBAR_ID} {
                display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
                margin: 0 0 16px; padding: 10px 12px; border-radius: 8px;
                background: rgba(127,127,127,.16); font-size: 14px; color: inherit;
            }
            #${TOOLBAR_ID} label { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
            #${TOOLBAR_ID} select, #${TOOLBAR_ID} button {
                font-size: 14px; padding: 4px 8px; border-radius: 6px;
                border: 1px solid rgba(127,127,127,.5); background: inherit; color: inherit; cursor: pointer;
            }
            #${TOOLBAR_ID} .xbwl-dir { min-width: 2.2em; text-align: center; font-weight: 600; }
            #${TOOLBAR_ID} .xbwl-share { background: #107c10; color: #fff; border: none; }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    function buildToolbar() {
        injectStyles();
        const bar = document.createElement('div');
        bar.id = TOOLBAR_ID;

        const sortLabel = document.createElement('label');
        sortLabel.appendChild(document.createTextNode('Ordenar:'));
        const sortSel = document.createElement('select');
        SORTS.forEach((s) => {
            const o = document.createElement('option');
            o.value = s; o.textContent = SORT_LABELS[s];
            if (s === settings.sort) o.selected = true;
            sortSel.appendChild(o);
        });
        sortSel.addEventListener('change', () => {
            settings.sort = sortSel.value;
            settings.dir = (settings.sort === 'discount') ? 'desc' : 'asc';
            dirBtn.textContent = settings.dir === 'desc' ? '↓' : '↑';
            persistIfRemember(); apply();
        });
        sortLabel.appendChild(sortSel);

        const dirBtn = document.createElement('button');
        dirBtn.type = 'button';
        dirBtn.className = 'xbwl-dir';
        dirBtn.title = 'Ascendente / Descendente';
        dirBtn.textContent = settings.dir === 'desc' ? '↓' : '↑';
        dirBtn.addEventListener('click', () => {
            settings.dir = settings.dir === 'desc' ? 'asc' : 'desc';
            dirBtn.textContent = settings.dir === 'desc' ? '↓' : '↑';
            persistIfRemember(); apply();
        });

        const discLabel = document.createElement('label');
        const discChk = document.createElement('input');
        discChk.type = 'checkbox';
        discChk.checked = !!settings.onlyDiscount;
        discChk.addEventListener('change', () => { settings.onlyDiscount = discChk.checked; persistIfRemember(); apply(); });
        discLabel.appendChild(discChk);
        discLabel.appendChild(document.createTextNode('Solo con descuento'));

        const remLabel = document.createElement('label');
        const remChk = document.createElement('input');
        remChk.type = 'checkbox';
        remChk.checked = settings.remember !== false;
        remChk.addEventListener('change', () => { settings.remember = remChk.checked; saveSettings(); });
        remLabel.appendChild(remChk);
        remLabel.appendChild(document.createTextNode('Recordar'));

        const shareBtn = document.createElement('button');
        shareBtn.type = 'button';
        shareBtn.className = 'xbwl-share';
        shareBtn.textContent = '🔗 Copiar enlace';
        shareBtn.addEventListener('click', async () => {
            const url = buildShareUrl();
            try {
                if (navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(url);
                    shareBtn.textContent = '✔ Copiado';
                    setTimeout(() => { shareBtn.textContent = '🔗 Copiar enlace'; }, 2000);
                } else { window.prompt('Copia este enlace:', url); }
            } catch (e) { window.prompt('Copia este enlace:', url); }
        });

        bar.appendChild(sortLabel);
        bar.appendChild(dirBtn);
        bar.appendChild(discLabel);
        bar.appendChild(remLabel);
        bar.appendChild(shareBtn);
        return bar;
    }

    function ensureToolbar() {
        if (document.getElementById(TOOLBAR_ID)) return;
        const list = getListEl();
        if (!list) return;
        list.parentNode.insertBefore(buildToolbar(), list);
    }

    // --- Observer + init --------------------------------------------------------
    function startObserver() {
        if (listObserver) return;
        listObserver = new MutationObserver(() => {
            if (applying) return;
            if (observerDebounce) return;
            observerDebounce = setTimeout(() => {
                observerDebounce = null;
                if (!isWishlist()) return;
                ensureToolbar();
                apply();
            }, 250);
        });
        listObserver.observe(document.body || document.documentElement, { childList: true, subtree: true });
    }

    function waitForItems(timeoutMs) {
        return new Promise((resolve) => {
            if (getItems().length) return resolve(true);
            const deadline = Date.now() + (timeoutMs || 20000);
            const iv = setInterval(() => {
                if (getItems().length) { clearInterval(iv); resolve(true); }
                else if (Date.now() > deadline) { clearInterval(iv); resolve(false); }
            }, 250);
        });
    }

    async function initWishlist() {
        const ok = await waitForItems(25000);
        if (!ok) return;

        const fromUrl = readUrlView();
        if (fromUrl) {
            settings.sort = fromUrl.sort;
            settings.dir = fromUrl.dir;
            settings.onlyDiscount = fromUrl.onlyDiscount;
            if (settings.remember !== false) saveSettings();
        }
        ensureToolbar();
        apply();
        startObserver();
        console.log('(xbwl): Xbox wishlist tools activos');
    }

    // =============================================
    // INICIALIZACIÓN (por ruta)
    // =============================================
    // xbox.com es una SPA: si se navega a /wishlist sin recargar, se reintenta.
    function route() {
        try {
            if (isWishlist()) initWishlist();
            else redirectIfNeeded();
        } catch (e) { console.error('(xbox-store-locale-redirect): Error:', e); }
    }

    (function watchSpaNav() {
        const fire = () => setTimeout(route, 300);
        const p = history.pushState, r = history.replaceState;
        history.pushState = function () { p.apply(this, arguments); fire(); };
        history.replaceState = function () { r.apply(this, arguments); fire(); };
        window.addEventListener('popstate', fire);
    })();

    route();
})();
