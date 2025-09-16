import DataUtils from "../../utils/DataUtils";

export default class RangeLine {

    mode = DataUtils.MODE.SPACE;
    bound = new Map();

    updatedHandles = [];
    createEventsNum = 0;

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

        this.create([0, DataUtils.LEVELS[DataUtils.LEVELS.length - 1]]);
    }

    create(handles) {
        if (this.noUiSlider) this.noUiSlider.destroy();

        if (this.mode === DataUtils.MODE.SPACE) {
            noUiSlider.create(this.element, {
                start: handles,
                range: {
                    min: 0,
                    max: DataUtils.LEVELS.length - 1
                },
                step: 1,
                connect: true,
                orientation: 'vertical',
                direction: 'ltr',
                tooltips: true,
                format: this.levelFormat,
                pips: {mode: 'steps', format: this.levelFormat, filter: this.levelFilter},
            });
        } else if (this.mode === DataUtils.MODE.TIME) {
            noUiSlider.create(this.element, {
                start: handles,
                range: {
                    min: 0,
                    max: DataUtils.TIMES.length - 1
                },
                step: 1,
                connect: true,
                orientation: 'vertical',
                direction: 'rtl',
                tooltips: true,
                format: this.timeFormat,
                pips: {mode: 'steps', format: this.timeFormat, filter: this.timeFilter, density: 50},
            });
        } else {
            console.log('ERROR: unknown mode');
        }

        // convenient alias
        this.noUiSlider = this.element.noUiSlider;

        this.previousValues = this.noUiSlider.get();

        // recreating the slider will lose the selection, so we have to reapply it
        if (this.selectedHandleValue) {
            const innerValues = this.noUiSlider.get().slice(1, handles.length);
            this.selectHandle(innerValues.indexOf(this.selectedHandleValue) + 1);
        }

        let first = this.element.querySelector('.noUi-handle[data-handle="' + 0 + '"]');
        let last = this.element.querySelector('.noUi-handle[data-handle="' + (handles.length - 1) + '"]');
        first.classList.add('range-handle');
        last.classList.add('range-handle');

        let tooltips = this.noUiSlider.getTooltips();
        tooltips[0].style.display = 'none';
        tooltips[(handles.length - 1)].style.display = 'none';

        // special handling for update events, since we want to avoid sending one for every handle when recreating
        // the slider to add a handle
        this.noUiSlider.on('update.meta', this.onUpdate.bind(this));

        // rebind events
        for (const [event, func] of this.bound) {
            const eventType = event.split('.')[0]
            if (eventType !== 'update') // special update handling
                this.noUiSlider.on(event, func);
        }
    }

    onUpdate(values, handle, unencoded, tap, positions, noUiSlider) {
        //console.log('num: ' + this.createEventsNum);
        if (this.createEventsNum > 0) { // special handling of the events that are fired immediately after recreating
            this.createEventsNum--;
            // do not send events for updates of handles that aren't new
            if (!this.updatedHandles.includes(handle))
                return;
        } else {
            // after processing all create events, clear list
            this.updatedHandles = [];
        }

        for (const [event, func] of this.bound) {
            const eventType = event.split('.')[0]
            if (eventType === 'update') // fire all bound update events
                func(values, handle, unencoded, tap, positions, noUiSlider);
        }
    }

    enforceConstraint(values, handle) {
        if (values.length < 2) return;

        // prevent range handles from overlapping with each other
        if (handle === 0 || handle === values.length - 1) {
            if (values[0] === values[values.length - 1]) {
                let valueIndex = this.mode === DataUtils.MODE.TIME ?
                    this.timeFormat.from(values[0]) : DataUtils.LEVELS.indexOf(values[0]);
                valueIndex = handle === 0 ? valueIndex - 1 : valueIndex + 1;

                let value = this.mode === DataUtils.MODE.TIME ?
                    this.timeFormat.to(valueIndex) : DataUtils.LEVELS[valueIndex];

                this.noUiSlider.setHandle(handle, value);
                this.previousValues = this.noUiSlider.get();
                return true;
            } else {
                return false;
            }
        }

        if (values.length !== this.previousValues.length) {
            this.previousValues = values;
            return; // ignore events where handles were added or removed
        }

        // only check the inner handles
        const innerValues = values.slice(1, values.length - 1);

        // check if the update caused two handles to have the same value
        let duplicate = null;
        for (let i = 1; i < innerValues.length; i++) {
            let firstValue = innerValues[i - 1];
            let secondValue = innerValues[i];

            if (firstValue === secondValue) {
                duplicate = firstValue;
                break;
            }
        }

        if (duplicate) {
            const prevInnerValues = this.previousValues.slice(1, this.previousValues.length);
            const index = prevInnerValues.indexOf(duplicate); // index of the original handle that had the duplicate value first

            // the index of the duplicate value in the respective mode's layers
            let valueIndex = this.mode === DataUtils.MODE.TIME ?
                this.timeFormat.from(duplicate) : DataUtils.LEVELS.indexOf(duplicate);

            // determine whether the handle before or after the original handle changed to be the duplicate
            let handleIndex;
            if (index !== 0 && innerValues[index - 1] === duplicate) { // before case
                valueIndex--; // snap it to the value right before the duplicate value
                handleIndex = index - 1 + 1; // transform innerValues index to values index
            } else if (index !== innerValues.length - 1 && innerValues[index + 1] === duplicate) { // after case
                valueIndex++; // snap to after
                handleIndex = index + 1 + 1;
            } else {
                console.log('ERROR: can\'t enforce constraints, unknown state');
                console.log(this.previousValues);
                console.log(values);
            }

            // transform the index into the actual value based on the mode
            let value = this.mode === DataUtils.MODE.TIME ?
                this.timeFormat.to(valueIndex) : DataUtils.LEVELS[valueIndex];

            // set the handle
            // this will technically fire another event before previousValues is updated, but that's fine in normal
            // conditions as there will no longer be a duplicate present so previousValues won't be used and only updated
            this.noUiSlider.setHandle(handleIndex, value);
            // update previous values anyways, just in case
            this.previousValues = this.noUiSlider.get();
            return true; // return true to signify that constraints were enforced
        }

        this.previousValues = values;
        return false; // no constraint was enforced
    }

    setMode(mode) {
        if (this.mode === mode) return;

        this.mode = mode;

        if (this.mode === DataUtils.MODE.SPACE) {
            this.create([DataUtils.LEVELS[0], DataUtils.LEVELS[DataUtils.LEVELS.length - 1]]);
        } else if (this.mode === DataUtils.MODE.TIME) {
            this.create([this.timeFormat.to(0), this.timeFormat.to(DataUtils.TIMES.length - 1)]);
        }
    }

    addHandle(level) {
        this.addHandles([level]);
    }

    addHandles(levels, suppressEvents = false) {
        let handles = this.noUiSlider.get();
        for (const level of levels) {
            handles.push(level);
        }

        if (this.mode === DataUtils.MODE.SPACE) {
            handles.sort((a, b) => {
                return a - b;
            });
        } else if (this.mode === DataUtils.MODE.TIME) {
            handles.sort((a, b) => {
                return this.timeFormat.from(a) - this.timeFormat.from(b);
            });
        } else {
            console.log('ERROR: unknown mode');
            return;
        }

        const innerHandles = handles.slice(1, handles.length - 1); // only consider inner handles
        this.updatedHandles = [];
        for (const level of levels) {
            // save which handles are actually new
            this.updatedHandles.push(innerHandles.indexOf(level) + 1); // +1 to go convert from innerHandles index to handles index
        }
        if (suppressEvents) // suppress events by pretending no handles were updated
            this.updatedHandles = [];

        this.createEventsNum = handles.length; // on recreation, an event is fired for every handle

        this.create(handles);
    }

    removeHandle(level) {
        this.removeHandles([level]);
    }

    removeHandles(levels) {
        let handles = this.noUiSlider.get();
        for (const level of levels) {
            const index = handles.indexOf(level);

            if (index < 0) {
                console.log(`ERROR: tried to remove handle ${level} from ${handles} but does not exist`);
                return false;
            }

            handles.splice(index, 1);
        }

        this.createEventsNum = handles.length;
        this.updatedHandles = []; // shouldn't need update events on removal

        this.create(handles);
        return true;
    }

    selectHandle(index) {
        const handleElements = this.element.getElementsByClassName('noUi-handle');
        if (index === 0 || index === handleElements.length - 1) return;
        handleElements[index].classList.add('selected');

        this.selectedHandleValue = this.noUiSlider.get()[index];
    }

    deselectHandle(index) {
        const handleElements = this.element.getElementsByClassName('noUi-handle');
        handleElements[index].classList.remove('selected');

        if (this.noUiSlider.get()[index] === this.selectedHandleValue)
            this.selectedHandleValue = null;
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
        let factor = Math.ceil(DataUtils.TIMES.length / MAX_FULL_LABELS);

        const half = DataUtils.TIMES.length / 2;

        if (value < half) {
            if (value % factor === 0) return 1;
            else if (value % 1 === 0) return 0;
            else return -1;
        } else {
            const reverseValue = DataUtils.TIMES.length - 1 - value;

            if (reverseValue % factor === 0) return 1;
            else if (reverseValue % 1 === 0) return 0;
            else return -1;
        }
    };
}