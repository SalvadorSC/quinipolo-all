import React, { useState } from 'react';
import { Container, Typography, Box, Paper, Tabs, Tab } from '@mui/material';
import MappingControls from './components/MappingControls';
import FlowMap from './components/FlowMap';
import ScreenshotViewer from './components/ScreenshotViewer';
import ScreenshotGallery from './components/ScreenshotGallery';
import ExplorationProgress from './components/ExplorationProgress';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api/mapping';

function App() {
  const [sessionId, setSessionId] = useState(null);
  const [flowMap, setFlowMap] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewTab, setViewTab] = useState(0);
  const [isExploring, setIsExploring] = useState(false);

  const handleStartMapping = async (url, options) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, options }),
      });

      const data = await response.json();
      if (data.success) {
        setSessionId(data.sessionId);
        setFlowMap({ nodes: [data.rootNode], edges: [] });
        setSelectedNode(data.rootNode);
      }
    } catch (error) {
      console.error('Error starting mapping:', error);
      alert('Failed to start mapping: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExploreNode = async (nodeId, maxDepth = 3) => {
    if (!sessionId) return;

    setLoading(true);
    setIsExploring(true);
    try {
      const response = await fetch(`${API_BASE_URL}/${sessionId}/explore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId, maxDepth }),
      });

      const data = await response.json();
      if (data.success) {
        // Progress will be handled by ExplorationProgress component
        // Flow map will refresh when exploration completes
      }
    } catch (error) {
      console.error('Error exploring node:', error);
      alert('Failed to explore node: ' + error.message);
      setIsExploring(false);
    } finally {
      setLoading(false);
    }
  };

  const handleExplorationComplete = async () => {
    setIsExploring(false);
    // Refresh flow map when exploration completes
    if (sessionId) {
      try {
        const flowMapResponse = await fetch(`${API_BASE_URL}/${sessionId}/flowmap`);
        const flowMapData = await flowMapResponse.json();
        if (flowMapData.success) {
          setFlowMap(flowMapData.flowMap);
        }
      } catch (error) {
        console.error('Error refreshing flow map:', error);
      }
    }
  };

  const handleExecuteAction = async (action) => {
    if (!sessionId) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/${sessionId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();
      if (data.success) {
        // Refresh flow map
        const flowMapResponse = await fetch(`${API_BASE_URL}/${sessionId}/flowmap`);
        const flowMapData = await flowMapResponse.json();
        if (flowMapData.success) {
          setFlowMap(flowMapData.flowMap);
          setSelectedNode(data.node);
        }
      }
    } catch (error) {
      console.error('Error executing action:', error);
      alert('Failed to execute action: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        App Mapper
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Automated application flow mapping and visualization
      </Typography>

      <Box sx={{ mt: 4 }}>
        <MappingControls
          onStartMapping={handleStartMapping}
          onExecuteAction={handleExecuteAction}
          loading={loading}
          sessionId={sessionId}
        />
      </Box>

      {sessionId && (
        <ExplorationProgress
          sessionId={sessionId}
          apiBaseUrl={API_BASE_URL}
          onComplete={handleExplorationComplete}
          isExploring={isExploring}
        />
      )}

      {flowMap && (
        <Box sx={{ mt: 4 }}>
          <Paper sx={{ p: 2 }}>
            <Tabs value={viewTab} onChange={(e, newValue) => setViewTab(newValue)} sx={{ mb: 2 }}>
              <Tab label="Flow Map" />
              <Tab label="Screenshot Gallery" />
            </Tabs>

            {viewTab === 0 && (
              <FlowMap
                flowMap={flowMap}
                onNodeSelect={setSelectedNode}
                onExploreNode={handleExploreNode}
                selectedNode={selectedNode}
              />
            )}

            {viewTab === 1 && (
              <ScreenshotGallery
                nodes={flowMap.nodes}
                apiBaseUrl={API_BASE_URL}
                onNodeSelect={setSelectedNode}
              />
            )}
          </Paper>
        </Box>
      )}

      {selectedNode && viewTab === 0 && (
        <Box sx={{ mt: 4 }}>
          <ScreenshotViewer
            node={selectedNode}
            sessionId={sessionId}
            apiBaseUrl={API_BASE_URL}
          />
        </Box>
      )}
    </Container>
  );
}

export default App;
