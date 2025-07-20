![Obsidian Plugin Starter Kit by The Lossless Group](https://i.imgur.com/nfqH3Pi.png)
# The Image Gin Plugin for Obsidian

This plugin enables Obsidian users to generate contextually relevant images with the assistance of Generative AI.  We begin with the [Recraft](https://recraft.ai) API.

## Getting Started

If you want to use the `setup-plugin.mjs` script, fill out `plugin-config.yaml` and then make it an executable file. 

```bash
chmod +x setup-plugin.mjs
```

When run, it will create the basic metadata and fill in the template variables.  If you don't need it, just delete it and happy hacking.

Run the script with 

```bash
node setup-plugin.mjs
```


```
pnpm install
pnpm add -D esbuild @types/node builtin-modules
pnpm build
pnpm dev
```

## Packages, Dependencies, Libraries:

```json
"devDependencies": {
   "@types/node": "^24.0.12",
   "@typescript-eslint/eslint-plugin": "8.36.0",
   "@typescript-eslint/parser": "8.36.0",
   "builtin-modules": "5.0.0",
   "esbuild": "0.25.6",
   "eslint": "^9.30.1",
   "obsidian": "latest",
   "tslib": "2.8.1",
   "typescript": "5.8.3"
},
"dependencies": {
   "@modelcontextprotocol/sdk": "^1.15.0",
   "fastify": "^5.4.0",
   "zod": "^4.0.0"
}
```

## Using Symbolic Links to Test Your Plugin

If you're like us, you have a directory housing all your code projects. To use your plugin as you develop it, just create a symbolic link. Here is my example, but you will need to use your own path structure:

```bash
ln -s /Users/mpstaton/code/lossless-monorepo/obsidian-plugin-starter /Users/mpstaton/content-md/lossless/.obsidian/plugins/
```
