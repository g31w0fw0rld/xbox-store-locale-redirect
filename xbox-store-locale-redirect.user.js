// ==UserScript==
// @name         Xbox Store Locale Redirect
// @namespace    https://xbox.com/
// @version      2.6.0
// @description  Sends Xbox Store pages to the language and country you pick from 21 curated locales by rewriting the locale segment of the URL, keeping the choice in a cookie so it holds across the store, and clearing an invalid value instead of looping on it. On your wishlist it adds sort and filters with remembered settings, a shareable link and a 'Learn more' panel. On anything PC-playable, DLC and packs included, it adds GG.deals and PCGamingWiki buttons that search by the English name.
// @author       g31w0fw0rld
// @license      MIT
// @match        https://www.xbox.com/*
// @downloadURL  https://github.com/g31w0fw0rld/xbox-store-locale-redirect/raw/main/xbox-store-locale-redirect.user.js
// @updateURL    https://github.com/g31w0fw0rld/xbox-store-locale-redirect/raw/main/xbox-store-locale-redirect.user.js
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // =============================================
    // DETECCIÓN DE RUTA
    // =============================================
    // El @match cubre TODO www.xbox.com. La redirección de locale se aplica en
    // toda la tienda; la interfaz, solo en la lista de deseos y en las fichas
    // (juegos, ediciones, DLC…). Ver route().
    // Cargar en toda la tienda además es lo que hace que los botones aparezcan sin
    // recargar: el gestor de userscripts inyecta solo al cargar el documento, y
    // xbox.com es una SPA, así que llegando a una ficha desde una página no
    // cubierta (p. ej. /games/browse) no había carga que disparara la inyección.
    // Con el script ya dentro, el hook de history de watchSpaNav() está puesto
    // cuando ocurre esa navegación y la ficha se atiende al vuelo.
    const WISHLIST_PATH_REGEX = /\/wishlist(?:\/|$)/i;
    const STORE_PATH_REGEX = /\/games\/store\//i;
    function isWishlist() { return WISHLIST_PATH_REGEX.test(location.pathname); }
    function isProductPage() { return STORE_PATH_REGEX.test(location.pathname); }

    // =============================================
    // IDIOMA (auto-detect: si la página/navegador está en español -> es, si no -> en)
    // =============================================
    // Los 13 idiomas de la lista curada de LOCALES (más abajo): son las lenguas a
    // las que este script puede llevarte, así que son las que tiene sentido
    // hablar. Las claves son códigos BCP-47 en minúsculas.
    //
    // Lo importante es que el script habla el idioma que TÚ elegiste en su propio
    // selector de redirección: si mandas la tienda a ja-JP, la barra se pone en
    // japonés en vez de quedarse en inglés contradiciendo a la página.
    const I18N = {
        es: {
            sortLabel: 'Ordenar:', added: 'Agregado', name: 'Nombre', price: 'Precio', discount: 'Descuento',
            onlyDiscount: 'Solo con descuento', remember: 'Recordar',
            copy: '🔗 Copiar enlace', copied: '✔ Copiado', copyPrompt: 'Copia este enlace:',
            about: 'ℹ️ Saber más', close: 'Cerrar',
            regionLabel: 'Redirección:', autoLocale: 'Auto (no redirigir)',
            applyLabel: '✔ Aplicar', applyTip: 'Guarda el locale elegido y aplica la redirección ahora (recarga esta página en ese idioma/país). A partir de ahí vale para toda la tienda. Con "Auto" no redirige.',
            sortTip: 'Ordena tu lista de deseos por fecha de agregado, nombre, precio o porcentaje de descuento.',
            dirTip: 'Alterna entre orden ascendente (↑) y descendente (↓).',
            onlyDiscountTip: 'Oculta los juegos que no están en oferta; muestra solo los que tienen descuento.',
            rememberTip: 'Guarda tu orden y filtros y los reaplica al volver a la lista de deseos.',
            copyTip: 'Copia un enlace que reproduce tu orden y filtros actuales al abrirlo.',
            regionTip: 'Elige el idioma/país (locale) al que redirigir las páginas de Xbox: vale para toda la tienda —catálogo, búsquedas, fichas y esta lista de deseos—. Con "Auto" no redirige. Pulsa "Aplicar" para guardar y redirigir ahora.',
            aboutTip: 'Ver qué hace este script en su totalidad.',
            ggTip: 'Busca el título en GG.deals con el filtro de DRM de Microsoft Store. Al buscar por nombre, puede no dar con el juego exacto.',
            pcgwTip: 'Busca el título en PCGamingWiki (compatibilidad y arreglos), sin el sufijo de edición. Al buscar por nombre puede no dar con el artículo exacto, y los DLC no tienen página propia.',
            aboutTitle: '¿Qué hace este script?',
            aboutBody: [
                'Este script mejora Xbox Store en dos frentes:',
                '• Redirección de región: lleva las páginas de Xbox al idioma/país (locale) que elijas en el selector. Con "Auto" no redirige.',
                '– Vale en toda la tienda: catálogo, búsquedas, fichas de juego y tu lista de deseos. Basta con elegirlo una vez.',
                '– El selector ofrece 21 locales curados, solo combinaciones que la tienda soporta de verdad.',
                '– En xbox.com el locale es el primer segmento de la ruta (/es-mx/), así que el script reescribe esa parte de la URL y deja el resto —incluidos los parámetros— tal cual.',
                '– Usa un reemplazo en vez de una navegación nueva, así que no deja entrada extra en el historial y el botón Atrás se comporta con normalidad.',
                '– Un locale guardado inválido se borra en vez de usarse, para no entrar en bucles de redirección.',
                '– "Aplicar" guarda tu elección y redirige al momento, lista de deseos incluida.',
                '• Herramientas en tu lista de deseos:',
                '– Ordenar: por fecha de agregado, nombre, precio o descuento, con un botón ↑/↓ para ascendente o descendente.',
                '– Solo con descuento: muestra únicamente los juegos en oferta.',
                '– Recordar: guarda tu orden y filtros y los reaplica al volver.',
                '– Copiar enlace: genera una URL que reproduce tu orden y filtros. Si el navegador bloquea el portapapeles, la muestra en un diálogo para copiarla a mano.',
                '• En las fichas de producto añade botones a GG.deals (precios/ofertas) y PCGamingWiki (compatibilidad y arreglos).',
                '– Solo en lo jugable en PC. Un producto solo de consola no los recibe; Xbox Play Anywhere sí, porque implica PC.',
                '– También en DLC, ediciones y paquetes. Ahí las búsquedas aciertan menos (PCGamingWiki documenta el juego base y no tiene páginas de DLC), pero cada botón ya avisa en su tooltip de que busca por nombre. Lo que no recibe botones son las apps y las suscripciones, que no son producto de juego.',
                '– La plataforma se lee de la propia ficha, de la lista "Jugar con", que Xbox no traduce.',
                '– El nombre se pide al catálogo público de Microsoft y se guarda en localStorage para no repetir la consulta. Hace falta porque se busca por el nombre en inglés, no por el título que ves: la ficha va traducida, hasta la URL, y las dos webs están indexadas en inglés. Si el catálogo no responde, no se ponen los botones.',
                '– Al saltar de una ficha a otra sin recargar, lo que hay en pantalla tarda un momento en cambiar; hasta que el juego pintado coincide con el de la dirección no se pone nada, para no mezclar la plataforma de un juego con el nombre de otro.',
                '– El script se carga en toda la tienda para enterarse de esos saltos vengan de donde vengan (del catálogo, de una búsqueda), porque Xbox cambia de página sin recargar y así los botones salen sin tener que recargar tú. Fuera de las fichas y de la lista de deseos no pinta nada: lo único que hace en el resto de la tienda es la redirección de región.',
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
            regionLabel: 'Redirect:', autoLocale: 'Auto (no redirect)',
            applyLabel: '✔ Apply', applyTip: 'Saves the chosen locale and applies the redirect now (reloads this page in that language/country). From then on it holds across the whole store. With "Auto" it does not redirect.',
            sortTip: 'Sorts your wishlist by date added, name, price or discount percentage.',
            dirTip: 'Toggles ascending (↑) and descending (↓) order.',
            onlyDiscountTip: 'Hides games that are not on sale; shows only discounted ones.',
            rememberTip: 'Saves your sort and filters and reapplies them when you return to the wishlist.',
            copyTip: 'Copies a link that reproduces your current sort and filters when opened.',
            regionTip: 'Choose the language/country (locale) to redirect Xbox pages to: it holds across the whole store —catalog, searches, game pages and this wishlist—. With "Auto" it does not redirect. Click "Apply" to save and redirect now.',
            aboutTip: 'See everything this script does.',
            ggTip: 'Searches the title on GG.deals with the Microsoft Store DRM filter. Being a title search, it may not hit the exact game.',
            pcgwTip: 'Searches the title on PCGamingWiki (compatibility and fixes), without the edition suffix. Being a title search it may not hit the exact article, and DLC have no page of their own.',
            aboutTitle: 'What does this script do?',
            aboutBody: [
                'This script improves Xbox Store in two ways:',
                '• Region redirect: takes Xbox pages to the language/country (locale) you pick in the selector. With "Auto" it does not redirect.',
                '– It holds across the whole store: catalog, searches, game pages and your wishlist. You only pick it once.',
                '– The selector offers 21 curated locales, only combinations the store actually supports.',
                '– On xbox.com the locale is the first path segment (/en-us/), so the script rewrites that part of the URL and leaves the rest —query parameters included— untouched.',
                '– It uses a replace rather than a new navigation, so it leaves no extra history entry and the Back button behaves normally.',
                '– An invalid saved locale is cleared instead of used, so a bad value cannot cause a redirect loop.',
                '– "Apply" saves your choice and redirects right away, wishlist included.',
                '• Wishlist tools:',
                '– Sort: by date added, name, price or discount, with an ↑/↓ button for ascending or descending.',
                '– Only discounted: shows only games on sale.',
                '– Remember: saves your sort and filters and reapplies them on return.',
                '– Copy link: builds a URL that reproduces your sort and filters. If the browser blocks clipboard access, it shows the URL in a dialog so you can copy it by hand.',
                '• On product pages it adds buttons to GG.deals (prices/deals) and PCGamingWiki (compatibility and fixes).',
                '– PC-playable products only. A console-only one gets nothing; Xbox Play Anywhere does, because it implies PC.',
                '– DLC, editions and packs get them too. The searches hit less often there (PCGamingWiki documents the base game and has no DLC pages), but each button already says in its tooltip that it searches by name. What gets no buttons are apps and subscriptions, which are not game products.',
                '– The platform is read from the page itself, from the "Play with" list, which Xbox does not translate.',
                '– The name is requested from Microsoft\'s public catalog and kept in localStorage to avoid repeating the call. It is needed because the search uses the English name, not the title you see: the page is translated, the URL included, and both sites are indexed in English. If the catalog does not answer, no buttons are added.',
                '– When you jump between pages without reloading, what is on screen takes a moment to change; nothing is added until the game on screen matches the one in the address, so one game\'s platform is never paired with another\'s name.',
                '– The script loads across the whole store so it catches those jumps wherever they come from (the catalog, a search), because Xbox changes page without reloading and this way the buttons show up with no reload needed. Outside game pages and the wishlist it draws nothing: the only thing it does elsewhere in the store is the region redirect.',
                '– GG.deals opens already filtered to the Microsoft Store DRM, the same way the Steam, GOG and Epic scripts do with theirs, and without the default minimum store rating that hides part of the deals.',
                '– The "(PC)" that Microsoft hangs on the name when the same game has both a PC and a console page is dropped, since it is not part of the title and neither destination carries it.',
                '– GG.deals gets the full title, edition included (and without accents, since it transliterates its index); PCGamingWiki gets it without packaging suffixes (Standard, Deluxe, Premium…), because it documents the base game. The ones that are genuinely separate releases (Definitive, Anniversary, Special, Remastered) are left alone.',
                'The country/language preference is stored in an xbox.com cookie, so it holds across the whole store and not just the current tab; the rest goes in localStorage. The only external request goes to Microsoft\'s public catalog, to learn the English name of the game you are looking at: it sends just the product code from the URL, with no cookies or session, and the answer is kept in localStorage. Nothing is sent to third parties or to the author.'
            ]
        },
        de: {
            sortLabel: 'Sortieren:', added: 'Hinzugefügt', name: 'Name', price: 'Preis', discount: 'Rabatt',
            onlyDiscount: 'Nur reduzierte', remember: 'Merken',
            copy: '🔗 Link kopieren', copied: '✔ Kopiert', copyPrompt: 'Diesen Link kopieren:',
            about: 'ℹ️ Mehr erfahren', close: 'Schließen',
            regionLabel: 'Weiterleitung:', autoLocale: 'Automatisch (keine Weiterleitung)',
            applyLabel: '✔ Anwenden', applyTip: 'Speichert das gewählte Gebietsschema und wendet die Weiterleitung sofort an (lädt diese Seite in dieser Sprache bzw. diesem Land neu). Ab dann gilt es im ganzen Store. Mit „Automatisch“ wird nicht weitergeleitet.',
            sortTip: 'Sortiert deine Wunschliste nach Hinzufügedatum, Name, Preis oder Rabatt in Prozent.',
            dirTip: 'Wechselt zwischen aufsteigender (↑) und absteigender (↓) Reihenfolge.',
            onlyDiscountTip: 'Blendet Spiele aus, die nicht im Angebot sind; zeigt nur reduzierte.',
            rememberTip: 'Speichert Sortierung und Filter und wendet sie bei der Rückkehr zur Wunschliste wieder an.',
            copyTip: 'Kopiert einen Link, der beim Öffnen deine aktuelle Sortierung und Filter wiederherstellt.',
            regionTip: 'Wähle Sprache und Land (Gebietsschema), wohin Xbox-Seiten weitergeleitet werden sollen: es gilt im ganzen Store – Katalog, Suche, Spielseiten und diese Wunschliste. Mit „Automatisch“ wird nicht weitergeleitet. Klicke auf „Anwenden“, um zu speichern und sofort weiterzuleiten.',
            aboutTip: 'Alles ansehen, was dieses Skript macht.',
            ggTip: 'Sucht den Titel auf GG.deals mit dem DRM-Filter des Microsoft Store. Da es eine Titelsuche ist, wird nicht immer das exakte Spiel getroffen.',
            pcgwTip: 'Sucht den Titel auf PCGamingWiki (Kompatibilität und Fixes), ohne den Editionszusatz. Da es eine Titelsuche ist, wird nicht immer der exakte Artikel getroffen, und DLC haben keine eigene Seite.',
            aboutTitle: 'Was macht dieses Skript?',
            aboutBody: [
                'Dieses Skript verbessert den Xbox Store an zwei Stellen:',
                '• Regionsweiterleitung: bringt Xbox-Seiten in die Sprache bzw. das Land (Gebietsschema), das du im Auswahlmenü wählst. Mit „Automatisch“ wird nicht weitergeleitet.',
                '– Es gilt im ganzen Store: Katalog, Suche, Spielseiten und deine Wunschliste. Einmal wählen genügt.',
                '– Das Auswahlmenü bietet 21 kuratierte Gebietsschemata, nur Kombinationen, die der Store wirklich unterstützt.',
                '– Auf xbox.com ist das Gebietsschema das erste Pfadsegment (/de-de/), also schreibt das Skript genau diesen Teil der URL um und lässt den Rest – Abfrageparameter eingeschlossen – unangetastet.',
                '– Es ersetzt den Eintrag, statt neu zu navigieren, hinterlässt also keinen zusätzlichen Verlaufseintrag, und die Zurück-Schaltfläche verhält sich normal.',
                '– Ein ungültig gespeichertes Gebietsschema wird gelöscht statt verwendet, damit ein falscher Wert keine Weiterleitungsschleife auslösen kann.',
                '– „Anwenden“ speichert deine Wahl und leitet sofort weiter, Wunschliste eingeschlossen.',
                '• Werkzeuge auf der Wunschliste:',
                '– Sortieren: nach Hinzufügedatum, Name, Preis oder Rabatt, mit einer ↑/↓-Schaltfläche für auf- oder absteigend.',
                '– Nur reduzierte: zeigt nur Spiele im Angebot.',
                '– Merken: speichert Sortierung und Filter und wendet sie bei der Rückkehr wieder an.',
                '– Link kopieren: baut eine URL, die deine Sortierung und Filter wiederherstellt. Blockiert der Browser die Zwischenablage, wird die URL in einem Dialog zum Abschreiben angezeigt.',
                '• Auf Produktseiten kommen Schaltflächen zu GG.deals (Preise/Angebote) und PCGamingWiki (Kompatibilität und Fixes) dazu.',
                '– Nur bei auf dem PC spielbaren Titeln. Ein reines Konsolenprodukt bekommt keine; Xbox Play Anywhere schon, weil das den PC einschließt.',
                '– DLC, Editionen und Pakete bekommen sie auch. Dort treffen die Suchen seltener (PCGamingWiki dokumentiert das Basisspiel und hat keine DLC-Seiten), aber jede Schaltfläche weist in ihrem Tooltip schon darauf hin, dass sie nach dem Namen sucht. Keine Schaltflächen bekommen Apps und Abonnements, die keine Spielprodukte sind.',
                '– Die Plattform wird aus der Seite selbst gelesen, aus der Liste „Spielbar auf“, die Xbox nicht übersetzt.',
                '– Der Name wird beim öffentlichen Katalog von Microsoft angefragt und im localStorage behalten, um die Abfrage nicht zu wiederholen. Nötig ist das, weil nach dem englischen Namen gesucht wird und nicht nach dem Titel, den du siehst: die Seite ist übersetzt, die URL eingeschlossen, und beide Zielsites sind auf Englisch indexiert. Antwortet der Katalog nicht, werden keine Schaltflächen gesetzt.',
                '– Beim Springen von einer Seite zur nächsten ohne Neuladen braucht das, was auf dem Bildschirm steht, einen Moment; solange das angezeigte Spiel nicht dem in der Adresse entspricht, wird nichts gesetzt, damit nie die Plattform des einen Spiels mit dem Namen eines anderen zusammenkommt.',
                '– Das Skript lädt im ganzen Store, um diese Sprünge mitzubekommen, woher sie auch kommen (aus dem Katalog, aus einer Suche), denn Xbox wechselt die Seite ohne Neuladen und so erscheinen die Schaltflächen, ohne dass du neu laden musst. Außerhalb der Spielseiten und der Wunschliste zeichnet es nichts: das Einzige, was es im übrigen Store tut, ist die Regionsweiterleitung.',
                '– GG.deals öffnet sich bereits auf das DRM des Microsoft Store gefiltert, genauso wie es die Skripte für Steam, GOG und Epic mit ihrem tun, und ohne die standardmäßige Mindestbewertung, die einen Teil der Angebote verbirgt.',
                '– Das „(PC)“, das Microsoft an den Namen hängt, wenn dasselbe Spiel eine PC- und eine Konsolenseite hat, wird entfernt, da es nicht zum Titel gehört und keines der beiden Ziele es führt.',
                '– GG.deals bekommt den vollständigen Titel samt Edition (und ohne Akzente, da es seinen Index transliteriert); PCGamingWiki bekommt ihn ohne Verpackungszusätze (Standard, Deluxe, Premium …), weil es das Basisspiel dokumentiert. Die, die wirklich eigene Veröffentlichungen sind (Definitive, Anniversary, Special, Remastered), bleiben unangetastet.',
                'Die Länder-/Sprachwahl wird in einem Cookie von xbox.com gespeichert, damit sie im ganzen Store gilt und nicht nur im aktuellen Tab; der Rest landet im localStorage. Die einzige externe Anfrage geht an den öffentlichen Katalog von Microsoft, um den englischen Namen des Spiels zu erfahren, das du gerade ansiehst: gesendet wird nur die Produktkennung aus der URL, ohne Cookies und ohne Sitzung, und die Antwort wird im localStorage abgelegt. An Dritte oder an den Autor wird nichts gesendet.'
            ]
        },
        fr: {
            sortLabel: 'Trier :', added: 'Ajout', name: 'Nom', price: 'Prix', discount: 'Remise',
            onlyDiscount: 'Uniquement en promo', remember: 'Mémoriser',
            copy: '🔗 Copier le lien', copied: '✔ Copié', copyPrompt: 'Copiez ce lien :',
            about: 'ℹ️ En savoir plus', close: 'Fermer',
            regionLabel: 'Redirection :', autoLocale: 'Auto (pas de redirection)',
            applyLabel: '✔ Appliquer', applyTip: 'Enregistre les paramètres régionaux choisis et applique la redirection maintenant (recharge cette page dans cette langue et ce pays). Ensuite, cela vaut pour toute la boutique. Avec « Auto », aucune redirection.',
            sortTip: 'Trie votre liste de souhaits par date d’ajout, nom, prix ou pourcentage de remise.',
            dirTip: 'Bascule entre l’ordre croissant (↑) et décroissant (↓).',
            onlyDiscountTip: 'Masque les jeux qui ne sont pas en promotion ; n’affiche que ceux en remise.',
            rememberTip: 'Enregistre votre tri et vos filtres et les réapplique à votre retour sur la liste de souhaits.',
            copyTip: 'Copie un lien qui reproduit votre tri et vos filtres actuels à l’ouverture.',
            regionTip: 'Choisissez la langue et le pays (paramètres régionaux) vers lesquels rediriger les pages Xbox : cela vaut pour toute la boutique — catalogue, recherches, fiches de jeu et cette liste de souhaits. Avec « Auto », aucune redirection. Cliquez sur « Appliquer » pour enregistrer et rediriger tout de suite.',
            aboutTip: 'Voir tout ce que fait ce script.',
            ggTip: 'Recherche le titre sur GG.deals avec le filtre DRM du Microsoft Store. S’agissant d’une recherche par titre, le jeu exact peut ne pas être trouvé.',
            pcgwTip: 'Recherche le titre sur PCGamingWiki (compatibilité et correctifs), sans le suffixe d’édition. S’agissant d’une recherche par titre, l’article exact peut ne pas être trouvé, et les DLC n’ont pas de page propre.',
            aboutTitle: 'Que fait ce script ?',
            aboutBody: [
                'Ce script améliore le Xbox Store sur deux fronts :',
                '• Redirection de région : emmène les pages Xbox vers la langue et le pays (paramètres régionaux) choisis dans le sélecteur. Avec « Auto », aucune redirection.',
                '– Cela vaut pour toute la boutique : catalogue, recherches, fiches de jeu et votre liste de souhaits. Il suffit de le choisir une fois.',
                '– Le sélecteur propose 21 paramètres régionaux sélectionnés, uniquement des combinaisons réellement prises en charge par la boutique.',
                '– Sur xbox.com, les paramètres régionaux forment le premier segment du chemin (/fr-fr/) : le script réécrit cette partie de l’URL et laisse le reste — paramètres de requête compris — tel quel.',
                '– Il utilise un remplacement plutôt qu’une nouvelle navigation : aucune entrée supplémentaire dans l’historique et le bouton Retour se comporte normalement.',
                '– Une valeur enregistrée invalide est effacée au lieu d’être utilisée, pour éviter les boucles de redirection.',
                '– « Appliquer » enregistre votre choix et redirige immédiatement, liste de souhaits comprise.',
                '• Outils sur votre liste de souhaits :',
                '– Trier : par date d’ajout, nom, prix ou remise, avec un bouton ↑/↓ pour l’ordre croissant ou décroissant.',
                '– Uniquement en promo : n’affiche que les jeux en solde.',
                '– Mémoriser : enregistre votre tri et vos filtres et les réapplique au retour.',
                '– Copier le lien : construit une URL qui reproduit votre tri et vos filtres. Si le navigateur bloque le presse-papiers, l’URL s’affiche dans une boîte de dialogue pour la copier à la main.',
                '• Sur les fiches produit, il ajoute des boutons vers GG.deals (prix/promotions) et PCGamingWiki (compatibilité et correctifs).',
                '– Uniquement pour ce qui est jouable sur PC. Un produit console seulement n’en reçoit pas ; Xbox Play Anywhere si, car cela implique le PC.',
                '– Les DLC, éditions et packs en reçoivent aussi. Les recherches y aboutissent moins souvent (PCGamingWiki documente le jeu de base et n’a pas de pages de DLC), mais chaque bouton précise déjà dans son infobulle qu’il cherche par nom. Ce qui ne reçoit pas de boutons, ce sont les applications et les abonnements, qui ne sont pas des produits de jeu.',
                '– La plateforme est lue sur la fiche elle-même, dans la liste « Jouer avec », que Xbox ne traduit pas.',
                '– Le nom est demandé au catalogue public de Microsoft et conservé dans localStorage pour ne pas répéter l’appel. C’est nécessaire parce que la recherche se fait sur le nom anglais et non sur le titre que vous voyez : la fiche est traduite, URL comprise, et les deux sites sont indexés en anglais. Si le catalogue ne répond pas, aucun bouton n’est ajouté.',
                '– En passant d’une fiche à l’autre sans recharger, ce qui est à l’écran met un instant à changer ; tant que le jeu affiché ne correspond pas à celui de l’adresse, rien n’est ajouté, pour ne jamais associer la plateforme d’un jeu au nom d’un autre.',
                '– Le script se charge sur toute la boutique afin de repérer ces sauts d’où qu’ils viennent (du catalogue, d’une recherche), car Xbox change de page sans recharger et les boutons apparaissent ainsi sans que vous ayez à recharger. En dehors des fiches et de la liste de souhaits, il n’affiche rien : la seule chose qu’il fait ailleurs dans la boutique, c’est la redirection de région.',
                '– GG.deals s’ouvre déjà filtré sur le DRM du Microsoft Store, comme le font les scripts Steam, GOG et Epic avec le leur, et sans la note minimale de boutique appliquée par défaut qui masque une partie des offres.',
                '– Le « (PC) » que Microsoft accole au nom lorsque le même jeu a une fiche PC et une fiche console est retiré, car il ne fait pas partie du titre et aucune des deux destinations ne le porte.',
                '– GG.deals reçoit le titre complet, édition comprise (et sans accents, puisqu’il translittère son index) ; PCGamingWiki le reçoit sans suffixes d’emballage (Standard, Deluxe, Premium…), car il documente le jeu de base. Ceux qui sont de véritables sorties distinctes (Definitive, Anniversary, Special, Remastered) sont laissés tels quels.',
                'La préférence de pays et de langue est stockée dans un cookie de xbox.com, pour qu’elle vaille sur toute la boutique et pas seulement dans l’onglet en cours ; le reste passe par localStorage. La seule requête externe va au catalogue public de Microsoft, afin de connaître le nom anglais du jeu que vous consultez : seul l’identifiant de produit présent dans l’URL est envoyé, sans cookies ni session, et la réponse est conservée dans localStorage. Rien n’est envoyé à des tiers ni à l’auteur.'
            ]
        },
        it: {
            sortLabel: 'Ordina:', added: 'Aggiunta', name: 'Nome', price: 'Prezzo', discount: 'Sconto',
            onlyDiscount: 'Solo scontati', remember: 'Ricorda',
            copy: '🔗 Copia link', copied: '✔ Copiato', copyPrompt: 'Copia questo link:',
            about: 'ℹ️ Scopri di più', close: 'Chiudi',
            regionLabel: 'Reindirizzamento:', autoLocale: 'Auto (nessun reindirizzamento)',
            applyLabel: '✔ Applica', applyTip: 'Salva le impostazioni internazionali scelte e applica subito il reindirizzamento (ricarica questa pagina in quella lingua e paese). Da lì in poi vale per tutto il negozio. Con «Auto» non reindirizza.',
            sortTip: 'Ordina la tua lista dei desideri per data di aggiunta, nome, prezzo o percentuale di sconto.',
            dirTip: 'Alterna tra ordine crescente (↑) e decrescente (↓).',
            onlyDiscountTip: 'Nasconde i giochi non in offerta; mostra solo quelli scontati.',
            rememberTip: 'Salva ordinamento e filtri e li riapplica quando torni alla lista dei desideri.',
            copyTip: 'Copia un link che all’apertura riproduce l’ordinamento e i filtri attuali.',
            regionTip: 'Scegli la lingua e il paese (impostazioni internazionali) verso cui reindirizzare le pagine Xbox: vale per tutto il negozio — catalogo, ricerche, schede di gioco e questa lista dei desideri. Con «Auto» non reindirizza. Premi «Applica» per salvare e reindirizzare subito.',
            aboutTip: 'Vedi tutto quello che fa questo script.',
            ggTip: 'Cerca il titolo su GG.deals con il filtro DRM del Microsoft Store. Trattandosi di una ricerca per titolo, potrebbe non trovare il gioco esatto.',
            pcgwTip: 'Cerca il titolo su PCGamingWiki (compatibilità e correzioni), senza il suffisso di edizione. Trattandosi di una ricerca per titolo potrebbe non trovare la voce esatta, e i DLC non hanno una pagina propria.',
            aboutTitle: 'Che cosa fa questo script?',
            aboutBody: [
                'Questo script migliora lo Xbox Store su due fronti:',
                '• Reindirizzamento di regione: porta le pagine Xbox alla lingua e al paese (impostazioni internazionali) che scegli nel selettore. Con «Auto» non reindirizza.',
                '– Vale per tutto il negozio: catalogo, ricerche, schede di gioco e la tua lista dei desideri. Basta sceglierlo una volta.',
                '– Il selettore offre 21 impostazioni internazionali selezionate, solo combinazioni davvero supportate dal negozio.',
                '– Su xbox.com le impostazioni internazionali sono il primo segmento del percorso (/it-it/), quindi lo script riscrive quella parte dell’URL e lascia il resto — parametri inclusi — così com’è.',
                '– Usa una sostituzione anziché una nuova navigazione, quindi non lascia voci extra nella cronologia e il pulsante Indietro si comporta normalmente.',
                '– Un valore salvato non valido viene cancellato anziché usato, per non entrare in cicli di reindirizzamento.',
                '– «Applica» salva la tua scelta e reindirizza subito, lista dei desideri inclusa.',
                '• Strumenti nella lista dei desideri:',
                '– Ordina: per data di aggiunta, nome, prezzo o sconto, con un pulsante ↑/↓ per crescente o decrescente.',
                '– Solo scontati: mostra unicamente i giochi in offerta.',
                '– Ricorda: salva ordinamento e filtri e li riapplica al ritorno.',
                '– Copia link: genera un URL che riproduce ordinamento e filtri. Se il browser blocca gli appunti, l’URL viene mostrato in una finestra per copiarlo a mano.',
                '• Nelle schede di prodotto aggiunge pulsanti verso GG.deals (prezzi/offerte) e PCGamingWiki (compatibilità e correzioni).',
                '– Solo per ciò che è giocabile su PC. Un prodotto solo per console non li riceve; Xbox Play Anywhere sì, perché implica il PC.',
                '– Anche DLC, edizioni e pacchetti li ricevono. Lì le ricerche azzeccano meno (PCGamingWiki documenta il gioco base e non ha pagine per i DLC), ma ogni pulsante avverte già nel proprio tooltip che cerca per nome. A non ricevere pulsanti sono le app e gli abbonamenti, che non sono prodotti di gioco.',
                '– La piattaforma si legge dalla scheda stessa, dall’elenco «Gioca con», che Xbox non traduce.',
                '– Il nome viene chiesto al catalogo pubblico di Microsoft e conservato in localStorage per non ripetere la chiamata. Serve perché la ricerca usa il nome inglese e non il titolo che vedi: la scheda è tradotta, URL compreso, ed entrambi i siti sono indicizzati in inglese. Se il catalogo non risponde, i pulsanti non vengono messi.',
                '– Saltando da una scheda all’altra senza ricaricare, ciò che è a schermo impiega un attimo a cambiare; finché il gioco mostrato non coincide con quello dell’indirizzo non viene messo nulla, per non accoppiare mai la piattaforma di un gioco con il nome di un altro.',
                '– Lo script si carica su tutto il negozio per accorgersi di quei salti da qualunque parte arrivino (dal catalogo, da una ricerca), perché Xbox cambia pagina senza ricaricare e così i pulsanti compaiono senza che tu debba ricaricare. Fuori dalle schede e dalla lista dei desideri non disegna nulla: l’unica cosa che fa nel resto del negozio è il reindirizzamento di regione.',
                '– GG.deals si apre già filtrato sul DRM del Microsoft Store, come fanno gli script di Steam, GOG ed Epic con il proprio, e senza la valutazione minima applicata per impostazione predefinita che nasconde parte delle offerte.',
                '– Il «(PC)» che Microsoft appiccica al nome quando lo stesso gioco ha una scheda PC e una console viene tolto, perché non fa parte del titolo e nessuna delle due destinazioni lo riporta.',
                '– GG.deals riceve il titolo completo, edizione inclusa (e senza accenti, perché translittera il suo indice); PCGamingWiki lo riceve senza suffissi di confezionamento (Standard, Deluxe, Premium…), perché documenta il gioco base. Quelli che sono davvero uscite a sé (Definitive, Anniversary, Special, Remastered) restano intatti.',
                'La preferenza di paese e lingua è salvata in un cookie di xbox.com, perché valga in tutto il negozio e non solo nella scheda corrente; il resto va in localStorage. L’unica richiesta esterna è al catalogo pubblico di Microsoft, per sapere il nome inglese del gioco che stai guardando: si manda solo il codice di prodotto dell’URL, senza cookie né sessione, e la risposta viene salvata in localStorage. Non si invia nulla a terzi né all’autore.'
            ]
        },
        nl: {
            sortLabel: 'Sorteren:', added: 'Toegevoegd', name: 'Naam', price: 'Prijs', discount: 'Korting',
            onlyDiscount: 'Alleen afgeprijsd', remember: 'Onthouden',
            copy: '🔗 Link kopiëren', copied: '✔ Gekopieerd', copyPrompt: 'Kopieer deze link:',
            about: 'ℹ️ Meer informatie', close: 'Sluiten',
            regionLabel: 'Omleiding:', autoLocale: 'Auto (niet omleiden)',
            applyLabel: '✔ Toepassen', applyTip: 'Slaat de gekozen landinstelling op en past de omleiding nu toe (laadt deze pagina opnieuw in die taal en dat land). Vanaf dan geldt het voor de hele winkel. Met "Auto" wordt er niet omgeleid.',
            sortTip: 'Sorteert je verlanglijst op datum van toevoegen, naam, prijs of kortingspercentage.',
            dirTip: 'Wisselt tussen oplopende (↑) en aflopende (↓) volgorde.',
            onlyDiscountTip: 'Verbergt games die niet in de aanbieding zijn; toont alleen afgeprijsde.',
            rememberTip: 'Slaat je sortering en filters op en past ze opnieuw toe als je terugkeert naar de verlanglijst.',
            copyTip: 'Kopieert een link die bij openen je huidige sortering en filters herstelt.',
            regionTip: 'Kies de taal en het land (landinstelling) waarnaar Xbox-pagina’s worden omgeleid: het geldt voor de hele winkel — catalogus, zoekopdrachten, gamepagina’s en deze verlanglijst. Met "Auto" wordt er niet omgeleid. Klik op "Toepassen" om op te slaan en meteen om te leiden.',
            aboutTip: 'Bekijk alles wat dit script doet.',
            ggTip: 'Zoekt de titel op GG.deals met het DRM-filter van de Microsoft Store. Omdat het een titelzoekopdracht is, wordt niet altijd het exacte spel gevonden.',
            pcgwTip: 'Zoekt de titel op PCGamingWiki (compatibiliteit en fixes), zonder het editiesuffix. Omdat het een titelzoekopdracht is wordt niet altijd het exacte artikel gevonden, en DLC hebben geen eigen pagina.',
            aboutTitle: 'Wat doet dit script?',
            aboutBody: [
                'Dit script verbetert de Xbox Store op twee vlakken:',
                '• Regio-omleiding: brengt Xbox-pagina’s naar de taal en het land (landinstelling) die je in de keuzelijst kiest. Met "Auto" wordt er niet omgeleid.',
                '– Het geldt voor de hele winkel: catalogus, zoekopdrachten, gamepagina’s en je verlanglijst. Je hoeft het maar één keer te kiezen.',
                '– De keuzelijst biedt 21 zorgvuldig gekozen landinstellingen, alleen combinaties die de winkel echt ondersteunt.',
                '– Op xbox.com is de landinstelling het eerste padsegment (/nl-nl/), dus het script herschrijft dat deel van de URL en laat de rest — queryparameters inbegrepen — ongemoeid.',
                '– Het gebruikt een vervanging in plaats van een nieuwe navigatie, dus er komt geen extra item in de geschiedenis en de Terug-knop gedraagt zich normaal.',
                '– Een ongeldig opgeslagen landinstelling wordt gewist in plaats van gebruikt, zodat een verkeerde waarde geen omleidingslus kan veroorzaken.',
                '– "Toepassen" slaat je keuze op en leidt meteen om, verlanglijst inbegrepen.',
                '• Hulpmiddelen op je verlanglijst:',
                '– Sorteren: op datum van toevoegen, naam, prijs of korting, met een ↑/↓-knop voor oplopend of aflopend.',
                '– Alleen afgeprijsd: toont alleen games in de aanbieding.',
                '– Onthouden: slaat je sortering en filters op en past ze bij terugkomst opnieuw toe.',
                '– Link kopiëren: maakt een URL die je sortering en filters herstelt. Blokkeert de browser het klembord, dan wordt de URL in een dialoogvenster getoond om hem met de hand te kopiëren.',
                '• Op productpagina’s voegt het knoppen toe naar GG.deals (prijzen/aanbiedingen) en PCGamingWiki (compatibiliteit en fixes).',
                '– Alleen voor wat op de pc speelbaar is. Een product dat alleen voor console is krijgt ze niet; Xbox Play Anywhere wel, want dat impliceert pc.',
                '– DLC, edities en pakketten krijgen ze ook. Daar treffen de zoekopdrachten minder vaak doel (PCGamingWiki documenteert het basisspel en heeft geen DLC-pagina’s), maar elke knop meldt in zijn tooltip al dat hij op naam zoekt. Wat geen knoppen krijgt zijn apps en abonnementen, die geen gameproducten zijn.',
                '– Het platform wordt van de pagina zelf gelezen, uit de lijst "Speel met", die Xbox niet vertaalt.',
                '– De naam wordt opgevraagd bij de openbare catalogus van Microsoft en in localStorage bewaard om de aanroep niet te herhalen. Dat is nodig omdat er op de Engelse naam wordt gezocht en niet op de titel die je ziet: de pagina is vertaald, de URL inbegrepen, en beide sites zijn in het Engels geïndexeerd. Antwoordt de catalogus niet, dan worden er geen knoppen geplaatst.',
                '– Als je zonder herladen van de ene pagina naar de andere springt, duurt het even voor wat op het scherm staat verandert; zolang het getoonde spel niet overeenkomt met dat in het adres wordt er niets geplaatst, zodat het platform van het ene spel nooit met de naam van een ander wordt gecombineerd.',
                '– Het script laadt in de hele winkel om die sprongen op te merken waar ze ook vandaan komen (uit de catalogus, uit een zoekopdracht), want Xbox wisselt van pagina zonder te herladen en zo verschijnen de knoppen zonder dat jij hoeft te herladen. Buiten de gamepagina’s en de verlanglijst tekent het niets: het enige wat het elders in de winkel doet is de regio-omleiding.',
                '– GG.deals opent al gefilterd op het DRM van de Microsoft Store, net zoals de scripts voor Steam, GOG en Epic dat met het hunne doen, en zonder de standaard minimale winkelbeoordeling die een deel van de aanbiedingen verbergt.',
                '– De "(PC)" die Microsoft aan de naam hangt wanneer hetzelfde spel zowel een pc- als een consolepagina heeft, wordt weggehaald, want die hoort niet bij de titel en geen van beide bestemmingen voert hem.',
                '– GG.deals krijgt de volledige titel, editie inbegrepen (en zonder accenten, omdat het zijn index translitereert); PCGamingWiki krijgt hem zonder verpakkingssuffixen (Standard, Deluxe, Premium…), omdat het het basisspel documenteert. Die welke echt aparte uitgaven zijn (Definitive, Anniversary, Special, Remastered) blijven ongemoeid.',
                'De land-/taalvoorkeur wordt bewaard in een cookie van xbox.com, zodat die voor de hele winkel geldt en niet alleen voor het huidige tabblad; de rest gaat naar localStorage. Het enige externe verzoek gaat naar de openbare catalogus van Microsoft, om de Engelse naam te weten te komen van het spel dat je bekijkt: alleen de productcode uit de URL wordt verstuurd, zonder cookies of sessie, en het antwoord wordt in localStorage bewaard. Er wordt niets naar derden of naar de auteur gestuurd.'
            ]
        },
        pt: {
            sortLabel: 'Ordenar:', added: 'Adicionado', name: 'Nome', price: 'Preço', discount: 'Desconto',
            onlyDiscount: 'Apenas com desconto', remember: 'Memorizar',
            copy: '🔗 Copiar ligação', copied: '✔ Copiado', copyPrompt: 'Copie esta ligação:',
            about: 'ℹ️ Saber mais', close: 'Fechar',
            regionLabel: 'Redirecionamento:', autoLocale: 'Automático (não redirecionar)',
            applyLabel: '✔ Aplicar', applyTip: 'Guarda a região escolhida e aplica o redirecionamento agora (recarrega esta página nesse idioma e país). A partir daí vale para toda a loja. Com "Automático" não redireciona.',
            sortTip: 'Ordena a sua lista de desejos por data de adição, nome, preço ou percentagem de desconto.',
            dirTip: 'Alterna entre ordem ascendente (↑) e descendente (↓).',
            onlyDiscountTip: 'Oculta os jogos que não estão em promoção; mostra apenas os que têm desconto.',
            rememberTip: 'Guarda a sua ordenação e filtros e volta a aplicá-los quando regressar à lista de desejos.',
            copyTip: 'Copia uma ligação que reproduz a sua ordenação e filtros atuais ao ser aberta.',
            regionTip: 'Escolha o idioma e o país (região) para onde redirecionar as páginas da Xbox: vale para toda a loja — catálogo, pesquisas, fichas de jogo e esta lista de desejos. Com "Automático" não redireciona. Prima "Aplicar" para guardar e redirecionar já.',
            aboutTip: 'Ver tudo o que este script faz.',
            ggTip: 'Procura o título no GG.deals com o filtro de DRM da Microsoft Store. Sendo uma pesquisa por título, pode não encontrar o jogo exato.',
            pcgwTip: 'Procura o título no PCGamingWiki (compatibilidade e correções), sem o sufixo de edição. Sendo uma pesquisa por título pode não encontrar o artigo exato, e os DLC não têm página própria.',
            aboutTitle: 'O que faz este script?',
            aboutBody: [
                'Este script melhora a Xbox Store em duas frentes:',
                '• Redirecionamento de região: leva as páginas da Xbox para o idioma e país (região) que escolher no seletor. Com "Automático" não redireciona.',
                '– Vale para toda a loja: catálogo, pesquisas, fichas de jogo e a sua lista de desejos. Basta escolher uma vez.',
                '– O seletor oferece 21 regiões escolhidas a dedo, apenas combinações que a loja suporta mesmo.',
                '– Em xbox.com a região é o primeiro segmento do caminho (/pt-pt/), pelo que o script reescreve essa parte do URL e deixa o resto — incluindo os parâmetros — tal como está.',
                '– Usa uma substituição em vez de uma navegação nova, por isso não deixa entradas extra no histórico e o botão Retroceder comporta-se normalmente.',
                '– Uma região guardada inválida é apagada em vez de usada, para não entrar em ciclos de redirecionamento.',
                '– "Aplicar" guarda a sua escolha e redireciona de imediato, lista de desejos incluída.',
                '• Ferramentas na sua lista de desejos:',
                '– Ordenar: por data de adição, nome, preço ou desconto, com um botão ↑/↓ para ascendente ou descendente.',
                '– Apenas com desconto: mostra só os jogos em promoção.',
                '– Memorizar: guarda a sua ordenação e filtros e volta a aplicá-los ao regressar.',
                '– Copiar ligação: gera um URL que reproduz a sua ordenação e filtros. Se o navegador bloquear a área de transferência, mostra o URL numa caixa de diálogo para o copiar à mão.',
                '• Nas fichas de produto acrescenta botões para o GG.deals (preços/promoções) e o PCGamingWiki (compatibilidade e correções).',
                '– Só no que é jogável em PC. Um produto apenas de consola não os recebe; o Xbox Play Anywhere sim, porque implica PC.',
                '– Também em DLC, edições e pacotes. Aí as pesquisas acertam menos (o PCGamingWiki documenta o jogo base e não tem páginas de DLC), mas cada botão já avisa na sua dica de que procura por nome. O que não recebe botões são as aplicações e as subscrições, que não são produtos de jogo.',
                '– A plataforma é lida da própria ficha, da lista "Jogar com", que a Xbox não traduz.',
                '– O nome é pedido ao catálogo público da Microsoft e guardado em localStorage para não repetir a consulta. É necessário porque a pesquisa usa o nome em inglês e não o título que vê: a ficha está traduzida, incluindo o URL, e ambos os sites estão indexados em inglês. Se o catálogo não responder, não são colocados botões.',
                '– Ao saltar de uma ficha para outra sem recarregar, o que está no ecrã demora um momento a mudar; enquanto o jogo apresentado não coincidir com o do endereço não é colocado nada, para nunca juntar a plataforma de um jogo com o nome de outro.',
                '– O script carrega em toda a loja para dar conta desses saltos venham de onde vierem (do catálogo, de uma pesquisa), porque a Xbox muda de página sem recarregar e assim os botões aparecem sem que tenha de recarregar. Fora das fichas e da lista de desejos não desenha nada: a única coisa que faz no resto da loja é o redirecionamento de região.',
                '– O GG.deals abre já filtrado pelo DRM da Microsoft Store, tal como os scripts da Steam, GOG e Epic fazem com o seu, e sem a classificação mínima aplicada por omissão que esconde parte das ofertas.',
                '– O "(PC)" que a Microsoft acrescenta ao nome quando o mesmo jogo tem ficha de PC e de consola é removido, porque não faz parte do título e nenhum dos dois destinos o inclui.',
                '– O GG.deals recebe o título completo, com a sua edição (e sem acentos, porque translitera o seu índice); o PCGamingWiki recebe-o sem sufixos de empacotamento (Standard, Deluxe, Premium…), porque documenta o jogo base. Os que são mesmo lançamentos à parte (Definitive, Anniversary, Special, Remastered) ficam tal como estão.',
                'A preferência de país e idioma é guardada num cookie de xbox.com, para valer em toda a loja e não só no separador atual; o resto vai para localStorage. O único pedido externo é ao catálogo público da Microsoft, para saber o nome em inglês do jogo que está a ver: envia-se apenas o código de produto do URL, sem cookies nem sessão, e a resposta é guardada em localStorage. Não se envia nada a terceiros nem ao autor.'
            ]
        },
        pl: {
            sortLabel: 'Sortuj:', added: 'Dodano', name: 'Nazwa', price: 'Cena', discount: 'Zniżka',
            onlyDiscount: 'Tylko przecenione', remember: 'Zapamiętaj',
            copy: '🔗 Kopiuj link', copied: '✔ Skopiowano', copyPrompt: 'Skopiuj ten link:',
            about: 'ℹ️ Dowiedz się więcej', close: 'Zamknij',
            regionLabel: 'Przekierowanie:', autoLocale: 'Auto (bez przekierowania)',
            applyLabel: '✔ Zastosuj', applyTip: 'Zapisuje wybrane ustawienia regionalne i stosuje przekierowanie od razu (przeładowuje tę stronę w tym języku i kraju). Od tej chwili obowiązuje w całym sklepie. Przy „Auto” nie przekierowuje.',
            sortTip: 'Sortuje twoją listę życzeń według daty dodania, nazwy, ceny lub procentu zniżki.',
            dirTip: 'Przełącza między porządkiem rosnącym (↑) a malejącym (↓).',
            onlyDiscountTip: 'Ukrywa gry, które nie są w promocji; pokazuje tylko przecenione.',
            rememberTip: 'Zapisuje twoje sortowanie i filtry i stosuje je po powrocie na listę życzeń.',
            copyTip: 'Kopiuje link, który po otwarciu odtwarza bieżące sortowanie i filtry.',
            regionTip: 'Wybierz język i kraj (ustawienia regionalne), do których mają być przekierowywane strony Xbox: obowiązuje w całym sklepie — katalog, wyszukiwanie, strony gier i ta lista życzeń. Przy „Auto” nie przekierowuje. Kliknij „Zastosuj”, aby zapisać i przekierować od razu.',
            aboutTip: 'Zobacz wszystko, co robi ten skrypt.',
            ggTip: 'Wyszukuje tytuł w GG.deals z filtrem DRM Microsoft Store. Ponieważ to wyszukiwanie po tytule, może nie trafić w dokładną grę.',
            pcgwTip: 'Wyszukuje tytuł w PCGamingWiki (zgodność i poprawki), bez końcówki edycji. Ponieważ to wyszukiwanie po tytule, może nie trafić w dokładny artykuł, a dodatki DLC nie mają własnej strony.',
            aboutTitle: 'Co robi ten skrypt?',
            aboutBody: [
                'Ten skrypt ulepsza Xbox Store na dwa sposoby:',
                '• Przekierowanie regionu: przenosi strony Xbox do języka i kraju (ustawień regionalnych) wybranych w liście. Przy „Auto” nie przekierowuje.',
                '– Obowiązuje w całym sklepie: katalog, wyszukiwanie, strony gier i twoja lista życzeń. Wystarczy wybrać raz.',
                '– Lista oferuje 21 wyselekcjonowanych ustawień regionalnych, wyłącznie kombinacje, które sklep naprawdę obsługuje.',
                '– Na xbox.com ustawienia regionalne to pierwszy segment ścieżki (/pl-pl/), więc skrypt przepisuje tę część adresu, a resztę — łącznie z parametrami — zostawia bez zmian.',
                '– Używa zamiany zamiast nowej nawigacji, więc nie zostawia dodatkowego wpisu w historii, a przycisk Wstecz działa normalnie.',
                '– Nieprawidłowa zapisana wartość jest kasowana zamiast używana, żeby zły wpis nie wywołał pętli przekierowań.',
                '– „Zastosuj” zapisuje twój wybór i przekierowuje natychmiast, wraz z listą życzeń.',
                '• Narzędzia na liście życzeń:',
                '– Sortuj: według daty dodania, nazwy, ceny lub zniżki, z przyciskiem ↑/↓ dla porządku rosnącego lub malejącego.',
                '– Tylko przecenione: pokazuje wyłącznie gry w promocji.',
                '– Zapamiętaj: zapisuje twoje sortowanie i filtry i stosuje je po powrocie.',
                '– Kopiuj link: tworzy adres URL odtwarzający twoje sortowanie i filtry. Jeśli przeglądarka zablokuje schowek, adres pojawi się w oknie dialogowym do ręcznego skopiowania.',
                '• Na stronach produktów dodaje przyciski do GG.deals (ceny/promocje) i PCGamingWiki (zgodność i poprawki).',
                '– Tylko przy tym, w co da się grać na PC. Produkt wyłącznie konsolowy ich nie dostaje; Xbox Play Anywhere tak, bo oznacza także PC.',
                '– Dodatki DLC, edycje i pakiety też je dostają. Tam wyszukiwanie trafia rzadziej (PCGamingWiki opisuje grę podstawową i nie ma stron dla DLC), ale każdy przycisk uprzedza w swojej podpowiedzi, że szuka po nazwie. Przycisków nie dostają aplikacje i subskrypcje, które nie są produktami growymi.',
                '– Platforma jest odczytywana z samej strony, z listy „Zagraj na”, której Xbox nie tłumaczy.',
                '– Nazwa jest pobierana z publicznego katalogu Microsoftu i przechowywana w localStorage, żeby nie powtarzać zapytania. Jest potrzebna, bo szuka się po nazwie angielskiej, a nie po tytule, który widzisz: strona jest przetłumaczona, łącznie z adresem, a oba serwisy są zindeksowane po angielsku. Jeśli katalog nie odpowie, przyciski nie zostaną dodane.',
                '– Przy przeskakiwaniu między stronami bez przeładowania to, co jest na ekranie, zmienia się z opóźnieniem; dopóki pokazywana gra nie zgadza się z tą z adresu, nic nie jest dodawane, żeby nigdy nie połączyć platformy jednej gry z nazwą innej.',
                '– Skrypt ładuje się w całym sklepie, żeby wychwycić te przeskoki, skądkolwiek pochodzą (z katalogu, z wyszukiwania), bo Xbox zmienia strony bez przeładowania i dzięki temu przyciski pojawiają się bez przeładowywania przez ciebie. Poza stronami gier i listą życzeń nic nie rysuje: jedyne, co robi w reszcie sklepu, to przekierowanie regionu.',
                '– GG.deals otwiera się już przefiltrowany po DRM Microsoft Store, tak samo jak skrypty Steam, GOG i Epic robią ze swoim, i bez domyślnego progu ocen sklepów, który ukrywa część ofert.',
                '– Dopisek „(PC)”, który Microsoft dokleja do nazwy, gdy ta sama gra ma stronę pecetową i konsolową, jest usuwany, bo nie należy do tytułu i żaden z serwisów go nie stosuje.',
                '– GG.deals dostaje pełny tytuł wraz z edycją (i bez znaków diakrytycznych, bo transliteruje swój indeks); PCGamingWiki dostaje go bez końcówek wydań (Standard, Deluxe, Premium…), bo opisuje grę podstawową. Te, które naprawdę są osobnymi premierami (Definitive, Anniversary, Special, Remastered), zostają nienaruszone.',
                'Preferencja kraju i języka jest zapisywana w ciasteczku xbox.com, żeby obowiązywała w całym sklepie, a nie tylko w bieżącej karcie; reszta trafia do localStorage. Jedyne zapytanie na zewnątrz idzie do publicznego katalogu Microsoftu, żeby poznać angielską nazwę oglądanej gry: wysyłany jest wyłącznie identyfikator produktu z adresu, bez ciasteczek i bez sesji, a odpowiedź zapisywana jest w localStorage. Nic nie jest wysyłane do osób trzecich ani do autora.'
            ]
        },
        ru: {
            sortLabel: 'Сортировка:', added: 'Добавлено', name: 'Название', price: 'Цена', discount: 'Скидка',
            onlyDiscount: 'Только со скидкой', remember: 'Запоминать',
            copy: '🔗 Скопировать ссылку', copied: '✔ Скопировано', copyPrompt: 'Скопируйте эту ссылку:',
            about: 'ℹ️ Подробнее', close: 'Закрыть',
            regionLabel: 'Перенаправление:', autoLocale: 'Авто (не перенаправлять)',
            applyLabel: '✔ Применить', applyTip: 'Сохраняет выбранную языковую версию и применяет перенаправление сейчас (перезагружает эту страницу на этом языке и для этой страны). Дальше это действует во всём магазине. При «Авто» перенаправления нет.',
            sortTip: 'Сортирует список желаемого по дате добавления, названию, цене или проценту скидки.',
            dirTip: 'Переключает порядок по возрастанию (↑) и по убыванию (↓).',
            onlyDiscountTip: 'Скрывает игры, которых нет в распродаже; показывает только со скидкой.',
            rememberTip: 'Сохраняет сортировку и фильтры и применяет их при возвращении в список желаемого.',
            copyTip: 'Копирует ссылку, которая при открытии воспроизводит текущие сортировку и фильтры.',
            regionTip: 'Выберите язык и страну, на которые перенаправлять страницы Xbox: это действует во всём магазине — каталог, поиск, страницы игр и этот список желаемого. При «Авто» перенаправления нет. Нажмите «Применить», чтобы сохранить и перенаправить сразу.',
            aboutTip: 'Посмотреть всё, что делает этот скрипт.',
            ggTip: 'Ищет название на GG.deals с фильтром DRM Microsoft Store. Это поиск по названию, поэтому нужная игра может не найтись.',
            pcgwTip: 'Ищет название на PCGamingWiki (совместимость и исправления), без суффикса издания. Это поиск по названию, поэтому нужная статья может не найтись, а у дополнений нет своей страницы.',
            aboutTitle: 'Что делает этот скрипт?',
            aboutBody: [
                'Этот скрипт улучшает Xbox Store по двум направлениям:',
                '• Перенаправление региона: переводит страницы Xbox на язык и страну, выбранные в списке. При «Авто» перенаправления нет.',
                '– Действует во всём магазине: каталог, поиск, страницы игр и ваш список желаемого. Достаточно выбрать один раз.',
                '– В списке 21 отобранная языковая версия — только те сочетания, которые магазин действительно поддерживает.',
                '– На xbox.com язык и страна — это первый сегмент пути (/ru-ru/), поэтому скрипт переписывает именно эту часть адреса, а остальное — включая параметры — оставляет как есть.',
                '– Используется замена, а не новый переход, поэтому лишней записи в истории не остаётся и кнопка «Назад» работает как обычно.',
                '– Некорректное сохранённое значение удаляется, а не используется, чтобы неверная запись не вызвала цикл перенаправлений.',
                '– «Применить» сохраняет ваш выбор и перенаправляет сразу же, вместе со списком желаемого.',
                '• Инструменты в списке желаемого:',
                '– Сортировка: по дате добавления, названию, цене или скидке, с кнопкой ↑/↓ для возрастания или убывания.',
                '– Только со скидкой: показывает лишь игры в распродаже.',
                '– Запоминать: сохраняет сортировку и фильтры и применяет их при возвращении.',
                '– Скопировать ссылку: формирует адрес, воспроизводящий вашу сортировку и фильтры. Если браузер блокирует буфер обмена, адрес показывается в диалоге для копирования вручную.',
                '• На страницах товара добавляются кнопки на GG.deals (цены и скидки) и PCGamingWiki (совместимость и исправления).',
                '– Только для того, во что можно играть на ПК. Товар только для консоли их не получает; Xbox Play Anywhere получает, поскольку подразумевает ПК.',
                '– Дополнения, издания и наборы тоже их получают. Там поиск попадает реже (PCGamingWiki описывает базовую игру и не имеет страниц для дополнений), но каждая кнопка уже предупреждает в подсказке, что ищет по названию. Кнопок не получают приложения и подписки: это не игровые товары.',
                '– Платформа читается с самой страницы, из списка «Играть на», который Xbox не переводит.',
                '– Название запрашивается у публичного каталога Microsoft и сохраняется в localStorage, чтобы не повторять запрос. Это нужно потому, что поиск идёт по английскому названию, а не по тому заголовку, который вы видите: страница переведена, включая адрес, а оба сайта проиндексированы на английском. Если каталог не отвечает, кнопки не ставятся.',
                '– При переходе с одной страницы на другую без перезагрузки то, что на экране, меняется не сразу; пока показанная игра не совпадёт с той, что в адресе, ничего не ставится, чтобы платформа одной игры никогда не соединилась с названием другой.',
                '– Скрипт загружается во всём магазине, чтобы замечать эти переходы, откуда бы они ни шли (из каталога, из поиска), потому что Xbox меняет страницы без перезагрузки и так кнопки появляются без перезагрузки с вашей стороны. Вне страниц игр и списка желаемого он ничего не рисует: единственное, что он делает в остальном магазине, — перенаправление региона.',
                '– GG.deals открывается уже отфильтрованным по DRM Microsoft Store, так же как скрипты для Steam, GOG и Epic делают со своим, и без минимального рейтинга магазинов по умолчанию, который скрывает часть предложений.',
                '– «(PC)», который Microsoft добавляет к названию, когда у одной и той же игры есть страница для ПК и для консоли, убирается: это не часть заголовка, и ни один из двух сайтов его не использует.',
                '– GG.deals получает полное название вместе с изданием (и без диакритики, поскольку он транслитерирует свой индекс); PCGamingWiki получает его без суффиксов комплектации (Standard, Deluxe, Premium…), потому что описывает базовую игру. Те, что действительно являются отдельными выпусками (Definitive, Anniversary, Special, Remastered), остаются как есть.',
                'Выбор страны и языка хранится в cookie домена xbox.com, чтобы действовать во всём магазине, а не только в текущей вкладке; остальное хранится в localStorage. Единственный внешний запрос идёт к публичному каталогу Microsoft, чтобы узнать английское название игры, которую вы смотрите: отправляется только код товара из адреса, без cookie и без сессии, а ответ сохраняется в localStorage. Ничего не отправляется ни третьим лицам, ни автору.'
            ]
        },
        tr: {
            sortLabel: 'Sırala:', added: 'Eklenme', name: 'Ad', price: 'Fiyat', discount: 'İndirim',
            onlyDiscount: 'Yalnızca indirimliler', remember: 'Hatırla',
            copy: '🔗 Bağlantıyı kopyala', copied: '✔ Kopyalandı', copyPrompt: 'Bu bağlantıyı kopyalayın:',
            about: 'ℹ️ Daha fazla bilgi', close: 'Kapat',
            regionLabel: 'Yönlendirme:', autoLocale: 'Otomatik (yönlendirme yok)',
            applyLabel: '✔ Uygula', applyTip: 'Seçilen yerel ayarı kaydeder ve yönlendirmeyi şimdi uygular (bu sayfayı o dil ve ülkede yeniden yükler). Bundan sonra mağazanın tamamında geçerli olur. "Otomatik" seçiliyken yönlendirme yapmaz.',
            sortTip: 'İstek listenizi eklenme tarihine, ada, fiyata veya indirim yüzdesine göre sıralar.',
            dirTip: 'Artan (↑) ve azalan (↓) sıralama arasında geçiş yapar.',
            onlyDiscountTip: 'İndirimde olmayan oyunları gizler; yalnızca indirimlileri gösterir.',
            rememberTip: 'Sıralamanızı ve filtrelerinizi kaydeder ve istek listesine döndüğünüzde yeniden uygular.',
            copyTip: 'Açıldığında mevcut sıralamanızı ve filtrelerinizi geri getiren bir bağlantı kopyalar.',
            regionTip: 'Xbox sayfalarının yönlendirileceği dil ve ülkeyi (yerel ayar) seçin: mağazanın tamamında geçerlidir — katalog, aramalar, oyun sayfaları ve bu istek listesi. "Otomatik" seçiliyken yönlendirme yapmaz. Kaydedip hemen yönlendirmek için "Uygula"ya tıklayın.',
            aboutTip: 'Bu betiğin yaptığı her şeyi görün.',
            ggTip: 'Başlığı GG.deals üzerinde Microsoft Store DRM filtresiyle arar. Başlığa göre arama olduğu için tam olarak aradığınız oyunu bulamayabilir.',
            pcgwTip: 'Başlığı PCGamingWiki üzerinde arar (uyumluluk ve düzeltmeler), sürüm ekini kullanmadan. Başlığa göre arama olduğu için tam makaleyi bulamayabilir ve ek paketlerin kendine ait sayfası yoktur.',
            aboutTitle: 'Bu betik ne yapar?',
            aboutBody: [
                'Bu betik Xbox Store’u iki noktada iyileştirir:',
                '• Bölge yönlendirmesi: Xbox sayfalarını seçicide seçtiğiniz dil ve ülkeye (yerel ayar) götürür. "Otomatik" seçiliyken yönlendirme yapmaz.',
                '– Mağazanın tamamında geçerlidir: katalog, aramalar, oyun sayfaları ve istek listeniz. Bir kez seçmeniz yeterli.',
                '– Seçici, mağazanın gerçekten desteklediği kombinasyonlardan oluşan 21 seçilmiş yerel ayar sunar.',
                '– xbox.com’da yerel ayar yolun ilk parçasıdır (/tr-tr/); betik adresin yalnızca o kısmını yeniden yazar, gerisini — sorgu parametreleri dâhil — olduğu gibi bırakır.',
                '– Yeni bir gezinme yerine değiştirme kullanır; böylece geçmişte fazladan kayıt bırakmaz ve Geri düğmesi normal davranır.',
                '– Geçersiz kaydedilmiş bir yerel ayar kullanılmak yerine silinir, böylece hatalı bir değer yönlendirme döngüsüne yol açamaz.',
                '– "Uygula" seçiminizi kaydeder ve istek listesi dâhil hemen yönlendirir.',
                '• İstek listesi araçları:',
                '– Sırala: eklenme tarihine, ada, fiyata veya indirime göre; artan ya da azalan için ↑/↓ düğmesiyle.',
                '– Yalnızca indirimliler: sadece indirimdeki oyunları gösterir.',
                '– Hatırla: sıralamanızı ve filtrelerinizi kaydeder ve döndüğünüzde yeniden uygular.',
                '– Bağlantıyı kopyala: sıralamanızı ve filtrelerinizi geri getiren bir adres oluşturur. Tarayıcı panoyu engellerse adresi elle kopyalayabilmeniz için bir iletişim kutusunda gösterir.',
                '• Ürün sayfalarında GG.deals (fiyatlar/fırsatlar) ve PCGamingWiki (uyumluluk ve düzeltmeler) düğmeleri ekler.',
                '– Yalnızca PC’de oynanabilenlerde. Yalnızca konsola özel bir ürün bunları almaz; Xbox Play Anywhere alır, çünkü PC’yi de kapsar.',
                '– Ek paketler, sürümler ve paketler de alır. Orada aramalar daha az isabet eder (PCGamingWiki ana oyunu belgeler ve ek paketler için sayfası yoktur), ama her düğme ipucunda ada göre aradığını zaten belirtir. Düğme almayanlar, oyun ürünü olmayan uygulamalar ve aboneliklerdir.',
                '– Platform, sayfanın kendisinden, Xbox’ın çevirmediği "Şununla oyna" listesinden okunur.',
                '– Ad, Microsoft’un genel kataloğundan istenir ve isteği tekrarlamamak için localStorage’da tutulur. Buna gerek vardır çünkü arama gördüğünüz başlıkla değil, İngilizce adla yapılır: sayfa çevrilmiştir, adres dâhil, ve iki site de İngilizce dizinlenmiştir. Katalog yanıt vermezse düğmeler eklenmez.',
                '– Sayfalar arasında yeniden yükleme olmadan geçerken ekrandakinin değişmesi bir an alır; gösterilen oyun adrestekiyle örtüşene kadar hiçbir şey eklenmez, böylece bir oyunun platformu asla başka bir oyunun adıyla eşleşmez.',
                '– Betik, bu geçişleri nereden gelirse gelsin (katalogdan, bir aramadan) fark edebilmek için mağazanın tamamında yüklenir; çünkü Xbox sayfayı yeniden yüklemeden değiştirir ve böylece düğmeler siz yenilemeden çıkar. Oyun sayfaları ve istek listesi dışında hiçbir şey çizmez: mağazanın geri kalanında yaptığı tek şey bölge yönlendirmesidir.',
                '– GG.deals, Steam, GOG ve Epic betiklerinin kendi DRM’leriyle yaptığı gibi, Microsoft Store DRM’ine göre süzülmüş olarak açılır ve fırsatların bir kısmını gizleyen varsayılan asgari mağaza puanı olmadan gelir.',
                '– Aynı oyunun hem PC hem konsol sayfası olduğunda Microsoft’un ada eklediği "(PC)" ibaresi kaldırılır; başlığın parçası değildir ve iki hedef site de bunu kullanmaz.',
                '– GG.deals tam başlığı sürümüyle birlikte alır (ve aksansız, çünkü dizinini harf çevirisiyle tutar); PCGamingWiki ise paketleme eklerinden arındırılmış hâlini alır (Standard, Deluxe, Premium…), çünkü ana oyunu belgeler. Gerçekten ayrı birer sürüm olanlar (Definitive, Anniversary, Special, Remastered) olduğu gibi bırakılır.',
                'Ülke/dil tercihi bir xbox.com çerezinde saklanır; böylece yalnızca açık sekmede değil, mağazanın tamamında geçerli olur. Gerisi localStorage’a yazılır. Tek dış istek, baktığınız oyunun İngilizce adını öğrenmek için Microsoft’un genel kataloğuna gider: yalnızca adresteki ürün kodu gönderilir, çerezsiz ve oturumsuz, ve yanıt localStorage’a kaydedilir. Üçüncü taraflara veya yazara hiçbir şey gönderilmez.'
            ]
        },
        ja: {
            sortLabel: '並び替え:', added: '追加日', name: '名前', price: '価格', discount: '割引',
            onlyDiscount: 'セール中のみ', remember: '記憶する',
            copy: '🔗 リンクをコピー', copied: '✔ コピーしました', copyPrompt: 'このリンクをコピーしてください:',
            about: 'ℹ️ 詳細', close: '閉じる',
            regionLabel: 'リダイレクト:', autoLocale: '自動（リダイレクトしない）',
            applyLabel: '✔ 適用', applyTip: '選んだロケールを保存し、リダイレクトをすぐに適用します（このページをその言語・国で再読み込みします）。以降はストア全体で有効です。「自動」ではリダイレクトしません。',
            sortTip: 'ウィッシュリストを追加日・名前・価格・割引率で並べ替えます。',
            dirTip: '昇順（↑）と降順（↓）を切り替えます。',
            onlyDiscountTip: 'セール中でないゲームを隠し、割引中のものだけを表示します。',
            rememberTip: '並び順とフィルターを保存し、ウィッシュリストに戻ったときに再適用します。',
            copyTip: '開くと現在の並び順とフィルターを再現するリンクをコピーします。',
            regionTip: 'Xbox のページをリダイレクトする言語・国（ロケール）を選びます。ストア全体（カタログ、検索、ゲームページ、このウィッシュリスト）で有効です。「自動」ではリダイレクトしません。「適用」を押すと保存してすぐにリダイレクトします。',
            aboutTip: 'このスクリプトの機能をすべて見る。',
            ggTip: 'GG.deals で Microsoft Store の DRM フィルターを使ってタイトルを検索します。タイトル検索のため、目的のゲームに正確に一致しない場合があります。',
            pcgwTip: 'PCGamingWiki でタイトルを検索します（互換性と修正）。エディションの接尾辞は外します。タイトル検索のため目的の記事に一致しないことがあり、DLC には専用ページがありません。',
            aboutTitle: 'このスクリプトは何をしますか？',
            aboutBody: [
                'このスクリプトは Xbox ストアを2つの面で改善します:',
                '• 地域リダイレクト: Xbox のページを、選択した言語・国（ロケール）へ移動させます。「自動」ではリダイレクトしません。',
                '– ストア全体で有効です。カタログ、検索、ゲームページ、ウィッシュリスト。一度選ぶだけで済みます。',
                '– 選択肢はストアが実際に対応している組み合わせだけを厳選した21のロケールです。',
                '– xbox.com ではロケールがパスの最初の区切り（/ja-jp/）なので、スクリプトは URL のその部分だけを書き換え、残りはクエリパラメーターを含めてそのままにします。',
                '– 新規の遷移ではなく置換を使うため、履歴に余分な項目を残さず、戻るボタンも通常どおり動きます。',
                '– 保存された値が無効な場合は使わずに削除します。誤った値がリダイレクトのループを起こさないためです。',
                '– 「適用」は選択を保存し、ウィッシュリストも含めて直ちにリダイレクトします。',
                '• ウィッシュリストのツール:',
                '– 並び替え: 追加日・名前・価格・割引で並べ替え。昇順／降順の ↑/↓ ボタン付き。',
                '– セール中のみ: セール中のゲームだけを表示します。',
                '– 記憶する: 並び順とフィルターを保存し、戻ったときに再適用します。',
                '– リンクをコピー: 並び順とフィルターを再現する URL を作ります。ブラウザーがクリップボードを拒否した場合は、手動でコピーできるようダイアログに URL を表示します。',
                '• 製品ページには GG.deals（価格・セール）と PCGamingWiki（互換性と修正）へのボタンを追加します。',
                '– PC でプレイできるものだけです。コンソール専用の製品には付きません。Xbox Play Anywhere は PC を含むので付きます。',
                '– DLC、エディション、パックにも付きます。そこでは検索の的中率が下がりますが（PCGamingWiki は本編を扱い、DLC のページを持ちません）、各ボタンは名前で検索することをツールチップで明示しています。ボタンが付かないのは、ゲーム製品ではないアプリとサブスクリプションです。',
                '– プラットフォームはページ自体、Xbox が翻訳しない「プレイ対象」の一覧から読み取ります。',
                '– 名前は Microsoft の公開カタログに問い合わせ、同じ問い合わせを繰り返さないよう localStorage に保存します。表示されているタイトルではなく英語名で検索するため必要です。ページは URL を含めて翻訳されており、リンク先の2サイトはどちらも英語で索引されています。カタログが応答しない場合、ボタンは付けません。',
                '– 再読み込みなしでページ間を移動すると、画面の内容が切り替わるまで少し時間がかかります。表示中のゲームがアドレスのゲームと一致するまで何も付けないので、あるゲームのプラットフォームが別のゲームの名前と組み合わさることはありません。',
                '– スクリプトはストア全体で読み込まれます。カタログからでも検索からでも、その移動を検知するためです。Xbox は再読み込みせずにページを切り替えるので、こうすることであなたが再読み込みしなくてもボタンが出ます。ゲームページとウィッシュリスト以外では何も描画せず、ストアの他の場所で行うのは地域リダイレクトだけです。',
                '– GG.deals は Microsoft Store の DRM で絞り込んだ状態で開きます。Steam、GOG、Epic 向けのスクリプトがそれぞれの DRM で行っているのと同じで、セールの一部を隠してしまう既定のストア評価の下限も外してあります。',
                '– 同じゲームに PC 版とコンソール版のページがあるとき Microsoft が名前に付ける「(PC)」は取り除きます。タイトルの一部ではなく、リンク先のどちらのサイトでも使われていないためです。',
                '– GG.deals にはエディションを含む完全なタイトルを渡します（索引が翻字されているためアクセントは外します）。PCGamingWiki には Standard、Deluxe、Premium などの販売形態の接尾辞を外して渡します。本編を扱うサイトだからです。Definitive、Anniversary、Special、Remastered のように実際に別リリースであるものはそのまま残します。',
                '国・言語の設定は xbox.com の Cookie に保存されます。現在のタブだけでなくストア全体で有効にするためです。それ以外は localStorage に保存されます。外部への通信は、表示中のゲームの英語名を知るための Microsoft 公開カタログへの問い合わせだけです。送るのは URL にある製品コードのみで、Cookie もセッションも送らず、応答は localStorage に保存します。第三者にも作者にも何も送信しません。'
            ]
        },
        ko: {
            sortLabel: '정렬:', added: '추가일', name: '이름', price: '가격', discount: '할인',
            onlyDiscount: '할인 중인 항목만', remember: '기억하기',
            copy: '🔗 링크 복사', copied: '✔ 복사됨', copyPrompt: '이 링크를 복사하세요:',
            about: 'ℹ️ 자세히 알아보기', close: '닫기',
            regionLabel: '리디렉션:', autoLocale: '자동(리디렉션 안 함)',
            applyLabel: '✔ 적용', applyTip: '선택한 로캘을 저장하고 지금 리디렉션을 적용합니다(이 페이지를 해당 언어와 국가로 다시 불러옵니다). 그 뒤로는 상점 전체에 적용됩니다. "자동"에서는 리디렉션하지 않습니다.',
            sortTip: '위시리스트를 추가일, 이름, 가격 또는 할인율로 정렬합니다.',
            dirTip: '오름차순(↑)과 내림차순(↓)을 전환합니다.',
            onlyDiscountTip: '할인 중이 아닌 게임을 숨기고 할인 중인 게임만 표시합니다.',
            rememberTip: '정렬과 필터를 저장하고 위시리스트로 돌아올 때 다시 적용합니다.',
            copyTip: '열면 현재 정렬과 필터를 그대로 재현하는 링크를 복사합니다.',
            regionTip: 'Xbox 페이지를 리디렉션할 언어와 국가(로캘)를 고르세요. 카탈로그, 검색, 게임 페이지, 이 위시리스트까지 상점 전체에 적용됩니다. "자동"에서는 리디렉션하지 않습니다. "적용"을 누르면 저장하고 바로 리디렉션합니다.',
            aboutTip: '이 스크립트가 하는 모든 것을 확인하세요.',
            ggTip: 'GG.deals에서 Microsoft Store DRM 필터로 제목을 검색합니다. 제목 검색이므로 정확한 게임을 찾지 못할 수 있습니다.',
            pcgwTip: 'PCGamingWiki에서 제목을 검색합니다(호환성 및 수정). 에디션 접미사는 뺍니다. 제목 검색이라 정확한 문서를 찾지 못할 수 있고, DLC는 자체 문서가 없습니다.',
            aboutTitle: '이 스크립트는 무엇을 하나요?',
            aboutBody: [
                '이 스크립트는 Xbox 스토어를 두 가지 방향에서 개선합니다:',
                '• 지역 리디렉션: Xbox 페이지를 선택기에서 고른 언어와 국가(로캘)로 보냅니다. "자동"에서는 리디렉션하지 않습니다.',
                '– 상점 전체에 적용됩니다. 카탈로그, 검색, 게임 페이지, 위시리스트. 한 번만 고르면 됩니다.',
                '– 선택기에는 상점이 실제로 지원하는 조합만 골라 담은 21개 로캘이 있습니다.',
                '– xbox.com에서는 로캘이 경로의 첫 부분(/ko-kr/)이므로, 스크립트는 주소의 그 부분만 다시 쓰고 나머지는 쿼리 매개변수까지 그대로 둡니다.',
                '– 새 이동 대신 치환을 사용하므로 기록에 항목이 더 남지 않고 뒤로 가기 버튼도 평소처럼 동작합니다.',
                '– 저장된 값이 유효하지 않으면 사용하지 않고 지웁니다. 잘못된 값이 리디렉션 반복을 일으키지 않도록 하기 위해서입니다.',
                '– "적용"은 선택을 저장하고 위시리스트를 포함해 즉시 리디렉션합니다.',
                '• 위시리스트 도구:',
                '– 정렬: 추가일, 이름, 가격 또는 할인 기준으로 정렬하며 오름차순·내림차순 ↑/↓ 버튼이 있습니다.',
                '– 할인 중인 항목만: 할인 중인 게임만 보여줍니다.',
                '– 기억하기: 정렬과 필터를 저장하고 돌아왔을 때 다시 적용합니다.',
                '– 링크 복사: 정렬과 필터를 재현하는 URL을 만듭니다. 브라우저가 클립보드를 막으면 직접 복사할 수 있도록 대화 상자에 URL을 표시합니다.',
                '• 제품 페이지에는 GG.deals(가격·할인)와 PCGamingWiki(호환성 및 수정) 버튼을 추가합니다.',
                '– PC에서 플레이할 수 있는 것만 해당됩니다. 콘솔 전용 제품에는 붙지 않고, Xbox Play Anywhere에는 붙습니다. PC를 포함하기 때문입니다.',
                '– DLC, 에디션, 팩에도 붙습니다. 거기서는 검색이 덜 맞습니다(PCGamingWiki는 본편을 다루고 DLC 문서가 없습니다). 다만 각 버튼은 이름으로 검색한다는 점을 툴팁에 이미 밝히고 있습니다. 버튼이 붙지 않는 것은 게임 제품이 아닌 앱과 구독입니다.',
                '– 플랫폼은 페이지 자체에서, Xbox가 번역하지 않는 "플레이 가능" 목록에서 읽습니다.',
                '– 이름은 Microsoft 공개 카탈로그에 요청하고 같은 요청을 반복하지 않도록 localStorage에 보관합니다. 보이는 제목이 아니라 영어 이름으로 검색하기 때문에 필요합니다. 페이지는 주소까지 번역되어 있고, 두 사이트 모두 영어로 색인되어 있습니다. 카탈로그가 응답하지 않으면 버튼을 넣지 않습니다.',
                '– 새로 고침 없이 페이지 사이를 이동하면 화면의 내용이 바뀌는 데 잠시 걸립니다. 화면의 게임이 주소의 게임과 일치할 때까지 아무것도 넣지 않으므로, 한 게임의 플랫폼이 다른 게임의 이름과 짝지어지는 일은 없습니다.',
                '– 스크립트는 상점 전체에서 로드됩니다. 그 이동이 어디서 오든(카탈로그에서든 검색에서든) 알아차리기 위해서입니다. Xbox는 새로 고침 없이 페이지를 바꾸므로 이렇게 해야 사용자가 새로 고치지 않아도 버튼이 나타납니다. 게임 페이지와 위시리스트 밖에서는 아무것도 그리지 않으며, 상점의 나머지 부분에서 하는 일은 지역 리디렉션뿐입니다.',
                '– GG.deals는 Microsoft Store DRM으로 이미 필터링된 상태로 열립니다. Steam, GOG, Epic용 스크립트가 각자의 DRM으로 하는 것과 같으며, 할인 일부를 가리는 기본 최소 상점 평점도 빼두었습니다.',
                '– 같은 게임에 PC 페이지와 콘솔 페이지가 모두 있을 때 Microsoft가 이름에 붙이는 "(PC)"는 제거합니다. 제목의 일부가 아니고 두 대상 사이트 모두 사용하지 않기 때문입니다.',
                '– GG.deals에는 에디션을 포함한 전체 제목을 보냅니다(색인을 음역하므로 발음 구별 기호는 뺍니다). PCGamingWiki에는 Standard, Deluxe, Premium 같은 패키지 접미사를 빼고 보냅니다. 본편을 다루기 때문입니다. Definitive, Anniversary, Special, Remastered처럼 실제로 별개 출시인 것은 그대로 둡니다.',
                '국가·언어 설정은 xbox.com 쿠키에 저장됩니다. 현재 탭뿐 아니라 상점 전체에 적용되도록 하기 위해서입니다. 나머지는 localStorage에 저장됩니다. 외부로 나가는 유일한 요청은 보고 있는 게임의 영어 이름을 알아내기 위한 Microsoft 공개 카탈로그 요청입니다. 주소에 있는 제품 코드만 보내며 쿠키도 세션도 보내지 않고, 응답은 localStorage에 저장합니다. 제3자에게도 제작자에게도 아무것도 보내지 않습니다.'
            ]
        },
        zh: {
            sortLabel: '排序：', added: '加入时间', name: '名称', price: '价格', discount: '折扣',
            onlyDiscount: '仅显示打折', remember: '记住设置',
            copy: '🔗 复制链接', copied: '✔ 已复制', copyPrompt: '复制此链接：',
            about: 'ℹ️ 了解更多', close: '关闭',
            regionLabel: '重定向：', autoLocale: '自动（不重定向）',
            applyLabel: '✔ 应用', applyTip: '保存所选的区域设置并立即应用重定向（用该语言和国家/地区重新加载本页）。此后在整个商店都有效。选择“自动”则不重定向。',
            sortTip: '按加入时间、名称、价格或折扣百分比对愿望单排序。',
            dirTip: '在升序（↑）与降序（↓）之间切换。',
            onlyDiscountTip: '隐藏未打折的游戏，仅显示有折扣的。',
            rememberTip: '保存你的排序和筛选条件，回到愿望单时重新应用。',
            copyTip: '复制一个链接，打开后即可还原你当前的排序和筛选条件。',
            regionTip: '选择要将 Xbox 页面重定向到的语言和国家/地区（区域设置）：在整个商店都有效——目录、搜索、游戏页面和本愿望单。选择“自动”则不重定向。点击“应用”即可保存并立即重定向。',
            aboutTip: '查看此脚本的全部功能。',
            ggTip: '在 GG.deals 上按 Microsoft Store DRM 筛选搜索该标题。由于是按标题搜索，可能无法精确匹配到该游戏。',
            pcgwTip: '在 PCGamingWiki 上搜索该标题（兼容性与修复），不带版本后缀。由于是按标题搜索，可能无法精确匹配到对应条目，而且 DLC 没有独立页面。',
            aboutTitle: '这个脚本有什么用？',
            aboutBody: [
                '本脚本从两个方面改进 Xbox 商店：',
                '• 区域重定向：把 Xbox 页面带到你在选择器中选定的语言和国家/地区（区域设置）。选择“自动”则不重定向。',
                '– 在整个商店都有效：目录、搜索、游戏页面和你的愿望单。只需选择一次。',
                '– 选择器提供 21 个精选区域设置，都是商店确实支持的组合。',
                '– 在 xbox.com 上，区域设置是路径的第一段（/zh-cn/），所以脚本只重写网址的这一部分，其余内容（包括查询参数）原样保留。',
                '– 采用替换而不是新的跳转，因此不会在历史记录中多留一条，后退按钮行为也正常。',
                '– 保存的区域设置若无效会被清除而不是使用，以免错误的值导致重定向死循环。',
                '– “应用”会保存你的选择并立即重定向，愿望单也一并生效。',
                '• 愿望单工具：',
                '– 排序：按加入时间、名称、价格或折扣排序，并有 ↑/↓ 按钮切换升序或降序。',
                '– 仅显示打折：只显示正在促销的游戏。',
                '– 记住设置：保存你的排序和筛选条件，返回时重新应用。',
                '– 复制链接：生成一个可还原排序和筛选条件的网址。如果浏览器阻止访问剪贴板，会用对话框显示网址供手动复制。',
                '• 在商品页面添加通往 GG.deals（价格与优惠）和 PCGamingWiki（兼容性与修复）的按钮。',
                '– 仅限可在 PC 上游玩的内容。纯主机产品不会获得按钮；Xbox Play Anywhere 会，因为它包含 PC。',
                '– DLC、各版本和合集也会获得按钮。那里的搜索命中率较低（PCGamingWiki 记录的是本体，没有 DLC 页面），但每个按钮的提示中已经说明是按名称搜索。不会获得按钮的是应用和订阅，它们并非游戏商品。',
                '– 平台信息读取自页面本身，来自 Xbox 不会翻译的“可游玩平台”列表。',
                '– 名称向 Microsoft 的公开目录查询，并保存在 localStorage 中以免重复请求。之所以需要，是因为搜索用的是英文名而不是你看到的标题：页面（连同网址）都是翻译过的，而这两个网站都以英文建立索引。如果目录没有响应，就不添加按钮。',
                '– 在不重新加载的情况下在页面之间跳转时，屏幕上的内容需要片刻才会更新；在显示的游戏与网址中的游戏一致之前不会添加任何东西，以免把一款游戏的平台和另一款游戏的名称配在一起。',
                '– 脚本会在整个商店加载，以便无论跳转来自何处（目录或搜索）都能察觉，因为 Xbox 切换页面时不会重新加载，这样按钮无需你手动刷新就会出现。在游戏页面和愿望单之外它什么都不画：在商店其余部分唯一做的就是区域重定向。',
                '– GG.deals 打开时已按 Microsoft Store 的 DRM 筛选，与 Steam、GOG 和 Epic 脚本对各自 DRM 的做法一致，并且去掉了默认的商店评分下限——那个下限会藏起一部分优惠。',
                '– 当同一款游戏同时有 PC 和主机页面时，Microsoft 会在名称后加上“(PC)”，脚本会去掉它，因为它不属于标题，两个目标网站也都不带。',
                '– GG.deals 收到的是含版本在内的完整标题（并去掉变音符号，因为它的索引做了转写）；PCGamingWiki 收到的则去掉了 Standard、Deluxe、Premium 之类的包装后缀，因为它记录的是本体。那些确实属于独立发行的（Definitive、Anniversary、Special、Remastered）则原样保留。',
                '国家/语言的偏好保存在 xbox.com 的 Cookie 中，这样才能在整个商店生效，而不只是当前标签页；其余设置保存在 localStorage。唯一的外部请求是向 Microsoft 的公开目录查询你正在浏览的游戏的英文名：只发送网址中的产品代码，不带 Cookie 也不带会话，响应保存在 localStorage。不会向第三方或作者发送任何数据。'
            ]
        }
    };

    // Familias donde la variante cambia el texto. Lo no previsto se reduce a la
    // base ('fr-CA' -> 'fr', 'es-MX' -> 'es'), que es justo lo que hace falta:
    // LOCALES tiene 21 combinaciones idioma-país sobre 13 idiomas.
    const LANG_ALIASES = {
        'zh-hans': 'zh', 'zh-cn': 'zh', 'zh-sg': 'zh', 'zh-chs': 'zh',
        'zh-hant': 'zh', 'zh-tw': 'zh', 'zh-hk': 'zh', 'zh-cht': 'zh'
    };

    // Reduce un código BCP-47 a una clave de I18N, de más específico a menos.
    // '' si no hay nada, para que la cascada pase al siguiente paso.
    function normalizeLang(raw) {
        const code = (raw || '').trim().toLowerCase().replace(/_/g, '-');
        if (!code) return '';
        const parts = code.split('-');
        for (let n = parts.length; n >= 1; n--) {
            const candidate = parts.slice(0, n).join('-');
            if (LANG_ALIASES[candidate]) return LANG_ALIASES[candidate];
            if (I18N[candidate]) return candidate;
        }
        return '';
    }

    // Lee la cookie de preferencia de locale SIN validarla. La versión validada
    // (readLocalePref) vive más abajo, junto a LOCALES, pero el idioma hay que
    // resolverlo antes que nada, así que aquí se lee en crudo para no depender
    // del orden de definición. Si cambia LOCALE_COOKIE, cambiar también este
    // literal (hay un recordatorio en su declaración).
    function savedLocaleRaw() {
        try {
            const m = document.cookie.match(/(?:^|;\s*)xbwl-locale=([^;]+)/);
            return m ? decodeURIComponent(m[1]) : '';
        } catch (e) { return ''; }
    }

    // Cascada, de la señal más fiel a la menos:
    //   1) el locale guardado en el selector del propio script: elección
    //      explícita y deliberada del usuario, por encima de todo lo demás.
    //   2) el primer segmento de la ruta (/ja-jp/…), que en xbox.com ES el locale
    //      y viaja en el enlace que el usuario comparta.
    //   3) <html lang>. Verificado que sigue al locale: /de-de/ -> "de",
    //      /ja-jp/ -> "ja".
    //   4) navigator.languages.
    //   5) inglés.
    function detectLang() {
        const fromPref = normalizeLang(savedLocaleRaw());
        if (fromPref) return fromPref;
        const seg = (location.pathname.match(/^\/([a-z]{2}-[a-z]{2})(?:\/|$)/i) || [])[1];
        const fromPath = normalizeLang(seg);
        if (fromPath) return fromPath;
        const fromDoc = normalizeLang(document.documentElement.getAttribute('lang'));
        if (fromDoc) return fromDoc;
        for (const l of [navigator.language, ...(navigator.languages || [])]) {
            const n = normalizeLang(l);
            if (n) return n;
        }
        return 'en';
    }

    // Merge sobre `en`: una clave que falte en un idioma cae al inglés en vez de
    // quedar en undefined. Así se pueden añadir idiomas incompletos sin romper nada.
    const LANG = detectLang();
    const t = { ...I18N.en, ...(I18N[LANG] || {}) };

    // Lista curada de LOCALES válidos (combinación idioma-país). Un solo selector:
    // así solo se ofrecen combinaciones que Xbox realmente soporta. El código vacío
    // ('') significa "Auto": no forzar redirección (deja el locale que ya tengas).
    // Solo los códigos. La etiqueta visible ya NO se escribe a mano: antes cada
    // entrada llevaba su nombre en español y en inglés, y con 13 idiomas eso
    // habrían sido 21 × 13 = 273 cadenas escritas y mantenidas a mano, para algo
    // que el navegador ya sabe hacer. Ahora la arma localeLabel() con
    // Intl.DisplayNames, que traduce nombre de idioma y de país al idioma activo.
    // El código vacío ('') significa "Auto": no forzar redirección.
    const LOCALES = [
        '', 'es-MX', 'es-ES', 'es-AR', 'es-CO', 'es-CL',
        'en-US', 'en-GB', 'en-CA', 'en-AU',
        'pt-BR', 'fr-FR', 'fr-CA', 'de-DE', 'it-IT',
        'ja-JP', 'ko-KR', 'zh-CN', 'ru-RU', 'pl-PL', 'nl-NL', 'tr-TR'
    ];

    // "Español – México (es-MX)" en español, "Spanisch – Mexiko (es-MX)" en
    // alemán, "スペイン語 – メキシコ (es-MX)" en japonés… todo desde el propio
    // navegador. Intl.DisplayNames existe en todos los navegadores donde corre
    // Tampermonkey hoy, pero si faltara o fallara para un código concreto, el
    // catch deja el código crudo, que sigue siendo elegible y legible.
    function localeLabel(code) {
        if (!code) return t.autoLocale;
        try {
            const [lg, rg] = code.split('-');
            const langName = new Intl.DisplayNames([LANG], { type: 'language' }).of(lg);
            const regionName = new Intl.DisplayNames([LANG], { type: 'region' }).of(rg);
            // Varios idiomas escriben el nombre de la lengua en minúscula
            // (español, français…); en un desplegable queda mejor capitalizado.
            const pretty = langName.charAt(0).toLocaleUpperCase(LANG) + langName.slice(1);
            return `${pretty} – ${regionName} (${code})`;
        } catch (e) {
            return code;
        }
    }

    // =============================================
    // LOCALE REDIRECT (en toda la tienda)
    // =============================================

    // Patrón del segmento de locale (ej. /en-us/, /pt-br/). Anclado al PRIMER
    // segmento de la ruta, que es donde xbox.com lo pone siempre: al aplicarse la
    // redirección en toda la tienda ya no basta con buscarlo en cualquier sitio de
    // la URL, porque una búsqueda o un parámetro con esa forma (?ref=/en-us/) daría
    // un falso positivo y reescribiría lo que no es.
    const LOCALE_PATH_REGEX = /^\/([a-z]{2}-[a-z]{2})(?=\/|$)/i;
    // Ruta actual con el locale cambiado, conservando query y ancla.
    function urlWithLocale(target) {
        return location.origin + location.pathname.replace(LOCALE_PATH_REGEX, `/${target}`)
            + location.search + location.hash;
    }
    // Preferencia de país/idioma. Cookie con domain=.xbox.com para que se comparta
    // entre las páginas de juego y el wishlist (mismo host, pero la cookie mantiene
    // el código idéntico al de Microsoft, que sí cruza subdominios).
    // OJO: este nombre está duplicado como literal en savedLocaleRaw(), que se
    // define arriba para resolver el idioma antes que nada. Si cambia aquí,
    // cambiarlo también allí.
    const LOCALE_COOKIE = 'xbwl-locale';

    // ¿Es un locale válido de la lista curada? Evita valores viejos/parciales
    // (p. ej. "en-" guardado por versiones anteriores) que provocaban
    // redirecciones inválidas en bucle.
    function isValidLocale(code) {
        return !!code && LOCALES.some((l) => l && l.toLowerCase() === code.toLowerCase());
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
     * en CUALQUIER página de la tienda con segmento de locale —catálogo,
     * búsquedas, lista de deseos, fichas—, no solo donde el script pinta algo:
     * es una preferencia de navegación, y limitarla a dos páginas dejaba el resto
     * de la tienda en el idioma que decidiera Xbox.
     * Comparación insensible a mayúsculas para no redirigir en bucle.
     */
    function redirectIfNeeded() {
        const target = desiredLocale();
        if (!isValidLocale(target)) return;

        const match = location.pathname.match(LOCALE_PATH_REGEX);
        if (!match) return;
        if (match[1].toLowerCase() === target.toLowerCase()) return;

        const newUrl = urlWithLocale(target);
        if (location.href !== newUrl) window.location.replace(newUrl);
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
    const SCRIPT_VERSION = '2.6.0'; // sincronizar con @version
    const SETTINGS_KEY = 'xbwl-settings';
    const SORTS = ['added', 'name', 'price', 'discount'];
    const SORT_LABELS = { added: t.added, name: t.name, price: t.price, discount: t.discount };

    let settings = loadSettings();
    // Contador de navegación de la lista de deseos, gemelo del de las fichas: al
    // cargarse en toda la tienda, entrar y salir del wishlist varias veces deja
    // esperas de hasta 25 s solapadas, y sin token la vieja terminaría pintando
    // sobre la página nueva.
    let wishlistNav = 0;
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
        LOCALES.forEach((code) => {
            const o = document.createElement('option');
            o.value = code;
            o.textContent = localeLabel(code);
            if (code.toLowerCase() === (current || '').toLowerCase()) o.selected = true;
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
            const m = location.pathname.match(LOCALE_PATH_REGEX);
            if (target && m && m[1].toLowerCase() !== target.toLowerCase()) {
                window.location.assign(urlWithLocale(target));
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
        const token = ++wishlistNav;
        const ok = await waitForItems(25000);
        if (!ok || token !== wishlistNav || !isWishlist()) return;

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

    // Tipos de producto que NO reciben botones. Es una lista de exclusión y no de
    // inclusión a propósito: lo que no se reconozca pasa. Ver el uso, más abajo.
    const NON_GAME_KINDS = /^(?:application|pass)$/i;

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

    // opts: { iconUrl } (favicon remoto) o { iconSvg } (SVG inline), más { tooltip }:
    // los dos botones buscan por nombre y pueden no acertar —y desde que también
    // salen en DLC y paquetes, más—, así que la etiqueta sola no basta: carga el
    // destino, y el tooltip carga la incertidumbre.
    function makeLinkButton(cls, label, href, opts) {
        const a = document.createElement('a');
        a.className = `xbx-btn ${cls}`;
        a.href = href;
        a.target = '_blank';
        a.rel = 'nofollow noopener external';
        if (opts && opts.tooltip) a.title = opts.tooltip;
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
            `${GGDEALS_SEARCH_URL}?${ggParams}`, { iconUrl: GGDEALS_ICON_URL, tooltip: t.ggTip }));
        box.appendChild(makeLinkButton('xbx-pcgw', 'PCGamingWiki',
            PCGW_SEARCH_URL + encodeURIComponent(baseTitle), { iconSvg: PCGW_ICON_SVG, tooltip: t.pcgwTip }));
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

    // Al salir de una ficha (a la lista de deseos, a /games/browse, al home) se
    // olvida el producto validado y se retiran los botones. Hace falta porque el
    // observer sigue vivo el resto de la sesión: sin esto repondría los botones de
    // un juego en una página que ya no es la suya, y una pasada en vuelo
    // (esperando plataforma o catálogo) los pintaría al terminar.
    function forgetProductLinks() {
        productNav++;
        linksState = null;
        document.getElementById(LINKS_ID)?.remove();
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
        // Kinds del catálogo: Game, Durable (DLC y add-ons), Consumable (moneda y
        // packs), Application (app) y PASS (suscripción).
        //
        // Antes solo pasaba 'Game', para no mandar un DLC a PCGamingWiki, que
        // documenta el juego base y no tiene páginas de DLC. Se descartó ese
        // criterio: el resto de scripts de la familia (Steam, GOG, Epic,
        // IndieGala) ponen sus botones también en DLC y paquetes, y ahí la regla
        // es que más vale un enlace que puede no acertar —los dos tooltips ya lo
        // avisan— que no tener ninguno. Xbox era el único que se salía.
        //
        // Se siguen excluyendo app y suscripción: no son producto de juego, así
        // que un botón de precios/compatibilidad ahí no es que falle la búsqueda,
        // es que no viene a cuento. Un kind desconocido pasa, a propósito: ante la
        // duda, mejor ponerlo.
        if (NON_GAME_KINDS.test(info.kind)) return;

        const anchor = await waitForValue(findLinkAnchor, 10000, token);
        if (token !== productNav || !anchor) return;

        linksState = { id, title: info.title };
        ensureProductLinks();
        startLinksObserver();
    }

    // =============================================
    // INICIALIZACIÓN (por ruta)
    // =============================================
    // xbox.com es una SPA: route() se vuelve a llamar en cada navegación interna.
    // Dos alcances distintos a propósito:
    // – La redirección de locale se evalúa en TODA la tienda. Si ya estamos en el
    //   locale correcto (o la ruta no lleva locale) no hace nada.
    // – La interfaz —herramientas de la lista de deseos, botones de la ficha— solo
    //   se monta en esas dos páginas; en el resto lo único que se hace es soltar
    //   el estado de la ficha anterior.
    function route() {
        try {
            redirectIfNeeded();

            const product = isProductPage();
            if (!product) forgetProductLinks();
            if (product) initProductLinks();
            else if (isWishlist()) initWishlist();
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
