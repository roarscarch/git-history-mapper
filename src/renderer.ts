import { CommitNode } from './parser.js';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force';
import { render, Box, Text, useApp, useInput, useStdoutDimensions } from 'ink';
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Transform } from 'ink';

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
  const branchSet = new Set<string>();
  for (const c of commits) {
    for (const b of c.branches) {
      branchSet.add(b);
    }
  }
  const branchList = Array.from(branchSet).sort();
  const branchIndexMap = new Map<string, number>();
  branchList.forEach((b, i) => branchIndexMap.set(b, i));

  const nodes: GraphNode[] = commits.map((c) => {
    const branchIdx = c.branches.length > 0 ? branchIndexMap.get(c.branches[0])! : 0;
    return {
      id: c.sha.substring(0, 7),
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      fx: null,
      fy: null,
      color: getBranchColor(branchIdx),
      label: c.message.split('\
')[0].substring(0, 40),
      timestamp: c.timestamp,
      branches: c.branches,
      authorName: c.author.name,
    };
  });

  const nodeSet = new Set(nodes.map((n) => n.id));
  const links: GraphLink[] = [];
  for (const commit of commits) {
    const sourceId = commit.sha.substring(0, 7);
    if (!nodeSet.has(sourceId)) continue;
    for (const parentSha of commit.parents) {
      const targetId = parentSha.substring(0, 7);
      if (nodeSet.has(targetId)) {
        links.push({ source: sourceId, target: targetId });
      }
    }
  }

  return { nodes, links };
}

const TOOLTIP_WIDTH = 50;
const TOOLTIP_HEIGHT = 8;

function Tooltip({ node, x, y }: { node: GraphNode; x: number; y: number }) {
  const date = new Date(node.timestamp * 1000).toLocaleDateString();
  const branchStr = node.branches.join(', ') || 'none';
  return (
    <Box
      position="absolute"
      left={Math.min(x, process.stdout.columns - TOOLTIP_WIDTH)}
      top={Math.min(y, process.stdout.rows - TOOLTIP_HEIGHT)}
      width={TOOLTIP_WIDTH}
      height={TOOLTIP_HEIGHT}
      borderStyle="round"
      borderColor="white"
      backgroundColor="black"
    >
      <Box flexDirection="column" paddingX={1}>
        <Text bold color="cyan">{node.label}</Text>
        <Text color="yellow">By: {node.authorName}</Text>
        <Text color="green">Date: {date}</Text>
        <Text color="magenta">Branches: {branchStr}</Text>
        <Text color="gray">ID: {node.id}</Text>
      </Box>
    </Box>
  );
}

interface GraphCanvasProps {
  graph: GraphData;
  hoveredNode: GraphNode | null;
  mouseX: number;
  mouseY: number;
}

function GraphCanvas({ graph, hoveredNode, mouseX, mouseY }: GraphCanvasProps) {
  const { columns, rows } = useStdoutDimensions();
  const scaleX = columns / 2;
  const scaleY = rows / 2;

  const visibleNodes = graph.nodes.filter((n) => {
    const sx = Math.round(n.x * scaleX + columns / 2);
    const sy = Math.round(n.y * scaleY + rows / 2);
    return sx >= 0 && sx < columns && sy >= 0 && sy < rows;
  });

  return (
    <Box position="relative" width={columns} height={rows}>
      {visibleNodes.map((node) => {
        const sx = Math.round(node.x * scaleX + columns / 2);
        const sy = Math.round(node.y * scaleY + rows / 2);
        const isHovered = hoveredNode?.id === node.id;
        return (
          <Box
            key={node.id}
            position="absolute"
            left={sx}
            top={sy}
          >
            <Text color={isHovered ? 'white' : node.color}>
              {isHovered ? '●' : '○'}
            </Text>
          </Box>
        );
      })}
      {hoveredNode && (
        <Tooltip node={hoveredNode} x={mouseX} y={mouseY} />
      )}
    </Box>
  );
}

function App({ commits }: { commits: CommitNode[] }) {
  const graph = useMemo(() => buildGraphData(commits), [commits]);
  const [simulationNodes, setSimulationNodes] = useState<GraphNode[]>([]);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const [cursorX, setCursorX] = useState(0);
  const [cursorY, setCursorY] = useState(0);
  const simRef = useRef<any>(null);
  const { exit } = useApp();

  useInput((input, key) => {
    if (input === 'q' || key.escape) {
      exit();
    }
    // Arrow keys to move cursor (simulate hover)
    if (key.upArrow) {
      setCursorY((y) => Math.max(0, y - 1));
    }
    if (key.downArrow) {
      setCursorY((y) => Math.min(process.stdout.rows - 1, y + 1));
    }
    if (key.leftArrow) {
      setCursorX((x) => Math.max(0, x - 1));
    }
    if (key.rightArrow) {
      setCursorX((x) => Math.min(process.stdout.columns - 1, x + 1));
    }
  });

  // Update hovered node based on cursor position
  useEffect(() => {
    const { columns, rows }