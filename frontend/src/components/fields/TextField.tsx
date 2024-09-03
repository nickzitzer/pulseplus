import React from 'react';
import { Field } from 'formik';

interface TextFieldProps {
  name: string;
  label: string;
  className?: string;
}

const TextField: React.FC<TextFieldProps> = ({ name, label, className }) => {
  return (
    <Field
      type="text"
      id={name}
      name={name}
      placeholder={label}
      className={className}
    />
  );
};

export default TextField;