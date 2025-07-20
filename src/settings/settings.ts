import type { ImageSize } from '../types';

export const DEFAULT_IMAGE_SIZES: ImageSize[] = [
    { width: 1200, height: 630, label: 'Banner (1200x630)' },
    { width: 800, height: 1200, label: 'Portrait (800x1200)' },
    { width: 1024, height: 1024, label: 'Square (1024x1024)' }
];

export interface ImageGinSettings {
    recraftApiKey: string;
    imagePromptKey: string;
    imageSizes: ImageSize[];
    defaultBannerSize: ImageSize;
    defaultPortraitSize: ImageSize;
    retries: number;
    rateLimit: number;
}

export const DEFAULT_SETTINGS: ImageGinSettings = {
    recraftApiKey: '',
    imagePromptKey: 'image_prompt',
    imageSizes: [...DEFAULT_IMAGE_SIZES],
    defaultBannerSize: { ...DEFAULT_IMAGE_SIZES[0] } as ImageSize,
    defaultPortraitSize: { ...DEFAULT_IMAGE_SIZES[1] } as ImageSize,
    retries: 3,
    rateLimit: 60
};
