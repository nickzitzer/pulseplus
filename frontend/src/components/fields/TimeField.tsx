import React from 'react';
import { Field } from 'formik';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { setHours, setMinutes } from 'date-fns';

interface TimeFieldProps {
  name: string;
  label: string;
  className?: string;
}

const TimeField: React.FC<TimeFieldProps> = ({ name, label, className }) => {
  return (
    <Field name={name}>
      {({ field, form }: any) => {
        const value = field.value ? new Date(`1970-01-01T${field.value}:00`) : null;
        return (
          <DatePicker
            selected={value}
            onChange={(date: Date | null) => {
              const timeString = date ? `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}` : null;
              form.setFieldValue(name, timeString);
            }}
            showTimeSelect
            showTimeSelectOnly
            timeIntervals={15}
            timeCaption="Time"
            dateFormat="h:mm aa"
            className={`${className} form-input px-4 py-3 rounded-full`}
            placeholderText={label}
          />
        );
      }}
    </Field>
  );
};

export default TimeField;