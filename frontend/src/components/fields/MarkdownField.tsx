import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the markdown editor to avoid CSS import issues
const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default),
  { ssr: false }
);

interface MarkdownFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: number;
  preview?: 'live' | 'edit' | 'preview';
  className?: string;
}

const MarkdownField: React.FC<MarkdownFieldProps> = ({
  value,
  onChange,
  placeholder = 'Write markdown content here...',
  height = 300,
  preview = 'live',
  className = '',
}) => {
  const [content, setContent] = useState(value);

  const handleChange = useCallback(
    (val?: string) => {
      const newValue = val || '';
      setContent(newValue);
      onChange(newValue);
    },
    [onChange]
  );

  return (
    <div className={`markdown-editor-wrapper ${className}`} data-color-mode="light">
      {/* @ts-ignore - The type definitions for MDEditor are not perfect */}
      <MDEditor
        value={content}
        onChange={handleChange}
        height={height}
        preview={preview}
        textareaProps={{
          placeholder,
        }}
      />
    </div>
  );
};

export default MarkdownField;
