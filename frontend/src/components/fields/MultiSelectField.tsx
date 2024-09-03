import React from 'react';
import { Field } from 'formik';
import Select from 'react-select';

interface MultiSelectFieldProps {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  className?: string;
}

const MultiSelectField: React.FC<MultiSelectFieldProps> = ({ name, label, options, className }) => {
  return (
    <Field name={name}>
      {({ field, form }: any) => (
        <Select
          isMulti
          options={options}
          name={name}
          value={field.value}
          onChange={(option) => form.setFieldValue(name, option)}
          placeholder={label}
          className={className}
        />
      )}
    </Field>
  );
};

export default MultiSelectField;