import React from 'react';
import { Field } from 'formik';

interface SelectFieldProps {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  className?: string;
}

const SelectField: React.FC<SelectFieldProps> = ({ name, label, options, className }) => {
  return (
    <Field as="select" id={name} name={name} className={className}>
      <option value="">{label}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Field>
  );
};

export default SelectField;