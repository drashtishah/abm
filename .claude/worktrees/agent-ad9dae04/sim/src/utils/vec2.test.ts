import { describe, it, expect } from 'vitest';
import { add, sub, scale, dot, magnitude, normalize, distance, limit } from './vec2.js';

describe('vec2', () => {
  it('add combines two vectors', () => {
    expect(add({ x: 1, y: 2 }, { x: 3, y: 4 })).toEqual({ x: 4, y: 6 });
  });

  it('sub subtracts two vectors', () => {
    expect(sub({ x: 5, y: 7 }, { x: 2, y: 3 })).toEqual({ x: 3, y: 4 });
  });

  it('scale multiplies vector by scalar', () => {
    expect(scale({ x: 2, y: 3 }, 3)).toEqual({ x: 6, y: 9 });
  });

  it('dot computes dot product', () => {
    expect(dot({ x: 1, y: 0 }, { x: 0, y: 1 })).toBe(0);
    expect(dot({ x: 2, y: 3 }, { x: 4, y: 5 })).toBe(23);
  });

  it('magnitude computes vector length', () => {
    expect(magnitude({ x: 3, y: 4 })).toBe(5);
    expect(magnitude({ x: 0, y: 0 })).toBe(0);
  });

  it('normalize returns unit vector', () => {
    const n = normalize({ x: 3, y: 4 });
    expect(n.x).toBeCloseTo(0.6);
    expect(n.y).toBeCloseTo(0.8);
    expect(magnitude(n)).toBeCloseTo(1);
  });

  it('normalize handles zero vector', () => {
    expect(normalize({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });

  it('distance computes distance between two points', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it('limit caps vector magnitude', () => {
    const v = limit({ x: 6, y: 8 }, 5);
    expect(magnitude(v)).toBeCloseTo(5);
    const v2 = limit({ x: 1, y: 1 }, 10);
    expect(v2).toEqual({ x: 1, y: 1 });
  });
});
