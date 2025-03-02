import React, { useState, useEffect } from 'react';
import { Star, Lock } from 'lucide-react';
import api from '@/utils/api';
import { useFetch } from '@/utils/useFetch';
import { formatDate, formatProgress } from '@/utils/formatters';
import Image from '@/components/ui/PulsePlusImage';
import imageLoader, { ImageLoaderOptions, getAchievementIconUrl } from '@/utils/imageLoader';

interface Achievement {
  sys_id: string;
  name: string;
  description: string;
  image_url: string;
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

  const { data, loading, error, fetchData } = useFetch<Achievement[]>(
    `/games/${gameId}/competitors/${competitorId}/achievements`,
    {
      onSuccess: (data) => setAchievements(data),
    }
  );

  // Format the achievement image URL using our utility
  const getAchievementImage = (achievementId: string) => {
    return getAchievementIconUrl(achievementId);
  };

  if (error) {
    return <div className="text-red-500">{error.toString()}</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {achievements.map((achievement) => (
        <div key={achievement.sys_id} className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center mb-2">
            <Image
              src={achievement.image_url}
              alt={achievement.name}
              width={48}
              height={48}
              loader={({ src, width, quality }) => imageLoader({ src, width, quality, type: 'achievement' })}
              className="mr-4"
            />
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