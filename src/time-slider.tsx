import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text } from 'ink';
import { CommitNode } from './parser.js';

interface TimeSliderProps {
  commits: CommitNode[];
  onRangeChange: (minTimestamp: number, maxTimestamp: number) => void;
}

const TimeSlider: React.FC<TimeSliderProps> = ({ commits, onRangeChange }) => {
  const timestamps = useMemo(() => commits.map(c => c.timestamp).sort((a, b) => a - b), [commits]);
  const minTime = timestamps[0] ?? 0;
  const maxTime = timestamps[timestamps.length - 1] ?? 0;
  const [leftPercent, setLeftPercent] = useState(0);
  const [rightPercent, setRightPercent] = useState(100);

  useEffect(() => {
    const minSel = minTime + (maxTime - minTime) * (leftPercent / 100);
    const maxSel = minTime + (maxTime - minTime) * (rightPercent / 100);
    onRangeChange(Math.round(minSel), Math.round(maxSel));
  }, [leftPercent, rightPercent, minTime, maxTime, onRangeChange]);

  const handleKey = useCallback((_input: string, key: { leftArrow?: boolean; rightArrow?: boolean; upArrow?: boolean; downArrow?: boolean }) => {
    if (key.leftArrow) {
      setLeftPercent(prev => Math.max(0, prev - 5));
    } else if (key.rightArrow) {
      setLeftPercent(prev => Math.min(rightPercent - 5, prev + 5));
    } else if (key.upArrow) {
      setRightPercent(prev => Math.min(100, prev + 5));
    } else if (key.downArrow) {
      setRightPercent(prev => Math.max(leftPercent + 5, prev - 5));
    }
  }, [rightPercent]);

  useInput(handleKey);

  const barWidth = 40;
  const leftPos = Math.round((leftPercent / 100) * barWidth);
  const rightPos = Math.round((rightPercent / 100) * barWidth);

  const bar = Array.from({ length: barWidth }, (_, i) => {
    if (i === leftPos) return '[';
    if (i === rightPos) return ']';
    if (i > leftPos && i < rightPos) return '=';
    return '-';
  }).join('');

  const formatDate = (ts: number) => {
    const d = new Date(ts * 1000);
    return d.toISOString().split('T')[0];
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Text>Time Slider (use ← → to move left edge, ↑ ↓ for right edge):</Text>
      <Box>
        <Text>{formatDate(minTime + (maxTime - minTime) * (leftPercent / 100))}</Text>
        <Text> </Text>
        <Text>{bar}</Text>
        <Text> </Text>
        <Text>{formatDate(minTime + (maxTime - minTime) * (rightPercent / 100))}</Text>
      </Box>
    </Box>
  );
};

export default TimeSlider;

function useMemo<T>(factory: () => T, deps: any[]): T {
  return React.useMemo(factory, deps);
}

function useInput(inputHandler: (input: string, key: any) => void) {
  React.useEffect(() => {
    const handler = (data: Buffer) => {
      const str = data.toString();
      if (str === '\x1b[D') inputHandler('', { leftArrow: true });
      else if (str === '\x1b[C') inputHandler('', { rightArrow: true });
      else if (str === '\x1b[A') inputHandler('', { upArrow: true });
      else if (str === '\x1b[B') inputHandler('', { downArrow: true });
    };
    process.stdin.on('data', handler);
    return () => process.stdin.off('data', handler);
  }, [inputHandler]);
}