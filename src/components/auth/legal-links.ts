import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';

import { readAuthEnv } from '@/features/auth/config';
import { colors } from '@/theme';

export type LegalDoc = 'termos' | 'privacidade';

/** Abre a versão publicada (EXPO_PUBLIC_TERMS_URL / _PRIVACY_URL) ou o resumo dentro do app. */
export async function openLegalDocument(doc: LegalDoc): Promise<void> {
  const env = readAuthEnv();
  const url = doc === 'termos' ? env.termsUrl : env.privacyUrl;
  if (url) {
    try {
      await WebBrowser.openBrowserAsync(url, { controlsColor: colors.primary });
      return;
    } catch {
      // cai para a versão dentro do app
    }
  }
  router.push({ pathname: '/legal', params: { doc } });
}
