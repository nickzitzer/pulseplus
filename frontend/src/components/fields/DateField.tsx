import React from 'react';
import { Field } from 'formik';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

interface DateFieldProps {
  name: string;
  label: string;
  className?: string;
}

const DateField: React.FC<DateFieldProps> = ({ name, label, className }) => {
  return (
    <Field name={name}>
      {({ field, form }: any) => {
        const value = field.value ? new Date(field.value) : null;
        return (
          <DatePicker
            selected={value}
            onChange={(date: Date | null) => {
              const isoString = date ? date.toISOString() : null;
              form.setFieldValue(name, isoString);
            }}
            className={`${className} form-input px-4 py-3 rounded-full`}
            placeholderText={label}
            dateFormat="MMM dd, yyyy"
          />
        );
      }}
    </Field>
  );
};

export default DateField;