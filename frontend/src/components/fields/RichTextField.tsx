import React from 'react';
import { Field } from 'formik';
import dynamic from 'next/dynamic';

const ReactQuill = dynamic(() => import('react-quill'), {
  ssr: false,
  loading: () => <p>Loading editor...</p>,
});

interface RichTextFieldProps {
  name: string;
  label: string;
  className?: string;
}

const RichTextField: React.FC<RichTextFieldProps> = ({ name, label, className }) => {
  return (
    <Field name={name}>
      {({ field, form }: any) => (
        <ReactQuill
          value={field.value}
          onChange={(content) => form.setFieldValue(name, content)}
          placeholder={label}
          className={className}
        />
      )}
    </Field>
  );
};

export default RichTextField;