import { execSync } from 'child_process';

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

export function parseGitLog(depth?: number, since?: string): CommitNode[] {
  const args = ['log', '--all', '--format=%H|%P|%an|%ae|%at|%s'];
  if (depth !== undefined) {
    args.push(`--max-count=${depth}`);
  }
  if (since) {
    args.push(`--since=${since}`);
  }

  const output = execSync('git ' + args.join(' '), { encoding: 'utf-8' });
  const lines = output.trim().split('\n').filter(l => l.length > 0);

  const commits: CommitNode[] = [];
  for (const line of lines) {
    const parts = line.split('|');
    if (parts.length < 6) continue;

    const [sha, parentsRaw, name, email, ts, ...msgParts] = parts;
    const parents = parentsRaw ? parentsRaw.split(' ') : [];
    const timestamp = parseInt(ts, 10);
    const message = msgParts.join('|');

    commits.push({
      sha,
      parents,
      author: { name, email },
      timestamp,
      message,
      branches: []
    });
  }

  return commits;
}

export function enrichBranches(commits: CommitNode[]): void {
  const branchOutput = execSync('git branch --all --format="%(refname:short) %(objectname)"', { encoding: 'utf-8' });
  const branchLines = branchOutput.trim().split('\n').filter(l => l.length > 0);
  const shaToBranches = new Map<string, string[]>();
  for (const line of branchLines) {
    const spaceIdx = line.indexOf(' ');
    if (spaceIdx === -1) continue;
    const branchName = line.substring(0, spaceIdx);
    const sha = line.substring(spaceIdx + 1).trim();
    if (!shaToBranches.has(sha)) {
      shaToBranches.set(sha, []);
    }
    shaToBranches.get(sha)!.push(branchName);
  }
  for (const commit of commits) {
    const branchNames = shaToBranches.get(commit.sha);
    if (branchNames) {
      commit.branches = branchNames;
    }
  }
}