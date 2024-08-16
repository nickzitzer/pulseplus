import React, { useState, useEffect } from 'react';
import { Trophy, Users, Calendar } from 'lucide-react';
import useAuthenticatedFetch from '../utils/api';



interface PulsePlusCompetitionsProps {
  gameId: string | undefined;
}

interface Competition {
  sys_id: string;
  name: string;
  description: string;
  image: string;
  start_date: string;
  end_date: string;
  competition_type: string;
  player_type: string;
  schedule_type: string;
}

const PulsePlusCompetitions: React.FC<PulsePlusCompetitionsProps> = ({ gameId }) => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchWithAuth = useAuthenticatedFetch();

  

  useEffect(() => {
    const fetchCompetitions = async (gameId: string) => {
      try {
        const response = await fetchWithAuth(`/competitions?game=${gameId}`);
        const data = response.data;
        setCompetitions(data);
      } catch (error) {
        console.error('Error fetching competitions:', error);
        setError('Failed to load competitions. Please try again later.');
      }
    };

    if (gameId) {
      fetchCompetitions(gameId);
    }
  }, [gameId, fetchWithAuth]);

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="pulseplus-competitions grid grid-cols-1 md:grid-cols-2 gap-4">
      {competitions.length === 0 ? (
        <p>No active competitions at the moment. Check back later!</p>
      ) : (
        competitions.map(competition => (
          <div key={competition.sys_id} className="bg-white shadow rounded-lg overflow-hidden">
            <div className="relative h-40">
              <img src={competition.image || '/next.svg'} alt={competition.name} className="w-full h-full object-cover" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
                <h3 className="text-white font-bold text-xl">{competition.name}</h3>
              </div>
            </div>
            <div className="p-4">
              <p className="text-gray-600 mb-4">{competition.description}</p>
              <div className="flex justify-between text-sm text-gray-500">
                <div className="flex items-center">
                  <Trophy className="w-4 h-4 mr-1" />
                  {competition.competition_type}
                </div>
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  {competition.player_type}
                </div>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  {competition.schedule_type}
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-500">
                {new Date(competition.start_date).toLocaleDateString()} - {new Date(competition.end_date).toLocaleDateString()}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default PulsePlusCompetitions;