// ==UserScript==
// @name         Xbox Store Locale Redirect
// @namespace    https://xbox.com/
// @version      2.4.0
// @description  Sends Xbox Store pages to the language and country you pick from 21 curated locales by rewriting the locale segment of the URL, keeping the choice in a cookie so it holds across the store, and clearing an invalid value instead of looping on it. On your wishlist it adds sort and filters with remembered settings, a shareable link and a 'Learn more' panel. On PC-playable games it adds GG.deals and PCGamingWiki buttons that search by the English name.
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
onlyDiscount: 'Solo con descuento', remember: 'Recordar',
            copy: '🔗 Copiar enlace', copied: '✔ Copiado', copyPrompt: 'Copia este enlace:',
            about: 'ℹ️ Saber más', close: 'Cerrar',
            regionLabel: 'Redirección:',
            applyLabel: '✔ Aplicar', applyTip: 'Guarda el locale elegido y aplica la redirección ahora (recarga esta página, incluida la lista de deseos, en ese idioma/país). Con "Auto" no redirige.',
            sortTip: 'Ordena tu lista de deseos por fecha de agregado, nombre, precio o porcentaje de descuento.',
            dirTip: 'Alterna entre orden ascendente (↑) y descendente (↓).',
            onlyDiscountTip: 'Oculta los juegos que no están en oferta; muestra solo los que tienen descuento.',
            rememberTip: 'Guarda tu orden y filtros y los reaplica al volver a la lista de deseos.',
            copyTip: 'Copia un enlace que reproduce tu orden y filtros actuales al abrirlo.',
            regionTip: 'Elige el idioma/país (locale) al que redirigir las páginas de Xbox, incluida esta lista de deseos. Con "Auto" no redirige. Pulsa "Aplicar" para guardar y redirigir ahora.',
            aboutTip: 'Ver qué hace este script en su totalidad.',
            aboutTitle: '¿Qué hace este script?',
            aboutBody: [
                'Este script mejora Xbox Store en dos frentes:',
                '• Redirección de región: lleva las páginas de Xbox —incluida tu lista de deseos— al idioma/país (locale) que elijas en el selector. Con "Auto" no redirige.',
                '– El selector ofrece 21 locales curados, solo combinaciones que la tienda soporta de verdad.',
                '– En xbox.com el locale es un segmento de la ruta (/es-mx/), así que el script reescribe esa parte de la URL.',
                '– Usa un reemplazo en vez de una navegación nueva, así que no deja entrada extra en el historial y el botón Atrás se comporta con normalidad.',
                '– Un locale guardado inválido se borra en vez de usarse, para no entrar en bucles de redirección.',
                '– "Aplicar" guarda tu elección y redirige al momento, lista de deseos incluida.',
                '• Herramientas en tu lista de deseos:',
                '– Ordenar: por fecha de agregado, nombre, precio o descuento, con un botón ↑/↓ para ascendente o descendente.',
                '– Solo con descuento: muestra únicamente los juegos en oferta.',
                '– Recordar: guarda tu orden y filtros y los reaplica al volver.',
                '– Copiar enlace: genera una URL que reproduce tu orden y filtros. Si el navegador bloquea el portapapeles, la muestra en un diálogo para copiarla a mano.',
                '• En las fichas de juego añade botones a GG.deals (precios/ofertas) y PCGamingWiki (compatibilidad y arreglos).',
                '– Solo en juegos jugables en PC. Un juego solo de consola no los recibe; Xbox Play Anywhere sí, porque implica PC.',
                '– Nada de DLC ni de aplicaciones: PCGamingWiki no tiene páginas de DLC, así que enlazarlos solo daría cero resultados.',
                '– La plataforma se lee de la propia ficha, de la lista "Jugar con", que Xbox no traduce.',
                '– El nombre se pide al catálogo público de Microsoft y se guarda en localStorage para no repetir la consulta. Hace falta porque se busca por el nombre en inglés, no por el título que ves: la ficha va traducida, hasta la URL, y las dos webs están indexadas en inglés. Si el catálogo no responde, no se ponen los botones.',
                '– Al saltar de una ficha a otra sin recargar, lo que hay en pantalla tarda un momento en cambiar; hasta que el juego pintado coincide con el de la dirección no se pone nada, para no mezclar la plataforma de un juego con el nombre de otro.',
                '– GG.deals se abre ya filtrado por el DRM de Microsoft Store, igual que los scripts de Steam, GOG y Epic hacen con el suyo, y sin el mínimo de valoración que trae por defecto y que esconde parte de las ofertas.',
                '– Al nombre se le quita el "(PC)" que Microsoft cuelga cuando el mismo juego tiene ficha de PC y de consola, porque no es parte del título y ninguna de las dos webs lo lleva.',
                '– GG.deals recibe el título completo, con su edición (y sin acentos, porque translitera su índice); PCGamingWiki lo recibe sin sufijos de empaquetado (Standard, Deluxe, Premium…), porque documenta el juego base. Los que sí son lanzamientos aparte (Definitive, Anniversary, Special, Remastered) se dejan tal cual.',
                'La preferencia de país/idioma se guarda en una cookie de xbox.com, para que valga en toda la tienda y no solo en la pestaña actual; el resto va en localStorage. La única petición externa es al catálogo público de Microsoft, para saber el nombre en inglés del juego que estás viendo: se manda solo el código de producto de la URL, sin cookies ni sesión, y la respuesta se guarda en localStorage. No se envía nada a terceros ni al autor.'
            ]
        },
        en: {
            sortLabel: 'Sort:', added: 'Added', name: 'Name', price: 'Price', discount: 'Discount',
onlyDiscount: 'Only discounted', remember: 'Remember',
            copy: '🔗 Copy link', copied: '✔ Copied', copyPrompt: 'Copy this link:',
            about: 'ℹ️ Learn more', close: 'Close',
            regionLabel: 'Redirect:',
            applyLabel: '✔ Apply', applyTip: 'Saves the chosen locale and applies the redirect now (reloads this page, wishlist included, in that language/country). With "Auto" it does not redirect.',
            sortTip: 'Sorts your wishlist by date added, name, price or discount percentage.',
            dirTip: 'Toggles ascending (↑) and descending (↓) order.',
            onlyDiscountTip: 'Hides games that are not on sale; shows only discounted ones.',
            rememberTip: 'Saves your sort and filters and reapplies them when you return to the wishlist.',
            copyTip: 'Copies a link that reproduces your current sort and filters when opened.',
            regionTip: 'Choose the language/country (locale) to redirect Xbox pages to, including this wishlist. With "Auto" it does not redirect. Click "Apply" to save and redirect now.',
            aboutTip: 'See everything this script does.',
            aboutTitle: 'What does this script do?',
            aboutBody: [
                'This script improves Xbox Store in two ways:',
                '• Region redirect: takes Xbox pages —including your wishlist— to the language/country (locale) you pick in the selector. With "Auto" it does not redirect.',
                '– The selector offers 21 curated locales, only combinations the store actually supports.',
                '– On xbox.com the locale is a path segment (/en-us/), so the script rewrites that part of the URL.',
                '– It uses a replace rather than a new navigation, so it leaves no extra history entry and the Back button behaves normally.',
                '– An invalid saved locale is cleared instead of used, so a bad value cannot cause a redirect loop.',
                '– "Apply" saves your choice and redirects right away, wishlist included.',
                '• Wishlist tools:',
                '– Sort: by date added, name, price or discount, with an ↑/↓ button for ascending or descending.',
                '– Only discounted: shows only games on sale.',
                '– Remember: saves your sort and filters and reapplies them on return.',
                '– Copy link: builds a URL that reproduces your sort and filters. If the browser blocks clipboard access, it shows the URL in a dialog so you can copy it by hand.',
                '• On game pages it adds buttons to GG.deals (prices/deals) and PCGamingWiki (compatibility and fixes).',
                '– PC-playable games only. A console-only game gets nothing; Xbox Play Anywhere does, because it implies PC.',
                '– No DLC and no apps: PCGamingWiki has no DLC pages, so linking them would only ever return nothing.',
                '– The platform is read from the page itself, from the "Play with" list, which Xbox does not translate.',
                '– The name is requested from Microsoft\'s public catalog and kept in localStorage to avoid repeating the call. It is needed because the search uses the English name, not the title you see: the page is translated, the URL included, and both sites are indexed in English. If the catalog does not answer, no buttons are added.',
                '– When you jump between pages without reloading, what is on screen takes a moment to change; nothing is added until the game on screen matches the one in the address, so one game\'s platform is never paired with another\'s name.',
                '– GG.deals opens already filtered to the Microsoft Store DRM, the same way the Steam, GOG and Epic scripts do with theirs, and without the default minimum store rating that hides part of the deals.',
                '– The "(PC)" that Microsoft hangs on the name when the same game has both a PC and a console page is dropped, since it is not part of the title and neither destination carries it.',
                '– GG.deals gets the full title, edition included (and without accents, since it transliterates its index); PCGamingWiki gets it without packaging suffixes (Standard, Deluxe, Premium…), because it documents the base game. The ones that are genuinely separate releases (Definitive, Anniversary, Special, Remastered) are left alone.',
                'The country/language preference is stored in an xbox.com cookie, so it holds across the whole store and not just the current tab; the rest goes in localStorage. The only external request goes to Microsoft\'s public catalog, to learn the English name of the game you are looking at: it sends just the product code from the URL, with no cookies or session, and the answer is kept in localStorage. Nothing is sent to third parties or to the author.'
            ]
        }
    };
    const t = I18N[LANG];

    // Lista curada de LOCALES válidos (combinación idioma-país). Un solo selector:
    // así solo se ofrecen combinaciones que Xbox realmente soporta. El código vacío
    // ('') significa "Auto": no forzar redirección (deja el locale que ya tengas).
    const LOCALES = [
        { code: '', es: 'Auto (no redirigir)', en: 'Auto (no redirect)' },
        { code: 'es-MX', es: 'Español – México (es-MX)', en: 'Spanish – Mexico (es-MX)' },
        { code: 'es-ES', es: 'Español – España (es-ES)', en: 'Spanish – Spain (es-ES)' },
        { code: 'es-AR', es: 'Español – Argentina (es-AR)', en: 'Spanish – Argentina (es-AR)' },
        { code: 'es-CO', es: 'Español – Colombia (es-CO)', en: 'Spanish – Colombia (es-CO)' },
        { code: 'es-CL', es: 'Español – Chile (es-CL)', en: 'Spanish – Chile (es-CL)' },
        { code: 'en-US', es: 'Inglés – EE. UU. (en-US)', en: 'English – United States (en-US)' },
        { code: 'en-GB', es: 'Inglés – Reino Unido (en-GB)', en: 'English – United Kingdom (en-GB)' },
        { code: 'en-CA', es: 'Inglés – Canadá (en-CA)', en: 'English – Canada (en-CA)' },
        { code: 'en-AU', es: 'Inglés – Australia (en-AU)', en: 'English – Australia (en-AU)' },
        { code: 'pt-BR', es: 'Portugués – Brasil (pt-BR)', en: 'Portuguese – Brazil (pt-BR)' },
        { code: 'fr-FR', es: 'Francés – Francia (fr-FR)', en: 'French – France (fr-FR)' },
        { code: 'fr-CA', es: 'Francés – Canadá (fr-CA)', en: 'French – Canada (fr-CA)' },
        { code: 'de-DE', es: 'Alemán – Alemania (de-DE)', en: 'German – Germany (de-DE)' },
        { code: 'it-IT', es: 'Italiano – Italia (it-IT)', en: 'Italian – Italy (it-IT)' },
        { code: 'ja-JP', es: 'Japonés – Japón (ja-JP)', en: 'Japanese – Japan (ja-JP)' },
        { code: 'ko-KR', es: 'Coreano – Corea del Sur (ko-KR)', en: 'Korean – South Korea (ko-KR)' },
        { code: 'zh-CN', es: 'Chino – China (zh-CN)', en: 'Chinese – China (zh-CN)' },
        { code: 'ru-RU', es: 'Ruso – Rusia (ru-RU)', en: 'Russian – Russia (ru-RU)' },
        { code: 'pl-PL', es: 'Polaco – Polonia (pl-PL)', en: 'Polish – Poland (pl-PL)' },
        { code: 'nl-NL', es: 'Neerlandés – Países Bajos (nl-NL)', en: 'Dutch – Netherlands (nl-NL)' },
        { code: 'tr-TR', es: 'Turco – Turquía (tr-TR)', en: 'Turkish – Turkey (tr-TR)' }
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

    // ¿Es un locale válido de la lista curada? Evita valores viejos/parciales
    // (p. ej. "en-" guardado por versiones anteriores) que provocaban
    // redirecciones inválidas en bucle.
    function isValidLocale(code) {
        return !!code && LOCALES.some((l) => l.code && l.code.toLowerCase() === code.toLowerCase());
    }
    // Lee el locale guardado (ej. "es-MX"); '' = Auto (no redirigir). Sanea
    // valores inválidos borrándolos, para no entrar en bucles de redirección.
    function readLocalePref() {
        try {
            const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + LOCALE_COOKIE + '=([^;]+)'));
            const v = m ? decodeURIComponent(m[1]) : '';
            if (v && !isValidLocale(v)) { saveLocalePref(''); return ''; }
            return v;
        } catch (e) { return ''; }
    }
    // Guarda el locale elegido ('' = Auto). Cookie a 1 año.
    function saveLocalePref(code) {
        try {
            document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(code || '')}; domain=.xbox.com; path=/; max-age=${60 * 60 * 24 * 365}`;
        } catch (e) { console.error('(xbwl): saveLocalePref error:', e); }
    }

    // Locale destino (formato xx-YY) o '' si Auto/sin preferencia.
    function desiredLocale() { return readLocalePref(); }

    /**
     * Si hay preferencia explícita y el locale de la URL difiere, reemplaza el
     * segmento y redirige (sin historial). Con Auto ('') no fuerza nada. Aplica
     * en cualquier página con segmento de locale, incluida la lista de deseos.
     * Comparación insensible a mayúsculas para no redirigir en bucle.
     */
    function redirectIfNeeded() {
        const target = desiredLocale();
        if (!isValidLocale(target)) return;

        const currentUrl = window.location.href;
        const match = currentUrl.match(LOCALE_PATH_REGEX);
        if (!match) return;
        if (match[1].toLowerCase() === target.toLowerCase()) return;

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
    const SCRIPT_VERSION = '2.4.0'; // sincronizar con @version
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
                    remember: parsed.remember !== false
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
            onlyDiscount: p.get('wldisc') === '1'
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
        const m = txt.replace(/\s/g, '').match(/[\d.]+/);
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
            #${TOOLBAR_ID} .xbwl-apply { background: #107c10; color: #fff; border: none; font-weight: 600; }
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
            transition: 'opacity 180ms ease', opacity: '0'
        });
        const box = document.createElement('div');
        Object.assign(box.style, {
            background: '#0e1512', color: '#f2f5f3', borderRadius: '14px',
            padding: '26px 30px', minWidth: '320px', maxWidth: '560px',
            maxHeight: '80vh', overflowY: 'auto', boxSizing: 'border-box',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)', border: '1px solid #107c10',
            fontFamily: 'Segoe UI, system-ui, sans-serif', fontSize: '14px', lineHeight: '1.5',
            transform: 'translateY(8px) scale(0.98)', opacity: '0',
            transition: 'transform 180ms ease, opacity 180ms ease'
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

    // Construye el <select> único de locales a partir de LOCALES. El label de cada
    // opción ya explica la combinación (idioma – país + código).
    function buildLocaleSelect(current) {
        const sel = document.createElement('select');
        LOCALES.forEach((it) => {
            const o = document.createElement('option');
            o.value = it.code;
            o.textContent = it[LANG];
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

        // Selector único de redirección (locale = idioma-país), guardado en cookie
        // de .xbox.com. Cada opción explica la combinación en su label.
        const localeSel = buildLocaleSelect(readLocalePref());
        const regionText = document.createElement('span');
        regionText.textContent = t.regionLabel;
        regionText.title = t.regionTip;
        regionText.style.fontWeight = '600';

        const localeWrap = document.createElement('label');
        localeWrap.title = t.regionTip;
        localeWrap.appendChild(localeSel);

        // Botón "Aplicar": guarda el locale elegido y redirige la página actual
        // (incluida la lista de deseos) al instante. Con "Auto" solo recarga.
        const applyBtn = document.createElement('button');
        applyBtn.type = 'button';
        applyBtn.className = 'xbwl-apply';
        applyBtn.textContent = t.applyLabel;
        applyBtn.title = t.applyTip;
        applyBtn.addEventListener('click', () => {
            const target = localeSel.value;
            saveLocalePref(target);
            const cur = window.location.href;
            const m = cur.match(LOCALE_PATH_REGEX);
            if (target && m && m[1].toLowerCase() !== target.toLowerCase()) {
                window.location.assign(cur.replace(LOCALE_PATH_REGEX, `/${target}/`));
            } else {
                window.location.reload();
            }
        });

        // Grupo de región: "Redirección: [locale ▾] [Aplicar]" viaja junto.
        const regionGroup = document.createElement('span');
        regionGroup.className = 'xbwl-region';
        regionGroup.appendChild(regionText);
        regionGroup.appendChild(localeWrap);
        regionGroup.appendChild(applyBtn);

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

    // =========================================================================
    // PÁGINA DE PRODUCTO — botones a GG.deals y PCGamingWiki
    // =========================================================================
    // Solo en juegos jugables en PC. Cada dato viene de donde es fiable:
    //
    // PLATAFORMA: del DOM, la lista "Jugar con" de la ficha. Xbox NO traduce esos
    // rótulos —"PC", "XBOX Series X|S" y "Xbox Play Anywhere" salen idénticos en
    // en-US, es-MX y ja-JP—, así que aguanta los 21 locales del selector.
    // Se probó sacarla de la API y NO sirve: `PlatformDependencies` viene vacío en
    // muchos juegos (Forza Horizon 5, Halo Wars 2) y deja fuera a otros que sí son
    // de PC (Call of Duty: Warzone, Halo: Campaign Evolved - Standard Edition);
    // y `AllowedPlatforms` trae Windows.Desktop en el 100% de los productos
    // (también en GTA V de Xbox One o NBA 2K26), o sea que no discrimina nada.
    //
    // TÍTULO: de la API, porque el DOM lo da localizado —el <h1> y hasta el slug
    // ("Forza Horizon 5: Edición Estándar", "Forza Horizon 5 標準版")— y las dos
    // webs destino están indexadas en inglés. La API responde con CORS abierto,
    // por eso sigue bastando @grant none.
    //
    // Y para que las dos fuentes no se descompasen está data-m: ver
    // renderedProductId().
    const PRODUCT_ID_REGEX = /\/games\/store\/[^/]+\/([A-Za-z0-9]{12})(?:\/|$|\?)/;
    const PAGE_CONTAINER_SELECTOR = '[class*="ProductDetailsPage-module__pageContainer"]';
    const FEATURE_ITEM_SELECTOR = '[class*="FeaturesList-module__item"]';
    // Puntos de anclaje, en orden de preferencia. El primero es el módulo de la
    // cabecera (portada, precio y botones de compra): los enlaces se insertan
    // DETRÁS de él, o sea como una banda propia entre ese módulo y el de
    // información (clasificación por edad y avisos legales). Los otros dos son el
    // bloque de compra, de respaldo para fichas sin ese módulo.
    const LINK_ANCHOR_SELECTORS = [
        '[class*="ProductDetailsHeader-module__container"]',
        '[class*="ProductActionsPanel-module__desktopProductActions"]',
        '[class*="AcquisitionButtons-module__desktopContainer"]'
    ];
    // Los módulos de la ficha llevan una clase de contenedor que aporta el margen
    // lateral de la página (padding-left 48 px), y el primer botón de la cabecera
    // arranca justo en ese borde. Copiándola del ancla, los enlaces quedan
    // alineados con ese botón sin medir nada en tiempo de ejecución. Lleva hash
    // por build, así que hay que copiarla, no escribirla.
    const CONTAINER_CLASS_PREFIX = 'ModuleContainer-module__container';

    const CATALOG_ENDPOINT = 'https://displaycatalog.mp.microsoft.com/v7.0/products';
    const CATALOG_CACHE_KEY = 'xbx-catalog-cache';
    const CATALOG_CACHE_TTL = 30 * 24 * 60 * 60 * 1000;   // 30 días
    const CATALOG_CACHE_MAX = 200;                        // entradas, para no crecer sin fin
    const CATALOG_TIMEOUT_MS = 8000;

    const LINKS_ID = 'xbx-external-links';
    const LINKS_STYLES_ID = 'xbx-external-styles';
    const LINKS_PRODUCT_ATTR = 'data-xbx-product';
    // GG.deals filtra por DRM con un bitmask numérico en la query, no por nombre:
    // 1 Steam, 8 GOG, 16 sin DRM, 32 otros, 128 Microsoft Store, 1024 Epic. Aquí
    // interesa Microsoft, que es el DRM de todo lo que se vende en esta tienda.
    // Va a /deals/ (la lista de ofertas), que es la que acepta el filtro de DRM;
    // /games/ lo ignora. Y minRating=0 desactiva el mínimo de valoración de tienda
    // que trae por defecto, que si no esconde parte de las ofertas.
    const GGDEALS_SEARCH_URL = 'https://gg.deals/deals/';
    const GGDEALS_MICROSOFT_DRM = '128';
    const GGDEALS_MIN_RATING = '0';
    const PCGW_SEARCH_URL = 'https://pcgamingwiki.com/w/index.php?search=';
    // Icono de GG.deals: favicon remoto. xbox.com no manda CSP en las fichas de
    // producto, así que carga sin problema.
    const GGDEALS_ICON_URL = 'https://gg.deals/favicon.ico';
    // Icono de PCGamingWiki: SVG inline. Su favicon.ico responde 403 al hotlink
    // desde otros dominios (Cloudflare), así que como <img> remoto no se vería.
    const PCGW_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 827 1158" width="13" height="18" aria-hidden="true" style="vertical-align:middle;flex:0 0 auto"><path d="M0 166.2 448.9-1.1 827.4 56.1l0 1023.9 0.1 28.9L452.1 1158.9 0 1008.4z" fill="#365798"/><path d="M25.3 985.5 24.1 190.5 413 46.8 412 1107.6zM478.1 1108.6 478.3 52.3 788.1 94.3l0 975.8z" fill="#a5b6d9"/><path d="M215.5 737 41.5 727 40.3 420.5 215.9 404.1zm16.7-334.5 156.1-19.4-1.2 359.8-155.2-4.8zM39.3 399.9l0-194.4 176-57.4 1.2 232.1zm350.8-317.2 0.9 274.5-158.7 20.4 0-238zm-253 909.7 0-235.1 141.7 9.3 0 268.4zm247 80.8-17.3-6.4c3.8-22.5-18.9-31.9-19.1-5.7l-18.7-5.5c-0.9-22.1-13.9-31.7-21.2-6.8l-9.7-3-0.6-277.7 12.3 0.9c-4.3 27.5 23.5 28.2 20.3 1.7L350.4 772c-4.4 28.6 23.2 28.9 20.4 1.3l12.7 0.8zM42.8 751.1l82.2 5.9-0.5 108-81.9-11.2zm83.1 129.3-0.9 110.4-82.7-20.2 0-102.4zM494.3 70l278.6 36.6 0 950-278.3 35.1z" fill="#365798"/><path d="m279 507.5c-0.1-5.1 0-10 3.2-14.2 6 0.2 4.9 9.7 5 14.3 10.3 5.1 4.9-10.8 10.2-15.3 7.6-0.8-0.6 16 6.9 15.8 4.9-0.1 3.9-2.4 3.8-6.7-0.1-3.9 0.4-7.8 3.8-10.3 8.2 3.1 0.8 18.2 11.2 15.8 0-6.4-1-14.2 5.8-17.6 2.6 5.2-0.1 14.8 5.4 16.1 7.4 1.7 8.4 3.6 10.2 10.5 0.8 3.1-0.4 4.6 2.8 6.4 3.5 2 7.6 1.4 7.7 6.1 0.1 6.4-2.7 5.5-7.6 5.5-1.8 0-2.4 3.4-2.5 4.7-0.4 4.7 0.4 5.7 5 7 5.9 1.7 4.9 3.3 4.9 8.7 0 2.7 0.5 1.2-3.1 1.9-5.7 1.1-7 0.3-6.7 6.8 0.4 7.8 13.4 1.4 9.7 12.6-1.6 4.8-9.5 1.1-9.5 5.3 0 5.3-1.1 7.7 5.4 8.2 6.4 0.5 6 9.1 0.4 11-3.4 1.2-4.6-0.1-5.8 4-1.2 4.1-1.1 8.4-2.6 12.5-6.1 4.5-11.6-1.7-11.6 8.4 0 2.7-0.6 4.7-1.1 7.3-0.9 5-2.2 0.7-5.8 1.8-1-1.2 0-7.9 0-9.5 0-4.7-1.6-5.8-7-5.4-0.3 5.8-0.2 12-4.9 16.2-2.9-1.9-4-4.8-4.2-8.1-0.3-6.5 0.2-6.7-6.5-8.3-1.2 2.9-2 11.4-1.5 14.5-5.2 2.6-6-5.4-6-8.6 0-2.7 1.1-5.7-2.3-6.7-3.4-0.9-4.6 0.8-4.7 3.9-0.2 6.1-0.5 8.8-5.3 12.2-1.9-5.4-0.3-14.7-6.6-16.4-7-1.8-7.9-6.9-8-13.6-0.1-7.3-8.9-0.3-8.9-8.2 0-0.8-0.6-4.9 0-5.5 2.9-2.1 5.8 1.2 8.5 0.1 1.3-3.6 1.8-9-2.1-9.9-4-0.9-7.8-1.4-6.9-6 1.1-5.7 0.1-5.4 6.3-5.8 4.7-0.3 3-5.2 3.1-8.4-6.2-2.9-8.8 0.8-8.8-7.4 0-5.6-0.4-5.1 5.2-5.1 4.8 0 3.4-1.7 3.4-6.3 0-5.1-9.2-0.6-9.6-7.6-0.2-3 1-5.6 3.9-6.7 5.1-2 5.7-2.3 5.9-7.8 0.3-8 5.6-8.9 12-12.1l0 0 0 0zM88.3 368.3l24.3-92.2-15.7 7.5 21.6-79 25.5-7.3-19.1 53.1 19.2-10.3-55.7 128.3 0 0z" fill="#a5b6d9"/><path d="m278.8 317.9c1.2-3.2 2.5-6.5 3.8-9.9 13.8 5.9 26.4 10.2 40.6 1.9 13.7-8 22.8-24.3 28-38.8 10.2-28.4 10.2-66.8-8.3-91.8-22.5-30.5-54.5-14.5-69.8 13.9-4.7 8.8-11.2 31.3-12.1 45.3-0.5 6.9-0.2 14.1 0.8 21.3 1 8.1 5.2 16.5 4.2 24.7-0.3 2.5-1.8 4.1-4.6 4.6-16.7-28-7.6-72.9 4.9-100.6 12.5-27.6 47.9-55.5 75.9-29 25.7 24.2 28.2 68.1 21.3 100.3-6.2 28.8-26 71.4-61.9 68.2-6.4-0.6-19.1-3.8-22.7-10l0 0zM299.3 272c-3.2-11.6 11.5-19.5 14.8-28.4 1.9-5.2-0.1-9.6-2.2-14-4.9-2.6-9-1.1-10.8 4-3.2 8.9-6.5 14.9-12.6 22.1-3.3-13.7-1.4-29.1 6.6-40.9 4.3-6.3 12.9-9.4 19.4-6.9 20.5 7.8 14.2 42.7 5.3 56.4-4.7 7.3-12.7 7.6-20.5 7.6L299.3 272zm3.4-25.8c0.5 0.7 0.5 1.4 0.2 2-9.4 21.3-18.7 42.6-28.2 64-0.9-0.4-1.4-0.4-1.7-0.7-3.3-3.9-5.6-8.5-7.8-13.1-0.9-1.8 0.1-3.6 1.2-5.1l32.8-43.7c0.9-1.3 2-2.6 3.4-3.4l0 0z" fill="#a5b6d8"/><path d="m188.7 921.7c-6.1 11.9-4.4 25.1-6 38-9.7-2.4-16.7-21.7-18.6-30 1.7-9.9 6.9-17.2 12.9-24.9 2.8-3.6 3.7-7.2 1.9-11.4-0.7-1.6-0.6-3.6-2-4.9-8.7 1.5-13.9 8.2-19.9 14-6.7-7-5.2-33.4 0.2-41.1 8.4-1.5 15.8 1 22.6 5.8 5.3-5.2 5.6-10.3 0.9-15.7-3.6-4.1-14.7-8.9-16.7-13.1-1.6-6.3 10.2-27.5 17.3-27.2 7.8 11.5 12.4 24.5 15 38.1 2.7 1.1 5.1 2.1 8.2 1.5 1.6-15.5-1.9-30.3-6.8-44.8 0.5-0.5 0.8-0.9 1-0.9 8.6 0.6 16.8 2.3 23.4 8.6 14.9 14.2-11.5 41.7 0.4 58.4 10.7-10.3 10.5-23.1 18.6-34 8 10.3 15 31 13.7 44.1-6.9 8.3-12.4 13-28.9 14.2 0.5 3.7-1.8 7.2-0.8 11.5 8.8 9.4 18.5 7.9 30.1 7.2 1.6 8.2-6.7 33.6-12.9 39.7-12.6-5.7-19.1-17.9-26.1-29.1-2.5 1.9-4.6 3.7-6.4 6.1 1.7 12.9 18 29.3 15.9 40.7-5.5 2.6-11.4 4.3-17.7 3.4-6.2-0.9-8.7-4.3-10.2-10.9-3.3-14.7 3.2-32.8-9.2-43.3zm118.5 22.1 0-63.8 67.8 10.9 0 67.4zM307.1 804.2 375 811.3 375 878.1 307.1 868.2zm67.7 165.5 0 66.8-67.6-18.6 0-63.6zm-320.5-31.7 0-28.9 13.7 2 16.5-16.6 0.7 67.6-16.3-20.9z" fill="#a5b6d9"/><path d="m89.1 914.4c1.4-0.6 2.3-0.5 3.4-0.2 2.8 6.5 3.9 13.4 3.6 20.5-0.1 2.7-1.1 5.1-1.7 7.6-0.5 1.9-1.8 3-3.4 3.9-1.3-1.3-0.9-2.5-0.6-3.8 0.8-3.7 1.6-7.3 1.7-11.1 0.2-5.8-1.6-11.2-2.9-16.9l0 0 0 0zm7 42.4c-0.3-3.3 0.9-6.2 1.6-9.1 1-4.4 2.5-8.8 3.1-13.2 0.8-5.6-1-11-2.4-16.4-0.7-2.5-1.5-5-2.2-7.5-0.4-1.6-0.7-3.1 0.2-4.5 1.3-0.1 1.8 0.6 2.1 1.3 2.1 4.3 3.6 8.6 4.5 13.3 1 5.5 0.5 10.9 0.9 16.3 0.3 3.5-0.8 6.9-1.3 10.2-0.6 3.8-2.6 7.4-6.6 9.6l0 0zm7.6 10.4c-1.9-3.7-1.4-6.5-0.1-9.8 3.1-8.1 5.9-16.4 5.3-25.2-0.5-7.7-1.8-15.2-4.6-22.4-1.2-3-2.3-6.1-3.3-9 0.8-1.2 1.7-2 3.4-1.6 1.8 4.1 3.9 8.3 5.1 12.8 5 19 5 37.4-5.7 55.3l0 0z" fill="#a5b6d9"/><path d="m598.7 1047.1-70.3 8.4-0.2-378.8 70.5-3.8zM688.5 533.1c-11 50.3-65.8 45.6-78.3 2.8l-92.4 3.1-0.2-67.9 89.4-3.3c22.8-54 64.5-46.2 81.8 0.2l66.2 0.4 1.6 61.8zm-172.4-237.1 0-24 241.7 7.5 0.1 19.4z" fill="#a5b6d9"/><path d="m52.3 827.5 62.6 9.7-19.2-43.4-8.2 15-13.4-29.3-21.8 48.1zM116.4 788c0 4.4-3.5 7.9-7.9 7.9-4.4 0-7.9-3.5-7.9-7.9 0-4.4 3.5-7.9 7.9-7.9 4.4 0 7.9 3.5 7.9 7.9z" fill="#a5b6d9"/><ellipse cx="649.4" cy="501.8" rx="31" ry="51.8" fill="#365798"/><path d="m177.7 627.1c-1.8 3-1.6 6.7 0.4 9.3l-26.3 40 6.6-0.1 25-36.7c3.2 0.6 6.6-0.9 8.5-3.8 2.4-3.9 1.2-9-2.7-11.4-3.9-2.4-9-1.2-11.5 2.7zm-110.8 29.7-9.7 12.9 4.6 4.3 7.9-11 7.1 0.3c0.4 0.7 0.9 1.4 1.5 2 3.3 3.3 8.6 3.3 11.8 0 3.3-3.3 3.3-8.6 0-11.8-3.3-3.3-8.6-3.3-11.8 0-1 1-1.7 2.3-2.1 3.6zm20.1-68.7c-4.4 0-8 3.6-8 8 0 4.4 3.6 8 8 8 3.7 0 6.8-2.5 7.7-6l44.5 1.3 17.4 21.5c-0.2 0.8-0.4 1.6-0.4 2.4 0 4.6 3.8 8.4 8.4 8.4 4.6 0 8.4-3.8 8.4-8.4 0-4.6-3.8-8.4-8.4-8.4-1.5 0-2.9 0.4-4.1 1.1l-18.9-22.9-48-1.3c-1.4-2.2-3.9-3.7-6.8-3.7zm13.5 27c-4.6 0.1-8.3 4-8.1 8.6 0.1 4.6 4 8.3 8.6 8.1 3.3-0.1 6-2.1 7.3-4.9l22.2-0.5c1.4 2.9 4.4 4.8 7.8 4.7 4.6-0.1 8.3-4 8.1-8.6-0.1-4.6-4-8.3-8.6-8.1-3.6 0.1-6.6 2.5-7.7 5.7l-21.5 0.5c-1.2-3.3-4.4-5.7-8.1-5.6zm-26 16.7c0 4.4-3.6 8-8 8-4.4 0-8-3.6-8-8 0-4.4 3.6-8 8-8 4.4 0 8 3.6 8 8zM87.6 476.5c-3.5 0.2-6.4 2.5-7.5 5.6l-22.6 1 0.3 6.2 22.6-1c1.4 3 4.4 5 7.9 4.9 4.6-0.2 8.1-4.1 7.9-8.7-0.2-4.6-4.1-8.2-8.7-8zm56.3 20c-4.6 0.1-8.3 4-8.1 8.6 0.1 4.6 4 8.3 8.6 8.1 3.3-0.1 6-2.1 7.3-4.9l25.3-0.7c1.4 2.9 4.4 4.8 7.8 4.7 4.6-0.1 8.3-4 8.1-8.6-0.1-4.6-4-8.3-8.6-8.1-3.6 0.1-6.6 2.5-7.7 5.7l-24.6 0.7c-1.2-3.3-4.4-5.7-8.1-5.6zm-44.4-30.4-4.1 4.7 19.8 17.1 80.9-3-0.5-6.2-78.3 2.8zm-41.6 51.7-0.2-6 68.2-4 71.4 103.9-5.3 3.3-70.1-101.1zm132.6 25.4c2.3-2.6 2.6-6.3 1.1-9.3l6.6-9.5 0.4-9-11.7 14.4c-3.1-1.1-6.7-0.2-9 2.4-3 3.5-2.7 8.7 0.8 11.7 3.5 3 8.7 2.7 11.8-0.8zm-32.3 0.4c2 2.9 5.5 4.1 8.7 3.3l30.7 44.3-0.1-9.8-25.5-38c1.8-2.8 1.8-6.4-0.2-9.3-2.6-3.8-7.8-4.7-11.6-2-3.8 2.6-4.7 7.8-2.1 11.6zm-34.8-9.6c-3.5 0.2-6.4 2.5-7.5 5.6l-57.2 2.9 0.3 6.2 57.2-2.9c1.4 3 4.4 5 7.9 4.9 4.6-0.2 8.1-4.1 7.9-8.7-0.2-4.6-4.1-8.2-8.7-8zm17.5 33-81.3 2 0.2 6.3 78.7-2 17.5 22.3c-0.2 0.8-0.4 1.6-0.4 2.4 0 4.6 3.8 8.4 8.4 8.4 4.6 0 8.4-3.8 8.4-8.4 0-4.6-3.8-8.4-8.4-8.4-1.5 0-2.9 0.4-4.1 1.1zM179.2 672.5c1.2 2.6 5 0.2 5.7 3.6-1 4.1-8.9 0.5-11.6 0.9-1.4-4.3 8.4-15.3 10.9-18.8 2.8-1.4 9.4 0 12.6 0 0.3 2.8 0.5 5.3-1.5 7.8-3.4 0.1-6.7-1.4-10.1-1.7-2 2.7-4 5.5-6 8.2zM67.3 604.9l-8.1 0 0-6.7c6.2 0 9.7-1.6 13.2 3.9 6.6 10.3 12.8 20.9 19.1 31.4 3.1 5.2 6.3 10.4 9.5 15.5 4.6 7.4 5.8 8 14.6 8.6 6.3 0.4 12.7 0.4 19.1 0.4 6.6 0 6.4-5.5 12.7-4.9 5.4 5.1 5.4 11.7 0 16.8-6 0.4-5.3-5.8-9.8-5.8l-19.2 0c-9.5 0-12.4 2.1-17.3-5.6-11.2-17.9-22.4-35.7-33.6-53.6z" fill="#a5b6d9"/><path d="m339.3 257.1c0 3.2-2.6 5.9-5.9 5.9-3.2 0-5.9-2.6-5.9-5.9 0-3.2 2.6-5.9 5.9-5.9 3.2 0 5.9 2.6 5.9 5.9zm14.4-13.7c0 3.2-2.6 5.9-5.9 5.9-3.2 0-5.9-2.6-5.9-5.9 0-3.2 2.6-5.9 5.9-5.9 3.2 0 5.9 2.6 5.9 5.9zm23 0c0 3.2-2.6 5.9-5.9 5.9-3.2 0-5.9-2.6-5.9-5.9 0-3.2 2.6-5.9 5.9-5.9 3.2 0 5.9 2.6 5.9 5.9zm-12.9 46.6c0 3.2-2.6 5.9-5.9 5.9-3.2 0-5.9-2.6-5.9-5.9 0-3.2 2.6-5.9 5.9-5.9 3.2 0 5.9 2.6 5.9 5.9zm14.7-11.5c0 3.2-2.6 5.9-5.9 5.9-3.2 0-5.9-2.6-5.9-5.9 0-3.2 2.6-5.9 5.9-5.9 3.2 0 5.9 2.6 5.9 5.9zm7.4-18.3c0 3.2-2.6 5.9-5.9 5.9-3.2 0-5.9-2.6-5.9-5.9 0-3.2 2.6-5.9 5.9-5.9 3.2 0 5.9 2.6 5.9 5.9z" transform="matrix(0.59478444,0,0,0.93466127,95.788817,-7.8295466)" fill="#365798"/></svg>';

    const TRADEMARK_REGEX = /[™®©]/g;
    // Marcador de plataforma que Microsoft cuelga del nombre cuando el mismo juego
    // tiene ficha de PC y de consola ("The Elder Scrolls V: Skyrim Special Edition
    // (PC)"). No es parte del nombre y ninguna de las dos webs destino lo lleva.
    // Acotado a pc/windows para no tocar títulos con paréntesis de verdad ("Fez (2012)").
    const PLATFORM_TAG_REGEX = /\s*[([](?:pc|windows(?:\s*1[01])?)[)\]]\s*$/i;
    // Sufijos de edición que son solo empaquetado del mismo juego: PCGamingWiki no
    // tiene página para ellos, documenta el juego base. Se quitan SOLO estos.
    // "Definitive", "Anniversary", "Special", "Remastered" y "Game of the Year" NO
    // se tocan: ahí sí suelen ser lanzamientos distintos con su propia página
    // (p. ej. "The Elder Scrolls V: Skyrim Special Edition").
    const SKU_EDITION_REGEX = /[\s:–—-]+(?:digital\s+)?(?:standard|deluxe|premium|ultimate|gold|platinum|complete|collector'?s|founder'?s)\s+edition\s*$/i;
    // GG.deals translitera en su índice, así que "Pokémon" se busca como "Pokemon".
    const DIACRITICS_REGEX = /[̀-ͯ]/g;
    function normalizeForGgDeals(title) {
        return title.normalize('NFD').replace(DIACRITICS_REGEX, '');
    }

    // Identificador de producto (Big ID de 12 caracteres) del final de la ruta.
    // No se localiza, a diferencia del slug, así que sirve de clave estable.
    function getProductId() {
        const m = location.pathname.match(PRODUCT_ID_REGEX);
        return m ? m[1].toUpperCase() : null;
    }

    // Id del producto que está REALMENTE pintado, leído del data-m que Xbox pone
    // en el contenedor de la ficha para su telemetría. Es la pieza que permite
    // fiarse del DOM: xbox.com es una SPA y tras saltar de una ficha a otra la URL
    // ya es la nueva mientras este atributo —y la lista de plataformas— siguen
    // siendo los del producto anterior. Comprobado: tras un pushState sin dejar
    // renderizar, la URL dice CarX Street y data-m sigue diciendo Skyrim.
    function renderedProductId() {
        const el = document.querySelector(PAGE_CONTAINER_SELECTOR);
        if (!el) return null;
        try {
            const m = JSON.parse(el.getAttribute('data-m') || 'null');
            return m && m.pid ? String(m.pid).toUpperCase() : null;
        } catch (e) { return null; }
    }

    // 'pc' | 'no-pc' | null. El null significa "todavía no sé": o el DOM aún es de
    // otro producto, o la lista de plataformas no ha renderizado. Distinguirlo de
    // 'no-pc' es lo que evita descartar una ficha por llegar antes que React.
    function pcStatus(id) {
        if (renderedProductId() !== id) return null;
        const items = Array.from(document.querySelectorAll(FEATURE_ITEM_SELECTOR))
            .map((e) => e.textContent.trim());
        if (!items.length) return null;
        const isPc = items.some((x) => x.toUpperCase() === 'PC')
            || items.some((x) => /play anywhere/i.test(x));
        return isPc ? 'pc' : 'no-pc';
    }

    // --- Catálogo (título en inglés + tipo de producto) -------------------------
    function readCatalogCache(id) {
        try {
            const all = JSON.parse(localStorage.getItem(CATALOG_CACHE_KEY) || '{}');
            const hit = all[id];
            if (hit && Date.now() - hit.ts < CATALOG_CACHE_TTL) return hit;
        } catch (e) { /* caché corrupta: se ignora y se vuelve a pedir */ }
        return null;
    }
    function writeCatalogCache(id, info) {
        try {
            let all = {};
            try { all = JSON.parse(localStorage.getItem(CATALOG_CACHE_KEY) || '{}'); } catch (e) { all = {}; }
            all[id] = Object.assign({ ts: Date.now() }, info);
            const keys = Object.keys(all);
            if (keys.length > CATALOG_CACHE_MAX) {
                keys.sort((a, b) => (all[a].ts || 0) - (all[b].ts || 0))
                    .slice(0, keys.length - CATALOG_CACHE_MAX)
                    .forEach((k) => delete all[k]);
            }
            localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(all));
        } catch (e) { console.error('(xbx-links): writeCatalogCache error:', e); }
    }

    // Mercado de la ruta (/es-mx/ -> MX). Se consulta US primero porque es el
    // catálogo más completo, y si el producto no existe ahí se reintenta con el
    // del usuario. El idioma se pide siempre en-us: es lo que indexan los destinos.
    function pageMarket() {
        const m = location.pathname.match(LOCALE_PATH_REGEX);
        return m ? m[1].split('-')[1].toUpperCase() : 'US';
    }

    // Devuelve la respuesta, o null si falla o se pasa del plazo.
    async function fetchWithTimeout(url, timeoutMs) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeoutMs);
        try {
            return await fetch(url, { credentials: 'omit', signal: ctrl.signal });
        } catch (e) {
            console.warn('(xbx-links): catálogo sin respuesta:', e.name === 'AbortError' ? 'tiempo agotado' : e.message);
            return null;
        } finally { clearTimeout(timer); }
    }

    async function fetchCatalogInfo(id) {
        const cached = readCatalogCache(id);
        if (cached) return { title: cached.title, kind: cached.kind };

        const markets = Array.from(new Set(['US', pageMarket()]));
        for (const market of markets) {
            const url = `${CATALOG_ENDPOINT}?bigIds=${encodeURIComponent(id)}`
                + `&market=${encodeURIComponent(market)}&languages=en-us&fieldsTemplate=Details`;
            // Con corte por tiempo: una petición colgada (sin error y sin respuesta)
            // dejaría los botones sin aparecer y sin nada en consola que lo explique.
            const res = await fetchWithTimeout(url, CATALOG_TIMEOUT_MS);
            if (!res || !res.ok) continue;
            const json = await res.json();
            const p = (json.Products || [])[0];
            const title = p && p.LocalizedProperties && p.LocalizedProperties[0]
                ? p.LocalizedProperties[0].ProductTitle : '';
            if (!title) continue;
            const info = { title, kind: (p.ProductKind || p.ProductType || '') };
            writeCatalogCache(id, info);
            return info;
        }
        return null;
    }

    // --- UI ---------------------------------------------------------------------
    function injectLinkStyles() {
        if (document.getElementById(LINKS_STYLES_ID)) return;
        const style = document.createElement('style');
        style.id = LINKS_STYLES_ID;
        style.textContent = `
            /* Banda horizontal entre los dos módulos. El margen lateral lo pone la
               clase de contenedor copiada del módulo de arriba, no este CSS.
               De esa clase viene también un padding-bottom de 40 px pensado para
               módulos altos, que aquí solo deja un hueco: se anula (el selector de
               id gana a la clase). flex-wrap para que en ventanas estrechas caigan
               uno bajo otro. */
            #${LINKS_ID} { display: flex; flex-direction: row; flex-wrap: wrap; gap: 8px; margin: 16px 0; padding-bottom: 0; }
            #${LINKS_ID} .xbx-btn {
                display: flex; align-items: center; justify-content: center; gap: 8px;
                flex: 0 1 auto; min-width: 200px; box-sizing: border-box; padding: 12px 20px;
                border-radius: 4px; font-size: 14px; font-weight: 700; letter-spacing: .3px;
                text-transform: uppercase; text-decoration: none; cursor: pointer;
                transition: filter .15s ease;
            }
            #${LINKS_ID} .xbx-btn:hover { filter: brightness(1.12); text-decoration: none; }
            #${LINKS_ID} .xbx-ico { width: 18px; height: 18px; object-fit: contain; flex: 0 0 auto; }
            #${LINKS_ID} .xbx-gg   { background: #12a150; color: #fff; }
            #${LINKS_ID} .xbx-pcgw { background: #3d4450; color: #fff; }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    // opts: { iconUrl } (favicon remoto) o { iconSvg } (SVG inline)
    function makeLinkButton(cls, label, href, opts) {
        const a = document.createElement('a');
        a.className = `xbx-btn ${cls}`;
        a.href = href;
        a.target = '_blank';
        a.rel = 'nofollow noopener external';
        if (opts && opts.iconSvg) {
            const span = document.createElement('span');
            span.className = 'xbx-ico';
            span.style.display = 'inline-flex';
            span.innerHTML = opts.iconSvg;
            a.appendChild(span);
        } else if (opts && opts.iconUrl) {
            const img = document.createElement('img');
            img.className = 'xbx-ico';
            img.src = opts.iconUrl;
            img.alt = '';
            img.addEventListener('error', () => img.remove());
            a.appendChild(img);
        }
        a.appendChild(document.createTextNode(label));
        return a;
    }

    function findLinkAnchor() {
        for (const sel of LINK_ANCHOR_SELECTORS) {
            const el = document.querySelector(sel);
            if (el) return el;
        }
        return null;
    }

    // Clase de contenedor de módulo presente en un elemento. Cadena vacía si el
    // ancla no es un módulo (respaldo dentro del bloque de compra).
    function containerClassesOf(el) {
        return Array.from(el.classList).filter((c) => c.startsWith(CONTAINER_CLASS_PREFIX)).join(' ');
    }

    // GG.deals sí tiene ficha por edición, así que va el título completo.
    // PCGamingWiki documenta el juego base, así que va sin el sufijo de SKU.
    function buildProductLinks(id, rawTitle, anchor) {
        injectLinkStyles();
        const title = rawTitle
            .replace(TRADEMARK_REGEX, '')
            .replace(/\s+/g, ' ')
            .replace(PLATFORM_TAG_REGEX, '')
            .trim();
        const baseTitle = title.replace(SKU_EDITION_REGEX, '').trim() || title;
        const box = document.createElement('div');
        box.id = LINKS_ID;
        box.setAttribute(LINKS_PRODUCT_ATTR, id);
        const container = anchor ? containerClassesOf(anchor) : '';
        if (container) box.className = container;
        const ggParams = new URLSearchParams({
            drm: GGDEALS_MICROSOFT_DRM,
            minRating: GGDEALS_MIN_RATING,
            title: normalizeForGgDeals(title)
        });
        box.appendChild(makeLinkButton('xbx-gg', 'GG.deals',
            `${GGDEALS_SEARCH_URL}?${ggParams}`, { iconUrl: GGDEALS_ICON_URL }));
        box.appendChild(makeLinkButton('xbx-pcgw', 'PCGamingWiki',
            PCGW_SEARCH_URL + encodeURIComponent(baseTitle), { iconSvg: PCGW_ICON_SVG }));
        return box;
    }

    // --- Init -------------------------------------------------------------------
    // Un contador de navegación: xbox.com es una SPA y route() puede volver a
    // entrar mientras la pasada anterior sigue esperando al DOM o a la API. El
    // token invalida a la vieja en vez de dejar que pinte sobre el producto nuevo.
    let productNav = 0;
    // Producto ya validado y su título, para poder reponer los botones sin volver
    // a preguntar al catálogo. null = no toca poner nada aquí.
    let linksState = null;
    let linksObserver = null;
    let linksDebounce = null;

    // Los botones se insertan como hermanos del bloque de compra, que vive dentro
    // de un subárbol que React reconcilia: cuando vuelve a renderizar ese panel
    // (hidratación de precio, fin de la animación de entrada, cambio de edición)
    // se lleva por delante cualquier nodo que él no haya creado, y los botones
    // desaparecían a los pocos segundos de salir. Por eso hay observer: no basta
    // con insertarlos una vez, hay que reponerlos cuando React los quite.
    function ensureProductLinks() {
        if (!linksState) return;
        if (linksState.id !== getProductId()) return;   // ya se navegó a otro producto
        if (document.getElementById(LINKS_ID)) return;
        const anchor = findLinkAnchor();
        if (!anchor) return;
        anchor.after(buildProductLinks(linksState.id, linksState.title, anchor));
    }

    function startLinksObserver() {
        if (linksObserver) return;
        linksObserver = new MutationObserver(() => {
            if (linksDebounce) return;
            linksDebounce = setTimeout(() => { linksDebounce = null; ensureProductLinks(); }, 200);
        });
        linksObserver.observe(document.body || document.documentElement, { childList: true, subtree: true });
    }

    function waitForValue(probe, timeoutMs, token) {
        return new Promise((resolve) => {
            const deadline = Date.now() + timeoutMs;
            const tick = () => {
                if (token !== productNav) return resolve(null);
                let v = null;
                try { v = probe(); } catch (e) { v = null; }
                if (v !== null && v !== undefined) return resolve(v);
                if (Date.now() > deadline) return resolve(null);
                setTimeout(tick, 250);
            };
            tick();
        });
    }

    async function initProductLinks() {
        const id = getProductId();
        const existing = document.getElementById(LINKS_ID);
        // Al navegar dentro de la SPA los botones del producto anterior siguen en
        // el DOM apuntando al juego equivocado; se retiran antes de nada, y se
        // olvida el producto validado para que el observer no los reponga.
        if (existing && existing.getAttribute(LINKS_PRODUCT_ATTR) !== id) existing.remove();
        if (!linksState || linksState.id !== id) linksState = null;
        if (!id || document.getElementById(LINKS_ID)) return;

        const token = ++productNav;

        // Primero la plataforma, que es lo que descarta la mayoría de las fichas:
        // así no se gasta una llamada al catálogo en juegos de consola.
        const status = await waitForValue(() => pcStatus(id), 15000, token);
        if (token !== productNav || status !== 'pc') return;

        let info = null;
        try { info = await fetchCatalogInfo(id); }
        catch (e) { console.warn('(xbx-links): catálogo no disponible:', e.message); return; }
        if (token !== productNav) return;
        // Sin datos de catálogo no se ponen botones: sin el nombre en inglés
        // buscarían con el título localizado y caerían siempre en cero resultados.
        if (!info) { console.warn('(xbx-links): sin datos de catálogo, no se añaden botones'); return; }
        // Durable = DLC, Consumable = moneda/packs, Application = app,
        // PASS = suscripción. PCGamingWiki no tiene páginas de DLC, así que
        // enlazarlos garantiza cero resultados.
        if (info.kind !== 'Game') return;

        const anchor = await waitForValue(findLinkAnchor, 10000, token);
        if (token !== productNav || !anchor) return;

        linksState = { id, title: info.title };
        ensureProductLinks();
        startLinksObserver();
    }

    // =============================================
    // INICIALIZACIÓN (por ruta)
    // =============================================
    // xbox.com es una SPA: si se navega a /wishlist sin recargar, se reintenta.
    // La redirección se evalúa SIEMPRE (también en la lista de deseos); si ya
    // estamos en el locale correcto no hace nada y se cargan las herramientas.
    function route() {
        try {
            redirectIfNeeded();
            if (isWishlist()) initWishlist();
            else initProductLinks();
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
