import DataUtils from "../../utils/DataUtils";

const _toggleEvent = new Event('toggle');

export class ToggleSwitch {
    constructor() {
        const toggleSwitch = document.getElementById('toggle-switch');

        if (!toggleSwitch) {
            console.error('Toggle switch element not found!');
            return;
        }
        toggleSwitch.classList.add('active');

        toggleSwitch.addEventListener('click', () => {
            toggleSwitch.classList.toggle('active');
            toggleSwitch.dispatchEvent(_toggleEvent);

            if (toggleSwitch.classList.contains('active')) {
                console.log('Toggle state: SPACE');
            } else {
                console.log('Toggle state: TIME');
            }
        });

        this.element = toggleSwitch;
    }

    getState() {
        if (this.element.classList.contains('active')) {
            return DataUtils.MODE.SPACE;
        } else {
            return DataUtils.MODE.TIME;
        }
    }
}
