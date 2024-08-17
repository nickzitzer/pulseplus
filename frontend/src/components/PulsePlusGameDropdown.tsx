import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown, GamepadIcon } from 'lucide-react';
import useAuthenticatedFetch from '../utils/api';
import Image from 'next/image';
import imageLoader from '@/utils/imageLoader';

interface Game {
  sys_id: string;
  name: string;
  description: string;
  image_url: string;
  competition_count: number;
}

interface PulsePlusGameDropdownProps {
  onGameSelect: (gameId: string) => void;
}

const PulsePlusGameDropdown: React.FC<PulsePlusGameDropdownProps> = React.memo(({ onGameSelect }) => {
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWithAuth = useAuthenticatedFetch();

  const fetchGames = useCallback(async () => {
    try {
      const response = await fetchWithAuth('/games');
      const data = response.data;
      setGames(data);
      if (data.length > 0 && !selectedGame) {
        setSelectedGame(data[0]);
        onGameSelect(data[0].sys_id);
      }
    } catch (error) {
      console.error('Error fetching games:', error);
      setError('Failed to load games. Please try again later.');
    }
  }, [fetchWithAuth, onGameSelect, selectedGame]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const handleGameSelect = useCallback((game: Game) => {
    setSelectedGame(game);
    setIsOpen(false);
    onGameSelect(game.sys_id);
  }, [onGameSelect]);

  const toggleDropdown = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const renderGameIcon = useCallback((game: Game) => {
    if (game.image_url) {
      return <Image src={game.image_url} alt={game.name} width={32} height={32} loader={({ src, width, quality }) => imageLoader({ src, width, quality })} className="w-8 h-8 mr-3 rounded-full" />;
    }
    return <GamepadIcon className="w-8 h-8 mr-3 text-gray-400" />;
  }, []);

  const renderedGames = useMemo(() => {
    return games.map((game) => (
      <button
        key={game.sys_id}
        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
        role="menuitem"
        onClick={() => handleGameSelect(game)}
      >
        <div className="flex items-center">
        {renderGameIcon(game)}
          <div>
            <p className="font-medium">{game.name}</p>
            <p className="text-xs text-gray-500">{game.description}</p>
            <p className="text-xs text-indigo-600 mt-1">{game.competition_count} active competitions</p>
          </div>
        </div>
      </button>
    ));
  }, [games, handleGameSelect, renderGameIcon]);

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="relative inline-block text-left">
      <div>
        <button
          type="button"
          className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500"
          id="game-menu"
          aria-expanded={isOpen}
          aria-haspopup="true"
          onClick={toggleDropdown}
        >
          {selectedGame ? (
            <span className="flex items-center">
              {renderGameIcon(selectedGame)}
              {selectedGame.name}
            </span>
          ) : (
            'Select Game'
          )}
          <ChevronDown className="-mr-1 ml-2 h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none" role="menu" aria-orientation="vertical" aria-labelledby="game-menu">
          <div className="py-1" role="none">
            {renderedGames}
          </div>
        </div>
      )}
    </div>
  );
});

PulsePlusGameDropdown.displayName = 'PulsePlusGameDropdown';

export default PulsePlusGameDropdown;