import React from 'react';
import { Field } from 'formik';

interface NumberFieldProps {
  name: string;
  label: string;
  className?: string;
}

const NumberField: React.FC<NumberFieldProps> = ({ name, label, className }) => {
  return (
    <Field
      type="number"
      id={name}
      name={name}
      placeholder={label}
      className={className}
    />
  );
};

export default NumberField;