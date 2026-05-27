import { useState, useEffect } from 'react';

export const useTimer = (isRunning: boolean, startTime: string | null) => {
  const [formattedTime, setFormattedTime] = useState<string>('00:00:00');

  useEffect(() => {
    if (!isRunning || !startTime) {
      setFormattedTime('00:00:00');
      return;
    }

    const start = new Date(startTime).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const difference = now - start;

      if (difference <= 0) {
        setFormattedTime('00:00:00');
        return;
      }

      const totalSeconds = Math.floor(difference / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      const pad = (num: number) => String(num).padStart(2, '0');
      setFormattedTime(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    };

    updateTimer(); // run once immediately
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [isRunning, startTime]);

  return formattedTime;
};
