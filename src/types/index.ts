import { PluginSettingTab } from 'obsidian';
import { Plugin } from 'obsidian';

export interface ImageSize {
    width: number;
    height: number;
    label: string;
}

export interface PluginSettings {
  apiKey: string;
  baseUrl: string;
  retries: number;
  backoffDelay: number;
  rateLimit: number;
  cacheDuration: number;
}


export interface ImageGinPlugin extends Plugin {
  settings: PluginSettings;
}

export interface ImageGinPluginSettingsTab extends PluginSettingTab {
  plugin: ImageGinPlugin;
}
