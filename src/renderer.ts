import { CommitNode } from './parser.js';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force';
import { render, Box, Text, useApp, useInput, useStdoutDimensions } from 'ink';
import React, { useEffect, useRef, useState, useMemo } from 'react';

interface GraphNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number | null;
  fy: number | null;
  color: string;
  label: string;
  timestamp: number;
  branches: string[];
  authorName: string;
}

interface GraphLink {
  source: string;
  target: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

const BRANCH_COLORS = [
  '#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4',
  '#42d4f4', '#f032e6', '#bfef45', '#fabed4', '#469990',
  '#dcbeff', '#9A6324', '#800000', '#aaffc3', '#808000',
  '#ffd8b1', '#000075', '#a9a9a9', '#fffac8', '#e6beff',
];

function getBranchColor(branchIndex: number): string {
  return BRANCH_COLORS[branchIndex % BRANCH_COLORS.length];
}

function buildGraphData(commits: CommitNode[]): GraphData {
  const nodeMap = new Map<string, GraphNode>();
  const branchColors = new Map<string, string>();
  let branchIndex = 0;

  for (const commit of commits) {
    for (const branch of commit.branches) {
      if (!branchColors.has(branch)) {
        branchColors.set(branch, getBranchColor(branchIndex++));
      }
    }
  }

  for (const commit of commits) {
    const primaryBranch = commit.branches.length > 0 ? commit.branches[0] : 'unknown';
    const color = branchColors.get(primaryBranch) || '#cccccc';

    nodeMap.set(commit.sha, {
      id: commit.sha,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      fx: null,
      fy: null,
      color,
      label: commit.message.split('\
')[0].substring(0, 40),
      timestamp: commit.timestamp,
      branches: commit.branches,
      authorName: commit.author.name,
    });
  }

  const nodes = Array.from(nodeMap.values());
  const links: GraphLink[] = [];

  for (const commit of commits) {
    const sourceId = commit.sha;
    if (!nodeMap.has(sourceId)) continue;
    for (const parentSha of commit.parents) {
      if (nodeMap.has(parentSha)) {
        links.push({ source: sourceId, target: parentSha });
      }
    }
  }

  return { nodes, links };
}

interface ZoomState {
  scale: number;
  translateX: number;
  translateY: number;
}

interface TooltipData {
  node: GraphNode;
  x: number;
  y: number;
}

const GraphComponent: React.FC<{ commits: CommitNode[] }> = ({ commits }) => {
  const { exit } = useApp();
  const [columns, rows] = useStdoutDimensions();
  const [zoom, setZoom] = useState<ZoomState>({ scale: 1, translateX: 0, translateY: 0 });
  const [hoveredNode, setHoveredNode] = useState<TooltipData | null>(null);
  const simulationRef = useRef<ReturnType<typeof forceSimulation> | null>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const linksRef = useRef<GraphLink[]>([]);

  const graphData = useMemo(() => buildGraphData(commits), [commits]);

  useEffect(() => {
    nodesRef.current = graphData.nodes;
    linksRef.current = graphData.links;

    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    const sim = forceSimulation<GraphNode>(graphData.nodes)
      .force('link', forceLink<GraphNode, GraphLink>(graphData.links)
        .id(d => d.id)
        .distance(80)
        .strength(0.5))
      .force('charge', forceManyBody().strength(-200))
      .force('center', forceCenter(columns / 2, rows / 2))
      .force('collide', forceCollide(10))
      .alphaDecay(0.02)
      .on('tick', () => {
        // Force re-render by updating state
        setZoom(prev => ({ ...prev }));
      });

    simulationRef.current = sim;

    return () => {
      sim.stop();
    };
  }, [graphData, columns, rows]);

  useInput((input, key) => {
    const step = 10;
    const zoomStep = 0.1;

    if (key.escape) {
      exit();
      return;
    }

    if (key.upArrow || input === 'w') {
      setZoom(prev => ({ ...prev, translateY: prev.translateY - step }));
    } else if (key.downArrow || input === 's') {
      setZoom(prev => ({ ...prev, translateY: prev.translateY + step }));
    } else if (key.leftArrow || input === 'a') {
      setZoom(prev => ({ ...prev, translateX: prev.translateX - step }));
    } else if (key.rightArrow || input === 'd') {
      setZoom(prev => ({ ...prev, translateX: prev.translateX + step }));
    } else if (input === '+') {
      setZoom(prev => ({
        ...prev,
        scale: Math.min(3, prev.scale + zoomStep),
        translateX: prev.translateX - (columns / 2) * zoomStep,
        translateY: prev.translateY - (rows / 2) * zoomStep,
      }));
    } else if (input === '-') {
      setZoom(prev => ({
        ...prev,
        scale: Math.max(0.3, prev.scale - zoomStep),
        translateX: prev.translateX + (columns / 2) * zoomStep,
        translateY: prev.translateY + (rows / 2) * zoomStep,
      }));
    }
  });

  const visibleNodes = nodesRef.current.filter(n => {
    const x = (n.x + zoom.translateX) * zoom.scale;
    const y = (n.y + zoom.translateY) * zoom.scale;
    const margin = 50;
    return x > -margin && x < columns + margin && y > -margin && y < rows + margin;
  });

  const handleNodeClick = (node: GraphNode) => {
    setHoveredNode(prev =>
      prev && prev.node.id === node.id
        ? null
        : { node, x: (node.x + zoom.translateX) * zoom.scale, y: (node.y + zoom.translateY) * zoom.scale }
    );
  };

  return (
    <Box flexDirection="column" width={columns} height={rows}>
      <Box>
        <Text color="gray">
          Zoom: {zoom.scale.toFixed(1)}