import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated';

import { SettingsContext, type SettingsContextValue } from './context';
import { applyPatch } from './logic';
import { loadSettings, saveSettings } from './storage';
import { DEFAULT_SETTINGS, type Settings, type SettingsPatch } from './types';

export type SettingsProviderProps = {
  children: ReactNode;
  /** Para testes: começa com estas preferências em vez de ler o armazenamento. */
  initialSettings?: Settings;
};

/**
 * Carrega as preferências salvas, persiste cada alteração e aplica
 * "Reduzir animações" globalmente (todas as animações do Reanimated com
 * `ReduceMotion.System` passam a ser reduzidas).
 */
export function SettingsProvider({ children, initialSettings }: SettingsProviderProps) {
  const [settings, setSettings] = useState<Settings>(initialSettings ?? DEFAULT_SETTINGS);
  const [ready, setReady] = useState(!!initialSettings);

  useEffect(() => {
    if (initialSettings) return;
    let active = true;
    loadSettings().then((loaded) => {
      if (!active) return;
      setSettings(loaded);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [initialSettings]);

  // Só grava depois de uma alteração feita pela pessoa (não ao carregar nem ao apagar os dados).
  const dirty = useRef(false);

  useEffect(() => {
    if (!dirty.current) return;
    saveSettings(settings).catch(() => {
      // Sem armazenamento a preferência vale só nesta sessão.
    });
  }, [settings]);

  const update = useCallback((patch: SettingsPatch) => {
    dirty.current = true;
    setSettings((current) => applyPatch(current, patch));
  }, []);

  const reset = useCallback(() => {
    dirty.current = false;
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const value = useMemo<SettingsContextValue>(() => ({ settings, ready, update, reset }), [ready, reset, settings, update]);

  // Evita um quadro com o tamanho de texto errado enquanto a leitura (rápida) termina.
  if (!ready) return null;

  return (
    <SettingsContext value={value}>
      <ReducedMotionConfig mode={settings.accessibility.reduceMotion ? ReduceMotion.Always : ReduceMotion.System} />
      {children}
    </SettingsContext>
  );
}
