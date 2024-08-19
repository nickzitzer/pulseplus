import React, { useState, useEffect } from 'react';
import { Formik, Form, Field, ErrorMessage, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { X } from 'lucide-react';
import { DataModelFields, DataModelName } from '../types/dataModels';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { parseISO, format } from 'date-fns';

type ModelType = DataModelName;

interface DataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData: any;
  modelType: ModelType;
  mode: 'create' | 'edit';
  title: string;
}

interface FieldConfig {
  name: string;
  fieldType: string;
  label: string;
}

const DataModal: React.FC<DataModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  modelType,
  mode,
  title,
}) => {
  if (!isOpen) return null;

  const model = DataModelFields[modelType];
  const fields: FieldConfig[] = Object.entries(model).map(([key, value]) => ({
    name: key,
    fieldType: getFieldType(value),
    label: key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' '),
  }));

  const validationSchema = Yup.object().shape(
    fields.reduce((schema, field) => {
      switch (field.fieldType) {
        case 'email':
          schema[field.name] = Yup.string().email(`Invalid email address`).required(`${field.label} is required`);
          break;
        case 'number':
          schema[field.name] = Yup.number().required(`${field.label} is required`);
          break;
        case 'boolean':
          schema[field.name] = Yup.boolean();
          break;
        case 'datetime':
          schema[field.name] = Yup.date().required(`${field.label} is required`);
          break;
        case 'image':
          schema[field.name] = Yup.mixed().test('fileType', 'Unsupported file format', (value) => {
            if (!value) return true;
            if (typeof value === 'string') return true;
            return value instanceof File && ['image/jpeg', 'image/png', 'image/gif'].includes(value.type);
          });
          break;
        default:
          schema[field.name] = Yup.string().required(`${field.label} is required`);
      }
      return schema;
    }, {} as any)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl h-[90vh] max-h-[800px] flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">{title}</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
        <Formik
          initialValues={initialData}
          validationSchema={validationSchema}
          onSubmit={(values, formikHelpers: FormikHelpers<any>) => onSubmit(values)}
        >
          {({ errors, touched, setFieldValue, values }) => (
            <Form className="flex flex-col h-full">
              <div className="flex-grow overflow-y-auto p-6" style={{ maxHeight: 'calc(100% - 140px)' }}>
                {fields.map((field) => (
                  <div key={field.name} className="mb-4">
                    <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label}
                    </label>
                    {renderField(field, setFieldValue, values)}
                    <ErrorMessage name={field.name}>
                      {(msg) => <div className="text-red-500 text-sm mt-1">{msg}</div>}
                    </ErrorMessage>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-200 p-6 bg-white rounded-b-lg">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 mr-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600"
                  >
                    {mode === 'create' ? 'Create' : 'Update'}
                  </button>
                </div>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};

function getFieldType(value: string): string {
  switch (value) {
    case 'string':
      return 'text';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'datetime':
      return 'datetime';
    case 'image':
      return 'image';
    default:
      return 'text';
  }
}

function renderField(
  field: FieldConfig,
  setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void,
  values: any
) {
  const commonClasses = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500";
  
  switch (field.fieldType) {
    case 'boolean':
      return (
        <Field
          type="checkbox"
          id={field.name}
          name={field.name}
          className="mr-2"
        />
      );
    case 'datetime':
      return (
        <Field name={field.name}>
          {({ field: { value }, form: { setFieldValue } }: any) => (
            <DatePicker
              id={field.name}
              selected={value ? parseISO(value) : null}
              onChange={(date: Date | null) => setFieldValue(field.name, date ? date.toISOString() : null)}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              timeCaption="time"
              dateFormat="MMMM d, yyyy h:mm aa"
              className={commonClasses}
            />
          )}
        </Field>
      );
    case 'image':
      return (
        <div>
          <input
            type="file"
            id={field.name}
            name={field.name}
            accept="image/*"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) {
                setFieldValue(field.name, file);
              }
            }}
            className={commonClasses}
          />
          {values[field.name] && (
            <img
              src={typeof values[field.name] === 'string' ? values[field.name] : URL.createObjectURL(values[field.name])}
              alt="Preview"
              className="mt-2 w-32 h-32 object-cover rounded"
            />
          )}
        </div>
      );
    default:
      return (
        <Field
          type={field.fieldType}
          id={field.name}
          name={field.name}
          className={commonClasses}
        />
      );
  }
}

export default DataModal;