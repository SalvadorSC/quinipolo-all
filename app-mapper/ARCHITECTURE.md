# App Mapper Architecture

## Overview

App Mapper is an automated tool that explores web applications, captures screenshots at each interaction point, and builds a visual flow map showing all possible navigation paths.

## Core Components

### 1. Browser Automation (`browserService.js`)
- **Technology**: Puppeteer
- **Responsibilities**:
  - Launch and manage headless browser instances
  - Navigate to URLs
  - Detect clickable elements (buttons, links, inputs)
  - Execute clicks and form interactions
  - Capture screenshots

### 2. Screenshot Management (`screenshotService.js`)
- **Responsibilities**:
  - Save screenshots with unique IDs
  - Generate thumbnails for faster loading
  - Manage screenshot storage
  - Provide URLs for accessing screenshots

### 3. Flow Mapping (`flowMapper.js`)
- **Data Structure**: Graph/Tree
- **Responsibilities**:
  - Create nodes (representing pages/screens)
  - Create edges (representing interactions)
  - Track visited URLs and selectors to avoid duplicates
  - Build tree structures for visualization
  - Export/import flow maps as JSON

### 4. Mapping Service (`mappingService.js`)
- **Orchestration Layer**:
  - Coordinates browser automation, screenshot capture, and flow mapping
  - Manages mapping sessions
  - Handles exploration logic (breadth-first or depth-first)
  - Executes custom user actions

### 5. API Layer (`mappingController.js` + `mappingRoutes.js`)
- **Endpoints**:
  - `POST /api/mapping/start` - Start a new mapping session
  - `POST /api/mapping/:sessionId/explore` - Explore a specific node
  - `POST /api/mapping/:sessionId/action` - Execute custom action
  - `GET /api/mapping/:sessionId/flowmap` - Get flow map JSON
  - `GET /api/mapping/:sessionId/tree` - Get tree structure
  - `GET /api/mapping/:sessionId/screenshot` - Get screenshot image
  - `POST /api/mapping/:sessionId/end` - End session

### 6. Frontend (`React`)
- **Components**:
  - `MappingControls` - Start mapping, execute actions
  - `FlowMap` - Visualize flow using React Flow
  - `ScreenshotViewer` - Display selected screenshot
  - `ScreenshotNode` - Custom node component for flow map

## Data Flow

1. **Start Mapping**:
   ```
   User → Frontend → API → MappingService → BrowserService
   → Navigate → ScreenshotService → FlowMapper → Root Node
   ```

2. **Explore Node**:
   ```
   User → Frontend → API → MappingService
   → BrowserService (get elements) → Click each → ScreenshotService
   → FlowMapper (create nodes/edges) → Return new nodes
   ```

3. **Custom Action**:
   ```
   User → Frontend → API → MappingService → BrowserService
   → Execute action → ScreenshotService → FlowMapper → Update flow
   ```

## Key Features

### Element Detection
- Detects: links, buttons, inputs, selects, checkboxes, radio buttons
- Filters: hidden elements, duplicates
- Generates: unique CSS selectors for each element

### Duplicate Prevention
- Tracks visited URLs to avoid re-exploring same pages
- Tracks visited selectors per URL to avoid clicking same element twice
- Creates edges to existing nodes when revisiting pages

### Screenshot Management
- Full-page screenshots
- Thumbnail generation for performance
- Unique IDs for each screenshot
- Metadata storage (URL, timestamp, session ID)

### Flow Graph Structure
```javascript
{
  nodes: [
    {
      id: "uuid",
      url: "https://example.com",
      title: "Page Title",
      screenshotId: "screenshot-uuid",
      depth: 0,
      parentId: null,
      metadata: {}
    }
  ],
  edges: [
    {
      id: "edge-uuid",
      from: "node-id-1",
      to: "node-id-2",
      selector: "#button",
      elementText: "Click Me",
      elementType: "button"
    }
  ]
}
```

## Future Enhancements

1. **Persistent Storage**: Integrate Supabase/PostgreSQL for storing flow maps
2. **Export Formats**: Export to JSON, PNG, PDF, or interactive HTML
3. **Advanced Actions**: Support for drag-and-drop, scrolling, hover
4. **Smart Exploration**: ML-based element prioritization
5. **Parallel Exploration**: Explore multiple branches simultaneously
6. **Session Management**: Save/load mapping sessions
7. **Authentication Handling**: Better support for login flows
8. **Mobile View**: Map mobile-responsive views
9. **Accessibility Mapping**: Track accessibility features
10. **Performance Metrics**: Track load times, interaction delays

## Technical Considerations

### Performance
- Screenshots are stored on disk, not in memory
- Thumbnails reduce frontend load time
- Browser instances are reused per session

### Limitations
- Single browser instance per session (sequential exploration)
- No support for dynamic content that requires user interaction
- Limited support for SPAs with complex routing
- No handling of authentication tokens/cookies across sessions

### Security
- Runs in isolated browser instances
- No code execution from target applications
- Screenshots stored locally (consider cloud storage for production)
