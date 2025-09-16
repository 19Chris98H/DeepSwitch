import json
import yaml

with open("links.json") as f:
    VAR_TO_LINK = json.load(f)

with open("levels.json") as f:
    dictionary = json.load(f)
# Dictionary with {depth: level}
DEPTH_DICT = {float(k): int(v) - 1 for k, v in dictionary.items()}

with open('/config.yml', 'r') as file:
    CONFIG = yaml.safe_load(file)

COORDINATES = CONFIG["coordinates"]
# GLOBAL VARIABLES FOR DATA RANGES
X_RANGE = [int(COORDINATES["x_min"]), int(COORDINATES["x_max"])]
Y_RANGE = [int(COORDINATES["y_min"]), int(COORDINATES["y_max"])]
