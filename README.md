# SnippetBase

A vault-wide database UI for fenced code snippets in Obsidian. Search, filter, preview, and copy code snippets from across your entire vault.

## Features

- **Search & Filter**: Find snippets by content, language, or folder
- **Live Preview**: Syntax-highlighted code preview with copy functionality
- **Favorites**: Mark and filter favorite snippets
- **Incremental Indexing**: Automatically updates when you modify markdown files
- **Multiple Views**: Open in tab or right sidebar
- **Fast Performance**: Optimized for large vaults with hundreds of snippets

## Manual Installation

1. Download the latest release from [GitHub Releases](https://github.com/matthewbriel/snippetbase/releases)
2. Extract the files to your vault's `.obsidian/plugins/snippetbase/` folder
3. Reload Obsidian and enable "SnippetBase" in **Settings → Community plugins**

## Usage

### Opening SnippetBase
- **Ribbon Icon**: Click the code icon in the left sidebar
- **Command Palette**: Search for "SnippetBase: Open"
- **Commands**:
  - `SnippetBase: Open (tab)` - Opens in a new tab
  - `SnippetBase: Open (right sidebar)` - Opens in right sidebar

### Features
- **Search**: Type in the search box to filter snippets by content
- **Language Filter**: Filter by programming language (JavaScript, Python, etc.)
- **Folder Filter**: Filter by vault folder location
- **Favorites**: Click the star icon to favorite/unfavorite snippets
- **Copy**: Click the copy button to copy snippet content to clipboard
- **Preview**: Click any snippet to see full syntax-highlighted preview

### Commands
- `SnippetBase: Rebuild snippet index` - Manually rebuild the snippet database
- `SnippetBase: Log first 3 snippets` - Debug command for development

## Privacy & Security

- **No telemetry**: SnippetBase operates entirely offline and locally
- **No external requests**: All functionality works within your Obsidian vault
- **Local storage only**: Settings and data stay in your vault's `.obsidian` folder

## Development

This plugin is built with TypeScript and uses the Obsidian Plugin API.

### Setup
```bash
npm install
npm run dev  # Watch mode
npm run build  # Production build
```

### Architecture
- `src/main.ts` - Plugin lifecycle and event handling
- `src/snippetBase/indexer.ts` - Snippet parsing and indexing
- `src/ui/SnippetBaseView.ts` - Main UI component
- `src/settings.ts` - Settings and configuration

## Support

If you find this plugin useful, consider starring the repository or contributing improvements!

## License

MIT License - see LICENSE file for details
