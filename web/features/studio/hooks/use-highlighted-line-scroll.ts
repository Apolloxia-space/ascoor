import { useEffect } from 'react';
import type { MutableRefObject } from 'react';

export function useHighlightedLineScroll(
  highlightedLine: number | null,
  lineRefs: MutableRefObject<Record<number, HTMLDivElement | null>>,
) {
  useEffect(() => {
    if (!highlightedLine) return;
    const target = lineRefs.current[highlightedLine];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedLine, lineRefs]);
}
