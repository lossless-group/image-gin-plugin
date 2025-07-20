import type { ImageSize } from '../types';
import { App, PluginSettingTab, Setting } from 'obsidian';
import ImageGinPlugin from '../../main';

export const DEFAULT_IMAGE_SIZES: ImageSize[] = [
    { width: 1200, height: 630, label: 'Banner (1200x630)' },
    { width: 800, height: 1200, label: 'Portrait (800x1200)' },
    { width: 1024, height: 1024, label: 'Square (1024x1024)' }
];

export interface ImageGinSettings {
    recraftApiKey: string;
    recraftBaseUrl: string;
    imagePromptKey: string;
    imageSizes: ImageSize[];
    defaultBannerSize: ImageSize;
    defaultPortraitSize: ImageSize;
    retries: number;
    rateLimit: number;
}

export const DEFAULT_SETTINGS: ImageGinSettings = {
    recraftApiKey: '',
    recraftBaseUrl: 'https://api.recraft.ai',
    imagePromptKey: 'image_prompt',
    imageSizes: [...DEFAULT_IMAGE_SIZES],
    defaultBannerSize: { ...DEFAULT_IMAGE_SIZES[0] } as ImageSize,
    defaultPortraitSize: { ...DEFAULT_IMAGE_SIZES[1] } as ImageSize,
    retries: 3,
    rateLimit: 60
};


export class ImageGinSettingTab extends PluginSettingTab {
    plugin: ImageGinPlugin;

    constructor(app: App, plugin: ImageGinPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Image Gin Settings' });

        // Base URL setting
        new Setting(containerEl)
            .setName('Recraft Base URL')
            .setDesc('ReCraft API base URL')
            .addText(text => text
                .setPlaceholder('https://api.recraft.ai')
                .setValue(this.plugin.settings.recraftBaseUrl) // Changed from baseUrl to recraftApiKey to match the settings interface
                .onChange(async (value) => {
                    this.plugin.settings.recraftBaseUrl = value; // Updated to match the settings interface
                    await this.plugin.saveSettings();
                }));

        // API Key setting
        new Setting(containerEl)
            .setName('ReCraft API Key')
            .setDesc('Your ReCraft API key for image generation')
            .addText(text => text
                .setPlaceholder('your-api-key')
                .setValue(this.plugin.settings.recraftApiKey)
                .onChange(async (value) => {
                    this.plugin.settings.recraftApiKey = value;
                    await this.plugin.saveSettings();
                }));
    }
}