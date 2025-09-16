import os
import yaml
import subprocess
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
from matplotlib.widgets import RectangleSelector, Slider
import tkinter as tk
from tkinter import ttk
from datetime import datetime, timedelta


CONFIG  = "./config.yml"
selected_coords = None

TOTAL_TIMESTEPS = 10272
START_DATE = "2011-09-13"
END_DATE = "2012-11-13"

def generate_dates_and_indices(start_date_str, end_date_str):
    start_date = datetime.strptime(start_date_str, "%Y-%m-%d")
    end_date = datetime.strptime(end_date_str, "%Y-%m-%d")
    
    delta_days = (end_date - start_date).days + 1
    
    # Create a list of tuples (date_string, index)
    return [(start_date + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(delta_days)], \
           {f"{(start_date + timedelta(days=i)).strftime('%Y-%m-%d')} {hour}:00": i * 24 + hour + 1 
            for i in range(delta_days) for hour in range(24)}

# Generate date options for selection.
dates_list, date_index_map = generate_dates_and_indices(START_DATE, END_DATE)


def update_config(file_path, x_min, x_max, y_min, y_max, start_number, end_number, num_samples):
    if os.path.exists(file_path):
        with open(file_path, 'r') as file:
            data = yaml.safe_load(file) or {}
    else:
        data = {}

    if 'coordinates' not in data:
        data['coordinates'] = {}

    y_min_corrected = data_array.shape[0] - y_max;
    y_max_corrected = data_array.shape[0] - y_min;
    y_min = y_min_corrected;
    y_max = y_max_corrected;


    
    # Don't fortegt the shrink factor:
    x_min = int(x_min * shrink_factor)
    x_max = int(x_max * shrink_factor)
    y_min = int(y_min * shrink_factor)
    y_max = int(y_max * shrink_factor)
    
    # Making sure, data is square:
    resolution = min(abs(int(x_max) - int(x_min)), abs(int(y_max) - int(y_min)));
    x_max = int(x_min) + resolution
    y_max = int(y_min) + resolution

    data['coordinates']['x_min'] = x_min
    data['coordinates']['x_max'] = x_max
    data['coordinates']['y_min'] = y_min
    data['coordinates']['y_max'] = y_max

    data['time_selection'] = {
        'start_number': int(start_number),
        'end_number': int(end_number),
        'num_samples': int(num_samples)
    }

    print("You chose: [", x_min, ", ", x_max, "],[", y_min, ", ", y_max,
          "] Start:", start_number,
          " End:", end_number,
          " Samples:", num_samples)

    with open(file_path, 'w') as file:
        yaml.dump(data, file, default_flow_style=False)
    print(f"Configuration saved to {file_path}.")


def toggle_selector(event):
    if event.key in ['Q', 'q'] and toggle_selector.RS.active:
        print('RectangleSelector deactivated.')
        toggle_selector.RS.set_active(False)


def line_select_callback(eclick, erelease):
    global data_array, selected_coords

    x1, y1 = eclick.xdata, eclick.ydata
    x2, y2 = erelease.xdata, erelease.ydata

    if x1 is None or x2 is None or y1 is None or y2 is None:
        return

    #side_length = max(abs(x2 - x1), abs(y2 - y1))
    side_length = max(abs(x2 - x1), abs(y2 - y1))
    side_length = min(side_length, abs(data_array.shape[1] - min(x1, x2)), abs(data_array.shape[0] - min(y1, y2)))

    x_min = max(0, min(x1, x2))
    x_max = min(data_array.shape[1], x_min + side_length)
    x_min = max(0, x_max - side_length)
    
    y_min = max(0, min(y1, y2))
    y_max = min(data_array.shape[0], y_min + side_length)
    y_min = max(0, y_max - side_length)

    toggle_selector.RS.extents = (x_min, x_max, y_min, y_max)

    # Let's see, if we should just make it 
    y_min_corrected = data_array.shape[0] - y_max;
    y_max_corrected = data_array.shape[0] - y_min;
    
    selected_coords = (x_min, x_max, y_min, y_max)
    
    print("Selected: ", x_min*shrink_factor, x_max*shrink_factor, y_min_corrected*shrink_factor, y_max_corrected*shrink_factor)
    
def on_confirm():
    
    global start_number,end_number,start_hour,end_hour
    
    start_day=start_date_combobox.get()
    end_day=end_date_combobox.get()
    start_hour=start_hour_combobox.get()
    end_hour=end_hour_combobox.get()

    # Combine date and hour into a single datetime string.
    start_datetime=f"{start_day} {start_hour}:00"
    end_datetime=f"{end_day} {end_hour}:00"
    
    start_number=date_index_map[start_datetime]
    end_number=date_index_map[end_datetime]

    print(f"Start Index: {start_number}, End Index: {end_number}")

    root.quit()  # Close the Tkinter window after confirmation.

def create_slider_window():
    global sample_input_box 

    # Create a new Tkinter window for the sliders and spinbox.
    global root 
     
    root=tk.Tk()
    root.title("Date and Time Selection")

    # Create Start Time Section.
    tk.Label(root,text="Start Time").pack(pady=5)

    tk.Label(root,text="Start Date").pack()
    global start_date_combobox 
      
    start_date_combobox=ttk.Combobox(root,value=dates_list)
    start_date_combobox.set(dates_list[0])
    start_date_combobox.pack()

    tk.Label(root,text="Start Hour").pack()
      
    global start_hour_combobox 
      
    start_hour_combobox=ttk.Combobox(root,value=[f"{hour}" for hour in range(24)])
    start_hour_combobox.set(0)
    start_hour_combobox.pack()

    # Create End Time Section.
    tk.Label(root,text="End Time").pack(pady=5)

    tk.Label(root,text="End Date").pack()
      
    global end_date_combobox 
      
    end_date_combobox=ttk.Combobox(root,value=dates_list)
    end_date_combobox.set(dates_list[-1])
    end_date_combobox.pack()
    tk.Label(root,text="End Hour").pack()
      
    global end_hour_combobox 
      
    end_hour_combobox=ttk.Combobox(root,value=[f"{hour}" for hour in range(24)])
    end_hour_combobox.set(23)
    end_hour_combobox.pack()
    
    tk.Label(root,text="Number of Samples (Max: 40):").pack()

    sample_input_box=tk.Spinbox(root,
                                    from_=2,
                                    to=40,
                                    increment=1,
                                    width=5)
       
    sample_input_box.pack()
    sample_input_box.delete(0)  # Clear current value before setting it.
    sample_input_box.insert(0, "20")

    confirm_button=tk.Button(root,text="Confirm",command=on_confirm)
    confirm_button.pack(pady=10)

    root.mainloop()  # Start the Tkinter event loop.


def save_selection(event):
    global selected_coords
    if selected_coords:
        num_samples_value=int(sample_input_box.get())  
        root.destroy()
        update_config(CONFIG,*selected_coords,start_number,end_number,num_samples_value)


def main():
    global data_array, ax
    global shrink_factor
    shrink_factor = 4
    data_array = np.load("Full_World_small.npy")
    
    # Just for now:
    # data_array = np.load("Full_World.npy")
    # full_world_data original, downsampled_data als dat_array
    #downsampled_data = data_array[::shrink_factor, ::shrink_factor]
    #np.save("Full_World_small.npy", downsampled_data)
    
    data_array = np.flipud(data_array)

    fig, ax = plt.subplots(figsize=(10, 8), constrained_layout=True)
    fig.canvas.manager.set_window_title("Area Selector")
    
    mng = plt.get_current_fig_manager()
    try:
        mng.window.showMaximized()
    except AttributeError:
        pass
    
    ax.set_xticks([]); ax.set_yticks([])
    ax.imshow(data_array, cmap="viridis", aspect='auto')

    toggle_selector.RS = RectangleSelector(
        ax, line_select_callback,
        useblit=True,
        button=[1, 3],
        minspanx=5, minspany=5,
        spancoords='data',
        interactive=True
    )

    toggle_selector.RS.add_state('square')

    #ax_button = plt.axes([0.4, 0.02, 0.2, 0.06])
    #button = Button(ax_button, 'Save Selection')
    #button.label.set_fontsize(12)
    #button.color = 'lightgray'
    #button.hovercolor = 'gray'
    #button.on_clicked(save_selection)

    def press_event(event):
        if event.key == 'enter':
            save_selection(event);
            #plt.close(fig)

    create_slider_window()

    plt.connect('key_press_event', press_event)
    plt.connect('key_press_event', toggle_selector)
    plt.show()

    # if docker is running:
    # Define the command and arguments
    command = ['docker-compose', 'up']

    # Call the command
    subprocess.run(command)

main()
