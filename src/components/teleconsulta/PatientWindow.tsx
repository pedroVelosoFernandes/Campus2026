import { ClipPath, Defs, Ellipse, G, Path, Rect } from 'react-native-svg';

import { art } from './palette';

const FRAME = { x: 674, y: 378, width: 236, height: 228, rx: 18 } as const;

/** Janela picture-in-picture com o paciente (um jovem de camiseta azul-petróleo). */
export function PatientWindow() {
  return (
    <G>
      <Defs>
        <ClipPath id="tc-pip">
          <Rect {...FRAME} />
        </ClipPath>
      </Defs>
      <Rect {...FRAME} fill={art.pipScreen} />
      <G clipPath="url(#tc-pip)">
        <Path d="M704 612 C704 558 740 532 792 532 C844 532 880 558 880 612 Z" fill={art.shirt} />
        <Rect x={774} y={494} width={36} height={44} rx={8} fill={art.skinShade} />
        <Ellipse cx={754} cy={472} rx={8} ry={12} fill={art.skinShade} />
        <Ellipse cx={830} cy={472} rx={8} ry={12} fill={art.skinShade} />
        <Ellipse cx={792} cy={468} rx={38} ry={44} fill={art.skin} />
        <Path
          d="M754 466 C744 420 774 400 800 402 C832 404 842 432 830 462 C822 446 806 436 786 440 C770 444 760 454 754 466 Z"
          fill={art.hair}
        />
        <Path d="M780 492 Q792 499 804 492" fill="none" stroke={art.skinShade} strokeWidth={3.5} strokeLinecap="round" />
      </G>
      <Rect {...FRAME} fill="none" stroke={art.outline} strokeWidth={5} />
    </G>
  );
}
