import * as THREE from "three";
import { Scene } from "./components/scene/Scene.js";
import MainContainer from "./components/scene/MainContainer";
import { setupHideParameterToggle } from "./components/ui/HideParameterToggle.js";
import { OrientationSupportTool } from "./components/ui/OrientationSupportTool.js";
import { ToggleSwitch } from "./components/ui/ToggleSwitch.js";
import RangeLine from "./components/ui/RangeLine";
import PointLine from "./components/ui/PointLine";
import { DataManager } from "./components/DataManager";
import { ToggleExtrema } from "./components/ui/ToggleExtrema";
import { ToggleLIC } from "./components/ui/ToggleLIC";
import { ToggleCam } from "./components/ui/ToggleCam";
import ColorScaleSettings from "./components/ui/ColorScaleSettings";
import { setupColorMapLoader } from "./components/ui/ColorMapLoader.js";
import { setupCamera } from "./components/scene/Camera.js";

const ENABLE_CACHE_SECTION = true;

if (ENABLE_CACHE_SECTION) {
    document.getElementById('cache-section').style.display = 'block';
} else {
    document.getElementById('loading-label-checkbox').checked = false;
    document.getElementById('auto-cache-checkbox').checked = true;
}

document.getElementById('hide-button').addEventListener('click', () => {
    document.getElementById('cache-section').style.display = 'none';
});

document.addEventListener('contextmenu', event => {
    event.preventDefault();
});

setupColorMapLoader();

const dataManager = new DataManager();
dataManager.loadMetadata().then(() => {
    init();
});

function init() {
    const scene = new Scene();
    scene.camera.position.set(0.5, 4, 8);
    scene.camera.lookAt(new THREE.Vector3(0.5, 0, 0));

    const orientationTool = new OrientationSupportTool(scene.renderer);
    const toggleSwitch = new ToggleSwitch();
    const toggleExtrema = new ToggleExtrema();
    const toggleLIC = new ToggleLIC();
    const toggleCam = new ToggleCam();

    setupHideParameterToggle(scene);

    let rangeSlider = new RangeLine(document.getElementById('rangeline'));
    let pointSlider = new PointLine(document.getElementById('timeline'));

    const container = new MainContainer(scene, rangeSlider, pointSlider, 3, 3, dataManager);
    scene.scene.add(container);

    container.addEventListener('change', render);

    toggleSwitch.element.addEventListener('toggle', () => {
        container.setMode(toggleSwitch.getState());
    });

    toggleExtrema.element.addEventListener('toggle', () => {
        container.setModeExtrema(toggleExtrema.getState());
    });

    new ColorScaleSettings(dataManager, container, toggleExtrema);

    toggleLIC.element.addEventListener('toggle', () => {
        container.setModeLIC(toggleLIC.getState());
    });

    container.controls.addEventListener('panStart', (event) => {
        if (toggleCam.getState() !== ToggleCam.STATES.FREE) {
            orientationTool.controls._onPointerDown(event.pointerEvent);
            container.pointerDownInTopDown = true;
            toggleCam.setState(ToggleCam.STATES.FREE);
        }
    });

    const { updateOrthoCam, positionCamera } = setupCamera(scene, container, toggleCam, orientationTool);

    container.createPlane(1).then(() => {
        toggleCam.setState(ToggleCam.STATES.TOP_DOWN);
        container.updateLabels();
    });

    toggleCam.setState(ToggleCam.STATES.TOP_DOWN);
    scene.renderer.setAnimationLoop(animate);

    function animate() {
        render();
        orientationTool.update(scene.scene);
    }

    function render() {
        if (toggleCam.getState() === ToggleCam.STATES.FREE) {
            scene.renderer.render(scene.scene, scene.camera);
        } else {
            updateOrthoCam();
            scene.renderer.render(scene.scene, scene.orthoCam);
        }
    }
}
