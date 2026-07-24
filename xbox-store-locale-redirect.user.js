// ==UserScript==
// @name         Xbox Store Locale Redirect
// @namespace    https://xbox.com/
// @version      2.3.1
// @description  Redirige las páginas de Xbox Store al idioma/región elegido (o del navegador), y en la lista de deseos (/wishlist) agrega ordenar y filtrar (por agregado, nombre, precio y descuento; filtro "solo con descuento") con recuerdo de la elección, URL compartible, selector de país/idioma de redirección y botón "Saber más".
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
    // IDIOMA (auto-detect: si la página/navegador está en español -> es, si no -> en)
    // =============================================
    // Prioriza el lang del documento (idioma con que Xbox sirve la página) y
    // cae al del navegador. Solo distingue español vs. resto (inglés por defecto).
    function detectLang() {
        const docLang = (document.documentElement.getAttribute('lang') || '').toLowerCase();
        const navLang = (navigator.language || navigator.languages?.[0] || '').toLowerCase();
        return (docLang || navLang).startsWith('es') ? 'es' : 'en';
    }
    const LANG = detectLang();
    const I18N = {
        es: {
            sortLabel: 'Ordenar:', added: 'Agregado', name: 'Nombre', price: 'Precio', discount: 'Descuento',
            dirTitle: 'Ascendente / Descendente', onlyDiscount: 'Solo con descuento', remember: 'Recordar',
            copy: '🔗 Copiar enlace', copied: '✔ Copiado', copyPrompt: 'Copia este enlace:',
            about: 'ℹ️ Saber más', close: 'Cerrar', auto: 'Auto (navegador)',
            regionLabel: 'Redirección:', langLabel: 'Idioma', countryLabel: 'País',
            sortTip: 'Ordena tu lista de deseos por fecha de agregado, nombre, precio o porcentaje de descuento.',
            dirTip: 'Alterna entre orden ascendente (↑) y descendente (↓).',
            onlyDiscountTip: 'Oculta los juegos que no están en oferta; muestra solo los que tienen descuento.',
            rememberTip: 'Guarda tu orden y filtros y los reaplica al volver a la lista de deseos.',
            copyTip: 'Copia un enlace que reproduce tu orden y filtros actuales al abrirlo.',
            regionTip: 'Elige a qué país e idioma redirigir las páginas de juego de Xbox. Con "Auto" usa el idioma/región de tu navegador. Se aplica al abrir una página de juego (no aquí).',
            aboutTip: 'Ver qué hace este script en su totalidad.',
            aboutTitle: '¿Qué hace este script?',
            aboutBody: [
                'Este script mejora Xbox Store en dos frentes:',
                '• Redirección de región: al abrir una página de juego, la lleva al país e idioma que elijas abajo (o al de tu navegador si dejas "Auto"). Así ves precios y textos en tu región.',
                '• Herramientas en tu lista de deseos:',
                '– Ordenar: por fecha de agregado, nombre, precio o descuento (ascendente/descendente).',
                '– Solo con descuento: muestra únicamente los juegos en oferta.',
                '– Recordar: guarda tu orden y filtros y los reaplica al volver.',
                '– Copiar enlace: genera una URL que reproduce tu orden y filtros.',
                'La preferencia de país/idioma se guarda en una cookie de xbox.com; el resto en localStorage. No se envían datos a ningún servidor.',
            ],
        },
        en: {
            sortLabel: 'Sort:', added: 'Added', name: 'Name', price: 'Price', discount: 'Discount',
            dirTitle: 'Ascending / Descending', onlyDiscount: 'Only discounted', remember: 'Remember',
            copy: '🔗 Copy link', copied: '✔ Copied', copyPrompt: 'Copy this link:',
            about: 'ℹ️ Learn more', close: 'Close', auto: 'Auto (browser)',
            regionLabel: 'Redirect:', langLabel: 'Language', countryLabel: 'Country',
            sortTip: 'Sorts your wishlist by date added, name, price or discount percentage.',
            dirTip: 'Toggles ascending (↑) and descending (↓) order.',
            onlyDiscountTip: 'Hides games that are not on sale; shows only discounted ones.',
            rememberTip: 'Saves your sort and filters and reapplies them when you return to the wishlist.',
            copyTip: 'Copies a link that reproduces your current sort and filters when opened.',
            regionTip: 'Choose which country and language to redirect Xbox game pages to. With "Auto" it uses your browser language/region. Applied when you open a game page (not here).',
            aboutTip: 'See everything this script does.',
            aboutTitle: 'What does this script do?',
            aboutBody: [
                'This script improves Xbox Store in two ways:',
                '• Region redirect: when you open a game page, it takes you to the country and language you choose below (or your browser locale if left on "Auto"). So you see prices and text for your region.',
                '• Wishlist tools:',
                '– Sort: by date added, name, price or discount (ascending/descending).',
                '– Only discounted: shows only games on sale.',
                '– Remember: saves your sort and filters and reapplies them on return.',
                '– Copy link: builds a URL that reproduces your sort and filters.',
                'The country/language preference is stored in an xbox.com cookie; the rest in localStorage. No data is sent to any server.',
            ],
        },
    };
    const t = I18N[LANG];

    // Listas curadas para el selector de redirección (idioma + país). El código
    // vacío ('') significa "Auto (navegador)".
    const LANGS = [
        { code: '', es: 'Auto (navegador)', en: 'Auto (browser)' },
        { code: 'en', es: 'Inglés', en: 'English' },
        { code: 'es', es: 'Español', en: 'Spanish' },
        { code: 'pt', es: 'Portugués', en: 'Portuguese' },
        { code: 'fr', es: 'Francés', en: 'French' },
        { code: 'de', es: 'Alemán', en: 'German' },
        { code: 'it', es: 'Italiano', en: 'Italian' },
        { code: 'ja', es: 'Japonés', en: 'Japanese' },
        { code: 'ko', es: 'Coreano', en: 'Korean' },
        { code: 'zh', es: 'Chino', en: 'Chinese' },
        { code: 'ru', es: 'Ruso', en: 'Russian' },
        { code: 'pl', es: 'Polaco', en: 'Polish' },
        { code: 'nl', es: 'Neerlandés', en: 'Dutch' },
        { code: 'tr', es: 'Turco', en: 'Turkish' },
    ];
    const COUNTRIES = [
        { code: '', es: 'Auto (navegador)', en: 'Auto (browser)' },
        { code: 'US', es: 'Estados Unidos', en: 'United States' },
        { code: 'MX', es: 'México', en: 'Mexico' },
        { code: 'ES', es: 'España', en: 'Spain' },
        { code: 'AR', es: 'Argentina', en: 'Argentina' },
        { code: 'CO', es: 'Colombia', en: 'Colombia' },
        { code: 'CL', es: 'Chile', en: 'Chile' },
        { code: 'BR', es: 'Brasil', en: 'Brazil' },
        { code: 'GB', es: 'Reino Unido', en: 'United Kingdom' },
        { code: 'CA', es: 'Canadá', en: 'Canada' },
        { code: 'FR', es: 'Francia', en: 'France' },
        { code: 'DE', es: 'Alemania', en: 'Germany' },
        { code: 'IT', es: 'Italia', en: 'Italy' },
        { code: 'JP', es: 'Japón', en: 'Japan' },
        { code: 'KR', es: 'Corea del Sur', en: 'South Korea' },
        { code: 'AU', es: 'Australia', en: 'Australia' },
    ];

    // =============================================
    // LOCALE REDIRECT (solo en páginas de producto de la tienda)
    // =============================================

    // Patrón para detectar el segmento de locale en la ruta (ej. /en-us/, /pt-br/).
    const LOCALE_PATH_REGEX = /\/([a-z]{2}-[a-z]{2})\//i;
    // Preferencia de país/idioma. Cookie con domain=.xbox.com para que se comparta
    // entre las páginas de juego y el wishlist (mismo host, pero la cookie mantiene
    // el código idéntico al de Microsoft, que sí cruza subdominios).
    const LOCALE_COOKIE = 'xbwl-locale';

    /**
     * Obtiene el locale del navegador en formato lowercase (ej. "es-mx").
     * @returns {string} El locale del navegador.
     */
    function getBrowserLocale() {
        const lang = navigator.language || navigator.languages[0] || 'en-us';
        return lang.toLowerCase();
    }

    // Lee la preferencia guardada como { lang, country } (vacíos = Auto).
    function readLocalePref() {
        try {
            const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + LOCALE_COOKIE + '=([^;]+)'));
            const v = m ? decodeURIComponent(m[1]) : '';
            const parts = v.split('-');
            return { lang: (parts[0] || '').toLowerCase(), country: (parts[1] || '').toUpperCase() };
        } catch (e) { return { lang: '', country: '' }; }
    }
    // Guarda la preferencia (vacía si algún campo es Auto). Cookie a 1 año.
    function saveLocalePref(lang, country) {
        const val = (lang && country) ? `${lang}-${country}` : '';
        try {
            document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(val)}; domain=.xbox.com; path=/; max-age=${60 * 60 * 24 * 365}`;
        } catch (e) { console.error('(xbwl): saveLocalePref error:', e); }
    }

    // Locale destino (lowercase xx-yy): preferencia si está completa, si no navegador.
    function desiredLocale() {
        const p = readLocalePref();
        if (p.lang && p.country) return `${p.lang}-${p.country}`.toLowerCase();
        return getBrowserLocale();
    }

    /**
     * Si el locale en la URL difiere del destino (preferencia o navegador),
     * reemplaza el segmento y redirige con location.replace() (sin historial).
     */
    function redirectIfNeeded() {
        const currentUrl = window.location.href;
        const match = currentUrl.match(LOCALE_PATH_REGEX);
        if (!match) return;

        const currentLocale = match[1].toLowerCase();
        const target = desiredLocale();
        if (currentLocale === target) return;

        const newUrl = currentUrl.replace(LOCALE_PATH_REGEX, `/${target}/`);
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
    const SCRIPT_VERSION = '2.3.1'; // sincronizar con @version
    const SETTINGS_KEY = 'xbwl-settings';
    const SORTS = ['added', 'name', 'price', 'discount'];
    const SORT_LABELS = { added: t.added, name: t.name, price: t.price, discount: t.discount };

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
            #${TOOLBAR_ID} .xbwl-region { display: inline-flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    // --- Modal "Saber más" (autocontenido) --------------------------------------
    function showAboutModal() {
        if (document.getElementById('xbwl-about-overlay')) return;
        const overlay = document.createElement('div');
        overlay.id = 'xbwl-about-overlay';
        Object.assign(overlay.style, {
            position: 'fixed', inset: '0', width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)', zIndex: '2147483647',
            transition: 'opacity 180ms ease', opacity: '0',
        });
        const box = document.createElement('div');
        Object.assign(box.style, {
            background: '#0e1512', color: '#f2f5f3', borderRadius: '14px',
            padding: '26px 30px', minWidth: '320px', maxWidth: '560px',
            maxHeight: '80vh', overflowY: 'auto', boxSizing: 'border-box',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)', border: '1px solid #107c10',
            fontFamily: 'Segoe UI, system-ui, sans-serif', fontSize: '14px', lineHeight: '1.5',
            transform: 'translateY(8px) scale(0.98)', opacity: '0',
            transition: 'transform 180ms ease, opacity 180ms ease',
        });
        const title = document.createElement('div');
        title.textContent = t.aboutTitle;
        title.style.cssText = 'font-weight:bold;font-size:17px;margin-bottom:14px;color:#6cc24a;';
        box.appendChild(title);
        (t.aboutBody || []).forEach((p) => {
            const row = document.createElement('div');
            const trimmed = String(p).replace(/^\s+/, '');
            row.textContent = trimmed;
            row.style.marginBottom = '8px';
            if (trimmed.startsWith('–')) row.style.paddingLeft = '22px';
            else if (trimmed.startsWith('•')) row.style.paddingLeft = '10px';
            box.appendChild(row);
        });
        const gh = document.createElement('a');
        gh.href = 'https://github.com/g31w0fw0rld/xbox-store-locale-redirect';
        gh.target = '_blank'; gh.rel = 'noopener';
        gh.textContent = 'github.com/g31w0fw0rld/xbox-store-locale-redirect';
        gh.style.cssText = 'display:inline-block;margin-top:6px;color:#6cc24a;text-decoration:underline;font-size:12px;';
        box.appendChild(gh);
        const kofi = document.createElement('a');
        kofi.href = 'https://ko-fi.com/g31w0fw0rld';
        kofi.target = '_blank'; kofi.rel = 'noopener';
        kofi.textContent = '☕ Apóyame en Ko-fi / Support me on Ko-fi';
        kofi.style.cssText = 'display:block;margin-top:8px;color:#6cc24a;text-decoration:underline;font-size:12px;';
        box.appendChild(kofi);
        const foot = document.createElement('div');
        foot.textContent = 'v' + SCRIPT_VERSION + ' · g31w0fw0rld';
        foot.style.cssText = 'margin-top:2px;font-size:12px;opacity:0.7;';
        box.appendChild(foot);
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.textContent = t.close;
        closeBtn.style.cssText = 'display:block;margin-top:16px;padding:8px 14px;background:#107c10;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:bold;font-size:13px;';
        box.appendChild(closeBtn);
        const closeIt = () => {
            overlay.style.opacity = '0'; box.style.opacity = '0';
            box.style.transform = 'translateY(8px) scale(0.98)';
            document.removeEventListener('keydown', onKey);
            setTimeout(() => overlay.remove(), 180);
        };
        const onKey = (e) => { if (e.key === 'Escape') closeIt(); };
        closeBtn.addEventListener('click', closeIt);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) closeIt(); });
        document.addEventListener('keydown', onKey);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        setTimeout(() => {
            overlay.style.opacity = '1';
            box.style.transform = 'translateY(0) scale(1)';
            box.style.opacity = '1';
        }, 10);
    }

    // Construye un <select> a partir de una lista curada [{code,es,en}].
    function buildLocaleSelect(list, current) {
        const sel = document.createElement('select');
        list.forEach((it) => {
            const o = document.createElement('option');
            o.value = it.code;
            o.textContent = it.code ? `${it[LANG]} (${it.code})` : it[LANG];
            if (it.code.toLowerCase() === (current || '').toLowerCase()) o.selected = true;
            sel.appendChild(o);
        });
        return sel;
    }

    function buildToolbar() {
        injectStyles();
        const bar = document.createElement('div');
        bar.id = TOOLBAR_ID;

        const sortLabel = document.createElement('label');
        sortLabel.title = t.sortTip;
        sortLabel.appendChild(document.createTextNode(t.sortLabel));
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
        dirBtn.title = t.dirTip;
        dirBtn.textContent = settings.dir === 'desc' ? '↓' : '↑';
        dirBtn.addEventListener('click', () => {
            settings.dir = settings.dir === 'desc' ? 'asc' : 'desc';
            dirBtn.textContent = settings.dir === 'desc' ? '↓' : '↑';
            persistIfRemember(); apply();
        });

        const discLabel = document.createElement('label');
        discLabel.title = t.onlyDiscountTip;
        const discChk = document.createElement('input');
        discChk.type = 'checkbox';
        discChk.checked = !!settings.onlyDiscount;
        discChk.addEventListener('change', () => { settings.onlyDiscount = discChk.checked; persistIfRemember(); apply(); });
        discLabel.appendChild(discChk);
        discLabel.appendChild(document.createTextNode(t.onlyDiscount));

        const remLabel = document.createElement('label');
        remLabel.title = t.rememberTip;
        const remChk = document.createElement('input');
        remChk.type = 'checkbox';
        remChk.checked = settings.remember !== false;
        remChk.addEventListener('change', () => { settings.remember = remChk.checked; saveSettings(); });
        remLabel.appendChild(remChk);
        remLabel.appendChild(document.createTextNode(t.remember));

        const shareBtn = document.createElement('button');
        shareBtn.type = 'button';
        shareBtn.className = 'xbwl-share';
        shareBtn.title = t.copyTip;
        shareBtn.textContent = t.copy;
        shareBtn.addEventListener('click', async () => {
            const url = buildShareUrl();
            try {
                if (navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(url);
                    shareBtn.textContent = t.copied;
                    setTimeout(() => { shareBtn.textContent = t.copy; }, 2000);
                } else { window.prompt(t.copyPrompt, url); }
            } catch (e) { window.prompt(t.copyPrompt, url); }
        });

        // Selector de redirección (idioma + país), guardado en cookie de .xbox.com.
        // Cada select lleva su propia etiqueta visible ("Idioma" / "País") para que
        // se distinga cuál es cuál (ambos muestran "Auto (navegador)" por defecto).
        const pref = readLocalePref();
        const regionText = document.createElement('span');
        regionText.textContent = t.regionLabel;
        regionText.title = t.regionTip;
        regionText.style.fontWeight = '600';

        const langSel = buildLocaleSelect(LANGS, pref.lang);
        const langWrap = document.createElement('label');
        langWrap.title = t.regionTip;
        langWrap.appendChild(document.createTextNode(t.langLabel));
        langWrap.appendChild(langSel);

        const countrySel = buildLocaleSelect(COUNTRIES, pref.country);
        const countryWrap = document.createElement('label');
        countryWrap.title = t.regionTip;
        countryWrap.appendChild(document.createTextNode(t.countryLabel));
        countryWrap.appendChild(countrySel);

        const onRegionChange = () => saveLocalePref(langSel.value, countrySel.value);
        langSel.addEventListener('change', onRegionChange);
        countrySel.addEventListener('change', onRegionChange);

        // Grupo de región: "Redirección: Idioma [..] País [..]" viaja junto y
        // se envuelve como un solo bloque.
        const regionGroup = document.createElement('span');
        regionGroup.className = 'xbwl-region';
        regionGroup.appendChild(regionText);
        regionGroup.appendChild(langWrap);
        regionGroup.appendChild(countryWrap);

        // Botón "Saber más"
        const aboutBtn = document.createElement('button');
        aboutBtn.type = 'button';
        aboutBtn.className = 'xbwl-about';
        aboutBtn.title = t.aboutTip;
        aboutBtn.textContent = t.about;
        aboutBtn.addEventListener('click', showAboutModal);

        bar.appendChild(sortLabel);
        bar.appendChild(dirBtn);
        bar.appendChild(discLabel);
        bar.appendChild(remLabel);
        bar.appendChild(shareBtn);
        bar.appendChild(regionGroup);
        bar.appendChild(aboutBtn);
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
