// ==UserScript==
// @name         Xbox EN-US to ES-MX Redirect
// @namespace    https://xbox.com/
// @version      1.2
// @description  Redirige automáticamente URLs de Xbox en-US a es-MX en la tienda de juegos.
// @author       g31w0fw0rld
// @license      MIT
// @match        https://www.xbox.com/en-us/games/store/*
// @match        https://www.xbox.com/en-US/games/store/*
// @downloadURL  https://github.com/g31w0fw0rld/xbox-store-locale-redirect/raw/main/xbox-store-locale-redirect.user.js
// @updateURL    https://github.com/g31w0fw0rld/xbox-store-locale-redirect/raw/main/xbox-store-locale-redirect.user.js
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // =============================================
    // CONSTANTES
    // =============================================

    // Patrón para detectar el segmento de idioma inglés en la ruta
    const EN_US_PATH_REGEX = /\/en-us\//i;
    // Segmento de idioma de destino (español México)
    const TARGET_LANG_PATH = '/es-mx/';

    // =============================================
    // FUNCIONES
    // =============================================

    /**
     * Comprueba si la URL actual contiene '/en-us/' en la ruta
     * y, de ser así, redirige a la versión '/es-mx/'.
     * Usa location.replace() para no dejar entrada en el historial.
     * Verifica que la URL resultante sea diferente para evitar bucles.
     */
    function redirectIfNeeded() {
        const currentUrl = window.location.href;

        if (EN_US_PATH_REGEX.test(currentUrl)) {
            const newUrl = currentUrl.replace(EN_US_PATH_REGEX, TARGET_LANG_PATH);
            if (currentUrl !== newUrl) {
                window.location.replace(newUrl);
            }
        }
    }

    // =============================================
    // INICIALIZACIÓN
    // =============================================
    try {
        redirectIfNeeded();
    } catch (e) {
        console.error('(xboxredirect): Error al redirigir Xbox Store:', e);
    }
})();
