import ColorHelper from "../../utils/ColorHelper";
import ListHelper from "../../utils/ListHelper";
import DataUtils from "../../utils/DataUtils";

export default class IsoList {
    constructor(dataManager, marchingCubes) {
        this.dataManager = dataManager;
        this.marchingCubes = marchingCubes;

        this.listElement = document.getElementById('iso-list');
        this.colorModeDropdown = document.getElementById('dropdown');
        this.attributeDropdown = document.getElementById('dropdown-attribute');

        this.colorModeDropdown.addEventListener('change', () => {
            this.updateColors();
        });

        this.attributeDropdown.addEventListener('change', () => {
            this.updateUnits();
        });

        this.listItems = new Map();
    }

    addItem(value) {
        const color = this.valueToColor(value);
        const unit = DataUtils.getUnit();

        if (this.listItems.has(value)) return false;

        const listItem = ListHelper.makeListItem(value, unit, color, this.removeItem.bind(this, value));
        this.listItems.set(value, listItem);
        this.listElement.appendChild(listItem);
        return true;
    }

    removeItem(value) {
        const element = this.listItems.get(value);
        if (element) {
            this.listItems.delete(value);
            element.remove();

            this.marchingCubes.deleteMesh(value);
            return true;
        }
        return false;
    }

    removeAll() {
        // copy so iteration doesn't get interrupted by the elements changing
        let listItemsCopy = new Map(this.listItems);
        for (const value of listItemsCopy.keys()) {
            this.removeItem(value);
        }
    }

    valueToColor(value) {
        const [min, max] = this.dataManager.getExtrema();
        // normalize based on extrema
        const normalizedValue = (value - min) / (max - min);
        const colorMode = parseInt(this.colorModeDropdown.value);

        let color = ColorHelper.colorModeColor(colorMode, normalizedValue);
        // map components from [0, 1] to [0, 255]
        color = color.map((component) => {
            return component * 255;
        })

        return color;
    }

    updateColors() {
        for (const [value, element] of this.listItems) {
            const color = this.valueToColor(value);
            ListHelper.updateColor(element, color);
        }

        this.updateUnits();
    }

    updateUnits() {
        for (const [value, element] of this.listItems) {
            const unit = DataUtils.getUnit();
            ListHelper.updateValueField(element, value, unit);
        }
    }
}