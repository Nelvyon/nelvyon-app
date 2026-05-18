# BLOCK 3 — Target ~90/100 Real

## Execution 1: Global Search & Command Palette (Cmd+K)
- **File**: `src/components/GlobalCommandPalette.tsx` — Cross-module search (contacts, deals, tickets, contracts, posts, workflows)
- **Integration**: Add to `SaasLayout.tsx` — Cmd+K trigger, search bar in header

## Execution 2: Helpdesk SLA & Notifications + Workflow Enhancement
- **File**: `src/pages/saas/SaasHelpdesk.tsx` — Add SLA timers, breach alerts, auto-escalation indicators
- **File**: `src/pages/saas/SaasWorkflows.tsx` — Add visual flow builder preview, execution logs detail

## Execution 3: Asset Versioning & QA Comparison
- **File**: `src/components/AssetVersionHistory.tsx` — Version list, diff view, rollback button
- **Integration**: Used in Assets page and QA panel

## Execution 4: Mobile/Tablet UX Overhaul
- **File**: `src/components/MobileBottomNav.tsx` — Bottom navigation for mobile
- **Update**: `SaasLayout.tsx` — Collapsible sidebar, swipe gestures, touch targets

## Execution 5: Performance & Reliability
- **Update**: `App.tsx` — React.lazy for all route pages
- **Update**: Key pages — Virtual scrolling for long lists, optimistic updates

## Files to create/modify (max 8):
1. CREATE `src/components/GlobalCommandPalette.tsx`
2. CREATE `src/components/MobileBottomNav.tsx`
3. CREATE `src/components/AssetVersionHistory.tsx`
4. MODIFY `src/components/SaasLayout.tsx` — Add command palette, mobile nav, responsive sidebar
5. MODIFY `src/pages/saas/SaasHelpdesk.tsx` — SLA timers, breach alerts
6. MODIFY `src/pages/saas/SaasWorkflows.tsx` — Enhanced execution view
7. MODIFY `src/App.tsx` — React.lazy imports for all pages
8. MODIFY `src/lib/api.ts` — Add search API types