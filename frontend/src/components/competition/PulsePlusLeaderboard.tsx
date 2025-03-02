import React, { useState, useEffect } from 'react';
import { Trophy, ChevronUp, ChevronDown } from 'lucide-react';
import api from '@/utils/api';
import { useFetch } from '@/utils/useFetch';
import { formatDate, formatProgress } from '@/utils/formatters';
import Image from '@/components/ui/PulsePlusImage';
import imageLoader, { ImageLoaderOptions } from '@/utils/imageLoaderUtil';

interface Competitor {
  id: number;
  name: string;
  department: string;
  points: number;
  image_url: string;
  change: 'up' | 'down' | 'none';
}

interface PulsePlusLeaderboardProps {
  gameId: string;
}

const PulsePlusLeaderboard: React.FC<PulsePlusLeaderboardProps> = ({ gameId }) => {
  const [timeFrame, setTimeFrame] = useState('weekly');
  const [department, setDepartment] = useState('all');
  const [departments, setDepartments] = useState<string[]>([]);

  // Using useFetch hook instead of manual fetch
  const { 
    data, 
    loading, 
    error, 
    fetchData 
  } = useFetch<{ competitors: Competitor[], departments: string[] }>(
    `/leaderboard-members?game=${gameId}&timeFrame=${timeFrame}&department=${department}`,
    {
      onSuccess: (data) => {
        if (data.departments) {
          setDepartments(data.departments);
        }
      },
      dependencies: [gameId, timeFrame, department]
    }
  );

  // Extract competitors from the data
  const competitors = data?.competitors || [];

  const handleTimeFrameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTimeFrame(e.target.value);
  };

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDepartment(e.target.value);
  };

  if (loading) {
    return <div className="p-4 text-center">Loading leaderboard data...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">Failed to load leaderboard. Please try again later.</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold flex items-center">
          <Trophy className="text-yellow-500 mr-2" />
          Leaderboard
        </h2>
        <div className="flex space-x-2">
          <select
            value={timeFrame}
            onChange={handleTimeFrameChange}
            className="border rounded px-2 py-1 text-sm"
            aria-label="Time frame"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="allTime">All Time</option>
          </select>
          {departments.length > 0 && (
            <select
              value={department}
              onChange={handleDepartmentChange}
              className="border rounded px-2 py-1 text-sm"
              aria-label="Department filter"
            >
              <option value="all">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {competitors.length === 0 ? (
        <p className="text-center text-gray-500 py-8">No competitors found.</p>
      ) : (
        <div className="space-y-2">
          {competitors.map((competitor, index) => (
            <div
              key={competitor.id}
              className={`flex items-center p-2 rounded ${
                index === 0
                  ? 'bg-yellow-100'
                  : index === 1
                  ? 'bg-gray-100'
                  : index === 2
                  ? 'bg-amber-100'
                  : 'bg-white border'
              }`}
            >
              <div className="w-8 h-8 flex items-center justify-center font-bold">
                {index + 1}
              </div>
              <div className="w-10 h-10 rounded-full overflow-hidden ml-2">
                <Image
                  src={competitor.image_url}
                  alt={competitor.name}
                  width={40}
                  height={40}
                  type="avatar"
                />
              </div>
              <div className="ml-3 flex-grow">
                <div className="font-semibold">{competitor.name}</div>
                <div className="text-xs text-gray-500">{competitor.department}</div>
              </div>
              <div className="flex items-center">
                <span className="font-bold mr-2">{competitor.points.toLocaleString()}</span>
                {competitor.change === 'up' && (
                  <ChevronUp className="text-green-500" />
                )}
                {competitor.change === 'down' && (
                  <ChevronDown className="text-red-500" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PulsePlusLeaderboard;