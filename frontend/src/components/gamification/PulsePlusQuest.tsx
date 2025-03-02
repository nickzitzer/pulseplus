import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import PulsePlusProgressBar from './PulsePlusProgressBar';
import api from '@/utils/api';
import { useFetch } from '@/utils/useFetch';
import { formatDate, formatProgress } from '@/utils/formatters';
import Image from '@/components/ui/PulsePlusImage';
import imageLoader, { ImageLoaderOptions } from '@/utils/imageLoaderUtil';



interface PulsePlusQuestProps {
  gameId: string | undefined;
}

interface QuestLevel {
  sys_id: string;
  name: string;
  entry_points: number;
  image_url: string;
  color: string;
}

interface Quest {
  sys_id: string;
  name: string;
  levels: QuestLevel[];
  current_points: number;
  goal_points: number;
}

const PulsePlusQuest: React.FC<PulsePlusQuestProps> = ({ gameId }) => {
  const [quest, setQuest] = useState<Quest | null>(null);
  const [error, setError] = useState<string | null>(null);



  

  useEffect(() => {
    const fetchQuest = async (gameId: string) => {
      try {
        const response = await api.get(`/quests?game=${gameId}`);
        const data = response.data;
        if (data.length > 0) {
          setQuest(data[0]); // Assuming we're only dealing with one quest per game for now
        }
      } catch (error) {
        console.error('Error fetching quest:', error);
        setError('Failed to load quest. Please try again later.');
      }
    };

    if (gameId) {
      fetchQuest(gameId);
    }
  }, [gameId]);

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!quest) {
    return <div>No active quest available.</div>;
  }

  return (
    <div className="pulseplus-quest space-y-4">
      <h2 className="text-2xl font-bold">{quest.name}</h2>
      {quest.levels.map((level, index) => (
        <div key={level.sys_id} className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-4" style={{background: `linear-gradient(to right, ${level.color}, white)`}}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Image
                  src={level.image_url}
                  alt={level.name}
                  width={48}
                  height={48}
                  loader={({ src, width, quality }) => imageLoader({ src, width, quality, type: 'image' })}
                  className="w-12 h-12 rounded-full mr-4"
                />
                <h3 className="font-bold text-xl">{level.name}</h3>
              </div>
              {quest.current_points < level.entry_points && (
                <div className="bg-gray-800 text-white p-2 rounded-full">
                  <Lock className="w-6 h-6" />
                </div>
              )}
            </div>
            <PulsePlusProgressBar
              min={index > 0 ? quest.levels[index - 1].entry_points : 0}
              max={level.entry_points}
              value={Math.min(quest.current_points, level.entry_points)}
              goal={level.entry_points}
              unit="points"
              type="bar"
              title={`Progress to ${level.name}`}
              colorStart={level.color}
              colorFinish={level.color}
            />
          </div>
          {quest.current_points < level.entry_points && (
            <div className="bg-gray-100 p-2 text-center text-sm">
              Unlocks at {level.entry_points} points
            </div>
          )}
        </div>
      ))}
      <div className="text-center">
        <p className="text-xl font-bold">Total Progress</p>
        <PulsePlusProgressBar
          min={0}
          max={quest.goal_points}
          value={quest.current_points}
          goal={quest.goal_points}
          unit="points"
          type="circle"
          title="Overall Quest Progress"
          colorStart="#1F8476"
          colorFinish="#48C891"
        />
      </div>
    </div>
  );
};

export default PulsePlusQuest;