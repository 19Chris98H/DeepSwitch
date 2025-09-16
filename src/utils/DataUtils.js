export default class DataUtils {
    static LEVELS = [0.5, 1.6, 2.8, 4.2, 5.8, 7.6, 9.7, 12, 14.7, 17.7, 21.1, 25, 29.3, 34.2, 39.7, 45.8, 52.7, 60.3, 68.7, 78, 88.2, 99.4, 112, 125, 139, 155, 172, 190, 209, 230, 252, 275, 300, 325, 352, 381, 410, 441, 473, 507, 541, 576, 613, 651, 690, 730, 771, 813, 856, 900, 946, 992, 1040, 1089, 1140, 1192, 1246, 1302, 1359, 1418, 1480, 1544, 1611, 1681, 1754, 1830, 1911, 1996, 2086, 2181, 2281, 2389, 2503, 2626, 2757, 2898, 3050, 3215, 3392, 3584, 3792, 4019, 4266, 4535, 4828, 5148, 5499, 5882, 6301, 6760];
    static TIMES = ['2011-09-13-0', '2011-10-13-0', '2011-11-13-0', '2011-12-13-0', '2012-01-13-0', '2012-02-13-0', '2012-03-13-0', '2012-04-13-0', '2012-05-13-0', '2012-06-13-0', '2012-07-13-0', '2012-08-13-0', '2012-09-13-0', '2012-10-13-0', '2012-11-13-0'];

    static MODE = Object.freeze({SPACE: 'Space', TIME: 'Time'});
    static EXTREMA_MODE = Object.freeze({LOCAL: 'Local', GLOBAL: 'Global'});
    static LIC_MODE = Object.freeze({ON: 'LIC ON', OFF: 'LIC OFF'});

    static attributeDropdown = document.getElementById('dropdown-attribute');
    static licToggle = document.getElementById('toggle-LIC');

    static timeFormat = {
        to: function (value) {
            const rawTimestamp = DataUtils.TIMES[Math.round(value)];
            let [year, month, day, hour] = rawTimestamp.split('-');
            year = year.substring(2);
            return `${day}.${month}.${year}+${hour}h`;
        },
        from: function (value) {
            const [day, month, rest] = value.split('.');
            const [year, time] = rest.split('+');
            const hour = time.substring(0, time.length - 1);
            const rawTimestamp = `20${year}-${month}-${day}-${hour}`;
            return DataUtils.TIMES.indexOf(rawTimestamp);
        }
    }

    static closestLevel(value) {
        for (let i = 0; i < this.LEVELS.length; i++) {
            let level = this.LEVELS[i];

            if (level >= value) {
                if (i === 0) return level;
                let prevLevel = this.LEVELS[i - 1];

                let distanceToLower = value - prevLevel;
                let distanceToUpper = level - value;

                if (distanceToLower < distanceToUpper) return prevLevel;
                else return level;
            }
        }
    }

    static getUnit() {
        let unit = '';
        const attribute = this.attributeDropdown.value;
        switch (attribute) {
            case '0':
                unit = '°C';
                break;
            case '1':
                unit = 'g/kg'
                break;
            case '2':
                unit = '1/t'
                break;
        }
        return unit;
    }

    static getCurrentAttribute() {
        if (!this.licToggle.classList.contains('active'))
            return 'uv'; // LIC is treated as its own attribute
        else
            return DataUtils.dropdownValueToAttribute(this.attributeDropdown.value);
    }

    static dropdownValueToAttribute(value) {
        switch (value) {
            case '0':
                return 'theta';
            case '1':
                return 'salt';
            case '2':
                return 'vorticity_uvw';
        }
    }

    static getFormattedTimestamps() {
        const timestamps = [];
        for (let i = 0; i < DataUtils.TIMES.length; i++) {
            const timestamp = DataUtils.timeFormat.to(i);
            timestamps.push(timestamp);
        }
        return timestamps;
    }

    static getBlock(mode) {
        return mode === DataUtils.MODE.SPACE ? DataUtils.LEVELS : DataUtils.TIMES;
    }
}