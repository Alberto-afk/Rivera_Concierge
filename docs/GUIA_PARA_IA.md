# Rivera Concierge: guía de continuidad para otra IA

Base visual y funcional descrita: commit `5995ce7` de `Alberto-afk/Rivera_Concierge`. Esta entrega añade documentación y una skill; no rediseña la página. Contrasta esta guía con el código si existen cambios posteriores.

## 1. Objetivo del usuario

Crear una web de tapicería cercana y creíble, accesible para personas mayores y atractiva para jóvenes. Debe mostrar el oficio y las fotografías del taller, con tipografía fina y espaciada, buen tamaño de lectura y una experiencia inmersiva de motion graphics.

La dirección evolucionó: primero se pidió simplificar la interfaz; después el usuario aclaró que una página demasiado plana tampoco servía. Aprobó el sofá 3D y pidió que el desplazamiento animara también los textos, el fondo y los encuadres. El objetivo actual combina claridad con una puesta en escena expresiva y cálida.

## 2. Qué se vio en los dos videos

Las páginas de TikTok no se pudieron abrir por un bloqueo del proxy. Los archivos de texto compartidos inicialmente contenían CSS y metadatos, sin evidencia visual. Más tarde el usuario adjuntó los MP4 y se revisaron secuencias de fotogramas y detalles de las transiciones. El análisis siguiente procede de esos videos, no de sus títulos.

Enlaces originales:

- https://www.tiktok.com/@samanastudio/video/7636745578365373718
- https://www.tiktok.com/@wearebrand.io/video/7607298809340742934

El análisis se organiza por el nombre de los MP4 inspeccionados. Los archivos originales no están incluidos en el repositorio.

### Video A: «High Design. High Conversions.» — unos 9 segundos

Se ve un monitor mostrando un paisaje frío, gris y volumétrico, con un iglú como protagonista inicial. La navegación ocupa poco espacio en los bordes. Al avanzar el recorrido cambian la escala y el encuadre: aparecen formas suspendidas, anillos y una escultura central. La profundidad y el paso continuo entre composiciones producen la sensación inmersiva.

Lo útil para Rivera es el lenguaje de cámara: un objeto dominante, espacio alrededor, acercamientos deliberados y continuidad entre estados. No interesa reproducir el iglú ni importar esas escenas al negocio de tapicería.

### Video B: «Immersive websites» — unos 17 segundos

Se ve un portátil con una montaña que emerge entre bruma. Un título grande, fino y muy espaciado convive con la escena. El desplazamiento descubre bloques breves de texto y otras composiciones: mar con un barco, planeta y bosque. Los cambios de profundidad, la atmósfera y las transiciones conectan las secciones.

Lo útil para Rivera es relacionar tipografía, objeto, fondo y relato. La inmersión necesita una secuencia visual; mover una fotografía unos píxeles o cambiar un párrafo de golpe resulta insuficiente para esta referencia.

### Qué no se comprobó

Los videos permiten observar resultados visuales, pero no identificar con certeza sus frameworks, motores de render ni implementación del scroll. No atribuyas GSAP, WebGL o una técnica concreta a esas webs sin evidencia adicional. Tampoco afirmes haber vuelto a ver los MP4 si sólo has leído esta guía.

## 3. Estado actual de la página

El sitio es estático: HTML, CSS y JavaScript. No requiere instalar paquetes ni ejecutar un build para servirlo. Three.js está empaquetado y alojado localmente.

| Parte | Comportamiento actual |
| --- | --- |
| Cabecera | Marca, navegación visible también en móvil y contacto directo. |
| Portada | «Muebles con historia», fotografía existente del sofá terracota y fondo cálido con degradado. El título entra mediante máscaras en equipos adecuados. |
| Sección inmersiva | Sofá 3D, tres actos de cámara, títulos cinéticos, explicaciones y degradados sincronizados con el scroll. |
| Catálogo | Doce trabajos; con JavaScript se muestran seis inicialmente, filtros por categoría y expansión/contracción. |
| Taller y proceso | Fotografías existentes y explicación sencilla del trabajo manual y del relleno del mueble. |
| Contacto | WhatsApp y llamada telefónica; conserva los destinos existentes. |
| Sin JavaScript | Contenido y contacto disponibles, los doce trabajos visibles y poster del sofá en el tono inicial. |

La fuente Jost es local. Se usan mayúsculas ligeras y espaciadas en títulos, con texto de lectura más sólido; el cuerpo parte de 18 px. Se conservan las fotografías del proyecto sin convertirlas en ilustraciones generadas.

## 4. Qué cambió específicamente en la última versión

La versión anterior ya tenía un sofá 3D con tres materiales. La última iteración añadió la coreografía que faltaba:

| Acto | Título visual | Cámara | Ambiente |
| --- | --- | --- | --- |
| 1. La forma | «LA FORMA / de quedarse.» | Vista amplia, frontal en tres cuartos. | Arena, luz cálida. |
| 2. El tapizado | «EL DETALLE / que se siente.» | Acercamiento explícito a cojines, ribetes y costuras. | Arcilla con matices rosados. |
| 3. Su espacio | «SU HOGAR / con otra vida.» | Regreso al conjunto desde el lado opuesto. | Salvia y tonos naturales. |

Los títulos entran por máscaras verticales, con desplazamiento y una pequeña variación de escala horizontal. Los subtítulos aparecen con un desfase; los títulos anteriores se retiran. La explicación inferior se atenúa durante el cambio de capítulo. No se trata sólo de sustituir texto en el DOM.

Un único progreso normalizado de 0 a 1 gobierna la cámara, los títulos, los subtítulos, las explicaciones y las capas del fondo. Al subir, la secuencia se revierte. Se conserva el desplazamiento nativo del navegador y el acceso para saltar a los trabajos.

La sección mantiene el escenario fijo durante el recorrido: actualmente reserva 340 svh en escritorio y 280 svh en pantallas de hasta 600 px cuando el 3D está activo. La vista estática elimina ese recorrido largo. Estos valores son parámetros existentes, no objetivos de rendimiento universales.

Los degradados son capas CSS estáticas cuya opacidad y posición cambian. Se desplaza una luz ambiental suave; no hay video de fondo ni desenfoque animado. También se añadieron degradados en portada, taller y contacto para conectar visualmente el conjunto.

Los encabezados y algunos textos fuera del visor tienen entradas suaves mediante IntersectionObserver. Son una mejora progresiva: los enlaces no esperan a la animación y los textos permanecen visibles en los modos ligeros.

La cámara sigue keyframes con suavizado; el sofá permanece fijo. Así se reutiliza su mapa de sombras durante el recorrido. Los tres posters se regeneraron para corresponder al encuadre inicial actualizado.

## 5. Qué representa el sofá

Es un modelo original construido con geometría: tres plazas, cojines, ribetes, una almohada y patas de madera. Las texturas pequeñas de tela y madera se generan en código. Es una representación de diseño, no un escaneo de un encargo real ni una fotografía que demuestre un trabajo del taller.

Lino claro, terracota y verde oliva son tonos orientativos seleccionables. En modo estático, los botones cambian entre renders WebP del mismo modelo sin cargar Three.js. Sin JavaScript se muestra únicamente el poster inicial. Mantén la identificación «Representación 3D» y las fotografías del taller como evidencia diferenciada.

Se retiró un comparador de versiones antiguas porque superponía dos muebles distintos como si documentaran una restauración. No lo repongas sin fotografías verificadas del mismo mueble.

## 6. Rendimiento y accesibilidad que se deben conservar

- Carga diferida del módulo 3D y del bundle local al acercarse a la sección, sólo cuando procede activar el visor.
- Activación automática con al menos cuatro procesadores lógicos, al menos 4 GB de memoria si el navegador informa ese dato y puntero fino con hover. Son heurísticas, no una detección exacta de la gama del equipo.
- Táctil y hardware modesto comienzan estáticos; pueden solicitar el 3D manualmente. Reducción de movimiento, ahorro de datos, APIs ausentes y fallos de WebGL mantienen o fuerzan la vista estática.
- Render bajo demanda: se detiene al estabilizarse, salir de la sección o esconder la pestaña. No añadir bucles permanentes para decorar el fondo.
- DPR máximo 1.5 y sombras de 512 px. Tras una racha de cuadros lentos reduce resolución y sombras; si persiste, vuelve al poster y libera recursos gráficos.
- La preferencia del visor se conserva durante la sesión. Los colores y el contacto siguen disponibles en modo ligero.
- Conservar foco visible, navegación por teclado, botones con estados accesibles, tamaños táctiles útiles y el enlace para saltar el recorrido.
- Los títulos decorativos cinéticos tienen `aria-hidden`; el encabezado semántico y las explicaciones siguen accesibles. No duplicar todas las letras para el lector de pantalla.
- Evitar ocultar contenido esencial cuando falla JavaScript o cambia `prefers-reduced-motion`.

## 7. Mapa de archivos: leer sólo lo necesario

| Archivo | Responsabilidad | Cuándo leerlo |
| --- | --- | --- |
| `index.html` | Contenido, estructura, controles y semántica. | Cambios de contenido o disposición. |
| `styles.css` | Tipografía, degradados, máscaras y responsive. | Cambios visuales; atender a las reglas finales de la cascada. |
| `app.js` | Política de activación, progreso, texto animado, filtros y pausas. | Cambios de movimiento o interacción. |
| `furniture3d.js` | Geometría, materiales, luces y keyframes de cámara. | Cambios reales del modelo o del encuadre. |
| `assets/sofa3d/` | Tres posters WebP del modelo. | Si cambia el encuadre inicial, la geometría o el material. |
| `assets/vendor/` | Three.js 0.170.0, licencia y procedencia. | Sólo para una actualización necesaria de la dependencia. |
| `tests/smoke.cjs` | Comprobaciones de navegador. | Validar cambios funcionales o diagnosticar fallos. |
| `README.md`, `REFERENCIAS.md` | Arranque y resumen visual. | Consultas concretas; no duplicar lecturas sin motivo. |

La API del módulo 3D es `createFurnitureScene(container, options)`, que devuelve `setProgress`, `setPointer`, `setMaterial`, `setQuality`, `render`, `resize` y `dispose`. El módulo no inicia su propio bucle de animación.

## 8. Cómo validar y qué evidencia existe

Desde la raíz: `python3 -m http.server 8000 --bind 127.0.0.1`. Para comprobar el comportamiento: `node tests/smoke.cjs`, con Node.js, Python, Playwright y Chromium disponibles. Las instrucciones para otra máquina están en README.md.

El archivo contiene doce comprobaciones. En la entrega visual `5995ce7` quedaron cubiertas entre dos ejecuciones con la misma producción: primero tres aprobadas y después nueve aprobadas, tres omitidas, con salida 0 en la continuación. No se presentó la segunda ejecución parcial como una corrida completa.

Se comprobaron píxeles del render, materiales, tres capítulos, máscaras y degradados cambiantes, recorrido inverso, reposo sin cuadros adicionales, visibilidad, modos estáticos, teclado, cinco anchuras entre 320 y 1440 px, fallos del motor y contenido sin JavaScript.

Las pruebas usan SwiftShader, DPR 0.35 y relojes/señales de hardware controlados. Separan la lógica funcional de la lentitud del render por software; otra prueba fuerza una señal lenta para comprobar la degradación. No acreditan FPS, batería, Lighthouse ni fluidez en teléfonos físicos.

`RIVERA_ARTIFACT_DIR=/tmp/rivera-motion node tests/smoke.cjs` guarda capturas de las tres fases y de móvil. `RIVERA_CHECK_FROM=4` permite retomar desde la cuarta comprobación y declara lo omitido. Reutiliza resultados previos sólo si el código relevante sigue siendo el mismo; después de nuevos cambios, vuelve a comprobar lo afectado.

Para cambios exclusivamente documentales basta revisar enlaces, rutas y exactitud de las instrucciones. No hace falta ejecutar el render pesado.

## 9. Criterio de continuidad

Antes de cambiar, escribe en pocas líneas qué problema visual vas a resolver y qué partes tocarás. Implementa una secuencia completa y revisa capturas al comienzo, durante una transición, en el detalle, al final y en móvil. No evalúes una animación únicamente por una captura fija.

Da el trabajo por terminado cuando la mejora se aprecia, el texto sigue siendo legible, los controles funcionan, el modo ligero está intacto y las comprobaciones necesarias tienen evidencia. Explica las limitaciones pendientes. Un commit en GitHub no demuestra por sí mismo un despliegue web ni una publicación del entorno.
