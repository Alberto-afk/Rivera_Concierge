# Three.js local

`three-0.170.0.min.js` contiene Three.js 0.170.0 y `RoundedBoxGeometry`, empaquetados como un módulo ES con esbuild 0.25.12. Se conserva la licencia MIT en `THREE-LICENSE.txt` y los comentarios de licencia dentro del bundle.

Antes de usar el paquete se verificó el tarball `https://registry.npmjs.org/three/-/three-0.170.0.tgz` contra la integridad publicada por npm:

```text
sha512-FQK+LEpYc0fBD+J8g6oSEyyNzjp+Q7Ks1C568WWaoMRLW+TkNNWmenWeGgJjV105Gd+p/2ql1ZcjYvNiPZBhuQ==
```

El bundle es parte de los archivos estáticos; no hace falta reconstruirlo para desarrollar o publicar el sitio. Para reconstruirlo, instale las versiones indicadas de `three` y `esbuild` en un directorio temporal fuera del checkout y use esta entrada junto a esas dependencias:

```js
export {
  ACESFilmicToneMapping, AmbientLight, CanvasTexture, CatmullRomCurve3, Color,
  CylinderGeometry, DirectionalLight, Group, HemisphereLight, Mesh,
  MeshStandardMaterial, PCFSoftShadowMap, PerspectiveCamera, PlaneGeometry,
  RepeatWrapping, Scene, ShadowMaterial, SRGBColorSpace, TubeGeometry,
  Vector2, Vector3, WebGLRenderer
} from 'three';
export { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
```

Empaquete con `esbuild three-entry.js --bundle --minify --format=esm --legal-comments=inline --outfile=/workspace/Rivera_Concierge/assets/vendor/three-0.170.0.min.js`, ajustando la ruta a su checkout. Conserve la verificación de integridad de npm y la licencia al actualizar.
