import os
import datetime
import re
import json

import numpy as np

VARIABLES = ["salt", "theta", "vorticity_uvw"]
DATA_DIRECTORY = "downloads/data"
NAME_DICT = {
    "salt": "SALT",
    "theta": "THETA",
    "vorticity_uvw": "VORT",
}


def get_all_filenames():
    return os.listdir(DATA_DIRECTORY)


def get_all_dates(variable_files, variable):
    dates = set()
    for filename in variable_files:
        # Remove variable name and extension
        filename = filename.removeprefix(variable + "_")
        filename = filename.removesuffix(".bin")
        filename = re.sub(r'_\d{1,2}$', "", filename)

        # Convert to date
        date = datetime.datetime.strptime(filename, "%Y_%m_%d_%H")
        dates.add(date)
    return dates


def get_min_max_per_month(dir, prefix):
    min_values = []
    max_values = []

    counter = 0
    while counter <= 89:
        file_path = dir + "/" + prefix + f"{counter}.bin"
        print("Reading file: ", file_path)
        data = np.fromfile(file_path, dtype=np.float32)
        data = data[~np.isnan(data)]
        if len(data) == 0:
            if min_values:
                min_values.append(min_values[-1])
                max_values.append(max_values[-1])
            else:
                min_values.append(0)  # Fallback value
                max_values.append(0)  # Fallback value
        else:
            min_values.append(float(np.min(data)))
            max_values.append(float(np.max(data)))
        counter += 1
    return min_values, max_values


def load_json():
    filepath = f"{DATA_DIRECTORY}/metadata.json"
    if os.path.exists(filepath):
        with open(filepath, "r") as file:
            try:
                data = json.load(file)  # Load existing JSON data
            except json.JSONDecodeError:
                data = {
                }  # Start with an empty dictionary if file is empty or invalid
    else:
        data = {}
        print("File fehlt!")
    return data


def write_min_max(var, min_global, max_global, min_dict, max_dict):
    data = load_json()
    data[var] = {
        "min_global": min_global,
        "max_global": max_global,
        "min_local": min_dict,
        "max_local": max_dict,
    }
    with open(f"{DATA_DIRECTORY}/metadata.json", "w") as file:
        json.dump(
            data,
            file,
            indent=4,
        )


def get_min_max(variable, dates):

    min_dict = {}
    max_dict = {}

    min_value = np.inf
    max_value = -np.inf

    for date in dates:
        year = int(date.year)
        month = int(date.month)
        day = int(date.day)
        hour = int(date.hour)

        prefix = f"{variable}_{year}_{month}_{day}_{hour}_"
        keyName = f"{year}-{month}-{day}-{hour}"

        min_values, max_values = get_min_max_per_month(DATA_DIRECTORY, prefix)

        min_dict[f"{keyName}"] = min_values
        max_dict[f"{keyName}"] = max_values

        min_value = min(min_value, min(min_values))
        max_value = max(max_value, max(max_values))

    # write results to file
    write_min_max(NAME_DICT[variable], min_value, max_value, min_dict, max_dict)


def process_variable(variable):
    files = get_all_filenames()
    variable_files = [file for file in files if variable in file]

    dates = get_all_dates(variable_files, variable)
    get_min_max(variable, dates)


def main():
    for variable in VARIABLES:
        process_variable(variable)


if __name__ == '__main__':
    main()
