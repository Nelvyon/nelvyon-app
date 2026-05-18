/**
 * 4px base rhythm — consistent padding/gap across NELVYON surfaces.
 */

export const nelvyonSpaceUnitPx = 4;

export const nelvyonSpacing = {
  0: 0,
  0.5: 2,
  1: nelvyonSpaceUnitPx,
  2: nelvyonSpaceUnitPx * 2,
  3: nelvyonSpaceUnitPx * 3,
  4: nelvyonSpaceUnitPx * 4,
  5: nelvyonSpaceUnitPx * 5,
  6: nelvyonSpaceUnitPx * 6,
  8: nelvyonSpaceUnitPx * 8,
  10: nelvyonSpaceUnitPx * 10,
  12: nelvyonSpaceUnitPx * 12,
  16: nelvyonSpaceUnitPx * 16,
} as const;

export type NelvyonSpacingKey = keyof typeof nelvyonSpacing;
