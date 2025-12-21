# Releasing SnippetBase

This document contains the exact steps for maintainers to cut a new version and publish a GitHub Release for the Obsidian community plugin registry.

## Prerequisites

- Node.js and NPM installed
- Clean git working directory (no uncommitted changes)
- GitHub repository access with push permissions
- Test vault for verification

## Version Bump Steps

1. Update `manifest.json` version field using semantic versioning (major.minor.patch)
   ```json
   {
     "version": "0.2.0"
   }
   ```

2. **Only when minAppVersion changes**: Update `versions.json` to map the new version to minimum Obsidian version
   ```json
   {
     "0.2.0": "1.5.0"
   }
   ```

3. Optionally keep `package.json` version in sync (not required for Obsidian plugins)

## Build Steps

1. Clean install dependencies:
   ```bash
   npm ci
   ```

2. Build production artifacts:
   ```bash
   npm run build
   ```

3. Verify build artifacts exist and are updated:
   - `main.js` (compiled plugin code)
   - `manifest.json` (with correct version)
   - `styles.css` (plugin styles)

## Tag + Push Steps

1. Create and push git tag (MUST match manifest.json version exactly, no 'v' prefix):
   ```bash
   git tag 0.2.0
   git push origin 0.2.0
   ```

## GitHub Release Steps

1. Go to [GitHub Releases](https://github.com/brielms/SnippetBase/releases)

2. Click "Create a new release"

3. Select the tag you just pushed (e.g., `0.2.0`)

4. Add release title (e.g., "SnippetBase v0.2.0")

5. Add release notes describing changes

6. Upload the three required assets:
   - `main.js`
   - `manifest.json`
   - `styles.css`

7. Publish the release

## Sanity Test Steps

1. Create or use a clean test vault

2. Download the release assets from GitHub

3. Install manually:
   ```bash
   # Copy files to plugin folder
   cp main.js manifest.json styles.css /path/to/vault/.obsidian/plugins/snippetbase/
   ```

4. Reload Obsidian

5. Enable plugin in **Settings → Community plugins**

6. Smoke test:
   - Open SnippetBase (ribbon icon or command palette)
   - Search and filter snippets
   - Copy snippet content
   - Verify no console errors

## Community Plugin Registry

For the initial release or major updates:
- Submit the plugin to the [Obsidian Community Plugin Registry](https://github.com/obsidianmd/obsidian-releases)
- Follow their submission guidelines
- Wait for review and approval

## Troubleshooting

- **Build fails**: Ensure `npm ci` completed successfully and all dependencies are installed
- **Plugin doesn't load**: Check manifest.json syntax and version format
- **Assets missing**: Verify `npm run build` completed without errors
- **Tag issues**: Ensure tag name exactly matches manifest.json version</content>
</xai:function_call">Scripts should be executable and dependencies should be installed

