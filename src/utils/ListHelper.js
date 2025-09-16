export default class ListHelper {
    static makeListItem(value, unit, color, buttonFunction) {
        const item = document.createElement('li');

        const button = document.createElement('button');
        button.classList.add('list-button');
        button.addEventListener('click', () => {
            buttonFunction();
        });

        const valueField = document.createElement('span');
        valueField.classList.add('list-value');

        const colorCanvas = document.createElement('canvas');
        colorCanvas.classList.add('list-color');

        item.appendChild(button);
        item.appendChild(valueField);
        item.appendChild(colorCanvas);

        ListHelper.updateColor(item, color);
        ListHelper.updateValueField(item, value, unit);

        return item;
    }

    static updateColor(element, color) {
        const canvas = element.querySelector('.list-color');
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    static updateValueField(element, value, unit) {
        const field = element.querySelector('.list-value');
        field.textContent = value + ' ' + unit;
    }
}