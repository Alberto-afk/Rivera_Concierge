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
    lino: { body: '#bfb39e', cushion: '#d9cdb9', seam: '#a99a83' },
    terracota: { body: '#975d48', cushion: '#bd8065', seam: '#84533f' },
    oliva: { body: '#6e7560', cushion: '#969a7f', seam: '#626c53' }
};

function fabricTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 128;
    const context = canvas.getContext('2d');
    const data = context.createImageData(128, 128);
    // Textura pequeña y determinista; no fotografía ni descarga externa.
    let seed = 17;
    for (let y = 0; y < 128; y++) {
        for (let x = 0; x < 128; x++) {
            seed = (seed * 16807) % 2147483647;
            const weave = (x % 4 === 0 ? -12 : 4) + (y % 4 === 0 ? -10 : 3);
            const value = 204 + weave + (seed % 17) - 8;
            const index = (y * 128 + x) * 4;
            data.data[index] = data.data[index + 1] = data.data[index + 2] = value;
            data.data[index + 3] = 255;
        }
    }
    context.putImageData(data, 0, 0);
    const texture = new CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.repeat.set(5, 5);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 2;
    return texture;
}

function woodTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const context = canvas.getContext('2d');
    context.fillStyle = '#a37a50';
    context.fillRect(0, 0, 64, 64);
    for (let x = 0; x < 64; x += 2) {
        context.strokeStyle = `rgba(67,38,16,${0.08 + (x % 7) * 0.015})`;
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
            point[pillowAxis] += Math.sign(point[pillowAxis]) * 0.035 * Math.max(0, u * v);
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
    const mesh = new Mesh(new TubeGeometry(curve, 80, 0.0045, 4, true), material);
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
    // Bastidor tapizado, brazos bajos y patas de madera maciza.
    put(roundedMesh(3.42, 0.30, 1.43, 0.10, materials.body), 0, 0.45, 0);
    put(roundedMesh(3.32, 0.85, 0.27, 0.10, materials.body), 0, 0.97, -0.60);
    for (const side of [-1, 1]) {
        put(roundedMesh(0.32, 0.67, 1.47, 0.12, materials.body), side * 1.62, 0.78, 0.01);
        const armSeam = seam(1.24, 0.48, 0.10, materials.seam);
        armSeam.rotation.y = Math.PI / 2;
        armSeam.position.set(side * 1.783, 0.79, 0.01);
        sofa.add(armSeam);
        for (const depth of [-0.50, 0.49]) {
            const leg = new Mesh(new CylinderGeometry(0.065, 0.046, 0.26, 12), materials.wood);
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
    // Una almohada ligeramente inclinada conserva la silueta limpia.
    const pillow = roundedMesh(0.49, 0.49, 0.18, 0.085, materials.cushion, 'z');
    pillow.position.set(-1.16, 1.00, 0.11);
    pillow.rotation.set(-0.16, 0.12, -0.17);
    sofa.add(pillow);
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
        renderer.toneMappingExposure = 1.13;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = PCFSoftShadowMap;
        renderer.shadowMap.autoUpdate = false;

        const fabric = fabricTexture();
        const wood = woodTexture();
        textures.push(fabric, wood);
        const palette = PALETTES.lino;
        const upholstery = {
            body: new MeshStandardMaterial({ color: palette.body, roughness: 0.98, map: fabric, bumpMap: fabric, bumpScale: 0.007 }),
            cushion: new MeshStandardMaterial({ color: palette.cushion, roughness: 0.98, map: fabric, bumpMap: fabric, bumpScale: 0.009 }),
            seam: new MeshStandardMaterial({ color: palette.seam, roughness: 1 }),
            wood: new MeshStandardMaterial({ color: '#ccb18c', map: wood, roughness: 0.76 })
        };
        materials.push(...Object.values(upholstery));
        const sofa = addSofa(scene, upholstery);
        const sky = new HemisphereLight(0xfffaf0, 0x827569, 2.65);
        scene.add(sky);
        const key = new DirectionalLight(0xfff6e5, 3.0);
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
        const fill = new DirectionalLight(0xe9efff, 0.75);
        fill.position.set(3, 2, -2);
        scene.add(fill);

        const shadowMaterial = new ShadowMaterial({ color: 0x655747, opacity: 0.12 });
        materials.push(shadowMaterial);
        const floor = new Mesh(new PlaneGeometry(30, 30), shadowMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        scene.add(floor);

        const contactCanvas = document.createElement('canvas');
        contactCanvas.width = contactCanvas.height = 64;
        const contactContext = contactCanvas.getContext('2d');
        const gradient = contactContext.createRadialGradient(32, 32, 3, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(64,48,29,.20)');
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
            // La vista recorre sólo el frente; el sofá permanece completo en móvil.
            const aspect = width / height;
            const radius = Math.max(4.85, 7.1 / aspect);
            const angle = 0.30 + progress * 0.29 + pointerX * 0.045;
            const distance = radius * (1 - progress * 0.12);
            camera.position.set(Math.sin(angle) * distance, 0.85 + distance * 0.25 + pointerY * 0.13, Math.cos(angle) * distance);
            camera.lookAt(0, 0.80, 0);
            sofa.rotation.y = -progress * 0.06;
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
                renderer.shadowMap.needsUpdate = renderer.shadowMap.enabled;
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
                renderer.setPixelRatio(name === 'low' ? 1 : Math.min(window.devicePixelRatio || 1, 1.5));
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
