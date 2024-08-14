import React from 'react';

interface PulsePlusTitleProps {
  title: string;
}

const PulsePlusTitle: React.FC<PulsePlusTitleProps> = ({ title }) => {
  return (
    <h1 className="pulseplus-title relative text-4xl font-bold uppercase text-center my-8">
      <span className="relative z-10 px-4 bg-white shadow rounded-lg">
        {title}
      </span>
      <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-gray-300 -z-10"></div>
    </h1>
  );
};

export default PulsePlusTitle;
