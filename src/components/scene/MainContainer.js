import * as THREE from "three";
import Timeline, {TimelineLabel} from "./Timeline";
import PlaneContainer from "./PlaneContainer";
import DataUtils from "../../utils/DataUtils";
import {MarchingCubes} from "./MarchingCubes";
import PlaneControls from "./PlaneControls";
import {ToggleCam} from "../ui/ToggleCam";
import ModeIndicator from "./ModeIndicator";
import ColorHelper from "../../utils/ColorHelper";

const _changeEvent = {type: 'change'};
const _changeRangeEvent = {type: 'changeRange'};

export default class MainContainer extends THREE.Object3D {

    mode = DataUtils.MODE.SPACE;
    extremaMode = DataUtils.EXTREMA_MODE.GLOBAL;
    licMode = DataUtils.LIC_MODE.OFF;
    cameraMode = ToggleCam.STATES.FREE;

    pointerHasMoved = false;
    pointerDownInTopDown = false;

    visibleButton = null;

    constructor(scene, rangeline, pointline, width = 1, height = 1, dataManager) {
        super();

        this.verticalLabel = document.getElementById('space-label');
        this.horizontalLabel = document.getElementById('time-label');

        this.isovalueLable = document.getElementById('isovalue-label');

        // mode starts in SPACE
        this.min = DataUtils.LEVELS[0];
        this.max = DataUtils.LEVELS[DataUtils.LEVELS.length - 1];

        this.minTime = 0;
        this.maxTime = DataUtils.TIMES.length - 1;

        this.scene = scene;
        this.rangeline = rangeline;
        this.pointline = pointline;
        this.width = width;
        this.height = height;

        rangeline.bind('change.main', this.onChanged.bind(this));
        rangeline.bind('update.main', this.onUpdate.bind(this));

        pointline.bind('change.main', this.onPointChanged.bind(this));
        pointline.bind('update.main', this.onPointUpdate.bind(this));

        // visualizes the x/y-bounds as a plane on the "floor"
        //const debugPlane = new THREE.Mesh(new THREE.PlaneGeometry(width, width), new THREE.MeshBasicMaterial({color: 0xaaaaaa}));
        //debugPlane.rotation.x = -Math.PI / 2;
        //this.add(debugPlane);

        // half as wide as the third that it occupies
        this.timeline = new Timeline(scene.camera, width / 24, height, this.min, this.max);
        // 3/4 in first third (3/12), origin of container is centered (- width / 2)
        this.timeline.position.x = (3/12) * width - width / 2;
        this.add(this.timeline);

        this.modeIndicator = new ModeIndicator(this.timeline.width * 3);
        this.modeIndicator.position.set(this.timeline.position.x, this.timeline.height + this.timeline.width * 2);
        this.add(this.modeIndicator);

        // occupies the latter two thirds of the main container
        this.planeContainer = new PlaneContainer(2/3 * width, height, scene, dataManager, this.pointline);
        // origin is centered in said two thirds
        this.planeContainer.position.x = 2/3 * width - width / 2;
        this.add(this.planeContainer);

        this.controls = new PlaneControls(scene.camera, scene.renderer.domElement, this.planeContainer, scene);
        this.controls.update();

        // updated before first use, so constructor arguments can be left empty
        this.raycaster = new THREE.Raycaster();

        const threejsContainer = document.getElementById('threejs-container');

        threejsContainer.addEventListener('pointerdown', this.onPointerDown.bind(this));
        threejsContainer.addEventListener('pointerup', this.onPointerUp.bind(this));
        threejsContainer.addEventListener('pointermove', this.onPointerMove.bind(this));
        this.pointer = new THREE.Vector2();

        this.dataManager = dataManager;
        this.dataManager.setMainContainer(this);
        this.dataManager.setExtremaMode(this.extremaMode);
        this.dataManager.setMode(this.mode);
        this.dataManager.cacheCurrentBlock();

        this.marchingCubes = new MarchingCubes(this);

        this.initColorLegend();

        this.updateTimeline();
    }

    initColorLegend() {
        const dropdown = document.getElementById('dropdown');

        dropdown.addEventListener('change', this.drawColorLegend.bind(this));
        window.addEventListener('resize', this.resizeColorLegendCanvas.bind(this));

        // update when parameter shelf is unhidden for the first time
        const toggleButton = document.querySelector('.parameterHideToggle-button');
        toggleButton.addEventListener('toggle', this.resizeColorLegendCanvas.bind(this));
    }

    resizeColorLegendCanvas() {
        const canvas = document.getElementById('colormap-canvas');

        // Set the canvas width to match the parent's computed width
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        this.drawColorLegend();
    }

    drawColorLegend() {
        const dropdown = document.getElementById('dropdown');
        const canvas = document.getElementById('colormap-canvas');
        const context = canvas.getContext('2d');

        const width = canvas.width;
        const height = canvas.height;
        if (width === 0 || height === 0) return; // when hidden

        const imageData = context.createImageData(width, height);
        const colorMode = parseInt(dropdown.value);

        for (let x = 0; x < width; x++) {
            const value = x / (width - 1);
            let color = ColorHelper.colorModeColor(colorMode, value);

            for (let y = 0; y < height; y++) {
                const index = (y * width + x) * 4;
                imageData.data[index] = color[0] * 255;
                imageData.data[index + 1] = color[1] * 255;
                imageData.data[index + 2] = color[2] * 255;
                imageData.data[index + 3] = 255;
            }
        }

        context.putImageData(imageData, 0, 0);
        this.updateLabels();
    };

    updateLabels() {
        let [leftValue, rightValue] = this.dataManager.getExtrema();
        const middleValue = parseFloat((((rightValue - leftValue) * 0.5) + leftValue).toFixed(2));
        leftValue = parseFloat(leftValue.toFixed(2));
        rightValue = parseFloat(rightValue.toFixed(2));

        let unit = DataUtils.getUnit();

        document.getElementById('label-left').innerText = leftValue + " " + unit;
        document.getElementById('label-middle').innerText = middleValue + " " + unit;
        document.getElementById('label-right').innerText = rightValue + " " + unit;

        const canvasWidth = document.getElementById('colormap-canvas').width;
        document.getElementById('marker-left').style.left = '0px';
        document.getElementById('marker-middle').style.left = (canvasWidth / 2) + 'px';
        document.getElementById('marker-right').style.left = (canvasWidth - 2) + 'px';

        document.getElementById('label-left').style.left = '0px';
        document.getElementById('label-middle').style.left = (canvasWidth / 2) + 'px';
        document.getElementById('label-right').style.left = (canvasWidth - 2) + 'px';

        this.isovalueLable.innerText = "Isovalue (" + unit + "):";
    }

    setMode(mode) {
        if (this.mode === mode) return;
        this.mode = mode;

        this.dataManager.abortAllSliceCaching();

        let selectedPlane = this.controls.selectedPlane;
        let pointlineValue = this.pointline.noUiSlider.get();

        // use the selected plane to find out what the pointline needs to be set to after switch
        let pointlineStart = null;
        if (selectedPlane) {
            if (mode === DataUtils.MODE.TIME) {
                let level = this.relativeToLevel(selectedPlane.position.y / this.height);
                pointlineStart = DataUtils.closestLevel(level);
            } else {
                pointlineStart = this.planeContainer.relativeToTime(selectedPlane.position.y / this.height);
            }
        }

        this.dataManager.setMode(mode);
        this.planeContainer.setMode(mode);
        this.rangeline.setMode(mode);
        this.pointline.setMode(mode, pointlineStart);
        this.modeIndicator.setMode(mode);

        this.marchingCubes.setIsosurfacesVisible(true);

        if (mode === DataUtils.MODE.TIME) {
            this.setMin(0, false);
            this.setMax(DataUtils.TIMES.length - 1, false);

            let times = [];
            for (let i = 0; i < DataUtils.TIMES.length; i += 2) {
                times.push(DataUtils.TIMES[i]);
            }

            if (selectedPlane) {
                let relative = this.planeContainer.timeToRelative(pointlineValue);
                this.createPlane(relative).then((plane) => {
                    this.controls.moveToPlane(plane);
                });
            }
            this.verticalLabel.textContent = 'Time';
            this.horizontalLabel.textContent = 'Depth';
        } else if (mode === DataUtils.MODE.SPACE) {
            this.setMin(DataUtils.LEVELS[0], false);
            this.setMax(DataUtils.LEVELS[DataUtils.LEVELS.length - 1], false);

            if (selectedPlane) {
                let relative = this.levelToRelative(pointlineValue);
                this.createPlane(relative).then((plane) => {
                    this.controls.moveToPlane(plane);
                });
            }
            this.verticalLabel.textContent = 'Depth';
            this.horizontalLabel.textContent = 'Time';
        } else {
            console.log('ERROR: unknown mode');
        }

        // cache current block in case it was aborted before it could finish (as a slice) earlier in this method
        this.dataManager.cacheCurrentBlock();

        // updating isosurfaces is unnecessary here, since it already happens in onPointChanged
        this.updateLabels();
        this.updateTimeline();
        this.updateSlideLabel();
    }

    setModeExtrema(mode) {
        if (this.extremaMode === mode) return;
        this.extremaMode = mode;

        this.dataManager.setExtremaMode(this.extremaMode);
        this.planeContainer.updatePlanesTexture();
        this.marchingCubes.setMeshColors();
        this.updateLabels();
    }

    setModeLIC(mode) {
        if (this.licMode === mode) return;
        this.licMode = mode;

        this.planeContainer.setLicMode(mode);
        this.planeContainer.updateLicMode();

        // changing LIC mode is like an attribute change, so everything has to be cached
        this.dataManager.abortCaching();
        this.dataManager.cacheCurrent();
    }

    async createPlane(relativeHeight) {
        let createdPlane, timestamp, level;
        if (this.mode === DataUtils.MODE.SPACE) {
            let value = this.relativeToLevel(relativeHeight)
            level = DataUtils.closestLevel(value);

            timestamp = this.pointline.noUiSlider.get();

            if (this.planeContainer.hasPlane(timestamp, level)) return;
            createdPlane = await this.planeContainer.createPlane(timestamp, level);
            this.rangeline.addHandle(level);
        } else if (this.mode === DataUtils.MODE.TIME) {
            timestamp = this.planeContainer.relativeToTime(relativeHeight);

            level = this.pointline.noUiSlider.get();

            if (this.planeContainer.hasPlane(timestamp, level)) return;
            createdPlane = await this.planeContainer.createPlane(timestamp, level);
            this.rangeline.addHandle(timestamp);
        }

        this.dataManager.cacheCurrentSlicesAsBlocks();

        this.updateTimeline();
        this.dispatchEvent(_changeEvent);
        return createdPlane;
    }

    updateTimeline() {
        let labels;
        if (this.mode === DataUtils.MODE.SPACE) {
            labels = [new TimelineLabel(0, this.max.toString(), 1, [153, 187, 255]),
                new TimelineLabel(1, this.min.toString(), 1, [153, 187, 255])]
        } else if (this.mode === DataUtils.MODE.TIME) {
            labels = [new TimelineLabel(0, DataUtils.TIMES[this.minTime].toString(), 1, [153, 187, 255]),
                new TimelineLabel(1, DataUtils.TIMES[this.maxTime].toString(), 1, [153, 187, 255])]
        } else {
            console.log('ERROR: unknown mode');
        }

        let heights = [];
        for (const child of this.planeContainer.children) {
            const relativeHeight = child.position.y / this.height;
            heights.push(relativeHeight);

            let label;
            if (this.mode === DataUtils.MODE.SPACE) {
                let level = DataUtils.closestLevel(this.planeContainer.relativeToLevel(relativeHeight));
                label = new TimelineLabel(relativeHeight, level.toString(), 2, [16, 16, 16]);
            } else if (this.mode === DataUtils.MODE.TIME) {
                label = new TimelineLabel(relativeHeight, this.planeContainer.relativeToTime(relativeHeight), 2, [16, 16, 16]);
            } else {
                console.log('ERROR: unknown mode');
            }
            labels.push(label);
        }

        if (this.mode === DataUtils.MODE.SPACE) {
            for (let level of DataUtils.LEVELS) {
                if (level < this.min || level > this.max) continue;
                labels.push(new TimelineLabel(this.planeContainer.levelToRelative(level), level.toString(), 0, [153, 187, 255]));
            }
        } else if (this.mode === DataUtils.MODE.TIME) {
            for (let i = 0; i < DataUtils.TIMES.length; i++) {
                if (i < this.minTime || i > this.maxTime) continue;
                const timestamp = this.pointline.timeFormat.to(i);
                labels.push(new TimelineLabel(this.planeContainer.timeToRelative(timestamp), timestamp, 0, [153, 187, 255]));
            }
        } else {
            console.log('ERROR: unknown mode');
        }

        this.timeline.setTextureTicks(heights);
        this.timeline.setLabels(labels);
    }

    onChanged(values, handle, unencoded, tap, positions, noUiSlider) {
        if (this.mode === DataUtils.MODE.SPACE) {
            if (handle === values.length - 1) {
                this.setMax(values[handle], true);
            } else if (handle === 0) {
                this.setMin(values[handle], true);
            }
        } else if (this.mode === DataUtils.MODE.TIME) {
            if (handle === values.length - 1) {
                this.setMax(unencoded[handle], true);
            } else if (handle === 0) {
                this.setMin(unencoded[handle], true);
            }
        } else {
            console.log('ERROR: unknown mode');
        }

        // most single plane related things are handled in onUpdate, so only things that change based on the range
        // changing have to be handled here
        if (handle === 0 || handle === values.length - 1) {
            this.controls.followPlane(this.controls.selectedPlane);
            this.updateTimeline();

            // restart caching the current block, as the range has changed and early values might have already been skipped
            this.dataManager.cacheCurrentBlock();

            // the plane textures and labels only change if the extrema mode is set to local
            if (this.extremaMode === DataUtils.EXTREMA_MODE.LOCAL) {
                this.planeContainer.updatePlanesTexture();
                this.updateLabels();
            }
        } else {
            // only cache non-range handles
            this.dataManager.cacheCurrentSlicesAsBlocks();

            // changes index into handles to index into planes (since there is an extra range handle at the start)
            let index = handle - 1;
            const changedPlane = this.planeContainer.getSortedPlanes()[index];

            if (this.controls.selectedPlane === changedPlane) {
                // update block caching to start from the position of the selected plane outward
                this.dataManager.cacheCurrentBlock();
            }
        }

        this.dispatchEvent(_changeEvent);
    }

    setMin(newMin, triggerEvent) {
        if (this.mode === DataUtils.MODE.SPACE) {
            this.min = newMin;
            this.timeline.setBounds(this.min, this.max);
            this.planeContainer.setMin(this.min);
            if (triggerEvent) {
                this.dispatchEvent(_changeRangeEvent);
            }
        } else if (this.mode === DataUtils.MODE.TIME) {
            newMin = Math.round(newMin);
            this.minTime = newMin;
            this.planeContainer.setMin(this.minTime);
            if (triggerEvent) {
                this.dispatchEvent(_changeRangeEvent);
            }
        } else {
            console.log('ERROR: unknown mode');
        }
    }

    setMax(newMax, triggerEvent) {
        if (this.mode === DataUtils.MODE.SPACE) {
            this.max = newMax;
            this.timeline.setBounds(this.min, this.max);
            this.planeContainer.setMax(this.max);
            if (triggerEvent) {
                this.dispatchEvent(_changeRangeEvent);
            }
        } else if (this.mode === DataUtils.MODE.TIME) {
            newMax = Math.round(newMax);
            this.maxTime = newMax;
            this.planeContainer.setMax(this.maxTime);
            if (triggerEvent) {
                this.dispatchEvent(_changeRangeEvent);
            }
        } else {
            console.log('ERROR: unknown mode');
        }
    }

    setCameraMode(mode) {
        this.cameraMode = mode;
        this.planeContainer.setCameraMode(mode);
    }

    onUpdate(values, handle, unencoded, tap, positions, noUiSlider) {
        // enforce constraint if necessary and do not continue if it was enforced,
        // as a new event with updated variables will be fired
        if (this.rangeline.enforceConstraint(values, handle)) return;

        if (handle === 0 || handle === values.length - 1) return;

        // changes index into handles to index into planes (since there is an extra range handle at the start)
        let index = handle - 1;

        // restart caching since plane position changed
        const slices = this.planeContainer.getAllPlaneValues();
        slices.splice(index, 1); // don't include the plane that is currently updating, it will be included in onChanged
        this.dataManager.cacheSlicesAsBlocks(slices);

        let updatedPlane;
        if (this.mode === DataUtils.MODE.SPACE) {
            let timestamp = this.pointline.noUiSlider.get();

            updatedPlane = this.planeContainer.updatePlane(index, timestamp, values[handle]);
        } else if (this.mode === DataUtils.MODE.TIME) {
            let level = this.pointline.noUiSlider.get();

            updatedPlane = this.planeContainer.updatePlane(index, values[handle], level);
        } else {
            console.log('ERROR: unknown mode');
            return;
        }

        // this is just insurance, since this part of the code defines the canonical correlation between planes
        // and handles, so we set it here on update in case the mapping gets mixed somehow
        if (updatedPlane === this.controls.selectedPlane) {
            this.rangeline.selectHandle(handle);
        } else {
            this.rangeline.deselectHandle(handle);
        }

        this.controls.followPlane(updatedPlane);
        if (!this.controls.selectedPlane) {
            this.controls.moveToPlane(updatedPlane);
        }

        this.updateTimeline();
        this.dispatchEvent(_changeEvent);
    }

    onPointUpdate(values, handle, unencoded, tap, positions, noUiSlider) {
        if (!this.planeContainer) return;

        this.planeContainer.updatePlanes(values[0]);
        if (this.marchingCubes.visible)
            this.marchingCubes.setIsosurfacesVisible(false);

        // while moving the point slider, the caching of the block that was previously selected should be aborted
        // until caching of the new block is started in onPointChanged
        this.dataManager.abortBlockCaching();

        this.updateLabels();
    }

    onPointChanged(values, handle, unencoded, tap, positions, noUiSlider) {
        if (this.cameraMode !== ToggleCam.STATES.TOP_DOWN)
            this.marchingCubes.setIsosurfacesVisible(true);

        this.dataManager.cacheCurrentBlock();
        // restart slice caching to make sure they start from the current block outward again
        this.dataManager.cacheCurrentSlicesAsBlocks();
    }

    relativeToLevel(relativeHeight) {
        return this.max - relativeHeight * (this.max - this.min);
    }

    levelToRelative(level) {
        return (this.max - level) / (this.max - this.min);
    }

    removeClosestPlane(relativeHeight) {
        let cameraHeight;
        if (this.controls.selectedPlane)
            cameraHeight = this.controls.selectedPlane.position.y;
        else
            cameraHeight = 0;

        if (this.mode === DataUtils.MODE.SPACE) {
            relativeHeight = this.planeContainer.removeClosestPlane(relativeHeight);
            if (!relativeHeight) return;

            const level = DataUtils.closestLevel(this.planeContainer.relativeToLevel(relativeHeight));
            this.rangeline.removeHandle(level);
        } else if (this.mode === DataUtils.MODE.TIME) {
            relativeHeight = this.planeContainer.removeClosestPlane(relativeHeight);
            if (!relativeHeight) return;

            const timestamp = this.planeContainer.relativeToTime(relativeHeight)
            this.rangeline.removeHandle(timestamp);
        } else {
            console.log('ERROR: unknown mode');
        }

        // plane was removed
        if (!this.planeContainer.children.includes(this.controls.selectedPlane)) {
            if (this.planeContainer.children.length === 0) {
                this.controls.selectedPlane = null;
                this.controls.moveToHeight(0);
            } else {
                let closest = this.planeContainer.children[0];
                let closestDistance = Math.abs(closest.position.y - cameraHeight);
                for (const plane of this.planeContainer.children) {
                    let distance = Math.abs(plane.position.y - cameraHeight);
                    if (distance < closestDistance) {
                        closest = plane;
                        closestDistance = distance;
                    }
                }
                this.controls.moveToPlane(closest);
            }
        }

        // restart slice caching since a slice was removed
        this.dataManager.cacheCurrentSlicesAsBlocks();

        this.updateTimeline();
        this.dispatchEvent(_changeEvent);
    }

    onPointerMove(event) {
        const { x, y } = this.scene.getRendererPosition();
        const { width, height } = this.scene.getRendererSize();

        this.pointerHasMoved = true;

        this.pointer.x = ((event.clientX - x) / width) * 2 - 1;
        this.pointer.y = -((event.clientY - y) / height) * 2 + 1;

        this.hoverBehavior();
    }

    hoverBehavior() {
        const pointer = this.pointer;
        if (pointer.x < -1 || pointer.y < -1 || pointer.x > 1 || pointer.y > 1) return;

        const camera = this.cameraMode === ToggleCam.STATES.FREE ?
            this.scene.camera : this.scene.orthoCam;
        this.raycaster.setFromCamera(pointer, camera);

        let objects = [];
        if (this.cameraMode === ToggleCam.STATES.FREE)
            objects.push(this.timeline); // only intersect with camera in free camera mode
        // add all hoverboxes and planes
        for (const plane of this.planeContainer.children) {
            objects.push(plane);
            if (this.cameraMode === ToggleCam.STATES.FREE)
                objects.push(plane.deleteButton.hoverBox); // only intersect with hoverboxes in free camera mode
        }

        const intersections = this.raycaster.intersectObjects(objects, false);

        if (intersections.length === 0) {
            if (this.visibleButton) {
                this.visibleButton.setVisibility(false);
                this.visibleButton = null;
            }

            this.setColorPicker([0, 0, 0], 0, '');

            this.timeline.removeHoverTick();
        } else {
            const hit = intersections[0];

            let button = null;
            if (hit.object.type === 'Plane') {
                if (this.cameraMode === ToggleCam.STATES.FREE)
                    button = hit.object.deleteButton;

                this.colorPick(hit).then((result) => {
                    const { color, alpha, value } = result;
                    this.setColorPicker(color, alpha, value);
                });
            // these latter two objects types can only occur in free camera mode
            } else if (hit.object.type === 'PlaneDeleteButtonHoverBox') {
                button = hit.object.parent;
            } else if (hit.object.type === 'Timeline') {
                const hitHeight = Math.min(Math.max(hit.uv.y, 0), 1);
                const height = this.snapRelativeHeight(hitHeight);
                this.timeline.setHoverTick(height);
            }

            if (button)
                button.setVisibility(true);

            if (this.visibleButton && this.visibleButton !== button)
                this.visibleButton.setVisibility(false);
            this.visibleButton = button;
        }
    }

    snapRelativeHeight(relativeHeight) {
        if (this.mode === DataUtils.MODE.SPACE) {
            let level = DataUtils.closestLevel(this.planeContainer.relativeToLevel(relativeHeight));
            relativeHeight = this.planeContainer.levelToRelative(level);
        } else {
            let time = this.planeContainer.relativeToTime(relativeHeight);
            relativeHeight = this.planeContainer.timeToRelative(time);
        }

        return relativeHeight;
    }

    async colorPick(hit) {
        const plane = hit.object;
        const attribute = DataUtils.getCurrentAttribute();

        if (attribute === 'uv') {
            // in LIC mode, scalar data might not be updated correctly to reflect the current slice
            return {color: [0, 0, 0], alpha: 0, value: null};
        }

        if (!plane.material.uniforms) {
            // if there are no uniforms, then this plane still has the loading material and is therefore invisible,
            // just set the color picker invisible like it hit land (or nothing)
            return {color: [0, 0, 0], alpha: 0, value: null};
        }
        const image = plane.material.uniforms.scalarData.value.image;

        const uv = hit.uv;
        const x = Math.round(uv.x * (image.width - 1));
        const y = Math.round(uv.y * (image.height - 1));

        const imageIndex = (y * image.width + x) * 4;
        const colorValue = image.data[imageIndex];

        const colorMode = parseInt(document.getElementById('dropdown').value);
        // take colorValue to ensure the colorPicker is showing the same color as the shader
        const color = ColorHelper.colorModeColor(colorMode, colorValue / 255);

        const relativeHeight = plane.position.y / this.height;

        let timestamp, level;
        if (this.mode === DataUtils.MODE.SPACE) {
            level = DataUtils.closestLevel(this.planeContainer.relativeToLevel(relativeHeight));
            timestamp = this.pointline.noUiSlider.get();
        } else {
            timestamp = this.planeContainer.relativeToTime(relativeHeight);
            level = this.pointline.noUiSlider.get();
        }

        // data layer should be cached, so this shouldn't take long
        const data = await this.dataManager.getDataLayer(attribute, timestamp, level);
        const dataIndex = y * image.width + x; // image should have same dimensions as data layer
        const value = data[dataIndex]; // actual value in the layer
        const isLand = isNaN(value);

        if (isLand)
            return {color: [0, 0, 0], alpha: 0, value: null};

        return {color: color, alpha: 255, value: value};
    }

    setColorPicker(color, alpha, value, labelId='color-picker-label', canvasId='color-picker-canvas') {
        const label = document.getElementById(labelId);

        if (labelId === 'saved-color-picker-label' && canvasId === 'saved-color-picker-canvas') {
            if (alpha === 0) {
                document.getElementById('color-picker-container').style.transform = '';
            } else {
                document.getElementById('color-picker-container').style.transform = 'translate(110px, 0)';
            }
        }

        const unit = DataUtils.getUnit();

        if (value)
            label.textContent = value.toFixed(2) + (unit ? ' ' + unit : '');
        else
            label.textContent = '';

        const canvas = document.getElementById(canvasId);
        const context = canvas.getContext('2d');

        const width = canvas.width;
        const height = canvas.height;
        const imageData = context.createImageData(width, height);

        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                const index = (y * width + x) * 4;
                imageData.data[index] = color[0] * 255;
                imageData.data[index + 1] = color[1] * 255;
                imageData.data[index + 2] = color[2] * 255;
                imageData.data[index + 3] = alpha;
            }
        }

        context.putImageData(imageData, 0, 0);
    }

    onPointerDown(event) {
        this.pointerHasMoved = false;
    }

    onPointerUp(event) {
        // ignore input if the cursor moved between pressing and releasing to avoid mis-inputs when dragging camera
        if (this.pointerHasMoved) return;

        const pointer = this.pointer;

        // out of bounds
        if (pointer.x < -1 || pointer.y < -1 || pointer.x > 1 || pointer.y > 1) return;

        const camera = this.cameraMode === ToggleCam.STATES.FREE ?
            this.scene.camera : this.scene.orthoCam;

        this.raycaster.setFromCamera(pointer, camera);
        if (event.button === 0) { // left click
            if (this.pointerDownInTopDown) {
                this.pointerDownInTopDown = false;
                return;
            }
            this.handleLeftClick();
        } else if (event.button === 2) { // right click
            this.handleRightClick();
        }
    }

    handleRightClick() {
        const intersections = this.raycaster.intersectObjects(this.planeContainer.children, false);
        if (intersections.length === 0) {
            this.setColorPicker([0, 0, 0], 0, null,
                'saved-color-picker-label', 'saved-color-picker-canvas');
            return;
        }

        const hit = intersections[0];
        this.colorPick(hit).then((result) => {
            const {color, alpha, value} = result;
            this.setColorPicker(color, alpha, value,
                'saved-color-picker-label', 'saved-color-picker-canvas');
            document.getElementById('isovalue').value = value.toFixed(2);
        });
    }

    handleLeftClick() {
        let objects = [this.timeline];
        for (const plane of this.planeContainer.children) {
            objects.push(plane);
            for (const child of plane.children) {
                if (child.type === 'PlaneDeleteButton') {
                    objects.push(child);
                }
            }
        }

        const intersections = this.raycaster.intersectObjects(objects, false);
        if (intersections.length === 0) return;

        const hit = intersections[0];
        if (hit.object.type === 'Timeline') {
            // the UV y-coordinate is in the range [0, 1] from bottom to top of the timeline
            // and is therefore a sort of "relative height"
            // clamp for insurance
            const hitHeight = Math.min(Math.max(hit.uv.y, 0), 1);

            this.createPlane(hitHeight);
        } else if (hit.object.type === 'Plane') {
            this.controls.moveToPlane(hit.object);
        } else if (hit.object.type === 'PlaneDeleteButton') {
            let plane = hit.object.parent;
            this.removeClosestPlane(plane.position.y / this.height);
        }
    }

    updateSlideLabel() {
        const label1 = document.getElementById("middle-label1");
        const label2 = document.getElementById("middle-label2");
        label1.style.display = this.mode === DataUtils.MODE.SPACE ? "block" : "none";
        label2.style.display = this.mode === DataUtils.MODE.TIME ? "block" : "none";
    }

    getBlockInRange() {
        const handles = this.rangeline.noUiSlider.get(true);
        const lowerIndex = Math.floor(handles[0]);
        const upperIndex = Math.floor(handles[handles.length - 1]);

        const block = this.mode === DataUtils.MODE.SPACE ? DataUtils.LEVELS : DataUtils.getFormattedTimestamps();
        return block.slice(lowerIndex, upperIndex + 1);
    }

    getSelectedCoordinates() {
        const selected = this.controls.selectedPlane;
        if (!selected) return [null, null];

        const relativeHeight = selected.position.y / this.height;
        const point = this.pointline.noUiSlider.get();

        const timestamp = this.mode === DataUtils.MODE.SPACE ? point : this.planeContainer.relativeToTime(relativeHeight);
        const level = this.mode === DataUtils.MODE.SPACE ?
            DataUtils.closestLevel(this.planeContainer.relativeToLevel(relativeHeight)) : point;

        return [timestamp, level];
    }
}
