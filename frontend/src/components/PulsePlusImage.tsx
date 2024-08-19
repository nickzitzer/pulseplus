import React, { useState, useEffect } from 'react';
import Image, { ImageProps } from 'next/image';
import { Image as ImageIcon } from 'lucide-react';
import imageLoader from '@/utils/imageLoader';

interface PulsePlusImageProps extends Omit<ImageProps, 'src'> {
  src?: string;
  fallback?: React.ReactNode;
  loader?: (props: { src: string; width: number; quality?: number }) => string;
}

const PulsePlusImage: React.FC<PulsePlusImageProps> = ({
  src,
  fallback,
  loader = imageLoader,
  alt,
  width = 40,
  height = 40,
  ...props
}) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [error, setError] = useState(false);

  useEffect(() => {
    setImgSrc(src);
    setError(false);
  }, [src]);

  if (!imgSrc || error) {
    return fallback || (
      <div
        style={{
          width: typeof width === 'number' ? `${width}px` : width,
          height: typeof height === 'number' ? `${height}px` : height,
        }}
        className="bg-gray-200 flex items-center justify-center rounded-md"
      >
        <ImageIcon className="text-gray-400" size={Math.min(Number(width), Number(height)) / 2} />
      </div>
    );
  }

  return (
    <Image
      {...props}
      src={imgSrc}
      alt={alt || ''}
      loader={loader}
      onError={() => setError(true)}
      width={width}
      height={height}
    />
  );
};

export default PulsePlusImage;