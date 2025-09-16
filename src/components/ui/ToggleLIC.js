import DataUtils from "../../utils/DataUtils";

const _toggleEvent = new Event('toggle');

export class ToggleLIC {
    constructor() {
        const toggleSwitch = document.getElementById('toggle-LIC');

        if (!toggleSwitch) {
            console.error('Toggle switch element not found!');
            return;
        }
        toggleSwitch.classList.add('active');

        toggleSwitch.addEventListener('click', () => {
            toggleSwitch.classList.toggle('active');
            toggleSwitch.dispatchEvent(_toggleEvent);

            if (toggleSwitch.classList.contains('active')) {
                console.log('Toggle state: No LIC');
            } else {
                console.log('Toggle state: LIC');
            }
        });

        this.element = toggleSwitch;
    }

    getState() {
        if (this.element.classList.contains('active')) {
            return DataUtils.LIC_MODE.OFF;
        } else {
            return DataUtils.LIC_MODE.ON;
        }
    }
}
