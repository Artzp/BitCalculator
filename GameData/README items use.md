# BitCraft GameData Extraction Guide

This folder contains scripts and data for extracting and processing BitCraft game data for use in the BitCraft Planner web application.

## Overview

The scripts here process raw BitCraft game data (JSON files) and generate structured data files for use in the BitPlanner app. The main outputs are:
- `crafting_data.json`: Contains all item crafting recipes and related data.
- `travelers_data.json`: Contains NPC traveler task data.

## Prerequisites
- Python 3.x installed
- All required game data files present in `BitCraft_GameData/server/region/`
- (Optional) Bash shell for running the provided `.sh` script

## How to Extract Data

### 1. Prepare the Output Directory
Make sure there is a `BitPlanner` directory at the same level as this `GameData` folder. The scripts will output data files there:

```
BitCalculator/
├── BitPlanner/
└── GameData/
```

### 2. Run the Extraction Scripts

#### Option A: Run All at Once (Recommended)
Use the provided shell script to run both extraction scripts and write the game data version:

```sh
bash generate_data.sh
```

#### Option B: Run Scripts Individually
You can also run the scripts one by one:

```sh
python3 crafting_data.py
python3 travelers_data.py
```

### 3. Output Files
After running the scripts, you will find:
- `../BitPlanner/crafting_data.json`: All item crafting recipes
- `../BitPlanner/travelers_data.json`: Traveler NPC task data
- `../BitPlanner/data_version.txt`: Game data version (commit date)

## Troubleshooting
- If you see errors about missing directories, create the `BitPlanner` folder manually.
- If you see missing icon warnings, it means some item icons are not present, but data extraction will still complete.
- Make sure all required JSON files are present in `BitCraft_GameData/server/region/`.

## Updating Data
Whenever the game data updates, re-run the extraction scripts to refresh the output files.

---
For more details, see the comments in each script file. 