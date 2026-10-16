import { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';

import { art } from './palette';

function DoctorHairBack() {
  return (
    <Path
      d="M500 178 C410 178 366 242 368 322 C370 384 340 410 328 448 C318 478 334 500 358 498 C372 514 394 514 406 500 L594 500 C606 514 628 514 642 498 C666 500 682 478 672 448 C660 410 630 384 632 322 C634 242 590 178 500 178 Z"
      fill={art.hair}
    />
  );
}

function DoctorBody() {
  return (
    <G>
      <Path d="M286 610 C286 506 330 452 404 436 L596 436 C670 452 714 506 714 610 Z" fill={art.coat} />
      <Path d="M448 436 L552 436 L540 610 L460 610 Z" fill={art.scrub} />
      <Line x1={448} y1={438} x2={472} y2={610} stroke={art.coatShade} strokeWidth={5} />
      <Line x1={552} y1={438} x2={528} y2={610} stroke={art.coatShade} strokeWidth={5} />
      <Rect x={472} y={378} width={56} height={70} fill={art.skin} />
      <Ellipse cx={500} cy={392} rx={27} ry={11} fill={art.skinShade} />
      <Path d="M466 436 L534 436 L500 488 Z" fill={art.skin} />
    </G>
  );
}

function Stethoscope() {
  return (
    <G fill="none" stroke={art.outline} strokeWidth={6} strokeLinecap="round">
      <Path d="M448 440 C412 470 392 520 398 566 C400 580 410 584 418 576" />
      <Path d="M552 440 C572 462 574 490 568 508" />
      <Circle cx={568} cy={524} r={15} fill={art.coat} />
    </G>
  );
}

function DoctorFace() {
  return (
    <G>
      <Ellipse cx={440} cy={336} rx={12} ry={18} fill={art.skinShade} />
      <Ellipse cx={560} cy={336} rx={12} ry={18} fill={art.skinShade} />
      <Ellipse cx={500} cy={326} rx={60} ry={72} fill={art.skin} />
      <Ellipse cx={466} cy={356} rx={11} ry={6} fill={art.cheek} opacity={0.55} />
      <Ellipse cx={536} cy={356} rx={11} ry={6} fill={art.cheek} opacity={0.55} />
      <Circle cx={478} cy={330} r={6} fill={art.feature} />
      <Circle cx={524} cy={330} r={6} fill={art.feature} />
      <G fill="none" strokeLinecap="round">
        <Path d="M466 312 Q478 305 489 311" stroke={art.hair} strokeWidth={4} />
        <Path d="M513 311 Q524 305 536 312" stroke={art.hair} strokeWidth={4} />
        <Path d="M503 338 Q510 352 499 356" stroke={art.skinShade} strokeWidth={4} />
        <Path d="M482 370 Q501 385 520 370" stroke={art.feature} strokeWidth={4} />
      </G>
      <Path
        d="M436 324 C428 244 470 204 514 206 C564 210 580 256 566 322 C556 286 540 258 516 242 C492 274 466 296 436 324 Z"
        fill={art.hair}
      />
    </G>
  );
}

/** Médica de cabelo escuro, jaleco branco e estetoscópio. */
export function Doctor() {
  return (
    <G>
      <DoctorHairBack />
      <DoctorBody />
      <Stethoscope />
      <DoctorFace />
    </G>
  );
}
