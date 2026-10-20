# Rivera Concierge

Sitio de tapicería de muebles en Lima: HTML, CSS, JavaScript y una sección de sofá 3D. Sin instalación de paquetes ni compilación para servirlo.

## Desarrollo local

Desde la raíz del repositorio:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Publique `index.html`, `styles.css`, `app.js`, `furniture3d.js` y todo `assets/` en un alojamiento estático. Los módulos ES requieren servir JavaScript con el tipo MIME correcto; el servidor de Python ya lo hace. Subir un commit no configura por sí solo un despliegue.

## Recorrido del sofá

La sección «El oficio toma forma» aplica las referencias de los videos aportados por el usuario: un protagonista 3D sobre un escenario amplio, cámara guiada por scroll y texto breve en tres momentos. El análisis visual está en [REFERENCIAS.md](REFERENCIAS.md).

El sofá es una representación de diseño original construida con geometría. No es un escaneo de un proyecto del taller ni una fotografía de producto. Tiene cojines, ribetes, patas de madera y tres tonos orientativos de tapizado: lino claro, terracota y verde oliva. Las fotografías de trabajos existentes permanecen en el catálogo y el taller.

- `furniture3d.js` crea el modelo, luces y cámara. No inicia bucles de animación.
- `app.js` carga el módulo y Three.js sólo al acercarse a la sección cuando procede activar el 3D. El desplazamiento cambia suavemente la cámara; el navegador conserva su scroll normal. El enlace «Ir a los trabajos» permite saltar el recorrido.
- El render se detiene al estabilizarse, salir de la sección o esconder la pestaña. El modo estático libera el contexto y los recursos gráficos. El DPR está limitado a 1.5 y las sombras a 512px.
- El modo automático exige al menos cuatro procesadores lógicos, al menos 4 GB de memoria si el navegador publica ese dato y un puntero fino con hover. Son señales orientativas. Un descenso sostenido de fluidez reduce primero la resolución y las sombras; si persiste, vuelve a la vista estática.
- Pantallas táctiles y equipos modestos empiezan con una imagen y pueden solicitar el 3D manualmente. Reducción de movimiento, ahorro de datos, APIs ausentes y fallos de WebGL mantienen la vista estática.
- Los tres posters WebP de `assets/sofa3d/` son renders del mismo modelo. Permiten cambiar los tonos sin descargar el motor ni crear un contexto WebGL. La vista estática no reserva la altura del recorrido animado.
- Three.js se sirve localmente, con su licencia MIT en `assets/vendor/THREE-LICENSE.txt`. No se usan CDN ni fuentes externas en ejecución. Jost y las fotografías también están alojadas en el proyecto.

Sin JavaScript se muestra el poster inicial, todos los trabajos y los enlaces de contacto. Los controles que requieren JavaScript quedan ocultos.

## Comprobaciones

Requieren Node.js, Python 3, Playwright y Chromium. En el entorno de nube están disponibles:

```sh
node tests/smoke.cjs
```

En otra máquina puede instalar Playwright fuera del checkout:

```sh
npm install --prefix /tmp/rivera-browser-tests --no-package-lock playwright
/tmp/rivera-browser-tests/node_modules/.bin/playwright install chromium
NODE_PATH=/tmp/rivera-browser-tests/node_modules node tests/smoke.cjs
```

También puede indicar un Chromium instalado mediante `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.

Las pruebas arrancan y detienen su propio servidor. Cubren recursos, catálogo, teclado, tamaños de pantalla, contenido sin JavaScript, carga diferida del motor, píxeles del render real, materiales, recorrido, pausa y fallos con vista estática. Chromium usa SwiftShader únicamente en las pruebas para disponer de WebGL en máquinas sin GPU. Las señales de hardware y visibilidad se simulan. En la integración funcional se controla el reloj de los callbacks para separar el recorrido de la lentitud del render por software; otra prueba fuerza un reloj lento para verificar la reducción de calidad y el paso a la vista estática. Estas pruebas no sustituyen medir batería y fluidez en teléfonos físicos.
