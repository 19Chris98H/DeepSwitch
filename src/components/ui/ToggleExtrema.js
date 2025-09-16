import DataUtils from "../../utils/DataUtils";

const _toggleEvent = new Event('toggle');

export class ToggleExtrema {
    constructor() {
        const toggleSwitch = document.getElementById('toggle-extrema');

        if (!toggleSwitch) {
            console.error('Toggle switch element not found!');
            return;
        }
        toggleSwitch.classList.add('active');

        toggleSwitch.addEventListener('click', () => {
            toggleSwitch.classList.toggle('active');
            toggleSwitch.dispatchEvent(_toggleEvent);

            if (toggleSwitch.classList.contains('active')) {
                console.log('Toggle state: Global');
            } else {
                console.log('Toggle state: Local');
            }
        });

        this.element = toggleSwitch;
    }

    getState() {
        if (this.element.classList.contains('active')) {
            return DataUtils.EXTREMA_MODE.GLOBAL;
        } else {
            return DataUtils.EXTREMA_MODE.LOCAL;
        }
    }
}
