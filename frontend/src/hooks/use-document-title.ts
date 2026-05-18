import { useEffect } from 'react';

/**
 * Sets the document title with NELVYON branding.
 * Automatically reverts on unmount.
 */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} — NELVYON` : 'NELVYON';
    return () => { document.title = prev; };
  }, [title]);
}