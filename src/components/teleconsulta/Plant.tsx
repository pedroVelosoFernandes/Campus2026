import { G, Line, Path, Rect } from 'react-native-svg';

import { art } from './palette';

type LeafSpec = { angle: number; length: number; width: number; deep?: boolean };

const BASE_X = 140;
const BASE_Y = 566;

const LEAVES: readonly LeafSpec[] = [
  { angle: -64, length: 130, width: 34, deep: true },
  { angle: -38, length: 196, width: 44 },
  { angle: -10, length: 232, width: 46, deep: true },
  { angle: 18, length: 206, width: 44 },
  { angle: 46, length: 152, width: 38, deep: true },
  { angle: 70, length: 108, width: 28 },
];

function leafPath(length: number, width: number) {
  const l = length;
  const w = width;
  return `M0 0 C${w} ${-l * 0.28} ${w} ${-l * 0.72} 0 ${-l} C${-w} ${-l * 0.72} ${-w} ${-l * 0.28} 0 0 Z`;
}

function Leaf({ angle, length, width, deep }: LeafSpec) {
  return (
    <G transform={`translate(${BASE_X} ${BASE_Y}) rotate(${angle})`}>
      <Path d={leafPath(length, width)} fill={deep ? art.leafDeep : art.leaf} />
      <Line x1={0} y1={-8} x2={0} y2={-length * 0.82} stroke={art.screenGlow} strokeWidth={2} opacity={0.55} />
    </G>
  );
}

/** Vaso com folhagem à esquerda do monitor. */
export function Plant() {
  return (
    <G>
      {LEAVES.map((leaf) => (
        <Leaf key={leaf.angle} {...leaf} />
      ))}
      <Path d="M90 576 L190 576 L181 660 Q180 668 171 668 L109 668 Q100 668 99 660 Z" fill={art.pot} />
      <Rect x={82} y={564} width={116} height={18} rx={7} fill={art.potRim} />
    </G>
  );
}
