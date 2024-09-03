import React from 'react';
import { Field } from 'formik';

interface PercentageFieldProps {
  name: string;
  label: string;
  className?: string;
}

const PercentageField: React.FC<PercentageFieldProps> = ({ name, label, className }) => {
  return (
    <div className={className}>
      <Field
        type="number"
        id={name}
        name={name}
        placeholder={label}
        min="0"
        max="100"
        step="0.01"
      />
      <span>%</span>
    </div>
  );
};

export default PercentageField;