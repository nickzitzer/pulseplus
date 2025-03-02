import React from 'react';
import { Formik, Form, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { X } from 'lucide-react';
import { getModelInfo, ModelInfo } from '@/types/dataModels';
import api from '@/utils/api';
import { useFetch } from '@/utils/useFetch';
import { formatDate, formatProgress } from '@/utils/formatters';
import * as Fields from '@/components/fields';

interface DataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  modelType: string;
  mode: 'create' | 'edit';
  title: string;
  data: any;
  loading: boolean;
  error: string | null;
  editingItemId: string | null;
}

interface FieldConfig {
  name: string;
  fieldType: string;
  label: string;
  options?: string[];
  relationModelType?: string;
}

interface ModelField {
  databaseName: string;
  type: string;
  displayName: string;
  [key: string]: any;
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

  const modelInfo: ModelInfo | undefined = getModelInfo(modelType);

  if (!modelInfo) {
    console.error(`Invalid model type: ${modelType}`);
    return null;
  }

  const fields: FieldConfig[] = Object.values(modelInfo.fields).map((field: ModelField) => ({
    name: field.databaseName,
    fieldType: field.type,
    label: field.displayName,
    options: field.options,
    relationModelType: field.relationModelType,
  }));

  const validationSchema = Yup.object().shape(
    fields.reduce((schema, field) => {
      switch (field.fieldType) {
        case 'string':
        case 'text':
        case 'richtext':
        case 'markdown':
          schema[field.name] = Yup.string().required(`${field.label} is required`);
          break;
        case 'number':
        case 'currency':
        case 'percentage':
          schema[field.name] = Yup.number().required(`${field.label} is required`);
          break;
        case 'boolean':
          schema[field.name] = Yup.boolean();
          break;
        case 'date':
        case 'datetime':
          schema[field.name] = Yup.date().required(`${field.label} is required`);
          break;
        case 'email':
          schema[field.name] = Yup.string().email('Invalid email').required(`${field.label} is required`);
          break;
        case 'url':
          schema[field.name] = Yup.string().url('Invalid URL').required(`${field.label} is required`);
          break;
        // Add more cases for other field types as needed
      }
      return schema;
    }, {} as any)
  );

  const handleSubmit = async (values: any, { setSubmitting }: any) => {
    try {
      const url = `/${modelInfo.pluralName}${mode === 'edit' ? `/${data.id}` : ''}`;
      const method = mode === 'create' ? 'post' : 'put';
      await api[method](url, values);
      onSubmit(values);
    } catch (error) {
      console.error('Error submitting form:', error);
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
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700" aria-label="X">
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
            initialValues={mode === 'create' ? getInitialValues(modelType) : data}
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
                      {renderField(field, setFieldValue, values, modelType)}
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

function renderField(
  field: FieldConfig,
  setFieldValue: (field: string, value: any, shouldValidate?: boolean) => void,
  values: any,
  modelType: string
) {
  const commonProps = {
    name: field.name,
    label: field.label,
    className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500",
  };

  // Transform string array options to the expected format { value: string, label: string }[]
  const formatOptions = (options: string[] = []) => {
    return options.map(option => ({ value: option, label: option }));
  };

  // Simplify to use only the basic field components that are guaranteed to exist
  switch (field.fieldType) {
    case 'string':
    case 'email':
    case 'url':
    case 'phone':
    case 'location':
    case 'color':
    case 'file':
    case 'image':
    case 'tags':
    case 'date':
    case 'datetime':
    case 'password':
      return <Fields.TextField {...commonProps} />;
    case 'number':
    case 'currency':
    case 'slider':
    case 'rating':
      return <Fields.NumberField {...commonProps} />;
    case 'boolean':
      return <Fields.BooleanField {...commonProps} />;
    case 'select':
      return <Fields.SelectField {...commonProps} options={formatOptions(field.options)} />;
    case 'multiselect':
    case 'relation':
      return <Fields.SelectField {...commonProps} options={formatOptions(field.options)} />;
    case 'textarea':
    case 'json':
    case 'jsonb':
    case 'code':
    case 'script':
    case 'richtext':
      return <Fields.TextAreaField {...commonProps} />;
    case 'markdown':
      // Special case for markdown field
      return (
        <Fields.MarkdownField
          value={values[field.name] || ''}
          onChange={(value) => setFieldValue(field.name, value, true)}
          className={commonProps.className}
        />
      );
    default:
      return <Fields.TextField {...commonProps} />;
  }
}

function getInitialValues(modelType: string) {
  const modelInfo = getModelInfo(modelType);
  if (!modelInfo) {
    console.error(`Invalid model type: ${modelType}`);
    return {};
  }

  return Object.entries(modelInfo.fields).reduce((acc, [key, field]) => {
    switch (field.type) {
      case 'image':
      case 'file':
        acc[key] = null;
        break;
      case 'boolean':
        acc[key] = false;
        break;
      case 'number':
      case 'slider':
      case 'rating':
        acc[key] = 0;
        break;
      case 'condition':
      case 'tags':
      case 'multiselect':
      case 'checkboxgroup':
        acc[key] = [];
        break;
      case 'color':
        acc[key] = '#000000';
        break;
      case 'json':
        acc[key] = {};
        break;
      case 'date':
      case 'datetime':
      case 'time':
        acc[key] = null;
        break;
      default:
        acc[key] = '';
    }
    return acc;
  }, {} as Record<string, any>);
}

export default DataModal;