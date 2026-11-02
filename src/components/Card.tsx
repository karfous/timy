import React, { useEffect, useState } from 'react';

export type CardState = 'desktop' | 'mobile';
export type CardVariant = 'surface' | 'item' | 'stat' | 'control';

export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  /** HTML tag to render. Defaults to 'div' (or 'article' for item cards). */
  as?: 'div' | 'section' | 'article' | 'li' | 'label';
  /** Visual role of the card on desktop. On mobile all variants become flat full-width elements. */
  variant?: CardVariant;
  /** Force 'desktop' or 'mobile' state, or 'auto' to respond to viewport width (<= 768px). */
  state?: 'auto' | CardState;
  /** Highlights the card as selected/active. */
  selected?: boolean;
  /** Makes the card hoverable/clickable. */
  interactive?: boolean;
  children?: React.ReactNode;
}

const MOBILE_MEDIA_QUERY = '(max-width: 768px)';

export function useIsMobileViewport(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mql = window.matchMedia(MOBILE_MEDIA_QUERY);
    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };
    setIsMobile(mql.matches);
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handleChange);
      return () => mql.removeEventListener('change', handleChange);
    }
  }, []);

  return isMobile;
}

/**
 * Responsive two-state Card component:
 * - Desktop state (`desktop`): Renders as an elevated/bordered card with rounded corners and padding.
 * - Mobile state (`mobile`): Renders without any card chrome — flat, 100% full screen width, no outer margins or card radius.
 */
export const Card: React.FC<CardProps> = ({
  as: Component = 'div',
  variant = 'item',
  state = 'auto',
  selected = false,
  interactive = false,
  className = '',
  children,
  ...rest
}) => {
  const isMobileViewport = useIsMobileViewport();
  const resolvedState: CardState =
    state === 'auto' ? (isMobileViewport ? 'mobile' : 'desktop') : state;

  const classes = [
    'ui-card',
    `ui-card--${variant}`,
    `ui-card--${resolvedState}`,
    selected ? 'ui-card--selected selected' : '',
    interactive ? 'ui-card--interactive' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Component
      className={classes}
      data-card-state={resolvedState}
      data-card-variant={variant}
      {...rest}
    >
      {children}
    </Component>
  );
};

