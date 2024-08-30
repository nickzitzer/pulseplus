import React from 'react';
import Image from '@/components/PulsePlusImage';
import imageLoader from '@/utils/imageLoader';

interface ImageUploaderProps {
  value: File | string | null;
  onChange: (file: File | null) => void;
  name: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ value, onChange, name }) => {
  const commonClasses = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div>
      <input
        type="file"
        id={name}
        name={name}
        accept="image/*"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          onChange(file || null);
        }}
        className={commonClasses}
      />
      {value && (
        <Image
          src={typeof value === 'string' ? value : URL.createObjectURL(value)}
          alt="Preview"
          width={128}
          height={128}
          loader={({ src, width, quality }) => imageLoader({ src, width, quality })}
          className="mt-2 object-cover rounded"
        />
      )}
    </div>
  );
};

export default ImageUploader;
