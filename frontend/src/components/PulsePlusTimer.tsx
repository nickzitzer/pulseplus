import React, { useState, useEffect } from 'react';
import useAuthenticatedFetch from '../utils/api';

interface TimerProps {
  deadlineTimestamp?: number; // Unix timestamp
  eventId?: string; // ID to fetch deadline from API
  color?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const PulsePlusTimer: React.FC<TimerProps> = ({ deadlineTimestamp, eventId, color = 'rgba(31, 30, 34, .8)' }) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [deadline, setDeadline] = useState<number | null>(deadlineTimestamp || null);

  const fetchWithAuth = useAuthenticatedFetch();

  useEffect(() => {
    const fetchDeadline = async (id: string) => {
      try {
        const response = await fetchWithAuth(`/api/events/${id}/deadline`);
        if (!response.ok) {
          throw new Error('Failed to fetch deadline');
        }
        const data = await response.json();
        setDeadline(data.deadline);
      } catch (error) {
        console.error('Error fetching deadline:', error);
      }
    };

    if (eventId && !deadlineTimestamp) {
      fetchDeadline(eventId);
    }
  }, [eventId, deadlineTimestamp, fetchWithAuth]);

  useEffect(() => {
    const calculateTimeLeft = (): TimeLeft | null => {
      if (!deadline) return null;
  
      const difference = deadline - Date.now();
      if (difference <= 0) return null;
  
      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    };

    if (deadline) {
      const timer = setInterval(() => {
        setTimeLeft(calculateTimeLeft());
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [deadline]);

  

  if (!timeLeft) {
    return null; // or return a message that the event has ended
  }

  return (
    <div className="pulseplus-timer" style={{ backgroundColor: color, padding: '10px', borderRadius: '8px' }}>
      {Object.entries(timeLeft).map(([unit, value]) => (
        <div key={unit} className="timer-section" style={{ display: 'inline-block', margin: '0 10px' }}>
          <div className="timer-circle" style={{ 
            color: color, 
            backgroundColor: 'rgba(255,255,255,.7)',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            fontWeight: 'bold'
          }}>
            {value}
          </div>
          <div className="timer-text" style={{ color: '#fff', textAlign: 'center', marginTop: '5px' }}>
            {unit.charAt(0).toUpperCase() + unit.slice(1)}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PulsePlusTimer;