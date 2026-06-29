#!/usr/bin/env node
import { program } from 'commander';
import { parseGitLog } from './parser.js';
import { renderGraph } from './renderer.js';
import { exportHTML } from './exporter.js';

program
  .name('git-history-mapper')
  .description('Visualize any Git repo as an interactive force-directed graph')
  .version('0.1.0')
  .option('--depth <number>', 'limit number of commits', parseInt)
  .option('--since <date>', 'only commits after this date (e.g., "2023-01-01")')
  .option('--export <file>', 'export visualization as standalone HTML file')
  .parse(process.argv);

const options = program.opts();

async function main() {
  const depth = options.depth;
  const since = options.since;
  const exportPath = options.export;

  console.error('Parsing git log...');
  const commits = parseGitLog(depth, since);
  console.error(`Found ${commits.length} commits`);

  if (exportPath) {
    console.error(`Exporting HTML to ${exportPath}...`);
    exportHTML(commits, exportPath);
    console.error('Done.');
  } else {
    console.error('Rendering interactive graph...');
    await renderGraph(commits);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
