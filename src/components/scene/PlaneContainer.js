import * as THREE from "three";
import noiseTextureUrl from '../../assets/img/noiseTexture.png';
import vsSpaceTimeCubeLayer from "../../shader/vsSpaceTimeCubeLayer.glsl";
import fsLIC from "../../shader/fsLIC.glsl";
import DataUtils from "../../utils/DataUtils";
import {LineGeometry, LineMaterial} from "three/addons";
import {Line2} from 'three/addons/lines/Line2.js';
import {viridisColors} from "../../assets/maps/ViridisTable";
import {autumnColors} from "../../assets/maps/AutumnTable";
import {divergent1Colors} from "../../assets/maps/Divergent1";
import {energyColors} from "../../assets/maps/Energy";
import {greenBrownColors} from "../../assets/maps/GreenBrown";
import {blueGreenColors} from "../../assets/maps/BlueGreen";
import {divergent2Colors1, divergent2Colors2} from "../../assets/maps/Divergent2";
import {ToggleCam} from "../ui/ToggleCam";
import PlaneDeleteButton from "./PlaneDeleteButton";
import PlaneScaleDisplay from "./PlaneScaleDisplay";
import ColorHelper from "../../utils/ColorHelper";

const _planeTextureEvent = {type: 'texture'};

export default class PlaneContainer extends THREE.Object3D {

    mode = DataUtils.MODE.SPACE;
    licMode = DataUtils.LIC_MODE.OFF;
    cameraMode = ToggleCam.STATES.FREE;

    hiddenPlanes = [];

    constructor(width = 1, height = 1, scene, dataManager, pointline) {
        super();

        this.dataManager = dataManager;
        this.planeRequests = new Map();
        this.pointline = pointline;

        this.width = width;
        this.height = height;
        this.scene = scene;

        this.min = DataUtils.LEVELS[0];
        this.max = DataUtils.LEVELS[DataUtils.LEVELS.length - 1];

        this.minTime = 0;
        this.maxTime = DataUtils.TIMES.length - 1;

        const textureLoader = new THREE.TextureLoader();
        this.baseTexture = textureLoader.load(
            noiseTextureUrl,
            () => console.log('Texture loaded'),
            undefined,
            (err) => console.error('Error:', err)
        );

        this.material = new THREE.ShaderMaterial({
            vertexShader: vsSpaceTimeCubeLayer,
            fragmentShader: fsLIC,
            glslVersion: THREE.GLSL3,
            transparent: true
        });
        this.material.side = THREE.DoubleSide;

        this.loadingMaterial = new THREE.MeshBasicMaterial({transparent: true, opacity: 0});

        this.dropdown = document.getElementById("dropdown");
        this.dropdown.addEventListener("change", () => {
            this.updatePlanesColorCoding();
            this.dataManager.mainContainer.setColorPicker([0,0,0], 0, "",
                'saved-color-picker-label', 'saved-color-picker-canvas');
        });

        this.dropdownAttribute = document.getElementById("dropdown-attribute");
        this.dropdownAttribute.addEventListener("change", () => {
            this.updatePlanesTexture();
            this.dataManager.mainContainer.updateLabels();
            this.dataManager.mainContainer.marchingCubes.deleteAllMeshs();
            
            this.dataManager.mainContainer.setColorPicker([0,0,0], 0, "",
                'saved-color-picker-label', 'saved-color-picker-canvas');

            this.dataManager.abortCaching(); // abort all caching and then cache the ones that are actually needed
            this.dataManager.cacheCurrent();
        });

        this.slider = document.getElementById('opacity-slider');
        this.initSlider();

        this.makeScaleDisplay();
    }

    makeScaleDisplay() {
        // approximate size of the scale, as a percentage of the plane container's size
        const TARGETED_SIZE = 0.25;
        const size = this.dataManager.SIZE_KM;
        const scaleSize = size * TARGETED_SIZE;
        const scaleLength = this.width * TARGETED_SIZE;
        const scaleHeight = 0.05;

        this.scaleDisplay = new PlaneScaleDisplay(scaleLength, scaleHeight, scaleSize, 'km');
        this.setScaleOrientation(true);
    }

    setScaleOrientation(horizontal) {
        let scale = this.scaleDisplay;
        if (horizontal) {
            scale.rotation.z = 0;
            scale.position.x = this.width / 2 - scale.length / 2;
            scale.position.y = -this.width / 2 - scale.height / 2;
            scale.flipLabel(false);
        } else {
            scale.rotation.z = -Math.PI / 2;
            scale.position.x = -this.width / 2 - scale.height / 2;
            scale.position.y = -this.width / 2 + scale.length / 2;
            scale.flipLabel(true);
        }
    }

    initSlider() {
        noUiSlider.create(this.slider, {
            start: 0.75,
            range: {
                min: 0,
                max: 1,
            },
            step: 0.01,
            connect: [true, false],
            orientation: 'horizontal',
            direction: 'ltr',
            tooltips: true,
            format: {
                to: (value) => value.toFixed(2),
                from: (value) => parseFloat(value),
            },
        });

        this.savedTransparency = 0.5;

        this.slider.noUiSlider.on("update", (values) => {
            const value = parseFloat(values[0]).toFixed(2);
            this.updatePlanesTransparency(value);
        });
    }

    setLicMode(mode) {
        if (this.licMode === mode) return;
        this.licMode = mode;
    }

    deselectPlane(plane) {
        const index = this.getSortedPlanes().indexOf(plane) + 1;
        this.parent.rangeline.deselectHandle(index);

        plane.remove(this.scaleDisplay);

        let toRemove = [];
        for (const child of plane.children) {
            // make sure to only remove selection lines
            if (child.type === 'Selection')
                toRemove.push(child);
        }

        for (const child of toRemove) {
            plane.remove(child);
            if (child.geometry) {
                child.geometry.dispose();
            }
            if (child.material && child.material !== this.loadingMaterial) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => mat.dispose());
                } else {
                    child.material.dispose();
                }
            }
        }
    }

    setCameraMode(mode) {
        this.cameraMode = mode;
    }

    selectPlane(plane) {
        if (this.cameraMode === ToggleCam.STATES.TOP_DOWN) return;

        plane.add(this.scaleDisplay);

        const index = this.getSortedPlanes().indexOf(plane) + 1;
        this.parent.rangeline.selectHandle(index);

        let geometry = plane.geometry;
        if (!geometry.isBufferGeometry) {
            geometry = new THREE.BufferGeometry().fromGeometry(geometry);
        }

        const vertices = geometry.attributes.position.array;
        const lineVertices = [];
        lineVertices.push(
            vertices[0], vertices[1], vertices[2],   // bottom-left
            vertices[3], vertices[4], vertices[5],   // bottom-right
            vertices[3], vertices[4], vertices[5],   // bottom-right
            vertices[9], vertices[10], vertices[11], // top-right
            vertices[9], vertices[10], vertices[11], // top-right
            vertices[6], vertices[7], vertices[8],   // top-left
            vertices[6], vertices[7], vertices[8],   // top-left
            vertices[0], vertices[1], vertices[2]    // back to bottom-left
        );

        const lineGeometry = new LineGeometry();
        lineGeometry.setPositions(lineVertices);
        const lineMaterial = new LineMaterial({
            color: 0xff0000,
            linewidth: 5,
            worldUnits: false
        });

        lineMaterial.resolution.set(window.innerWidth, window.innerHeight);
        const line = new Line2(lineGeometry, lineMaterial);
        line.computeLineDistances();
        line.type = 'Selection';
        plane.add(line);
    }

    setMax(newMax) {
        if (this.mode === DataUtils.MODE.SPACE) {
            let map = new Map();
            this.children.forEach(child => {
                map.set(child, this.relativeToLevel(child.position.y / this.height));
            });

            this.max = newMax;

            this.children.forEach(child => {
                child.position.y = this.levelToRelative(map.get(child)) * this.height;
            });
        } else if (this.mode === DataUtils.MODE.TIME) {
            let map = new Map();
            this.children.forEach(child => {
                map.set(child, this.relativeToTime(child.position.y / this.height));
            });

            this.maxTime = newMax;

            this.children.forEach(child => {
                child.position.y = this.timeToRelative(map.get(child)) * this.height;
            });
        } else {
            console.log('ERROR: unknown mode')
        }
    }

    setMin(newMin) {
        if (this.mode === DataUtils.MODE.SPACE) {
            let map = new Map();
            this.children.forEach(child => {
                map.set(child, this.relativeToLevel(child.position.y / this.height));
            });

            this.min = newMin;

            this.children.forEach(child => {
                child.position.y = this.levelToRelative(map.get(child)) * this.height;
            });
        } else if (this.mode === DataUtils.MODE.TIME) {
            let map = new Map();
            this.children.forEach(child => {
                map.set(child, this.relativeToTime(child.position.y / this.height));
            });

            this.minTime = newMin;

            this.children.forEach(child => {
                child.position.y = this.timeToRelative(map.get(child)) * this.height;
            });
        } else {
            console.log('ERROR: unknown mode');
        }
    }

    getSortedPlanes() {
        let planes = this.children;
        if (this.mode === DataUtils.MODE.SPACE) {
            planes.sort((a, b) => b.position.y - a.position.y);
        } else if (this.mode === DataUtils.MODE.TIME) {
            planes.sort((a, b) => a.position.y - b.position.y);
        } else {
            console.log('ERROR: unknown mode');
        }
        return planes;
    }

    updatePlane(index, timestamp, level) {
        let newPosition;
        if (this.mode === DataUtils.MODE.SPACE) {
            newPosition = this.levelToRelative(level) * this.height;
        } else if (this.mode === DataUtils.MODE.TIME) {
            let relative = this.timeToRelative(timestamp);
            newPosition = relative * this.height;
        } else {
            console.log('ERROR: unknown mode');
        }

        let plane = this.getSortedPlanes()[index];
        plane.position.y = newPosition;
        const requestId = Symbol();
        this.planeRequests.set(plane, requestId);

        this.updatePlaneTexture(plane, requestId, timestamp, level);

        return plane;
    }

    setMode(mode) {
        this.mode = mode;
        this.children = []; // clear on mode switch
    }

    relativeToLevel(relativeHeight) {
        return this.max - relativeHeight * (this.max - this.min);
    }

    levelToRelative(level) {
        return (this.max - level) / (this.max - this.min);
    }

    relativeToTime(relative) {
        let index = this.minTime + Math.round(relative * (this.maxTime - this.minTime));
        index = Math.round(index); // second round because of the addition
        return this.parent.pointline.timeFormat.to(index);
    }

    timeToRelative(time) {
        const index = this.parent.pointline.timeFormat.from(time);
        return (index - this.minTime) / (this.maxTime - this.minTime);
    }

    relativeToValue(relativeHeight) {
        if (this.mode === DataUtils.MODE.SPACE) {
            return DataUtils.closestLevel(this.relativeToLevel(relativeHeight));
        } else if (this.mode === DataUtils.MODE.TIME) {
            return this.relativeToTime(relativeHeight);
        } else {
            console.log('ERROR: unknown mode');
        }
    }

    hasPlane(timestamp, level) {
        const epsilon = 1e-8;

        let relativeHeight;
        if (this.mode === DataUtils.MODE.SPACE) {
            if (this.pointline.noUiSlider.get() !== timestamp) return false;

            relativeHeight = this.levelToRelative(level);
        } else if (this.mode === DataUtils.MODE.TIME) {
            if (this.pointline.noUiSlider.get() !== level) return false;

            relativeHeight = this.timeToRelative(timestamp);
        }

        let exists = false;
        for (const plane of this.children) {
            let planeHeight = plane.position.y / this.height;
            if (Math.abs(relativeHeight - planeHeight) <= epsilon) {
                exists = true;
                break;
            }
        }
        return exists;
    }

    async createPlane(timestamp, level) {
        const geometry = new THREE.PlaneGeometry(this.width, this.width);
        // create plane with a temporary material first, so state is updated without having to wait for the texture,
        // which feels much more responsive
        let plane = new THREE.Mesh(geometry, this.loadingMaterial);
        plane.type = 'Plane';

        // we don't need to fetch the actual texture here, as the main container createPlane method will add a new
        // handle which will call onUpdate which will call updatePlane which will call updatePlaneTexture which
        // will get and set the correct data
        // otherwise we have a duplicate request

        let relativeHeight;
        if (this.mode === DataUtils.MODE.SPACE) {
            relativeHeight = this.levelToRelative(level);
        } else if (this.mode === DataUtils.MODE.TIME) {
            relativeHeight = this.timeToRelative(timestamp);
        }

        plane.rotation.x = -Math.PI / 2; // face up
        plane.position.y = relativeHeight * this.height; // translate relative height to local y-position

        const buttonWidth = this.width * 0.1;
        const buffer = buttonWidth * 0.15;
        const deleteButton = new PlaneDeleteButton(buttonWidth, buttonWidth + buffer * 2.1);
        deleteButton.position.x = this.width / 2 + buttonWidth / 2 + buffer;
        deleteButton.position.y = -this.width / 2 + buttonWidth / 2;
        deleteButton.setVisibility(false);

        plane.deleteButton = deleteButton;
        plane.add(deleteButton);

        this.add(plane);
        return plane;
    }

    createNewPlaneMaterial(scalarData, vectorData) {
        const xValues = new Array(256).fill(0);
        const colorValues = new Float32Array(256 * 3);
        let colorMapLength = 0;
        const customColorMapIndex = Number(this.dropdown.value) - 12;
        if (customColorMapIndex >= 0)
        {
            const { xs, colors } = ColorHelper.getCustomColorMapValues(customColorMapIndex);
            colorMapLength = xs.length;
            for (let i = 0; i < colorMapLength; i++) {
                xValues[i] = xs[i];
                colorValues[i * 3] = colors[i][0];
                colorValues[i * 3 + 1] = colors[i][1];
                colorValues[i * 3 + 2] = colors[i][2];
            }
        }

        // LEGACY: This part reflects incremental development decisions.
        // It should be redesigned for better maintainability in the future.
        // See ColorHelper.js for further information
        const uniform = {
            vectorData: {value: vectorData},
            scalarData: {value: scalarData},
            size: {value: new THREE.Vector2(2, 2)},
            tex: {value: this.baseTexture},
            licMode: {value: this.licMode === DataUtils.LIC_MODE.OFF ? 0 : 1},
            STEPS: {value: 20},
            alpha: {value: this.slider.noUiSlider.get()},
            colorMode: { value: Number(this.dropdown.value) },
            viridis: { type: 'v3v', value: viridisColors.map(c => new THREE.Vector3(...c)) },
            autumnColors: { type: 'v3v', value: autumnColors.map(c => new THREE.Vector3(...c)) },
            divergent1Colors: { type: 'v3v', value: divergent1Colors.map(c => new THREE.Vector3(...c)) },
            divergent2Colors1: { type: 'v3v', value: divergent2Colors1.map(c => new THREE.Vector3(...c)) },
            divergent2Colors2: { value: divergent2Colors2 },
            energyColors: { type: 'v3v', value: energyColors.map(c => new THREE.Vector3(...c)) },
            greenBrownColors: { type: 'v3v', value: greenBrownColors.map(c => new THREE.Vector3(...c)) },
            blueGreenColors: { type: 'v3v', value: blueGreenColors.map(c => new THREE.Vector3(...c)) },
            colormapLength: { value: colorMapLength },
            xs: { type: '1fv', value: new Float32Array(xValues) },
            colors: {
                type: 'v3v',
                value: Array.from({ length: colorValues.length / 3 }, (_, i) =>
                    new THREE.Vector3(
                        colorValues[i * 3],
                        colorValues[i * 3 + 1],
                        colorValues[i * 3 + 2]
                    )
                )
            },
        };

        const newMaterial = this.material.clone();
        newMaterial.uniforms = uniform;
        newMaterial.needsUpdate = true;

        return newMaterial;
    }

    removeClosestPlane(relativeHeight) {
        if (this.children.length === 0) return;

        let closest = this.children[0];
        let closestDistance = Math.abs(closest.position.y / this.height - relativeHeight);
        this.children.forEach(child => {
            const distance = Math.abs(child.position.y / this.height - relativeHeight);
            if (distance < closestDistance)
            {
                closest = child;
                closestDistance = distance;
            }
        })

        this.remove(closest);
        return closest.position.y / this.height;
    }

    updatePlanes(pointsliderValue) {
        for (let i = 0; i < this.children.length; i++) {
            let child = this.children[i];
            let relative = child.position.y / this.height;

            if (this.mode === DataUtils.MODE.SPACE) {
                let level = this.relativeToLevel(relative);
                level = DataUtils.closestLevel(level);

                this.updatePlane(i, pointsliderValue, level);
            } else if (this.mode === DataUtils.MODE.TIME) {
                let timestamp = this.relativeToTime(relative);
                this.updatePlane(i, timestamp, pointsliderValue);
            } else {
                console.log('ERROR: unknown mode');
            }
        }
    }

    updatePlanesColorCoding() {
        if (this.children.length === 0) return;

        for (const child of this.children) {
            this.updatePlaneColorCoding(child);
        }
    }

    updateLicMode() {
        if (this.children.length === 0) return;
        const point = this.pointline.noUiSlider.get();

        for (const child of this.children) {
            const rel = child.position.y / this.height;
            const value = this.mode === DataUtils.MODE.SPACE ?
                DataUtils.closestLevel(this.relativeToLevel(rel)) : this.relativeToTime(rel);

            const timestamp = this.mode === DataUtils.MODE.SPACE ? point : value;
            const level = this.mode === DataUtils.MODE.SPACE ? value : point;

            const licMode = this.licMode === DataUtils.LIC_MODE.OFF ? 0 : 1;
            const update = () => {
                const requestId = Symbol();
                this.planeRequests.set(child, requestId);
                // if LIC mode is changed, the texture needs to be updated
                // (either to LIC if now on or the attribute if now off)
                this.updatePlaneTexture(child, requestId, timestamp, level).then(() => {
                    child.material.uniforms.licMode.value = licMode;
                    child.material.needsUpdate = true;
                });
            };

            // if the plane is still waiting for its proper material, delay updating the uniform until the texture is
            // ready. If multiple of these updates come on before it is ready, we rely on the fact that three.js events
            // seem to preserve the order that event listeners were added in
            if (child.material === this.loadingMaterial)
                child.addEventListener('texture', update);
            else // if the proper material is there, just update directly
                update();
        }
    }

    updatePlanesTransparency(value) {
        if (this.children.length === 0) return;

        for (const child of this.children) {
            this.updatePlaneTransparency(child, value);
        }
    }

    async updatePlaneTexture(plane, requestId, timestamp, level) {
        const attribute = DataUtils.getCurrentAttribute();
        const texture = await this.dataManager.getDataLayerTexture(attribute, timestamp, level);
        if (this.planeRequests.get(plane) !== requestId) {
            console.log("rejected");
            return;
        }

        let scalarData, vectorData;
        if (attribute === 'uv') {
            scalarData = null;
            vectorData = texture;
        } else {
            scalarData = texture;
            vectorData = null;
        }

        if (plane.material === this.loadingMaterial) {
            // if this is the first update before the loading material has been replaced,
            // create a new material out of the current data
            plane.material = this.createNewPlaneMaterial(scalarData, vectorData);
            this.updatePlaneColorCoding(plane);
            // dispatch the event to notify all changes that occurred while the texture wasn't ready
            plane.dispatchEvent(_planeTextureEvent);
        } else {
            // no need to create a new one, just update the existing one
            if (scalarData !== null)
                plane.material.uniforms.scalarData.value = scalarData;
            if (vectorData !== null)
                plane.material.uniforms.vectorData.value = vectorData;
            plane.material.needsUpdate = true;
        }
    }

    getCurrentAttribute()
    {
        switch (this.dropdownAttribute.value) {
            case "0":
                return 'theta';
            case "1":
                return 'salt';
            case "2":
                return 'vorticity_uvw';
        }
    }

    updatePlanesTexture() {
        if (this.children.length === 0) return;

        for (const child of this.children) {
            const requestId = Symbol();
            this.planeRequests.set(child, requestId);
            let timestamp;
            let level;
            if (this.mode === DataUtils.MODE.SPACE) {
                timestamp = this.pointline.noUiSlider.get();
                level = DataUtils.closestLevel(this.relativeToLevel(child.position.y / this.height));
            } else if (this.mode === DataUtils.MODE.TIME) {
                level = this.pointline.noUiSlider.get();
                timestamp = this.relativeToTime(child.position.y / this.height);
            } else {
                console.log('ERROR: unknown mode');
                return;
            }

            this.updatePlaneTexture(child, requestId, timestamp, level);
        }
    }

    updatePlaneColorCoding(plane) {
        const update = () => {
            const colorMode = Number(this.dropdown.value);
            plane.material.uniforms.colorMode.value = colorMode;

            if (colorMode > 11) {
                const xValues = new Array(256).fill(0);
                const colorValues = new Float32Array(256 * 3);
                const customColorMapIndex = Number(this.dropdown.value) - 12;
                const { xs, colors } = ColorHelper.getCustomColorMapValues(customColorMapIndex);
                const colorMapLength = xs.length;
                for (let i = 0; i < colorMapLength; i++) {
                    xValues[i] = xs[i];
                    colorValues[i * 3] = colors[i][0];
                    colorValues[i * 3 + 1] = colors[i][1];
                    colorValues[i * 3 + 2] = colors[i][2];
                }
                plane.material.uniforms.xs.value = new Float32Array(xValues);
                plane.material.uniforms.colors.value = Array.from(
                    { length: Math.floor(colorValues.length / 3) },
                    (_, i) => new THREE.Vector3(colorValues[i * 3], colorValues[i * 3 + 1], colorValues[i * 3 + 2])
                );
                plane.material.uniforms.colormapLength.value = colorMapLength;
            }

            plane.material.needsUpdate = true;
        };

        if (plane.material === this.loadingMaterial) {
            plane.addEventListener('texture', update);
        } else
            update();
    }

    updatePlaneTransparency(plane, value) {
        const update = () => {
            plane.material.uniforms.alpha.value = value;
            plane.material.needsUpdate = true;
        }

        if (plane.material === this.loadingMaterial) {
            plane.addEventListener('texture', update);
        } else
            update();
    }

    focusPlane(plane) {
        const transparencySlider = this.slider.noUiSlider;

        this.savedTransparency = transparencySlider.get();
        transparencySlider.set(1);
        transparencySlider.disable();

        this.hiddenPlanes = [];
        for (const child of this.children) {
            if (child === plane) {
                child.add(this.scaleDisplay);
            } else {
                this.hiddenPlanes.push(child);
            }
        }

        let values = [];
        for (const plane of this.hiddenPlanes) {
            this.remove(plane);

            const value = this.relativeToValue(plane.position.y / this.height);
            values.push(value);
        }

        const rangeline = this.parent.rangeline;
        rangeline.removeHandles(values);
    }

    unfocus() {
        let values = [];
        for (const plane of this.hiddenPlanes) {
            const pointline = this.parent.pointline.noUiSlider;

            const value = this.relativeToValue(plane.position.y / this.height);
            const point = pointline.get();

            // don't re-add planes if there already is a plane there
            const hasPlane = this.mode === DataUtils.MODE.TIME ?
                this.hasPlane(value, point) : this.hasPlane(point, value);

            if (hasPlane) {
                continue;
            }

            this.add(plane);
            values.push(value);
        }
        this.hiddenPlanes = [];

        const rangeline = this.parent.rangeline;
        // suppress events for performance reasons, since the planes' states should already be correct
        rangeline.addHandles(values, /*suppressEvents=*/true);

        const transparencySlider = this.slider.noUiSlider;

        transparencySlider.set(this.savedTransparency);
        transparencySlider.enable();

        const container = this.parent;
        container.updateTimeline();
    }

    getAllPlaneValues() {
        const values = [];
        for (const child of this.children) {
            values.push(this.relativeToValue(child.position.y / this.height));
        }
        return values;
    }
}