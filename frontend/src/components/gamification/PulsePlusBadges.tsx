import React, { useState, useEffect, ReactNode } from 'react';
import api from '@/utils/api';
import { useFetch } from '@/utils/useFetch';
import { formatDate, formatProgress } from '@/utils/formatters';
import { Star } from 'lucide-react';
import Image from '@/components/ui/PulsePlusImage';
import imageLoader, { ImageLoaderOptions } from '@/utils/imageLoaderUtil';

interface Badge {
  sys_id: string;
  name: string;
  description: string;
  image_url: string;
  color: string;
  unlocked: boolean;
  unlock_date?: string;
}

interface PulsePlusBadgesProps {
  gameId: string | undefined;
}

const PulsePlusBadges: React.FC<PulsePlusBadgesProps> = ({ gameId }) => {
  // Using useFetch hook instead of manual fetch
  const { 
    data: badges = null, 
    loading, 
    error 
  } = useFetch<Badge[]>(
    gameId ? `/badges?game=${gameId}` : '',
    {
      initialFetch: !!gameId,
      dependencies: [gameId]
    }
  );

  // Helper function to lighten or darken a color
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

  if (!gameId) {
    return <div className="text-center p-4">No game selected</div>;
  }

  if (loading) {
    return <div className="text-center p-4">Loading badges...</div>;
  }

  if (error) {
    return <div className="text-center p-4 text-red-500">Failed to load badges</div>;
  }

  if (badges === null || badges.length === 0) {
    return <div className="text-center p-4">No badges available for this game</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {badges && badges.map((badge) => (
        <div 
          key={badge.sys_id} 
          className={`relative rounded-lg overflow-hidden shadow-md ${
            badge.unlocked ? 'opacity-100' : 'opacity-60'
          }`}
          style={{ 
            backgroundColor: badge.color,
            borderColor: lightenDarkenColor(badge.color, -40),
            borderWidth: '1px',
            borderStyle: 'solid'
          }}
        >
          <div 
            className="absolute inset-0 opacity-10" 
            style={{ 
              background: `radial-gradient(circle at 30% 30%, ${lightenDarkenColor(badge.color, 50)}, transparent 70%)` 
            }} 
          />
          
          <div className="p-4 relative z-10">
            <div className="flex items-center mb-2">
              <div className="w-16 h-16 mr-3 rounded-full overflow-hidden bg-white p-1">
                <Image
                  src={badge.image_url}
                  alt={badge.name}
                  width={56}
                  height={56}
                  type="achievement"
                />
              </div>
              
              <div>
                <h3 className="font-bold text-lg" style={{ color: lightenDarkenColor(badge.color, -100) }}>
                  {badge.name}
                </h3>
                <p className="text-sm" style={{ color: lightenDarkenColor(badge.color, -80) }}>
                  {badge.description}
                </p>
              </div>
            </div>
            
            {badge.unlocked ? (
              <div 
                className="flex items-center text-sm mt-2 font-medium" 
                style={{ color: lightenDarkenColor(badge.color, -100) }}
              >
                <Star className="w-4 h-4 mr-1" />
                <span>Earned on {formatDate(badge.unlock_date || '', 'short')}</span>
              </div>
            ) : (
              <div 
                className="text-sm mt-2 font-medium" 
                style={{ color: lightenDarkenColor(badge.color, -80) }}
              >
                Complete the required actions to earn this badge
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PulsePlusBadges;