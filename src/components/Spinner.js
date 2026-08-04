import React from 'react';

/**
 * Animated loading spinner with optional label.
 * CSS is defined in index.css under .spinner-wrapper / .spinner / .spinner-text
 */
export default function Spinner({ text = 'Loading...' }) {
  return (
    <div className="spinner-wrapper" role="status" aria-label={text}>
      <div className="spinner" />
      {text && <p className="spinner-text">{text}</p>}
    </div>
  );
}
