import { Ellipse, G, Path, Rect } from 'react-native-svg';

import { art } from './palette';

/** Formas menta suaves atrás da cena e a faixa de "chão". */
export function Backdrop() {
  return (
    <G>
      <Path
        d="M548 132 C574 70 628 40 712 40 L842 40 Q892 40 892 90 L892 600 L512 600 L512 220 C512 186 530 160 548 132 Z"
        fill={art.backdrop}
      />
      <Rect x={792} y={286} width={170} height={314} rx={26} fill={art.backdropDeep} />
      <Ellipse cx={136} cy={378} rx={56} ry={188} fill={art.backdrop} />
      <Rect x={56} y={654} width={888} height={22} rx={11} fill={art.ground} />
    </G>
  );
}
