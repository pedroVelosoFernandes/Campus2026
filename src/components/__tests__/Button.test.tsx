import { fireEvent, render, screen } from '@testing-library/react-native';
import { Mic } from 'lucide-react-native';

import { Button } from '../Button';

describe('Button', () => {
  it('renderiza o rótulo e chama onPress', async () => {
    const onPress = jest.fn();
    await render(<Button label="Conversar agora" icon={Mic} onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Conversar agora' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('anuncia o estado desabilitado para leitores de tela', async () => {
    await render(<Button label="Prefiro escrever" variant="secondary" disabled onPress={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Prefiro escrever', disabled: true })).toBeTruthy();
  });

  it('usa accessibilityLabel personalizado', async () => {
    await render(<Button label="Ok" accessibilityLabel="Confirmar escolha" />);
    expect(screen.getByLabelText('Confirmar escolha')).toBeTruthy();
  });
});
