import * as THREE from "three";
import DataUtils from "../../utils/DataUtils";
import spaceModeUrl from '../../assets/img/space_mode.png';
import timeModeUrl from '../../assets/img/time_mode.png';

export default class ModeIndicator extends THREE.Object3D {

    mode = DataUtils.MODE.SPACE;

    constructor(size = 1) {
        super();

        const loader = new THREE.TextureLoader();
        const spaceTexture = loader.load(spaceModeUrl);
        const timeTexture = loader.load(timeModeUrl);

        this.spaceMaterial = new THREE.MeshBasicMaterial({map: spaceTexture, transparent: true, side: THREE.DoubleSide});
        this.timeMaterial = new THREE.MeshBasicMaterial({map: timeTexture, transparent: true, side: THREE.DoubleSide});

        const planeGeometry = new THREE.PlaneGeometry(size, size);
        this.plane = new THREE.Mesh(planeGeometry, this.spaceMaterial);

        this.add(this.plane);
    }

    setMode(mode) {
        this.mode = mode;
        if (mode === DataUtils.MODE.SPACE) {
            this.plane.material = this.spaceMaterial;
        } else {
            this.plane.material = this.timeMaterial;
        }
    }
}