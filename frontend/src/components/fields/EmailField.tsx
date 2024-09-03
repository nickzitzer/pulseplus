import React from 'react';
import { Field } from 'formik';

interface EmailFieldProps {
  name: string;
  label: string;
  className?: string;
}

const EmailField: React.FC<EmailFieldProps> = ({ name, label, className }) => {
  return (
    <Field
      type="email"
      id={name}
      name={name}
      placeholder={label}
      className={className}
    />
  );
};

export default EmailField;