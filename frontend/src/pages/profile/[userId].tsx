import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { User, Award, Star, Activity, Users, Calendar } from 'lucide-react';
import { PulsePlusAchievements, PulsePlusBadges } from '@/components/gamification';
;
;
import { useAuth } from '@/context/auth';

const UserProfile = () => {
  const router = useRouter();
  const { userId } = router.query;
  const { user } = useAuth();
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (userId) {
      // Placeholder for API call to fetch user profile data
      const fetchProfileData = async () => {
        try {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Mock data
          setProfileData({
            id: userId,
            username: 'gamer123',
            displayName: 'Elite Gamer',
            avatar: '/avatars/default.png',
            level: 42,
            xp: 8750,
            nextLevelXp: 10000,
            joinDate: '2023-01-15',
            badges: [
              { id: 1, name: 'Early Adopter', icon: '🚀', description: 'Joined during beta phase' },
              { id: 2, name: 'Team Player', icon: '👥', description: 'Participated in 10 team events' },
              { id: 3, name: 'Champion', icon: '🏆', description: 'Won a seasonal competition' }
            ],
            achievements: [
              { id: 1, name: 'First Victory', description: 'Win your first competition', completed: true, date: '2023-02-10' },
              { id: 2, name: 'Social Butterfly', description: 'Add 10 friends', completed: true, date: '2023-03-05' },
              { id: 3, name: 'Dedicated Player', description: 'Log in for 30 consecutive days', completed: false, progress: 22 }
            ],
            stats: {
              gamesPlayed: 156,
              wins: 78,
              topThreeFinishes: 112,
              averageRank: 4.2
            },
            recentActivity: [
              { id: 1, type: 'achievement', description: 'Earned "Dedicated Player" achievement', date: '2023-04-18' },
              { id: 2, type: 'competition', description: 'Placed 2nd in "Spring Tournament"', date: '2023-04-15' },
              { id: 3, type: 'team', description: 'Joined team "Victory Seekers"', date: '2023-04-10' }
            ],
            teams: [
              { id: 1, name: 'Victory Seekers', role: 'Member', memberCount: 12, icon: '⚔️' },
              { id: 2, name: 'Weekend Warriors', role: 'Captain', memberCount: 8, icon: '🛡️' }
            ]
          });
        } catch (error) {
          console.error('Error fetching profile data:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchProfileData();
    }
  }, [userId]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading profile...</div>;
  }

  if (!profileData) {
    return <div className="flex justify-center items-center h-screen">User not found</div>;
  }

  const isOwnProfile = user?.sys_id === profileData.sys_id;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <User className="w-5 h-5" /> },
    { id: 'achievements', label: 'Achievements', icon: <Award className="w-5 h-5" /> },
    { id: 'badges', label: 'Badges', icon: <Star className="w-5 h-5" /> },
    { id: 'activity', label: 'Activity', icon: <Activity className="w-5 h-5" /> },
    { id: 'teams', label: 'Teams', icon: <Users className="w-5 h-5" /> }
  ];

  return (
    <>
      <Head>
        <title>{profileData.displayName} - Profile | PulsePlus</title>
      </Head>
      <div className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row items-center md:items-start">
            <div className="w-32 h-32 rounded-full overflow-hidden mb-4 md:mb-0 md:mr-6">
              <img 
                src={profileData.avatar} 
                alt={`${profileData.displayName}'s avatar`}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold">{profileData.displayName}</h1>
              <p className="text-gray-600">@{profileData.username}</p>
              <div className="mt-2 flex flex-wrap justify-center md:justify-start gap-4">
                <div className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm">
                  Level {profileData.level}
                </div>
                <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  Joined {new Date(profileData.joinDate).toLocaleDateString()}
                </div>
              </div>
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-indigo-600 h-2.5 rounded-full" 
                    style={{ width: `${(profileData.xp / profileData.nextLevelXp) * 100}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {profileData.xp} / {profileData.nextLevelXp} XP to next level
                </p>
              </div>
            </div>
            {isOwnProfile && (
              <div className="mt-4 md:mt-0">
                <button 
                  onClick={() => router.push('/profile/settings')}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition"
                >
                  Edit Profile
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="flex overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`flex items-center px-4 py-3 border-b-2 ${
                  activeTab === tab.id 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                <span className="ml-2">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {activeTab === 'overview' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Player Statistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-500 text-sm">Games Played</p>
                  <p className="text-2xl font-bold">{profileData.stats.gamesPlayed}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-500 text-sm">Wins</p>
                  <p className="text-2xl font-bold">{profileData.stats.wins}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-500 text-sm">Top 3 Finishes</p>
                  <p className="text-2xl font-bold">{profileData.stats.topThreeFinishes}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-500 text-sm">Average Rank</p>
                  <p className="text-2xl font-bold">{profileData.stats.averageRank}</p>
                </div>
              </div>

              <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
              <div className="space-y-4">
                {profileData.recentActivity.map((activity: any) => (
                  <div key={activity.id} className="border-l-4 border-indigo-500 pl-4 py-2">
                    <p className="font-medium">{activity.description}</p>
                    <p className="text-sm text-gray-500">{new Date(activity.date).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'achievements' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Achievements</h2>
              <PulsePlusAchievements gameId={profileData.active_game?.sys_id} competitorId={profileData.sys_id} />
            </div>
          )}

          {activeTab === 'badges' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Badges</h2>
              <PulsePlusBadges gameId={profileData.active_game?.sys_id} />
            </div>
          )}

          {activeTab === 'activity' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Activity Feed</h2>
              <div className="space-y-4">
                {profileData.recentActivity.map((activity: any) => (
                  <div key={activity.id} className="bg-gray-50 p-4 rounded-lg">
                    <p className="font-medium">{activity.description}</p>
                    <p className="text-sm text-gray-500">{new Date(activity.date).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'teams' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Teams</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profileData.teams.map((team: any) => (
                  <div key={team.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="text-2xl mr-3">{team.icon}</div>
                      <div>
                        <h3 className="font-bold">{team.name}</h3>
                        <p className="text-sm text-gray-600">Role: {team.role}</p>
                        <p className="text-sm text-gray-600">{team.memberCount} members</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => router.push(`/teams/${team.id}`)}
                      className="mt-3 w-full bg-indigo-100 text-indigo-700 px-3 py-1 rounded text-sm hover:bg-indigo-200 transition"
                    >
                      View Team
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UserProfile; 