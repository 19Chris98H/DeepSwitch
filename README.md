# DeepSwitch  

DeepSwitch is a web-based tool designed to introduce students and non-experts to the visual analysis of spatiotemporal processes in oceanographic data.  
It provides an accessible workflow for data acquisition and preprocessing alongside an interactive 3D web application for exploring ocean dynamics.  
For further information or to try DeepSwitch online visit our [website](https://deepswitch-js.com/).  
For more technical information have a look at our [paper](https://doi.org/10.2312/envirvis.20251146).

This repository contains:  
- **Data Preprocessing Workflow** (Docker-based scripts for data acquisition, filtering, and preparation)  
- **Web Application** (browser-based interface for interactive visual analysis, built with Vite + Three.js)

---

## Features  

- 🌊 **Data Preprocessing**  
  - Dockerized workflow for acquiring, downsampling, and preparing oceanographic datasets from the data provided by the [SciVis Contest](https://sciviscontest2026.github.io/data/home)
  - Automatic handling of missing data, outlier filtering, and feature computation (e.g. vorticity)  

- 🖥️ **Web Application**  
  - Interactive 3D visualization in standard browsers
  - Based on the space-time cube paradigm
  - Switch between **space mode** (third dimension is used for depth) and **time mode** (third dimension is used for time)  
  - Explore data via slices, isocontours, and color mapping  

- 🎓 **Educational Focus**  
  - Designed for classroom use and science communication  
  - Smooth transition from familiar 2D maps to advanced 3D analysis  

---

## The DeepSwitch Workflow  

<img src="https://github.com/user-attachments/assets/724b7ad6-b2d0-41a2-88fc-d3051f25942c" alt="DeepSwitch Screenshot" width="100%">
  
Users first define a region of interest in the oceanographic data. The selected time-dependent 3D data is then retrieved from cloud storage and processed in a containerized workflow. Finally, the data is loaded into DeepSwitch, where the main view ① provides interactive exploration via a space–time cube paradigm. Users can set either time or depth as the third dimension and analyze processes by adding slices ②, extracting isocontours, switching data blocks ③, and adjusting visualization controls ④ to investigate spatial and temporal dynamics.

---

## Installation  

### Prerequisites  
- [Docker](https://www.docker.com/) (for preprocessing)  
- [Vite](https://vitejs.dev/) (for running the web app locally)  

### Setup  

#### 1. Data Preprocessing  
All preprocessing commands must be executed **inside the `data/` folder**.  
To select the area you want to download:
```bash
python ./worldPicker.py
````
To start the download after you selected and saved your configs:
```bash
docker compose up
````

#### 2. Web Application  
The web application must be started **from the project root folder**.  
Before running the application for the first time:
```bash
npm install
````
To run the web application locally: 
```bash
npx vite
````

The app will be available at:  
👉 `http://localhost:5173` (default Vite port)  

---

## Citation  

If you use DeepSwitch in your research or teaching, please cite:  

> Hörath, C., Derichs, D., Eyl, L., Kallenberg, O., Gerrits, T. (2025).  
> **DeepSwitch - A Web-based Tool for the Introduction to Visual Analysis of Spatiotemporal Processes in Oceanographic Data**.  
> Workshop on Visualisation in Environmental Sciences (EnvirVis).  
> [DOI: 10.2312/envirvis.20251146](https://doi.org/10.2312/envirvis.20251146)

---

## License  

This project is licensed under the **MIT License**.  

---

## Acknowledgments  

We gratefully acknowledge the German Federal Ministry of Education and Research (BMBF) and the state government of NRW for supporting this project as part of the NHR funding.
