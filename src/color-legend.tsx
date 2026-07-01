import React from 'react';
import { Box, Text } from 'ink';

interface ColorLegendProps {
  mode: 'branch' | 'author';
  colors: Map<string, string>;
  onToggle: () => void;
}

const MAX_VISIBLE_ITEMS = 20;

const ColorLegend: React.FC<ColorLegendProps> = ({ mode, colors, onToggle }) => {
  const entries = Array.from(colors.entries());
  const visible = entries.slice(0, MAX_VISIBLE_ITEMS);
  const overflow = entries.length - MAX_VISIBLE_ITEMS;

  return (
    <Box flexDirection="column" borderStyle="round" paddingX={1} paddingY={1}>
      <Text bold underline>
        Legend ({mode})
      </Text>
      <Box marginTop={1} flexDirection="column">
        {visible.map(([key, color]) => (
          <Box key={key}>
            <Text color={color}>■ </Text>
            <Text>{key.length > 20 ? key.substring(0, 18) + '..' : key}</Text>
          </Box>
        ))}
        {overflow > 0 && (
          <Text dimColor>... and {overflow} more</Text>
        )}
      </Box>
      <Box marginTop={1}>
        <Text color="cyan" dimColor>
          [l] toggle legend
        </Text>
      </Box>
    </Box>
  );
};

export default ColorLegend;
