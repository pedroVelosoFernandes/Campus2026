import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import NotificacoesScreen from '@/app/(tabs)/(inicio)/notificacoes';
import { resetNotificationsStore, STORAGE_KEY } from '@/features/notifications';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn(() => true) },
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: 'success' },
}));
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('lembrete-1')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  setNotificationHandler: jest.fn(),
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

const notifications = jest.mocked(Notifications);
const undetermined = { granted: false, canAskAgain: true, status: 'undetermined', expires: 'never' };
const granted = { granted: true, canAskAgain: true, status: 'granted', expires: 'never' };
const denied = { granted: false, canAskAgain: false, status: 'denied', expires: 'never' };

const METRICS = { frame: { x: 0, y: 0, width: 402, height: 874 }, insets: { top: 62, left: 0, right: 0, bottom: 34 } };
const CAMPAIGN = 'Campanha de vacinação contra a gripe';

async function renderScreen() {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <NotificacoesScreen />
    </SafeAreaProvider>,
  );
  await act(async () => {}); // hidratação do AsyncStorage
}

describe('Tela Notificações', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    resetNotificationsStore();
    await AsyncStorage.clear();
  });

  it('lista as notificações de demonstração, todas não lidas', async () => {
    await renderScreen();

    expect(screen.getByRole('header', { name: 'Notificações' })).toBeTruthy();
    expect(screen.getByText('3 não lidas')).toBeTruthy();
    expect(screen.getByRole('button', { name: new RegExp(`^Não lida\\. ${CAMPAIGN}`) })).toBeTruthy();
    expect(screen.getByText('Consulta de rotina na terça')).toBeTruthy();
    expect(screen.getByText('Aviso da UBS do seu bairro')).toBeTruthy();
  });

  it('tocar marca como lida e persiste no AsyncStorage', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: /^Não lida\. Consulta de rotina/ }));

    expect(screen.getByText('2 não lidas')).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Consulta de rotina na terça/ })).toBeTruthy();
    const saved = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) ?? '{}');
    expect(saved.readIds).toEqual(['consulta-rotina-ubs']);
  });

  it('restaura o estado de leitura salvo', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ readIds: ['aviso-ubs-horario'], dismissedIds: [], reminders: {} }),
    );
    await renderScreen();
    expect(screen.getByText('2 não lidas')).toBeTruthy();
  });

  it('"Marcar todas como lidas" zera as não lidas', async () => {
    await renderScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Marcar todas como lidas' }));

    expect(screen.getByText('Nenhuma não lida')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Marcar todas como lidas' })).toBeNull();
  });

  it('remover todas mostra o estado vazio', async () => {
    await renderScreen();
    for (const title of [CAMPAIGN, 'Consulta de rotina na terça', 'Aviso da UBS do seu bairro']) {
      await fireEvent.press(screen.getByRole('button', { name: `Remover notificação: ${title}` }));
    }
    expect(screen.getByTestId('notificacoes-vazio')).toBeTruthy();
    expect(screen.getByText('Tudo em dia')).toBeTruthy();
  });

  it('explica antes de pedir permissão e agenda o lembrete se permitido', async () => {
    notifications.getPermissionsAsync.mockResolvedValue(undetermined as never);
    notifications.requestPermissionsAsync.mockResolvedValue(granted as never);
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Lembrar da vacina' }));
    expect(screen.getByText('Quer um lembrete da vacina?')).toBeTruthy();
    expect(notifications.requestPermissionsAsync).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'Permitir lembretes' }));

    expect(notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({ title: 'Lembrete: vacina da gripe' }),
        trigger: expect.objectContaining({ type: 'date' }),
      }),
    );
    expect(screen.getByText('Lembrete agendado')).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Lembrete agendado para amanhã às 9h/ })).toBeTruthy();
  });

  it('"Agora não" fecha a explicação sem pedir permissão', async () => {
    notifications.getPermissionsAsync.mockResolvedValue(undetermined as never);
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Lembrar da vacina' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Agora não' }));

    expect(screen.queryByText('Quer um lembrete da vacina?')).toBeNull();
    expect(notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('com permissão negada, avisa e oferece abrir os Ajustes', async () => {
    notifications.getPermissionsAsync.mockResolvedValue(denied as never);
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Lembrar da vacina' }));

    expect(notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(screen.getByText('Notificações desativadas')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Abrir Ajustes' }));
    expect(openSettings).toHaveBeenCalled();
  });

  it('tocar no lembrete agendado o cancela', async () => {
    notifications.getPermissionsAsync.mockResolvedValue(granted as never);
    await renderScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Lembrar da vacina' }));
    const card = screen.getByTestId('notificacao-campanha-gripe-2026');
    await fireEvent.press(within(card).getByRole('button', { name: /^Lembrete agendado/ }));

    expect(notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('lembrete-1');
    expect(screen.getByRole('button', { name: 'Lembrar da vacina' })).toBeTruthy();
  });
});
