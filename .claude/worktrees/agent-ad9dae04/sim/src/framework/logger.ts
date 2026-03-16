export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface SimEvent {
  tick: number;
  level: LogLevel;
  category: 'birth' | 'death' | 'eat' | 'reproduce' | 'energy' | 'population';
  message: string;
  data?: Record<string, number>;
}

const events: SimEvent[] = [];

export function log(event: Omit<SimEvent, 'tick'>, tick: number): void {
  events.push({ ...event, tick });
}

export function getEvents(filter?: { category?: string; level?: string }): SimEvent[] {
  return events.filter(e =>
    (!filter?.category || e.category === filter.category) &&
    (!filter?.level || e.level === filter.level)
  );
}

export function clearEvents(): void {
  events.length = 0;
}

export function summary(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const e of events) {
    counts[e.category] = (counts[e.category] ?? 0) + 1;
  }
  return counts;
}
