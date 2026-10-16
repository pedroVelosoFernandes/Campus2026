import { fireEvent, render, screen } from '@testing-library/react-native';
import { Syringe } from 'lucide-react-native';

import { OptionCard } from '../OptionCard';

describe('OptionCard', () => {
  it('mostra título e subtítulo', async () => {
    await render(<OptionCard icon={Syringe} title="Vacinação" subtitle="Encontre uma unidade" />);

    expect(screen.getByText('Vacinação')).toBeTruthy();
    expect(screen.getByText('Encontre uma unidade')).toBeTruthy();
  });

  it('expõe um rótulo acessível e chama onPress', async () => {
    const onPress = jest.fn();
    await render(<OptionCard icon={Syringe} title="Vacinação" subtitle="Encontre uma unidade" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Vacinação. Encontre uma unidade' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
