import React from 'react';
import { Field } from 'formik';

interface SliderFieldProps {
  name: string;
  label: string;
  min: number;
  max: number;
  step: number;
  className?: string;
}

const SliderField: React.FC<SliderFieldProps> = ({ name, label, min, max, step, className }) => {
  return (
    <div className={className}>
      <label htmlFor={name}>{label}</label>
      <Field
        type="range"
        id={name}
        name={name}
        min={min}
        max={max}
        step={step}
      />
    </div>
  );
};

export default SliderField;