import {viridisColors} from "../assets/maps/ViridisTable";
import {autumnColors} from "../assets/maps/AutumnTable";
import {divergent1Colors} from "../assets/maps/Divergent1";
import {energyColors} from "../assets/maps/Energy";
import {greenBrownColors} from "../assets/maps/GreenBrown";
import {blueGreenColors} from "../assets/maps/BlueGreen";
import {divergent2Colors1, divergent2Colors2} from "../assets/maps/Divergent2";
import {ColorMap} from "./ColorMap";

// LEGACY: This class reflects incremental development decisions.
// It should be redesigned for better maintainability in the future.

// All color maps should be stored in assets/maps as xml. files.
// They should all be loaded at the beginning by the ColorMapLoader and added to the ColorHelper.
// By managing color maps that way all hard coded color map functions can be replaced by the customColorMap functions.
// Furthermore, redundant code parts in the shaders fsLIC.glsl and fsIso.glsl would then also be eliminated.
export default class ColorHelper {

    static #colormaps = [];

    static addColorMap(colormap) {
        if (!(colormap instanceof ColorMap)) {
            throw new Error("Expected instance of ColorMap.");
        }
        this.#colormaps.push(colormap);

        console.log(this.#colormaps.length);
    }

    static colorModeColor(colorMode, value) {
        let color;
        switch (colorMode) {
            case (0) : color = ColorHelper.viridisColor(value); break;
            case (1) : color = ColorHelper.coldWarmColorMap(value); break;
            case (2) : color = ColorHelper.yellowOrangeBrownBlueColorMap(value); break;
            case (3) : color = ColorHelper.yellowOrangeBrownBlueColorMap2(value); break;
            case (4) : color = ColorHelper.energyColorMap(value); break;
            case (5) : color = ColorHelper.greenBrownColorMap(value); break;
            case (6) : color = ColorHelper.blueGreenColorMap(value); break;
            case (7) : color = ColorHelper.viridis5ColorMap(value); break;
            case (8) : color = ColorHelper.coldWarm5ColorMap(value); break;
            case (9) : color = ColorHelper.autumn5DisColorMap(value); break;
            case (10) : color = ColorHelper.viridis10ColorMap(value); break;
            case (11) : color = ColorHelper.coldWarm10ColorMap(value); break;
            default : color = ColorHelper.customColorMap(colorMode - 12, value); break;
        }
        return color;
    }

    static getCustomColorMapValues(customColorMapIndex)
    {
        const xs = this.#colormaps[customColorMapIndex].getPoints();
        const colors = this.#colormaps[customColorMapIndex].getColors();
        return {xs, colors};
    }

    static customColorMap(customColorMapIndex, value) {
        value = Math.max(0, Math.min(1, value));
        const xs = this.#colormaps[customColorMapIndex].getPoints();
        const colors = this.#colormaps[customColorMapIndex].getColors();

        for (let i = 0; i < xs.length - 1; i++) {
            if (value >= xs[i] && value <= xs[i + 1]) {
                const t = (value - xs[i]) / (xs[i + 1] - xs[i]);
                return [
                    colors[i][0] + t * (colors[i + 1][0] - colors[i][0]),
                    colors[i][1] + t * (colors[i + 1][1] - colors[i][1]),
                    colors[i][2] + t * (colors[i + 1][2] - colors[i][2])
                ];
            }
        }
    }

    static viridisColor(value) {
        let index = Math.floor(Math.max(0, Math.min(1, value)) * 255);
        return viridisColors[index];
    }

    static coldWarmColorMap(value) {
        value = Math.max(0, Math.min(1, value));
        if (value < 0.5) {
            return [
                Math.max(0, Math.min(1, value * 2)),
                Math.max(0, Math.min(1, value * 2)),
                1.0
            ];
        } else {
            return [
                1.0,
                1.0 - Math.max(0, Math.min(1, (value - 0.5) * 2)),
                1.0 - Math.max(0, Math.min(1, (value - 0.5) * 2)),
            ];
        }
    }

    static autumn5DisColorMap(value) {
        value = Math.max(0, Math.min(1, value));
        value = 1 - value;
        const autumn5DisX = [0.000000, 0.200000, 0.200001, 0.400000, 0.400001, 0.600000, 0.600001, 0.800000, 0.800001, 1.000000];

        for (let i = 0; i < autumn5DisX.length - 1; i++) {
            if (value >= autumn5DisX[i] && value <= autumn5DisX[i + 1]) {
                const t = (value - autumn5DisX[i]) / (autumn5DisX[i + 1] - autumn5DisX[i]);
                return [
                    autumnColors[i][0] + t * (autumnColors[i + 1][0] - autumnColors[i][0]),
                    autumnColors[i][1] + t * (autumnColors[i + 1][1] - autumnColors[i][1]),
                    autumnColors[i][2] + t * (autumnColors[i + 1][2] - autumnColors[i][2])
                ];
            }
        }
    }

    static yellowOrangeBrownBlueColorMap(value) {
        value = Math.max(0, Math.min(1, value));
        value = 1 - value;
        const yellowOrangeBrownBlueX = [0.000000, 0.125000, 0.281430, 0.443052, 0.607995, 0.808362, 0.992124, 1.000000];

        for (let i = 0; i < yellowOrangeBrownBlueX.length - 1; i++) {
            if (value >= yellowOrangeBrownBlueX[i] && value <= yellowOrangeBrownBlueX[i + 1]) {
                const t = (value - yellowOrangeBrownBlueX[i]) / (yellowOrangeBrownBlueX[i + 1] - yellowOrangeBrownBlueX[i]);
                return [
                    divergent1Colors[i][0] + t * (divergent1Colors[i + 1][0] - divergent1Colors[i][0]),
                    divergent1Colors[i][1] + t * (divergent1Colors[i + 1][1] - divergent1Colors[i][1]),
                    divergent1Colors[i][2] + t * (divergent1Colors[i + 1][2] - divergent1Colors[i][2])
                ];
            }
        }
    }

    static greenBrownColorMap(value) {
        value = Math.max(0, Math.min(1, value));
        const greenBrownX = [
            0.0,
            0.025,
            0.05,
            0.1,
            0.15,
            0.2,
            0.25,
            0.3,
            0.35,
            0.4,
            0.45,
            0.475,
            0.5,
            0.55,
            0.6,
            0.65,
            0.7,
            0.75,
            0.8,
            0.85,
            0.9,
            0.95,
            0.975,
            1.0
        ];

        for (let i = 0; i < greenBrownX.length - 1; i++) {
            if (value >= greenBrownX[i] && value <= greenBrownX[i + 1]) {
                const t = (value - greenBrownX[i]) / (greenBrownX[i + 1] - greenBrownX[i]);
                return [
                    greenBrownColors[i][0] + t * (greenBrownColors[i + 1][0] - greenBrownColors[i][0]),
                    greenBrownColors[i][1] + t * (greenBrownColors[i + 1][1] - greenBrownColors[i][1]),
                    greenBrownColors[i][2] + t * (greenBrownColors[i + 1][2] - greenBrownColors[i][2])
                ];
            }
        }
    }

    static blueGreenColorMap(value) {
        value = Math.max(0, Math.min(1, value));
        const  blueGreenX = [
            0.0,
            0.1,
            0.2,
            0.30000000000000004,
            0.4,
            0.476765621570594,
            0.5,
            0.5233296185098496,
            0.6000000000000001,
            0.7000000000000001,
            0.8,
            0.9,
            1.0
        ];

        for (let i = 0; i < blueGreenX.length - 1; i++) {
            if (value >= blueGreenX[i] && value <= blueGreenX[i + 1]) {
                const t = (value - blueGreenX[i]) / (blueGreenX[i + 1] - blueGreenX[i]);
                return [
                    blueGreenColors[i][0] + t * (blueGreenColors[i + 1][0] - blueGreenColors[i][0]),
                    blueGreenColors[i][1] + t * (blueGreenColors[i + 1][1] - blueGreenColors[i][1]),
                    blueGreenColors[i][2] + t * (blueGreenColors[i + 1][2] - blueGreenColors[i][2])
                ];
            }
        }
    }

    static energyColorMap(value) {
        value = Math.max(0, Math.min(1, value));
        const energyX = [
            0.0,
            0.012000000029802282,
            0.030000000074505873,
            0.060000000149011634,
            0.0900000002235174,
            0.12000000029802321,
            0.15000000037252903,
            0.18000000044703485,
            0.2100000005215406,
            0.24000000059604648,
            0.27000000067055224,
            0.30000000074505806,
            0.3300000008195639,
            0.3600000008940697,
            0.39000000096857546,
            0.42000000104308133,
            0.4500000011175871,
            0.4800000011920929,
            0.5100000012665987,
            0.5400000013411045,
            0.5700000014156104,
            0.5880000014603138,
            0.6000000014901161,
            0.6000100014901161,
            0.6400090013411045,
            0.6800080011920928,
            0.7200070010430812,
            0.7600060008940697,
            0.800005000745058,
            0.8400040005960464,
            0.8800030004470347,
            0.9200020002980231,
            0.9600010001490116,
            1.0
        ];

        for (let i = 0; i < energyX.length - 1; i++) {
            if (value >= energyX[i] && value <= energyX[i + 1]) {
                const t = (value - energyX[i]) / (energyX[i + 1] - energyX[i]);
                return [
                    energyColors[i][0] + t * (energyColors[i + 1][0] - energyColors[i][0]),
                    energyColors[i][1] + t * (energyColors[i + 1][1] - energyColors[i][1]),
                    energyColors[i][2] + t * (energyColors[i + 1][2] - energyColors[i][2])
                ];
            }
        }
    }



    static yellowOrangeBrownBlueColorMap2(value) {
        value = Math.max(0, Math.min(1, value));
        value = 1 - value;

        for (let i = 0; i < divergent2Colors2.length - 1; i++) {
            if (value >= divergent2Colors2[i] && value <= divergent2Colors2[i + 1]) {
                const t = (value - divergent2Colors2[i]) / (divergent2Colors2[i + 1] - divergent2Colors2[i]);
                return [
                    divergent2Colors1[i][0] + t * (divergent2Colors1[i + 1][0] - divergent2Colors1[i][0]),
                    divergent2Colors1[i][1] + t * (divergent2Colors1[i + 1][1] - divergent2Colors1[i][1]),
                    divergent2Colors1[i][2] + t * (divergent2Colors1[i + 1][2] - divergent2Colors1[i][2])
                ];
            }
        }
    }

    static getStep5(value) {
        value = Math.max(0, Math.min(1, value));
        if (value < 0.2)
        {
            return 0;
        }
        else if (0.2 <= value && value < 0.4)
        {
            return 0.25;
        }
        else if (0.4 <= value && value < 0.6)
        {
            return 0.5;
        }
        else if (0.6 <= value && value < 0.8)
        {
            return 0.75;
        }
        else
        {
            return 1;
        }
    }

    static getStep10(value) {
        value = Math.max(0, Math.min(1, value));

        if (value < 0.1) {
            return 0;
        } else if (value < 0.2) {
            return 0.111;
        } else if (value < 0.3) {
            return 0.222;
        } else if (value < 0.4) {
            return 0.333;
        } else if (value < 0.5) {
            return 0.444;
        } else if (value < 0.6) {
            return 0.555;
        } else if (value < 0.7) {
            return 0.666;
        } else if (value < 0.8) {
            return 0.777;
        } else if (value < 0.9) {
            return 0.888;
        } else {
            return 1;
        }
    }

    static viridis5ColorMap(value) {
        return ColorHelper.viridisColor(ColorHelper.getStep5(value));
    }

    static viridis10ColorMap(value) {
        return ColorHelper.viridisColor(ColorHelper.getStep10(value));
    }

    static coldWarm5ColorMap(value) {
        return ColorHelper.coldWarmColorMap(ColorHelper.getStep5(value));
    }

    static coldWarm10ColorMap(value) {
        return ColorHelper.coldWarmColorMap(ColorHelper.getStep10(value));
    }
}