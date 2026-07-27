# Xbox Store Locale Redirect

Userscript de Tampermonkey que redirige Xbox Store a tu país/idioma y añade herramientas a la lista de deseos. / Tampermonkey userscript that redirects the Xbox Store to your country/language and adds wishlist tools.

## Español

**Qué hace:**
- **Redirección de región:** al abrir una página de juego de **Xbox Store** la lleva al **país e idioma que elijas** (o al de tu navegador si dejas "Auto"), para ver precios y textos en tu región.
- En tu **lista de deseos** (`/wishlist`):
  - **Ordenar** por agregado, nombre, precio o descuento.
  - **Solo con descuento** y **Recordar** tu configuración.
  - **Copiar enlace**, **selector de país/idioma** de redirección, tooltips y botón **"Saber más"**.

**Idioma:** detección automática español / inglés.

**Instalación:**
1. Instala [Tampermonkey](https://www.tampermonkey.net/).
2. Abre el instalador: [xbox-store-locale-redirect.user.js](https://github.com/g31w0fw0rld/xbox-store-locale-redirect/raw/main/xbox-store-locale-redirect.user.js) (también en [GreasyFork](https://greasyfork.org/es-419/users/1590477-g31w) y [OpenUserJS](https://openuserjs.org/users/g31w0fw0rldgmail.com/scripts)).

**Sitios:** `xbox.com/…/games/store/*`, `xbox.com/…/wishlist`

## English

**What it does:**
- **Region redirect:** when you open an **Xbox Store** game page it takes you to the **country and language you choose** (or your browser locale if left on "Auto"), so you see prices and text for your region.
- On your **wishlist** (`/wishlist`):
  - **Sort** by date added, name, price or discount.
  - **Only discounted** and **Remember** your setup.
  - **Copy link**, a **country/language selector** for the redirect, tooltips and a **"Learn more"** button.

**Language:** automatic Spanish / English detection.

**Install:**
1. Install [Tampermonkey](https://www.tampermonkey.net/).
2. Open the installer: [xbox-store-locale-redirect.user.js](https://github.com/g31w0fw0rld/xbox-store-locale-redirect/raw/main/xbox-store-locale-redirect.user.js) (also on [GreasyFork](https://greasyfork.org/es-419/users/1590477-g31w) and [OpenUserJS](https://openuserjs.org/users/g31w0fw0rldgmail.com/scripts)).

**Sites:** `xbox.com/…/games/store/*`, `xbox.com/…/wishlist`

## Privacidad / Privacy

**ES:** el script no hace ninguna petición a servidores externos y declara `@grant none`, así que no tiene acceso a las APIs privilegiadas del gestor de userscripts. Tu preferencia de país/idioma se guarda en una cookie propia (`xbwl-locale`, dominio `.xbox.com`, un año) para que la compartan las páginas de juego y la lista de deseos: la cookie contiene solo el locale que elijas, aunque —como cualquier cookie de ese dominio— viaja en las peticiones que tu navegador ya hace a `xbox.com`. El orden y los filtros de la lista de deseos se guardan en `localStorage`, y la redirección solo cambia la URL dentro de la propia Xbox Store. No se envía nada a terceros ni al autor.

**EN:** the script makes no requests to external servers and declares `@grant none`, so it has no access to the userscript manager's privileged APIs. Your country/language preference is stored in its own cookie (`xbwl-locale`, domain `.xbox.com`, one year) so that the game pages and the wishlist share it: the cookie holds only the locale you pick, though —like any cookie on that domain— it travels with the requests your browser already makes to `xbox.com`. The wishlist sort order and filters are stored in `localStorage`, and the redirect only changes the URL within the Xbox Store itself. Nothing is sent to third parties or to the author.

## Apoyar / Support

Esto es parte de algo que estoy construyendo para crecer. Si te sirve y quieres apoyar, puedes invitarme un café en **[Ko-fi](https://ko-fi.com/g31w0fw0rld)** —solo si quieres—; y si hay una causa que lo necesite más que yo, ayúdala a ella.

This is part of something I'm building to grow. If it helps you and you'd like to support it, you can tip me on **[Ko-fi](https://ko-fi.com/g31w0fw0rld)** —only if you want—; and if a cause needs it more than I do, help that one instead.

---
Autor / Author: **g31w0fw0rld** · Licencia / License: **MIT**
