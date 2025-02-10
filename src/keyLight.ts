import { CharacteristicValue, Logger } from 'homebridge';
import axios from 'axios';

export interface KeyLight {
  hostname: string;
  port: number;
  name: string;
  mac: string;
}

// @todo improve this in future rewrite
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export interface KeyLightInstance extends KeyLight {
  settings?: KeyLightSettings;
  info?: KeyLightInfo;
  options?: KeyLightOptions;
}

export interface KeyLightSettings {
  powerOnBehavior: number;
  powerOnBrightness: number;
  powerOnTemperature: number;
  switchOnDurationMs: number;
  switchOffDurationMs: number;
  colorChangeDurationMs: number;
}

export interface KeyLightInfo {
  productName: string;
  hardwareBoardType: number;
  firmwareBuildNumber: number;
  firmwareVersion: string;
  serialNumber: string;
  displayName: string;
  features: Array<string>;
}

export interface KeyLightOptions {
  numberOfLights: number;
  lights: [{
      on: number;
      brightness: number;
      temperature: number;
  }];
}

// @todo improve this in future rewrite
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class KeyLightInstance {
  private constructor(keyLight: KeyLight, log: Logger, pollingRate: number) {
    this.hostname = keyLight.hostname;
    this.port = keyLight.port;
    this.name = keyLight.name;
    this.mac = keyLight.mac;

    this.log = log;
    this.pollingRate = pollingRate;
  }

  private readonly log: Logger;
  private readonly pollingRate: number;

  private _onPropertyChanged: (arg1: ('brightness' | 'on' | 'temperature'), arg2: number) => void = () => true;

  // Creates a new instance of a key light and pulls all neccessary data from the light
  public static async createInstance(data: KeyLight, log: Logger, pollingRate?: number): Promise<KeyLightInstance> {
    const result = new KeyLightInstance(data, log, pollingRate ?? 1000);
    try {
      result.info = (await axios.get<KeyLightInfo>(result.infoEndpoint)).data;
      result.options = (await axios.get<KeyLightOptions>(result.lightsEndpoint)).data;
      result.settings = (await axios.get<KeyLightSettings>(result.settingsEndpoint)).data;
    } catch (error) {
      return Promise.reject();
    }

    result.pollOptions();
    return result;
  }

  public get serialNumber(): string {
    return this.info?.serialNumber ?? 'unknown';
  }

  public get manufacturer(): string {
    const str = this.info?.productName ?? 'unknown';
    return str.substr(0, str.indexOf(' '));
  }

  public get model(): string {
    return this.info?.productName ?? 'unknown';
  }

  public get displayName(): string {
    if (!this.info?.displayName) {
      return this.name;
    } else {
      return this.info.displayName === '' ? this.name : this.info.displayName;
    }
  }

  public get firmwareVersion(): string {
    return this.info?.firmwareVersion ?? '1.0';
  }

  public get endpoint(): string {
    return 'http://' + this.hostname + ':' + this.port + '/elgato/';
  }

  public get infoEndpoint(): string {
    return this.endpoint + 'accessory-info';
  }

  public get lightsEndpoint(): string {
    return this.endpoint + 'lights';
  }

  public get settingsEndpoint(): string {
    return this.lightsEndpoint + '/settings';
  }

  public get identifyEndpoint(): string {
    return this.endpoint + 'identify';
  }

  public set onPropertyChanged(callback: (arg1: ('brightness' | 'on' | 'temperature'), arg2: number) => void) {
    this._onPropertyChanged = callback;
  }

  public updateSettings(settings: KeyLightSettings) {
    axios.put<unknown>(this.settingsEndpoint, settings)
      .then(() => {
        axios.get<KeyLightSettings>(this.settingsEndpoint)
          .then((response) => {
            this.settings = response.data;
            this.log.debug('Updated device settings of', this.displayName);
          })
          .catch(() => {
            this.log.error('Pulling settings of', this.displayName, 'failed');
            this.settings = settings;
          });
      })
      .catch(() => {
        this.log.error('Updating settings of', this.displayName, 'failed');
      });
  }

  public identify() {
    axios.post<unknown>(this.identifyEndpoint);
  }

  public async setProperty(property: ('brightness' | 'on' | 'temperature'), value: CharacteristicValue) {
    return axios.put<unknown>(this.lightsEndpoint, { 'lights': [{ [property]: value }] });
  }

  public getProperty(property: ('brightness' | 'on' | 'temperature')) {
    return this.options?.lights[0][property] ?? 0;
  }

  /**
   * The current state of the light is polled regularly. When a change is detected, the onPropertyChanged callback function
   * is called to update HomeKit.
   */
  private pollOptions() {
    setInterval(() => {
      axios.get<KeyLightOptions>(this.lightsEndpoint, { timeout: this.pollingRate ?? 1000 })
        .then(response => {
          if (this.options) {
            const oldLight = this.options.lights[0];
            const newLight = response.data.lights[0];

            if (oldLight.on !== newLight.on) {
              this._onPropertyChanged('on', newLight.on);
            }
            if (oldLight.temperature !== newLight.temperature) {
              this._onPropertyChanged('temperature', newLight.temperature);
            }
            if (oldLight.brightness !== newLight.brightness) {
              this._onPropertyChanged('brightness', newLight.brightness);
            }
          }
          this.options = response.data;
        })
        .catch(() => {
          // we'll retry again
          this.log.debug('Polling of', this.displayName, 'failed');
        });
    }, this.pollingRate);
  }
}
