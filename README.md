# Xbox Store Locale Redirect

Tampermonkey userscript that redirects the Xbox Store to your country/language and adds wishlist tools. / Userscript de Tampermonkey que redirige Xbox Store a tu país/idioma y añade herramientas a la lista de deseos.

![The toolbar the script adds above the Xbox wishlist](docs/screenshot-wishlist.png)

*Wishlist: sort, direction, "only discounted", "remember", copy link, the redirect locale selector with its Apply button, and "Learn more". / Lista de deseos: orden, dirección, "solo con descuento", "recordar", copiar enlace, el selector de locale de redirección con su botón Aplicar, y "Saber más".*

## English

### What it does

**Region redirect**
- Sends Xbox Store pages — game pages and your wishlist alike — to the **language and country you choose**, so you see prices and text for that region instead of the one Xbox picks for you.
- The selector offers **21 curated locales** (language + country together), so you can only choose combinations the store actually supports. `Auto` means "do not redirect" and leaves the store's own behaviour alone.
- On xbox.com the locale is a **path segment**, so the script rewrites that part of the URL — `/en-us/` becomes whatever you picked.
- The redirect uses a **replace, not a new navigation**, so it leaves no extra history entry and the Back button behaves normally instead of bouncing you forward again.
- A stale or malformed saved locale is **detected and cleared** rather than used, which is what stops a bad value from redirecting in a loop.
- The choice is kept in a **cookie on `.xbox.com`**, so it holds across the whole store rather than just the tab you set it in.
- **Apply** saves your choice and redirects right away, wishlist included.

**Wishlist**
- **Sort** by date added, name, price or discount percentage, with an **↑ / ↓ toggle** for ascending or descending.
- **Only discounted:** hides everything that is not on sale.
- **Remember:** saves your sort and filters and reapplies them when you come back.
- **Copy link:** builds a URL that reproduces your sort and filters when opened. If the browser blocks clipboard access, it shows the URL in a dialog so you can copy it by hand.
- **"Learn more"** button with the full explanation inside the page, and a tooltip on every control.

**Language:** automatic Spanish / English detection, following the language Xbox serves the page in. Note this is separate from the redirect locale: one is the script's own wording, the other is the store's region.

**Install:**
1. Install [Tampermonkey](https://www.tampermonkey.net/).
2. Open the installer: [xbox-store-locale-redirect.user.js](https://github.com/g31w0fw0rld/xbox-store-locale-redirect/raw/main/xbox-store-locale-redirect.user.js) (also on [GreasyFork](https://greasyfork.org/es-419/users/1590477-g31w) and [OpenUserJS](https://openuserjs.org/users/g31w0fw0rldgmail.com/scripts)).

**Sites:** `xbox.com/…/games/store/*`, `xbox.com/…/wishlist`

## Español

### Qué hace

**Redirección de región**
- Lleva las páginas de Xbox Store —tanto las fichas de juego como tu lista de deseos— al **idioma y país que elijas**, para ver precios y textos de esa región en vez de la que Xbox decide por ti.
- El selector ofrece **21 locales curados** (idioma y país juntos), así que solo puedes elegir combinaciones que la tienda realmente soporta. `Auto` significa "no redirigir" y deja el comportamiento propio de la tienda.
- En xbox.com el locale es un **segmento de la ruta**, así que el script reescribe esa parte de la URL: el `/es-mx/` pasa a ser el que hayas elegido.
- La redirección usa un **reemplazo, no una navegación nueva**, así que no deja una entrada extra en el historial y el botón Atrás se comporta con normalidad en vez de devolverte hacia delante.
- Un locale guardado obsoleto o mal formado se **detecta y se borra** en vez de usarse, que es lo que evita que un valor malo redirija en bucle.
- La elección se guarda en una **cookie de `.xbox.com`**, así que vale para toda la tienda y no solo para la pestaña donde la pusiste.
- **Aplicar** guarda tu elección y redirige al momento, lista de deseos incluida.

**Lista de deseos**
- **Ordenar** por fecha de agregado, nombre, precio o porcentaje de descuento, con un **botón ↑ / ↓** para ascendente o descendente.
- **Solo con descuento:** oculta todo lo que no está en oferta.
- **Recordar:** guarda tu orden y tus filtros y los reaplica al volver.
- **Copiar enlace:** genera una URL que al abrirla reproduce tu orden y tus filtros. Si el navegador bloquea el portapapeles, muestra la URL en un diálogo para copiarla a mano.
- Botón **"Saber más"** con la explicación completa dentro de la página, y un tooltip en cada control.

**Idioma:** detección automática español / inglés, siguiendo el idioma con el que Xbox sirve la página. Ojo, es independiente del locale de redirección: uno es cómo habla el script, el otro es la región de la tienda.

**Instalación:**
1. Instala [Tampermonkey](https://www.tampermonkey.net/).
2. Abre el instalador: [xbox-store-locale-redirect.user.js](https://github.com/g31w0fw0rld/xbox-store-locale-redirect/raw/main/xbox-store-locale-redirect.user.js) (también en [GreasyFork](https://greasyfork.org/es-419/users/1590477-g31w) y [OpenUserJS](https://openuserjs.org/users/g31w0fw0rldgmail.com/scripts)).

**Sitios:** `xbox.com/…/games/store/*`, `xbox.com/…/wishlist`

## Privacy / Privacidad

**EN:** the script makes no requests to external servers and declares `@grant none`, so it has no access to the userscript manager's privileged APIs. Your country/language preference is stored in its own cookie (`xbwl-locale`, domain `.xbox.com`, one year) so it applies across the whole store: the cookie holds only the locale you pick, though —like any cookie on that domain— it travels with the requests your browser already makes to `xbox.com`. The wishlist sort order and filters are stored in `localStorage`, and the redirect only changes the URL within the Xbox Store itself. Nothing is sent to third parties or to the author.

**ES:** el script no hace ninguna petición a servidores externos y declara `@grant none`, así que no tiene acceso a las APIs privilegiadas del gestor de userscripts. Tu preferencia de país/idioma se guarda en una cookie propia (`xbwl-locale`, dominio `.xbox.com`, un año) para que valga en toda la tienda: la cookie contiene solo el locale que elijas, aunque —como cualquier cookie de ese dominio— viaja en las peticiones que tu navegador ya hace a `xbox.com`. El orden y los filtros de la lista de deseos se guardan en `localStorage`, y la redirección solo cambia la URL dentro de la propia Xbox Store. No se envía nada a terceros ni al autor.

## Support / Apoyar

This is part of something I'm building to grow. If it helps you and you'd like to support it, you can tip me on **[Ko-fi](https://ko-fi.com/g31w0fw0rld)** —only if you want—; and if a cause needs it more than I do, help that one instead.

Esto es parte de algo que estoy construyendo para crecer. Si te sirve y quieres apoyar, puedes invitarme un café en **[Ko-fi](https://ko-fi.com/g31w0fw0rld)** —solo si quieres—; y si hay una causa que lo necesite más que yo, ayúdala a ella.

---
Author / Autor: **g31w0fw0rld** · License / Licencia: **MIT**
