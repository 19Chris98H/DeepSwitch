import * as THREE from "three";
import Label from "./Label";

export default class PlaneScaleDisplay extends THREE.Mesh {
    constructor(length = 1, height = 0.1, units = 1, unit = 'km') {
        const geometry = new THREE.PlaneGeometry(length, height);
        const material = new THREE.MeshBasicMaterial({
            side: THREE.DoubleSide,
            transparent: true,
        });

        super(geometry, material);
        this.type = 'PlaneScaleDisplay';

        this.length = length;
        this.height = height;

        this.updateTexture();
        this.updateLabel(`${units} ${unit}`);
    }

    updateTexture() {
        const pixelsPerUnit = 512;
        const lineWidth = 3;

        const ctx = document.createElement('canvas').getContext('2d');
        ctx.canvas.width = this.length * pixelsPerUnit;
        ctx.canvas.height = this.height * pixelsPerUnit;

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, lineWidth, ctx.canvas.height);
        ctx.fillRect(ctx.canvas.width - lineWidth, 0, lineWidth, ctx.canvas.height);
        ctx.fillRect(0, ctx.canvas.height - lineWidth, ctx.canvas.width, ctx.canvas.height);

        this.material.map = new THREE.CanvasTexture(ctx.canvas);
        this.material.needsUpdate = true;
    }

    updateLabel(text) {
        this.children = [];

        const labelHeight = this.height * 2;

        const label = new Label(text, {labelHeight: labelHeight});
        label.position.y = -labelHeight / 2 - this.height / 2;
        this.add(label);

        const reverseLabel = new Label(text, {labelHeight: labelHeight});
        reverseLabel.position.y = label.position.y
        reverseLabel.rotation.y = Math.PI;
        this.add(reverseLabel);
    }

    flipLabel(flip) {
        for (const child of this.children) {
            child.rotation.z = flip ? Math.PI : 0;
        }
    }
}