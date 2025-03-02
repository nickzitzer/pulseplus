import { useState, useEffect, useCallback } from 'react';
import api from './api';

export interface GameState {
  id: string;
  userId: string;
  score: number;
  level: number;
  achievements: string[];
  inventory: Record<string, number>;
  lastSaved: Date;
  isActive: boolean;
  gameSettings: Record<string, any>;
}

interface GameStateOptions {
  autoSave?: boolean;
  autoSaveInterval?: number; // in milliseconds
  onSaveSuccess?: (state: GameState) => void;
  onSaveError?: (error: Error) => void;
  onLoadSuccess?: (state: GameState) => void;
  onLoadError?: (error: Error) => void;
}

export function useGameState(gameId: string, options: GameStateOptions = {}) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  const defaultOptions: GameStateOptions = {
    autoSave: true,
    autoSaveInterval: 60000, // 1 minute
    ...options,
  };

  // Load game state
  const loadGameState = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/games/${gameId}/state`);
      const loadedState = {
        ...response.data,
        lastSaved: new Date(response.data.lastSaved),
      };
      setGameState(loadedState);
      setIsDirty(false);
      if (defaultOptions.onLoadSuccess) {
        defaultOptions.onLoadSuccess(loadedState);
      }
      return loadedState;
    } catch (err) {
      const error = err as Error;
      setError(error);
      if (defaultOptions.onLoadError) {
        defaultOptions.onLoadError(error);
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }, [gameId, defaultOptions]);

  // Save game state
  const saveGameState = useCallback(async (force: boolean = false) => {
    if (!gameState) return null;
    if (!isDirty && !force) return gameState;

    try {
      const response = await api.put(`/games/${gameId}/state`, gameState);
      const savedState = {
        ...response.data,
        lastSaved: new Date(response.data.lastSaved),
      };
      setGameState(savedState);
      setIsDirty(false);
      if (defaultOptions.onSaveSuccess) {
        defaultOptions.onSaveSuccess(savedState);
      }
      return savedState;
    } catch (err) {
      const error = err as Error;
      setError(error);
      if (defaultOptions.onSaveError) {
        defaultOptions.onSaveError(error);
      }
      throw error;
    }
  }, [gameId, gameState, isDirty, defaultOptions]);

  // Update game state
  const updateGameState = useCallback((updater: (state: GameState) => GameState) => {
    setGameState(prevState => {
      if (!prevState) return null;
      const newState = updater(prevState);
      setIsDirty(true);
      return newState;
    });
  }, []);

  // Auto-save effect
  useEffect(() => {
    if (!defaultOptions.autoSave || !isDirty) return;

    const timer = setTimeout(() => {
      saveGameState();
    }, defaultOptions.autoSaveInterval);

    return () => clearTimeout(timer);
  }, [isDirty, saveGameState, defaultOptions]);

  // Initial load
  useEffect(() => {
    loadGameState();
  }, [loadGameState]);

  // Save on unmount if dirty
  useEffect(() => {
    return () => {
      if (isDirty && gameState) {
        saveGameState();
      }
    };
  }, [isDirty, gameState, saveGameState]);

  return {
    gameState,
    loading,
    error,
    isDirty,
    updateGameState,
    saveGameState,
    loadGameState,
    setScore: useCallback((score: number) => {
      updateGameState(state => ({ ...state, score }));
    }, [updateGameState]),
    setLevel: useCallback((level: number) => {
      updateGameState(state => ({ ...state, level }));
    }, [updateGameState]),
    addAchievement: useCallback((achievement: string) => {
      updateGameState(state => ({
        ...state,
        achievements: [...state.achievements, achievement],
      }));
    }, [updateGameState]),
    updateInventory: useCallback((itemId: string, quantity: number) => {
      updateGameState(state => ({
        ...state,
        inventory: {
          ...state.inventory,
          [itemId]: (state.inventory[itemId] || 0) + quantity,
        },
      }));
    }, [updateGameState]),
  };
}

export default useGameState; 