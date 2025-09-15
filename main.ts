import { Plugin, Notice } from 'obsidian';
// Import modal classes
import { CurrentFileModal } from './src/modals/CurrentFileModal';
import { ConvertLocalImagesForCurrentFile } from './src/modals/ConvertLocalImagesForCurrentFile';
import { BatchDirectoryConvertLocalToRemote } from './src/modals/BatchDirectoryConvertLocalToRemote';
import { FreepikModal } from './src/modals/FreepikModal';
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
        
        // Register commands directly in onload
        this.addCommand({
            id: 'generate-images-for-current-file',
            name: 'Generate Images for Current File',
            callback: () => {
                new CurrentFileModal(this.app, this).open();
            }
        });

        this.addCommand({
            id: 'convert-local-images-to-remote',
            name: 'Convert Local Images to Remote Images',
            callback: () => {
                new ConvertLocalImagesForCurrentFile(this.app, this).open();
            }
        });

        this.addCommand({
            id: 'batch-convert-directory-images',
            name: 'Batch Convert Directory Images to Remote',
            callback: () => {
                new BatchDirectoryConvertLocalToRemote(this.app, this).open();
            }
        });

        this.addCommand({
            id: 'search-freepik-images',
            name: 'Search Freepik Images',
            callback: () => {
                if (this.settings.freepik.enabled) {
                    new FreepikModal(this.app, this).open();
                } else {
                    new Notice('Freepik integration is not enabled. Please enable it in settings.');
                }
            }
        });
    }
}