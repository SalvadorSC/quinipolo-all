const express = require('express');
const router = express.Router();
const mappingController = require('../controllers/mappingController');
const path = require('path');
const expressStatic = require('express').static;

// Serve screenshots statically
router.use('/screenshots', expressStatic(path.join(__dirname, '../../storage/screenshots')));

// API Routes
router.post('/start', mappingController.startMapping.bind(mappingController));
router.post('/:sessionId/explore', mappingController.exploreNode.bind(mappingController));
router.post('/:sessionId/action', mappingController.executeAction.bind(mappingController));
router.get('/:sessionId/flowmap', mappingController.getFlowMap.bind(mappingController));
router.get('/:sessionId/tree', mappingController.getTreeStructure.bind(mappingController));
router.get('/:sessionId/screenshot', mappingController.getScreenshot.bind(mappingController));
router.get('/:sessionId/progress', mappingController.getProgress.bind(mappingController));
router.get('/:sessionId/elements', mappingController.getPageElements.bind(mappingController));
router.post('/:sessionId/end', mappingController.endSession.bind(mappingController));

module.exports = router;
