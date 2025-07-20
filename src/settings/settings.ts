import type { ImageSize } from '../types';
import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import ImageGinPlugin from '../../main';

export const DEFAULT_IMAGE_SIZES: ImageSize[] = [
    { id: 'banner', yamlKey: 'banner_image', width: 2048, height: 1024, label: 'Banner' },
    { id: 'portrait', yamlKey: 'portrait_image', width: 1024, height: 1820, label: 'Portrait' },
    { id: 'square', yamlKey: 'square_image', width: 1024, height: 1024, label: 'Square' }
];

export interface ImageGinSettings {
    recraftApiKey: string;
    recraftBaseUrl: string;
    recraftModelChoice: string;
    imagePromptKey: string;
    imageSizes: ImageSize[];
    defaultBannerSize: string;
    defaultPortraitSize: string;
    retries: number;
    rateLimit: number;
    imageStylesJSON: string; // JSON string of style configurations
}

export const DEFAULT_IMAGE_STYLES_JSON = JSON.stringify([
    {
        "creation_time": "2025-04-15T02:24:01.574783871Z",
        "credits": 40,
        "id": "<your_style_id>",
        "is_private": true,
        "style": "digital_illustration"
    }
], null, 2);

export const DEFAULT_SETTINGS: ImageGinSettings = {
    recraftApiKey: '',
    recraftBaseUrl: 'https://external.api.recraft.ai/v1/images/generations',
    recraftModelChoice: 'recraftv3',
    imagePromptKey: 'image_prompt',
    imageSizes: [...DEFAULT_IMAGE_SIZES],
    defaultBannerSize: 'banner',
    defaultPortraitSize: 'portrait',
    retries: 3,
    rateLimit: 1000, // milliseconds between requests
    imageStylesJSON: DEFAULT_IMAGE_STYLES_JSON,
};

export class ImageGinSettingTab extends PluginSettingTab {
    plugin: ImageGinPlugin;

    constructor(app: App, plugin: ImageGinPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    private renderImageSizeSettings(containerEl: HTMLElement): void {
        const sizesContainer = containerEl.createDiv('image-sizes-container');
        sizesContainer.createEl('h3', { text: 'Image Size Presets' });
        
        this.plugin.settings.imageSizes.forEach((size, index) => {
            const setting = new Setting(sizesContainer)
                .setClass('image-size-setting');

            // Label
            setting.addText(text => text
                .setPlaceholder('Label')
                .setValue(size.label)
                .onChange(async (value) => {
                    size.label = value;
                    await this.plugin.saveSettings();
                }));

            // YAML Key
            setting.addText(text => text
                .setPlaceholder('yaml_key')
                .setValue(size.yamlKey)
                .onChange(async (value) => {
                    size.yamlKey = value;
                    await this.plugin.saveSettings();
                }));

            // Width
            setting.addText(text => text
                .setPlaceholder('Width')
                .setValue(size.width.toString())
                .onChange(async (value) => {
                    const num = parseInt(value, 10);
                    if (!isNaN(num)) {
                        size.width = num;
                        await this.plugin.saveSettings();
                    }
                }));

            // Height
            setting.addText(text => text
                .setPlaceholder('Height')
                .setValue(size.height.toString())
                .onChange(async (value) => {
                    const num = parseInt(value, 10);
                    if (!isNaN(num)) {
                        size.height = num;
                        await this.plugin.saveSettings();
                    }
                }));

            // Delete button
            setting.addExtraButton(button => {
                button
                    .setIcon('trash')
                    .setTooltip('Delete this size')
                    .onClick(async () => {
                        this.plugin.settings.imageSizes.splice(index, 1);
                        await this.plugin.saveSettings();
                        this.display(); // Refresh the settings UI
                    });
            });
        });

        // Add button to create new size preset
        new Setting(sizesContainer)
            .addButton(button => {
                button
                    .setButtonText('Add New Size')
                    .setCta()
                    .onClick(async () => {
                        this.plugin.settings.imageSizes.push({
                            id: `custom-${Date.now()}`,
                            yamlKey: 'custom_image',
                            width: 800,
                            height: 600,
                            label: 'New Size'
                        });
                        await this.plugin.saveSettings();
                        this.display(); // Refresh the settings UI
                    });
            });

        // Styles Configuration Section
        containerEl.createEl('h3', { text: 'Style Configurations' });
        containerEl.createEl('p', {
            text: 'Configure style presets for image generation',
            cls: 'setting-item-description'
        });

        const stylesSetting = new Setting(containerEl)
            .setName('Style Presets')
            .setDesc('JSON array of style configurations');

        const stylesTextArea = document.createElement('textarea');
        stylesTextArea.rows = 10;
        stylesTextArea.style.width = '100%';
        stylesTextArea.style.minHeight = '200px';
        stylesTextArea.style.fontFamily = 'monospace';
        stylesTextArea.placeholder = 'Enter style configurations as JSON...';
        
        // Format the JSON for display
        try {
            const stylesJson = JSON.parse(this.plugin.settings.imageStylesJSON);
            stylesTextArea.value = JSON.stringify(stylesJson, null, 2);
        } catch (e) {
            // If not valid JSON, display as is
            stylesTextArea.value = this.plugin.settings.imageStylesJSON;
        }
        
        // Add input event listener
        stylesTextArea.addEventListener('input', async () => {
            try {
                // Try to parse to validate JSON
                JSON.parse(stylesTextArea.value);
                this.plugin.settings.imageStylesJSON = stylesTextArea.value;
                await this.plugin.saveSettings();
                // Update the textarea with formatted JSON
                stylesTextArea.value = JSON.stringify(JSON.parse(stylesTextArea.value), null, 2);
            } catch (e) {
                // If invalid JSON, still save but don't format
                this.plugin.settings.imageStylesJSON = stylesTextArea.value;
                await this.plugin.saveSettings();
            }
        });
        
        // Add the textarea to the setting
        stylesSetting.settingEl.appendChild(stylesTextArea);
        
        // Add a reset button in a new setting row
        new Setting(containerEl)
            .setName('')
            .setDesc('')
            .addButton(button => {
                button
                    .setButtonText('Reset to Default')
                    .onClick(async () => {
                        this.plugin.settings.imageStylesJSON = DEFAULT_IMAGE_STYLES_JSON;
                        await this.plugin.saveSettings();
                        stylesTextArea.value = JSON.stringify(JSON.parse(DEFAULT_IMAGE_STYLES_JSON), null, 2);
                        new Notice('Styles reset to default');
                    });
            });
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Image Gin Settings' });

        // API Key
        new Setting(containerEl)
            .setName('Recraft API Key')
            .setDesc('Your Recraft.ai API key')
            .addText(text => text
                .setPlaceholder('Enter your API key')
                .setValue(this.plugin.settings.recraftApiKey)
                .onChange(async (value) => {
                    this.plugin.settings.recraftApiKey = value;
                    await this.plugin.saveSettings();
                }));
                
        // Model Choice
        new Setting(containerEl)
            .setName('Model')
            .setDesc('Select the Recraft model to use for image generation')
            .addDropdown(dropdown => dropdown
                .addOption('recraftv3', 'Recraft v3')
                .addOption('recraftv2', 'Recraft v2')
                .addOption('recraftv1', 'Recraft v1')
                .setValue(this.plugin.settings.recraftModelChoice)
                .onChange(async (value) => {
                    this.plugin.settings.recraftModelChoice = value;
                    await this.plugin.saveSettings();
                }));

        // Base URL setting
        new Setting(containerEl)
            .setName('ReCraft API Base URL')
            .setDesc('ReCraft API base URL')
            .addText(text => text
                .setPlaceholder('https://external.api.recraft.ai/v1/images/generations')
                .setValue(this.plugin.settings.recraftBaseUrl)
                .onChange(async (value) => {
                    this.plugin.settings.recraftBaseUrl = value;
                    await this.plugin.saveSettings();
                }));

        // Image size presets
        this.renderImageSizeSettings(containerEl);
    }
}