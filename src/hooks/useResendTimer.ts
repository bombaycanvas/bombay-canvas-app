import { useCallback, useEffect, useState } from 'react';

/** Countdown for "Resend OTP". `restart()` after each successful send. */
export const useResendTimer = (seconds = 30, active = true) => {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (!active || remaining <= 0) return;
    const id = setInterval(
      () => setRemaining(prev => Math.max(prev - 1, 0)),
      1000,
    );
    return () => clearInterval(id);
  }, [active, remaining]);

  const restart = useCallback(() => setRemaining(seconds), [seconds]);

  return { remaining, restart };
};

export const formatResendLabel = (remaining: number) =>
  remaining > 0
    ? `Resend OTP in 00:${remaining < 10 ? `0${remaining}` : remaining}`
    : 'Resend OTP';
