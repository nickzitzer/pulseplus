import React from 'react';
import { Field } from 'formik';
import CurrencyInput from 'react-currency-input-field';

interface CurrencyFieldProps {
  name: string;
  label: string;
  className?: string;
}

const CurrencyField: React.FC<CurrencyFieldProps> = ({ name, label, className }) => {
  return (
    <Field name={name}>
      {({ field, form }: any) => (
        <CurrencyInput
          id={name}
          name={name}
          placeholder={label}
          defaultValue={field.value}
          decimalsLimit={2}
          onValueChange={(value) => form.setFieldValue(name, value)}
          className={className}
        />
      )}
    </Field>
  );
};

export default CurrencyField;