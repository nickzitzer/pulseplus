import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, User, Camera, Edit } from 'lucide-react';
import useAuthenticatedFetch from '../utils/api';
import { useAuth } from '../context/auth';
import { useRouter } from 'next/router';

interface UserProfile {
  sys_id: string;
  name: string;
  avatar: string;
  department: string;
  account_balance: number;
  total_earnings: number;
  total_badges: number;
  total_achievements: number;
  about_me: string;
}

const PulsePlusHomeAvatar: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEditingAboutMe, setIsEditingAboutMe] = useState(false);
  const [newAboutMe, setNewAboutMe] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { user, logout } = useAuth();
  const fetchWithAuth = useAuthenticatedFetch();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      setError('Failed to log out. Please try again.');
    }
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user && user.sys_id) {
        try {
          const response = await fetchWithAuth(`/api/competitors/current`);
          if (!response.ok) {
            throw new Error('Failed to fetch user profile');
          }
          const data = await response.json();
          setProfile(data);
          setNewAboutMe(data.about_me || '');
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setError('Failed to fetch user profile. Please try again.');
        }
      }
    };

    fetchUserProfile();
  }, [user, fetchWithAuth]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && profile) {
      const formData = new FormData();
      formData.append('avatar', file);

      try {
        const response = await fetchWithAuth(`/api/competitors/${profile.sys_id}/avatar`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to upload avatar');
        }

        const updatedProfile = await response.json();
        setProfile(updatedProfile);
      } catch (error) {
        console.error('Error uploading avatar:', error);
        setError('Failed to upload avatar. Please try again.');
      }
    }
  };

  const handleUpdateAboutMe = async () => {
    if (profile) {
      try {
        const response = await fetchWithAuth(`/api/competitors/${profile.sys_id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ about_me: newAboutMe }),
        });

        if (!response.ok) {
          throw new Error('Failed to update about me');
        }

        const updatedProfile = await response.json();
        setProfile(updatedProfile);
        setIsEditingAboutMe(false);
      } catch (error) {
        console.error('Error updating about me:', error);
        setError('Failed to update about me. Please try again.');
      }
    }
  };

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!profile) {
    return <div>Loading profile...</div>;
  }

  return (
    <div className="relative">
      <button
        className="flex items-center space-x-2"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
      >
        {profile.avatar ? (
          <img
            src={profile.avatar}
            alt={profile.name}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
            <User size={20} className="text-gray-500" />
          </div>
        )}
        <span className="font-medium">{profile.name}</span>
        <ChevronDown size={16} />
      </button>

      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="p-4">
            <div className="flex justify-between items-center mb-4 text-gray-800">
              <h3 className="text-lg font-bold">My Profile</h3>
              <button
                className="flex items-center space-x-1 text-blue-500"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera size={16} />
                <span className="text-sm">Edit Photo</span>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleAvatarUpload}
                accept="image/*"
              />
            </div>
            <h4 className="font-semibold mb-2 text-gray-800">My Experience</h4>
            <div className="space-y-2 text-gray-800">
              <div className="flex justify-between">
                <span>Account Balance:</span>
                <span className="font-bold">${profile.account_balance}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Earnings:</span>
                <span className="font-bold">${profile.total_earnings}</span>
              </div>
              <div className="flex justify-between">
                <span>Badges:</span>
                <span className="font-bold">{profile.total_badges}</span>
              </div>
              <div className="flex justify-between">
                <span>Achievements:</span>
                <span className="font-bold">{profile.total_achievements}</span>
              </div>
            </div>
          </div>
          <div className="bg-gray-100 p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold text-gray-800">About Me</h3>
              <button className="flex items-center space-x-1 text-blue-500" onClick={() => setIsEditingAboutMe(!isEditingAboutMe)}>
                <Edit size={16} />
                <span className="text-sm">Edit</span>
              </button>
            </div>
            {isEditingAboutMe ? (
              <div>
                <textarea
                  value={newAboutMe}
                  onChange={(e) => setNewAboutMe(e.target.value)}
                  className="w-full p-2 border rounded"
                />
                <button
                  onClick={handleUpdateAboutMe}
                  className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
                >
                  Save
                </button>
              </div>
            ) : (
              <p className="text-gray-600">
                {profile.about_me || 'No information provided yet.'}
              </p>
            )}
          </div>
          <div className="p-4 flex justify-center">
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 text-blue-500 hover:text-blue-700 transition-colors"
            >
              Log Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PulsePlusHomeAvatar;