import { useMemo } from 'react';
import { useTheme } from '../context/theme.js';

const TOKENS = ['accent', 'accent-2', 'success', 'warning', 'danger', 'muted', 'border', 'text', 'surface', 'grid'];
const SERIES = ['series-1', 'series-2', 'series-3', 'series-4'];

/**
 * Recharts needs concrete colors in SVG attributes, so this reads the current
 * theme's CSS variables and recomputes when the theme changes.
 * `series` is the fixed-order categorical palette: assign by entity, never cycle.
 */
export function useChartColors() {
  const { theme } = useTheme();
  return useMemo(() => {
    const styles = getComputedStyle(document.documentElement);
    const read = (token) => styles.getPropertyValue(`--${token}`).trim();
    return {
      ...Object.fromEntries(TOKENS.map((token) => [token, read(token)])),
      series: SERIES.map(read),
      theme,
    };
  }, [theme]);
}
