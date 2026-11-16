import { useEffect, useState } from 'react';

export default function useReservationCountdown(reservedUntil: string | null) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (reservedUntil === null)
      return;

    setNow(Date.now());

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [reservedUntil]);

  if (reservedUntil === null)
    return null;

  const totalSeconds = Math.max(0, Math.ceil((Date.parse(reservedUntil) - now) / 1000));

  return {
    isExpired: totalSeconds === 0,
    label: `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`
  };
}
