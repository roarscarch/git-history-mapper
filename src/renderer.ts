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
  '#dcbeff', '#9A6324', '#800000', '#aaffc3', '#808000',
  '#ffd8b1', '#000075', '#a9a9a9', '#fffac8', '#e6beff',
];

function getBranchColor(branchIndex: number): string {
  return BRANCH_COLORS[branchIndex % BRANCH_COLORS.length];
}

function getAuthorColor(authorIndex: number): string {
  return AUTHOR_COLORS[authorIndex % AUTHOR_COLORS.length];
}

/**
 * Converts a hex color to an ANSI 256-color code (approximate).
 */
function hexToAnsi256(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Use a simple formula to map to 216 color cube
  const rIdx = Math.round(r / 51);
  const gIdx = Math.round(g / 51);
  const bIdx = Math.round(b / 51);
  return 16 + 36 * rIdx + 6 * gIdx + bIdx;
}

export async function renderGraph(commits: CommitNode[]): Promise<void> {
  const [colorMode, setColorMode] = useState<'branch' | 'author'>('branch');
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const { exit } = useApp();
  const [columns, rows] = useStdoutDimensions();
  const simulationRef = useRef<forceSimulation | null>(null);
  const graphRef = useRef<GraphData | null>(null);
  const [tickCount, setTickCount] = useState(0);

  useInput((input, key) => {
    if (input === 'q') {
      exit();
    }
    if (input === 'c') {
      setColorMode((prev) => (prev === 'branch' ? 'author' : 'branch'));
    }
    if (key.upArrow) {
      setPanY((p) => p - 5);
    }
    if (key.downArrow) {
      setPanY((p) => p + 5);
    }
    if (key.leftArrow) {
      setPanX((p) => p - 5);
    }
    if (key.rightArrow) {
      setPanX((p) => p + 5);
    }
    if (input === '+' || input === '=') {
      setZoom((z) => Math.min(z * 1.2, 10));
    }
    if (input === '-') {
      setZoom((z) => Math.max(z / 1.2, 0.1));
    }
  });

  // Build graph data
  const graphData = useMemo<GraphData>(() => {
    const branchSet = new Set<string>();
    const authorSet = new Set<string>();
    commits.forEach((c) => {
      c.branches.forEach((b) => branchSet.add(b));
      authorSet.add(c.author.name);
    });
    const branchList = Array.from(branchSet);
    const authorList = Array.from(authorSet);
    const branchColorMap = new Map<string, string>();
    const authorColorMap = new Map<string, string>();
    branchList.forEach((b, i) => branchColorMap.set(b, getBranchColor(i)));
    authorList.forEach((a, i) => authorColorMap.set(a, getAuthorColor(i)));

    const nodeMap = new Map<string, GraphNode>();
    const nodes: GraphNode[] = commits.map((c) => {
      const color =
        colorMode === 'branch'
          ? branchColorMap.get(c.branches[0] || 'default') || '#aaaaaa'
          : authorColorMap.get(c.author.name) || '#aaaaaa';
      const node: GraphNode = {
        id: c.sha.substring(0, 7),
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        fx: null,
        fy: null,
        color,
        label: c.message.split('\
')[0].substring(0, 40),
        timestamp: c.timestamp,
        branches: c.branches,
        authorName: c.author.name,
      };
      nodeMap.set(node.id, node);
      return node;
    });

    const links: GraphLink[] = [];
    for (const commit of commits) {
      const sourceId = commit.sha.substring(0, 7);
      if (!nodeMap.has(sourceId)) continue;
      for (const parentSha of commit.parents) {
        const targetId = parentSha.substring(0, 7);
        if (nodeMap.has(targetId)) {
          links.push({ source: sourceId, target: targetId });
        }
      }
    }

    return { nodes, links };
  }, [commits, colorMode]);

  // Force simulation
  useEffect(() => {
    const sim = forceSimulation(graphData.nodes)
      .force('link', forceLink(graphData.links).id((d: any) => d.id).distance(80))
      .force('charge', forceManyBody().strength(-300))
      .force('center', forceCenter(columns / 2, rows / 2))
      .force('collide', forceCollide(10))
      .alpha(1)
      .on('tick', () => {
        setTickCount((t) => t + 1);
      });

    simulationRef.current = sim;

    return () => {
      sim.stop();
    };
  }