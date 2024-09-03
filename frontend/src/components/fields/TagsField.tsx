import React from 'react';
import { Field } from 'formik';
import CreatableSelect from 'react-select/creatable';

interface TagsFieldProps {
  name: string;
  label: string;
  className?: string;
}

const TagsField: React.FC<TagsFieldProps> = ({ name, label, className }) => {
  return (
    <Field name={name}>
      {({ field, form }: any) => (
        <div className={className}>
          <label>{label}</label>
          <CreatableSelect
            isMulti
            value={field.value.map((tag: string) => ({ value: tag, label: tag }))}
            onChange={(selectedOptions) => {
              const selectedTags = selectedOptions.map((option: any) => option.value);
              form.setFieldValue(name, selectedTags);
            }}
            onCreateOption={(inputValue) => {
              const newTag = inputValue.trim();
              if (newTag && !field.value.includes(newTag)) {
                form.setFieldValue(name, [...field.value, newTag]);
              }
            }}
            options={[]}
            placeholder="Type to add tags..."
            className="react-select-container"
            classNamePrefix="react-select"
          />
        </div>
      )}
    </Field>
  );
};

export default TagsField;