import { describe, expect, it } from 'vitest';
import { calculateFitTransform } from '../layout';

describe('golden: viewport fit transform', () => {
  it('centers a bounded tree inside the measured container', () => {
    expect(calculateFitTransform(
      { x: -60, y: -60, w: 420, h: 500 },
      { w: 800, h: 600 },
    )).toEqual({
      zoom: 0.9,
      panX: 265,
      panY: 129,
    });
  });
});
