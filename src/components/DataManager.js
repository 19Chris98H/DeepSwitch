import DataUtils from "../utils/DataUtils";
import * as THREE from "three";
import {viridisColors} from "../assets/maps/ViridisTable";
import WorkerPool from "../utils/WorkerPool";
import CacheInfo from "./ui/CacheInfo";

const _metadataLoadedEvent = {type: 'loaded'};

export class DataManager extends THREE.EventDispatcher {
    CACHE = new Map();

    SIZE_KM = null;

    THETA_MIN = null;
    THETA_MAX = null;
    SALT_MIN = null;
    SALT_MAX = null;
    VORT_MIN = null;
    VORT_MAX = null;
    THETA_GLOBAL = null;
    SALT_GLOBAL = null;
    VORT_GLOBAL = null;

    // considered when caching slices, maximum distance a block can be from the selected block for auto-caching,
    // intended to prevent users caching almost the entire attribute when, for example, creating a lot of slices in time mode
    MAX_CACHING_DISTANCE = 20;

    loadedAttributes = [];
    attributeLoading = false;

    blockCachingInfo = {blockValue: null, abortController: null, inRangeOnly: null};
    sliceCachingInfo = {slices: [], blocks: new Map()};
    workerPool = new WorkerPool(2);

    extremaOverrides = new Map();

    mode = DataUtils.MODE.SPACE;
    
    constructor() {
        super()
        this.cacheSection = document.getElementById('cache-section');
        this.preloadLabel = document.getElementById('preload-label');
        this.loadingLabelCheckbox = document.getElementById('loading-label-checkbox');
        this.concurrentLoadingCheckbox = document.getElementById('concurrent-loading-checkbox');
        this.concurrentLoadingInput = document.getElementById('concurrent-amount');
        this.autoCacheCheckbox = document.getElementById('auto-cache-checkbox');

        this.loadingLabelCheckbox.addEventListener('change', event => {
            this.updateLoadingLabel();
        });

        const updateConcurrentVisibility = () => {
            if (this.concurrentLoadingCheckbox.checked) {
                document.getElementById('concurrent-input').style.display = '';
            } else {
                document.getElementById('concurrent-input').style.display = 'none';
            }
        };
        updateConcurrentVisibility();

        this.concurrentLoadingCheckbox.addEventListener('change', event => {
            updateConcurrentVisibility();
        });

        this.autoCacheCheckbox.addEventListener('change', event => {
            if (!this.autoCacheCheckbox.checked) this.abortCaching();
            else this.cacheCurrent();
        })

        document.getElementById('cache-stack-button').addEventListener('click', () => {
            this.cacheCurrentBlock(true, false);
        });

        document.getElementById('cache-slices-button').addEventListener('click', () => {
            this.cacheCurrentSlicesAsBlocks(true);
        });

        document.getElementById('cache-attribute-button').addEventListener('click', () => {
            this.cacheAttribute();
        });

        document.addEventListener('keydown', event => {
            if ((event.key === 'c' || event.key === 'C') && !event.repeat) {
                if (!this.isCacheSectionVisible()) return;
                if (this.cacheInfo) this.cacheInfo.togglePopover();
            }
        });
    }

    isCacheSectionVisible() {
        return this.cacheSection.style.display !== 'none';
    }

    shouldAutoCache() {
        return this.autoCacheCheckbox.checked;
    }

    isCached(attribute, timestamp, level) {
        return !!this.CACHE.get(attribute)?.get(timestamp)?.has(level);
    }

    getCached(attribute, timestamp, level) {
        return this.CACHE.get(attribute)?.get(timestamp)?.get(level);
    }

    cache(attribute, timestamp, level, layer) {
        if (!this.CACHE.has(attribute)) {
            this.CACHE.set(attribute, new Map());
        }
        const attributeMap = this.CACHE.get(attribute);
        if (!attributeMap.has(timestamp)) {
            attributeMap.set(timestamp, new Map());
        }
        attributeMap.get(timestamp).set(level, layer);

        this.cacheInfo.drawCanvas();
    }

    isBlockWorking(attribute, timestamp, level) {
        // this is technically not a guarantee since caching operations could run for a non-current attribute, but in
        // practice these should be aborted from outside the data manager and this assumption means that the
        // caching info doesn't also have to contain the current attribute
        if (attribute !== DataUtils.getCurrentAttribute()) return false;

        // technically, caching operations could be started in another mode but, again, the assumption that they will
        // be aborted from outside saves the state from becoming too complex
        const blockValue = this.mode === DataUtils.MODE.SPACE ? timestamp : level;
        const sliceValue = this.mode === DataUtils.MODE.SPACE ? level : timestamp;

        const currentBlock = this.mainContainer ? this.mainContainer.getBlockInRange() : DataUtils.getBlock(this.mode);
        return this.blockCachingInfo.blockValue === blockValue
            && (!this.blockCachingInfo.inRangeOnly || currentBlock.includes(sliceValue));
    }

    isWorking(attribute, timestamp, level) {
        if (attribute !== DataUtils.getCurrentAttribute()) return false;

        const sliceValue = this.mode === DataUtils.MODE.SPACE ? level : timestamp;
        const blockValue = this.mode === DataUtils.MODE.SPACE ? timestamp : level;
        //const isSliceWorking = this.sliceCachingInfo.get(sliceValue)?.working;
        const isSliceWorking = this.sliceCachingInfo.slices.includes(sliceValue)
            && this.sliceCachingInfo.blocks.get(blockValue)?.working;

        return this.isBlockWorking(attribute, timestamp, level) || isSliceWorking;
    }

    isQueued(attribute, timestamp, level) {
        if (attribute !== DataUtils.getCurrentAttribute()) return false;

        const sliceValue = this.mode === DataUtils.MODE.SPACE ? level : timestamp;
        const blockValue = this.mode === DataUtils.MODE.SPACE ? timestamp : level;
        const isSliceQueued = this.sliceCachingInfo.slices.includes(sliceValue) && this.sliceCachingInfo.blocks.has(blockValue);

        // blocks are always working, never queued
        // we consider working values to also be queued
        return this.isBlockWorking(attribute, timestamp, level) || isSliceQueued;
    }

    setMainContainer(mainContainer) {
        this.mainContainer = mainContainer;
        this.cacheInfo.setMainContainer(mainContainer);
    }

    setExtremaMode(mode) {
        this.extremaMode = mode;
    }

    setMode(mode) {
        this.mode = mode;
    }

    async loadMetadata() {
        try {
            const response = await fetch("./Data/downloads/data/metadata.json");
            if (!response.ok) {
                throw new Error(`Failed to load metadata: ${response.status}`);
            }
            this.VALUES_JSON = await response.json();
            console.log("Metadata loaded:");

            this.SIZE_KM = this.VALUES_JSON["size_km"];

            this.THETA_MIN = this.VALUES_JSON["THETA"]["min_local"];
            this.THETA_MAX = this.VALUES_JSON["THETA"]["max_local"];
            this.SALT_MIN = this.VALUES_JSON["SALT"]["min_local"];
            this.SALT_MAX = this.VALUES_JSON["SALT"]["max_local"];
            this.VORT_MIN = this.VALUES_JSON["VORT"]["min_local"];
            this.VORT_MAX = this.VALUES_JSON["VORT"]["max_local"];

            this.THETA_GLOBAL = [this.VALUES_JSON["THETA"]["min_global"], this.VALUES_JSON["THETA"]["max_global"]];
            this.SALT_GLOBAL = [this.VALUES_JSON["SALT"]["min_global"], this.VALUES_JSON["SALT"]["max_global"]];
            this.VORT_GLOBAL = [this.VALUES_JSON["VORT"]["min_global"], this.VALUES_JSON["VORT"]["max_global"]];

            console.log("Metadata loaded:", this.THETA_MIN);

            // Take keys from Theta and override DataUtils.TIMES
            DataUtils.TIMES = Object.keys(this.VALUES_JSON["THETA"]["min_local"]);

            this.dispatchEvent(_metadataLoadedEvent);
        } catch (error) {
            console.error("Error loading metadata.json:", error);
        }

        // only make cache info available after the correct timestamps have been read
        this.cacheInfo = new CacheInfo(this);
    }

    async cacheAttribute({ signal } = {}) {
        if (this.attributeLoading) return;
        const attribute = DataUtils.getCurrentAttribute();
        if (this.loadedAttributes.includes(attribute)) return;
        this.attributeLoading = true;

        if (document.getElementById("loading-label-checkbox").checked)
            this.preloadLabel.textContent = 'Loading...';

        const timestamps = DataUtils.getFormattedTimestamps();

        let promises = [];
        for (const timestamp of timestamps) {
            if (signal && signal.aborted) break;

            for (const level of DataUtils.LEVELS) {
                // fetch will not start with an aborted signal, but break early anyway
                if (signal && signal.aborted) break;
                let p = this.getDataLayerTexture(attribute, timestamp, level);
                if (this.concurrentLoadingCheckbox.checked)
                    promises.push(p);
                else
                    await p;

                if (promises.length >= this.concurrentLoadingInput.valueAsNumber) {
                    await Promise.all(promises);
                    promises = [];
                }
            }
        }
        await Promise.all(promises);
        if (!signal || !signal.aborted)
            this.loadedAttributes.push(attribute);

        this.attributeLoading = false;
        this.updateLoadingLabel();
    }

    async cacheCurrentBlock(manual = false, inRangeOnly = true) {
        if (!manual && !this.shouldAutoCache()) return; // return if auto-caching is off unless it's a manual cache

        const ac = new AbortController();
        const signal = ac.signal;

        const point = this.mainContainer.pointline.noUiSlider.get();
        if (!manual) // manual caching can't be aborted
            this.startBlockCaching(point, ac, inRangeOnly);

        const attribute = DataUtils.getCurrentAttribute();

        await this.cacheBlock(attribute, point, this.mode, { signal, inRangeOnly });

        if (this.blockCachingInfo.abortController === ac) // don't accidentally clear field for other caching operations
            this.abortBlockCaching(); // to clear the field, doesn't actually abort anything at this point
    }

    async cacheCurrentSlicesAsBlocks(manual = false) {
        if (!manual && !this.shouldAutoCache()) return;

        const slices = this.mainContainer.planeContainer.getAllPlaneValues();
        this.cacheSlicesAsBlocks(slices, manual);
    }

    async cacheSlicesAsBlocks(slices, manual = false) {
        if (!manual && !this.shouldAutoCache()) return;

        this.abortAllSliceCaching();

        let blockValues = this.mode === DataUtils.MODE.SPACE ? DataUtils.getFormattedTimestamps() : DataUtils.LEVELS;

        const [ selectedTimestamp, selectedLevel ] = this.mainContainer.getSelectedCoordinates();
        let selectedIndex = this.mode === DataUtils.MODE.SPACE ?
            blockValues.indexOf(selectedTimestamp) : blockValues.indexOf(selectedLevel);
        if (!selectedIndex) selectedIndex = 0;

        // to determine indices for sorting
        // filter() creates a copy so this remains untouched
        const originalBlockValues = blockValues;
        blockValues = blockValues.filter((v, i) => {
            console.log('blockValue: ', v, i, Math.abs(i - selectedIndex) <= this.MAX_CACHING_DISTANCE)
            return Math.abs(i - selectedIndex) <= this.MAX_CACHING_DISTANCE;
        });

        blockValues = blockValues.toSorted((a, b) => {
            return Math.abs(originalBlockValues.indexOf(a) - selectedIndex) - Math.abs(originalBlockValues.indexOf(b) - selectedIndex);
        });

        if (!manual) { // manual caching can't be aborted
            const blockInfos = new Map();
            for (const blockValue of blockValues) {
                const ac = new AbortController();
                blockInfos.set(blockValue, {abortController: ac, working: false});
            }

            this.sliceCachingInfo = {slices: slices, blocks: blockInfos};
        }

        const attribute = DataUtils.getCurrentAttribute();
        for (const blockValue of blockValues) {
            const ac = this.sliceCachingInfo.blocks.get(blockValue)?.abortController;
            const signal = ac ? ac.signal : null;

            const action = () => {
                const info = this.sliceCachingInfo.blocks.get(blockValue);
                if (info && info.abortController === ac) info.working = true;
                this.updateDisplays();
                return this.cacheSubset(attribute, blockValue, slices, this.mode, { signal });
            };

            this.workerPool.enqueue(action).then(() => {
                // abort controller needs to be removed by value, as the key could have become invalid due to a mode change
                // i.e. it needs to be ensured that a newer abort controller isn't removed by mistake
                this.removeSliceAbortController(ac)
            });
        }
    }

    async cacheCurrent(manual = false) {
        this.cacheCurrentBlock(manual);
        this.cacheCurrentSlicesAsBlocks(manual);
    }

    async cacheBlock(attribute, blockValue, mode, { signal, inRangeOnly = true }) {
        let range;
        // inRangeOnly only makes sense for blocks in the current mode, since slices don't have a range
        // technically, this is oblivious to range changes, but we rely on the fact that a new caching process is initiated
        // from the outside when the range changes
        if (inRangeOnly && mode === this.mode)
            range = this.mainContainer.getBlockInRange();
        else
            range = mode === DataUtils.MODE.SPACE ? DataUtils.LEVELS : DataUtils.getFormattedTimestamps();

        const [ selectedTimestamp, selectedLevel ] = this.mainContainer.getSelectedCoordinates();
        let selectedIndex = mode === DataUtils.MODE.SPACE ?
            range.indexOf(selectedLevel) : range.indexOf(selectedTimestamp);
        if (!selectedIndex) selectedIndex = 0;

        range = range.toSorted((a, b) => {
            return Math.abs(range.indexOf(a) - selectedIndex) - Math.abs(range.indexOf(b) - selectedIndex);
        });

        await this.cacheSubset(attribute, blockValue, range, mode, { signal })
    }

    async cacheSubset(attribute, point, range, mode, { signal }) {
        for (const value of range) {
            if (signal && signal.aborted) break;

            const level = mode === DataUtils.MODE.SPACE ? value : point;
            const timestamp = mode === DataUtils.MODE.SPACE ? point : value;

            await this.getDataLayer(attribute, timestamp, level, { signal });
        }
    }

    startBlockCaching(blockValue, abortController, inRangeOnly) {
        this.abortBlockCaching(); // if there is already a block being cached, abort that one before caching new block

        this.blockCachingInfo = {blockValue, abortController, inRangeOnly};
        this.updateDisplays();
    }

    updateDisplays() {
        this.updateLoadingLabel();
        this.cacheInfo.drawCanvas();
    }

    abortCaching() {
        this.abortBlockCaching();
        this.abortAllSliceCaching();
    }

    abortBlockCaching() {
        if (this.blockCachingInfo.abortController)
            this.blockCachingInfo.abortController.abort()
        this.blockCachingInfo = {blockValue: null, abortController: null, inRangeOnly: null};

        this.updateDisplays();
    }

    abortAllSliceCaching() {
        for (const [value, info] of this.sliceCachingInfo.blocks.entries()) {
            const ac = info.abortController;
            if (ac)
                ac.abort();
        }
        this.sliceCachingInfo = {slices: [], blocks: new Map()};

        // immediately clear the queue because otherwise all the jobs have to be started individually just for them
        // to immediately end anyway
        this.workerPool.clearQueue();
        this.updateDisplays();
    }

    removeSliceAbortController(abortController) {
        let foundValue = null;
        for (const [value, info] of this.sliceCachingInfo.blocks.entries()) {
            const ac = info.abortController;
            if (ac === abortController) {
                ac.abort(); // abort just in case, even though it should already be finished if it is being removed
                foundValue = value;
                break;
            }
        }
        // remove entry outside of loop just to make sure the iterator doesn't get mad at me
        if (foundValue)
            this.sliceCachingInfo.blocks.delete(foundValue);

        this.updateDisplays();
    }

    updateLoadingLabel() {
        if (this.loadingLabelCheckbox.checked &&
            (this.attributeLoading || this.blockCachingInfo.blockValue || this.sliceCachingInfo.blocks.size > 0)) {
            this.preloadLabel.textContent = 'Loading...';
        } else {
            this.preloadLabel.textContent = '';
        }
    }

    async getDataLayerTexture(attribute ,timestamp, discreteHeight, requestId) {
        return await this.getDataTexture(attribute, timestamp, discreteHeight, requestId);
    }

    generatePath(attribute, timestamp, discreteHeight) {
        timestamp = DataUtils.TIMES[this.mainContainer.pointline.timeFormat.from(timestamp)];
        let [year, month, day, hour] = timestamp.split('-');

        if (month[0] === '0') {
            month = month[1];
        }
        if (day[0] === '0') {
            day = day[1];
        }

        const date = `${year}_${month}_${day}`;
        const heightIndex = DataUtils.LEVELS.indexOf(discreteHeight);
        return `Data/downloads/data/${attribute}_${date}_${hour}_${heightIndex}.bin`;
    }

    async getDataLayer(attribute, timestamp, discreteHeight, { signal } = {}) {
        const path = this.generatePath(attribute, timestamp, discreteHeight);
        if (this.isCached(attribute, timestamp, discreteHeight)) {
            return this.getCached(attribute, timestamp, discreteHeight);
        } else {
            const data = await this.readBinary(path, { signal });
            if (data)
                this.cache(attribute, timestamp, discreteHeight, data);
            return data;
        }
    }

    getTrueExtrema() {
        if (!this.THETA_MIN || !this.THETA_MAX || !this.SALT_MIN || !this.SALT_MAX || !this.VORT_MIN || !this.VORT_MAX) {
            console.warn("Extrema data is not available yet.");
            return [0, 1]; // Fallback to a safe range
        }
    

        if (this.extremaMode === DataUtils.EXTREMA_MODE.GLOBAL) {
            switch (this.mainContainer.planeContainer.dropdownAttribute.value) {
                case "0":
                    return this.THETA_GLOBAL;
                case "1":
                    return this.SALT_GLOBAL;
                case "2":
                    return this.VORT_GLOBAL;
            }
        }

        if (this.mode === DataUtils.MODE.SPACE) {
            const lowestIndex = DataUtils.LEVELS.indexOf(DataUtils.closestLevel(this.mainContainer.relativeToLevel(1)));
            const highestIndex = DataUtils.LEVELS.indexOf(DataUtils.closestLevel(this.mainContainer.relativeToLevel(0)));
            let timestamp = this.mainContainer.pointline.noUiSlider.get();
            timestamp = DataUtils.TIMES[this.mainContainer.pointline.timeFormat.from(timestamp)];

            let minArray;
            let maxArray;

            switch (this.mainContainer.planeContainer.dropdownAttribute.value) {
                case "0":
                    minArray = this.THETA_MIN[timestamp].slice(lowestIndex, highestIndex + 1);
                    maxArray = this.THETA_MAX[timestamp].slice(lowestIndex, highestIndex + 1);
                    break;
                case "1":
                    minArray = this.SALT_MIN[timestamp].slice(lowestIndex, highestIndex + 1);
                    maxArray = this.SALT_MAX[timestamp].slice(lowestIndex, highestIndex + 1);
                    break;
                case "2":
                    minArray = this.VORT_MIN[timestamp].slice(lowestIndex, highestIndex + 1);
                    maxArray = this.VORT_MAX[timestamp].slice(lowestIndex, highestIndex + 1);
                    break;
            }

            const min = Math.min(...minArray);
            const max = Math.max(...maxArray);

            return [min, max];
        } else {
            const timeFormat = this.mainContainer.pointline.timeFormat;
            const lowestIndex = timeFormat.from(this.mainContainer.planeContainer.relativeToTime(0));
            const highestIndex = timeFormat.from(this.mainContainer.planeContainer.relativeToTime(1));
            const levelIndex = DataUtils.LEVELS.indexOf(this.mainContainer.pointline.noUiSlider.get());

            let minValues = [];
            let maxValues = [];

            for (let i = lowestIndex; i <= highestIndex; i++) {
                switch (this.mainContainer.planeContainer.dropdownAttribute.value) {
                    case "0":
                        minValues.push(this.THETA_MIN[DataUtils.TIMES[i]][levelIndex]);
                        maxValues.push(this.THETA_MAX[DataUtils.TIMES[i]][levelIndex]);
                        break;
                    case "1":
                        minValues.push(this.SALT_MIN[DataUtils.TIMES[i]][levelIndex]);
                        maxValues.push(this.SALT_MAX[DataUtils.TIMES[i]][levelIndex]);
                        break;
                    case "2":
                        minValues.push(this.VORT_MIN[DataUtils.TIMES[i]][levelIndex]);
                        maxValues.push(this.VORT_MAX[DataUtils.TIMES[i]][levelIndex]);
                        break;
                }
            }

            const min = Math.min(...minValues);
            const max = Math.max(...maxValues);

            return [min, max];
        }
    }

    getExtrema() {
        let [min, max] = this.getTrueExtrema();

        const attribute = this.mainContainer.planeContainer.dropdownAttribute.value;
        if (this.extremaOverrides.has(attribute)
            && this.extremaMode === DataUtils.EXTREMA_MODE.GLOBAL) {

            return this.extremaOverrides.get(attribute);
        }

        return [min, max];
    }


    async getDataTexture(attribute, timestamp, discreteHeight) {
        const csvData = await this.getDataLayer(attribute ,timestamp, discreteHeight);
        const data = new Uint8Array(4 * (attribute === "uv" ? csvData.length / 2 : csvData.length));
        const [min, max] = this.getExtrema()
        for (let j = 0; j < (attribute === "uv" ? csvData.length / 2 : csvData.length); j++) {
            const stride = j * 4;
            if (attribute === "uv") {
                const isLand = isNaN(csvData[j * 2])
                data[stride] = isLand ? 0 : csvData[j * 2] * 255;
                data[stride + 1] = isLand ? 0 : csvData[(j * 2) + 1] * 255;
                data[stride + 3] = isLand ? 0 : 255;
            } else {
                data[stride] = Math.min(Math.max((csvData[j] - min) / (max - min) * 255, 0), 255);
                data[stride + 3] = isNaN(csvData[j]) ? 0 : 255;
            }
        }
        const dataTexture = new THREE.DataTexture(data, 250, 250);
        dataTexture.needsUpdate = true;
        return dataTexture;
    }

    async readCSV(path, requestId) {
        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`HTTP-Error: ${response.status}`);
            }
            const originalData = await response.text();
            return originalData.split(',')
                .map(value => value.trim())
                .map(Number);
        } catch (error) {
            console.error('Error while loading:', error);
            return [];
        }
    }

    async readBinary(path, { signal } = {}) {
        try {
            const response = await fetch(path, { signal });
            if (!response.ok) {
                throw new Error(`HTTP-Error: ${response.status}`);
            }
            const arrayBuffer = await response.arrayBuffer();

            return new Float32Array(arrayBuffer);
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error while fetching file:', error);
            }

            return null;
        }
    }
}
