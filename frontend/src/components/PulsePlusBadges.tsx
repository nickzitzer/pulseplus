import React, { useState, useEffect, ReactNode } from 'react';
import useAuthenticatedFetch from '../utils/api';
import { Star } from 'lucide-react';

interface PulsePlusBadgesProps {
  gameId: string | undefined;
}

const PulsePlusBadges: React.FC<PulsePlusBadgesProps> = ({ gameId }) => {
  const [badges, setBadges] = useState([]);
  const [error, setError] = useState<string | null>(null);

  const fetchWithAuth = useAuthenticatedFetch();

  function lightenDarkenColor(col: string, amt: number): string {
    let usePound = false;
  
    if (col[0] === "#") {
      col = col.slice(1);
      usePound = true;
    }
  
    const num = parseInt(col, 16);
  
    let r = (num >> 16) + amt;
    r = Math.min(255, Math.max(0, r));
  
    let b = ((num >> 8) & 0x00FF) + amt;
    b = Math.min(255, Math.max(0, b));
  
    let g = (num & 0x0000FF) + amt;
    g = Math.min(255, Math.max(0, g));
  
    let result = (g | (b << 8) | (r << 16)).toString(16);
    if (result.length < 6) {
      result = '0' + result;
    }
  
    return (usePound ? "#" : "") + result;
  }

  useEffect(() => {
    const fetchBadges = async (gameId: string) => {
      try {
        const response = await fetchWithAuth(`/api/badges?game=${gameId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch badges');
        }
        const data = await response.json();
        setBadges(data);
      } catch (error) {
        console.error('Error fetching badges:', error);
        setError('Failed to load badges. Please try again later.');
      }
    };

    if (gameId) {
      fetchBadges(gameId);
    }
  }, [gameId, fetchWithAuth]);

  

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="pulseplus-badge-container">
      <h2 className="text-2xl font-bold mb-4">Your Badges</h2>
      {badges.length === 0 ? (
        <p>No badges earned yet. Keep playing to earn badges!</p>
      ) : (
        <div className="flex flex-wrap justify-center gap-6">
          {badges.map((badge: {
            name: string;
            image: string;
            sys_id: string;
            color: string;
            sys_created_on: string;
          }) => (
            <div 
              key={badge.sys_id} 
              className="pulseplus-badge" 
              style={{
                background: `linear-gradient(to bottom right, ${lightenDarkenColor(badge.color, 60)} 0%, ${lightenDarkenColor(badge.color, 20)} 100%)`,
                color: badge.color
              }}
              title={new Date(badge.sys_created_on).toLocaleDateString()}
            >
              <div className="badge-circle">
                {badge.image ? (
                  <img src={badge.image} alt={badge.name} />
                ) : (
                  <Star size={24} color={`${lightenDarkenColor(badge.color, -60)}`} />
                )}
              </div>
              <div className="badge-ribbon">{badge.name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PulsePlusBadges;