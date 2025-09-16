import * as THREE from "three";

export default class Label extends THREE.Mesh {
    constructor(text = '', {fontSize = 120, labelWidth = 0, labelHeight = 1, color = [255, 255, 255]}) {
        const ctx = document.createElement('canvas').getContext('2d');

        // e.g. bg color, text color, stroke (color, size, enabled), font
        const font = `${fontSize}px sans-serif`;
        ctx.font = font;

        const textSize = ctx.measureText(text);
        ctx.canvas.width = textSize.width;
        ctx.canvas.height = fontSize; // size of the em square

        // need to set font again after resizing canvas
        ctx.font = font;

        ctx.textBaseline = 'top'; // top of the em square
        ctx.textAlign = 'left';

        ctx.strokeStyle = 'black';
        ctx.lineWidth = 6;
        ctx.strokeText(text, 0, 0);

        const textColor = `rgb(${color[0]},${color[1]},${color[2]})`
        ctx.fillStyle = textColor;
        ctx.fillText(text, 0, 0); // 0, 0 since baseline is top

        // use default behavior of rescaling width if both sizes are invalid
        if (labelWidth <= 0 && labelHeight <= 0) {
            labelHeight = 1;
        }

        // automatically preserve aspect ratio except if both are set
        if (labelWidth > 0 && labelHeight <= 0) {
            labelHeight = labelWidth * (ctx.canvas.height / ctx.canvas.width);
        } else if (labelHeight > 0 && labelWidth <= 0) {
            labelWidth = labelHeight * (ctx.canvas.width / ctx.canvas.height);
        }

        const texture = new THREE.CanvasTexture(ctx.canvas);
        const material = new THREE.MeshBasicMaterial({map: texture, transparent: true});
        const geometry = new THREE.PlaneGeometry(labelWidth, labelHeight);

        super(geometry, material);

        this.text = text;
        this.fontSize = fontSize;
        this.width = labelWidth;
        this.height = labelHeight;
        this.textColor = textColor;
    }
}