# Rivera Concierge

Sitio de tapicería de muebles en Lima: HTML, CSS, JavaScript y una sección de sofá 3D. Sin instalación de paquetes ni compilación para servirlo.

## Continuar con otra IA

- [Guía detallada de la versión y de los dos videos](docs/GUIA_PARA_IA.md).
- [Prompt listo para copiar](docs/PROMPT_INTERFAZ.md).
- [Skill portable con lectura selectiva y validación proporcional](.agents/skills/rivera-interfaz-inmersiva/SKILL.md).

La skill se incluye en el repositorio; su detección automática depende de la herramienta. Si no la reconoce, pide a la IA que lea el archivo `SKILL.md`. El detalle se consulta según la tarea para evitar cargar toda la documentación en cada interacción.

## Desarrollo local

Desde la raíz del repositorio:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Publique `index.html`, `trabajos.html`, `styles.css`, `app.js`, `hero-collage.js`, `atmosphere.js`, `furniture3d.js` y todo `assets/` en un alojamiento estático. Los módulos ES requieren servir JavaScript con el tipo MIME correcto; el servidor de Python ya lo hace. Subir un commit no configura por sí solo un despliegue.

## Página de trabajos

`trabajos.html` contiene los 12 proyectos y sus filtros. La portada conserva únicamente «Selección del taller / Nuestro trabajo» y el enlace a la galería; a continuación empieza el taller, con su fotografía original. La navegación «Trabajos» y el acceso del sofá abren la nueva página. La galería reutiliza `app.js` sin cargar los scripts del collage ni de la atmósfera; sin JavaScript muestra todos los proyectos.

Se verificaron navegación de ida y regreso, filtro de terrazas, expansión a 12 trabajos y diseño móvil/escritorio. Se ajustaron las rutas del smoke test existente; no se ejecutó la suite WebGL completa para esta reorganización.

## Collage de inicio

Seis fotografías locales del taller forman una diagonal y convergen en una sola pila al bajar. El recorrido se revierte al subir; el puntero añade una pequeña profundidad. `hero-collage.js` no carga bibliotecas, no usa WebGL y solicita cuadros sólo ante cambios. Pausa fuera de pantalla y al ocultar la pestaña. Móvil, pantallas bajas, movimiento reducido, ahorro de datos y señales de hardware modesto conservan una cuadrícula sin recorrido largo. Sin JavaScript también se ven las seis fotos y los enlaces.

Prueba de lógica sin dependencias: `node tests/hero-collage.cjs`. Verifica convergencia, reversa, agrupación de eventos, reposo, visibilidad y fallbacks. Revisión visual en navegador a 1440 × 900 y 390 × 844. No representa una medición de FPS ni batería en teléfonos físicos. La suite histórica del sofá 3D no se ejecutó para este cambio aislado.

Referencias observadas: [Vyashin](https://vyashin.com/) para la diagonal de tarjetas y su concentración; [Montfort Group](https://mont-fort.com/) para montaña, niebla y alejamiento. [Fort Energy](https://mont-fort.com/fort-energy/) muestra una escena diferente de haces luminosos. No se copiaron sus recursos.

## Tema oscuro y recorrido atmosférico

La segunda etapa aplica fondo negro y tipografía beige claro a todas las secciones, incluido el sofá. Se retiró del inicio el bloque «Hechos a mano para seguir viviendo / Conozca nuestro trabajo» solicitado por el usuario.

Dentro de «Explorar la experiencia visual», después del proceso del taller y antes del sofá, `atmosphere.js` coordina una montaña que se aleja, dos capas de nubes que responden al puntero y una transición a un planeta. El scroll es nativo y reversible, con enlace para saltar el recorrido. Las imágenes son ilustraciones decorativas generadas para este proyecto, no fotografías del negocio ni recursos de Montfort.

Los cinco WebP de `assets/atmosphere/` suman 350.828 bytes (343 KiB), incluidas las versiones pequeñas. Las nubes se cargan a 300 px de la sección; el planeta de 800 px se solicita a partir del 28% del recorrido. Sólo se animan transformaciones y opacidad, sin WebGL adicional, vídeos, filtros animados ni bucles en reposo. Fuera de pantalla o con la pestaña oculta no se solicitan cuadros. Móvil, hardware modesto, ahorro de datos y movimiento reducido conservan una composición estática corta; sin JavaScript también es visible.

Validación: `node tests/hero-collage.cjs` y `node tests/atmosphere.cjs` comprueban lógica, convergencia, reversa, puntero, carga diferida, pausas y fallbacks. Se revisaron visualmente inicio, montaña, transición, planeta, regreso, salto al sofá y móvil a 390 × 844; escritorio a 1440 × 900. No se observaron errores de consola. Estas comprobaciones no miden FPS ni batería en dispositivos físicos; no se ejecutó la suite histórica completa del sofá.

## Recorrido del sofá

La sección «El oficio toma forma» aplica las referencias de los videos aportados por el usuario: un escenario negro con matices cálidos y salvia, tipografía beige cinética y cámara guiada por scroll en tres actos: vista completa, detalle del tapizado y regreso a una vista amplia desde el lado opuesto. El análisis visual original está en [REFERENCIAS.md](REFERENCIAS.md).

El sofá es una representación de diseño original construida con geometría. No es un escaneo de un proyecto del taller ni una fotografía de producto. Tiene cojines, ribetes, patas de madera y tres tonos orientativos de tapizado: lino claro, terracota y verde oliva. Las fotografías de trabajos existentes permanecen en el catálogo y el taller.

- `furniture3d.js` crea el modelo, luces y cámara. No inicia bucles de animación. El sofá permanece fijo y la cámara recorre keyframes suaves, por lo que las sombras del mueble se pueden reutilizar durante el scroll.
- Un solo progreso de scroll sincroniza cámara, entrada y salida enmascarada de títulos, subtítulos con desfase, texto de los capítulos y capas del degradado. El movimiento se puede recorrer hacia delante y hacia atrás; no depende de temporizadores ni de animaciones de fondo infinitas.
- Los encabezados y textos de lectura fuera de la escena entran suavemente al acercarse al viewport. Es una mejora progresiva para equipos adecuados; el contenido queda visible sin JavaScript, con reducción de movimiento o en modo ligero. Los enlaces y controles nunca esperan a una animación.
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

También puede indicar un Chromium instalado mediante `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. Para retomar un diagnóstico puede usar `RIVERA_CHECK_FROM=4` para empezar en la cuarta comprobación; el resultado identifica las comprobaciones omitidas y no equivale a una corrida completa. `RIVERA_ARTIFACT_DIR=/tmp/rivera-motion` guarda capturas de las tres fases y la vista móvil.

Las pruebas arrancan y detienen su propio servidor. Cubren recursos, catálogo, teclado, tamaños de pantalla, contenido sin JavaScript, carga diferida del motor, píxeles del render real, materiales, recorrido, pausa y fallos con vista estática. Chromium usa SwiftShader únicamente en las pruebas para disponer de WebGL en máquinas sin GPU, con DPR 0.35 para reducir el coste del render por software; las anchuras CSS se mantienen en los tamaños indicados. Las señales de hardware y visibilidad se simulan. En la integración funcional se controla el reloj de los callbacks para separar el recorrido de la lentitud del render por software; otra prueba fuerza un reloj lento para verificar la reducción de calidad y el paso a la vista estática. Estas pruebas no sustituyen medir batería y fluidez en teléfonos físicos.

## Inicio orientado a trabajos

La portada presenta «Tapicería de muebles en Lima», un botón inmediato a la galería y un acceso a cotizar por WhatsApp. Las seis fotos son enlaces; los proyectos con destino específico se muestran al abrir su enlace directo. El taller sigue al resumen de trabajos. Montaña, planeta y sofá se conservan en un desplegable opcional cerrado inicialmente, después del proceso.

Se comprobaron el botón, un enlace de foto, la apertura y cierre de la experiencia y el diseño móvil. Pasaron las pruebas de lógica de collage y atmósfera. La suite histórica WebGL se adaptó para abrir el desplegable antes de probar la escena, pero no se ejecutó completa.

## Marca y materiales (noviembre 2026)
Logo y favicon derivados de la imagen entregada por el propietario. Navegación con Inicio, sin el botón El taller; la sección permanece. Se retiraron el pie de foto y el enlace secundario solicitados. Entrada breve de marca y fotografías inspirada en el video local de Vyashin, omitida con movimiento reducido.

Los cojines auxiliares se elevaron sobre los asientos. El selector distingue lino, cuero chocolate (imagen de grano aportada por el usuario) y tejido oliva mediante mapas, relieve y rugosidad. Se actualizaron los tres posters desde el modelo. Sigue siendo una representación 3D, no una fotografía del taller. Se conservan los límites de GPU y el render bajo demanda. Pruebas de lógica de collage y atmósfera aprobadas; revisión visual del modelo y navegación. No se ejecutó la suite WebGL histórica completa ni se midió rendimiento en teléfonos físicos.

Se retiró el cojín auxiliar izquierdo y se añadieron dos botones tapizados por respaldo. Posters renovados para los tres materiales; revisión visual de los tres acabados y comprobación de sintaxis.

## Tema claro y oscuro

El botón Claro/Oscuro del encabezado controla ambas páginas y guarda la elección en localStorage. Sin elección sigue el tema del sistema; tolera almacenamiento bloqueado. theme.js aplica el tema antes de pintar y sustituye el cambio automático por scroll. El logo y favicon tienen base clara para mantener el contraste. La escena de montaña y el visor conservan su iluminación oscura propia. Verificados ambos modos, navegación a galería, recarga y móvil de 390 px sin desbordamiento.

La entrada del logo se revela en cuatro franjas progresivas y se retira a los 2,6 segundos, seguida por el collage. Usa CSS, respeta movimiento reducido y se oculta al navegar con teclado. Se revisaron fases parciales y completa en una vista de prueba con tiempos congelados, además de la salida real y acceso a trabajos. Meta descripción de 143 caracteres actualizada con el nombre confirmado Rivera Concierge. La experiencia visible pasa a «más de 39 años» según información del propietario; se retiró la fecha de fundación anterior para no inferir una nueva.

Entrada revisada: tres piezas geométricas del logo (dos oscuras y banda central) llegan desde direcciones distintas en una secuencia total de 1,6 s, sin el recuadro previo. La banda llega al final. El resumen de la experiencia usa una flecha de alto contraste de 64 px (56 en móvil), que se invierte al abrir. Se retiraron los dos pies de texto solicitados. Se revisaron la composición parcial y completa, apertura/cierre y móvil de 390 px. Esta revisión sustituye la entrada anterior de cuatro franjas.

Áreas de servicio: las 19 zonas facilitadas por el propietario se muestran en un desplegable nativo antes del contacto, agrupadas en localidades y urbanizaciones. Accesos desde el inicio y ambos pies de página, más enlace para coordinar una visita por WhatsApp. Se verificaron los 19 elementos, apertura del listado y diseño móvil sin desbordamiento. No se añaden tarifas, plazos ni sucursales no indicadas.
