import React, { useState, useEffect } from 'react';
import { X, Award, BarChart2, Medal } from 'lucide-react';
import Image from 'next/image'
import PulsePlusProgressBar from './PulsePlusProgressBar';
import PulsePlusLeagueStandings from './PulsePlusLeagueStandings';
import PulsePlusBadges from './PulsePlusBadges';
import PulsePlusKPIs from './PulsePlusKPIs';
import useAuthenticatedFetch from '../utils/api';

interface CompetitorData {
  sys_id: string;
  name: string;
  avatar: string;
  department: string;
  league: {
    name: string;
    color: string;
    image: string;
  };
  stats: {
    points: number;
    rank: number;
    totalCompetitors: number;
  };
}

interface PulsePlusCompetitorCardProps {
  competitorId: string;
  gameId: string;
  onClose: () => void;
}

const PulsePlusCompetitorCard: React.FC<PulsePlusCompetitorCardProps> = ({ competitorId, gameId, onClose }) => {
  const [activeTab, setActiveTab] = useState('league_standings');
  const [competitorData, setCompetitorData] = useState<CompetitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWithAuth = useAuthenticatedFetch();

  useEffect(() => {
    const fetchCompetitorData = async () => {
      try {
        setLoading(true);
        const response = await fetchWithAuth(`/api/competitors/${competitorId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch competitor data');
        }
        const data = await response.json();
        
        // Fetch league data
        const leagueResponse = await fetchWithAuth(`/api/level-instance-members?competitor=${competitorId}&game=${gameId}`);
        if (!leagueResponse.ok) {
          throw new Error('Failed to fetch league data');
        }
        const leagueData = await leagueResponse.json();
        
        // Combine and format the data
        const formattedData: CompetitorData = {
          sys_id: data.sys_id,
          name: `${data.user.first_name} ${data.user.last_name}`,
          avatar: data.avatar || '/next.svg',
          department: data.user.department.name,
          league: {
            name: leagueData.level.name,
            color: leagueData.level.color,
            image: leagueData.level.image,
          },
          stats: {
            points: leagueData.points,
            rank: leagueData.place,
            totalCompetitors: leagueData.total_competitors,
          },
        };

        setCompetitorData(formattedData);
      } catch (err) {
        console.error('Error fetching competitor data:', err);
        setError('Failed to load competitor data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchCompetitorData();
  }, [competitorId, gameId, fetchWithAuth]);

  const tabs = [
    { id: 'league_standings', label: 'League', icon: <BarChart2 className="w-4 h-4" /> },
    { id: 'stats', label: 'Stats', icon: <Award className="w-4 h-4" /> },
    { id: 'badges', label: 'Badges', icon: <Medal className="w-4 h-4" /> },
  ];

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!competitorData) {
    return <div>No competitor data available.</div>;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="relative h-48 bg-gradient-to-r from-blue-500 to-teal-500">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-white hover:text-gray-200"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={competitorData.avatar}
            alt={competitorData.name}
            className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 w-32 h-32 rounded-full border-4 border-white"
          />
        </div>
        <div className="mt-20 p-6">
          <h2 className="text-3xl font-bold text-center">{competitorData.name}</h2>
          <p className="text-center text-gray-600">{competitorData.department}</p>
          <div className="flex justify-center mt-4 space-x-2">
            <PulsePlusProgressBar
              min={0}
              max={competitorData.stats.totalCompetitors}
              value={competitorData.stats.totalCompetitors - competitorData.stats.rank + 1}
              goal={competitorData.stats.totalCompetitors}
              unit="rank"
              type="circle"
              title="League Rank"
              colorStart={competitorData.league.color}
              colorFinish={competitorData.league.color}
            />
          </div>
          <div className="mt-6">
            <div className="flex border-b">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`flex-1 py-2 px-4 flex items-center justify-center ${
                    activeTab === tab.id
                      ? 'border-b-2 border-teal-500 text-teal-500'
                      : 'text-gray-500 hover:text-teal-500'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.icon}
                  <span className="ml-2">{tab.label}</span>
                </button>
              ))}
            </div>
            <div className="mt-4 max-h-64 overflow-y-auto">
              {activeTab === 'league_standings' && <PulsePlusLeagueStandings gameId={gameId} />}
              {activeTab === 'stats' && <PulsePlusKPIs gameId={gameId} />}
              {activeTab === 'badges' && <PulsePlusBadges gameId={gameId} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PulsePlusCompetitorCard;