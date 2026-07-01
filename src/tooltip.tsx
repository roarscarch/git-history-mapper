import React from 'react';
import { Box, Text } from 'ink';

interface TooltipProps {
  x: number;
  y: number;
  label: string;
  author: string;
  timestamp: number;
  branches: string[];
  sha: string;
}

const Tooltip: React.FC<TooltipProps> = ({ x, y, label, author, timestamp, branches, sha }) => {
  const date = new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Box
      position="absolute"
      left={Math.min(x, process.stdout.columns - 40)}
      top={Math.min(y, process.stdout.rows - 8)}
      borderStyle="round"
      borderColor="cyan"
      paddingX={1}
      paddingY={1}
      backgroundColor="#1a1a2e"
    >
      <Box flexDirection="column">
        <Text bold color="white">{label}</Text>
        <Text color="gray">SHA: {sha}</Text>
        <Text color="green">Author: {author}</Text>
        <Text color="yellow">Date: {date}</Text>
        {branches.length > 0 && (
          <Text color="magenta">Branches: {branches.join(', ')}</Text>
        )}
      </Box>
    </Box>
  );
};

export default Tooltip;
