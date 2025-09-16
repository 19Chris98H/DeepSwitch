import DataUtils from "../../utils/DataUtils";

export default class CacheInfo {

    static NOT_CACHED_COLOR = '#f00';
    static CACHED_COLOR = '#0f0';
    static WORKING_COLOR = '#5a8ddd';
    static QUEUED_COLOR = '#ed7c25';
    static PLANE_COLOR = '#000';
    static BLOCK_COLOR = '#ccc';

    pixelSize = 0; // initialized in resizeCanvas()

    constructor(dataManager) {
        this.dataManager = dataManager;

        this.popover = document.getElementById('cache-info-popover');
        this.canvas = document.getElementById('cache-info-canvas');

        this.canvas.addEventListener('mousemove', this.handleHover.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleLeave.bind(this));

        this.attributeDropdown = document.getElementById('cache-info-attribute-dropdown');
        this.attributeDropdown.addEventListener('change', () => {
            this.drawCanvas();
        });

        this.showButton = document.getElementById('cache-info-show-button');
        this.showButton.addEventListener('click', () => {
            if (!this.isPopoverVisible()) {
                this.popover.showPopover();
                this.resizeCanvas();
            }
        });

        this.reloadButton = document.getElementById('cache-info-reload-button');
        this.reloadButton.addEventListener('click', this.drawCanvas.bind(this));

        this.closeButton = document.getElementById('cache-info-close-button');
        this.closeButton.addEventListener('click', () => {
            if (this.isPopoverVisible()) {
                this.popover.hidePopover();
            }
        });

        this.hoverText = document.getElementById('cache-hover-text');

        window.addEventListener('resize', this.resizeCanvas.bind(this));

        this.initLegend();
    }

    initLegend() {
        document.getElementById('not-cached-color').style.background = CacheInfo.NOT_CACHED_COLOR;
        document.getElementById('cached-color').style.background = CacheInfo.CACHED_COLOR;
        document.getElementById('working-color').style.background = CacheInfo.WORKING_COLOR;
        document.getElementById('queued-color').style.background = CacheInfo.QUEUED_COLOR;
        document.getElementById('plane-color').style.background = CacheInfo.PLANE_COLOR;
        document.getElementById('block-color').style.background = CacheInfo.BLOCK_COLOR;
    }

    togglePopover() {
        this.popover.togglePopover();
        if (this.isPopoverVisible())
            this.resizeCanvas();
    }

    resizeCanvas() {
        if (!this.isPopoverVisible()) return;

        const maxSize = this.canvas.parentElement.getBoundingClientRect();

        // update grid dimensions, just in case
        const gridWidth = DataUtils.LEVELS.length;
        const gridHeight = DataUtils.getFormattedTimestamps().length;

        // how big a pixel in the grid should be
        this.pixelSize = Math.floor(Math.min(maxSize.width / gridWidth, maxSize.height / gridHeight));

        this.canvas.width = gridWidth * this.pixelSize;
        this.canvas.height = gridHeight * this.pixelSize;

        if (this.canvas.width <= 0 || this.canvas.height <= 0) return;

        this.positionLabels();
        this.drawCanvas();
    }

    positionLabels() {
        if (!this.isPopoverVisible()) return;

        const markerHeight = 10;

        const canvas = this.canvas;
        const parentSize = canvas.parentElement.getBoundingClientRect();

        const xOffset = (parentSize.width - canvas.width) / 2; // from either side
        const yOffset = parentSize.height - canvas.height; // from the bottom

        const halfPixel = this.pixelSize / 2;

        const yTop = document.getElementById('cache-y-label-top');
        const yBottom = document.getElementById('cache-y-label-bottom');
        const xLeft = document.getElementById('cache-x-label-left');
        const xRight = document.getElementById('cache-x-label-right');

        const timestamps = DataUtils.getFormattedTimestamps();

        yTop.childNodes[0].nodeValue = timestamps[timestamps.length - 1];
        yTop.style.left = xOffset - yTop.offsetWidth - markerHeight + 'px';
        yTop.style.top = -yTop.offsetHeight / 2 + halfPixel + 'px';

        yBottom.childNodes[0].nodeValue = timestamps[0];
        yBottom.style.left = xOffset - yBottom.offsetWidth - markerHeight + 'px';
        yBottom.style.bottom = yOffset - yBottom.offsetHeight / 2 + halfPixel + 'px';

        xLeft.childNodes[0].nodeValue = DataUtils.LEVELS[0];
        xLeft.style.left = xOffset + halfPixel - xLeft.offsetWidth / 2 + 'px';
        xLeft.style.bottom = yOffset - xLeft.offsetHeight - markerHeight + 'px';

        xRight.childNodes[0].nodeValue = DataUtils.LEVELS[DataUtils.LEVELS.length - 1];
        xRight.style.right = xOffset + halfPixel - xRight.offsetWidth / 2 + 'px';
        xRight.style.bottom = yOffset - xRight.offsetHeight - markerHeight + 'px';
    }

    drawCanvas() {
        if (!this.isPopoverVisible()) return;

        // canvas dimensions
        const cWidth = this.canvas.width;
        const cHeight = this.canvas.height;

        if (cWidth <= 0 || cHeight <= 0) return;

        const levels = DataUtils.LEVELS;
        const timestamps = DataUtils.getFormattedTimestamps();

        // size of the minipixels for indicating planes
        // make sure the difference to normal pixel size is even since it should be centered
        const miniPixelDifference = this.roundToEven(this.pixelSize / 2);
        const miniPixelSize = this.pixelSize - miniPixelDifference;

        const ctx = this.canvas.getContext('2d');

        // draw pixels
        for (const [xi, level] of levels.entries()) {
            for (const [yi, timestamp] of timestamps.entries()) {
                const {x, y} = this.indicesToCoordinates(xi, yi);

                ctx.fillStyle = this.getPixelColor(timestamp, level);
                ctx.fillRect(x, y, this.pixelSize, this.pixelSize);
            }
        }

        if (!this.mainContainer) return;
        // only draw plane and block indicators for the selected attribute
        if (this.getSelectedAttribute() !== DataUtils.getCurrentAttribute()) return;

        // draw block indicator line
        ctx.fillStyle = CacheInfo.BLOCK_COLOR;
        if (this.mainContainer.mode === DataUtils.MODE.SPACE) {
            const timestamp = this.mainContainer.pointline.noUiSlider.get();
            const yi = timestamps.indexOf(timestamp);
            const y = this.indicesToCoordinates(0, yi).y;

            ctx.fillRect(miniPixelDifference / 2, y + miniPixelDifference / 2 + 1,
                cWidth - miniPixelDifference, miniPixelSize - 2);
        } else {
            const level = this.mainContainer.pointline.noUiSlider.get();
            const xi = levels.indexOf(level);
            const x = this.indicesToCoordinates(xi, 0).x;

            ctx.fillRect(x + miniPixelDifference / 2 + 1, miniPixelDifference / 2,
                miniPixelSize - 2, cHeight - miniPixelDifference);
        }

        // draw minipixels for planes
        ctx.fillStyle = CacheInfo.PLANE_COLOR;
        const point = this.mainContainer.pointline.noUiSlider.get();
        for (const value of this.mainContainer.planeContainer.getAllPlaneValues()) {
            const level = this.mainContainer.mode === DataUtils.MODE.SPACE ? value : point;
            const timestamp = this.mainContainer.mode === DataUtils.MODE.SPACE ? point : value;

            const xi = levels.indexOf(level);
            const yi = timestamps.indexOf(timestamp);

            const {x, y} = this.indicesToCoordinates(xi, yi);

            ctx.fillRect(x + miniPixelDifference / 2, y + miniPixelDifference / 2,
                miniPixelSize, miniPixelSize);
        }
    }

    roundToEven(v) {
        return Math.floor(v / 2) * 2;
    }

    indicesToCoordinates(xi, yi) {
        // canvas.height - pixelSize because we want to start drawing at the bottom
        // but also need space for the last pixel row
        return {x: xi * this.pixelSize, y: this.canvas.height - this.pixelSize - yi * this.pixelSize};
    }

    getPixelColor(timestamp, level) {
        const attribute = this.getSelectedAttribute();

        if (this.dataManager.isCached(attribute, timestamp, level))
            return CacheInfo.CACHED_COLOR; // cached is green
        else if (this.dataManager.isWorking(attribute, timestamp, level))
            return CacheInfo.WORKING_COLOR; // currently being cached is light blue
        else if (this.dataManager.isQueued(attribute, timestamp, level))
            return CacheInfo.QUEUED_COLOR; // queued but not currently being cached is orange

        return CacheInfo.NOT_CACHED_COLOR; // everything else is red (not cached)
    }

    handleHover(event) {
        const { clientX, clientY } = event;
        const boundingRect = this.canvas.getBoundingClientRect();
        const x = clientX - boundingRect.left;
        const y = clientY - boundingRect.top;

        const levels = DataUtils.LEVELS;
        const timestamps = DataUtils.getFormattedTimestamps();

        let gridX = Math.floor(x / this.pixelSize);
        let gridY = Math.floor(y / this.pixelSize);
        gridX = Math.min(Math.max(gridX, 0), levels.length - 1);
        gridY = Math.min(Math.max(gridY, 0), timestamps.length - 1);
        gridY = timestamps.length - 1 - gridY;

        const level = levels[gridX];
        const timestamp = timestamps[gridY];

        this.hoverText.style.color = this.getPixelColor(timestamp, level);
        this.hoverText.innerHTML = `(${level}, ${timestamp})`;
    }

    handleLeave(event) {
        this.hoverText.innerHTML = '&nbsp;';
    }

    isPopoverVisible() {
        return this.popover.matches(":popover-open");
    }

    getSelectedAttribute() {
        switch (this.attributeDropdown.value) {
            case 'c':
                return DataUtils.getCurrentAttribute();
            case 'uv':
                // UV isn't available in the standard dropdown as it is only used for the LICs, so it's a special case here
                return 'uv';
            default:
                return DataUtils.dropdownValueToAttribute(this.attributeDropdown.value);
        }
    }

    setMainContainer(mainContainer) {
        this.mainContainer = mainContainer;
    }
}