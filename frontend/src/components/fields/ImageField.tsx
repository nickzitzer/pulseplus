import React from 'react';
import { Field } from 'formik';
import Image from '@/components/ui/PulsePlusImage';
import imageLoader, { ImageLoaderOptions } from '@/utils/imageLoaderUtil';

interface ImageFieldProps {
  name: string;
  label: string;
  className?: string;
}

const ImageField: React.FC<ImageFieldProps> = ({ name, label, className }) => {
  const commonClasses = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <Field name={name}>
      {({ field, form }: any) => (
        <div>
          <input
            type="file"
            id={name}
            accept="image/*"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              form.setFieldValue(name, file);
            }}
            className={className || commonClasses}
          />
          {field.value && (
            <Image
              src={typeof field.value === 'string' ? field.value : URL.createObjectURL(field.value)}
              alt="Preview"
              width={128}
              height={128}
              loader={({ src, width, quality }) => imageLoader({ src, width, quality, type: 'image' })}
              className="mt-2 object-cover rounded"
            />
          )}
        </div>
      )}
    </Field>
  );
};

export default ImageField;
