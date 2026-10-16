import { createLucideIcon } from 'lucide-react-native';

/**
 * Monitor com uma pessoa na tela (teleconsulta). O Lucide não traz esse
 * desenho, então ele é composto no mesmo grid 24×24 e traço do pacote.
 */
export const MonitorUser = createLucideIcon('monitor-user', [
  ['rect', { x: '2', y: '3', width: '20', height: '14', rx: '2', key: 'screen' }],
  ['path', { d: 'M8 21h8', key: 'base' }],
  ['path', { d: 'M12 17v4', key: 'stand' }],
  ['circle', { cx: '12', cy: '8.5', r: '2.5', key: 'head' }],
  ['path', { d: 'M7.5 15a4.5 4.5 0 0 1 9 0', key: 'shoulders' }],
]);
