const { v4: uuidv4 } = require('uuid');

class FlowMapper {
  constructor() {
    this.nodes = new Map(); // nodeId -> node
    this.edges = new Map(); // edgeId -> edge
    this.visitedUrls = new Set();
    this.visitedSelectors = new Set();
  }

  createNode(data) {
    const node = {
      id: data.id || uuidv4(),
      url: data.url,
      title: data.title,
      screenshotId: data.screenshotId,
      screenshotUrl: data.screenshotUrl,
      timestamp: data.timestamp || new Date().toISOString(),
      depth: data.depth || 0,
      parentId: data.parentId || null,
      metadata: data.metadata || {},
    };

    this.nodes.set(node.id, node);
    return node;
  }

  createEdge(fromNodeId, toNodeId, interaction) {
    const edgeId = `${fromNodeId}_${toNodeId}_${interaction.selector || 'default'}`;
    
    // Avoid duplicate edges
    if (this.edges.has(edgeId)) {
      return this.edges.get(edgeId);
    }

    const edge = {
      id: edgeId,
      from: fromNodeId,
      to: toNodeId,
      selector: interaction.selector,
      elementText: interaction.elementText,
      elementType: interaction.elementType,
      action: interaction.action || 'click',
      timestamp: new Date().toISOString(),
    };

    this.edges.set(edgeId, edge);
    return edge;
  }

  hasVisitedUrl(url) {
    return this.visitedUrls.has(url);
  }

  markUrlVisited(url) {
    this.visitedUrls.add(url);
  }

  hasVisitedSelector(url, selector) {
    const key = `${url}::${selector}`;
    return this.visitedSelectors.has(key);
  }

  markSelectorVisited(url, selector) {
    const key = `${url}::${selector}`;
    this.visitedSelectors.add(key);
  }

  getNode(id) {
    return this.nodes.get(id);
  }

  getNodeByUrl(url) {
    for (const node of this.nodes.values()) {
      if (node.url === url) {
        return node;
      }
    }
    return null;
  }

  getChildren(nodeId) {
    const children = [];
    for (const edge of this.edges.values()) {
      if (edge.from === nodeId) {
        const childNode = this.nodes.get(edge.to);
        if (childNode) {
          children.push({ node: childNode, edge });
        }
      }
    }
    return children;
  }

  getParent(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node || !node.parentId) {
      return null;
    }
    return this.nodes.get(node.parentId);
  }

  getPathToRoot(nodeId) {
    const path = [];
    let currentNode = this.nodes.get(nodeId);
    
    while (currentNode) {
      path.unshift(currentNode);
      currentNode = currentNode.parentId ? this.nodes.get(currentNode.parentId) : null;
    }
    
    return path;
  }

  toJSON() {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
      metadata: {
        totalNodes: this.nodes.size,
        totalEdges: this.edges.size,
        createdAt: new Date().toISOString(),
      },
    };
  }

  fromJSON(data) {
    this.nodes.clear();
    this.edges.clear();
    this.visitedUrls.clear();
    this.visitedSelectors.clear();

    if (data.nodes) {
      data.nodes.forEach(node => {
        this.nodes.set(node.id, node);
        this.visitedUrls.add(node.url);
      });
    }

    if (data.edges) {
      data.edges.forEach(edge => {
        this.edges.set(edge.id, edge);
        const fromNode = this.nodes.get(edge.from);
        if (fromNode) {
          this.markSelectorVisited(fromNode.url, edge.selector);
        }
      });
    }
  }

  getRootNodes() {
    return Array.from(this.nodes.values()).filter(node => !node.parentId);
  }

  getTreeStructure(rootId = null) {
    if (!rootId) {
      const roots = this.getRootNodes();
      if (roots.length === 0) return null;
      rootId = roots[0].id;
    }

    const node = this.nodes.get(rootId);
    if (!node) return null;

    const buildTree = (nodeId) => {
      const node = this.nodes.get(nodeId);
      const children = this.getChildren(nodeId);
      
      return {
        ...node,
        children: children.map(({ node: childNode, edge }) => ({
          ...buildTree(childNode.id),
          edge,
        })),
      };
    };

    return buildTree(rootId);
  }
}

module.exports = FlowMapper;
