import React from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { X, Pipette } from 'lucide-react';
import { convertStringFormat, DataModelFields, DataModelName, getFieldsForTable } from '../types/dataModels';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { parseISO } from 'date-fns';
import Image from '@/components/PulsePlusImage';
import imageLoader from '@/utils/imageLoader';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { ConditionBuilder } from './fields';
import { HexColorPicker } from 'react-colorful';
import api from '../utils/api'; // Make sure to import your API utility// Import the Pipette icon from lucide-react

// Add this helper function at the top of the file
const findModelType = (modelType: string): keyof typeof DataModelFields | undefined => {
  if (!modelType) return undefined;
  
  // Remove trailing 's' if present
  const singularModelType = modelType.endsWith('s') ? modelType.slice(0, -1) : modelType;
  
  const pascalCaseModelType = convertStringFormat(singularModelType, 'pascalCase');
  return Object.keys(DataModelFields).find(
    key => key === pascalCaseModelType
  ) as keyof typeof DataModelFields | undefined;
};

type ModelType = DataModelName;

interface DataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  modelType: ModelType;
  mode: 'create' | 'edit';
  title: string;
  data: any; // New prop for the item data
  loading: boolean; // New prop for loading state
  error: string | null; // New prop for error state
  editingItemId: string | null;
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
  modelType,
  mode,
  title,
  data,
  loading,
  error,
}) => {
  if (!isOpen) return null;

  const actualModelType = findModelType(modelType);
  if (!actualModelType) {
    console.error(`No matching model found for: ${modelType}`);
    return null;
  }

  const model = DataModelFields[actualModelType];
  const fields: FieldConfig[] = Object.entries(model).map(([key, value]) => ({
    name: key,
    fieldType: getFieldType(value),
    label: convertStringFormat(key, 'display'),
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
        case 'script':
          schema[field.name] = Yup.string().required(`${field.label} is required`);
          break;
        case 'condition':
          schema[field.name] = Yup.array().of(
            Yup.object().shape({
              field: Yup.string().required('Field is required'),
              operator: Yup.string().oneOf(['==', '===', '!=', '!==', '>', '>=', '<', '<=']).required('Operator is required'),
              value: Yup.string().required('Value is required'),
            })
          );
          break;
        case 'color':
          schema[field.name] = Yup.string().required(`${field.label} is required`);
          break;
        default:
          schema[field.name] = Yup.string().required(`${field.label} is required`);
      }
      return schema;
    }, {} as any)
  );

  const handleSubmit = async (values: any, { setSubmitting }: any) => {
    try {
      const formData = new FormData();
      
      for (const [key, value] of Object.entries(values)) {
        if (value instanceof File) {
          formData.append(key, value);
        } else if (typeof value === 'object' && value !== null) {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      }

      const response = await api(`/${modelType}${mode === 'edit' ? `/${data.sys_id}` : ''}`, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      onSubmit(response.data);
    } catch (error) {
      console.error('Error submitting form:', error);
      // Handle error (e.g., show error message)
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-[80%] h-[90vh] max-h-[800px] flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">{title}</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
        {loading ? (
          <p className="p-6">Loading...</p>
        ) : error ? (
          <p className="p-6 text-red-500">{error}</p>
        ) : (
          <Formik
            initialValues={mode === 'create' ? getInitialValues(model) : data}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
            enableReinitialize
          >
            {({ errors, touched, setFieldValue, values }) => (
              <Form className="flex flex-col h-full">
                <div className="flex-grow overflow-y-auto p-6" style={{ maxHeight: 'calc(100% - 140px)' }}>
                  {fields.map((field) => (
                    <div key={field.name} className="mb-4">
                      <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label}
                      </label>
                      {renderField(field, setFieldValue, values, actualModelType)}
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
        )}
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
    case 'script':
      return 'script';
    case 'condition':
      return 'condition';
    case 'color':
      return 'color';
    default:
      return 'text';
  }
}

function renderField(
  field: FieldConfig,
  setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void,
  values: any,
  modelType: DataModelName
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
            <Image
              src={values[field.name] instanceof File 
                ? URL.createObjectURL(values[field.name])
                : values[field.name]}
              alt="Preview"
              width={128}
              height={128}
              loader={({ src, width, quality }) => imageLoader({ src, width, quality })}
              className="mt-2 object-cover rounded"
            />
          )}
        </div>
      );
    case 'script':
      return (
        <CodeMirror
          value={values[field.name]}
          height="200px"
          extensions={[javascript({ jsx: true })]}
          onChange={(value) => setFieldValue(field.name, value)}
          className={commonClasses}
        />
      );
    case 'condition':
      return (
        <ConditionBuilder
          conditions={values[field.name] || []}
          onChange={(newConditions) => setFieldValue(field.name, newConditions)}
          tableName={values.table_name || modelType}
        />
      );
    case 'color':
      return (
        <div>
          <div className="flex items-center mb-2">
            <HexColorPicker
              color={values[field.name] || '#000000'}
              onChange={(color) => setFieldValue(field.name, color)}
            />
            <button
              type="button"
              onClick={async () => {
                if ('EyeDropper' in window) {
                  try {
                    const eyeDropper = new (window as any).EyeDropper();
                    const result = await eyeDropper.open();
                    setFieldValue(field.name, result.sRGBHex);
                  } catch (error) {
                    console.error('EyeDropper error:', error);
                  }
                } else {
                  alert('EyeDropper is not supported in this browser.');
                }
              }}
              className="ml-4 p-2 bg-gray-200 rounded-full hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Pick color from screen"
            >
              <Pipette className="h-5 w-5 text-gray-600" />
            </button>
          </div>
          <input
            type="text"
            value={values[field.name] || ''}
            onChange={(e) => setFieldValue(field.name, e.target.value)}
            className={`${commonClasses} mt-2`}
            placeholder="#000000"
          />
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

function getInitialValues(model: typeof DataModelFields[DataModelName]) {
  return Object.keys(model).reduce((acc, key) => {
    switch ((model as Record<string, string>)[key]) {
      case 'image':
        acc[key] = null;
        break;
      case 'boolean':
        acc[key] = false;
        break;
      case 'number':
        acc[key] = 0;
        break;
      case 'condition':
        acc[key] = [];
        break;
      case 'color':
        acc[key] = '#000000';
        break;
      default:
        acc[key] = '';
    }
    return acc;
  }, {} as Record<string, any>);
}

export default DataModal;