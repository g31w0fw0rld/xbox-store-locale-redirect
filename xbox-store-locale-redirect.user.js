// ==UserScript==
// @name         Xbox Store Locale Redirect
// @namespace    https://xbox.com/
// @version      2.0.0
// @description  Automatically redirects Xbox Store pages to your browser's language and region.
// @author       g31w0fw0rld
// @license      MIT
// @match        https://www.xbox.com/*/games/store/*
// @downloadURL  https://github.com/g31w0fw0rld/xbox-store-locale-redirect/raw/main/xbox-store-locale-redirect.user.js
// @updateURL    https://github.com/g31w0fw0rld/xbox-store-locale-redirect/raw/main/xbox-store-locale-redirect.user.js
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // =============================================
    // CONSTANTES
    // =============================================

    // Patrón para detectar el segmento de locale en la ruta (ej. /en-us/, /pt-br/, /fr-fr/)
    const LOCALE_PATH_REGEX = /\/([a-z]{2}-[a-z]{2})\//i;

    // =============================================
    // FUNCIONES
    // =============================================

    /**
     * Obtiene el locale del navegador en formato lowercase (ej. "es-mx", "pt-br").
     * @returns {string} El locale del navegador.
     */
    function getBrowserLocale() {
        const lang = navigator.language || navigator.languages[0] || 'en-us';
        return lang.toLowerCase();
    }

    /**
     * Comprueba si el locale en la URL difiere del locale del navegador.
     * Si es así, reemplaza el segmento de locale en el path y redirige.
     * Usa location.replace() para no dejar entrada en el historial.
     */
    function redirectIfNeeded() {
        const currentUrl = window.location.href;
        const match = currentUrl.match(LOCALE_PATH_REGEX);
        if (!match) return;

        const currentLocale = match[1].toLowerCase();
        const browserLocale = getBrowserLocale();

        if (currentLocale === browserLocale) return;

        const newUrl = currentUrl.replace(LOCALE_PATH_REGEX, `/${browserLocale}/`);
        if (currentUrl !== newUrl) {
            window.location.replace(newUrl);
        }
    }

    // =============================================
    // INICIALIZACIÓN
    // =============================================
    try {
        redirectIfNeeded();
    } catch (e) {
        console.error('(xbox-store-locale-redirect): Error al redirigir:', e);
    }
})();
