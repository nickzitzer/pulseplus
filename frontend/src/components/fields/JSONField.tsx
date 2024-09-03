import React from 'react';
import { Field } from 'formik';
import { JSONTree } from 'react-json-tree';

interface JSONFieldProps {
  name: string;
  label: string;
  className?: string;
}

const JSONField: React.FC<JSONFieldProps> = ({ name, label, className }) => {
  return (
    <Field name={name}>
      {({ field, form }: any) => (
        <div className={className}>
          <label>{label}</label>
          <JSONTree
            data={field.value || {}}
            theme={{
              scheme: 'monokai',
              author: 'wimer hazenberg (http://www.monokai.nl)',
              base00: '#272822',
              base01: '#383830',
              base02: '#49483e',
              base03: '#75715e',
              base04: '#a59f85',
              base05: '#f8f8f2',
              base06: '#f5f4f1',
              base07: '#f9f8f5',
              base08: '#f92672',
              base09: '#fd971f',
              base0A: '#f4bf75',
              base0B: '#a6e22e',
              base0C: '#a1efe4',
              base0D: '#66d9ef',
              base0E: '#ae81ff',
              base0F: '#cc6633'
            }}
            invertTheme={false}
          />
          <textarea
            value={JSON.stringify(field.value, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                form.setFieldValue(name, parsed);
              } catch (error) {
                // Handle invalid JSON input
              }
            }}
            className="mt-2 w-full h-32 p-2 border rounded"
          />
        </div>
      )}
    </Field>
  );
};

export default JSONField;