import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import bonjour from 'bonjour';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { KeyLightsAccessory } from './keyLightsAccessory';
import { KeyLight, KeyLightInstance } from './keyLight';

export class KeyLightsPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];
  // this is used to track accessory handlers
  public readonly lights: Map<string, KeyLightsAccessory> = new Map();

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing platform');
    this.log.debug('Configuration:', JSON.stringify(this.config));

    // When this event is fired it means Homebridge has restored all cached accessories from disk.
    // We can start discovering devices on the network
    this.api.on('didFinishLaunching', () => {
      this.log.debug('Executed didFinishLaunching callback');

      bonjour().find({type: 'elg'}, (remoteService) => {
        this.log.debug('Discovered accessory:', remoteService.name);

        const light: KeyLight = {
          hostname: this.config.useIP ? remoteService.addresses[0] : remoteService.host,
          port: remoteService.port,
          name: remoteService.name,
          mac: remoteService.txt?.['id'] as string ?? '',
        };
        if (this.lights.has(light.mac)) {
          // there already is a platform handler active for this KeyLight, so just update the connection data
          this.log.debug('Updating connection data for accessory:', remoteService.name);
          this.lights.get(light.mac)?.updateConnectionData(light);
        } else {
          // discovered a new accessory, so a handler must be created
          this.log.info('Discovered accessory on network:', remoteService.name);
          KeyLightInstance.createInstance(light, this.log, this.config.pollingRate)
            .then((instance) => {
              // run the method to register the light as accessories
              this.log.debug('Created device instance for', instance.name);
              this.configureDevice(instance);
            })
            .catch((reason) => {
              this.log.error('Could not register accessory, skipping', remoteService.name);
              this.log.debug('Reason:', reason);
            });
        }
      });
    });
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  /**
   * This method handles the creation of the HomeKit accessory from a KeyLightInstance
   */
  configureDevice(light: KeyLightInstance) {

    // update the device settings
    light.updateSettings({
      powerOnBehavior: this.config.powerOnBehavior ?? light.settings?.powerOnBehavior ?? 1,
      powerOnBrightness: this.config.powerOnBrightness ?? light.settings?.powerOnBrightness ?? 20,
      powerOnTemperature: this.config.powerOnTemperature
        ? Math.round(1000000/this.config.powerOnTemperature)
        : light.settings?.powerOnTemperature
        ?? 213,
      switchOnDurationMs: this.config.switchOnDurationMs ?? light.settings?.switchOnDurationMs ?? 100,
      switchOffDurationMs: this.config.switchOffDurationMs ?? light.settings?.switchOffDurationMs ?? 300,
      colorChangeDurationMs: this.config.colorChangeDurationMs ?? light.settings?.colorChangeDurationMs ?? 100,
    });

    // generate a unique id for the accessory from the serial number
    const uuid = this.api.hap.uuid.generate(light.serialNumber);
    this.log.debug('UUID for', light.name, 'is', uuid);

    // see if an accessory with the same uuid has already been registered and restored from
    // the cached devices we stored in the configureAccessory method above
    let accessory = this.accessories.find(accessory => accessory.UUID === uuid);

    if (accessory) {
      // the accessory already exists
      this.log.info('Restoring existing accessory from cache:', light.name, 'as', accessory.displayName);

      // update the context
      accessory.context.device = light as KeyLight;
      this.api.updatePlatformAccessories([accessory]);

      // create the accessory handler for the restored accessory
      this.lights.set(light.mac, new KeyLightsAccessory(this, accessory, light));

    } else {
      // the accessory does not yet exist, so we need to create it
      this.log.info('Adding new accessory to Homebridge:', light.name, 'as', light.displayName);

      // create a new accessory
      accessory = new this.api.platformAccessory(light.displayName, uuid);

      // store a copy of the KeyLightInstance in the context of the accessory
      accessory.context.device = light as KeyLight;

      // create the accessory handler for the newly create accessory
      this.lights.set(light.mac, new KeyLightsAccessory(this, accessory, light));

      // link the accessory to your platform
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }
  }
}
