import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';

interface TimeSliderProps {
  minTimestamp: number;
  maxTimestamp: number;
  currentRange: [number, number];
  onRangeChange: (range: [number, number]) => void;
}

function formatDate(ts: number): string {
  const d = new Date(ts * 1000);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
}

const TimeSlider: React.FC<TimeSliderProps> = ({
  minTimestamp,
  maxTimestamp,
  currentRange,
  onRangeChange,
}) => {
  const [activeHandle, setActiveHandle] = useState<'left' | 'right' | null>(null);
  const range = maxTimestamp - minTimestamp;
  const leftPct = range === 0 ? 0 : ((currentRange[0] - minTimestamp) / range) * 100;
  const rightPct = range === 0 ? 100 : ((currentRange[1] - minTimestamp) / range) * 100;

  useInput((input, key) => {
    if (!activeHandle) {
      if (input === 't') setActiveHandle('left');
      else if (input === 'y') setActiveHandle('right');
      return;
    }

    const step = range * 0.01;
    let newRange: [number, number] = [...currentRange];

    if (activeHandle === 'left') {
      if (key.leftArrow) newRange[0] = Math.max(minTimestamp, currentRange[0] - step);
      else if (key.rightArrow) newRange[0] = Math.min(currentRange[1], currentRange[0] + step);
      else if (input === 't') setActiveHandle(null);
    } else if (activeHandle === 'right') {
      if (key.leftArrow) newRange[1] = Math.max(currentRange[0], currentRange[1] - step);
      else if (key.rightArrow) newRange[1] = Math.min(maxTimestamp, currentRange[1] + step);
      else if (input === 'y') setActiveHandle(null);
    }

    if (newRange[0] !== currentRange[0] || newRange[1] !== currentRange[1]) {
      onRangeChange(newRange);
    }
  });

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1} borderStyle="round" borderColor="cyan">
      <Box>
        <Text bold>Time Range: </Text>
        <Text color="green">{formatDate(currentRange[0])}</Text>
        <Text> — </Text>
        <Text color="green">{formatDate(currentRange[1])}</Text>
      </Box>
      <Box marginTop={1}>
        <Box width={2}><Text> </Text></Box>
        <Box width={40}>
          <Box position="relative">
            <Text>
              {''.padStart(Math.round(leftPct * 0.4), '─')}
              <Text color="yellow" bold>◀</Text>
              {''.padStart(Math.max(0, Math.round((rightPct - leftPct) * 0.4) - 1), '─')}
              <Text color="yellow" bold>▶</Text>
              {''.padStart(Math.max(0, 40 - Math.round(rightPct * 0.4) - 2), '─')}
            </Text>
          </Box>
        </Box>
        <Box width={2}><Text> </Text></Box>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>
          Press <Text color="cyan">t</Text> to adjust left handle,{' '}
          <Text color="cyan">y</Text> for right handle,{' '}
          <Text color="cyan">←</Text>/<Text color="cyan">→</Text> to move,{' '}
          <Text color="cyan">t</Text>/<Text color="cyan">y</Text> again to release
        </Text>
      </Box>
    </Box>
  );
};

export default TimeSlider;
