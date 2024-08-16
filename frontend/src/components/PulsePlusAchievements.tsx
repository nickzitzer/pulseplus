import React, { useState, useEffect } from 'react';
import { Star, Lock } from 'lucide-react';
import useAuthenticatedFetch from '../utils/api';

interface Achievement {
  sys_id: string;
  name: string;
  description: string;
  image: string;
  unlocked: boolean;
  unlock_date?: string;
  progress?: number;
  total?: number;
}

interface PulsePlusAchievementsProps {
  gameId: string;
  competitorId: string;
}

const PulsePlusAchievements: React.FC<PulsePlusAchievementsProps> = ({ gameId, competitorId }) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchWithAuth = useAuthenticatedFetch();

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const response = await fetchWithAuth(`/achievements?game=${gameId}&competitor=${competitorId}`);
        if (response.status !== 200) {
          throw new Error('Failed to fetch achievements');
        }
        const data = response.data;
        setAchievements(data);
      } catch (error) {
        console.error('Error fetching achievements:', error);
        setError('Failed to load achievements. Please try again later.');
      }
    };
    
    fetchAchievements();
  }, [gameId, competitorId, fetchWithAuth]);

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {achievements.map((achievement) => (
        <div key={achievement.sys_id} className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center mb-2">
            <img src={achievement.image} alt={achievement.name} className="w-12 h-12 mr-4" />
            <div>
              <h3 className="font-bold text-lg">{achievement.name}</h3>
              <p className="text-sm text-gray-600">{achievement.description}</p>
            </div>
          </div>
          {achievement.unlocked ? (
            <div className="flex items-center text-green-500">
              <Star className="w-5 h-5 mr-2" />
              <span>Unlocked on {new Date(achievement.unlock_date!).toLocaleDateString()}</span>
            </div>
          ) : (
            <div>
              {achievement.progress !== undefined && achievement.total !== undefined ? (
                <div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ width: `${(achievement.progress / achievement.total) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600">{achievement.progress} / {achievement.total}</p>
                </div>
              ) : (
                <div className="flex items-center text-gray-500">
                  <Lock className="w-5 h-5 mr-2" />
                  <span>Locked</span>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default PulsePlusAchievements;
