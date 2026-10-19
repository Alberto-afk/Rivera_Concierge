# Rivera Concierge

Sitio estático de tapicería de muebles en Lima. HTML, CSS y JavaScript sin dependencias de ejecución ni compilación.

## Desarrollo local

Desde la raíz del repositorio:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Abra el sitio servido por ese puerto en su navegador. Para desplegarlo, publique `index.html`, `styles.css`, `app.js` y `assets/` en cualquier alojamiento estático. Subir un commit no configura por sí solo un despliegue.

## Diseño y movimiento

- Fuente Jost alojada en `assets/fonts/`; sin peticiones a Google Fonts.
- Fotografías conservadas del repositorio, con tamaños reales en `srcset` y carga diferida bajo la portada.
- Sin pantalla de entrada ni dependencia de JavaScript para leer el contenido o contactar. Los doce trabajos están disponibles si JavaScript está desactivado.
- Con JavaScript se muestran seis trabajos inicialmente, filtros por categoría y un control para ampliar la selección.
- La sección de profundidad usa transformaciones CSS de las fotografías, no modelos tridimensionales ni WebGL. La animación trabaja sólo mientras cambia la vista, y se detiene al estabilizarse, salir de la sección u ocultarse la pestaña.
- El movimiento automático requiere al menos cuatro procesadores lógicos, al menos 4 GB de memoria si el navegador expone ese dato y un puntero fino con hover. Son señales orientativas; si se detectan fotogramas lentos, vuelve a vista estática. En pantallas táctiles la vista inicial es estática y se puede activar manualmente.
- Se respeta la reducción de movimiento y el ahorro de datos; en esos casos el control queda desactivado. La preferencia manual se conserva durante la sesión.

Se retiró el comparador anterior porque superponía fotografías de muebles distintos. La sección de materiales muestra una fotografía del relleno en el taller sin atribuirle una transformación que las imágenes no demuestran.

## Comprobaciones

Las pruebas de navegador requieren Node.js, Python 3, Playwright y Chromium. En el entorno de nube estas herramientas ya están disponibles:

```sh
node tests/smoke.cjs
```

En otra máquina, instale Playwright como herramienta de desarrollo fuera del checkout (por ejemplo, `npm install --prefix /tmp/rivera-browser-tests --no-package-lock playwright`) e instale su Chromium con `/tmp/rivera-browser-tests/node_modules/.bin/playwright install chromium`. Ejecute la prueba con `NODE_PATH=/tmp/rivera-browser-tests/node_modules node tests/smoke.cjs`. También puede indicar un Chromium ya instalado mediante `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.

La prueba inicia y detiene su propio servidor. Verifica recursos locales, filtros, expansión, pausa de la animación, alternancia de modos, preferencias de movimiento, vista estática por hardware y capacidades, teclado, enlaces, tamaños de pantalla y acceso sin JavaScript. Los escenarios de hardware y visibilidad se simulan en Chromium; no sustituyen una medición física de batería o fluidez en teléfonos antiguos.
