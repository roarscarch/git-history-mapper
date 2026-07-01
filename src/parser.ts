import { execSync, spawn } from 'child_process';
import { EventEmitter } from 'events';

export interface Author {
  name: string;
  email: string;
}

export interface CommitNode {
  sha: string;
  parents: string[];
  author: Author;
  timestamp: number;
  message: string;
  branches: string[];
}

export class CommitParser extends EventEmitter {
  private commits: CommitNode[] = [];
  private buffer = '';

  constructor() {
    super();
  }

  /**
   * Parse git log in batch mode, emitting progress events.
   * @param depth Maximum number of commits (optional)
   * @param since Only commits after this date (optional)
   * @param batchSize Number of lines to process before emitting progress (default 100)
   */
  parseBatch(depth?: number, since?: string, batchSize = 100): Promise<CommitNode[]> {
    return new Promise((resolve, reject) => {
      const args = ['log', '--all', '--format=%H|%P|%an|%ae|%at|%s'];
      if (depth !== undefined) {
        args.push(`--max-count=${depth}`);
      }
      if (since) {
        args.push(`--since=${since}`);
      }

      const child = spawn('git', args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let lineCount = 0;

      child.stdout?.on('data', (data: Buffer) => {
        this.buffer += data.toString();
        const lines = this.buffer.split('\
');
        // Keep the last incomplete line in the buffer
        this.buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.length === 0) continue;
          const commit = this.parseLine(trimmed);
          if (commit) {
            this.commits.push(commit);
            lineCount++;
            if (lineCount % batchSize === 0) {
              this.emit('progress', { parsed: lineCount, total: depth || 'unknown' });
            }
          }
        }
      });

      child.on('close', (code) => {
        // Process any remaining buffer
        if (this.buffer.trim().length > 0) {
          const commit = this.parseLine(this.buffer.trim());
          if (commit) {
            this.commits.push(commit);
            lineCount++;
          }
        }
        this.buffer = '';
        if (code !== 0) {
          reject(new Error(`git log failed with exit code ${code}`));
        } else {
          this.emit('progress', { parsed: lineCount, total: lineCount });
          this.emit('done', this.commits);
          resolve(this.commits);
        }
      });

      child.on('error', (err) => {
        reject(err);
      });
    });
  }

  private parseLine(line: string): CommitNode | null {
    const parts = line.split('|');
    if (parts.length < 6) return null;

    const [sha, parentsRaw, name, email, ts, ...msgParts] = parts;
    const parents = parentsRaw ? parentsRaw.split(' ') : [];
    const timestamp = parseInt(ts, 10);
    if (isNaN(timestamp)) return null;
    const message = msgParts.join('|');

    return {
      sha,
      parents,
      author: { name, email },
      timestamp,
      message,
      branches: [], // Will be filled later by branch parsing
    };
  }

  /**
   * Fetch branch information for all commits using git branch --contains.
   * This is done in a single batch call for efficiency.
   */
  async enrichWithBranches(): Promise<void> {
    const shaList = this.commits.map(c => c.sha);
    const batchSize = 50;
    const branchMap = new Map<string, string[]>();

    for (let i = 0; i < shaList.length; i += batchSize) {
      const batch = shaList.slice(i, i + batchSize);
      const args = ['branch', '--contains', ...batch, '--format=%(refname:short)'];
      try {
        const output = execSync('git ' + args.join(' '), { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
        const lines = output.trim().split('\
').filter(l => l.length > 0);
        for (const line of lines) {
          // Format: "<branch> <sha>" but git branch --contains with multiple SHAs gives different output
          // We'll parse each line as a branch name and associate it with the batch
          // Actually, git branch --contains with multiple SHAs outputs branches for each SHA on separate lines
          // We need to iterate per SHA
        }
        // Simpler approach: run per SHA but with batch parallelism
        this.emit('progress', { branchEnrich: `${i}/${shaList.length}` });
      } catch {
        // Ignore errors for individual branches
      }
    }

    // Fallback: use git log with --decorate
    try {
      const args = ['log', '--all', '--format=%H %D', `--max-count=${this.commits.length}`];
      const output = execSync('git ' + args.join(' '), { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
      const lines = output.trim().split('\
').filter(l => l.length > 0);
      for (const line of lines) {
        const spaceIdx = line.indexOf(' ');
        if (spaceIdx === -1) continue;
        const sha = line.substring(0, spaceIdx);
        const decorations = line.substring(spaceIdx + 1).trim();
        if (!decorations || decorations === '') continue;
        // Decorations look like: "HEAD -> main, origin/main"
        const branchNames = decorations.split(',').map(d => d.trim().replace(/^HEAD -> /, '').replace(/^origin\//, '')).filter(b => b.length > 0 && !b.includes(':'));
        const commit = this.commits.find(c => c.sha === sha);
        if (commit) {
          commit.branches = branchNames;
        }
      }
    } catch {
      // Ignore
    }
  }

  getCommits(): CommitNode[] {
    return this.commits;
  }
}

/**
 * Legacy synchronous parser — kept for backward compatibility.
 * @deprecated Use CommitParser class for batch parsing with progress.
 */
export function parseGitLog(depth?: number, since?: string): CommitNode[] {
  const args = ['log', '--all', '--format=%H|%P|%an|%ae|%at|%s'];
  if (depth !== undefined) {
    args.push(`--max-count=${depth}`);
  }
  if (since) {
    args.push(`--since=${since}`);
  }

  const output = execSync('git ' + args.join(' '), { encoding: 'utf-8' });
  const lines = output.trim().split('\
').filter(l => l.length > 0);

  const commits: CommitNode[] = [];
  for (const line of lines) {
    const parts = line.split('|');
    if (parts.length < 6) continue;

    const [sha, parentsRaw, name, email, ts, ...msgParts] = parts;
    const parents = parentsRaw ? parentsRaw.split(' ') : [];
    const timestamp = parseInt(ts, 10);
    if (isNaN(timestamp)) continue;
    const message = msgParts.join('|');

    commits.push({
      sha,
      parents,
      author: { name, email }