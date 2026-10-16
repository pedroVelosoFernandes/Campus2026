import { fireEvent, render, screen } from '@testing-library/react-native';
import { House, MessageSquare, User } from 'lucide-react-native';

import { TabBar, type TabBarTab } from '../TabBar';

const TABS: TabBarTab[] = [
  { key: 'inicio', label: 'Início', icon: House },
  { key: 'conversas', label: 'Conversas', icon: MessageSquare },
  { key: 'perfil', label: 'Perfil', icon: User },
];

describe('TabBar', () => {
  it('marca somente a aba ativa como selecionada', async () => {
    await render(<TabBar tabs={TABS} activeKey="conversas" onTabPress={jest.fn()} />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(screen.getByRole('tab', { name: /Conversas/, selected: true })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Início/, selected: false })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Perfil/, selected: false })).toBeTruthy();
  });

  it('informa a aba pressionada e se ela já estava ativa', async () => {
    const onTabPress = jest.fn();
    await render(<TabBar tabs={TABS} activeKey="inicio" onTabPress={onTabPress} />);

    await fireEvent.press(screen.getByRole('tab', { name: /Perfil/ }));
    await fireEvent.press(screen.getByRole('tab', { name: /Início/ }));

    expect(onTabPress).toHaveBeenNthCalledWith(1, 'perfil', false);
    expect(onTabPress).toHaveBeenNthCalledWith(2, 'inicio', true);
  });
});
