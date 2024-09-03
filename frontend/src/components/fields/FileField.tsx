import React from 'react';
import { Field } from 'formik';

interface FileFieldProps {
  name: string;
  label: string;
  className?: string;
}

const FileField: React.FC<FileFieldProps> = ({ name, label, className }) => {
  return (
    <Field name={name}>
      {({ field, form }: any) => (
        <input
          type="file"
          id={name}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            form.setFieldValue(name, file);
          }}
          className={className}
        />
      )}
    </Field>
  );
};

export default FileField;