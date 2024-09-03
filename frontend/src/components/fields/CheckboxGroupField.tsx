import React from 'react';
import { Field } from 'formik';

interface CheckboxGroupFieldProps {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  className?: string;
}

const CheckboxGroupField: React.FC<CheckboxGroupFieldProps> = ({ name, label, options, className }) => {
  return (
    <div className={className}>
      <label>{label}</label>
      {options.map((option) => (
        <label key={option.value} className="block">
          <Field type="checkbox" name={name} value={option.value} />
          {option.label}
        </label>
      ))}
    </div>
  );
};

export default CheckboxGroupField;