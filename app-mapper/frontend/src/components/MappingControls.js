import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api/mapping';

const MappingControls = ({ onStartMapping, onExecuteAction, loading, sessionId }) => {
  const [url, setUrl] = useState('');
  const [actionType, setActionType] = useState('fill');
  const [actionSelector, setActionSelector] = useState('');
  const [actionValue, setActionValue] = useState('');
  const [actionUrl, setActionUrl] = useState('');
  const [availableElements, setAvailableElements] = useState([]);
  const [loadingElements, setLoadingElements] = useState(false);

  const fetchPageElements = async () => {
    if (!sessionId) return;

    setLoadingElements(true);
    try {
      const response = await fetch(`${API_BASE_URL}/${sessionId}/elements`);
      const data = await response.json();
      if (data.success && data.elements) {
        setAvailableElements(data.elements);
      }
    } catch (error) {
      console.error('Error fetching page elements:', error);
    } finally {
      setLoadingElements(false);
    }
  };

  useEffect(() => {
    if (sessionId && (actionType === 'fill' || actionType === 'click')) {
      fetchPageElements();
    }
  }, [sessionId, actionType]);

  const handleStart = () => {
    if (!url.trim()) {
      alert('Please enter a URL');
      return;
    }
    onStartMapping(url, { headless: true });
  };

  const handleActionTypeChange = (newType) => {
    setActionType(newType);
    setActionSelector(''); // Reset selector when changing action type
  };

  const getFilteredElements = () => {
    if (actionType === 'fill') {
      // Filter for input and textarea elements
      return availableElements.filter(
        (el) =>
          (el.tagName === 'input' &&
            (el.type === 'text' ||
              el.type === 'email' ||
              el.type === 'password' ||
              el.type === 'number' ||
              el.type === 'tel' ||
              el.type === 'search' ||
              el.type === 'url' ||
              !el.type)) || // Include inputs without type (defaults to text)
          el.tagName === 'textarea'
      );
    } else if (actionType === 'click') {
      // Filter for clickable elements
      return availableElements.filter(
        (el) =>
          el.tagName === 'button' ||
          el.tagName === 'a' ||
          el.role === 'button' ||
          el.type === 'button' ||
          el.type === 'submit'
      );
    }
    return [];
  };

  const getElementLabel = (el) => {
    if (el.text && el.text.trim()) {
      return `${el.text.trim().substring(0, 50)} (${el.selector})`;
    }
    if (el.id) {
      return `#${el.id} (${el.selector})`;
    }
    if (el.className) {
      const firstClass = el.className.split(' ')[0];
      return `.${firstClass} (${el.selector})`;
    }
    return `${el.tagName} (${el.selector})`;
  };

  const handleExecuteAction = () => {
    let action = { type: actionType };

    if (actionType === 'fill') {
      if (!actionSelector || !actionValue) {
        alert('Please provide selector and value');
        return;
      }
      action.selector = actionSelector;
      action.value = actionValue;
    } else if (actionType === 'click') {
      if (!actionSelector) {
        alert('Please provide selector');
        return;
      }
      action.selector = actionSelector;
    } else if (actionType === 'navigate') {
      if (!actionUrl) {
        alert('Please provide URL');
        return;
      }
      action.url = actionUrl;
    }

    onExecuteAction(action);
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Mapping Controls
      </Typography>

      {!sessionId ? (
        <Box>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Application URL"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Button
                fullWidth
                variant="contained"
                onClick={handleStart}
                disabled={loading || !url.trim()}
                size="large"
              >
                {loading ? <CircularProgress size={24} /> : 'Start Mapping'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      ) : (
        <Box>
          <Typography variant="body2" color="success.main" gutterBottom>
            Session Active: {sessionId.substring(0, 8)}...
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            📱 Mapping in mobile mode (iPhone 12 - 390x844)
          </Typography>

          <Accordion sx={{ mt: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Execute Custom Action</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Action Type</InputLabel>
                    <Select
                      value={actionType}
                      label="Action Type"
                      onChange={(e) => handleActionTypeChange(e.target.value)}
                    >
                      <MenuItem value="fill">Fill Input</MenuItem>
                      <MenuItem value="click">Click Element</MenuItem>
                      <MenuItem value="navigate">Navigate to URL</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {actionType === 'fill' && (
                  <>
                    <Grid item xs={12}>
                      <FormControl fullWidth>
                        <InputLabel>CSS Selector</InputLabel>
                        <Select
                          value={actionSelector}
                          label="CSS Selector"
                          onChange={(e) => setActionSelector(e.target.value)}
                          disabled={loadingElements}
                          displayEmpty
                        >
                          <MenuItem value="">
                            <em>Select an input field...</em>
                          </MenuItem>
                          {getFilteredElements().map((el, index) => (
                            <MenuItem key={index} value={el.selector}>
                              {getElementLabel(el)}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      {loadingElements && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                          Loading elements...
                        </Typography>
                      )}
                      {!loadingElements && getFilteredElements().length === 0 && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                          No input fields found. You can still enter a selector manually.
                        </Typography>
                      )}
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Value"
                        placeholder="user@example.com"
                        value={actionValue}
                        onChange={(e) => setActionValue(e.target.value)}
                      />
                    </Grid>
                    {actionSelector && (
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Selected Selector"
                          value={actionSelector}
                          onChange={(e) => setActionSelector(e.target.value)}
                          helperText="You can edit the selector if needed"
                        />
                      </Grid>
                    )}
                  </>
                )}

                {actionType === 'click' && (
                  <>
                    <Grid item xs={12}>
                      <FormControl fullWidth>
                        <InputLabel>CSS Selector</InputLabel>
                        <Select
                          value={actionSelector}
                          label="CSS Selector"
                          onChange={(e) => setActionSelector(e.target.value)}
                          disabled={loadingElements}
                          displayEmpty
                        >
                          <MenuItem value="">
                            <em>Select an element to click...</em>
                          </MenuItem>
                          {getFilteredElements().map((el, index) => (
                            <MenuItem key={index} value={el.selector}>
                              {getElementLabel(el)}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      {loadingElements && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                          Loading elements...
                        </Typography>
                      )}
                      {!loadingElements && getFilteredElements().length === 0 && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                          No clickable elements found. You can still enter a selector manually.
                        </Typography>
                      )}
                    </Grid>
                    {actionSelector && (
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Selected Selector"
                          value={actionSelector}
                          onChange={(e) => setActionSelector(e.target.value)}
                          helperText="You can edit the selector if needed"
                        />
                      </Grid>
                    )}
                  </>
                )}

                {actionType === 'navigate' && (
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="URL"
                      placeholder="https://example.com/page"
                      value={actionUrl}
                      onChange={(e) => setActionUrl(e.target.value)}
                    />
                  </Grid>
                )}

                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      onClick={fetchPageElements}
                      disabled={loading || loadingElements || !sessionId}
                      sx={{ flexShrink: 0 }}
                    >
                      {loadingElements ? <CircularProgress size={20} /> : 'Refresh Elements'}
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleExecuteAction}
                      disabled={loading}
                      sx={{ flexGrow: 1 }}
                    >
                      {loading ? <CircularProgress size={24} /> : 'Execute Action'}
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Box>
      )}
    </Paper>
  );
};

export default MappingControls;
