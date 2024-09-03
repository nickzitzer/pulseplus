import React from 'react';
import { Field } from 'formik';
import Select from 'react-select';

interface RelationFieldProps {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  className?: string;
}

const RelationField: React.FC<RelationFieldProps> = ({ name, label, options, className }) => {
  return (
    <Field name={name}>
      {({ field, form }: any) => (
        <Select
          options={options}
          name={name}
          value={options.find(option => option.value === field.value)}
          onChange={(option) => form.setFieldValue(name, option?.value)}
          placeholder={label}
          className={className}
        />
      )}
    </Field>
  );
};

export default RelationField;