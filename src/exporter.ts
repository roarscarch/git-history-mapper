import { CommitNode } from './parser.js';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

export function exportHTML(commits: CommitNode[], outputPath: string): void {
  const nodes = commits.map((c, i) => ({
    id: c.sha.substring(0, 7),
    group: 1,
    label: c.message.split('\n')[0].substring(0, 40),
    author: c.author.name,
    timestamp: c.timestamp,
    branches: c.branches,
  }));

  const edges: { source: string; target: string }[] = [];
  const nodeMap = new Map<string, number>();
  nodes.forEach((n, i) => nodeMap.set(n.id, i));
  for (const commit of commits) {
    const sourceId = commit.sha.substring(0, 7);
    if (!nodeMap.has(sourceId)) continue;
    for (const parentSha of commit.parents) {
      const targetId = parentSha.substring(0, 7);
      if (nodeMap.has(targetId)) {
        edges.push({ source: sourceId, target: targetId });
      }
    }
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Git History Mapper</title>
<style>
  body { margin: 0; overflow: hidden; background: #1a1a2e; font-family: sans-serif; }
  svg { width: 100vw; height: 100vh; }
  .node circle { stroke: #fff; stroke-width: 1.5px; cursor: pointer; }
  .node text { font-size: 10px; fill: #e0e0e0; pointer-events: none; }
  .link { stroke: #999; stroke-opacity: 0.6; }
  .tooltip { position: absolute; background: rgba(0,0,0,0.8); color: #fff; padding: 6px 10px; border-radius: 4px; font-size: 12px; pointer-events: none; display: none; }
  .legend { position: absolute; top: 10px; left: 10px; color: #ccc; font-size: 12px; background: rgba(0,0,0,0.5); padding: 10px; border-radius: 4px; }
</style>
</head>
<body>
<div class="legend">Git History Mapper — ${nodes.length} commits, ${edges.length} connections</div>
<div class="tooltip" id="tooltip"></div>
<svg id="graph"></svg>
<script src="https://d3js.org/d3.v7.min.js"></script>
<script>
const nodes = ${JSON.stringify(nodes)};
const links = ${JSON.stringify(edges)};

const width = window.innerWidth;
const height = window.innerHeight;

const svg = d3.select('#graph')
  .attr('width', width)
  .attr('height', height);

const g = svg.append('g');

const zoom = d3.zoom()
  .scaleExtent([0.1, 10])
  .on('zoom', (event) => {
    g.attr('transform', event.transform);
  });

svg.call(zoom);

const simulation = d3.forceSimulation(nodes)
  .force('link', d3.forceLink(links).id(d => d.id).distance(80))
  .force('charge', d3.forceManyBody().strength(-200))
  .force('center', d3.forceCenter(width / 2, height / 2))
  .force('collision', d3.forceCollide().radius(10));

const link = g.append('g')
  .attr('class', 'links')
  .selectAll('line')
  .data(links)
  .enter().append('line')
  .attr('class', 'link')
  .attr('stroke-width', 1.5);

const node = g.append('g')
  .attr('class', 'nodes')
  .selectAll('g')
  .data(nodes)
  .enter().append('g')
  .attr('class', 'node')
  .call(d3.drag()
    .on('start', (event, d) => {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    })
    .on('drag', (event, d) => {
      d.fx = event.x;
      d.fy = event.y;
    })
    .on('end', (event, d) => {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }));

node.append('circle')
  .attr('r', 8)
  .attr('fill', d => d3.schemeCategory10[d.group % 10]);

node.append('text')
  .attr('dx', 12)
  .attr('dy', 4)
  .text(d => d.label);

const tooltip = document.getElementById('tooltip');

node.on('mouseover', (event, d) => {
  tooltip.style.display = 'block';
  tooltip.innerHTML = \`<strong>\${d.id}</strong><br>\${d.label}<br>Author: \${d.author}<br>Branches: \${d.branches.join(', ') || 'none'}\`;
})
  .on('mousemove', (event) => {
    tooltip.style.left = (event.pageX + 10) + 'px';
    tooltip.style.top = (event.pageY - 10) + 'px';
  })
  .on('mouseout', () => {
    tooltip.style.display = 'none';
  });

simulation.on('tick', () => {
  link
    .attr('x1', d => d.source.x)
    .attr('y1', d => d.source.y)
    .attr('x2', d => d.target.x)
    .attr('y2', d => d.target.y);

  node.attr('transform', d => \`translate(\${d.x},\${d.y})\`);
});
</script>
</body>
</html>
`;

  writeFileSync(resolve(outputPath), html.trim(), 'utf-8');
}
