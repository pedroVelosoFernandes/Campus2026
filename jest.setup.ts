// Mocks globais dos testes.
import 'react-native-gesture-handler/jestSetup';

jest.mock('react-native-worklets', () => jest.requireActual('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => jest.requireActual('react-native-reanimated/mock'));
// O preset nativo do jest-expo resolve o inicializador .native do Reanimated 4,
// que exige o módulo nativo; nos testes ele vira um no-op.
jest.mock('react-native-reanimated/src/initializers', () => ({ initializeReanimatedModule: () => {} }));
