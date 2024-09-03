import React from 'react';
import { Field } from 'formik';

interface URLFieldProps {
  name: string;
  label: string;
  className?: string;
}

const URLField: React.FC<URLFieldProps> = ({ name, label, className }) => {
  return (
    <Field
      type="url"
      id={name}
      name={name}
      placeholder={label}
      className={className}
    />
  );
};

export default URLField;