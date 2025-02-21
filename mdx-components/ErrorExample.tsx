import React from 'react';

interface ErrorExampleProps {
  code: string | number;
  description: string;
}

// TODO: Implement interactive error examples
export const ErrorExample: React.FC<ErrorExampleProps> = ({ code, description }) => (
  <div className="error-example">
    <h3>Error {code}</h3>
    <pre>{description}</pre>
  </div>
); 