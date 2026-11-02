import React from 'react';

export interface HeadingProps {
  /** Main heading text or node */
  title: React.ReactNode;
  /** Optional subtitle / description text */
  subtitle?: React.ReactNode;
  /** Optional leading icon */
  icon?: React.ReactNode;
  /** Optional right-aligned action buttons or controls */
  actions?: React.ReactNode;
  /** Semantic heading level (h1 - h4). Defaults to 2. */
  level?: 1 | 2 | 3 | 4;
  /** Visual size preset. Defaults to 'md'. */
  size?: 'sm' | 'md' | 'lg';
  /** Hide subtitle on mobile screens to keep mobile UI simpler */
  hideSubtitleOnMobile?: boolean;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  id?: string;
}

/**
 * Reusable Heading component for screen headers, section headers, and card titles.
 */
export const Heading: React.FC<HeadingProps> = ({
  title,
  subtitle,
  icon,
  actions,
  level = 2,
  size = 'md',
  hideSubtitleOnMobile = true,
  className = '',
  titleClassName = '',
  subtitleClassName = '',
  id,
}) => {
  const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4';

  return (
    <div
      className={`ui-heading ui-heading--${size} ${className}`.trim()}
    >
      <div className="ui-heading-main">
        <Tag
          id={id}
          className={`ui-heading-title ${titleClassName}`.trim()}
        >
          {icon && <span className="ui-heading-icon">{icon}</span>}
          <span className="ui-heading-text">{title}</span>
        </Tag>
        {subtitle && (
          <p
            className={`ui-heading-subtitle section-subtitle ${
              hideSubtitleOnMobile ? 'ui-heading-subtitle--desktop-only' : ''
            } ${subtitleClassName}`.trim()}
          >
            {subtitle}
          </p>
        )}
      </div>

      {actions && <div className="ui-heading-actions">{actions}</div>}
    </div>
  );
};

