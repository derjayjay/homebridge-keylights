import {
  Service,
  PlatformAccessory,
  CharacteristicValue,
  CharacteristicSetCallback,
  CharacteristicGetCallback,
  AdaptiveLightingController,
} from 'homebridge';

import { KeyLightsPlatform } from './keyLightsPlatfom';
import { KeyLightInstance, KeyLight } from './keyLight';

/**
 * Platform Accessory for the Key Light
 * An instance of this class is created for each light.
 */
export class KeyLightsAccessory {
  private service: Service;
  private adaptiveLightingController ? : AdaptiveLightingController;

  constructor(
    private readonly platform: KeyLightsPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly light: KeyLightInstance,
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation) !
      .setCharacteristic(this.platform.Characteristic.Manufacturer, this.light.manufacturer)
      .setCharacteristic(this.platform.Characteristic.Model, this.light.model)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.light.serialNumber)
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, this.light.firmwareVersion);

    this.light.onPropertyChanged = this.onPropertyChanged.bind(this);

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    this.service = this.accessory.getService(this.platform.Service.Lightbulb) || this.accessory.addService(this.platform.Service.Lightbulb);

    // set the service name, this is what is displayed as the default name on the Home app
    this.service.setCharacteristic(this.platform.Characteristic.Name, this.light.displayName);

    // register handlers for the On/Off Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.On)
      .on('set', this.setOn.bind(this))
      .on('get', this.getOn.bind(this));

    // register handlers for the Brightness Characteristic
    this.service.getCharacteristic(this.platform.Characteristic.Brightness)
      .on('set', this.setBrightness.bind(this))
      .on('get', this.getBrightness.bind(this));

    // register handlers for the Color Temperature Characteristic and set the valid value range
    this.service.getCharacteristic(this.platform.Characteristic.ColorTemperature)
      .on('set', this.setColorTemperature.bind(this))
      .on('get', this.getColorTemperature.bind(this))
      .setProps({
        minValue: KeyLightInstance.minTemperature,
        maxValue: KeyLightInstance.maxTemperature,
      });

    // adaptive lighting
    if (platform.api.versionGreaterOrEqual && platform.api.versionGreaterOrEqual('1.3.0')) {
      this.adaptiveLightingController = new platform.api.hap.AdaptiveLightingController(this.service);
      this.accessory.configureController(this.adaptiveLightingController);
    }

    // register handler for Identify functionality
    this.accessory.on('identify', (() => {
      this.light.identify();
    }).bind(this));
  }

  /**
   * Handlers for the On/Off Characteristic
   */
  setOn(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.light.setProperty('on', value as boolean ? 1 : 0)
      .then(() => {
        this.platform.log.debug('Set Characteristic On ->', value, 'successfully on', this.accessory.displayName);
        callback(null);
      })
      .catch((reason) => {
        this.platform.log.error('Set Characteristic On ->', value, 'failed on', this.accessory.displayName);
        this.platform.log.debug(reason);
        callback(Error());
      });
  }

  getOn(callback: CharacteristicGetCallback) {
    callback(null, this.light.options?.lights[0].on);
  }

  /**
   * Handlers for the Brightness Characteristic
   */
  setBrightness(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    this.light.setProperty('brightness', value)
      .then(() => {
        this.platform.log.debug('Set Characteristic Brightness ->', value, 'successfully on', this.accessory.displayName);
        callback(null);
      })
      .catch((reason) => {
        this.platform.log.error('Set Characteristic Brightness ->', value, 'failed on', this.accessory.displayName);
        this.platform.log.debug(reason);
        callback(Error());
      });
  }

  getBrightness(callback: CharacteristicGetCallback) {
    callback(null, this.light.getProperty('brightness'));
  }

  /**
   * Handlers for the Color Temperature Characteristic
   */
  setColorTemperature(value: CharacteristicValue, callback: CharacteristicSetCallback) {
    const temperature = value < KeyLightInstance.minTemperature ?
      KeyLightInstance.minTemperature :
      value > KeyLightInstance.maxTemperature ?
        KeyLightInstance.maxTemperature :
        value;

    this.light.setProperty('temperature', temperature)
      .then(() => {
        this.platform.log.debug('Set Characteristic Color Temperature ->', value, 'successfully on', this.accessory.displayName);
        callback(null);
      })
      .catch((reason) => {
        this.platform.log.error('Set Characteristic Color Temperature ->', value, 'failed on', this.accessory.displayName);
        this.platform.log.debug(reason);
        callback(Error());
      });
  }

  getColorTemperature(callback: CharacteristicGetCallback) {
    callback(null, this.light.getProperty('temperature'));
  }


  /**
   * Callback function to update Home Kit when a property has been changed
   */
  onPropertyChanged(property: ('brightness' | 'on' | 'temperature'), value: number) {
    this.platform.log.debug('Updating property', property, 'of device', this.accessory.displayName, 'to', value);
    switch (property) {
      case 'on':
        this.service.updateCharacteristic(this.platform.Characteristic.On, value);
        break;
      case 'temperature':
        this.service.updateCharacteristic(this.platform.Characteristic.ColorTemperature, value);
        break;
      case 'brightness':
        this.service.updateCharacteristic(this.platform.Characteristic.Brightness, value);
        break;
      default:
        break;
    }
  }

  /**
   * Update the connection information
   * Called from platform handler when the light got a new IP address
   */
  updateConnectionData(data: KeyLight) {
    this.light.hostname = data.hostname;
    this.light.port = data.port;
  }
}