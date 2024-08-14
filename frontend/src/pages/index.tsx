import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import useAuthenticatedFetch from '../utils/api';
import Head from 'next/head';
import Link from 'next/link';
import { Home, Target, Trophy, Compass, BarChart2, Medal, Star, Activity, LucideLayoutDashboard, HeartPulse } from 'lucide-react';

import PulsePlusTitle from '@/components/PulsePlusTitle';
import PulsePlusLeagueStandings from '@/components/PulsePlusLeagueStandings';
import PulsePlusBadges from '@/components/PulsePlusBadges';
import PulsePlusGoals from '@/components/PulsePlusGoals';
import PulsePlusCompetitions from '@/components/PulsePlusCompetitions';
import PulsePlusQuest from '@/components/PulsePlusQuest';
import PulsePlusKPIs from '@/components/PulsePlusKPIs';
import PulsePlusGameDropdown from '@/components/PulsePlusGameDropdown';
import PulsePlusHomeAvatar from '@/components/PulsePlusHomeAvatar';
import PulsePlusChat from '@/components/PulsePlusChat';
import PulsePlusSurvey from '@/components/PulsePlusSurvey';
import PulsePlusTimer from '@/components/PulsePlusTimer';
import PulsePlusMyLeagueStats from '@/components/PulsePlusMyLeagueStats';
import PulsePlusLeaderboard from '@/components/PulsePlusLeaderboard';
import PulsePlusNotifications from '@/components/PulsePlusNotifications';
import PulsePlusAchievements from '@/components/PulsePlusAchievements';
import { useAuth } from '@/context/auth';

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

const PulsePlusHome: React.FC = () => {
  const router = useRouter();
  const { tab = 'overview', game } = router.query;
  const activeTab = typeof tab === 'string' ? tab : 'overview';

  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [competitorId, setCompetitorId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchWithAuth = useAuthenticatedFetch();

  useEffect(() => {
    if (game) {
      setSelectedGame(game as string);
    }
  }, [game]);

  useEffect(() => {
    const fetchCompetitorId = async () => {
      if (user && user.sys_id) {
        try {
          const cachedCompetitorId = localStorage.getItem('cachedCompetitorId');
          if (cachedCompetitorId) {
            setCompetitorId(cachedCompetitorId);
          } else {
            const response = await fetchWithAuth(`/api/competitors/current`);
            if (!response.ok) {
              throw new Error('Failed to fetch competitor ID');
            }
            const data = await response.json();
            setCompetitorId(data.sys_id);
            localStorage.setItem('cachedCompetitorId', data.sys_id);
          }
        } catch (error) {
          console.error('Error fetching competitor ID:', error);
          setError('Failed to load user data. Please try again later.');
        }
      }
    };
  
    fetchCompetitorId();
  }, [user, fetchWithAuth]);

  

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
        <title>PulsePlus - Home</title>
        <meta name="description" content="PulsePlus Gamification Platform" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className="bg-sky-400 text-white p-4" style={{zIndex: 99999, position: 'sticky'}}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link  href="/">
            <div className="flex justify-between">
              <HeartPulse size={48} stroke="rgb(38, 34, 97)" fill="#ff7564"></HeartPulse>
              <p className="text-2xl font-bold" style={{ lineHeight: '48px', marginLeft: '12px' }}>PulsePlus</p>
            </div>
          </Link>
          <div className="flex items-center space-x-4">
            {user ? (<span><PulsePlusGameDropdown onGameSelect={handleGameSelect} />
            <PulsePlusNotifications />
            <PulsePlusHomeAvatar /></span>) : (<></>)}
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
                      activeTab === tab.id ? 'bg-sky-400 text-white' : 'text-gray-600 hover:bg-sky-100'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                </li>
              ))}
              <li>
                <Link href="/admin" className={`w-full flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors text-gray-600 hover:bg-sky-100`}>
                  <LucideLayoutDashboard className="w-5 h-5" />
                  <span>Admin Dashboard</span>
                </Link>
              </li>
            </ul>
          </nav>
          
          <div className="flex-1 md:ml-8">
            <PulsePlusTitle title={tabs.find(t => t.id === activeTab)?.label || ''} />
            {selectedGame ? (
              <div className="bg-white shadow rounded-lg p-6">
                {activeTab === 'overview' && (
                  <div className="space-y-8">
                    <PulsePlusMyLeagueStats gameId={selectedGame} competitorId={competitorId!} />
                    <PulsePlusLeaderboard gameId={selectedGame} />
                    <PulsePlusBadges gameId={selectedGame} />
                  </div>
                )}
                {activeTab === 'goals' && <PulsePlusGoals gameId={selectedGame} />}
                {activeTab === 'competitions' && <PulsePlusCompetitions gameId={selectedGame} />}
                {activeTab === 'quests' && <PulsePlusQuest gameId={selectedGame} />}
                {activeTab === 'league_standings' && <PulsePlusLeagueStandings gameId={selectedGame} />}
                {activeTab === 'stats' && <PulsePlusKPIs gameId={selectedGame} />}
                {activeTab === 'badges' && <PulsePlusBadges gameId={selectedGame} />}
                {activeTab === 'achievements' && <PulsePlusAchievements gameId={selectedGame} competitorId={competitorId!} />}
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
          <PulsePlusChat />
          <PulsePlusSurvey />
          <PulsePlusTimer eventId={selectedGame} />
        </>
      )}
    </div>
  );
};

export default PulsePlusHome;