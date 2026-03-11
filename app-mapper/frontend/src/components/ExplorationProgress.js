import React, { useEffect, useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  LinearProgress,
  Chip,
  Alert,
  Collapse,
} from '@mui/material';
import {
  PlayArrow,
  CheckCircle,
  Error as ErrorIcon,
  NavigateNext,
} from '@mui/icons-material';

const ExplorationProgress = ({ sessionId, apiBaseUrl, onComplete, isExploring }) => {
  const [progress, setProgress] = useState(null);
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    // Start polling when exploration begins
    if (isExploring && sessionId) {
      setIsPolling(true);
      setProgress(null);
    } else if (!isExploring) {
      setIsPolling(false);
    }
  }, [isExploring, sessionId]);

  useEffect(() => {
    if (!sessionId || !isPolling) return;

    const pollProgress = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/${sessionId}/progress`);
        const data = await response.json();
        
        if (data.success && data.progress) {
          setProgress(data.progress);
          
          // Stop polling if completed or error
          if (data.progress.status === 'completed' || data.progress.status === 'error') {
            setIsPolling(false);
            if (onComplete) {
              setTimeout(() => onComplete(), 1000);
            }
          }
        } else if (data.success && data.progress?.status === 'idle') {
          // No exploration in progress
          setIsPolling(false);
        }
      } catch (error) {
        console.error('Error polling progress:', error);
        setIsPolling(false);
      }
    };

    // Poll every 500ms
    const interval = setInterval(pollProgress, 500);
    pollProgress(); // Initial poll

    return () => clearInterval(interval);
  }, [sessionId, apiBaseUrl, isPolling, onComplete]);

  if (!progress || progress.status === 'idle') {
    return null;
  }

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'starting':
      case 'navigating':
      case 'detecting':
      case 'exploring':
      case 'clicking':
      case 'capturing':
        return <PlayArrow color="primary" />;
      case 'completed':
        return <CheckCircle color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <NavigateNext />;
    }
  };

  const getStatusColor = () => {
    switch (progress.status) {
      case 'completed':
        return 'success';
      case 'error':
        return 'error';
      case 'clicking':
      case 'capturing':
        return 'info';
      default:
        return 'primary';
    }
  };

  const getStatusLabel = () => {
    switch (progress.status) {
      case 'starting':
        return 'Starting';
      case 'navigating':
        return 'Navigating';
      case 'detecting':
        return 'Detecting Elements';
      case 'exploring':
        return 'Exploring';
      case 'clicking':
        return 'Clicking Element';
      case 'capturing':
        return 'Capturing Screenshot';
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Error';
      default:
        return 'In Progress';
    }
  };

  const progressPercent = progress.totalSteps > 0
    ? (progress.currentStep / progress.totalSteps) * 100
    : 0;

  return (
    <Collapse in={!!progress && progress.status !== 'idle'}>
      <Paper sx={{ p: 2, mt: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          {getStatusIcon()}
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              {getStatusLabel()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {progress.message}
            </Typography>
          </Box>
          {progress.status === 'completed' && (
            <Chip
              icon={<CheckCircle />}
              label={`${progress.discoveredPages || 0} pages discovered`}
              color="success"
              size="small"
            />
          )}
        </Box>

        {progress.totalSteps > 0 && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Step {progress.currentStep} of {progress.totalSteps}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {Math.round(progressPercent)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progressPercent}
              color={getStatusColor()}
              sx={{ height: 8, borderRadius: 1 }}
            />
          </Box>
        )}

        {progress.currentElement && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              Current Element:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {progress.currentElement.text && (
                <Chip
                  label={progress.currentElement.text}
                  size="small"
                  icon={<NavigateNext />}
                />
              )}
              <Chip
                label={progress.currentElement.type || 'element'}
                size="small"
                variant="outlined"
              />
            </Box>
          </Box>
        )}

        {progress.status === 'error' && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {progress.message}
          </Alert>
        )}

        {progress.status === 'completed' && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Exploration completed successfully! Found {progress.discoveredPages || 0} new pages.
          </Alert>
        )}
      </Paper>
    </Collapse>
  );
};

export default ExplorationProgress;
