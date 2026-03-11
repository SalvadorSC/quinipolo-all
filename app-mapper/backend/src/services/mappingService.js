const BrowserService = require('./browserService');
const ScreenshotService = require('./screenshotService');
const FlowMapper = require('./flowMapper');
const { normalizeUrl } = require('../utils/urlNormalizer');

class MappingService {
  constructor() {
    this.browserService = new BrowserService();
    this.screenshotService = new ScreenshotService();
    this.activeSessions = new Map();
    this.explorationProgress = new Map(); // sessionId -> progress data
  }

  async startMappingSession(url, options = {}) {
    const sessionId = require('uuid').v4();
    const flowMapper = new FlowMapper();
    
    // Initialize browser with iPhone 12 mobile emulation by default
    await this.browserService.init({
      headless: options.headless !== false,
      mobile: options.mobile !== false, // Default to mobile (iPhone 12)
      width: options.width,
      height: options.height,
    });

    // Navigate to initial URL
    await this.browserService.navigateTo(url);
    
    // Capture initial screenshot
    const currentUrl = await this.browserService.getCurrentUrl();
    const normalizedUrl = normalizeUrl(currentUrl);
    const screenshotBuffer = await this.browserService.takeScreenshot();
    const screenshotData = await this.screenshotService.saveScreenshot(screenshotBuffer, {
      url: normalizedUrl,
      sessionId,
    });

    // Debug: verify screenshotData.url is correct
    if (!screenshotData.url || !screenshotData.url.startsWith('/screenshots/')) {
      console.error('ERROR: screenshotData.url is invalid:', screenshotData.url);
      console.error('screenshotData:', JSON.stringify(screenshotData, null, 2));
    }

    // Create root node
    const rootNode = flowMapper.createNode({
      url: await this.browserService.getCurrentUrl(),
      title: await this.browserService.getPageTitle(),
      screenshotId: screenshotData.id,
      screenshotUrl: screenshotData.url, // This should be /screenshots/filename.png
      depth: 0,
      metadata: { isRoot: true },
    });
    
    // Debug: verify screenshotUrl is correct
    if (!rootNode.screenshotUrl || !rootNode.screenshotUrl.startsWith('/screenshots/')) {
      console.error('WARNING: Invalid screenshotUrl in root node:', rootNode.screenshotUrl);
      console.error('screenshotData.url was:', screenshotData.url);
    }

    flowMapper.markUrlVisited(rootNode.url);

    const session = {
      id: sessionId,
      url,
      flowMapper,
      browserService: this.browserService,
      screenshotService: this.screenshotService,
      options,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    this.activeSessions.set(sessionId, session);

    return {
      sessionId,
      rootNode,
      screenshot: screenshotData,
    };
  }

  updateProgress(sessionId, progress) {
    this.explorationProgress.set(sessionId, {
      ...progress,
      timestamp: new Date().toISOString(),
    });
  }

  getProgress(sessionId) {
    return this.explorationProgress.get(sessionId) || null;
  }

  clearProgress(sessionId) {
    this.explorationProgress.delete(sessionId);
  }

  async exploreNode(sessionId, nodeId, maxDepth = 3) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const { flowMapper, browserService, screenshotService } = session;
    const node = flowMapper.getNode(nodeId);
    
    if (!node) {
      throw new Error('Node not found');
    }

    if (!browserService.isPageReady()) {
      throw new Error('Browser page is closed. Please restart the session.');
    }

    // Clear previous progress and initialize new progress
    this.clearProgress(sessionId);
    this.updateProgress(sessionId, {
      status: 'starting',
      message: `Starting exploration of: ${node.title || node.url}`,
      currentStep: 0,
      totalSteps: 0,
      discoveredPages: 0,
      currentElement: null,
    });

    try {
      this.updateProgress(sessionId, {
        status: 'navigating',
        message: `Navigating to: ${node.url}`,
      });
      await browserService.navigateTo(node.url);
    } catch (error) {
      this.updateProgress(sessionId, {
        status: 'error',
        message: `Failed to navigate: ${error.message}`,
      });
      throw new Error(`Failed to navigate to node URL: ${error.message}`);
    }

    let elements = [];
    try {
      this.updateProgress(sessionId, {
        status: 'detecting',
        message: 'Detecting clickable elements...',
      });
      elements = await browserService.getClickableElements();
      
      // Filter out already visited elements
      const unvisitedElements = elements.filter(
        (el) => !flowMapper.hasVisitedSelector(node.url, el.selector) && node.depth < maxDepth
      );
      
      this.updateProgress(sessionId, {
        status: 'exploring',
        message: `Found ${elements.length} elements, ${unvisitedElements.length} to explore`,
        currentStep: 0,
        totalSteps: unvisitedElements.length,
      });
    } catch (error) {
      this.updateProgress(sessionId, {
        status: 'error',
        message: `Failed to detect elements: ${error.message}`,
      });
      throw new Error(`Failed to get clickable elements: ${error.message}`);
    }

    const newNodes = [];
    const originalUrl = node.url;
    let stepCount = 0;

    for (const element of elements) {
      if (flowMapper.hasVisitedSelector(node.url, element.selector)) {
        continue;
      }

      if (node.depth >= maxDepth) {
        continue;
      }

      stepCount++;
      const elementLabel = element.text || element.selector || 'Unknown element';

      try {
        if (!browserService.isPageReady()) {
          console.error('Page closed during exploration');
          this.updateProgress(sessionId, {
            status: 'error',
            message: 'Page closed during exploration',
          });
          break;
        }

        this.updateProgress(sessionId, {
          status: 'clicking',
          message: `Clicking: ${elementLabel}`,
          currentStep: stepCount,
          currentElement: {
            selector: element.selector,
            text: element.text,
            type: element.tagName,
          },
        });

        const clicked = await browserService.clickElement(element.selector, {
          waitAfter: 2000,
        });

        if (!clicked) {
          this.updateProgress(sessionId, {
            status: 'exploring',
            message: `Failed to click: ${elementLabel}`,
            currentStep: stepCount,
          });
          if (browserService.isPageReady()) {
            await browserService.navigateTo(originalUrl);
          }
          continue;
        }

        if (!browserService.isPageReady()) {
          console.error('Page closed after click');
          this.updateProgress(sessionId, {
            status: 'error',
            message: 'Page closed after click',
          });
          break;
        }

        const newUrl = await browserService.getCurrentUrl();
        const newTitle = await browserService.getPageTitle();

        if (!newUrl || newUrl === 'about:blank') {
          this.updateProgress(sessionId, {
            status: 'exploring',
            message: `No navigation from: ${elementLabel}`,
            currentStep: stepCount,
          });
          await browserService.navigateTo(originalUrl);
          continue;
        }

        if (flowMapper.hasVisitedUrl(newUrl)) {
          const existingNode = flowMapper.getNodeByUrl(newUrl);
          if (existingNode) {
            flowMapper.createEdge(nodeId, existingNode.id, {
              selector: element.selector,
              elementText: element.text,
              elementType: element.tagName,
            });
            flowMapper.markSelectorVisited(node.url, element.selector);
          }
          this.updateProgress(sessionId, {
            status: 'exploring',
            message: `Found existing page: ${newTitle || newUrl}`,
            currentStep: stepCount,
            discoveredPages: newNodes.length,
          });
          if (browserService.isPageReady() && newUrl !== originalUrl) {
            await browserService.navigateTo(originalUrl);
          }
          continue;
        }

        this.updateProgress(sessionId, {
          status: 'capturing',
          message: `Capturing screenshot of: ${newTitle || newUrl}`,
          currentStep: stepCount,
        });

        const screenshotBuffer = await browserService.takeScreenshot();
        // Use the actual URL for caching (normalize it)
        const normalizedUrl = normalizeUrl(newUrl);
        const screenshotData = await screenshotService.saveScreenshot(screenshotBuffer, {
          url: normalizedUrl,
          sessionId,
        });

        const newNode = flowMapper.createNode({
          url: newUrl,
          title: newTitle,
          screenshotId: screenshotData.id,
          screenshotUrl: screenshotData.url,
          depth: node.depth + 1,
          parentId: nodeId,
        });

        flowMapper.createEdge(nodeId, newNode.id, {
          selector: element.selector,
          elementText: element.text,
          elementType: element.tagName,
        });

        flowMapper.markUrlVisited(newUrl);
        flowMapper.markSelectorVisited(node.url, element.selector);

        newNodes.push(newNode);

        this.updateProgress(sessionId, {
          status: 'exploring',
          message: `Discovered: ${newTitle || newUrl}`,
          currentStep: stepCount,
          discoveredPages: newNodes.length,
        });

        if (browserService.isPageReady() && newUrl !== originalUrl) {
          await browserService.navigateTo(originalUrl);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`Error exploring element ${element.selector}:`, error.message);
        this.updateProgress(sessionId, {
          status: 'exploring',
          message: `Error with ${elementLabel}: ${error.message}`,
          currentStep: stepCount,
        });
        if (browserService.isPageReady()) {
          try {
            await browserService.navigateTo(originalUrl);
          } catch (e) {
            console.error('Failed to navigate back:', e.message);
          }
        }
      }
    }

    this.updateProgress(sessionId, {
      status: 'completed',
      message: `Exploration complete! Discovered ${newNodes.length} new pages`,
      currentStep: stepCount,
      totalSteps: stepCount,
      discoveredPages: newNodes.length,
    });

    return {
      exploredElements: elements.length,
      newNodes,
      currentNode: node,
    };
  }

  async executeCustomAction(sessionId, action) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const { browserService, flowMapper, screenshotService } = session;

    switch (action.type) {
      case 'fill':
        await browserService.fillInput(action.selector, action.value);
        break;
      
      case 'click':
        await browserService.clickElement(action.selector, { waitAfter: 1000 });
        break;
      
      case 'navigate':
        await browserService.navigateTo(action.url);
        break;
      
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }

    // Capture screenshot after action
    const screenshotBuffer = await browserService.takeScreenshot();
    const currentUrl = await browserService.getCurrentUrl();
    const normalizedUrl = normalizeUrl(currentUrl);
    const screenshotData = await screenshotService.saveScreenshot(screenshotBuffer, {
      url: normalizedUrl,
      sessionId,
      action: action.type,
    });

    // Check if this is a new page
    let node = flowMapper.getNodeByUrl(currentUrl);
    if (!node) {
      node = flowMapper.createNode({
        url: currentUrl,
        title: await browserService.getPageTitle(),
        screenshotId: screenshotData.id,
        screenshotUrl: screenshotData.url,
        depth: 0,
      });
      flowMapper.markUrlVisited(currentUrl);
    }

    return {
      node,
      screenshot: screenshotData,
    };
  }

  getSession(sessionId) {
    return this.activeSessions.get(sessionId);
  }

  getFlowMap(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    return session.flowMapper.toJSON();
  }

  getTreeStructure(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    return session.flowMapper.getTreeStructure();
  }

  async getCurrentPageElements(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const { browserService } = session;

    if (!browserService.isPageReady()) {
      throw new Error('Browser page is closed. Please restart the session.');
    }

    try {
      const elements = await browserService.getClickableElements();
      return elements;
    } catch (error) {
      throw new Error(`Failed to get page elements: ${error.message}`);
    }
  }

  async endSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    await session.browserService.close();
    session.status = 'ended';
    
    // Keep session data but mark as ended
    return {
      sessionId,
      flowMap: session.flowMapper.toJSON(),
    };
  }
}

module.exports = MappingService;
