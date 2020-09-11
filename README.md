
# Homebridge Key Lights

This is yet another Homebridge plugin for the Elgato Key Light and Key Light Air. It allows you to control your Key Light (Air) with HomeKit while avoiding some of the issues other plugins have.

[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)

## Features

- Switch your Key Lights on and off, set brightness and colour temperature
- State of the lights is regularly polled so HomeKit always has the correct data
- Correct minimum and maximum values configured for colour temperature 
- All settings configurable via config file, even those not available in the Elgato Control App 

## Installation
You can install the plugin either using the Homebridge Web UI or using the command line:

    npm install -g homebridge-keylights

To use the plugin, it must be configured. This is a minimal working configuration:

    {
    "bridge": {
        ....
    },
    "accessories": [],
    "platforms": [
        {
            "platform": "ElgatoKeyLights",
            "name": "Elgato Key Light",
        }
      ]
    }

## Settings

Further settings are available to configure. This is a complete configuration:

    {
    "bridge": {
        ....
    },
    "accessories": [],
    "platforms": [
        {
            "name": "Elgato Key Lights",
            "pollingRate": 1000,
            "powerOnBehavior": 1,
            "powerOnBrightness": 20,
            "powerOnTemperature": 4695,
            "switchOnDurationMs": 100,
            "switchOffDurationMs": 300,
            "colorChangeDurationMs": 100,
            "useIP": false,
            "platform": "ElgatoKeyLights"
        }
      ]
    }

- `name` is the name of the plugin to appear in the log file. Defaults to `Elgato Key Lights`.
- `pollingRate` is the rate at which to poll the lights for changes in milliseconds. Defaults to `1000`.
- `powerOnBehavior` is the behaviour when powering the lights on. Defaults to `1` which means restore the last settings used. `2` means restoring the default values configured below.
- `powerOnBrightness` is the default brightness value when powering on in percent. Defaults to `20`. Range is `0` to `100`.
- `powerOnTemperature` is the default colour temperature when powering on in Kelvin. Defaults to `4695`. Range is `2900` to `7000`.
- `switchOnDurationMs` is the duration of the switch on sequence in milliseconds. Defaults to `100`.
- `switchOfDurationMs` is the duration of the switch off sequence in milliseconds. Defaults to `300`.
- `colorChangeDurationMs` is the duration of a colour temperature change in milliseconds. Defaults to `100`.
- `useIP` enables the usage of IP addresses instead of hostnames to connect to the lights. Defaults to `false`. Should only be turn on if you experience connection issues.

All settings can conveniently configured using the Homebridge Web UI.
