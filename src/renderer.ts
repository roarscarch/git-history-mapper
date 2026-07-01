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

const AUTHOR_COLORS = [
  '#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4',
  '#42d4f4', '#f032e6', '#bfef45', '#fabed4', '#469990',
];

function getBranchColor(branch: string, colorMap: Map<string, string>): string {
  if (colorMap.has(branch)) return colorMap.get(branch)!;
  const idx = colorMap.size % BRANCH_COLORS.length;
  const color = BRANCH_COLORS[idx];
  colorMap.set(branch, color);
  return color;
}

function getAuthorColor(author: string, colorMap: Map<string, string>): string {
  if (colorMap.has(author)) return colorMap.get(author)!;
  const idx = colorMap.size % AUTHOR_COLORS.length;
  const color = AUTHOR_COLORS[idx];
  colorMap.set(author, color);
  return color;
}

interface RendererProps {
  commits: CommitNode[];
  colorMode: 'branch' | 'author';
  timeRange: [number, number];
}

const GraphView: React.FC<RendererProps> = ({ commits, colorMode, timeRange }) => {
  const { exit } = useApp();
  const [columns, rows] = useStdoutDimensions();
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const simRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter commits based on time range
  const filteredCommits = useMemo(() => {
    return commits.filter(c => c.timestamp >= timeRange[0] && c.timestamp <= timeRange[1]);
  }, [commits, timeRange]);

  // Build graph data from filtered commits
  useEffect(() => {
    if (filteredCommits.length === 0) return;

    const branchColorMap = new Map<string, string>();
    const authorColorMap = new Map<string, string>();

    const nodeMap = new Map<string, GraphNode>();
    const links: GraphLink[] = [];

    for (const commit of filteredCommits) {
      if (nodeMap.has(commit.sha)) continue;

      const color = colorMode === 'branch'
        ? (commit.branches.length > 0 ? getBranchColor(commit.branches[0], branchColorMap) : '#888')
        : getAuthorColor(commit.author.name, authorColorMap);

      const node: GraphNode = {
        id: commit.sha,
        x: Math.random() * 800,
        y: Math.random() * 600,
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
      };
      nodeMap.set(commit.sha, node);

      for (const parentSha of commit.parents) {
        if (nodeMap.has(parentSha)) {
          links.push({ source: commit.sha, target: parentSha });
        }
      }
    }

    // Create nodes array
    const nodes = Array.from(nodeMap.values());

    // Update links to reference node objects
    const linkIndex = new Map<string, number>();
    nodes.forEach((n, i) => linkIndex.set(n.id, i));
    const resolvedLinks = links.map(l => ({
      source: linkIndex.get(l.source)!,
      target: linkIndex.get(l.target)!,
    }));

    // Run force simulation
    const simulation = forceSimulation(nodes)
      .force('link', forceLink(resolvedLinks).distance(100).strength(0.5))
      .force('charge', forceManyBody().strength(-200))
      .force('center', forceCenter(400, 300))
      .force('collide', forceCollide(10))
      .alphaDecay(0.02)
      .on('tick', () => {
        setGraphData({
          nodes: nodes.map(n => ({ ...n })),
          links: resolvedLinks.map(l => ({
            source: nodes[l.source as number].id,
            target: nodes[l.target as number].id,
          })),
        });
      });

    simRef.current = simulation;

    return () => {
      simulation.stop();
    };
  }, [filteredCommits, colorMode]);

  // Keyboard controls
  useInput((input, key) => {
    if (key.escape) {
      exit();
    }
    if (key.upArrow) {
      setOffsetY(o => o - 10 / zoom);
    }
    if (key.downArrow) {
      setOffsetY(o => o + 10 / zoom);
    }
    if (key.leftArrow) {
      setOffsetX(o => o - 10 / zoom);
    }
    if (key.rightArrow) {
      setOffsetX(o => o + 10 / zoom);
    }
    if (input === '+') {
      setZoom(z => Math.min(z * 1.2, 5));
    }
    if (input === '-') {
      setZoom(z => Math.max(z / 1.2, 0.2));
    }
  });

  // Collapse nodes that are too close to each other for display
  const displayNodes = useMemo(() => {
    return graphData.nodes.filter(n => {
      const screenX = (n.x + offsetX) * zoom;
      const screenY = (n.y + offsetY) * zoom;
      return screenX >= 0 && screenX < columns && screenY >= 0 && screenY < rows;
    });
  }, [graphData, zoom, offsetX, offsetY, columns, rows]);

  // Render ASCII art
  const renderFrame = () => {
    // Create a 2D array for the screen buffer
    const screen: string[][] = Array.from({ length: rows }, () =>
      Array.from({ length: columns }