import React from 'react';
import { Field } from 'formik';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

interface DateTimeFieldProps {
  name: string;
  label: string;
  className?: string;
}

const DateTimeField: React.FC<DateTimeFieldProps> = ({ name, label, className }) => {
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
            showTimeSelect
            timeFormat="HH:mm"
            timeIntervals={15}
            dateFormat="MMM dd, yyyy hh:mm a"
            className={`${className} form-input px-4 py-3 rounded-full`}
            placeholderText={label}
          />
        );
      }}
    </Field>
  );
};

export default DateTimeField;