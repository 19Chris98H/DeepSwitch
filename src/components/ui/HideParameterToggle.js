export function setupHideParameterToggle(scene) {
    const toggleButton = document.querySelector('.parameterHideToggle-button');
    const rightPanel = document.querySelector('.right');
    const body = document.body;

    const changeEvent = new CustomEvent('toggle');

    let isRightPanelVisible = false;

    const toggle = () => {
        if (isRightPanelVisible) {
            body.style.gridTemplateColumns = '15fr 85fr 0fr';
            rightPanel.style.display = 'none'
            toggleButton.textContent = '◀';

            toggleButton.dispatchEvent(changeEvent);
        } else {
            body.style.gridTemplateColumns = '15fr 65fr 20fr';
            rightPanel.style.display = 'block';
            toggleButton.textContent = '▶';
            rightPanel.style.display = 'flex';

            toggleButton.dispatchEvent(changeEvent);
        }

        isRightPanelVisible = !isRightPanelVisible;
        scene.onResize();
    }

    document.addEventListener('keydown', event => {
        if ((event.key === 'p' || event.key === 'P') && !event.repeat) {
            toggle();
        }
    });

    toggleButton.addEventListener('click', () => {
        toggle();
    });
}
