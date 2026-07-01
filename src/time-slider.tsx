import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { CommitNode } from './parser.js';

interface TimeSliderProps {
  commits: CommitNode[];
  onRangeChange: (min: number, max: number) => void;
}

const TimeSlider: React.FC<TimeSliderProps> = ({ commits, onRangeChange }) => {
  const timestamps = commits.map(c => c.timestamp).sort((a, b) => a - b);
  const minTime = timestamps[0] || 0;
  const maxTime = timestamps[timestamps.length - 1] || 0;
  const range = maxTime - minTime;

  const [leftPercent, setLeftPercent] = useState(0);
  const [rightPercent, setRightPercent] = useState(100);
  const [focus, setFocus] = useState<'left' | 'right'>('left');

  const clamp = (val: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, val));

  const applyRange = useCallback((left: number, right: number) => {
    const l = clamp(left, 0, 100);
    const r = clamp(right, 0, 100);
    if (l >= r) return;
    const minVal = minTime + (range * l) / 100;
    const maxVal = minTime + (range * r) / 100;
    onRangeChange(minVal, maxVal);
  }, [minTime, maxTime, range, onRangeChange]);

  useInput((input, key) => {
    if (key.leftArrow) {
      if (focus === 'left') {
        const newLeft = clamp(leftPercent - 5, 0, rightPercent - 1);
        setLeftPercent(newLeft);
        applyRange(newLeft, rightPercent);
      } else {
        const newRight = clamp(rightPercent - 5, leftPercent + 1, 100);
        setRightPercent(newRight);
        applyRange(leftPercent, newRight);
      }
    } else if (key.rightArrow) {
      if (focus === 'left') {
        const newLeft = clamp(leftPercent + 5, 0, rightPercent - 1);
        setLeftPercent(newLeft);
        applyRange(newLeft, rightPercent);
      } else {
        const newRight = clamp(rightPercent + 5, leftPercent + 1, 100);
        setRightPercent(newRight);
        applyRange(leftPercent, newRight);
      }
    } else if (key.tab) {
      setFocus(f => f === 'left' ? 'right' : 'left');
    } else if (key.return || key.escape) {
      // confirm or reset could go here
    }
  });

  const leftLabel = new Date(minTime + (range * leftPercent) / 100 * 1000).toLocaleDateString();
  const rightLabel = new Date(minTime + (range * rightPercent) / 100 * 1000).toLocaleDateString();

  const barWidth = 40;
  const leftMark = Math.floor((leftPercent / 100) * barWidth);
  const rightMark = Math.ceil((rightPercent / 100) * barWidth);
  const filledWidth = rightMark - leftMark;

  return (
    <Box flexDirection="column" padding={1}>
      <Box>
        <Text>
          Time Range: {leftLabel} — {rightLabel}
        </Text>
      </Box>
      <Box>
        <Text>
          {'['}
          {Array.from({ length: barWidth }, (_, i) => {
            if (i === leftMark && focus === 'left') {
              return '<';
            }
            if (i === rightMark - 1 && focus === 'right') {
              return '>';
            }
            if (i >= leftMark && i < rightMark) {
              return '=';
            }
            return '-';
          }).join('')}
          {']'}
        </Text>
      </Box>
      <Box>
        <Text dimColor>
          Use ← → to adjust, Tab to switch handle, Enter to confirm
        </Text>
      </Box>
    </Box>
  );
};

export default TimeSlider;
