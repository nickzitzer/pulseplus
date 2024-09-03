import React from 'react';
import { Field } from 'formik';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';

interface ScriptFieldProps {
  name: string;
  label: string;
  className?: string;
}

const ScriptField: React.FC<ScriptFieldProps> = ({ name, label, className }) => {
  return (
    <Field name={name}>
      {({ field, form }: any) => (
        <CodeMirror
          value={field.value}
          height="200px"
          extensions={[javascript({ jsx: true })]}
          onChange={(value) => form.setFieldValue(name, value)}
          className={className}
        />
      )}
    </Field>
  );
};

export default ScriptField;