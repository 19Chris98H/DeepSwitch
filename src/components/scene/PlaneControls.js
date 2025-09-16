import {OrbitControls} from "three/addons";

import {MOUSE} from "three";
import * as THREE from "three";

// this might break if the _STATE enum in OrbitControls gets updated
const _CUSTOM_STATE = {PLANE_PAN: 7};

export default class PlaneControls extends OrbitControls {
    constructor(object, domElement = null, planeContainer, scene) {
        super(object, domElement);

        this.planeContainer = planeContainer;
        this.scene = scene; // needed for renderer dimensions

        this.target.set(0.5, 0, 0);

        // disabling screen space panning prevents panning up and down
        // a different solution might be preferable
        this.screenSpacePanning = false;

        // disable the built-in middle mouse click handling
        this.mouseButtons = { LEFT: MOUSE.ROTATE, MIDDLE: -1, RIGHT: MOUSE.PAN };

        // save built-in method so it can be invoked when injecting custom handling for middle mouse panning
        this._superOnMouseDown = this._onMouseDown;
        this._onMouseDown = this.onMouseDown.bind(this);

        this._superOnMouseMove = this._onMouseMove;
        this._onMouseMove = this.onMouseMove.bind(this);

        this._superHandleMouseDownRotate = this._handleMouseDownRotate
        this._handleMouseDownRotate = this.handleMouseDownRotate.bind(this);

        this._planePanStart = 0;
        this.selectedPlane = null;
    }

    handleMouseDownRotate(event) {
        this._superHandleMouseDownRotate(event);

        this.dispatchEvent({type: 'panStart', pointerEvent: event});
    }

    onMouseDown(event) {
        this._superOnMouseDown(event);

        // middle mouse button
        if (event.button === 1) {
            this._handlePlanePanningDown(event);
            this.state = _CUSTOM_STATE.PLANE_PAN;
        }
    }

    onMouseMove(event) {
        this._superOnMouseMove(event);

        if (this.state === _CUSTOM_STATE.PLANE_PAN) {
            this._handlePlanePanningMove(event);
        }
    }

    _handlePlanePanningDown(event) {
        this._planePanStart = event.clientY;
    }

    _handlePlanePanningMove(event) {
        const rendererY = this.scene.getRendererPosition().y;
        const rendererHeight = this.scene.getRendererSize().height;

        // 0 at the bottom, 1 at the top
        let startY = (this._planePanStart - rendererY) / rendererHeight;
        let endY = (event.clientY - rendererY) / rendererHeight;
        startY = Math.min(Math.max(0, startY), 1);
        endY = Math.min(Math.max(0, endY), 1);

        let delta = startY - endY;
        delta *= this.planeContainer.height; // scale relative delta by the height of the container

        const planes = this.planeContainer.children;
        if (planes.length === 0) return;

        // store y for convenience of comparisons, store plane to set this.selectedPlane
        let closest = {y: this.target.y, plane: null};
        for (let i = 0; i < planes.length; i++) {
            const plane = planes[i];

            if (this.selectedPlane && plane.uuid === this.selectedPlane.uuid) continue;

            // assuming camera (this.object) position is already in world position
            const planePosition = new THREE.Vector3();
            plane.getWorldPosition(planePosition);

            if ((delta > 0 && planePosition.y > this.target.y // highest plane above that's still in delta interval
                && planePosition.y <= this.target.y + delta && planePosition.y > closest.y)
                || (delta < 0 && planePosition.y < this.target.y // lowest plane below that's still in delta interval
                && planePosition.y >= this.target.y + delta && planePosition.y < closest.y)) {

                    closest.y = planePosition.y;
                    closest.plane = plane;
            }
        }

        if (closest.plane) {
            // set current mouse position as new starting point and update selected plane
            this._planePanStart = event.clientY;
            this.moveToPlane(closest.plane);
        }
    }

    moveToHeight(height) {
        // camera position is updated by the offset between old target and new target
        this.object.position.y += height - this.target.y;
        this.target.y = height;
    }

    moveToPlane(plane) {
        this.moveToHeight(plane.position.y);

        if (this.selectedPlane)
            this.planeContainer.deselectPlane(this.selectedPlane);
        this.planeContainer.selectPlane(plane);

        this.selectedPlane = plane;
        // recache block to start from new selected plane outward
        this.planeContainer.dataManager.cacheCurrentBlock();

        this.update();
    }

    followPlane(plane) {
        if (this.selectedPlane && this.selectedPlane === plane) {
            this.moveToPlane(plane);
        }
    }
}
