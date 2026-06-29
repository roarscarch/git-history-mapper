# Git History Mapper

> See your repo's hidden social graph

Visualize any Git repo as an interactive, force-directed graph of commits, branches, and co-authors to reveal hidden collaboration patterns and project evolution.

## Stack
- Language: **typescript**
- d3-force, ink

## Features
- Parse git log into a node-edge graph (commits, authors, branches)
- Real-time force-directed layout with zoom and hover tooltips
- Color-code nodes by author or branch with adjustable time slider
- Export the visualization as a standalone HTML file
- CLI with optional --depth and --since flags to limit scope

## Architecture
Uses a custom incremental graph builder that streams git log output via child_process, building adjacency in a Map<sha, Node> while D3's force simulation runs in an Ink terminal canvas re-rendered on each tick.

## Getting Started
```bash
# Coming soon — this project is under active development.
```

*Built fresh every day by an AI-powered automation pipeline.*
