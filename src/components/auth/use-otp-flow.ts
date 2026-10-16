import * as Haptics from 'expo-haptics';
import { useState } from 'react';

import { isOtpCode, useAuth } from '@/features/auth';
import { getPendingLogin, setPendingLogin } from '@/features/auth/pending-login';

import { leaveAuthFlow } from './navigation';
import { useCountdown } from './use-countdown';

const haptic = (type: Haptics.NotificationFeedbackType) => void Haptics.notificationAsync(type).catch(() => {});

/** Estado da tela do código: conferência, erro e reenvio com contagem regressiva. */
export function useOtpFlow() {
  const { verifyCode, requestCode } = useAuth();
  const [pending, setPending] = useState(getPendingLogin);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const { remaining, restart } = useCountdown(pending?.retryAfterSeconds ?? 30);

  const confirm = async (value: string) => {
    if (!pending || !isOtpCode(value) || checking) return;
    setChecking(true);
    setError(null);
    const message = await verifyCode(pending.phone, value);
    setChecking(false);
    if (message) {
      setError(message);
      setCode('');
      haptic(Haptics.NotificationFeedbackType.Error);
      return;
    }
    haptic(Haptics.NotificationFeedbackType.Success);
    setPendingLogin(null);
    leaveAuthFlow();
  };

  const resend = async () => {
    if (!pending) return;
    setError(null);
    const result = await requestCode(pending.phone);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const next = { ...pending, retryAfterSeconds: result.retryAfterSeconds, hint: result.hint };
    setPendingLogin(next);
    setPending(next);
    restart(result.retryAfterSeconds);
  };

  const changeCode = (value: string) => {
    setCode(value);
    setError(null);
  };

  return { pending, code, changeCode, error, checking, remaining, confirm, resend };
}
