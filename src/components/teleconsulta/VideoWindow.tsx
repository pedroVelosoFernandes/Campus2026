import type { ReactNode } from 'react';
import { Circle, ClipPath, Defs, G, Rect } from 'react-native-svg';

import { art } from './palette';

const FRAME = { x: 214, y: 124, width: 570, height: 468, rx: 30 } as const;
const DOTS = [254, 279, 304] as const;

type VideoWindowProps = { children: ReactNode };

/** Janela da videochamada: moldura, três pontos, etiqueta da câmera e base do monitor. */
export function VideoWindow({ children }: VideoWindowProps) {
  return (
    <G>
      <Defs>
        <ClipPath id="tc-video">
          <Rect {...FRAME} />
        </ClipPath>
      </Defs>
      <Rect x={470} y={590} width={60} height={42} fill={art.stand} opacity={0.7} />
      <Rect x={408} y={628} width={176} height={36} rx={16} fill={art.stand} />
      <Rect {...FRAME} fill={art.screen} />
      <G clipPath="url(#tc-video)">
        <Circle cx={500} cy={300} r={210} fill={art.screenGlow} opacity={0.7} />
        {children}
      </G>
      <Rect {...FRAME} fill="none" stroke={art.outline} strokeWidth={6} />
      {DOTS.map((cx) => (
        <Circle key={cx} cx={cx} cy={162} r={7.5} fill={art.dot} />
      ))}
      <Rect x={710} y={148} width={46} height={32} rx={9} fill={art.cameraTag} />
    </G>
  );
}
