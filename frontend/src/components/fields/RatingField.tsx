import React from 'react';
import { Field } from 'formik';

interface RatingFieldProps {
  name: string;
  label: string;
  className?: string;
}

const RatingField: React.FC<RatingFieldProps> = ({ name, label, className }) => {
  return (
    <Field name={name}>
      {({ field, form }: any) => (
        <div className={className}>
          <label>{label}</label>
          <div className="flex">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => form.setFieldValue(name, star)}
                className={`text-2xl ${
                  star <= field.value ? 'text-yellow-400' : 'text-gray-300'
                }`}
              >
                ★
              </button>
            ))}
          </div>
        </div>
      )}
    </Field>
  );
};

export default RatingField;