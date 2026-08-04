import React from 'react';

/**
 * Reusable empty-state card shown when a list has no items.
 *
 * Props:
 *  - icon        {string}   Emoji or icon string (default "📭")
 *  - title       {string}   Bold heading
 *  - subtitle    {string}   Softer description text
 *  - actionLabel {string}   Label for optional CTA button
 *  - onAction    {function} Called when the CTA button is clicked
 */
export default function EmptyState({ icon = '📭', title, subtitle, actionLabel, onAction }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      {title && <h3 className="empty-state-title">{title}</h3>}
      {subtitle && <p className="empty-state-subtitle">{subtitle}</p>}
      {actionLabel && onAction && (
        <button className="btn btn-primary" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
