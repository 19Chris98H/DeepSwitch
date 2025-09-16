import DataUtils from "../../utils/DataUtils";

const _toggleEvent = new Event('toggle');

export class ToggleCam {

    static STATES = {FREE: 0, TOP_DOWN: 1};

    constructor() {
        const toggleSwitch = document.getElementById('cam-toggle');

        if (!toggleSwitch) {
            console.error('Toggle switch element not found!');
            return;
        }
        toggleSwitch.classList.add('active');

        const eventDispatch = this.eventDispatch.bind(this);
        toggleSwitch.addEventListener('click', () => {
            toggleSwitch.classList.toggle('active');

            eventDispatch();
        });

        this.element = toggleSwitch;
    }

    eventDispatch() {
        this.element.dispatchEvent(_toggleEvent);

        if (this.element.classList.contains('active')) {
            console.log('Toggle state: Free');
        } else {
            console.log('Toggle state: Top-Down');
        }
    }

    setState(state) {
        if (state === ToggleCam.STATES.TOP_DOWN) {
            this.element.classList.remove('active');
        } else {
            this.element.classList.add('active');
        }

        this.eventDispatch();
    }

    getState() {
        if (this.element.classList.contains('active')) {
            return ToggleCam.STATES.FREE;
        } else {
            return ToggleCam.STATES.TOP_DOWN;
        }
    }
}
