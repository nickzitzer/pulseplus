import React from 'react';
import { Field } from 'formik';

interface PhoneFieldProps {
  name: string;
  label: string;
  className?: string;
}

const PhoneField: React.FC<PhoneFieldProps> = ({ name, label, className }) => {
  return (
    <Field
      type="tel"
      id={name}
      name={name}
      placeholder={label}
      className={className}
    />
  );
};

export default PhoneField;