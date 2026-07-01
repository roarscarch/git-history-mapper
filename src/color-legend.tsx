import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface ColorLegendProps {
  colorMode: 'branch' | 'author';
  onToggle: () => void;
  branchColors: Map<string, string>;
  authorColors: Map<string, string>;
}

const ColorLegend: React.FC<ColorLegendProps> = ({ colorMode, onToggle, branchColors, authorColors }) => {
  const [collapsed, setCollapsed] = useState(false);

  useInput((input, key) => {
    if (key.tab) {
      onToggle();
    }
    if (input === 'l' || input === 'L') {
      setCollapsed(prev => !prev);
    }
  });

  if (collapsed) {
    return (
      <Box borderStyle="round" borderColor="gray" paddingX={1}>
        <Text color="gray">Press L to expand legend</Text>
      </Box>
    );
  }

  const entries = colorMode === 'branch'
    ? Array.from(branchColors.entries())
    : Array.from(authorColors.entries());

  // Limit to top 10 entries to avoid clutter
  const displayEntries = entries.slice(0, 10);
  const overflowCount = entries.length - 10;

  return (
    <Box borderStyle="round" borderColor="white" flexDirection="column" paddingX={1} paddingY={1}>
      <Box>
        <Text bold>Legend: </Text>
        <Text color="yellow">{colorMode === 'branch' ? 'by branch' : 'by author'}</Text>
        <Text> </Text>
        <Text color="gray">(Tab to toggle, L to collapse)</Text>
      </Box>
      {displayEntries.map(([key, color]) => (
        <Box key={key}>
          <Text color={color}>■</Text>
          <Text> </Text>
          <Text>{key.length > 20 ? key.substring(0, 20) + '...' : key}</Text>
        </Box>
      ))}
      {overflowCount > 0 && (
        <Text color="gray">... and {overflowCount} more</Text>
      )}
    </Box>
  );
};

export default ColorLegend;