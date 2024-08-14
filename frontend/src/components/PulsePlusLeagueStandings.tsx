import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, ChevronUp, ChevronDown, User, Star } from 'lucide-react';
import useAuthenticatedFetch from '../utils/api';

interface PulsePlusLeagueStandingsProps {
  gameId: string | undefined;
}

interface League {
  sys_id: string;
  color: string;
  name: string;
  image: string;
}

const PulsePlusLeagueStandings: React.FC<PulsePlusLeagueStandingsProps> = ({ gameId }) => {
  const [leagueData, setLeagueData] = useState([]);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [activeLeague, setActiveLeague] = useState<League | null>(null);

  const fetchWithAuth = useAuthenticatedFetch();

  const fetchLeaderboardData = useCallback(async (gameId: string, leagueId: string) => {
    try {
      const leaderboardResponse = await fetchWithAuth(`/api/leaderboard-members?game=${gameId}&level=${leagueId}`);
      const leaderboardData = await leaderboardResponse.json();
      setLeaderboardData(leaderboardData);
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
    }
  }, [fetchWithAuth]);

  const fetchLeagueData = useCallback(async (gameId: string) => {
    try {
      const leagueResponse = await fetchWithAuth(`/api/levels?game=${gameId}&type=league`);
      const leagueData = await leagueResponse.json();
      setLeagueData(leagueData);

      if (leagueData.length > 0) {
        setActiveLeague(leagueData[0]);
        fetchLeaderboardData(gameId, leagueData[0].sys_id);
      }
    } catch (error) {
      console.error('Error fetching league data:', error);
    }
  }, [fetchWithAuth, fetchLeaderboardData]);

  useEffect(() => {
    if (gameId) {
      fetchLeagueData(gameId);
    }
  }, [gameId, fetchLeagueData]);

  return (
    <div className="pulseplus-league-standings">
      <div className="flex justify-center space-x-4 mb-4">
        {leagueData.map((league: { sys_id: string; color: string; name: string; image: string }) => (
          <button
            key={league.sys_id}
            className={`p-2 rounded-full ${activeLeague?.sys_id === league.sys_id ? 'ring-2 ring-offset-2' : ''}`}
            style={{ backgroundColor: league.color }}
            onClick={() => {
              setActiveLeague(league);
              if (gameId && league.sys_id) {
                fetchLeaderboardData(gameId, league.sys_id);
              }
            }}
          >
            {league.image ? (
              <img src={league.image} alt={league.name} className="w-12 h-12 rounded-full" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
                <Star className="w-8 h-8" style={{ color: league.color }} />
              </div>
            )}
          </button>
        ))}
      </div>
      <h2 className="text-2xl font-bold text-center mb-4">{activeLeague?.name}</h2>
      <div className="space-y-4">
        {leaderboardData.map((competitor: {
          department: string; sys_id: string; image: string; name: string; points: number;
        }, index) => (
          <div key={competitor.sys_id} className="bg-white shadow rounded-lg p-4 flex items-center">
            <div className="flex-shrink-0 mr-4">
              <div className="relative">
                {competitor.image ? (
                  <img src={competitor.image} alt={competitor.name} className="w-12 h-12 rounded-full" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="w-8 h-8 text-gray-500" />
                  </div>
                )}
                <div className="absolute -top-2 -left-2 bg-gray-800 text-white rounded-full w-6 h-6 flex items-center justify-center">
                  {index + 1}
                </div>
              </div>
            </div>
            <div className="flex-grow">
              <h3 className="font-bold">{competitor.name}</h3>
              <p className="text-sm text-gray-500">{competitor.department}</p>
            </div>
            <div className="flex-shrink-0 text-right">
              <p className="font-bold">{competitor.points} points</p>
              {index === 0 && <Trophy className="inline-block text-yellow-400" />}
              {index === leaderboardData.length - 1 && <ChevronDown className="inline-block text-red-500" />}
              {index !== 0 && index !== leaderboardData.length - 1 && <ChevronUp className="inline-block text-green-500" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PulsePlusLeagueStandings;