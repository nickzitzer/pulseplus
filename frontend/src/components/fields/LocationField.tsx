import React from 'react';
import { Field } from 'formik';

interface LocationFieldProps {
  name: string;
  label: string;
  className?: string;
}

const LocationField: React.FC<LocationFieldProps> = ({ name, label, className }) => {
  return (
    <div className={className}>
      <label>{label}</label>
      <Field name={`${name}.latitude`} placeholder="Latitude" className="mr-2" />
      <Field name={`${name}.longitude`} placeholder="Longitude" />
    </div>
  );
};

export default LocationField;