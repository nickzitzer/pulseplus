import React from 'react';
import useAuthenticatedFetch from '../utils/api';

interface PulsePlusProgressBarProps {
  min: number;
  max: number;
  value: number;
  goal: number;
  unit: string;
  type: 'circle' | 'bar';
  title: string;
  colorStart: string;
  colorFinish: string;
}

const PulsePlusProgressBar: React.FC<PulsePlusProgressBarProps> = ({ 
  min, 
  max, 
  value, 
  goal, 
  unit, 
  type, 
  title, 
  colorStart, 
  colorFinish 
}) => {
  const ratio = Math.min(Math.max(((value - min) / (goal - min)) * 100, 0), 100);
  
  if (type === 'circle') {
    return (
      <div className="pulseplus-progress-circle">
        <svg viewBox="0 0 36 36" className="w-full">
          <defs>
            <linearGradient id="circleGradient" gradientTransform="rotate(90)">
              <stop offset="0%" stopColor={colorStart} />
              <stop offset="100%" stopColor={colorFinish} />
            </linearGradient>
          </defs>
          <circle className="stroke-[#eee] fill-none" cx="18" cy="18" r="15.9155" strokeWidth="2" />
          <circle 
            className="fill-none stroke-[url(#circleGradient)]" 
            cx="18" 
            cy="18" 
            r="15.9155" 
            strokeWidth="2" 
            strokeDasharray={`${ratio}, 100`}
            strokeLinecap="round"
          />
          <text x="18" y="18" className="text-2xl font-bold text-center" dominantBaseline="middle" textAnchor="middle">
            {ratio.toFixed(0)}%
          </text>
          <text x="18" y="24" className="text-xs text-center" dominantBaseline="middle" textAnchor="middle">
            {value} / {goal} {unit}
          </text>
        </svg>
        <p className="text-center mt-2 font-bold">{title}</p>
      </div>
    );
  }

  return (
    <div className="pulseplus-progress-bar">
      <div className="flex justify-between mb-1">
        <span>{min}</span>
        <span>{max}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className="h-2.5 rounded-full" 
          style={{
            width: `${ratio}%`,
            background: `linear-gradient(to right, ${colorStart}, ${colorFinish})`
          }}
        ></div>
      </div>
      <div className="flex justify-between mt-1">
        <span>{title}</span>
        <span>{value} / {goal} {unit}</span>
      </div>
    </div>
  );
};

export default PulsePlusProgressBar;