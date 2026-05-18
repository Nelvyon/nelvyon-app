import { ReactNode, useRef, useEffect, useState, memo } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * Smooth page transition wrapper — fades in content on route change.
 * Uses requestAnimationFrame for smoother transitions.
 * Memoized to prevent unnecessary re-renders.
 */
function PageTransitionInner({ children }: PageTransitionProps) {
  const location = useLocation();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [visible, setVisible] = useState(true);
  const prevPath = useRef(location.pathname);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (location.pathname !== prevPath.current) {
      prevPath.current = location.pathname;
      setVisible(false);

      // Use rAF for smoother animation scheduling
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setDisplayChildren(children);
        // Double rAF ensures the DOM has painted the opacity:0 frame
        rafRef.current = requestAnimationFrame(() => {
          setVisible(true);
        });
      });
    } else {
      setDisplayChildren(children);
    }

    return () => cancelAnimationFrame(rafRef.current);
  }, [location.pathname, children]);

  return (
    <div
      className="transition-opacity duration-200 ease-out will-change-[opacity]"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {displayChildren}
    </div>
  );
}

const PageTransition = memo(PageTransitionInner);
export default PageTransition;