
# Homebridge Key Lights

This is yet another Homebridge plugin for the Elgato Key Light and Key Light Air. It allows you to control your Key Light (Air) with HomeKit while avoiding some of the issues other plugins have.

## Features

- Switch your Key Lights on and off, set brightness and colour temperature
- State of the lights is regularly polled so HomeKit always has the correct data
- Correct minimum and maximum values configured for colour temperature 
- All settings configurable via config file, even those not available in the Elgato Control App 

## Installation
You can install the plugin either using the Homebridge Web UI or using the command line:

    npm install -g homebridge-keylight

To use the plugin, it must be configured

    {
    "bridge": {
        ....
    },
    "accessories": [],
    "platforms": [
        {
            "name": "Elgato Key Lights",
            "platform": "ElgatoKeyLights"
        }
      ]
    }

## Settings

Further settings are available to configure