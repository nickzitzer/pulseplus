import React, { useState, useEffect } from 'react';
import PulsePlusProgressBar from '../gamification/PulsePlusProgressBar';
import api from '@/utils/api';
import { useFetch } from '@/utils/useFetch';
import { formatDate, formatProgress } from '@/utils/formatters';
import Image from '@/components/ui/PulsePlusImage';
import imageLoader, { ImageLoaderOptions } from '@/utils/imageLoaderUtil';

interface LeagueStats {
  leagueName: string;
  leagueColor: string;
  leagueImage: string;
  currentPoints: number;
  rankInLeague: number;
  totalCompetitors: number;
  pointsToNextRank: number;
  nextRankName: string;
}

interface PulsePlusMyLeagueStatsProps {
  gameId: string;
  competitorId: string;
}

const PulsePlusMyLeagueStats: React.FC<PulsePlusMyLeagueStatsProps> = ({ gameId, competitorId }) => {
  const [leagueStats, setLeagueStats] = useState<LeagueStats | null>(null);
  const [error, setError] = useState<string | null>(null);



  

  useEffect(() => {
    const fetchLeagueStats = async () => {
      try {
        const response = await api.get(`/league-stats?game=${gameId}&competitor=${competitorId}`);
        if (response.status !== 200) {
          throw new Error('Failed to fetch league stats');
        }
        const data = response.data;
        setLeagueStats(data);
      } catch (error) {
        console.error('Error fetching league stats:', error);
        setError('Failed to load league statistics. Please try again later.');
      }
    };

    fetchLeagueStats();
  }, [gameId, competitorId]);


  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!leagueStats) {
    return <div>Loading league statistics...</div>;
  }

  const percentileRank = ((leagueStats.totalCompetitors - leagueStats.rankInLeague + 1) / leagueStats.totalCompetitors) * 100;

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
      <div className="p-4" style={{ backgroundColor: leagueStats.leagueColor }}>
        <div className="flex items-center justify-between">
          <Image
            src={leagueStats.leagueImage}
            alt={leagueStats.leagueName}
            width={64}
            height={64}
            loader={({ src, width, quality }) => imageLoader({ src, width, quality, type: 'image' })}
            className="rounded-full"
          />
          <h2 className="text-2xl font-bold text-white">{leagueStats.leagueName}</h2>
        </div>
      </div>
      <div className="p-4">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Your Stats</h3>
          <p><strong>Current Points:</strong> {leagueStats.currentPoints}</p>
          <p><strong>Rank:</strong> {leagueStats.rankInLeague} / {leagueStats.totalCompetitors}</p>
        </div>
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">League Progress</h3>
          <PulsePlusProgressBar
            min={0}
            max={100}
            value={percentileRank}
            goal={100}
            unit="%"
            type="bar"
            title="Percentile Rank"
            colorStart={leagueStats.leagueColor}
            colorFinish={leagueStats.leagueColor}
          />
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2">Next Milestone</h3>
          <p>Earn {leagueStats.pointsToNextRank} more points to reach {leagueStats.nextRankName}</p>
          <PulsePlusProgressBar
            min={0}
            max={leagueStats.pointsToNextRank}
            value={leagueStats.currentPoints % leagueStats.pointsToNextRank}
            goal={leagueStats.pointsToNextRank}
            unit="points"
            type="bar"
            title="Progress to Next Rank"
            colorStart="#1F8476"
            colorFinish="#48C891"
          />
        </div>
      </div>
    </div>
  );
};

export default PulsePlusMyLeagueStats;