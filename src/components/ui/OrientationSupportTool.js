import * as THREE from 'three';
import {OrbitControls} from "three/addons";
import BetterAxesHelper from "../scene/BetterAxesHelper";

export class OrientationSupportTool {
    constructor(renderer) {
        this.renderer = renderer;
        this.helperScene = null;
        this.helperCamera = null;
        this.axesHelper = null;
        this.controls = null;
        this.create();
    }

    create() {
        this.helperScene = new THREE.Scene();
        this.helperCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 10);

        this.controls = new OrbitControls(this.helperCamera, this.renderer.domElement);
        this.controls.enableRotate = true;
        this.controls.enableZoom = false;
        this.controls.enablePan = false;

        this.helperCamera.position.set(0, 2.5, 5);
        this.helperCamera.lookAt(new THREE.Vector3(0, 0, 0));

        this.axesHelper = new BetterAxesHelper(1, 0.1);
        this.helperScene.add(this.axesHelper);

        // scene for the white circle background
        const bgScene = new THREE.Scene();
        // one unit is exactly the size of the renderer (i.e. 150px in this case)
        const bgCam = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5);
        bgCam.position.set(0, 0, 1);
        bgCam.lookAt(new THREE.Vector3(0, 0, 0));

        // 78 / 150 for 75px, * 0.5 because we are setting the diameter to 78px (i.e. radius has to be half)
        // 78px because the css circle is 80 by 80, and we want to avoid the circle overspilling, so we hide it
        // under the border
        const bgGeometry = new THREE.CircleGeometry(78 / 150 * 0.5, 16);
        const bgMaterial = new THREE.MeshBasicMaterial({color: 0x99bbff, transparent: true, opacity: 0.5});
        const bgCircle = new THREE.Mesh(bgGeometry, bgMaterial);
        bgScene.add(bgCircle);

        this.bgScene = bgScene;
        this.bgCam = bgCam;
    }

    update() {
        this.renderer.autoClear = false;

        const { width, height } = this.renderer.domElement;
        this.renderer.setViewport(
            width - 150,
            height - 150 - 10,
            150,
            150
        );

        this.renderer.clearDepth();
        this.renderer.render(this.bgScene, this.bgCam);

        this.renderer.clearDepth();
        this.renderer.render(this.helperScene, this.helperCamera);

        this.renderer.setViewport(0, 0, width, height);
        this.renderer.autoClear = true;
    }
}


