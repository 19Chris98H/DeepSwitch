import * as THREE from 'three';

export class Scene {
    constructor() {
        this.container = document.getElementById('threejs-container');

        this.createRenderer();
        this.createCamera();
        this.createScene();
        this.createHelpers();
        this.createLight();

        window.addEventListener('resize', this.onResize.bind(this));
    }

    createLight()
    {
        let ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);

        let pointLight = new THREE.PointLight(0xffffff, 1, 100);
        pointLight.position.set(0, 0, 0);
        this.camera.add(pointLight);
        this.scene.add(this.camera);
    }

    createRenderer() {
        const { width, height } = this.getRendererSize();
        const renderer = new THREE.WebGLRenderer();
        renderer.setSize(width, height);
        this.container.appendChild(renderer.domElement);
        this.renderer = renderer;
        this.renderer.physicallyCorrectLights = true;
    }

    getRendererSize() {
        const width = this.container.offsetWidth;
        const height = this.container.offsetHeight;
        return { width, height };
    }

    getRendererPosition() {
        const offsets = this.container.getBoundingClientRect();
        const x = offsets.left;
        const y = offsets.top;
        return { x, y };
    }

    createCamera() {
        const { width, height } = this.getRendererSize();
        this.camera = new THREE.PerspectiveCamera(
            75,
            width / height,
            0.1,
            1000
        );
    }

    createScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xCCCCCC);
    }

    createHelpers() {
        const gridHelper = new THREE.GridHelper(10, 10);
        gridHelper.position.set(0.5, 0, 0);
        this.grid = gridHelper;
        this.scene.add(gridHelper);
    }

    onResize() {
        const { width, height } = this.getRendererSize();
        this.renderer.setSize(width, height);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }

    addObject(object)
    {
        this.scene.add(object);
    }
}
