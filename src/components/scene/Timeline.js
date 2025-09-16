import * as THREE from "three";
import Label from "./Label";

export class TimelineLabel {
    relativeHeight = 0.0;
    text = '';
    priority = 0;
    color = [255, 255, 255];

    constructor(height, text, priority = 0, color = [255, 255, 255]) {
        let clampedHeight = Math.min(Math.max(height, 0), 1);
        if (height < 0 || height > 1) console.log(`WARNING: height was not within [0, 1]: ${height}`);
        this.relativeHeight = clampedHeight;
        this.text = text;
        this.priority = priority;
        this.color = color;
    }
}

export default class Timeline extends THREE.Mesh {

    labelHeight = 0.15;
    pixelsPerUnit = 512;
    tickHeight = 11;

    constructor(camera, width = 1, height = 1, min = 0, max = 1) {
        const material = new THREE.MeshBasicMaterial();
        const geometry = new THREE.PlaneGeometry(width, height);
        // translate geometry up, so the origin is at the bottom center of the timeline
        geometry.translate(0, height / 2, 0);

        super(geometry, material);
        this.type = 'Timeline';

        this.trackedCamera = camera;
        this.width = width;
        this.height = height;
        this.min = min;
        this.max = max;
    }

    setBounds(min, max) {
        this.min = min;
        this.max = max;
        this.createLabels(5);
    }

    createLabels(num) {
        this.children = []; // clear labels

        num = Math.max(num, 2);
        const interval = 1 / (num - 1);
        const domainSize = this.max - this.min;

        for (let i = 0; i < num; i++) {
            const fraction = i * interval;
            const value = this.min + fraction * domainSize;
            const label = new Label(value.toString(), {labelHeight: this.labelHeight});

            label.position.y = this.height - fraction * this.height;
            label.position.x = -this.width / 2  - label.width / 2;

            this.add(label);
        }
    }

    setCustomLabels(strings) {
        this.children = []; // clear labels

        for (let i = 0; i < strings.length; i++) {
            const string = strings[i];

            let fraction = i / (strings.length - 1);

            const label = new Label(string, {labelHeight: this.labelHeight});

            label.position.y = fraction * this.height;
            label.position.x = -this.width / 2  - label.width / 2;

            this.add(label);
        }
    }

    setLabels(labels) {
        this.desiredLabels = labels;

        labels.sort((a, b) => {
            // sort by priority first, then by height
            return (b.priority * 10 + b.relativeHeight) - (a.priority * 10 + a.relativeHeight);
        });

        this.children = [];
        this.activeLabels = [];
        for (const label of labels) {
            let hasOverlap = false;
            for (const activeLabel of this.activeLabels) {
                if (Math.abs(label.relativeHeight - activeLabel.relativeHeight) * this.height < this.labelHeight) {
                    hasOverlap = true;
                    break;
                }
            }

            if (!hasOverlap) {
                this.activeLabels.push(label);
                const newLabel = new Label(label.text, {labelHeight: this.labelHeight, color: label.color});
                // I don't know how to get .copy() or .clone() to work :)
                const reverseLabel = new Label(label.text, {labelHeight: this.labelHeight, color: label.color});
                this.addLabel(newLabel, label.relativeHeight);
                this.addLabel(reverseLabel, label.relativeHeight, true);
            }
        }
    }

    createCanvas() {
        const ctx = document.createElement('canvas').getContext('2d');
        ctx.canvas.width = this.width * this.pixelsPerUnit;
        ctx.canvas.height = this.height * this.pixelsPerUnit;

        return ctx;
    }

    createTickCanvas(relativeHeights) {
        this.textureTicks = relativeHeights;

        const ctx = this.createCanvas();

        ctx.fillStyle = '#99BBFF';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        ctx.fillStyle = '#000';
        for (const relativeHeight of relativeHeights) {
            const pixel = (1 - relativeHeight) * ctx.canvas.height - this.tickHeight / 2;
            ctx.fillRect(0, pixel, ctx.canvas.width, this.tickHeight);
        }

        return ctx;
    }

    makeMaterial(ctx) {
        const texture = new THREE.CanvasTexture(ctx.canvas);
        this.material = new THREE.MeshBasicMaterial({map: texture});
        this.material.side = THREE.DoubleSide;
        this.material.needsUpdate = true;
    }

    setTextureTicks(relativeHeights) {
        this.makeMaterial(this.createTickCanvas(relativeHeights));
    }

    setHoverTick(relativeHeight) {
        let ctx;
        if (this.textureTicks)
            ctx = this.createTickCanvas(this.textureTicks);
        else
            ctx = this.createCanvas();

        ctx.fillStyle = '#333';
        const pixel = (1 - relativeHeight) * ctx.canvas.height - this.tickHeight / 2;
        ctx.fillRect(0, pixel, ctx.canvas.width, this.tickHeight);

        this.makeMaterial(ctx);
    }

    removeHoverTick() {
        let ctx;
        if (this.textureTicks)
            ctx = this.createTickCanvas(this.textureTicks);
        else
            ctx = this.createCanvas();

        this.makeMaterial(ctx);
    }

    addLabel(label, relativeHeight, reverse = false) {
        const tickHeight = 0.025;
        const tickWidth = 0.075;

        const y = relativeHeight * this.height;

        const ctx = document.createElement('canvas').getContext('2d');
        ctx.canvas.width = 1;
        ctx.canvas.height = 1;

        ctx.fillStyle = label.textColor;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        const texture = new THREE.CanvasTexture(ctx.canvas);

        const tickX = -this.width / 2 - tickWidth / 2;
        if (!reverse) {
            const tickGeometry = new THREE.PlaneGeometry(tickWidth, tickHeight);
            const tickMaterial = new THREE.MeshBasicMaterial({map: texture, side: THREE.DoubleSide});
            const tick = new THREE.Mesh(tickGeometry, tickMaterial);
            tick.position.y = y;
            tick.position.x = tickX;
            this.add(tick);
        }

        label.position.y = y;
        label.position.x = tickX - tickWidth / 2 - label.width / 2;
        if (reverse)
            label.rotation.y = Math.PI;
        this.add(label);
    }
}
