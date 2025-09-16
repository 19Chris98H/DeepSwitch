import {DataManager} from "../DataManager";
import DataUtils from "../../utils/DataUtils";

export default class ColorScaleSettings {

    advancedSettingsVisible = false;

    constructor(dataManager, mainContainer, extremaToggle) {
        this.dataManager = dataManager;
        this.mainContainer = mainContainer;
        this.extremaToggle = extremaToggle;

        this.settingsContainer = document.getElementById('advanced-settings-container');
        this.buttonContainer = document.getElementById('advanced-button-container');
        this.settingsButton = document.getElementById('advanced-settings-button');

        this.minField = document.getElementById('color-min');
        this.maxField = document.getElementById('color-max');

        this.autofillField = document.getElementById('autofill-percentage');

        this.setButton = document.getElementById('set-button');
        this.resetButton = document.getElementById('reset-button');

        this.autofillButton = document.getElementById('autofill-button');

        this.attributeDropdown = document.getElementById("dropdown-attribute");

        this.leftLabel = document.getElementById('label-left');
        this.rightLabel = document.getElementById('label-right');

        this.globalLabel = document.getElementById('global-label');

        this.attributeDropdown.addEventListener('change', (event) => {
            this.updateTextFields();
            this.updateLabelColors();
        });

        this.extremaToggle.element.addEventListener('toggle', () => {
           this.updateLabelColors();
        });

        this.settingsButton.addEventListener('click', () => {
            this.toggleVisibility();
        });

        this.setButton.addEventListener('click', () => {
            this.setMinMax();
        });

        this.resetButton.addEventListener('click', () => {
            this.resetMinMax();
        });

        this.autofillButton.addEventListener('click', () => {
            this.autofill();
        })

        this.updateTextFields();
    }

    setMinMax() {
        const min = this.minField.valueAsNumber;
        const max = this.maxField.valueAsNumber;

        const attribute = this.attributeDropdown.value;

        this.dataManager.extremaOverrides.set(attribute, [min, max]);
        this.reflectChanges();
    }

    resetMinMax() {
        const attribute = this.attributeDropdown.value;

        this.dataManager.extremaOverrides.delete(attribute);
        this.reflectChanges();
    }

    autofill() {
        let [min, max] = this.dataManager.getTrueExtrema();
        const percentage = this.autofillField.valueAsNumber / 100;

        const domain = max - min;
        min += percentage * domain;
        max -= percentage * domain;

        this.minField.value = parseFloat(min.toFixed(2));
        this.maxField.value = parseFloat(max.toFixed(2));
    }

    reflectChanges() {
        this.mainContainer.updateLabels();
        this.updateLabelColors();
        this.mainContainer.planeContainer.updatePlanesTexture();
        this.mainContainer.marchingCubes.setMeshColors();
    }

    updateTextFields() {
        const [min, max] = this.dataManager.getExtrema();

        this.minField.value = parseFloat(min.toFixed(2));
        this.maxField.value = parseFloat(max.toFixed(2));
    }

    updateLabelColors() {
        const attribute = this.attributeDropdown.value;

        if (this.dataManager.extremaOverrides.has(attribute)) {
            // the global label should always be colored if there is an override
            //this.globalLabel.style.background = '#ffc864';

            // the left and right labels should only be colored if the mode is actually set to global
            if (this.dataManager.extremaMode === DataUtils.EXTREMA_MODE.GLOBAL) {
                //this.leftLabel.style.background = '#ffc864';
                //this.rightLabel.style.background = '#ffc864';
            } else {
                this.leftLabel.style.background = '#ffffff';
                this.rightLabel.style.background = '#ffffff';
            }
        } else {
            // if there is no override, nothing should be colored
            this.globalLabel.style.background = '#ffffff';

            this.leftLabel.style.background = '#ffffff';
            this.rightLabel.style.background = '#ffffff';
        }
    }

    toggleVisibility() {
        if (!this.advancedSettingsVisible) {
            this.settingsContainer.style.display = 'block';

            this.buttonContainer.style.background = '#eeeeee';

            this.settingsButton.textContent = '▼ Advanced Settings';
            this.settingsButton.style.background = '#eeeeee';

            this.advancedSettingsVisible = true;
        } else {
            this.settingsContainer.style.display = 'none';

            this.buttonContainer.style.background = '#ffffff';

            this.settingsButton.textContent = '▶ Advanced Settings';
            this.settingsButton.style.background = '#ffffff';

            this.advancedSettingsVisible = false
        }
    }
}