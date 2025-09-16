import DataUtils from "../../utils/DataUtils";

export default class RangeLine {

    mode = DataUtils.MODE.SPACE;
    bound = new Map();

    constructor(element) {
        this.element = element;

        this.levelFormat = {
            to: function (value) {
                return DataUtils.LEVELS[Math.round(value)];
            },
            from: function (value) {
                return DataUtils.LEVELS.indexOf(Number(value));
            }
        };

        this.timeFormat = DataUtils.timeFormat;

        this.create();
    }

    create(start=null) {
        if (this.noUiSlider) this.noUiSlider.destroy();

        if (this.mode === DataUtils.MODE.SPACE) {
            if (start === null)
                start = this.timeFormat.to(0);

            noUiSlider.create(this.element, {
                start: [start],
                range: {
                    min: 0,
                    max: DataUtils.TIMES.length - 1
                },
                step: 1,
                connect: [true, false],
                orientation: 'horizontal',
                direction: 'ltr',
                tooltips: true,
                format: this.timeFormat,
                pips: {mode: 'steps', format: this.timeFormat, filter: this.timeFilter},
            });
        } else if (this.mode === DataUtils.MODE.TIME) {
            if (start === null)
                start = DataUtils.LEVELS[0];

            noUiSlider.create(this.element, {
                start: [start],
                range: {
                    min: 0,
                    max: DataUtils.LEVELS.length - 1
                },
                step: 1,
                connect: [true, false],
                orientation: 'horizontal',
                direction: 'ltr',
                tooltips: true,
                format: this.levelFormat,
                pips: {mode: 'steps', format: this.levelFormat, filter: this.levelFilter},
            });
        }

        this.noUiSlider = this.element.noUiSlider;

        for (const [event, func] of this.bound) {
            this.noUiSlider.on(event, func);
        }
    }

    setMode(mode, start=null) {
        if (this.mode === mode) return;

        this.mode = mode;

        this.create(start);
    }

    bind(event, func) {
        this.bound.set(event, func);
        this.noUiSlider.on(event, func);
    }

    levelFilter(value, type) {
        if (value % 8 === 0)
            return 1;
        else if (value % 4 === 0)
            return 2;
        else return 0;
    };

    timeFilter(value, type) {
        const MAX_FULL_LABELS = 16;
        // determines how many small pips between large pips
        // concretely, a factor of n means n-1 small pips
        let factor = Math.ceil(DataUtils.TIMES.length / MAX_FULL_LABELS);

        const half = DataUtils.TIMES.length / 2;
        // when half is uneven, two big pips would collide in the middle, so we shrink them
        const shouldShrink = half % 2 === 1 && DataUtils.TIMES.length >= 26;

        if (value < half) {
            if (value % factor === 0) {
                if (shouldShrink && value === half -1) return 2;
                return 1;
            }
            else if (value % 1 === 0) return 0;
            else return -1;
        } else {
            // for the second half of the data, determine pip size starting from the right
            const reverseValue = DataUtils.TIMES.length - 1 - value;

            if (reverseValue % factor === 0) {
                if (shouldShrink && reverseValue === half -1) return 2;
                return 1;
            }
            else if (reverseValue % 1 === 0) return 0;
            else return -1;
        }
    };
}