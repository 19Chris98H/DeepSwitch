import * as THREE from "three";
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import {triangulationTable} from '../../assets/mc/TriangulationTable.js';
import DataUtils from "../../utils/DataUtils";
import vsIso from "../../shader/vsIso.glsl";
import fsIso from "../../shader/fsIso.glsl";
import {viridisColors} from "../../assets/maps/ViridisTable";
import {autumnColors} from "../../assets/maps/AutumnTable";
import {divergent1Colors} from "../../assets/maps/Divergent1";
import {energyColors} from "../../assets/maps/Energy";
import {greenBrownColors} from "../../assets/maps/GreenBrown";
import {blueGreenColors} from "../../assets/maps/BlueGreen";
import {divergent2Colors1, divergent2Colors2} from "../../assets/maps/Divergent2";
import IsoList from "../ui/IsoList";
import ColorHelper from "../../utils/ColorHelper";

export class MarchingCubes {
    constructor(mainContainer) {
        this.useShading = true;
        this.useWireFrame = false;
        this.luminanceCutOff = 0.3;
        this.material = new THREE.ShaderMaterial({
            vertexShader: vsIso,
            fragmentShader: fsIso,
            glslVersion: THREE.GLSL3,
            transparent: true
        });
        this.material.side = THREE.DoubleSide;
        this.mainContainer = mainContainer;
        this.mainContainer.addEventListener('changeRange', () => {
            this.updateIsoSurfaces();
        })
        this.mainContainer.planeContainer.dropdown.addEventListener("change", () => {
            this.setMeshColors();
        });
        this.generateButton = document.getElementById('generateIsoSurface-button');
        this.generateButton.addEventListener('click', () => this.generateIsoSurface());
        this.deleteButton = document.getElementById('deleteIsoSurface-button');
        this.deleteButton.addEventListener('click', () => this.deleteAllMeshs());
        this.isovalue = document.getElementById('isovalue');
        this.surfaces = {};
        this.requestIds = {};
        this.wireFrames = {};
        this.savedSurfaces = {};
        this.savedWireFrames = {};
        this.visible = true;

        this.isoList = new IsoList(this.mainContainer.dataManager, this);

        document.addEventListener("keydown", function(event) {
            if ((event.key === "s" || event.key === "S") && !event.repeat) {
                this.toggleShading();
            }
        }.bind(this));

        document.addEventListener("keydown", function(event) {
            if ((event.key === "w" || event.key === "W") && !event.repeat) {
                this.toggleWireFrame();
            }
        }.bind(this));
    }

    toggleShading()
    {
        this.useShading = !this.useShading;
        this.setMeshColors();
    }

    toggleWireFrame()
    {
        this.useWireFrame = !this.useWireFrame;
        this.setMeshColors();
    }

    async updateIsoSurfaces() {
        if (Object.keys(this.surfaces).length === 0) {
            return;
        }

        let isoValues = Object.keys(this.surfaces);

        const requestId = this.uniqueId();
        for (const value of isoValues) {
            this.requestIds[value] = requestId;
        }

        this.deleteAllMeshs();
        for (const value of isoValues) {
            await this.generateIsoSurfaceOfValue(value, requestId);
        }
    }

    async updateIsoSurfacesForPointValue(pointValue) {
        if (Object.keys(this.surfaces).length === 0) {
            return;
        }

        let isoValues = Object.keys(this.surfaces);

        const requestId = this.uniqueId();
        for (const value of isoValues) {
            this.requestIds[value] = requestId;
        }

        this.deleteAllMeshs();
        for (const value of isoValues) {
            await this.generateIsoSurfaceOfValue(value, requestId, pointValue);
        }
    }

    async loadData(pointValue) {
        let mode = this.mainContainer.mode;
        const timeFormat = this.mainContainer.pointline.timeFormat;

        // in time mode, we take the actual layers we have, in space mode we just say 20
        let layerAmount = 20;
        if (mode === DataUtils.MODE.TIME) {
            layerAmount = this.mainContainer.maxTime - this.mainContainer.minTime + 1;
        }

        let array = [];
        for (let i = 0; i < layerAmount; i++) {
            let data;
            if (mode === DataUtils.MODE.TIME) {
                const index = this.mainContainer.minTime + i;

                const timestamp = timeFormat.to(index);

                data = await this.mainContainer.planeContainer.dataManager.getDataLayer(this.mainContainer.planeContainer.getCurrentAttribute(), timestamp, pointValue);
                data = Array.from(data);
            } else if (mode === DataUtils.MODE.SPACE) {
                const relative = i / (layerAmount - 1);

                const level = this.mainContainer.relativeToLevel(relative);
                const timestamp = pointValue;

                // find the levels bounding this one from the bottom and top
                let lower = this.mainContainer.min;
                let upper = this.mainContainer.max;
                for (const l of DataUtils.LEVELS) {
                    if (l > lower && l < level) {
                        lower = l;
                    }
                    if (l < upper && l > level) {
                        upper = l;
                    }
                }

                const alpha = (level - lower) / (upper - lower);

                const lowerData = await this.mainContainer.planeContainer.dataManager.getDataLayer(
                    this.mainContainer.planeContainer.getCurrentAttribute(), timestamp, lower);
                const upperData = await this.mainContainer.planeContainer.dataManager.getDataLayer(
                    this.mainContainer.planeContainer.getCurrentAttribute(), timestamp, upper);

                if (lowerData.length !== upperData.length) console.log('ERROR: data arrays are of unequal sizes');

                // compute actual layer used as linear combination of upper and lower neighbors
                data = [];
                for (let i = 0; i < lowerData.length; i++) {
                    let lower = lowerData[i];
                    let upper = upperData[i];

                    data.push(this.lerp(lower, upper, alpha));
                }
            }

            array = array.concat(data);
        }

        return [layerAmount, array];
    }

    async generateIsoSurfaceOfValue(value, requestId, pointValue = null) {
        if (!this.visible) return;
        if (this.requestIds[value] !== requestId)
            return;

        this.isoList.addItem(value);

        if (pointValue === null)
            pointValue = this.mainContainer.pointline.noUiSlider.get();

        let [layerAmount, dataArray] = await this.loadData(pointValue);
        this.marchingCubesFunction(dataArray,250,250,layerAmount,value, requestId);
    }

    async generateIsoSurface()
    {
        const value = this.isovalue.valueAsNumber;
        if (isNaN(value))
            return;

        const requestId = this.uniqueId();
        this.requestIds[value] = requestId;

        await this.generateIsoSurfaceOfValue(value, requestId);
    }

    containsNaN(field, i, j, k) {
        return (
            isNaN(field[i][j][k]) ||
            isNaN(field[i + 1][j][k]) ||
            isNaN(field[i + 1][j][k + 1]) ||
            isNaN(field[i][j][k + 1]) ||
            isNaN(field[i][j + 1][k]) ||
            isNaN(field[i + 1][j + 1][k]) ||
            isNaN(field[i + 1][j + 1][k + 1]) ||
            isNaN(field[i][j + 1][k + 1])
        );
    }

    marchingCubesFunction(data, width, height, depth, isovalue, requestId, pointValue) {

        if (this.requestIds[isovalue] !== requestId)
            return;

        const xres = this.mainContainer.planeContainer.width/(width - 1);
        const yres = this.mainContainer.planeContainer.width/(height - 1);
        const zres = this.mainContainer.planeContainer.height/(depth - 1);

        let field = [];
        for (let i = 0; i < width; i++) {
            field[i] = [];
            for (let j = 0; j < height; j++) {
                field[i][j] = [];
                for (let k = 0; k < depth; k++) {
                    let index = i + j * width + k * width * height;
                    field[i][j][k] = data[index];
                }
            }
        }

        let vertices = [];
        for (let i = 0; i < width - 1; i++) {
            let x = i * xres;
            for (let j = 0; j < height - 1; j++) {
                let y = j * yres;
                for (let k = 0; k < depth - 1; k++) {
                    let z = k * zres;

                    if (this.containsNaN(field, i, j, k)) {
                        continue;
                    }

                    let stateValues = [
                        field[i][j][k] >= isovalue ? 1 : 0,
                        field[i + 1][j][k] >= isovalue ? 1 : 0,
                        field[i + 1][j][k + 1] >= isovalue ? 1 : 0,
                        field[i][j][k + 1] >= isovalue ? 1 : 0,
                        field[i][j + 1][k] >= isovalue ? 1 : 0,
                        field[i + 1][j + 1][k] >= isovalue ? 1 : 0,
                        field[i + 1][j + 1][k + 1] >= isovalue ? 1 : 0,
                        field[i][j + 1][k + 1] >= isovalue ? 1 : 0
                    ];

                    if (stateValues.every(value => value === 0) || stateValues.every(value => value === 1))
                        continue;

                    let edges = this.calculateEdges(x, y, z, xres, yres, zres, field, isovalue, i, j, k, this.lerp);

                    let state = this.getState(...stateValues);

                    for (let edgeIndex of triangulationTable[state]) {
                        if (edgeIndex !== -1) {
                            vertices.push(edges[edgeIndex].x, edges[edgeIndex].y, edges[edgeIndex].z);
                        }
                    }
                }
            }
        }

        let geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));

        geometry = BufferGeometryUtils.mergeVertices(geometry);

        geometry.computeVertexNormals();

        let mesh = new THREE.Mesh(geometry, this.material.clone());
        mesh.position.set(-0.5, 0, 1);
        mesh.rotateX(-Math.PI / 2);

        var geo = new THREE.EdgesGeometry( geometry );
        var color = this.isoList.valueToColor(isovalue);
        var luminance = 0.299 * color[0]/255 + 0.587 * color[1]/255 + 0.114 * color[2]/255;
        var wireframeColor = (luminance > this.luminanceCutOff) ? 0x000000 : 0xffffff;

        var mat = new THREE.LineBasicMaterial( { color: wireframeColor, linewidth: 0.1, transparent: true, opacity: 0.2 } );
        var wireframe = new THREE.LineSegments( geo, mat );
        wireframe.position.set(-0.5, 0, 1);
        wireframe.rotateX(-Math.PI / 2);

        if (this.surfaces.hasOwnProperty(isovalue))
        {
            this.deleteMesh(isovalue);
        }

        if (this.requestIds[isovalue] !== requestId)
            return;

        this.surfaces[isovalue] = mesh;
        this.wireFrames[isovalue] = wireframe;
        
        this.setMeshColors();
        this.mainContainer.scene.addObject(mesh);
        this.mainContainer.scene.addObject(wireframe);
    }

    setIsosurfacesVisible(visible) {
        this.visible = visible;
        if (visible) {
            this.generateButton.classList.remove('disabled');
            this.deleteButton.classList.remove('disabled');

            this.surfaces = this.savedSurfaces;
            this.wireFrames = this.savedWireFrames;
            this.savedWireFrames = {};
            this.savedSurfaces = {};
            this.updateIsoSurfaces();
        } else {
            this.generateButton.classList.add('disabled');
            this.deleteButton.classList.add('disabled');

            this.savedWireFrames = {};
            this.savedSurfaces = {};
            // clone surfaces
            for (let attr in this.surfaces) {
                if (this.surfaces.hasOwnProperty(attr)) {
                    this.savedSurfaces[attr] = this.surfaces[attr];
                }
            }
            for (let attr in this.wireFrames) {
                if (this.wireFrames.hasOwnProperty(attr)) {
                    this.savedWireFrames[attr] = this.wireFrames[attr];
                }
            }
            this.deleteAllMeshs();
        }
    }

    deleteMesh(key) {
        if (!this.surfaces.hasOwnProperty(key)) {
            return;
        }
        let isoMesh = this.surfaces[key];
        let isoWire = this.wireFrames[key];

        if (isoMesh.geometry) {
            isoMesh.geometry.dispose();
            isoWire.geometry.dispose();
        }
        if (isoMesh.material) {
            isoMesh.material.dispose();
            isoWire.material.dispose();
        }
        this.mainContainer.scene.scene.remove(isoMesh);
        this.mainContainer.scene.scene.remove(isoWire);
        delete this.surfaces[key];
        delete this.wireFrames[key];
    }

    deleteAllMeshs() {
        // automatically calls deleteMesh() for each surface
        this.isoList.removeAll();
    }


    lerp(start, end, amt) {
        return (1 - amt) * start + amt * end;
    }

    getState(a, b, c, d, e, f, g, h) {
        return a * 1 + b * 2 + c * 4 + d * 8 + e * 16 + f * 32 + g * 64 + h * 128;
    }

    setMeshColors() {
        if (Object.keys(this.surfaces).length === 0) {
            return;
        }

        const colorMode = Number(this.mainContainer.planeContainer.dropdown.value);
        let [min, max] = this.mainContainer.dataManager.getExtrema();
        for (let key in this.surfaces) {
            const xValues = new Array(256).fill(0);
            const colorValues = new Float32Array(256 * 3);
            let colorMapLength = 0;
            const customColorMapIndex = colorMode - 12;
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
            let value = (key - min) / (max - min);
            this.surfaces[key].material = this.surfaces[key].material.clone();

            // LEGACY: This part reflects incremental development decisions.
            // It should be redesigned for better maintainability in the future.
            // See ColorHelper.js for further information
            this.surfaces[key].material.uniforms = {
                isoValue: {value: value},
                alpha: {value: 0.75},
                colorMode: {value: colorMode},
                useShading: {value: this.useShading},
                viridis: {type: 'v3v', value: viridisColors.map(c => new THREE.Vector3(...c))},
                autumnColors: { type: 'v3v', value: autumnColors.map(c => new THREE.Vector3(...c)) },
                divergent1Colors: { type: 'v3v', value: divergent1Colors.map(c => new THREE.Vector3(...c)) },
                energyColors: { type: 'v3v', value: energyColors.map(c => new THREE.Vector3(...c)) },
                greenBrownColors: { type: 'v3v', value: greenBrownColors.map(c => new THREE.Vector3(...c)) },
                blueGreenColors: { type: 'v3v', value: blueGreenColors.map(c => new THREE.Vector3(...c)) },
                divergent2Colors1: { type: 'v3v', value: divergent2Colors1.map(c => new THREE.Vector3(...c)) },
                divergent2Colors2: { value: divergent2Colors2 },
                lightPosition: { value: new THREE.Vector3(-10, -10, -10) },
                lightColor: { value: new THREE.Color(1, 1, 1) },
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
            this.surfaces[key].material.needsUpdate = true;
            if(this.useWireFrame) {
                this.wireFrames[key].material.opacity = 0.2;
            } else {
                this.wireFrames[key].material.opacity = 0.0;
            }
            var color = this.isoList.valueToColor(key);
            var luminance = 0.299 * color[0]/255 + 0.587 * color[1]/255 + 0.114 * color[2]/255; 
            var wireframeColor = (luminance > this.luminanceCutOff) ? 0x000000 : 0xffffff;
            this.wireFrames[key].material.color.setHex(wireframeColor);
        }

        this.isoList.updateColors();
    }

    uniqueId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    calculateEdges(x, y, z, xres, yres, zres, field, isovalue, i, j, k, lerp) {
        return [
            new THREE.Vector3(
                lerp(x, x + xres, (isovalue - field[i][j][k]) / (field[i + 1][j][k] - field[i][j][k])),
                y, z
            ),
            new THREE.Vector3(
                x + xres, y,
                lerp(z, z + zres, (isovalue - field[i + 1][j][k]) / (field[i + 1][j][k + 1] - field[i + 1][j][k]))
            ),
            new THREE.Vector3(
                lerp(x, x + xres, (isovalue - field[i][j][k + 1]) / (field[i + 1][j][k + 1] - field[i][j][k + 1])),
                y, z + zres
            ),
            new THREE.Vector3(
                x, y,
                lerp(z, z + zres, (isovalue - field[i][j][k]) / (field[i][j][k + 1] - field[i][j][k]))
            ),
            new THREE.Vector3(
                lerp(x, x + xres, (isovalue - field[i][j + 1][k]) / (field[i + 1][j + 1][k] - field[i][j + 1][k])),
                y + yres, z
            ),
            new THREE.Vector3(
                x + xres, y + yres,
                lerp(z, z + zres, (isovalue - field[i + 1][j + 1][k]) / (field[i + 1][j + 1][k + 1] - field[i + 1][j + 1][k]))
            ),
            new THREE.Vector3(
                lerp(x, x + xres, (isovalue - field[i][j + 1][k + 1]) / (field[i + 1][j + 1][k + 1] - field[i][j + 1][k + 1])),
                y + yres, z + zres
            ),
            new THREE.Vector3(
                x, y + yres,
                lerp(z, z + zres, (isovalue - field[i][j + 1][k]) / (field[i][j + 1][k + 1] - field[i][j + 1][k]))
            ),
            new THREE.Vector3(
                x, lerp(y, y + yres, (isovalue - field[i][j][k]) / (field[i][j + 1][k] - field[i][j][k])),
                z
            ),
            new THREE.Vector3(
                x + xres, lerp(y, y + yres, (isovalue - field[i + 1][j][k]) / (field[i + 1][j + 1][k] - field[i + 1][j][k])),
                z
            ),
            new THREE.Vector3(
                x + xres, lerp(y, y + yres, (isovalue - field[i + 1][j][k + 1]) / (field[i + 1][j + 1][k + 1] - field[i + 1][j][k + 1])),
                z + zres
            ),
            new THREE.Vector3(
                x, lerp(y, y + yres, (isovalue - field[i][j][k + 1]) / (field[i][j + 1][k + 1] - field[i][j][k + 1])),
                z + zres
            )
        ];
    }
}