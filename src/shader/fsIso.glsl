uniform float isoValue;
uniform float alpha;
uniform int colorMode;
uniform bool useShading;
uniform vec3 viridis[256];
uniform vec3 autumnColors[10];
uniform vec3 divergent1Colors[8];
uniform vec3 energyColors[33];
uniform vec3 greenBrownColors[24];
uniform vec3 blueGreenColors[13];
uniform vec3 divergent2Colors1[14];
uniform float divergent2Colors2[14];
uniform float xs[256];
uniform vec3 colors[256];
uniform int colormapLength;

uniform vec3 lightPosition; 
uniform vec3 lightColor; 

varying vec3 vViewPosition;

in vec3 vNormal;
in vec3 vPosition;

out vec4 outColor;

// LEGACY: Large parts of this shader reflect incremental development decisions.
// This shader should be redesigned so that customColorMap is the only color map function that is needed.
// See ColorHelper.js for further information

vec3 viridisColor(float value) {
    int index = int(clamp(value, 0.0, 1.0) * 255.0);
    return viridis[index];
}

vec3 coldWarmColorMap(float value) {
    value = clamp(value, 0.0, 1.0);
    if (value < 0.5) {
        return mix(vec3(0.0, 0.0, 1.0), vec3(1.0, 1.0, 1.0), value * 2.0);
    } else {
        return mix(vec3(1.0, 1.0, 1.0), vec3(1.0, 0.0, 0.0), (value - 0.5) * 2.0);
    }
}

vec3 autumn5DisColorMap(float value) {
    value = clamp(value, 0.0, 1.0);
    value = 1.0 - value;

    float autumn5DisX[10] = float[](0.0, 0.2, 0.200001, 0.4, 0.400001, 0.6, 0.600001, 0.8, 0.800001, 1.0);

    for (int i = 0; i < 9; i++) {
        if (value >= autumn5DisX[i] && value <= autumn5DisX[i + 1]) {
            float t = (value - autumn5DisX[i]) / (autumn5DisX[i + 1] - autumn5DisX[i]);
            return mix(autumnColors[i], autumnColors[i + 1], t);
        }
    }

    return vec3(0.0, 0.0, 0.0);
}

vec3 energyColorMap(float value) {
    value = clamp(value, 0.0, 1.0);

    float energyX[33] = float[](0.0, 0.012000000029802282, 0.030000000074505873, 0.060000000149011634, 0.0900000002235174, 0.12000000029802321, 0.15000000037252903, 0.18000000044703485, 0.2100000005215406, 0.24000000059604648, 0.27000000067055224, 0.3300000008195639, 0.3600000008940697, 0.39000000096857546, 0.42000000104308133, 0.4500000011175871, 0.4800000011920929, 0.5100000012665987, 0.5400000013411045, 0.5700000014156104, 0.5880000014603138, 0.6000000014901161, 0.6000100014901161, 0.6400090013411045, 0.6800080011920928, 0.7200070010430812, 0.7600060008940697, 0.800005000745058, 0.8400040005960464, 0.8800030004470347, 0.9200020002980231, 0.9600010001490116, 1.0);

    for (int i = 0; i < 32; i++) {
        if (value >= energyX[i] && value <= energyX[i + 1]) {
            float t = (value - energyX[i]) / (energyX[i + 1] - energyX[i]);
            return mix(energyColors[i], energyColors[i + 1], t);
        }
    }

    return vec3(0.0, 0.0, 0.0);
}

vec3 greenBrownColorMap(float value) {
    value = clamp(value, 0.0, 1.0);

    float greenBrownX[24] = float[](0.0, 0.025, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.475, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 0.975, 1.0);

    for (int i = 0; i < 23; i++) {
        if (value >= greenBrownX[i] && value <= greenBrownX[i + 1]) {
            float t = (value - greenBrownX[i]) / (greenBrownX[i + 1] - greenBrownX[i]);
            return mix(greenBrownColors[i], greenBrownColors[i + 1], t);
        }
    }

    return vec3(0.0, 0.0, 0.0);
}

vec3 blueGreenColorMap(float value) {
    value = clamp(value, 0.0, 1.0);

    float blueGreenX[13] = float[](0.0, 0.1, 0.2, 0.30000000000000004, 0.4, 0.476765621570594, 0.5, 0.5233296185098496, 0.6000000000000001, 0.7000000000000001, 0.8, 0.9, 1.0);
    for (int i = 0; i < 12; i++) {
        if (value >= blueGreenX[i] && value <= blueGreenX[i + 1]) {
            float t = (value - blueGreenX[i]) / (blueGreenX[i + 1] - blueGreenX[i]);
            return mix(blueGreenColors[i], blueGreenColors[i + 1], t);
        }
    }

    return vec3(0.0, 0.0, 0.0);
}

vec3 yellowOrangeBrownBlueColorMap(float value) {
    value = clamp(value, 0.0, 1.0);
    value = 1.0 - value;

    float yellowOrangeBrownBlueX[8] = float[](0.0, 0.125, 0.28143, 0.443052, 0.607995, 0.808362, 0.992124, 1.0);

    for (int i = 0; i < 7; i++) {
        if (value >= yellowOrangeBrownBlueX[i] && value <= yellowOrangeBrownBlueX[i + 1]) {
            float t = (value - yellowOrangeBrownBlueX[i]) / (yellowOrangeBrownBlueX[i + 1] - yellowOrangeBrownBlueX[i]);
            return mix(divergent1Colors[i], divergent1Colors[i + 1], t);
        }
    }

    return vec3(0.0, 0.0, 0.0);
}

vec3 yellowOrangeBrownBlueColorMap2(float value) {
    value = clamp(value, 0.0, 1.0);
    value = 1.0 - value;

    for (int i = 0; i < 13; i++) {
        if (value >= divergent2Colors2[i] && value <= divergent2Colors2[i + 1]) {
            float t = (value - divergent2Colors2[i]) / (divergent2Colors2[i + 1] - divergent2Colors2[i]);
            return mix(divergent2Colors1[i], divergent2Colors1[i + 1], t);
        }
    }

    return vec3(0.0, 0.0, 0.0);
}

float getStep5(float value) {
    value = clamp(value, 0.0, 1.0);

    if (value < 0.2) {
        return 0.0;
    } else if (value < 0.4) {
        return 0.25;
    } else if (value < 0.6) {
        return 0.5;
    } else if (value < 0.8) {
        return 0.75;
    } else {
        return 1.0;
    }
}

float getStep10(float value) {
    value = clamp(value, 0.0, 1.0);

    if (value < 0.1) {
        return 0.0;
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
        return 1.0;
    }
}

vec3 viridis5ColorMap(float value) {
    return viridisColor(getStep5(value));
}

vec3 viridis10ColorMap(float value) {
    return viridisColor(getStep10(value));
}

vec3 coldWarm5ColorMap(float value) {
    return coldWarmColorMap(getStep5(value));
}

vec3 coldWarm10ColorMap(float value) {
    return coldWarmColorMap(getStep10(value));
}

vec3 customColorMap(float value) {
    value = clamp(value, 0.0, 1.0);

    for (int i = 0; i < colormapLength; i++) {
        if (value >= xs[i] && value <= xs[i + 1]) {
            float t = (value - xs[i]) / (xs[i + 1] - xs[i]);
            return mix(colors[i], colors[i + 1], t);
        }
    }

    return vec3(1.0, 1.0, 1.0);
}


vec3 getColor(float value) {
    if (colorMode == 0) {
        return viridisColor(value);
    }
    else if (colorMode == 1) {
        return coldWarmColorMap(value);
    }
    else if (colorMode == 2) {
        return yellowOrangeBrownBlueColorMap(value);
    }
    else if (colorMode == 3) {
        return yellowOrangeBrownBlueColorMap2(value);
    }
    else if (colorMode == 4) {
        return energyColorMap(value);
    }
    else if (colorMode == 5) {
        return greenBrownColorMap(value);
    }
    else if (colorMode == 6) {
        return blueGreenColorMap(value);
    }
    else if (colorMode == 7) {
        return viridis5ColorMap(value);
    }
    else if (colorMode == 8) {
        return coldWarm5ColorMap(value);
    }
    else if (colorMode == 9) {
        return autumn5DisColorMap(value);
    }
    else if (colorMode == 10) {
        return viridis10ColorMap(value);
    }
    else if (colorMode == 11) {
        return coldWarm10ColorMap(value);
    }
    else {
        return customColorMap(value);
    }
}

void main() {
    vec3 shadedColor;

    if(useShading) {
    
        vec3 normal = normalize(vNormal);
        vec3 lightDir = normalize(lightPosition - vPosition);
        vec3 viewDir = normalize(cameraPosition - vPosition);
        vec3 halfVec = normalize(lightDir + viewDir);

        float diffFront = smoothstep(0.0, 1.0, dot(normal, lightDir));
        float diffBack = smoothstep(0.0, 1.0, dot(-normal, lightDir));
        float diff = max(diffFront, diffBack * 0.5);

        float ambientStrength = 0.5;
        vec3 ambient = ambientStrength * getColor(isoValue);

        float spec = pow(max(dot(normal, halfVec), 0.0), 32.0);
        vec3 specular = lightColor * spec * 0.5;

        shadedColor = ambient + getColor(isoValue) * lightColor * diff;
        shadedColor += specular;
    } else {
        shadedColor = getColor(isoValue);
    }
    
    outColor = vec4(shadedColor, alpha);
}

