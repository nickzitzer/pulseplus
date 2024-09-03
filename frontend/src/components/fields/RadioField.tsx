import React from 'react';
import { Field } from 'formik';

interface RadioFieldProps {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  className?: string;
}

const RadioField: React.FC<RadioFieldProps> = ({ name, label, options, className }) => {
  return (
    <div className={className}>
      <label>{label}</label>
      {options.map((option) => (
        <label key={option.value} className="block">
          <Field type="radio" name={name} value={option.value} />
          {option.label}
        </label>
      ))}
    </div>
  );
};

export default RadioField;