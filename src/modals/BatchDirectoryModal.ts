// src/modals/BatchDirectoryModal.ts

import { App, Modal, Notice, Setting, TFile } from 'obsidian';
import currentFileService from '../services/currentFileService';
import { textProcessingService } from '../services/textProcessingService';

export class BatchDirectoryModal extends Modal {
    private targetDirectory: string = '';

    constructor(app: App, defaultDirectory?: string) {
        super(app);
        this.targetDirectory = defaultDirectory || '/';
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'Batch Directory Operations' });

        // Directory Selection
        this.createDirectorySelectionSection(contentEl);
        
        // Batch File Operations
        this.createBatchFileOperationsSection(contentEl);
        
        // Batch Text Processing Operations
        this.createBatchTextProcessingSection(contentEl);
        
        // Batch Analysis Operations
        this.createBatchAnalysisSection(contentEl);
    }

    private createDirectorySelectionSection(contentEl: HTMLElement) {
        const section = contentEl.createEl('div', { cls: 'modal-section' });
        section.createEl('h3', { text: 'Directory Selection' });

        new Setting(section)
            .setName('Target Directory')
            .setDesc('Directory to process (defaults to vault root)')
            .addText(text => 
                text
                    .setPlaceholder('/ (vault root)')
                    .setValue(this.targetDirectory)
                    .onChange((value) => { 
                        this.targetDirectory = value || '/';
                    })
            )
            .addButton(button => 
                button
                    .setButtonText('List Files')
                    .onClick(async () => {
                        const files = await this.getMarkdownFilesInDirectory(this.targetDirectory);
                        new Notice(`Found ${files.length} markdown files in directory`);
                    })
            );
    }

    private createBatchFileOperationsSection(contentEl: HTMLElement) {
        const section = contentEl.createEl('div', { cls: 'modal-section' });
        section.createEl('h3', { text: 'Batch File Operations' });

        // Batch List Headers
        new Setting(section)
            .setName('Extract All Headers')
            .setDesc('Extract headers from all files in directory')
            .addButton(button => 
                button
                    .setButtonText('Extract Headers')
                    .onClick(async () => {
                        await this.processBatchOperation('listHeaders', () => {
                            new Notice('Headers extraction completed');
                        });
                    })
            );

        // Batch YAML Operations
        let yamlKey = '';
        let yamlValue = '';
        new Setting(section)
            .setName('Batch Update YAML')
            .setDesc('Update YAML key-value pair in all files')
            .addText(text => 
                text
                    .setPlaceholder('YAML key')
                    .onChange((value) => { yamlKey = value; })
            )
            .addText(text => 
                text
                    .setPlaceholder('New value')
                    .onChange((value) => { yamlValue = value; })
            )
            .addButton(button => 
                button
                    .setButtonText('Update All YAML')
                    .onClick(async () => {
                        if (!yamlKey || !yamlValue) {
                            new Notice('Please enter both key and value');
                            return;
                        }
                        
                        let filesUpdated = 0;
                        await this.processBatchOperation('updateYaml', (file, content) => {
                            const yaml = currentFileService.extractYamlFrontmatter(content);
                            if (yaml) {
                                const updatedYaml = currentFileService.changeYamlValue(yaml, yamlKey, yamlValue);
                                const newContent = content.replace(/^---\n[\s\S]+?\n---/, `---\n${updatedYaml}\n---`);
                                this.app.vault.modify(file, newContent);
                                filesUpdated++;
                            }
                        });
                        
                        new Notice(`Updated YAML in ${filesUpdated} files`);
                    })
            );
    }

    private createBatchTextProcessingSection(contentEl: HTMLElement) {
        const section = contentEl.createEl('div', { cls: 'modal-section' });
        section.createEl('h3', { text: 'Batch Text Processing' });

        // Batch Replace All
        let replacePattern = '';
        let replaceWith = '';
        new Setting(section)
            .setName('Batch Replace All')
            .setDesc('Replace pattern in all files in directory')
            .addText(text => 
                text
                    .setPlaceholder('Pattern to replace')
                    .onChange((value) => { replacePattern = value; })
            )
            .addText(text => 
                text
                    .setPlaceholder('Replace with')
                    .onChange((value) => { replaceWith = value; })
            )
            .addButton(button => 
                button
                    .setButtonText('Replace in All Files')
                    .onClick(async () => {
                        if (!replacePattern) {
                            new Notice('Please enter a pattern to replace');
                            return;
                        }
                        
                        try {
                            const regex = new RegExp(replacePattern, 'g');
                            let filesUpdated = 0;
                            let totalReplacements = 0;
                            
                            await this.processBatchOperation('replaceAll', (file, content) => {
                                const result = textProcessingService.replaceAll(content, regex, replaceWith);
                                if (result.changed) {
                                    this.app.vault.modify(file, result.content);
                                    filesUpdated++;
                                    totalReplacements += result.stats.itemsProcessed;
                                }
                            });
                            
                            new Notice(`Made ${totalReplacements} replacements in ${filesUpdated} files`);
                        } catch (error) {
                            new Notice('Invalid regex pattern');
                        }
                    })
            );

        // Batch Remove Duplicates
        new Setting(section)
            .setName('Remove Duplicate Lines')
            .setDesc('Remove duplicate lines from all files')
            .addButton(button => 
                button
                    .setButtonText('Remove Duplicates in All Files')
                    .onClick(async () => {
                        let filesUpdated = 0;
                        let totalLinesRemoved = 0;
                        
                        await this.processBatchOperation('removeDuplicates', (file, content) => {
                            const result = textProcessingService.removeDuplicateLines(content);
                            if (result.changed) {
                                this.app.vault.modify(file, result.content);
                                filesUpdated++;
                                totalLinesRemoved += result.stats.itemsProcessed;
                            }
                        });
                        
                        new Notice(`Removed ${totalLinesRemoved} duplicate lines from ${filesUpdated} files`);
                    })
            );

        // Batch Normalize Whitespace
        new Setting(section)
            .setName('Normalize Whitespace')
            .setDesc('Clean up whitespace in all files')
            .addButton(button => 
                button
                    .setButtonText('Normalize All Files')
                    .onClick(async () => {
                        let filesUpdated = 0;
                        
                        await this.processBatchOperation('normalizeWhitespace', (file, content) => {
                            const result = textProcessingService.normalizeWhitespace(content);
                            if (result.changed) {
                                this.app.vault.modify(file, result.content);
                                filesUpdated++;
                            }
                        });
                        
                        new Notice(`Normalized whitespace in ${filesUpdated} files`);
                    })
            );
    }

    private createBatchAnalysisSection(contentEl: HTMLElement) {
        const section = contentEl.createEl('div', { cls: 'modal-section' });
        section.createEl('h3', { text: 'Batch Analysis' });

        // Count Pattern Matches
        let countPattern = '';
        new Setting(section)
            .setName('Count Pattern Matches')
            .setDesc('Count occurrences of a pattern across all files')
            .addText(text => 
                text
                    .setPlaceholder('Pattern to count (regex)')
                    .onChange((value) => { countPattern = value; })
            )
            .addButton(button => 
                button
                    .setButtonText('Count Matches')
                    .onClick(async () => {
                        if (!countPattern) {
                            new Notice('Please enter a pattern to count');
                            return;
                        }
                        
                        try {
                            const regex = new RegExp(countPattern, 'g');
                            let totalMatches = 0;
                            let filesWithMatches = 0;
                            
                            await this.processBatchOperation('countMatches', (_file, content) => {
                                const count = textProcessingService.countOccurrences(content, regex);
                                if (count > 0) {
                                    totalMatches += count;
                                    filesWithMatches++;
                                }
                            });
                            
                            new Notice(`Found ${totalMatches} matches in ${filesWithMatches} files`);
                        } catch (error) {
                            new Notice('Invalid regex pattern');
                        }
                    })
            );

        // File Statistics
        new Setting(section)
            .setName('Generate Statistics')
            .setDesc('Generate statistics for all files in directory')
            .addButton(button => 
                button
                    .setButtonText('Generate Stats')
                    .onClick(async () => {
                        const files = await this.getMarkdownFilesInDirectory(this.targetDirectory);
                        let totalWords = 0;
                        let totalLines = 0;
                        let totalCharacters = 0;
                        let filesWithYaml = 0;
                        
                        for (const file of files) {
                            const content = await this.app.vault.read(file);
                            const lines = content.split('\n');
                            const words = content.split(/\s+/).filter(w => w.length > 0);
                            
                            totalLines += lines.length;
                            totalWords += words.length;
                            totalCharacters += content.length;
                            
                            if (currentFileService.extractYamlFrontmatter(content)) {
                                filesWithYaml++;
                            }
                        }
                        
                        const stats = [
                            `Files: ${files.length}`,
                            `Total Lines: ${totalLines}`,
                            `Total Words: ${totalWords}`,
                            `Total Characters: ${totalCharacters}`,
                            `Files with YAML: ${filesWithYaml}`
                        ];
                        
                        new Notice(`Directory Statistics:\n${stats.join('\n')}`);
                    })
            );
    }

    private async getMarkdownFilesInDirectory(directory: string): Promise<TFile[]> {
        const files = this.app.vault.getMarkdownFiles();
        
        if (directory === '/' || directory === '') {
            return files;
        }
        
        return files.filter(file => file.path.startsWith(directory));
    }

    private async processBatchOperation(
        operationType: string,
        callback: (file: TFile, content: string) => void
    ): Promise<void> {
        const files = await this.getMarkdownFilesInDirectory(this.targetDirectory);
        
        if (files.length === 0) {
            new Notice('No markdown files found in directory');
            return;
        }
        
        new Notice(`Processing ${files.length} files...`);
        
        for (const file of files) {
            try {
                const content = await this.app.vault.read(file);
                callback(file, content);
            } catch (error) {
                console.error(`Error processing file ${file.path}:`, error);
            }
        }
        
        new Notice(`Batch operation '${operationType}' completed`);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
