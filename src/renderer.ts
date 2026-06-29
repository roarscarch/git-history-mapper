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

export function buildGraph(commits: CommitNode[]): GraphData {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const nodeMap = new Map<string, GraphNode>();

  // Collect all unique branch names across commits
  const allBranches = new Set<string>();
  for (const c of commits) {
    for (const b of c.branches) {
      allBranches.add(b);
    }
  }
  const branchList = Array.from(allBranches);
  const branchColorMap = new Map<string, string>();
  branchList.forEach((branch, i) => {
    branchColorMap.set(branch, getBranchColor(i));
  });

  for (const commit of commits) {
    const branch = commit.branches.length > 0 ? commit.branches[0] : 'HEAD';
    const color = branchColorMap.get(branch) || '#888';
    const node: GraphNode = {
      id: commit.sha,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      fx: null,
      fy: null,
      color,
      label: commit.sha.substring(0, 7),
      timestamp: commit.timestamp,
      branches: commit.branches,
    };
    nodes.push(node);
    nodeMap.set(commit.sha, node);
  }

  for (const commit of commits) {
    for (const parentSha of commit.parents) {
      if (nodeMap.has(parentSha)) {
        links.push({ source: commit.sha, target: parentSha });
      }
    }
  }

  return { nodes, links };
}

export function runSimulation(
  graph: GraphData,
  width: number,
  height: number,
  onTick: (nodes: GraphNode[]) => void
): () => void {
  const simulation = forceSimulation<GraphNode>(graph.nodes)
    .force('link', forceLink<GraphNode, GraphLink>(graph.links).id(d => d.id).distance(80))
    .force('charge', forceManyBody().strength(-300))
    .force('center', forceCenter(width / 2, height / 2))
    .force('collide', forceCollide(10))
    .alphaDecay(0.02)
    .on('tick', () => {
      onTick(graph.nodes);
    });

  return () => {
    simulation.stop();
  };
}

// Ink component for rendering the graph as characters
interface GraphCanvasProps {
  nodes: GraphNode[];
  width: number;
  height: number;
}

const GraphCanvas: React.FC<GraphCanvasProps> = ({ nodes, width, height }) => {
  const canvas = useRef<string[][]>([]);

  useEffect(() => {
    // Initialize blank canvas
    const newCanvas: string[][] = [];
    for (let y = 0; y < height; y++) {
      newCanvas[y] = [];
      for (let x = 0; x < width; x++) {
        newCanvas[y][x] = ' ';
      }
    }

    // Place nodes as dots
    for (const node of nodes) {
      const px = Math.round(node.x);
      const py = Math.round(node.y);
      if (px >= 0 && px < width && py >= 0 && py < height) {
        newCanvas[py][px] = '●';
      }
    }

    canvas.current = newCanvas;
  }, [nodes, width, height]);

  return (
    <Box flexDirection="column">
      {canvas.current.map((row, y) => (
        <Text key={y}>{row.join('')}</Text>
      ))}
    </Box>
  );
};

// Main app component
interface AppProps {
  commits: CommitNode[];
}

const App: React.FC<AppProps> = ({ commits }) => {
  const { exit } = useApp();
  const { columns, rows } = useStdoutDimensions();
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [simulationActive, setSimulationActive] = useState(true);
  const stopRef = useRef<(() => void) | null>(null);

  const graph = useMemo(() => buildGraph(commits), [commits]);

  useEffect(() => {
    const width = columns;
    const height = rows;

    const stop = runSimulation(graph, width, height, (updatedNodes) => {
      setNodes([...updatedNodes]);
    });

    stopRef.current = stop;

    // Stop simulation after 10 seconds
    const timer = setTimeout(() => {
      if (stopRef.current) {
        stopRef.current();
        setSimulationActive(false);
      }
    }, 10000);

    return () => {
      clearTimeout(timer);
      if (stopRef.current) {
        stopRef.current();
      }
    };
  }, [graph, columns, rows]);

  useInput((input) => {
    if (input === 'q') {
      exit();
    }
  });

  return (
    <Box flexDirection="column" height={rows} width={columns}>
      <Box>
        <Text bold>Git History Mapper</Text>
        <Text> — {nodes.length} nodes, {graph.links.length} links</Text>
        {simulationActive && <Text color="yellow"> (simulating...)</Text>}
      </Box>
      <GraphCanvas nodes={nodes} width={columns} height={rows - 2} />
    </Box>
  );
};

export function renderGraph(commits: CommitNode[]): void {
  render(<App commits={commits} />);
}
