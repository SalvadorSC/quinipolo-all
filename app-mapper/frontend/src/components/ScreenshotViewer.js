import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Dialog,
  DialogContent,
  Tooltip,
} from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { getScreenshotUrl } from '../utils/screenshotUrl';

const ScreenshotViewer = ({ node, sessionId, apiBaseUrl }) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  const screenshotUrl = getScreenshotUrl(node.screenshotUrl, apiBaseUrl);

  const handleOpenFullscreen = () => {
    setFullscreenOpen(true);
  };

  const handleCloseFullscreen = () => {
    setFullscreenOpen(false);
  };

  return (
    <>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            {node.title || 'Screenshot Details'}
          </Typography>
          {screenshotUrl && (
            <Box>
              <Tooltip title="View fullscreen">
                <IconButton onClick={handleOpenFullscreen} size="small">
                  <ZoomInIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Open in new tab">
                <IconButton
                  onClick={() => window.open(screenshotUrl, '_blank')}
                  size="small"
                >
                  <OpenInNewIcon />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>

        {screenshotUrl && !imageError ? (
          <Box
            sx={{
              mt: 2,
              mb: 2,
              position: 'relative',
              width: '100%',
              minHeight: '400px',
              backgroundColor: '#f5f5f5',
              borderRadius: '8px',
              border: '1px solid #ddd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {imageLoading && (
              <CircularProgress sx={{ position: 'absolute' }} />
            )}
            <img
              src={screenshotUrl}
              alt={node.title || 'Screenshot'}
              onLoad={() => {
                setImageLoading(false);
                setImageError(false);
              }}
              onError={(e) => {
                console.error('Failed to load screenshot:', screenshotUrl, e);
                setImageError(true);
                setImageLoading(false);
              }}
              style={{
                width: '100%',
                maxHeight: '600px',
                objectFit: 'contain',
                display: imageLoading ? 'none' : 'block',
                cursor: 'pointer',
              }}
              onClick={handleOpenFullscreen}
            />
          </Box>
        ) : (
          <Box
            sx={{
              mt: 2,
              mb: 2,
              width: '100%',
              minHeight: '400px',
              backgroundColor: '#f5f5f5',
              borderRadius: '8px',
              border: '1px solid #ddd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {imageError ? 'Failed to load screenshot' : 'No screenshot available'}
            </Typography>
          </Box>
        )}

        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            <strong>URL:</strong>{' '}
            <a href={node.url} target="_blank" rel="noopener noreferrer">
              {node.url}
            </a>
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            <strong>Depth:</strong> {node.depth}
          </Typography>
          {node.screenshotId && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              <strong>Screenshot ID:</strong> {node.screenshotId}
            </Typography>
          )}
          {screenshotUrl && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, wordBreak: 'break-all' }}>
              <strong>Screenshot URL:</strong>{' '}
              <a href={screenshotUrl} target="_blank" rel="noopener noreferrer">
                {screenshotUrl}
              </a>
            </Typography>
          )}
          {node.metadata && Object.keys(node.metadata).length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" gutterBottom>
                <strong>Metadata:</strong>
              </Typography>
              {Object.entries(node.metadata).map(([key, value]) => (
                <Chip
                  key={key}
                  label={`${key}: ${String(value)}`}
                  size="small"
                  sx={{ mr: 1, mb: 1 }}
                />
              ))}
            </Box>
          )}
        </Box>
      </Paper>

      <Dialog
        open={fullscreenOpen}
        onClose={handleCloseFullscreen}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
          },
        }}
      >
        <DialogContent sx={{ p: 0, position: 'relative' }}>
          {screenshotUrl && (
            <img
              src={screenshotUrl}
              alt={node.title || 'Screenshot'}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
              }}
            />
          )}
          <IconButton
            onClick={handleCloseFullscreen}
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              color: 'white',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
              },
            }}
          >
            ×
          </IconButton>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ScreenshotViewer;
