import React from 'react';

export function CodeBlock({ children, language, title }) {
  return (
    <div className="code-block">
      {title && <div className="code-block-title">{title}</div>}
      <pre className={`language-${language || 'text'}`}>
        <code className={`language-${language || 'text'}`}>
          {children}
        </code>
      </pre>
    </div>
  );
} 