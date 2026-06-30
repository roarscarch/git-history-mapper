import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text } from 'ink';
import { CommitNode } from './parser.js';

interface TimeSliderProps {
  commits: CommitNode[];
  onFilter: (filtered: CommitNode[]) => void;
}

function formatDate(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function TimeSlider({ commits, onFilter }: TimeSliderProps) {
  const timestamps = commits.map(c => c.timestamp).sort((a, b) => a - b);
  const minTs = timestamps[0] || 0;
  const maxTs = timestamps[timestamps.length - 1] || 0;
  const [low, setLow] = useState(minTs);
  const [high, setHigh] = useState(maxTs);
  const [dragging, setDragging] = useState<'low' | 'high' | null>(null);

  useEffect(() => {
    const filtered = commits.filter(c => c.timestamp >= low && c.timestamp <= high);
    onFilter(filtered);
  }, [low, high, commits, onFilter]);

  const handleKey = useCallback((_input: string, key: { leftArrow?: boolean; rightArrow?: boolean; shift?: boolean; upArrow?: boolean; downArrow?: boolean; escape?: boolean }) => {
    if (key.leftArrow && dragging === 'low' && low > minTs) {
      const step = key.shift ? 86400 * 7 : 86400;
      setLow(prev => Math.max(minTs, prev - step));
    } else if (key.rightArrow && dragging === 'low' && low < high) {
      const step = key.shift ? 86400 * 7 : 86400;
      setLow(prev => Math.min(high, prev + step));
    } else if (key.leftArrow && dragging === 'high' && high > low) {
      const step = key.shift ? 86400 * 7 : 86400;
      setHigh(prev => Math.max(low, prev - step));
    } else if (key.rightArrow && dragging === 'high' && high < maxTs) {
      const step = key.shift ? 86400 * 7 : 86400;
      setHigh(prev => Math.min(maxTs, prev + step));
    } else if (key.upArrow && dragging === null) {
      setDragging('low');
    } else if (key.downArrow && dragging === null) {
      setDragging('high');
    } else if (key.escape) {
      setDragging(null);
    }
  }, [dragging, low, high, minTs, maxTs]);

  useInput(handleKey);

  const range = maxTs - minTs || 1;
  const lowPercent = ((low - minTs) / range) * 100;
  const highPercent = ((high - minTs) / range) * 100;

  const barWidth = 60;
  const lowPos = Math.round((lowPercent / 100) * barWidth);
  const highPos = Math.round((highPercent / 100) * barWidth);

  const barChars: string[] = [];
  for (let i = 0; i < barWidth; i++) {
    if (i >= lowPos && i <= highPos) {
      barChars.push('█');
    } else {
      barChars.push('░');
    }
  }

  const draggingLabel = dragging === 'low' ? '←/→ adjust start' : dragging === 'high' ? '←/→ adjust end' : '↑ start ↓ end  esc:deselect';

  return (
    <Box flexDirection="column" padding={1}>
      <Box>
        <Text bold color="cyan">Time Range</Text>
      </Box>
      <Box marginY={1}>
        <Text>{formatDate(low)}</Text>
        <Text> </Text>
        <Text backgroundColor={dragging === 'low' ? 'blue' : 'gray'}>{barChars.join('')}</Text>
        <Text> </Text>
        <Text>{formatDate(high)}</Text>
      </Box>
      <Box>
        <Text dimColor>{draggingLabel}</Text>
        <Text> </Text>
        <Text dimColor>| {commits.filter(c => c.timestamp >= low && c.timestamp <= high).length} commits</Text>
      </Box>
    </Box>
  );
}
