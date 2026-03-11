import React, { useState } from 'react';
import { Handle, Position } from 'react-flow-renderer';
import { Paper, Typography, Box, Button, CircularProgress } from '@mui/material';
import { getScreenshotUrl } from '../utils/screenshotUrl';

const ScreenshotNode = ({ data }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  
  const screenshotUrl = getScreenshotUrl(data.screenshotUrl, data.apiBaseUrl);

  return (
    <Paper
      sx={{
        p: 1,
        minWidth: 200,
        border: data.isSelected ? '2px solid #1976d2' : '1px solid #ccc',
        cursor: 'pointer',
        backgroundColor: data.isSelected ? '#f5f5f5' : 'white',
      }}
      onClick={data.onSelect}
    >
      <Handle type="target" position={Position.Top} />
      
      <Box>
        {screenshotUrl && !imageError ? (
          <Box sx={{ position: 'relative', width: '100%', height: '120px' }}>
            {imageLoading && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f5f5f5',
                }}
              >
                <CircularProgress size={24} />
              </Box>
            )}
            <img
              src={screenshotUrl}
              alt={data.title || 'Screenshot'}
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
                height: '120px',
                objectFit: 'cover',
                borderRadius: '4px',
                display: imageLoading ? 'none' : 'block',
              }}
            />
          </Box>
        ) : (
          <Box
            sx={{
              width: '100%',
              height: '120px',
              backgroundColor: '#f5f5f5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
            }}
          >
            <Typography variant="caption" color="text.secondary">
              No screenshot
            </Typography>
          </Box>
        )}
        <Typography variant="caption" display="block" sx={{ mt: 1, fontWeight: 'bold' }}>
          {data.title || 'Untitled'}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
          {data.url?.substring(0, 30)}...
        </Typography>
        <Button
          size="small"
          variant="outlined"
          onClick={(e) => {
            e.stopPropagation();
            data.onExplore();
          }}
          sx={{ width: '100%' }}
        >
          Explore
        </Button>
      </Box>

      <Handle type="source" position={Position.Bottom} />
    </Paper>
  );
};

export default ScreenshotNode;
