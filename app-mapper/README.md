# App Mapper

Automated application mapping tool that explores web applications, captures screenshots, tracks interactions, and builds interactive flow maps.

## Features

- **Automated Exploration**: Load any web app via URL and automatically explore all possible interactions
- **Screenshot Capture**: Capture screenshots at each interaction point
- **Flow Mapping**: Build a tree/graph structure showing navigation paths
- **Interaction Tracking**: Track which buttons/elements lead to which screens
- **User-Defined Actions**: Support for custom actions like login, form filling, etc.
- **Visual Flow Map**: Interactive UI to visualize and navigate the app flow

## Architecture

### Backend
- **Node.js + Express**: API server
- **Puppeteer/Playwright**: Browser automation and screenshot capture
- **Database**: Store flow maps, screenshots metadata, interaction history
- **File Storage**: Store screenshot images

### Frontend
- **React**: UI for visualization and interaction
- **Graph Visualization**: Display flow maps as interactive trees/graphs
- **Screenshot Viewer**: Browse captured screenshots

## Project Structure

```
app-mapper/
├── backend/
│   ├── src/
│   │   ├── services/
│   │   │   ├── browserService.js      # Puppeteer/Playwright wrapper
│   │   │   ├── screenshotService.js   # Screenshot capture
│   │   │   ├── elementDetector.js     # Detect clickable elements
│   │   │   └── flowMapper.js          # Build flow graph
│   │   ├── controllers/
│   │   │   └── mappingController.js   # API endpoints
│   │   ├── models/
│   │   │   ├── FlowNode.js            # Flow node schema
│   │   │   └── MappingSession.js      # Mapping session schema
│   │   └── routes/
│   │       └── mappingRoutes.js       # API routes
│   ├── storage/
│   │   └── screenshots/               # Screenshot images
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── FlowMap/
│   │   │   ├── ScreenshotViewer/
│   │   │   └── MappingControls/
│   │   └── App.js
│   └── package.json
└── README.md
```

## Getting Started

### Backend Setup
```bash
cd backend
npm install
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

## Usage

1. Start a mapping session by providing a URL
2. The tool automatically explores the app, clicking buttons and capturing screenshots
3. View the generated flow map in the UI
4. Add custom actions (login, form filling) as needed
5. Export or share the flow map
