import yaml
import utils
import json
import downloader_scalar as scalar
import downloader_uv as uv
import downloader_vort as vort


def download_all():
    uv.start_download_uv()
    scalar.start_download_whole_cube("salt")
    scalar.start_download_whole_cube("theta")
    print("Start calculating vorticity")
    vort.calc_all_vorticity()
    utils.get_min_max_vort()
    print("Finished calculating vorticity")


def main():
    with open('/config.yml', 'r') as file:
        config = yaml.safe_load(file)

    data = utils.load_json()
    data["size_km"] = utils.get_km_of_config(config)
    with open('/metadata.json', 'w') as file:
        json.dump(data, file, indent=4)

    # Get time information
    # But check if it exists, first
    # Time Span: 2011-Sep-13 to 2012-Nov-15 but let's ignore the last days, so its exatctly 14 months:
    # 10272 hours
    startTime = 1 #don't go below 1
    endTime = 10272
    numSteps = 14
    
    if bool(config.get("time_selection")):
        startTime = config['time_selection']['start_number']
        endTime = config['time_selection']['end_number']
        numSteps = config['time_selection']['num_samples']
        print("timing data: ",startTime, endTime, numSteps)

    if bool(config.get("variables")):
        # Download LIC textures
        uv.start_download_uv_with_Time(startTime,endTime,numSteps)

        for variable in config["variables"]:
            if variable in ["salt", "theta"]:
                scalar.start_download_whole_cube_with_Time(variable,startTime,endTime,numSteps)
            elif variable == "vorticity":
                print("Start calculating vorticity")
                vort.calc_all_vorticity()
                utils.get_min_max_vort_with_Time(startTime, endTime, numSteps)
                print("Finished calculating vorticity")
    else:
        download_all()


if __name__ == '__main__':
    main()
