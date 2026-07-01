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

      const git = spawn('git', args, { stdio: ['ignore', 'pipe', 'pipe'] });

      let lineCount = 0;
      let errorOutput = '';

      git.stdout.on('data', (data: Buffer) => {
        this.buffer += data.toString();
        const lines = this.buffer.split('\n');
        this.buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;
          lineCount++;
          const parts = line.split('|');
          if (parts.length < 6) continue;

          const [sha, parentsStr, authorName, authorEmail, timestampStr, ...messageParts] = parts;
          const message = messageParts.join('|');
          const parents = parentsStr ? parentsStr.split(' ') : [];
          const timestamp = parseInt(timestampStr, 10);

          const commit: CommitNode = {
            sha,
            parents,
            author: { name: authorName, email: authorEmail },
            timestamp,
            message,
            branches: [],
          };
          this.commits.push(commit);

          if (lineCount % batchSize === 0) {
            this.emit('progress', { processed: lineCount, total: depth || 'unknown' });
          }
        }
      });

      git.stderr.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });

      git.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`git log exited with code ${code}: ${errorOutput}`));
          return;
        }
        // Process any remaining buffer
        if (this.buffer.trim()) {
          const line = this.buffer.trim();
          const parts = line.split('|');
          if (parts.length >= 6) {
            const [sha, parentsStr, authorName, authorEmail, timestampStr, ...messageParts] = parts;
            const message = messageParts.join('|');
            const parents = parentsStr ? parentsStr.split(' ') : [];
            const timestamp = parseInt(timestampStr, 10);
            this.commits.push({
              sha,
              parents,
              author: { name: authorName, email: authorEmail },
              timestamp,
              message,
              branches: [],
            });
          }
        }
        this.emit('progress', { processed: this.commits.length, total: this.commits.length });
        resolve(this.commits);
      });

      git.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Synchronous version for small repos or fallback.
   */
  parseSync(depth?: number, since?: string): CommitNode[] {
    const args = ['log', '--all', '--format=%H|%P|%an|%ae|%at|%s'];
    if (depth !== undefined) {
      args.push(`--max-count=${depth}`);
    }
    if (since) {
      args.push(`--since=${since}`);
    }

    const output = execSync('git', args, { encoding: 'utf-8' });
    const lines = output.trim().split('\n');
    const commits: CommitNode[] = [];

    for (const line of lines) {
      if (line.trim() === '') continue;
      const parts = line.split('|');
      if (parts.length < 6) continue;

      const [sha, parentsStr, authorName, authorEmail, timestampStr, ...messageParts] = parts;
      const message = messageParts.join('|');
      const parents = parentsStr ? parentsStr.split(' ') : [];
      const timestamp = parseInt(timestampStr, 10);

      commits.push({
        sha,
        parents,
        author: { name: authorName, email: authorEmail },
        timestamp,
        message,
        branches: [],
      });
    }

    return commits;
  }
}

/**
 * Convenience wrapper for synchronous parsing.
 */
export function parseGitLog(depth?: number, since?: string): CommitNode[] {
  const parser = new CommitParser();
  return parser.parseSync(depth, since);
}
