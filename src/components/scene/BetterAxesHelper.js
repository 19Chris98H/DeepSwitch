import * as THREE from "three";

export default class BetterAxesHelper extends THREE.Object3D {
    constructor(length = 1, thickness = 0.05) {
        super();


        const radius = thickness / 2;
        const cylinderGeometry = new THREE.CylinderGeometry(radius, radius, length);

        const xMaterial = new THREE.MeshBasicMaterial({color: 0xff0000});
        const xAxis = new THREE.Mesh(cylinderGeometry, xMaterial);
        xAxis.rotation.set(0, 0, Math.PI / 2);
        xAxis.position.set(0.5, 0, 0);

        const yMaterial = new THREE.MeshBasicMaterial({color: 0x00ff00});
        const yAxis = new THREE.Mesh(cylinderGeometry, yMaterial);
        yAxis.rotation.set(0, 0, 0);
        yAxis.position.set(0, 0.5, 0);

        const zMaterial = new THREE.MeshBasicMaterial({color: 0x0000ff});
        const zAxis = new THREE.Mesh(cylinderGeometry, zMaterial);
        zAxis.rotation.set(Math.PI / 2, 0, 0);
        zAxis.position.set(0, 0, 0.5);

        this.add(xAxis);
        this.add(yAxis);
        this.add(zAxis);
    }
}