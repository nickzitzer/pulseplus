import React from 'react';
import { Field } from 'formik';
import { HexColorPicker } from 'react-colorful';
import { Pipette } from 'lucide-react';

interface ColorFieldProps {
  name: string;
  label: string;
  className?: string;
}

const ColorField: React.FC<ColorFieldProps> = ({ name, label, className }) => {
  return (
    <Field name={name}>
      {({ field, form }: any) => (
        <div>
          <div className="flex items-center mb-2">
            <HexColorPicker
              color={field.value || '#000000'}
              onChange={(color) => form.setFieldValue(name, color)}
            />
            <button
              type="button"
              onClick={async () => {
                if ('EyeDropper' in window) {
                  try {
                    const eyeDropper = new (window as any).EyeDropper();
                    const result = await eyeDropper.open();
                    form.setFieldValue(name, result.sRGBHex);
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
            {...field}
            placeholder={label}
            className={className}
          />
        </div>
      )}
    </Field>
  );
};

export default ColorField;