import { App, Modal, Setting, Notice, TFile } from 'obsidian';
import ImageGinPlugin from '../../main';
import { extractFrontmatter, formatFrontmatter, updateFileFrontmatter } from '../utils/yamlFrontmatter';
import { ImageKitService } from '../services/imagekitService';
import { readFileSync } from 'fs';
import { join } from 'path';

interface ImageProperty {
    key: string;
    value: string;
    isLocalFile: boolean;
}

export class ConvertLocalImagesForCurrentFile extends Modal {
    private plugin: ImageGinPlugin;
    private currentFile: TFile | null = null;
    private imageProperties: ImageProperty[] = [];
    private isConverting: boolean = false;
    private progressEl: HTMLElement | null = null;
    private selectedProperties: Set<string> = new Set();

    // Common image properties to check
    private readonly IMAGE_PROPERTIES = [
        'banner_image',
        'portrait_image', 
        'square_image',
        'og_image',
        'featured_image',
        'thumbnail',
        'hero_image',
        'cover_image'
    ];

    constructor(app: App, plugin: ImageGinPlugin) {
        super(app);
        this.plugin = plugin;
        this.currentFile = this.app.workspace.getActiveFile();
    }

    async onOpen(): Promise<void> {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('image-gin-modal');

        if (!this.currentFile) {
            contentEl.createEl('p', { text: 'No active file found.' });
            return;
        }

        // Check if ImageKit is enabled
        if (!this.plugin.settings.imageKit.enabled) {
            contentEl.createEl('h2', { text: 'ImageKit Not Enabled' });
            contentEl.createEl('p', { text: 'Please enable ImageKit CDN in the plugin settings first.' });
            return;
        }

        // Load and analyze current file
        await this.analyzeCurrentFile();

        // Render modal content
        this.renderModalContent();
    }

    private async analyzeCurrentFile(): Promise<void> {
        if (!this.currentFile) return;

        try {
            const content = await this.app.vault.read(this.currentFile);
            const frontmatter = extractFrontmatter(content);
            
            if (!frontmatter) {
                this.imageProperties = [];
                return;
            }

            // Find all image properties in frontmatter
            this.imageProperties = [];
            
            for (const property of this.IMAGE_PROPERTIES) {
                const value = frontmatter[property];
                if (value && typeof value === 'string') {
                    const isLocalFile = this.isLocalImagePath(value);
                    this.imageProperties.push({
                        key: property,
                        value: value,
                        isLocalFile: isLocalFile
                    });
                }
            }

            console.log('Found image properties:', this.imageProperties);
        } catch (error) {
            console.error('Error analyzing current file:', error);
            this.imageProperties = [];
        }
    }

    private isLocalImagePath(path: string): boolean {
        // Check if it's already an ImageKit URL
        const imagekitService = new ImageKitService(this.plugin.settings);
        if (imagekitService.isImageKitUrl(path)) {
            return false;
        }

        // Check if it's a local file path
        return !path.startsWith('http://') && 
               !path.startsWith('https://') && 
               (path.includes('.png') || path.includes('.jpg') || path.includes('.jpeg') || 
                path.includes('.webp') || path.includes('.gif') || path.includes('.svg'));
    }

    private renderModalContent(): void {
        const { contentEl } = this;

        // Header
        const headerEl = contentEl.createDiv('image-gin-header');
        headerEl.createEl('h2', { text: 'Convert Local Images to ImageKit CDN', cls: 'image-gin-title' });

        if (this.imageProperties.length === 0) {
            contentEl.createEl('p', { text: 'No local image properties found in frontmatter.' });
            return;
        }

        // Instructions
        const instructionsEl = contentEl.createDiv('image-gin-instructions');
        instructionsEl.createEl('p', { 
            text: 'Select the local image properties you want to upload to ImageKit CDN:' 
        });

        // Image properties list
        this.renderImagePropertiesList(contentEl);

        // Progress section (initially hidden)
        this.renderProgressSection(contentEl);

        // Convert button
        this.renderConvertButton(contentEl);
    }

    private renderImagePropertiesList(containerEl: HTMLElement): void {
        const listContainer = containerEl.createDiv('image-gin-properties-list');

        this.imageProperties.forEach((prop) => {
            const itemEl = listContainer.createDiv('image-gin-property-item');
            
            const isAlreadyImageKit = !prop.isLocalFile;
            const statusClass = isAlreadyImageKit ? 'already-imagekit' : 'local-file';
            itemEl.addClass(statusClass);

            new Setting(itemEl)
                .setName(prop.key)
                .setDesc(`${prop.value} ${isAlreadyImageKit ? '(Already ImageKit URL)' : '(Local file)'}`)
                .addToggle(toggle => {
                    toggle.setValue(prop.isLocalFile && this.selectedProperties.has(prop.key));
                    toggle.setDisabled(isAlreadyImageKit);
                    toggle.onChange((value) => {
                        if (value) {
                            this.selectedProperties.add(prop.key);
                        } else {
                            this.selectedProperties.delete(prop.key);
                        }
                    });
                });
        });
    }

    private renderProgressSection(containerEl: HTMLElement): void {
        this.progressEl = containerEl.createDiv('image-gin-progress');
        this.progressEl.style.display = 'none';
        
        this.progressEl.createEl('p', { 
            text: 'Converting images...',
            cls: 'image-gin-progress-text'
        });
    }

    private renderConvertButton(containerEl: HTMLElement): void {
        const buttonContainer = containerEl.createDiv();
        
        const convertBtn = buttonContainer.createEl('button', {
            text: 'Convert Selected Images',
            cls: 'image-gin-button'
        });

        convertBtn.addEventListener('click', () => {
            this.handleConvert();
        });
    }

    private async handleConvert(): Promise<void> {
        if (this.isConverting) return;

        if (this.selectedProperties.size === 0) {
            new Notice('Please select at least one image property to convert');
            return;
        }

        if (!this.currentFile) {
            new Notice('No active file found');
            return;
        }

        this.isConverting = true;
        this.showProgress();

        try {
            const imagekitService = new ImageKitService(this.plugin.settings);
            
            // Get current frontmatter
            const content = await this.app.vault.read(this.currentFile);
            const frontmatter = extractFrontmatter(content) || {};

            let successCount = 0;
            let errorCount = 0;

            // Process each selected property
            for (const propertyKey of this.selectedProperties) {
                const property = this.imageProperties.find(p => p.key === propertyKey);
                if (!property || !property.isLocalFile) continue;

                try {
                    this.updateProgress(`Converting ${property.key}...`);
                    
                    // Read the local file
                    const localPath = this.resolveLocalPath(property.value);
                    const fileBuffer = readFileSync(localPath);
                    
                    // Extract tags from frontmatter for ImageKit
                    const tags = imagekitService.extractTagsFromFrontmatter(frontmatter);
                    
                    // Generate filename
                    const fileName = this.generateFileName(property.key, localPath);
                    
                    // Upload to ImageKit
                    const uploadResult = await imagekitService.uploadFile(
                        fileBuffer.buffer,
                        fileName,
                        undefined, // Use default folder from settings
                        tags
                    );

                    // Update frontmatter with ImageKit URL
                    frontmatter[property.key] = uploadResult.url;
                    
                    console.log(`Successfully converted ${property.key}: ${uploadResult.url}`);
                    successCount++;

                    // Optionally remove local file if setting is enabled
                    if (this.plugin.settings.imageKit.removeLocalFiles) {
                        try {
                            const fs = require('fs');
                            fs.unlinkSync(localPath);
                            console.log(`Removed local file: ${localPath}`);
                        } catch (removeError) {
                            console.warn(`Failed to remove local file ${localPath}:`, removeError);
                        }
                    }

                } catch (error) {
                    console.error(`Error converting ${property.key}:`, error);
                    errorCount++;
                    new Notice(`Failed to convert ${property.key}: ${this.getErrorMessage(error)}`);
                }
            }

            // Update frontmatter in file
            if (successCount > 0) {
                const formattedFrontmatter = formatFrontmatter(frontmatter);
                await updateFileFrontmatter(this.currentFile, formattedFrontmatter);
            }

            // Show results
            const message = `Conversion complete: ${successCount} successful, ${errorCount} failed`;
            new Notice(message);
            
            if (successCount > 0) {
                this.close();
            }

        } catch (error) {
            console.error('Error in conversion process:', error);
            new Notice(`Conversion failed: ${this.getErrorMessage(error)}`);
        } finally {
            this.isConverting = false;
            this.hideProgress();
        }
    }

    private resolveLocalPath(imagePath: string): string {
        // If it's already an absolute path, use it
        if (imagePath.startsWith('/')) {
            return imagePath;
        }

        // Resolve relative to vault root
        const vaultPath = (this.app.vault.adapter as any).basePath || '';
        return join(vaultPath, imagePath);
    }

    private generateFileName(propertyKey: string, localPath: string): string {
        const timestamp = Date.now();
        const extension = localPath.split('.').pop() || 'png';
        const baseName = this.currentFile?.basename || 'image';
        
        return `${baseName}_${propertyKey}_${timestamp}.${extension}`;
    }

    private showProgress(): void {
        if (this.progressEl) {
            this.progressEl.style.display = 'block';
        }
    }

    private hideProgress(): void {
        if (this.progressEl) {
            this.progressEl.style.display = 'none';
        }
    }

    private updateProgress(message: string): void {
        if (this.progressEl) {
            const textEl = this.progressEl.querySelector('.image-gin-progress-text');
            if (textEl) {
                textEl.textContent = message;
            }
        }
    }

    private getErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            return error.message;
        }
        if (typeof error === 'string') {
            return error;
        }
        return 'An unknown error occurred';
    }

    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
    }
}
