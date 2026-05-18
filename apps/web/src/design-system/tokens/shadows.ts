/**
 * Elevation tokens — soft ambient shadows (not harsh Material drop shadows).
 */

export const nelvyonShadows = {
  /** Cards resting on canvas */
  card: "0 1px 2px 0 rgb(15 23 42 / 0.05)",
  /** Modals, sticky bars, primary CTAs */
  elevated: "0 4px 6px -1px rgb(15 23 42 / 0.08), 0 2px 4px -2px rgb(15 23 42 / 0.06)",
  /** Dark mode overrides applied in globals `.dark` */
  cardDark: "0 1px 2px 0 rgb(0 0 0 / 0.35)",
  elevatedDark: "0 10px 15px -3px rgb(0 0 0 / 0.45), 0 4px 6px -4px rgb(0 0 0 / 0.35)",
} as const;
