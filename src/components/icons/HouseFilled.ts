import { createLucideIcon } from 'lucide-react-native';

/**
 * Casa da aba Início ativa, como no design: silhueta preenchida com a porta
 * vazada. É um único contorno que contorna a porta, então `fill` + `stroke`
 * na mesma cor mantêm a abertura visível (o House do Lucide vira um bloco).
 */
export const HouseFilled = createLucideIcon('house-filled', [
  [
    'path',
    {
      d:
        'M3.709 8.472l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2h-4v-5' +
        'a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v5H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 .709-1.528z',
      key: 'house',
    },
  ],
]);
