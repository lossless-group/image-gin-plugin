import { Plugin } from 'obsidian';
// Import modal class
import { CurrentFileModal } from './src/modals/CurrentFileModal';
import { ImageGinSettings, ImageGinSettingTab, DEFAULT_SETTINGS } from './src/settings/settings';

export default class ImageGinPlugin extends Plugin {
    settings: ImageGinSettings = { ...DEFAULT_SETTINGS };

    async loadSettings(): Promise<void> {
        const loadedSettings = await this.loadData();
        this.settings = { ...DEFAULT_SETTINGS, ...loadedSettings };
    }

    async saveSettings(): Promise<void> {
        await this.saveData(this.settings);
    }

    async onload(): Promise<void> {
        await this.loadSettings();
        
        this.addSettingTab(new ImageGinSettingTab(this.app, this));
        
        // Register command directly in onload
        this.addCommand({
            id: 'generate-images-for-current-file',
            name: 'Generate Images for Current File',
            callback: () => {
                new CurrentFileModal(this.app, this).open();
            }
        });
    }
}