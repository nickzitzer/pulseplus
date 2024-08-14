import React, { useState, useEffect } from 'react';
import { Trophy, ChevronUp, ChevronDown } from 'lucide-react';
import useAuthenticatedFetch from '../utils/api';



interface Competitor {
  id: number;
  name: string;
  department: string;
  points: number;
  image: string;
  change: 'up' | 'down' | 'none';
}

interface PulsePlusLeaderboardProps {
  gameId: string;
}

const PulsePlusLeaderboard: React.FC<PulsePlusLeaderboardProps> = ({ gameId }) => {
  const [timeFrame, setTimeFrame] = useState('weekly');
  const [department, setDepartment] = useState('all');
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchWithAuth = useAuthenticatedFetch();

  

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      try {
        const response = await fetchWithAuth(`/api/leaderboard-members?game=${gameId}&timeFrame=${timeFrame}&department=${department}`);
        if (!response.ok) {
          throw new Error('Failed to fetch leaderboard data');
        }
        const data = await response.json();
        setCompetitors(data.competitors);
        setDepartments(data.departments);
      } catch (error) {
        console.error('Error fetching leaderboard data:', error);
        setError('Failed to load leaderboard. Please try again later.');
      }
    };

    fetchLeaderboardData();
  }, [gameId, timeFrame, department, fetchWithAuth]);

  

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
      <div className="p-4 bg-teal-600 text-white">
        <h2 className="text-2xl font-bold text-center">Leaderboard</h2>
      </div>
      <div className="p-4">
        <div className="flex justify-between mb-4">
          <select 
            value={timeFrame} 
            onChange={(e) => setTimeFrame(e.target.value)}
            className="p-2 border rounded"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="allTime">All Time</option>
          </select>
          <select 
            value={department} 
            onChange={(e) => setDepartment(e.target.value)}
            className="p-2 border rounded"
          >
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
        <div className="space-y-4">
          {competitors.length === 0 ? (
            <p>No competitors found for the selected criteria.</p>
          ) : (
            competitors.map((competitor, index) => (
              <div key={competitor.id} className="flex items-center bg-gray-100 p-4 rounded-lg">
                <div className="flex-shrink-0 w-12 text-center font-bold text-2xl">
                  {index + 1}
                </div>
                <div className="flex-shrink-0 mr-4">
                  <img src={competitor.image} alt={competitor.name} className="w-12 h-12 rounded-full" />
                </div>
                <div className="flex-grow">
                  <h3 className="font-bold">{competitor.name}</h3>
                  <p className="text-sm text-gray-600">{competitor.department}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="font-bold text-lg">{competitor.points} points</p>
                  {competitor.change === 'up' && <ChevronUp className="inline-block text-green-500" />}
                  {competitor.change === 'down' && <ChevronDown className="inline-block text-red-500" />}
                  {index === 0 && <Trophy className="inline-block text-yellow-500 ml-2" />}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PulsePlusLeaderboard;