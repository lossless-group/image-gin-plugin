import { App, TFile, Vault, normalizePath } from 'obsidian';
import { ImageGinSettings } from '../settings/settings';
import { Notice } from 'obsidian';

export interface CachedImage {
    originalUrl: string;
    localPath: string;
    fileName: string;
    cached: boolean;
}

export class ImageCacheService {
    private app: App;
    private settings: ImageGinSettings;
    private cacheFolder: string;
    private cache: Map<string, CachedImage> = new Map();

    constructor(app: App, settings: ImageGinSettings) {
        this.app = app;
        this.settings = settings;
        this.cacheFolder = '.obsidian/plugins/image-gin/cache';
        this.ensureCacheFolder();
    }

    /**
     * Ensure the cache folder exists
     */
    private async ensureCacheFolder(): Promise<void> {
        const normalizedPath = normalizePath(this.cacheFolder);
        const folder = this.app.vault.getAbstractFileByPath(normalizedPath);
        
        if (!folder) {
            try {
                await this.app.vault.createFolder(normalizedPath);
            } catch (error) {
                console.error('Failed to create cache folder:', error);
            }
        }
    }

    /**
     * Generate a safe filename from URL
     */
    private generateFileName(url: string): string {
        // Extract file extension from URL
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const extension = pathname.split('.').pop() || 'jpg';
        
        // Create a hash-based filename to avoid conflicts
        const hash = this.simpleHash(url);
        return `freepik_${hash}.${extension}`;
    }

    /**
     * Simple hash function for generating consistent filenames
     */
    private simpleHash(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * Download and cache an image from external URL
     */
    async cacheImage(imageUrl: string): Promise<CachedImage> {
        // Check if already cached
        if (this.cache.has(imageUrl)) {
            const cached = this.cache.get(imageUrl)!;
            // Verify file still exists
            const file = this.app.vault.getAbstractFileByPath(cached.localPath);
            if (file) {
                return cached;
            }
        }

        const fileName = this.generateFileName(imageUrl);
        const localPath = normalizePath(`${this.cacheFolder}/${fileName}`);

        try {
            // Download the image
            const response = await fetch(imageUrl);
            if (!response.ok) {
                throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);

            // Save to vault
            await this.app.vault.createBinary(localPath, uint8Array);

            const cachedImage: CachedImage = {
                originalUrl: imageUrl,
                localPath,
                fileName,
                cached: true
            };

            // Update cache
            this.cache.set(imageUrl, cachedImage);
            
            return cachedImage;
        } catch (error) {
            console.error('Failed to cache image:', error);
            
            // Return uncached reference
            const uncachedImage: CachedImage = {
                originalUrl: imageUrl,
                localPath: imageUrl, // Fallback to original URL
                fileName: '',
                cached: false
            };
            
            return uncachedImage;
        }
    }

    /**
     * Cache multiple images concurrently
     */
    async cacheImages(imageUrls: string[]): Promise<CachedImage[]> {
        const promises = imageUrls.map(url => this.cacheImage(url));
        return Promise.all(promises);
    }

    /**
     * Get cached image info without downloading
     */
    getCachedImage(imageUrl: string): CachedImage | null {
        return this.cache.get(imageUrl) || null;
    }

    /**
     * Clear all cached images
     */
    async clearCache(): Promise<void> {
        try {
            const cacheFolder = this.app.vault.getAbstractFileByPath(this.cacheFolder);
            if (cacheFolder && cacheFolder instanceof TFile) {
                // If it's a file, delete it
                await this.app.vault.delete(cacheFolder);
            } else if (cacheFolder) {
                // If it's a folder, delete all files in it
                const files = this.app.vault.getFiles().filter(file => 
                    file.path.startsWith(this.cacheFolder)
                );
                
                for (const file of files) {
                    await this.app.vault.delete(file);
                }
            }
            
            // Clear memory cache
            this.cache.clear();
            
            // Recreate cache folder
            await this.ensureCacheFolder();
            
            new Notice('Image cache cleared successfully');
        } catch (error) {
            console.error('Failed to clear cache:', error);
            new Notice('Failed to clear image cache');
        }
    }

    /**
     * Get cache statistics
     */
    getCacheStats(): { totalImages: number; cacheSize: string } {
        const files = this.app.vault.getFiles().filter(file => 
            file.path.startsWith(this.cacheFolder)
        );
        
        const totalSize = files.reduce((sum, file) => sum + (file.stat?.size || 0), 0);
        const cacheSize = this.formatBytes(totalSize);
        
        return {
            totalImages: files.length,
            cacheSize
        };
    }

    /**
     * Format bytes to human readable string
     */
    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}