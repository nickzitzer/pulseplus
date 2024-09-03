import React from 'react';
import { Field } from 'formik';

interface BooleanFieldProps {
  name: string;
  label: string;
  className?: string;
}

const BooleanField: React.FC<BooleanFieldProps> = ({ name, label, className }) => {
  return (
    <div className={className}>
      <Field
        type="checkbox"
        id={name}
        name={name}
      />
      <label htmlFor={name} className="ml-2">{label}</label>
    </div>
  );
};

export default BooleanField;