import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import useAuthenticatedFetch from '../utils/api';
import Head from 'next/head';
import Link from 'next/link';
import { Home, Target, Trophy, Compass, BarChart2, Medal, Star, Activity, LucideLayoutDashboard } from 'lucide-react';

import EleVateTitle from '@/components/EleVateTitle';
import EleVateLeagueStandings from '@/components/EleVateLeagueStandings';
import EleVateBadges from '@/components/EleVateBadges';
import EleVateGoals from '@/components/EleVateGoals';
import EleVateCompetitions from '@/components/EleVateCompetitions';
import EleVateQuest from '@/components/EleVateQuest';
import EleVateKPIs from '@/components/EleVateKPIs';
import EleVateGameDropdown from '@/components/EleVateGameDropdown';
import EleVateHomeAvatar from '@/components/EleVateHomeAvatar';
import EleVateChat from '@/components/EleVateChat';
import EleVateSurvey from '@/components/EleVateSurvey';
import EleVateTimer from '@/components/EleVateTimer';
import EleVateMyLeagueStats from '@/components/EleVateMyLeagueStats';
import EleVateLeaderboard from '@/components/EleVateLeaderboard';
import EleVateNotifications from '@/components/EleVateNotifications';
import EleVateAchievements from '@/components/EleVateAchievements';

const tabs = [
  { id: 'overview', label: 'Overview', icon: <Home className="w-5 h-5" /> },
  { id: 'goals', label: 'Goals', icon: <Target className="w-5 h-5" /> },
  { id: 'competitions', label: 'Competitions', icon: <Trophy className="w-5 h-5" /> },
  { id: 'quests', label: 'Quests', icon: <Compass className="w-5 h-5" /> },
  { id: 'league_standings', label: 'League Standings', icon: <BarChart2 className="w-5 h-5" /> },
  { id: 'stats', label: 'Stats', icon: <Activity className="w-5 h-5" /> },
  { id: 'badges', label: 'Badges', icon: <Medal className="w-5 h-5" /> },
  { id: 'achievements', label: 'Achievements', icon: <Star className="w-5 h-5" /> }
];

const EleVateHome: React.FC = () => {
  const router = useRouter();
  const { tab = 'overview', game } = router.query;
  const activeTab = typeof tab === 'string' ? tab : 'overview';

  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [competitorId, setCompetitorId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchWithAuth = useAuthenticatedFetch();

  useEffect(() => {
    if (game) {
      setSelectedGame(game as string);
    }
  }, [game]);

  useEffect(() => {
    const fetchCompetitorId = async () => {
      try {
        // Assume we have an endpoint to get the current user's competitor ID
        const response = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_BASE_URL}/competitors/current`);
        if (!response.ok) {
          throw new Error('Failed to fetch competitor ID');
        }
        const data = await response.json();
        setCompetitorId(data.sys_id);
      } catch (error) {
        console.error('Error fetching competitor ID:', error);
        setError('Failed to load user data. Please try again later.');
      }
    };

    fetchCompetitorId();
  }, [fetchWithAuth]);

  

  const handleTabChange = (newTab: string) => {
    router.push({
      pathname: router.pathname,
      query: { ...router.query, tab: newTab },
    });
  };

  const handleGameSelect = (gameId: string) => {
    setSelectedGame(gameId);
    router.push({
      pathname: router.pathname,
      query: { ...router.query, game: gameId },
    });
  };

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="bg-gray-100 min-h-screen">
      <Head>
        <title>EleVate - Home</title>
        <meta name="description" content="EleVate Gamification Platform" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className="bg-teal-600 text-white p-4" style={{zIndex: 99999, position: 'sticky'}}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href="/">
            <p className="text-2xl font-bold">EleVate</p>
          </Link>
          <div className="flex items-center space-x-4">
            <EleVateGameDropdown onGameSelect={handleGameSelect} />
            <EleVateNotifications />
            <EleVateHomeAvatar />
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row">
          <nav className="md:w-64 mb-8 md:mb-0">
            <ul className="space-y-2">
              {tabs.map(tab => (
                <li key={tab.id}>
                  <button
                    onClick={() => handleTabChange(tab.id)}
                    className={`w-full flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      activeTab === tab.id ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-teal-100'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                </li>
              ))}
              <li>
                <Link href="/admin" className={`w-full flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors text-gray-600 hover:bg-teal-100`}>
                  <LucideLayoutDashboard className="w-5 h-5" />
                  <span>Admin Dashboard</span>
                </Link>
              </li>
            </ul>
          </nav>
          
          <div className="flex-1 md:ml-8">
            <EleVateTitle title={tabs.find(t => t.id === activeTab)?.label || ''} />
            {selectedGame ? (
              <div className="bg-white shadow rounded-lg p-6">
                {activeTab === 'overview' && (
                  <div className="space-y-8">
                    <EleVateMyLeagueStats gameId={selectedGame} competitorId={competitorId!} />
                    <EleVateLeaderboard gameId={selectedGame} />
                    <EleVateBadges gameId={selectedGame} />
                  </div>
                )}
                {activeTab === 'goals' && <EleVateGoals gameId={selectedGame} />}
                {activeTab === 'competitions' && <EleVateCompetitions gameId={selectedGame} />}
                {activeTab === 'quests' && <EleVateQuest gameId={selectedGame} />}
                {activeTab === 'league_standings' && <EleVateLeagueStandings gameId={selectedGame} />}
                {activeTab === 'stats' && <EleVateKPIs gameId={selectedGame} />}
                {activeTab === 'badges' && <EleVateBadges gameId={selectedGame} />}
                {activeTab === 'achievements' && <EleVateAchievements gameId={selectedGame} competitorId={competitorId!} />}
              </div>
            ) : (
              <div className="bg-white shadow rounded-lg p-6">
                <p className="text-center text-gray-600">Please select a game to view content.</p>
              </div>
            )}
          </div>
        </div>
      </main>
      
      {selectedGame && (
        <>
          <EleVateChat />
          <EleVateSurvey />
          <EleVateTimer eventId={selectedGame} />
        </>
      )}
    </div>
  );
};

export default EleVateHome;