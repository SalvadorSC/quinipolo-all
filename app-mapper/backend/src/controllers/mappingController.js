const MappingService = require('../services/mappingService');
const path = require('path');
const fs = require('fs').promises;

const mappingService = new MappingService();

class MappingController {
  async startMapping(req, res) {
    try {
      const { url, options = {} } = req.body;

      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }

      if (typeof url !== 'string' || (!url.startsWith('http://') && !url.startsWith('https://'))) {
        return res.status(400).json({ error: 'Invalid URL format. Must start with http:// or https://' });
      }

      const result = await mappingService.startMappingSession(url, options);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error('Error starting mapping:', error);
      res.status(500).json({
        error: 'Failed to start mapping',
        message: error.message,
      });
    }
  }

  async exploreNode(req, res) {
    try {
      const { sessionId } = req.params;
      const { nodeId, maxDepth = 3 } = req.body;

      if (!nodeId) {
        return res.status(400).json({ error: 'nodeId is required' });
      }

      const result = await mappingService.exploreNode(sessionId, nodeId, maxDepth);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error('Error exploring node:', error);
      res.status(500).json({
        error: 'Failed to explore node',
        message: error.message,
      });
    }
  }

  async executeAction(req, res) {
    try {
      const { sessionId } = req.params;
      const { action } = req.body;

      if (!action || !action.type) {
        return res.status(400).json({ error: 'Action is required' });
      }

      const result = await mappingService.executeCustomAction(sessionId, action);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error('Error executing action:', error);
      res.status(500).json({
        error: 'Failed to execute action',
        message: error.message,
      });
    }
  }

  async getFlowMap(req, res) {
    try {
      const { sessionId } = req.params;

      const flowMap = await mappingService.getFlowMap(sessionId);

      res.json({
        success: true,
        flowMap,
      });
    } catch (error) {
      console.error('Error getting flow map:', error);
      res.status(500).json({
        error: 'Failed to get flow map',
        message: error.message,
      });
    }
  }

  async getTreeStructure(req, res) {
    try {
      const { sessionId } = req.params;

      const tree = await mappingService.getTreeStructure(sessionId);

      res.json({
        success: true,
        tree,
      });
    } catch (error) {
      console.error('Error getting tree structure:', error);
      res.status(500).json({
        error: 'Failed to get tree structure',
        message: error.message,
      });
    }
  }

  async endSession(req, res) {
    try {
      const { sessionId } = req.params;

      const result = await mappingService.endSession(sessionId);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error('Error ending session:', error);
      res.status(500).json({
        error: 'Failed to end session',
        message: error.message,
      });
    }
  }

  async getScreenshot(req, res) {
    try {
      const { sessionId } = req.params;
      const { screenshotId } = req.query;

      const session = mappingService.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const screenshotBuffer = await session.screenshotService.getScreenshot(screenshotId);
      
      res.setHeader('Content-Type', 'image/png');
      res.send(screenshotBuffer);
    } catch (error) {
      console.error('Error getting screenshot:', error);
      res.status(404).json({
        error: 'Screenshot not found',
        message: error.message,
      });
    }
  }

  async getProgress(req, res) {
    try {
      const { sessionId } = req.params;

      const progress = mappingService.getProgress(sessionId);

      res.json({
        success: true,
        progress: progress || {
          status: 'idle',
          message: 'No exploration in progress',
        },
      });
    } catch (error) {
      console.error('Error getting progress:', error);
      res.status(500).json({
        error: 'Failed to get progress',
        message: error.message,
      });
    }
  }

  async getPageElements(req, res) {
    try {
      const { sessionId } = req.params;

      const elements = await mappingService.getCurrentPageElements(sessionId);

      res.json({
        success: true,
        elements,
      });
    } catch (error) {
      console.error('Error getting page elements:', error);
      res.status(500).json({
        error: 'Failed to get page elements',
        message: error.message,
      });
    }
  }
}

module.exports = new MappingController();
