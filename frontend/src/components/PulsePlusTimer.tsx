import React, { useState, useEffect } from 'react';

interface TimerProps {
  deadline: Date | string; // Date object or ISO date string
  color?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const PulsePlusTimer: React.FC<TimerProps> = ({ deadline, color = 'rgba(31, 30, 34, .8)' }) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

  useEffect(() => {
    const calculateTimeLeft = (): TimeLeft | null => {
      const targetDate = deadline instanceof Date ? deadline : new Date(deadline);
      const difference = targetDate.getTime() - Date.now();
      if (difference <= 0) return null;

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    };

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
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