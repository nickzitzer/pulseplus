import React from 'react';
import { Field } from 'formik';

interface TextAreaFieldProps {
  name: string;
  label: string;
  className?: string;
}

const TextAreaField: React.FC<TextAreaFieldProps> = ({ name, label, className }) => {
  return (
    <Field
      as="textarea"
      id={name}
      name={name}
      placeholder={label}
      className={className}
    />
  );
};

export default TextAreaField;