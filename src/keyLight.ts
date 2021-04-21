import { Logger } from 'homebridge';
import axios, { AxiosInstance } from 'axios';

export interface KeyLight {
  hostname: string;
  port: number;
  name: string;
  mac: string;
}

export interface KeyLightInstance extends KeyLight {
  settings: KeyLightSettings;
  info: KeyLightInfo;
  options: KeyLightOptions;
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

export interface LightStripOptions {
  numberOfLights: number;
  lights: [{
      on: number;
      brightness: number;
      hue: number;
      saturation: number;
  }];
}

export class KeyLightInstance {
  private constructor(keyLight: KeyLight, log: Logger, pollingRate: number) {
    this.hostname = keyLight.hostname;
    this.port = keyLight.port;
    this.name = keyLight.name;
    this.mac = keyLight.mac;

    this.log = log;
    this.pollingRate = pollingRate;
    
    this.axiosInstance = axios.create({
      baseURL: this.endpoint,
      timeout: pollingRate,
    });
  }
  
  private async initialize() {
    this.info = (await this.axiosInstance.get<KeyLightInfo>(KeyLightInstance.infoEndpoint)).data;
    this.options = (await this.axiosInstance.get<KeyLightOptions>(KeyLightInstance.lightsEndpoint)).data;
    this.settings = (await this.axiosInstance.get<KeyLightSettings>(KeyLightInstance.settingsEndpoint)).data;
  }

  private readonly log: Logger;
  private readonly pollingRate: number;
  private readonly axiosInstance: AxiosInstance;

  private _onPropertyChanged: (arg1: ('brightness' | 'on' | 'temperature'), arg2: number) => void =
  (): void => {
    true;
  }

  // Creates a new instance of a key light and pulls all necessary data from the light
  public static async createInstance(data: KeyLight, log: Logger, pollingRate?: number): Promise<KeyLightInstance> {
    const result = new KeyLightInstance(data, log, pollingRate ?? 1000);
    try {
      await result.initialize();
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

  private static infoEndpoint = 'accessory-info';
  private static lightsEndpoint = 'lights';
  private static settingsEndpoint = 'lights/settings';
  private static identifyEndpoint = 'identify';
  
  public static minTemperature = 143;
  public static maxTemperature = 344;
  

  public set onPropertyChanged(callback: (arg1: ('brightness' | 'on' | 'temperature'), arg2: number) => void) {
    this._onPropertyChanged = callback;
  }

  public updateSettings(settings: KeyLightSettings) {
    this.axiosInstance.put<unknown>(KeyLightInstance.settingsEndpoint, settings)
      .then(() => {
        this.axiosInstance.get<KeyLightSettings>(KeyLightInstance.settingsEndpoint)
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
    this.axiosInstance.post<unknown>(KeyLightInstance.identifyEndpoint);
  }

  public async setProperty(property: ('brightness' | 'on' | 'temperature'), value) {
    this.axiosInstance.put<unknown>(KeyLightInstance.lightsEndpoint, {'lights': [{[property]: value }]});
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
      this.axiosInstance.get<KeyLightOptions>('lights')
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
          true;
        });
    }, this.pollingRate);
  }
}
