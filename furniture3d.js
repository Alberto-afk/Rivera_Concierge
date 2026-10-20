/**
 * Modelo original de demostración: un sofá de tres plazas construido con geometría.
 * Three.js r170 se sirve localmente; licencia en assets/vendor/THREE-LICENSE.txt.
 * Render bajo demanda: este módulo no crea bucles, temporizadores ni listeners globales.
 */
import {
    ACESFilmicToneMapping, CanvasTexture, CatmullRomCurve3,
    CylinderGeometry, DirectionalLight, Group, HemisphereLight, Mesh,
    MeshStandardMaterial, PCFSoftShadowMap, PerspectiveCamera, PlaneGeometry,
    RepeatWrapping, Scene, ShadowMaterial, SRGBColorSpace, TubeGeometry,
    Vector3, WebGLRenderer, RoundedBoxGeometry
} from './assets/vendor/three-0.170.0.min.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
const PALETTES = {
    lino: { body: '#bfb39e', cushion: '#d9cdb9', seam: '#a6967e' },
    terracota: { body: '#975d48', cushion: '#bd8065', seam: '#81503c' },
    oliva: { body: '#6e7560', cushion: '#969a7f', seam: '#5e684f' }
};

const CAMERA_SHOTS = [
    { at: 0, angle: 0.30, scale: 1, detail: false, x: -0.12, y: 1.04, z: 0, elevation: 0.24 },
    { at: 0.14, angle: 0.32, scale: 0.97, detail: false, x: -0.08, y: 1.05, z: 0.02, elevation: 0.24 },
    { at: 0.44, angle: 0.59, scale: 1.01, detail: true, x: 0.85, y: 1.08, z: 0.10, elevation: 0.28 },
    { at: 0.60, angle: 0.48, scale: 1.02, detail: true, x: 0.76, y: 1.05, z: 0.10, elevation: 0.26 },
    { at: 0.90, angle: -0.38, scale: 1.03, detail: false, x: 0.16, y: 1.07, z: 0, elevation: 0.22 },
    { at: 1, angle: -0.44, scale: 1.03, detail: false, x: 0.16, y: 1.07, z: 0, elevation: 0.22 }
];

function fabricTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const context = canvas.getContext('2d');
    const data = context.createImageData(128, 128);
    // Textura pequeña y determinista con relieve de trama cruzada artesanal; sin descargas externas.
    let seed = 17;
    for (let y = 0; y < 128; y++) {
        for (let x = 0; x < 128; x++) {
            seed = (seed * 16807) % 2147483647;
            const warp = (x % 4 === 0 ? -14 : (x % 2 === 0 ? 6 : 2));
            const weft = (y % 4 === 0 ? -12 : (y % 2 === 0 ? 5 : 1));
            const knot = ((x + y) % 8 === 0) ? 7 : 0;
            const value = clamp(202 + warp + weft + knot + (seed % 15) - 7, 145, 250);
            const index = (y * 128 + x) * 4;
            data.data[index] = data.data[index + 1] = data.data[index + 2] = value;
            data.data[index + 3] = 255;
        }
    }
    context.putImageData(data, 0, 0);
    const texture = new CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.repeat.set(6, 6);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 2;
    return texture;
}

function woodTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const context = canvas.getContext('2d');
    context.fillStyle = '#9e7449';
    context.fillRect(0, 0, 64, 64);
    for (let x = 0; x < 64; x += 2) {
        context.strokeStyle = `rgba(62,34,14,${0.09 + (x % 7) * 0.016})`;
        context.beginPath();
        context.moveTo(x, 0);
        context.bezierCurveTo(x + 4, 20, x - 4, 45, x + 1, 64);
        context.stroke();
    }
    const texture = new CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.colorSpace = SRGBColorSpace;
    return texture;
}

function roundedMesh(width, height, depth, radius, material, pillowAxis) {
    const geometry = new RoundedBoxGeometry(width, height, depth, 4, radius);
    if (pillowAxis) {
        const position = geometry.attributes.position;
        const point = new Vector3();
        for (let i = 0; i < position.count; i++) {
            point.fromBufferAttribute(position, i);
            const u = 1 - Math.pow(point.x / (width / 2), 2);
            const v = pillowAxis === 'y'
                ? 1 - Math.pow(point.z / (depth / 2), 2)
                : 1 - Math.pow(point.y / (height / 2), 2);
            point[pillowAxis] += Math.sign(point[pillowAxis]) * 0.038 * Math.max(0, u * v);
            position.setXYZ(i, point.x, point.y, point.z);
        }
        // Conserva las normales suaves del canto redondeado. La deformación es mínima.
    }
    const mesh = new Mesh(geometry, material);
    mesh.castShadow = mesh.receiveShadow = true;
    return mesh;
}

// Ribete continuo: la costura describe la forma de cada cojín.
function seam(width, height, radius, material, plane = 'xy') {
    const points = [];
    const corners = [
        [width / 2 - radius, height / 2 - radius, 0],
        [-width / 2 + radius, height / 2 - radius, Math.PI / 2],
        [-width / 2 + radius, -height / 2 + radius, Math.PI],
        [width / 2 - radius, -height / 2 + radius, Math.PI * 1.5]
    ];
    for (const [cx, cy, start] of corners) {
        for (let i = 0; i <= 5; i++) {
            const angle = start + Math.PI * 0.5 * (i / 5);
            const x = cx + Math.cos(angle) * radius;
            const y = cy + Math.sin(angle) * radius;
            points.push(plane === 'xz' ? new Vector3(x, 0, y) : new Vector3(x, y, 0));
        }
    }
    const curve = new CatmullRomCurve3(points, true, 'centripetal');
    const mesh = new Mesh(new TubeGeometry(curve, 80, 0.005, 4, true), material);
    mesh.castShadow = false;
    return mesh;
}

function addSofa(scene, materials) {
    const sofa = new Group();
    scene.add(sofa);
    const put = (mesh, x, y, z) => {
        mesh.position.set(x, y, z);
        sofa.add(mesh);
        return mesh;
    };
    // Zócalo inferior de madera noble y bastidor tapizado con brazos bajos.
    put(roundedMesh(3.34, 0.055, 1.36, 0.022, materials.wood), 0, 0.285, 0);
    put(roundedMesh(3.42, 0.30, 1.43, 0.10, materials.body), 0, 0.45, 0);
    put(roundedMesh(3.32, 0.85, 0.27, 0.10, materials.body), 0, 0.97, -0.60);
    for (const side of [-1, 1]) {
        put(roundedMesh(0.32, 0.67, 1.47, 0.12, materials.body), side * 1.62, 0.78, 0.01);
        const armSeam = seam(1.24, 0.48, 0.10, materials.seam);
        armSeam.rotation.y = Math.PI / 2;
        armSeam.position.set(side * 1.783, 0.79, 0.01);
        sofa.add(armSeam);
        for (const depth of [-0.50, 0.49]) {
            const leg = new Mesh(new CylinderGeometry(0.065, 0.044, 0.26, 12), materials.wood);
            leg.position.set(side * 1.45, 0.135, depth);
            leg.rotation.z = side * -0.13;
            leg.rotation.x = depth * 0.17;
            leg.castShadow = leg.receiveShadow = true;
            sofa.add(leg);
        }
    }
    for (let i = 0; i < 3; i++) {
        const x = (i - 1) * 0.987;
        put(roundedMesh(0.96, 0.25, 1.15, 0.10, materials.cushion, 'y'), x, 0.697, 0.125);
        const seatSeam = seam(0.945, 1.12, 0.105, materials.seam, 'xz');
        seatSeam.position.set(x, 0.715, 0.125);
        sofa.add(seatSeam);
        const back = new Group();
        back.position.set(x, 1.107, -0.43);
        back.rotation.x = -0.12;
        back.add(roundedMesh(0.965, 0.78, 0.28, 0.12, materials.cushion, 'z'));
        const backSeam = seam(0.92, 0.73, 0.11, materials.seam);
        backSeam.position.z = 0.133;
        back.add(backSeam);
        sofa.add(back);
    }
    // Cojines laterales con vivo perimetral que equilibran ambos extremos del sofá.
    const leftPillowGroup = new Group();
    leftPillowGroup.position.set(-1.16, 1.00, 0.11);
    leftPillowGroup.rotation.set(-0.16, 0.12, -0.17);
    leftPillowGroup.add(roundedMesh(0.49, 0.49, 0.18, 0.085, materials.cushion, 'z'));
    const leftPillowSeam = seam(0.45, 0.45, 0.075, materials.seam);
    leftPillowSeam.position.z = 0.086;
    leftPillowGroup.add(leftPillowSeam);
    sofa.add(leftPillowGroup);

    const rightLumbarGroup = new Group();
    rightLumbarGroup.position.set(0.987, 0.91, -0.19);
    rightLumbarGroup.rotation.set(-0.14, -0.06, 0.02);
    rightLumbarGroup.add(roundedMesh(0.58, 0.30, 0.15, 0.07, materials.cushion, 'z'));
    const rightLumbarSeam = seam(0.54, 0.26, 0.06, materials.seam);
    rightLumbarSeam.position.z = 0.072;
    rightLumbarGroup.add(rightLumbarSeam);
    sofa.add(rightLumbarGroup);

    sofa.position.y = 0.012;
    return sofa;
}

/**
 * @param {HTMLElement} container El contenedor proporciona el tamaño del visor.
 * @returns {Promise<{setProgress:Function,setPointer:Function,setMaterial:Function,setQuality:Function,render:Function,resize:Function,dispose:Function}>}
 */
export async function createFurnitureScene(container, { onFailure } = {}) {
    if (!container || !container.appendChild) throw new TypeError('Falta el contenedor del sofá.');
    let renderer;
    let disposed = false;
    let contextLost = false;
    const scene = new Scene();
    const camera = new PerspectiveCamera(35, 1, 0.1, 60);
    const textures = [];
    const materials = [];
    let canvas;
    let progress = 0;
    let quality = 'high';
    let pointerX = 0;
    let pointerY = 0;
    let width = 1;
    let height = 1;

    const disposeResources = () => {
        const geometries = new Set();
        scene.traverse(object => { if (object.geometry) geometries.add(object.geometry); });
        geometries.forEach(geometry => geometry.dispose());
        materials.forEach(material => material.dispose());
        textures.forEach(texture => texture.dispose());
        renderer?.dispose();
        renderer?.forceContextLoss();
    };

    try {
        renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power', failIfMajorPerformanceCaveat: false });
        canvas = renderer.domElement;
        canvas.setAttribute('aria-hidden', 'true');
        canvas.style.display = 'block';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        renderer.setClearColor(0xe9e5dc, 0);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        renderer.outputColorSpace = SRGBColorSpace;
        renderer.toneMapping = ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.14;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = PCFSoftShadowMap;
        renderer.shadowMap.autoUpdate = false;

        const fabric = fabricTexture();
        const wood = woodTexture();
        textures.push(fabric, wood);
        const palette = PALETTES.lino;
        const upholstery = {
            body: new MeshStandardMaterial({ color: palette.body, roughness: 0.96, map: fabric, bumpMap: fabric, bumpScale: 0.0085 }),
            cushion: new MeshStandardMaterial({ color: palette.cushion, roughness: 0.95, map: fabric, bumpMap: fabric, bumpScale: 0.0115 }),
            seam: new MeshStandardMaterial({ color: palette.seam, roughness: 0.92 }),
            wood: new MeshStandardMaterial({ color: '#c8ab84', map: wood, roughness: 0.72 })
        };
        materials.push(...Object.values(upholstery));
        addSofa(scene, upholstery);
        const sky = new HemisphereLight(0xfffaf0, 0x827569, 2.65);
        scene.add(sky);
        const key = new DirectionalLight(0xfff6e5, 3.05);
        key.position.set(-2.3, 6.0, 3.7);
        key.castShadow = true;
        key.shadow.mapSize.set(512, 512);
        key.shadow.camera.left = -3.2;
        key.shadow.camera.right = 3.2;
        key.shadow.camera.top = 2.9;
        key.shadow.camera.bottom = -2.9;
        key.shadow.camera.near = 0.5;
        key.shadow.camera.far = 12;
        key.shadow.bias = -0.0003;
        key.shadow.normalBias = 0.025;
        key.shadow.radius = 3;
        key.target.position.set(0, 0.55, 0);
        scene.add(key, key.target);
        const fill = new DirectionalLight(0xe9efff, 0.72);
        fill.position.set(3, 2, -2);
        scene.add(fill);
        const rim = new DirectionalLight(0xffeed6, 0.52);
        rim.position.set(-2.4, 2.8, -3.2);
        scene.add(rim);

        const shadowMaterial = new ShadowMaterial({ color: 0x655747, opacity: 0.13 });
        materials.push(shadowMaterial);
        const floor = new Mesh(new PlaneGeometry(30, 30), shadowMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        scene.add(floor);

        const contactCanvas = document.createElement('canvas');
        contactCanvas.width = contactCanvas.height = 64;
        const contactContext = contactCanvas.getContext('2d');
        const gradient = contactContext.createRadialGradient(32, 32, 3, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(64,48,29,.22)');
        gradient.addColorStop(0.65, 'rgba(64,48,29,.12)');
        gradient.addColorStop(1, 'rgba(64,48,29,0)');
        contactContext.fillStyle = gradient;
        contactContext.fillRect(0, 0, 64, 64);
        const contactTexture = new CanvasTexture(contactCanvas);
        textures.push(contactTexture);
        const contactMaterial = new MeshStandardMaterial({ map: contactTexture, transparent: true, depthWrite: false, roughness: 1 });
        materials.push(contactMaterial);
        const contact = new Mesh(new PlaneGeometry(4.5, 2.4), contactMaterial);
        contact.rotation.x = -Math.PI / 2;
        contact.position.y = 0.004;
        scene.add(contact);

        const positionCamera = () => {
            const aspect = width / height;
            const wide = Math.max(5.2, 7.1 / aspect);
            const detail = Math.max(2.75, 3.35 / aspect);
            // Tres actos: silueta completa, detalle deliberado y regreso abierto.
            // Los encuadres dejan aire sobre el mueble para la tipografía del sitio.
            let index = 0;
            while (index < CAMERA_SHOTS.length - 2 && progress > CAMERA_SHOTS[index + 1].at) index++;
            const from = CAMERA_SHOTS[index];
            const to = CAMERA_SHOTS[index + 1];
            const fraction = clamp((progress - from.at) / (to.at - from.at), 0, 1);
            // Smootherstep: entrada y salida con velocidad y aceleración continuas.
            const eased = fraction * fraction * fraction * (fraction * (fraction * 6 - 15) + 10);
            const blend = key => from[key] + (to[key] - from[key]) * eased;
            const angle = blend('angle') + pointerX * 0.035;
            const fromDistance = (from.detail ? detail : wide) * from.scale;
            const toDistance = (to.detail ? detail : wide) * to.scale;
            const distance = fromDistance + (toDistance - fromDistance) * eased;
            const x = blend('x');
            const y = blend('y');
            const z = blend('z');
            camera.position.set(
                x + Math.sin(angle) * distance,
                y + distance * blend('elevation') + pointerY * 0.10,
                z + Math.cos(angle) * distance
            );
            camera.lookAt(x, y, z);
        };
        const resize = () => {
            if (disposed || contextLost) return;
            width = Math.max(1, container.clientWidth);
            height = Math.max(1, container.clientHeight);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height, false);
            positionCamera();
        };
        const render = () => {
            if (disposed || contextLost) return;
            renderer.render(scene, camera);
        };
        const onContextLost = event => {
            event.preventDefault();
            if (disposed) return;
            contextLost = true;
            canvas.style.visibility = 'hidden';
            if (typeof onFailure === 'function') onFailure(new Error('Se perdió el contexto WebGL.'));
        };
        canvas.addEventListener('webglcontextlost', onContextLost);
        container.appendChild(canvas);
        resize();
        renderer.shadowMap.needsUpdate = true;
        render();
        if (renderer.getContext().isContextLost()) throw new Error('WebGL no está disponible.');

        return {
            setProgress(value) {
                if (disposed) return;
                const next = clamp(value, 0, 1);
                if (next === progress) return;
                progress = next;
                positionCamera();
                // Sólo cambia la cámara: el mapa de sombras del mueble sigue válido.
            },
            setPointer(x, y) {
                if (disposed) return;
                pointerX = clamp(x, -1, 1);
                pointerY = clamp(y, -1, 1);
                positionCamera();
            },
            setMaterial(name) {
                const next = PALETTES[name];
                if (disposed || !next) return;
                upholstery.body.color.set(next.body);
                upholstery.cushion.color.set(next.cushion);
                upholstery.seam.color.set(next.seam);
            },
            setQuality(name) {
                if (disposed || contextLost || (name !== 'low' && name !== 'high') || name === quality) return;
                quality = name;
                renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, name === 'low' ? 1 : 1.5));
                renderer.shadowMap.enabled = name !== 'low';
                renderer.shadowMap.needsUpdate = renderer.shadowMap.enabled;
                // Cambia la variante de shader una sola vez al cambiar la calidad.
                materials.forEach(material => { material.needsUpdate = true; });
                resize();
            },
            render,
            resize,
            dispose() {
                if (disposed) return;
                disposed = true;
                canvas.removeEventListener('webglcontextlost', onContextLost);
                disposeResources();
                canvas.remove();
            }
        };
    } catch (error) {
        disposeResources();
        canvas?.remove();
        throw error;
    }
}
