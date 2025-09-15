import { App, Modal, Notice, MarkdownView } from 'obsidian';
import { FreepikService, FreepikImage } from '../services/freepikService.ts';
import { ImageCacheService, CachedImage } from '../services/imageCacheService';
import type ImageGinPlugin from '../../main';
import '../styles/freepik.css';

export class FreepikModal extends Modal {
    private freepikService: FreepikService;
    private imageCacheService: ImageCacheService;
    private searchQuery: string = '';
    private images: FreepikImage[] = [];
    private cachedImages: Map<string, CachedImage> = new Map();
    private onSelect: (image: FreepikImage) => Promise<void>;
    private resultsContainer!: HTMLElement;
    private plugin: ImageGinPlugin;

    constructor(app: App, plugin: ImageGinPlugin) {
        super(app);
        this.plugin = plugin;
        this.freepikService = new FreepikService();
        this.freepikService.setApiKey(this.plugin.settings.freepik.apiKey);
        this.imageCacheService = new ImageCacheService(app, plugin.settings);
        this.onSelect = async (image: FreepikImage) => {
            // Default implementation - insert image into current file
            const activeFile = this.app.workspace.getActiveFile();
            if (activeFile) {
                const imageMarkdown = `![${image.title}](${image.url})`;
                const editor = this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
                if (editor) {
                    editor.replaceSelection(imageMarkdown);
                }
            }
            this.close();
        };
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        // Create search input
        const searchContainer = contentEl.createDiv('freepik-search-container');
        const searchInput = searchContainer.createEl('input', {
            type: 'text',
            placeholder: 'Search for images on Freepik...',
            value: this.searchQuery
        });
        
        const searchButton = searchContainer.createEl('button', { text: 'Search' });
        searchButton.onclick = async () => {
            this.searchQuery = searchInput.value.trim();
            if (this.searchQuery) {
                await this.performSearch();
            }
        };

        // Handle Enter key
        searchInput.onkeydown = async (e) => {
            if (e.key === 'Enter') {
                this.searchQuery = searchInput.value.trim();
                if (this.searchQuery) {
                    await this.performSearch();
                }
            }
        };

        // Results container
        this.contentEl.createEl('h3', { text: 'Search Results' });
        this.resultsContainer = this.contentEl.createDiv('freepik-results');
        
        // Initial search if there's a query
        if (this.searchQuery) {
            this.performSearch();
        }
    }

    private async performSearch() {
        if (!this.resultsContainer) return;
        
        this.resultsContainer.empty();
        this.resultsContainer.createEl('p', { 
            text: `Searching for "${this.searchQuery}"...`,
            cls: 'freepik-status'
        });

        try {
            console.log('Performing search with term:', this.searchQuery);
            const result = await this.freepikService.searchImages(this.searchQuery, this.plugin.settings.freepik.defaultImageCount);
            this.images = result?.data || [];
            this.resultsContainer.empty();

            if (this.images.length === 0) {
                this.resultsContainer.createEl('p', { 
                    text: `No images found for "${this.searchQuery}". Try a different search term.`,
                    cls: 'freepik-no-results'
                });
                return;
            }

            const grid = this.resultsContainer.createDiv('freepik-grid');
            
            // Cache images and display them
            this.cacheAndDisplayImages(this.images, grid);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error performing search:', error);
            
            if (this.resultsContainer) {
                this.resultsContainer.empty();
                const errorEl = this.resultsContainer.createEl('div', { 
                    text: `Error searching for "${this.searchQuery}": ${errorMessage}`,
                    cls: 'freepik-error-message'
                });
                errorEl.style.color = 'red';
                errorEl.style.margin = '10px 0';
                errorEl.style.padding = '10px';
                errorEl.style.borderLeft = '3px solid red';
                errorEl.style.backgroundColor = 'var(--background-modifier-error)';
                
                // Add retry button
                const retryButton = this.resultsContainer.createEl('button', {
                    text: 'Retry Search',
                    cls: 'mod-cta'
                });
                retryButton.onclick = () => this.performSearch();
            }
            
            new Notice(`Search failed: ${errorMessage}`);
        }
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }

    /**
     * Cache images and display them in the grid
     */
    private async cacheAndDisplayImages(images: FreepikImage[], imageGrid: HTMLElement): Promise<void> {
        // Show loading indicator
        const loadingDiv = imageGrid.createDiv('freepik-loading');
        loadingDiv.textContent = 'Caching images for offline viewing...';
        
        try {
            // Extract thumbnail URLs
            const thumbnailUrls = images.map(image => image.image?.source?.url || '');
            
            // Cache all thumbnails
            const cachedThumbnails = await this.imageCacheService.cacheImages(thumbnailUrls);
            
            // Store cached images mapping
            images.forEach((image, index) => {
                const cachedThumb = cachedThumbnails[index];
                if (cachedThumb) {
                    this.cachedImages.set(image.image?.source?.url || '', cachedThumb);
                }
            });
            
            // Remove loading indicator
            loadingDiv.remove();
            
            // Display images
            images.forEach((image, index) => {
                const imgContainer = imageGrid.createDiv('freepik-image-container');
                
                const cachedThumb = this.cachedImages.get(image.image?.source?.url || '');
                const imageSrc = cachedThumb && cachedThumb.cached ? 
                    this.app.vault.adapter.getResourcePath(cachedThumb.localPath) : 
                    image.image?.source?.url || '';
                
                const img = imgContainer.createEl('img', {
                    attr: {
                        src: imageSrc,
                        alt: image.title || `Freepik image ${index + 1}`
                    },
                    cls: 'freepik-thumbnail'
                });
                img.style.maxWidth = '100px';
                img.style.maxHeight = '100px';
                
                // Add error handling for images that fail to load
                img.addEventListener('error', () => {
                    img.src = image.image?.source?.url || ''; // Fallback to original URL
                });
                
                const title = image.title || 'Untitled';
                imgContainer.createEl('p', { 
                    text: title.length > 30 ? title.substring(0, 30) + '...' : title,
                    cls: 'freepik-title'
                });
                
                imgContainer.onclick = async () => {
                    try {
                        // Cache the full-size image when selected
                        await this.cacheFullSizeImage(image);
                        await this.onSelect(image);
                        this.close();
                    } catch (error) {
                        console.error('Error selecting image:', error);
                        new Notice('Failed to select image. Please try again.');
                    }
                };
            });
            
        } catch (error) {
            console.error('Error caching images:', error);
            loadingDiv.textContent = 'Failed to cache images. Displaying original images...';
            
            // Fallback to original display method
            setTimeout(() => {
                loadingDiv.remove();
                this.displayImagesWithoutCache(images, imageGrid);
            }, 2000);
        }
    }
    
    /**
     * Cache the full-size image when user selects it
     */
    private async cacheFullSizeImage(image: FreepikImage): Promise<void> {
        try {
            const fullSizeUrl = image.url;
            if (fullSizeUrl) {
                const cachedImage = await this.imageCacheService.cacheImage(fullSizeUrl);
                
                if (cachedImage.cached) {
                    // Update the image object to use the cached path
                    image.url = cachedImage.localPath;
                    new Notice('Image cached successfully for offline use');
                }
            }
        } catch (error) {
            console.error('Failed to cache full-size image:', error);
            // Continue with original URL if caching fails
        }
    }
    
    /**
     * Fallback method to display images without caching
     */
    private displayImagesWithoutCache(images: FreepikImage[], imageGrid: HTMLElement): void {
        images.forEach((image, index) => {
            const imgContainer = imageGrid.createDiv('freepik-image-container');
            
            const img = imgContainer.createEl('img', { 
                attr: { 
                    src: image.image?.source?.url || '',
                    alt: image.title || `Freepik image ${index + 1}`
                },
                cls: 'freepik-thumbnail'
            });
            img.style.maxWidth = '100px';
            img.style.maxHeight = '100px';

            const title = image.title || 'Untitled';
            imgContainer.createEl('p', { 
                text: title.length > 30 ? title.substring(0, 30) + '...' : title,
                cls: 'freepik-title'
            });

            imgContainer.onclick = async () => {
                try {
                    await this.onSelect(image);
                    this.close();
                } catch (error) {
                    console.error('Error selecting image:', error);
                    new Notice('Failed to select image. Please try again.');
                }
            };
        });
    }
}