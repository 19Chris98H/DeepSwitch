import ColorHelper from "../../utils/ColorHelper.js";
import { ColorMap } from "../../utils/ColorMap.js";

function parseSciVisColorMapWithSections(xmlText) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, "text/xml");

    const colorMap = xml.querySelector("ColorMap");
    if (!colorMap) throw new Error("No <ColorMap> found.");

    const name = colorMap.getAttribute("name") || "Unnamed Colormap";

    const allPoints = Array.from(colorMap.querySelectorAll("Point"))
        .map(p => {
            const x = parseFloat(p.getAttribute("x"));
            const r = parseFloat(p.getAttribute("r"));
            const g = parseFloat(p.getAttribute("g"));
            const b = parseFloat(p.getAttribute("b"));
            const a = p.hasAttribute("o") ? parseFloat(p.getAttribute("o")) : 1.0;

            const values = { x, r, g, b };
            for (const [key, val] of Object.entries(values)) {
                if (isNaN(val) || val < 0 || val > 1) {
                    throw new Error(`Invalid value for '${key}': ${val}. Expected a number between 0 and 1.`);
                }
            }

            return { x, r, g, b, a };
        });

    allPoints.sort((a, b) => a.x - b.x);

    const xs = allPoints.map(p => p.x);
    const colors = allPoints.map(p => [p.r, p.g, p.b, p.a]);

    return { name, xs, colors };
}

export function setupColorMapLoader() {
    document.getElementById("load-colormap-btn").addEventListener("click", () => {
        document.getElementById("colormap-file-input").click();
    });

    document.getElementById("colormap-file-input").addEventListener("change", async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const { name, xs, colors } = parseSciVisColorMapWithSections(text);

            ColorHelper.addColorMap(new ColorMap(xs, colors));

            const dropdown = document.getElementById("dropdown");
            const option = document.createElement("option");
            option.textContent = name;
            option.value = dropdown.length;
            dropdown.appendChild(option);
            dropdown.value = option.value;
            dropdown.dispatchEvent(new Event("change"));
        } catch (err) {
            console.error("Error while loading the color map:", err);
            alert(
                "Failed to load custom colormap.\n" +
                "Make sure it follows the following XML structure and uses values between 0 and 1:\n\n" +
                "<ColorMaps>\n" +
                "  <ColorMap name=\"MyMap\">\n" +
                "    <Point x=\"0.0\" r=\"...\" g=\"...\" b=\"...\"/>\n" +
                "    ...\n" +
                "    <Point x=\"1.0\" r=\"...\" g=\"...\" b=\"...\"/>\n" +
                "  </ColorMap>\n" +
                "</ColorMaps>"
            );
        }

        event.target.value = "";
    });
}
