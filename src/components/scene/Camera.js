import * as THREE from "three";
import { ToggleCam } from "../ui/ToggleCam.js";

export function setupCamera(scene, container, toggleCam, orientationTool) {
    const orthoCam = new THREE.OrthographicCamera();
    orthoCam.position.x = container.planeContainer.position.x;
    orthoCam.position.y = 4;
    orthoCam.position.z = container.planeContainer.position.z;
    orthoCam.rotation.set(-Math.PI / 2, 0, 0);
    scene.orthoCam = orthoCam;

    let camLabel = document.getElementById('cam-label');

    toggleCam.element.addEventListener('toggle', () => {
        container.setCameraMode(toggleCam.getState());

        const { width, height } = scene.getRendererSize();
        const selectedPlane = container.controls.selectedPlane;
        const planeContainer = container.planeContainer;
        if (toggleCam.getState() === ToggleCam.STATES.TOP_DOWN) {
            if (selectedPlane) {
                planeContainer.deselectPlane(selectedPlane);
                planeContainer.focusPlane(selectedPlane);

                if (width < height)
                    planeContainer.setScaleOrientation(true);
                else
                    planeContainer.setScaleOrientation(false);
            }
            scene.scene.remove(scene.grid);
            container.marchingCubes.setIsosurfacesVisible(false);

            camLabel.textContent = 'Click for Free Camera';
        } else {
            planeContainer.unfocus();
            if (selectedPlane) {
                planeContainer.selectPlane(selectedPlane);
                planeContainer.setScaleOrientation(true);
            }
            scene.scene.add(scene.grid);
            container.marchingCubes.setIsosurfacesVisible(true);

            camLabel.textContent = 'Click for Top-Down Camera';
        }

        positionCamera();
    });

    function updateOrthoCam() {
        const { width, height } = scene.getRendererSize();

        if (width > height) {
            const ratio = width / height;
            orthoCam.left = -ratio;
            orthoCam.right = ratio;
            orthoCam.bottom = -1;
            orthoCam.top = 1;
        } else {
            const ratio = height / width;
            orthoCam.bottom = -ratio;
            orthoCam.top = ratio;
            orthoCam.left = -1;
            orthoCam.right = 1;
        }

        orthoCam.updateProjectionMatrix();
    }

    function positionCamera() {
        if (toggleCam.getState() === ToggleCam.STATES.FREE) {
            const selectedPlane = container.controls.selectedPlane;
            const controls = container.controls;
            const planeContainer = container.planeContainer;

            const DEG2RAD = Math.PI / 180;

            const { width, height } = scene.getRendererSize();

            const cam = scene.camera;
            cam.position.x = orthoCam.position.x;
            cam.position.z = orthoCam.position.z;

            const targetWidth = width > height ? planeContainer.width : planeContainer.width / cam.aspect;
            const startY = selectedPlane ? selectedPlane.position.y : 0;
            cam.position.y = startY + (targetWidth / 2) / Math.tan((cam.fov * DEG2RAD) / 2);

            cam.rotation.set(-Math.PI / 2, 0, 0);
            controls.target.set(planeContainer.position.x, startY, planeContainer.position.z);

            orientationTool.controls.connect();
        } else {
            const pos = orientationTool.helperCamera.position;
            const dist = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
            orientationTool.helperCamera.position.set(0, dist, 0);
            orientationTool.controls.update();
            orientationTool.controls.disconnect();
        }
    }

    return { updateOrthoCam, positionCamera };
}
