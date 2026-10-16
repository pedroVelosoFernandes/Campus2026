import AsyncStorage from '@react-native-async-storage/async-storage';

import { nextMorning } from '../reminders';
import { loadState, STORAGE_KEY } from '../storage';
import {
  dismissNotification,
  hydrateNotifications,
  markAsRead,
  resetNotificationsStore,
  selectNotifications,
  setReminder,
} from '../store';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-notifications', () => ({}));

const flush = () => new Promise<void>((resolve) => setImmediate(() => resolve()));
const saved = async () => JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) ?? 'null');

describe('estado das notificações', () => {
  beforeEach(async () => {
    resetNotificationsStore();
    await AsyncStorage.clear();
  });

  it('selectNotifications esconde as removidas e marca as lidas', () => {
    const items = selectNotifications({
      readIds: ['consulta-rotina-ubs'],
      dismissedIds: ['aviso-ubs-horario'],
      reminders: { 'campanha-gripe-2026': 'abc' },
    });
    expect(items.map((item) => [item.id, item.read, item.reminderId])).toEqual([
      ['campanha-gripe-2026', false, 'abc'],
      ['consulta-rotina-ubs', true, null],
    ]);
  });

  it('persiste leitura, remoção e lembretes', async () => {
    markAsRead('consulta-rotina-ubs');
    dismissNotification('aviso-ubs-horario');
    setReminder('campanha-gripe-2026', 'lembrete-9');
    await flush();

    expect(await saved()).toEqual({
      readIds: ['consulta-rotina-ubs', 'aviso-ubs-horario'],
      dismissedIds: ['aviso-ubs-horario'],
      reminders: { 'campanha-gripe-2026': 'lembrete-9' },
    });

    setReminder('campanha-gripe-2026', null);
    await flush();
    expect((await saved()).reminders).toEqual({});
  });

  it('a hidratação mescla o disco com mudanças feitas antes de carregar', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ readIds: ['aviso-ubs-horario'] }));
    markAsRead('consulta-rotina-ubs');
    await hydrateNotifications();
    await flush();

    expect((await saved()).readIds.sort()).toEqual(['aviso-ubs-horario', 'consulta-rotina-ubs']);
  });

  it('dados corrompidos voltam ao estado vazio', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '{não é json');
    expect(await loadState()).toEqual({ readIds: [], dismissedIds: [], reminders: {} });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ readIds: [1, 2], reminders: 'x' }));
    expect(await loadState()).toEqual({ readIds: [], dismissedIds: [], reminders: {} });
  });

  it('nextMorning agenda para o dia seguinte às 9h', () => {
    const date = nextMorning(new Date(2026, 9, 16, 22, 15));
    expect([date.getDate(), date.getHours(), date.getMinutes()]).toEqual([17, 9, 0]);
  });
});
