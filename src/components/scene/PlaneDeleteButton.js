import * as THREE from "three";
import deletePlaneUrl from '../../assets/img/delete_plane.png';

export default class PlaneDeleteButton extends THREE.Mesh {

    static DELETE_TEXTURE = new THREE.TextureLoader().load(deletePlaneUrl);

    constructor(size = 1, hoverSize = 1) {
        const geometry = new THREE.PlaneGeometry(size, size);

        const loader = new THREE.TextureLoader();
        const texture = loader.load(deletePlaneUrl);

        const material = new THREE.MeshBasicMaterial({
            map: PlaneDeleteButton.DELETE_TEXTURE,
            side: THREE.DoubleSide,
            transparent: true,
        });

        super(geometry, material);
        this.type = 'PlaneDeleteButton';
        this.visibility = true;

        const hoverGeometry = new THREE.PlaneGeometry(hoverSize, hoverSize);
        const hoverMaterial = new THREE.MeshBasicMaterial({transparent: true, opacity: 0});
        this.hoverBox = new THREE.Mesh(hoverGeometry, hoverMaterial);
        this.hoverBox.type = 'PlaneDeleteButtonHoverBox';
        this.add(this.hoverBox);
    }

    setVisibility(visible) {
        if (visible)
            this.material.opacity = 1;
        else
            this.material.opacity = 0;

        if (visible !== this.visibility)
            this.material.needsUpdate = true;

        this.visibility = visible;
    }
}