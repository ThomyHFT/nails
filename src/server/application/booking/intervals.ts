export interface MinuteInterval {
  start: number;
  end: number;
}

export function mergeIntervals(intervals: MinuteInterval[]): MinuteInterval[] {
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: MinuteInterval[] = [];

  for (const interval of sorted) {
    const last = merged[merged.length - 1];
    if (last && interval.start <= last.end) {
      last.end = Math.max(last.end, interval.end);
    } else {
      merged.push({ ...interval });
    }
  }

  return merged;
}

export function subtractIntervals(base: MinuteInterval[], busy: MinuteInterval[]): MinuteInterval[] {
  let remaining = mergeIntervals(base);

  for (const block of mergeIntervals(busy)) {
    const next: MinuteInterval[] = [];
    for (const interval of remaining) {
      if (block.end <= interval.start || block.start >= interval.end) {
        next.push(interval);
        continue;
      }
      if (block.start > interval.start) {
        next.push({ start: interval.start, end: Math.min(block.start, interval.end) });
      }
      if (block.end < interval.end) {
        next.push({ start: Math.max(block.end, interval.start), end: interval.end });
      }
    }
    remaining = next.filter((interval) => interval.end > interval.start);
  }

  return remaining;
}
