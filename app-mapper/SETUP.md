# Setup Guide

## Prerequisites

- Node.js 16+ and npm
- Chrome/Chromium (for Puppeteer)

## Installation

### Backend

```bash
cd backend
npm install
```

Puppeteer will automatically download Chromium during installation.

### Frontend

```bash
cd frontend
npm install
```

## Configuration

### Backend Environment Variables

Create `backend/.env`:

```env
PORT=4000
NODE_ENV=development
```

### Frontend Environment Variables

Create `frontend/.env`:

```env
REACT_APP_API_URL=http://localhost:4000/api/mapping
```

## Running the Application

### Start Backend

```bash
cd backend
npm run dev
```

Backend will run on `http://localhost:4000`

### Start Frontend

```bash
cd frontend
npm start
```

Frontend will run on `http://localhost:4001`

## Usage

1. Open `http://localhost:4001` in your browser
2. Enter a URL to map (e.g., `https://example.com`)
3. Click "Start Mapping"
4. The tool will:
   - Navigate to the URL
   - Capture a screenshot
   - Detect clickable elements
5. Click "Explore" on any node to explore its interactions
6. Use "Execute Custom Action" to:
   - Fill form inputs (e.g., login forms)
   - Click specific elements
   - Navigate to specific URLs

## Example: Mapping a Login Flow

1. Start mapping with your app URL
2. Use "Execute Custom Action" → "Fill Input":
   - Selector: `#email` or `input[type="email"]`
   - Value: `user@example.com`
3. Fill password field:
   - Selector: `#password` or `input[type="password"]`
   - Value: `password123`
4. Click submit button:
   - Action Type: "Click Element"
   - Selector: `button[type="submit"]` or `.login-button`
5. The flow map will show the navigation path

## Troubleshooting

### Puppeteer Issues

If Puppeteer fails to launch:
- Ensure Chrome/Chromium is installed
- On Linux, you may need: `sudo apt-get install -y chromium-browser`
- Or set `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` and use system Chrome

### Port Conflicts

Change ports in:
- Backend: `backend/.env` (PORT)
- Frontend: `frontend/package.json` (start script)

### Screenshot Storage

Screenshots are stored in `backend/storage/screenshots/`. Ensure this directory is writable.

## Development Tips

- Use `headless: false` in mapping options to see browser actions
- Adjust `maxDepth` when exploring to limit exploration depth
- Check browser console for debugging information
- Screenshots are automatically cleaned up when sessions end (optional)
