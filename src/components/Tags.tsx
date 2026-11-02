import React from 'react';
import { Tag as TagIcon, X, Plus } from 'lucide-react';

export interface TagChipProps {
  tag: string;
  active?: boolean;
  interactive?: boolean;
  editable?: boolean;
  showHash?: boolean;
  onClick?: (tag: string) => void;
  onRemove?: (tag: string) => void;
  className?: string;
  title?: string;
}

/**
 * Individual Tag Chip component.
 * Supports static display, interactive filter toggle, or editable chip with remove button.
 */
export const TagChip: React.FC<TagChipProps> = ({
  tag,
  active = false,
  interactive = false,
  editable = false,
  showHash = true,
  onClick,
  onRemove,
  className = '',
  title,
}) => {
  const label = showHash ? `#${tag}` : tag;

  if (editable) {
    return (
      <span className={`tag-chip editable ${className}`.trim()}>
        <span>{label}</span>
        {onRemove && (
          <button
            type="button"
            className="tag-chip-remove"
            onClick={() => onRemove(tag)}
            aria-label={`Remove tag ${tag}`}
          >
            <X size={12} />
          </button>
        )}
      </span>
    );
  }

  if (interactive || onClick) {
    return (
      <button
        type="button"
        className={`tag-chip interactive ${active ? 'active' : ''} ${className}`.trim()}
        onClick={() => onClick?.(tag)}
        title={title ?? `Filter by #${tag}`}
      >
        {label}
      </button>
    );
  }

  return (
    <span className={`tag-chip ${active ? 'active' : ''} ${className}`.trim()}>
      {label}
    </span>
  );
};

export interface TagListProps {
  tags?: string[];
  selectedTags?: string[];
  onToggleTag?: (tag: string) => void;
  className?: string;
}

/**
 * Renders a row of TagChip items for a timer.
 */
export const TagList: React.FC<TagListProps> = ({
  tags,
  selectedTags = [],
  onToggleTag,
  className = '',
}) => {
  if (!tags || tags.length === 0) return null;

  return (
    <div
      className={`preset-tags-row ui-tag-list ${className}`.trim()}
      onClick={(e) => e.stopPropagation()}
    >
      {tags.map((tag) => {
        const isActive = selectedTags.some(
          (t) => t.toLowerCase() === tag.toLowerCase()
        );
        return (
          <TagChip
            key={tag}
            tag={tag}
            interactive={Boolean(onToggleTag)}
            active={isActive}
            onClick={onToggleTag}
          />
        );
      })}
    </div>
  );
};

export interface TagFilterBarProps {
  allTags: string[];
  selectedTags: string[];
  totalCount: number;
  onToggleTag: (tag: string) => void;
  onClearTags: () => void;
  className?: string;
}

/**
 * Filter bar for selecting one or more tags across saved timers.
 */
export const TagFilterBar: React.FC<TagFilterBarProps> = ({
  allTags,
  selectedTags,
  totalCount,
  onToggleTag,
  onClearTags,
  className = '',
}) => {
  if (allTags.length === 0) return null;

  return (
    <div
      className={`tags-filter-bar ${className}`.trim()}
      aria-label="Filter timers by tag"
    >
      <button
        type="button"
        className={`tag-filter-pill ${
          selectedTags.length === 0 ? 'active' : ''
        }`}
        onClick={onClearTags}
      >
        All ({totalCount})
      </button>
      {allTags.map((tag) => {
        const isTagSelected = selectedTags.some(
          (t) => t.toLowerCase() === tag.toLowerCase()
        );
        return (
          <button
            key={tag}
            type="button"
            className={`tag-filter-pill ${isTagSelected ? 'active' : ''}`}
            onClick={() => onToggleTag(tag)}
          >
            <TagIcon size={11} strokeWidth={1.7} />
            <span>{tag}</span>
          </button>
        );
      })}
    </div>
  );
};

export interface TagsEditorProps {
  tags: string[];
  tagInput: string;
  availableTags?: string[];
  onTagInputChange: (value: string) => void;
  onTagInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onAddTagFromInput: () => void;
  onRemoveTag: (tag: string) => void;
  onToggleSuggestedTag: (tag: string) => void;
}

/**
 * Interactive tag editor field used inside TimerEditorModal.
 */
export const TagsEditor: React.FC<TagsEditorProps> = ({
  tags,
  tagInput,
  availableTags = [],
  onTagInputChange,
  onTagInputKeyDown,
  onAddTagFromInput,
  onRemoveTag,
  onToggleSuggestedTag,
}) => {
  const unusedSuggestions = availableTags.filter(
    (sug) => !tags.some((t) => t.toLowerCase() === sug.toLowerCase())
  );

  return (
    <div className="field-block">
      <span className="field-label">
        <TagIcon size={12} style={{ display: 'inline', marginRight: 4 }} />
        Tags
      </span>
      <div className="tags-editor-box">
        {tags.map((tag) => (
          <TagChip
            key={tag}
            tag={tag}
            editable
            onRemove={onRemoveTag}
          />
        ))}
        <input
          type="text"
          className="tag-inline-input"
          placeholder={
            tags.length === 0
              ? 'Add tags (press Enter or comma, e.g. hiit, cardio)...'
              : 'Add tag...'
          }
          value={tagInput}
          onChange={(e) => onTagInputChange(e.target.value)}
          onKeyDown={onTagInputKeyDown}
          aria-label="Add tag"
        />
        {tagInput.trim() && (
          <button
            type="button"
            className="btn-ghost small tag-add-btn"
            onClick={onAddTagFromInput}
          >
            <Plus size={13} />
            <span>Add</span>
          </button>
        )}
      </div>
      {unusedSuggestions.length > 0 && (
        <div className="tag-suggestions-row">
          <span className="field-subtext">Existing tags:</span>
          {unusedSuggestions.map((sug) => (
            <button
              key={sug}
              type="button"
              className="tag-suggestion-pill"
              onClick={() => onToggleSuggestedTag(sug)}
            >
              +{sug}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

