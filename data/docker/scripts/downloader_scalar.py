import globals as GLOBALS
import utils

from datetime import datetime
from pathlib import Path

import numpy as np


def download_whole_cube(db, actual_time, variable):
    print(f"Start downloading {variable} data for: ", actual_time)
    start_counter = datetime.now()
    time_step = utils.get_timestamp(actual_time)
    data3D = db.read(time=time_step, x=GLOBALS.X_RANGE, y=GLOBALS.Y_RANGE)
    print("Download finished - time needed: ", datetime.now() - start_counter)

    # extract min and max values for each layer
    min_values_local, max_values_local = utils.get_min_max_local(data3D)

    # Resize and filter data
    data3D_resized = np.array([utils.resize_array(matrix) for matrix in data3D])
    data3D_resized = np.array(
        [utils.filter_to_nan(matrix) for matrix in data3D_resized])

    # Flat each matrix to row
    data3D_flat = np.array(
        [matrix.reshape(1, 250 * 250) for matrix in data3D_resized])

    # Use float16 to save space
    data_array_32 = np.array(data3D_flat, dtype=np.float32)

    # Save each layer separately
    for i, data in enumerate(data_array_32):
        filename = Path("/data/" + variable + "_" + str(actual_time.year) +
                        "_" + str(actual_time.month) + "_" +
                        str(actual_time.day) + "_" + str(actual_time.hour) +
                        "_" + str(i) + ".bin")
        data.tofile(filename)
    print("Data saved successfully")

    return min_values_local, max_values_local

def download_whole_cube_at_Time(db, timeIdx, variable):
    # get date from idx:
    actual_time = utils.getDateFromTimeIndex(timeIdx);
    print(f"Start downloading {variable} data for: ", actual_time)
    start_counter = datetime.now()
    data3D = db.read(time=timeIdx-1, x=GLOBALS.X_RANGE, y=GLOBALS.Y_RANGE)
    print("Download finished - time needed: ", datetime.now() - start_counter)

    # extract min and max values for each layer
    min_values_local, max_values_local = utils.get_min_max_local(data3D)

    # Resize and filter data
    data3D_resized = np.array([utils.resize_array(matrix) for matrix in data3D])
    data3D_resized = np.array(
        [utils.filter_to_nan(matrix) for matrix in data3D_resized])

    # Flat each matrix to row
    data3D_flat = np.array(
        [matrix.reshape(1, 250 * 250) for matrix in data3D_resized])

    # Use float16 to save space
    data_array_32 = np.array(data3D_flat, dtype=np.float32)

    # Save each layer separately
    for i, data in enumerate(data_array_32):
        filename = Path("/data/" + variable + "_" + str(actual_time.year) +
                        "_" + str(actual_time.month) + "_" +
                        str(actual_time.day) + "_" + str(actual_time.hour) +
                        "_" + str(i) + ".bin")
        data.tofile(filename)
    print("Data saved successfully")

    return min_values_local, max_values_local


def start_download_whole_cube(variable):

    db = utils.get_db(variable)
    start_time = datetime(2011, 9, 13, 0)
    end_time = datetime(2012, 11, 14, 0)
    actual_time = start_time

    year = int(start_time.year)
    month = int(start_time.month)

    min_dict_local = {}
    max_dict_local = {}

    min_value = np.inf
    max_value = -np.inf

    while actual_time < end_time:

        min_local, max_local = download_whole_cube(db, actual_time, variable)
        min_dict_local[f"{actual_time.date()}"] = min_local
        max_dict_local[f"{actual_time.date()}"] = max_local

        min_value = min(min_value, min(min_local))
        max_value = max(max_value, max(max_local))

        if month == 12:
            month = 1
            year += 1
        else:
            month += 1
        actual_time = datetime(year, month, 13, 0)

    if variable == "salt":
        utils.write_min_max("SALT", min_value, max_value, min_dict_local,
                            max_dict_local)
    elif variable == "theta":
        utils.write_min_max("THETA", min_value, max_value, min_dict_local,
                            max_dict_local)

def start_download_whole_cube_with_Time(variable, startTime, endTime, numSteps):
    db = utils.get_db(variable)

    min_dict_local = {}
    max_dict_local = {}

    min_value = np.inf
    max_value = -np.inf

    # Create samples between start and end, but make sure its full integers:
    timesteps = np.linspace(startTime, endTime, numSteps)
    timesteps = timesteps.astype(int)

    for step in timesteps:

        print("step: ",step)
        actual_time = utils.getDateFromTimeIndex(step);
        min_local, max_local = download_whole_cube_at_Time(db, int(step), variable)

        formatted_date = actual_time.strftime('%Y-%m-%d-H:%H')
        min_dict_local[f"{formatted_date}"] = min_local
        max_dict_local[f"{formatted_date}"] = max_local
        min_value = min(min_value, min(min_local))
        max_value = max(max_value, max(max_local))

    if variable == "salt":
        utils.write_min_max("SALT", min_value, max_value, min_dict_local,
                            max_dict_local)
    elif variable == "theta":
        utils.write_min_max("THETA", min_value, max_value, min_dict_local,
                            max_dict_local)