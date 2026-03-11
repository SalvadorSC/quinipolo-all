import React, { useCallback, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
} from 'react-flow-renderer';
import { Box, Typography, Paper } from '@mui/material';
import ScreenshotNode from './ScreenshotNode';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api/mapping';

const nodeTypes = {
  screenshot: ScreenshotNode,
};

const FlowMap = ({ flowMap, onNodeSelect, onExploreNode, selectedNode }) => {
  const nodes = useMemo(() => {
    return flowMap.nodes.map((node) => ({
      id: node.id,
      type: 'screenshot',
      position: {
        x: (node.depth || 0) * 300,
        y: Math.random() * 400,
      },
      data: {
        ...node,
        apiBaseUrl: API_BASE_URL,
        onSelect: () => onNodeSelect(node),
        onExplore: () => onExploreNode(node.id),
        isSelected: selectedNode?.id === node.id,
      },
    }));
  }, [flowMap.nodes, selectedNode, onNodeSelect, onExploreNode]);

  const edges = useMemo(() => {
    return flowMap.edges.map((edge) => ({
      id: edge.id,
      source: edge.from,
      target: edge.to,
      label: edge.elementText || edge.elementType,
      animated: true,
    }));
  }, [flowMap.edges]);

  const [nodesState, setNodes, onNodesChange] = useNodesState(nodes);
  const [edgesState, setEdges, onEdgesChange] = useEdgesState(edges);

  React.useEffect(() => {
    setNodes(nodes);
    setEdges(edges);
  }, [nodes, edges, setNodes, setEdges]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <Box sx={{ height: '600px', width: '100%' }}>
      <Typography variant="h6" gutterBottom>
        Flow Map ({flowMap.nodes.length} nodes, {flowMap.edges.length} edges)
      </Typography>
      <ReactFlow
        nodes={nodesState}
        edges={edgesState}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </Box>
  );
};

export default FlowMap;
