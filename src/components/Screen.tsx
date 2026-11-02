import React, { useState, useEffect, useCallback } from 'react';

export type ScreenRoute = 'timers' | 'create' | 'workout' | 'stats' | 'palette';

const VALID_SCREENS: ScreenRoute[] = [
  'timers',
  'create',
  'workout',
  'stats',
  'palette',
];

export function parseScreenFromHash(
  hash: string,
  fallback: ScreenRoute = 'timers'
): ScreenRoute {
  const cleaned = hash.replace(/^#\/?/, '').trim().toLowerCase();
  if (VALID_SCREENS.includes(cleaned as ScreenRoute)) {
    return cleaned as ScreenRoute;
  }
  return fallback;
}

export function useScreenRouter(initialFallback: ScreenRoute = 'timers') {
  const [activeScreen, setActiveScreenState] = useState<ScreenRoute>(() => {
    if (typeof window === 'undefined') return initialFallback;
    return parseScreenFromHash(window.location.hash, initialFallback);
  });

  const navigateToScreen = useCallback((nextScreen: ScreenRoute) => {
    setActiveScreenState(nextScreen);
    if (typeof window !== 'undefined') {
      const targetHash = `#/${nextScreen}`;
      if (window.location.hash !== targetHash) {
        window.history.pushState(null, '', targetHash);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Ensure initial URL hash reflects current screen route
    if (!window.location.hash) {
      window.history.replaceState(null, '', `#/${activeScreen}`);
    }

    const handleRouteChange = () => {
      const parsed = parseScreenFromHash(window.location.hash, initialFallback);
      setActiveScreenState(parsed);
    };

    window.addEventListener('hashchange', handleRouteChange);
    window.addEventListener('popstate', handleRouteChange);
    return () => {
      window.removeEventListener('hashchange', handleRouteChange);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, [activeScreen, initialFallback]);

  return {
    activeScreen,
    navigateToScreen,
  };
}

export interface ScreenProps {
  id: ScreenRoute;
  activeScreen: ScreenRoute;
  ariaLabel: string;
  lockViewport?: boolean;
  children: React.ReactNode;
}

export const Screen: React.FC<ScreenProps> = ({
  id,
  activeScreen,
  ariaLabel,
  lockViewport = false,
  children,
}) => {
  const isActive = id === activeScreen;

  useEffect(() => {
    if (!isActive || !lockViewport) return;

    document.documentElement.classList.add('workout-screen-locked');
    document.body.classList.add('workout-screen-locked');

    return () => {
      document.documentElement.classList.remove('workout-screen-locked');
      document.body.classList.remove('workout-screen-locked');
    };
  }, [isActive, lockViewport]);

  if (!isActive) {
    return null;
  }

  return (
    <div
      className={`screen-view screen-${id} ${
        lockViewport ? 'screen-locked' : 'screen-scrollable'
      }`}
      data-screen={id}
      role="region"
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
};

