import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';

export interface TimeSliderProps {
  minTimestamp: number;
  maxTimestamp: number;
  currentMin: number;
  currentMax: number;
  onChange: (min: number, max: number) => void;
}

const TimeSlider: React.FC<TimeSliderProps> = ({
  minTimestamp,
  maxTimestamp,
  currentMin,
  currentMax,
  onChange,
}) => {
  const [active, setActive] = useState<'min' | 'max' | null>(null);
  const [valueMin, setValueMin] = useState(currentMin);
  const [valueMax, setValueMax] = useState(currentMax);

  useEffect(() => {
    setValueMin(currentMin);
    setValueMax(currentMax);
  }, [currentMin, currentMax]);

  const range = maxTimestamp - minTimestamp || 1;
  const minPercent = ((valueMin - minTimestamp) / range) * 100;
  const maxPercent = ((valueMax - minTimestamp) / range) * 100;

  const handleKey = useCallback(
    (input: string, key: { leftArrow?: boolean; rightArrow?: boolean; upArrow?: boolean; downArrow?: boolean; escape?: boolean; tab?: boolean }) => {
      if (key.escape) {
        setActive(null);
        return;
      }
      if (key.tab) {
        if (active === 'min') setActive('max');
        else if (active === 'max') setActive('min');
        else setActive('min');
        return;
      }
      if (active === 'min') {
        if (key.leftArrow || key.downArrow) {
          const step = range / 100;
          const newVal = Math.max(minTimestamp, valueMin - step);
          setValueMin(newVal);
          onChange(newVal, valueMax);
        } else if (key.rightArrow || key.upArrow) {
          const step = range / 100;
          const newVal = Math.min(valueMax, valueMin + step);
          setValueMin(newVal);
          onChange(newVal, valueMax);
        }
      } else if (active === 'max') {
        if (key.leftArrow || key.downArrow) {
          const step = range / 100;
          const newVal = Math.max(valueMin, valueMax - step);
          setValueMax(newVal);
          onChange(valueMin, newVal);
        } else if (key.rightArrow || key.upArrow) {
          const step = range / 100;
          const newVal = Math.min(maxTimestamp, valueMax + step);
          setValueMax(newVal);
          onChange(valueMin, newVal);
        }
      }
    },
    [active, minTimestamp, maxTimestamp, valueMin, valueMax, range, onChange]
  );

  useInput(handleKey);

  const formatDate = (ts: number): string => {
    const d = new Date(ts * 1000);
    return d.toISOString().split('T')[0];
  };

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="gray">
      <Text bold>Time Slider</Text>
      <Box marginTop={1}>
        <Text wrap="end">
          Bar: {formatDate(valueMin)} — {formatDate(valueMax)}
        </Text>
      </Box>
      <Box marginTop={1} flexDirection="row" alignItems="center">
        <Text>{'['}</Text>
        <Box width={40}>
          <Text wrap="end">
            {minPercent > 0 ? ' '.repeat(Math.floor(minPercent * 0.4)) : ''}
            {active === 'min' ? '◀' : '●'}
            {maxPercent > minPercent
              ? '─'.repeat(Math.floor((maxPercent - minPercent) * 0.4))
              : ''}
            {active === 'max' ? '▶' : '●'}
            {maxPercent < 100 ? ' '.repeat(Math.floor((100 - maxPercent) * 0.4)) : ''}
          </Text>
        </Box>
        <Text>{']'}</Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>
          Tab: switch handle | ←/→: adjust | Esc: done
        </Text>
      </Box>
    </Box>
  );
};

export default TimeSlider;
