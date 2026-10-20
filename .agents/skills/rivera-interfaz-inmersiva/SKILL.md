---
name: rivera-interfaz-inmersiva
description: Mejorar la interfaz de Rivera Concierge con motion graphics de scroll, sofá 3D, degradados cálidos y vistas ligeras, mediante lectura selectiva y validación eficiente en tokens y recursos.
---

# Interfaz inmersiva de Rivera

Úsala para tareas de diseño, movimiento, 3D o interacción de Rivera, o por invocación del usuario. Sus instrucciones prevalecen. Documentar no exige rediseñar ni ejecutar el visor.

## Contexto mínimo

Sitio estático existente, modelo aprobado. Dirección: oficio real, fotografías del taller, Jost fina y espaciada, degradados arena/arcilla/salvia y tres actos: forma → tapizado → espacio. El sofá es una representación original; conserva su identificación y la distinción respecto a las fotografías del negocio.

## Lee por necesidad

1. Lee la petición, las instrucciones del repositorio y `git status --short`.
2. Consulta sólo el apartado pertinente de [la guía](../../../docs/GUIA_PARA_IA.md): referencias §2; estado/movimiento §3–4; modelo/rendimiento §5–6; archivos §7; validación §8.
3. Localiza con `rg -n` y lee rangos acotados. Agrupa lecturas independientes; evita volcar bibliotecas minificadas o el repositorio entero.
4. Para una animación exacta, inspecciona los videos disponibles: pocos fotogramas primero, detalle sólo en transiciones dudosas. Si el usuario exige una referencia inaccesible, comunica el bloqueo antes de decidir sobre ella. Distingue observación propia de análisis heredado.

## Implementa y comprueba

1. Explica en 4–6 líneas la mejora visible, archivos y comprobaciones. Resuelve decisiones rutinarias; pregunta sólo por un dato imprescindible ausente.
2. Haz una pasada coherente de composición, tipografía, coreografía e interacción. Reutiliza modelo, fuente y bundle; conserva fotos y contactos salvo nueva instrucción.
3. Sincroniza cámara, máscaras de texto, subtítulos y ambiente con un progreso reversible. Mantén scroll nativo, lectura, controles y salida hacia los trabajos.
4. Preserva carga diferida, render bajo demanda y liberación de GPU. Respeta reducción de movimiento y ahorro de datos. El modo estático debe verse cuidado, sin motor ni recorrido largo. Si cambia el modelo o encuadre inicial, actualiza sus posters.
5. Revisa inicio, transición, detalle, final, movimiento inverso y móvil. Comprueba accesibilidad y fallbacks afectados; una captura fija no demuestra la animación.

## Valida proporcionalmente

- Sirve con `python3 -m http.server 8000 --bind 127.0.0.1` desde la raíz; reutiliza un servidor adecuado.
- Usa `node tests/smoke.cjs` para la validación funcional que corresponda. Requisitos y diagnóstico: [README.md](../../../README.md). Para sólo documentos, revisa enlaces, rutas y exactitud.
- Ante fallos, diagnostica una causa y cambia una condición por intento. Repite tras una corrección o evidencia nueva.
- Reutiliza checks válidos del mismo código y declara lo omitido; una continuación parcial no es una suite completa.
- No inventes visualizaciones de videos, resultados de pruebas, FPS, batería o puntuaciones. Separa simulación funcional de rendimiento físico.

## Optimiza y termina

- Carga detalle bajo demanda; evita copiar la guía completa en cada turno. Conserva un registro corto de decisiones y checks para no repetir investigación.
- Delega sólo trabajo independiente que aporte valor. En máquinas sin GPU, ejecuta una prueba WebGL pesada a la vez.
- Termina cuando la mejora se aprecie, los controles/fallbacks funcionen y la validación necesaria concluya; evita abrir rediseños ajenos al objetivo.
- Entrega cambios, evidencia y límites. Respeta la autorización vigente; distingue commit, push, despliegue y publicación del entorno.

Skill portable: otra IA puede leer este archivo sin un sistema de skills. Para comenzar usa [el prompt](../../../docs/PROMPT_INTERFAZ.md).
