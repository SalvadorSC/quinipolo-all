import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Dialog,
  DialogContent,
  IconButton,
  CircularProgress,
} from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import { getScreenshotUrl } from '../utils/screenshotUrl';

const ScreenshotGallery = ({ nodes, apiBaseUrl, onNodeSelect }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageLoading, setImageLoading] = useState({});

  const handleImageClick = (node) => {
    setSelectedImage(node);
  };

  const handleCloseDialog = () => {
    setSelectedImage(null);
  };

  const handleImageLoad = (nodeId) => {
    setImageLoading((prev) => ({ ...prev, [nodeId]: false }));
  };

  const handleImageError = (nodeId) => {
    setImageLoading((prev) => ({ ...prev, [nodeId]: false }));
  };

  const screenshots = nodes.filter((node) => node.screenshotUrl && typeof node.screenshotUrl === 'string');

  if (screenshots.length === 0) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Screenshot Gallery
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No screenshots available yet. Start exploring nodes to capture screenshots.
        </Typography>
      </Paper>
    );
  }

  return (
    <>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Screenshot Gallery ({screenshots.length} screenshots)
        </Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {screenshots.map((node) => {
            const screenshotUrl = getScreenshotUrl(node.screenshotUrl, apiBaseUrl);
            const isLoading = imageLoading[node.id] !== false;

            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={node.id}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'scale(1.02)',
                    },
                  }}
                  onClick={() => {
                    handleImageClick(node);
                    if (onNodeSelect) onNodeSelect(node);
                  }}
                >
                  <Box sx={{ position: 'relative' }}>
                    {isLoading && (
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
                    {getScreenshotUrl(node.screenshotUrl, apiBaseUrl) ? (
                      <CardMedia
                        component="img"
                        image={getScreenshotUrl(node.screenshotUrl, apiBaseUrl)}
                        alt={node.title || 'Screenshot'}
                        onLoad={() => handleImageLoad(node.id)}
                        onError={() => handleImageError(node.id)}
                        sx={{
                          height: 200,
                          objectFit: 'cover',
                          display: isLoading ? 'none' : 'block',
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          height: 200,
                          backgroundColor: '#f5f5f5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          No image
                        </Typography>
                      </Box>
                    )}
                    <IconButton
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        },
                      }}
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleImageClick(node);
                      }}
                    >
                      <ZoomInIcon />
                    </IconButton>
                  </Box>
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="caption" display="block" noWrap>
                      {node.title || 'Untitled'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" noWrap>
                      Depth: {node.depth}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Paper>

      <Dialog
        open={!!selectedImage}
        onClose={handleCloseDialog}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
          },
        }}
      >
        <DialogContent sx={{ p: 0, position: 'relative' }}>
          {selectedImage && getScreenshotUrl(selectedImage.screenshotUrl, apiBaseUrl) && (
            <img
              src={getScreenshotUrl(selectedImage.screenshotUrl, apiBaseUrl)}
              alt={selectedImage.title || 'Screenshot'}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
              }}
            />
          )}
          <IconButton
            onClick={handleCloseDialog}
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
          {selectedImage && (
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                p: 2,
              }}
            >
              <Typography variant="h6">{selectedImage.title || 'Untitled'}</Typography>
              <Typography variant="body2">{selectedImage.url}</Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ScreenshotGallery;
