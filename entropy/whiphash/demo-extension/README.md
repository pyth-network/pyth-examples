# WhipHash Browser Extension

A simple browser extension that launches the WhipHash secure password generator app.

## Features

- 🚀 One-click access to WhipHash app
- 🎨 Beautiful dark theme matching the main app
- ⌨️ Keyboard shortcuts (Enter/Space to open)
- 🔗 Opens in new tab for easy access

## Installation

### For Development (Unpacked Extension)

1. **Open Chrome Extensions Page**
   - Go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)

2. **Load the Extension**
   - Click "Load unpacked"
   - Select the `demo-extension` folder

3. **Pin the Extension** (Optional)
   - Click the puzzle piece icon in Chrome toolbar
   - Pin the WhipHash extension for easy access

### For Production

1. **Update the URL**
   - Edit `popup.html`
   - Change `http://localhost:3000` to your hosted URL

2. **Add Icons** (Optional)
   - Create `icons/` folder
   - Add `icon16.png`, `icon48.png`, `icon128.png`
   - Or remove icon references from manifest.json

3. **Package Extension**
   - Zip the `demo-extension` folder
   - Upload to Chrome Web Store (if desired)

## Usage

1. Click the WhipHash extension icon in your browser toolbar
2. Click "🚀 Open App" button
3. The WhipHash app opens in a new tab
4. Generate secure passwords using Pyth Network entropy!

## Customization

### Change App URL
Edit `popup.html` line with `chrome.tabs.create()`:
```javascript
chrome.tabs.create({ 
  url: 'https://your-hosted-app.com' // Your hosted URL
});
```

### Update Extension Info
Edit `manifest.json`:
- `name`: Extension name
- `version`: Version number
- `description`: Extension description

## Development

The extension is minimal and focused:
- **manifest.json**: Extension configuration
- **popup.html**: UI and functionality
- **No build process needed**: Pure HTML/CSS/JS

## Hosting Options

For production, host your Next.js app on:
- **Vercel** (recommended for Next.js)
- **Netlify**
- **Railway**
- **Your own server**

Then update the URL in `popup.html`.
