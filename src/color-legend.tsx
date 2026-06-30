import React from 'react';
import { Box, Text } from 'ink';

export interface ColorLegendProps {
  branchColors: Map<string, string>;
  authorColors: Map<string, string>;
  mode: 'branch' | 'author';
}

const ColorLegend: React.FC<ColorLegendProps> = ({ branchColors, authorColors, mode }) => {
  const colors = mode === 'branch' ? branchColors : authorColors;
  const entries = Array.from(colors.entries());

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="gray">
      <Text bold underline>
        {mode === 'branch' ? 'Branch Colors' : 'Author Colors'}
      </Text>
      {entries.slice(0, 20).map(([key, color]) => (
        <Box key={key} flexDirection="row" alignItems="center" marginY={0}>
          <Box width={2} height={1} backgroundColor={color as any} marginRight={1} />
          <Text>{key}</Text>
        </Box>
      ))}
      {entries.length > 20 && <Text dimColor>...and {entries.length - 20} more</Text>}
    </Box>
  );
};

export default ColorLegend;
