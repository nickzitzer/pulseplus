import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, User, Camera, Edit } from 'lucide-react';
import useAuthenticatedFetch from '../utils/api';
import { useAuth } from '../context/auth';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Cookies from 'js-cookie';

const PulsePlusHomeAvatar: React.FC = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEditingAboutMe, setIsEditingAboutMe] = useState(false);
  const [newAboutMe, setNewAboutMe] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { user, competitor, logout, updateCompetitor } = useAuth();
  const fetchWithAuth = useAuthenticatedFetch();
  const router = useRouter();

  useEffect(() => {
    if (competitor?.about_me) {
      setNewAboutMe(competitor.about_me);
    }
  }, [competitor?.about_me]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      setError('Failed to log out. Please try again.');
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && competitor) {
      const formData = new FormData();
      formData.append('avatar', file);

      try {
        const response = await fetchWithAuth(`/competitors/${competitor.sys_id}`, {
          method: 'PATCH',
          data: formData,
        });

        const avatarUrl = response.data.avatar || response.data.image_url;
        const updatedCompetitor = { ...competitor, avatar: avatarUrl };
        updateCompetitor(updatedCompetitor);
        
        Cookies.set('competitor_data', JSON.stringify(updatedCompetitor), { expires: 7 });
      } catch (error) {
        console.error('Error uploading avatar:', error);
        setError('Failed to upload avatar. Please try again.');
      }
    }
  };

  const handleUpdateAboutMe = async () => {
    if (competitor) {
      try {
        const response = await fetchWithAuth(`/competitors/${competitor.sys_id}`, {
          method: 'PATCH',
          data: { about_me: newAboutMe },
        });
        const updatedCompetitor = { ...competitor, about_me: newAboutMe } as typeof competitor;
        updateCompetitor(updatedCompetitor);
        
        Cookies.set('competitor_data', JSON.stringify(updatedCompetitor), { expires: 7 });
        
        setIsEditingAboutMe(false);
      } catch (error) {
        console.error('Error updating about me:', error);
        setError('Failed to update about me. Please try again.');
      }
    }
  };

  if (!user || !competitor) {
    return <div>Loading profile...</div>;
  }

  return (
    <div className="relative">
      <button
        className="flex items-center space-x-2"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
      >
        {competitor.avatar ? (
          <Image
            src={competitor.avatar || '/default-avatar.png'}
            alt={`${user.first_name} ${user.last_name}`}
            width={40}
            height={40}
            className="rounded-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.src = '/default-avatar.png';
            }}
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
            <User size={20} className="text-gray-500" />
          </div>
        )}
        <span className="font-medium">{`${user.first_name} ${user.last_name}`}</span>
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
                <span className="font-bold">${competitor.account_balance}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Earnings:</span>
                <span className="font-bold">${competitor.total_earnings}</span>
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
                  className="w-full p-2 border rounded text-gray-800 bg-white"
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
                {competitor.about_me || 'No information provided yet.'}
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
      {error && <div className="text-red-500 mt-2">{error}</div>}
    </div>
  );
};

export default PulsePlusHomeAvatar;