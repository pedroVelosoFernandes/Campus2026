import { memo } from 'react';
import Svg, { Circle, Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

/** Cor do brilho externo (teal claro); a opacidade cai suavemente até zero. */
const GLOW_COLOR = '#36C2BA';
/** Quanto do raio do brilho fica coberto pela esfera, para o degradê começar na borda. */
const GLOW_STEPS = 18;

/** Paradas do brilho: curva suave (ease-out cúbica) para não formar faixas nem borda dura. */
function glowStops(coreFraction: number) {
  const stops = [{ offset: 0, opacity: 0.5 }, { offset: coreFraction * 0.9, opacity: 0.5 }];
  for (let i = 0; i <= GLOW_STEPS; i += 1) {
    const u = i / GLOW_STEPS;
    const offset = coreFraction + (1 - coreFraction) * u;
    stops.push({ offset, opacity: 0.46 * (1 - u) ** 2.4 });
  }
  return stops.map((stop) => ({ ...stop, key: `g-${stop.offset.toFixed(4)}` }));
}

export type OrbGlowProps = {
  /** Lado do quadro do brilho, em pontos. */
  extent: number;
  /** Diâmetro da esfera, em pontos (o brilho começa na borda dela). */
  coreSize: number;
};

/** Halo largo e luminoso ao redor da esfera, que se dissolve no fundo. */
function OrbGlowBase({ extent, coreSize }: OrbGlowProps) {
  const stops = glowStops(coreSize / extent);
  const c = extent / 2;
  return (
    <Svg width={extent} height={extent}>
      <Defs>
        <RadialGradient id="orbGlow" cx="50%" cy="50%" r="50%">
          {stops.map(({ key, offset, opacity }) => (
            <Stop key={key} offset={offset} stopColor={GLOW_COLOR} stopOpacity={opacity} />
          ))}
        </RadialGradient>
      </Defs>
      <Circle cx={c} cy={c} r={c} fill="url(#orbGlow)" />
    </Svg>
  );
}

export const OrbGlow = memo(OrbGlowBase);

/** Esfera teal: miolo ciano-claro, corpo teal e borda profunda (como no design). */
const BODY_STOPS = [
  { offset: 0, color: '#EAFFFC' },
  { offset: 0.12, color: '#ADF1E9' },
  { offset: 0.3, color: '#62D5CD' },
  { offset: 0.5, color: '#30BBBA' },
  { offset: 0.7, color: '#21A2A5' },
  { offset: 0.87, color: '#17878C' },
  { offset: 1, color: '#117078' },
];

/** Sombra interna próxima à borda, que dá volume à esfera. */
const RIM_STOPS = [
  { offset: 0.72, opacity: 0 },
  { offset: 0.86, opacity: 0.06 },
  { offset: 0.95, opacity: 0.14 },
  { offset: 1, opacity: 0.22 },
];

/** Brilho especular branco-ciano, macio, um pouco acima do centro. */
const SPECULAR_STOPS = [
  { offset: 0, opacity: 0.8 },
  { offset: 0.2, opacity: 0.58 },
  { offset: 0.45, opacity: 0.28 },
  { offset: 0.7, opacity: 0.09 },
  { offset: 1, opacity: 0 },
];

/** Reflexo suave na base da esfera (luz refletida), típico de vidro. */
const BOUNCE_STOPS = [
  { offset: 0, opacity: 0.2 },
  { offset: 0.5, opacity: 0.08 },
  { offset: 1, opacity: 0 },
];

export type OrbSphereProps = { size: number };

/** Esfera desenhada em SVG com degradês de várias paradas (sem faixas nem cortes duros). */
function OrbSphereBase({ size }: OrbSphereProps) {
  const r = size / 2;
  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id="orbBody" cx="50%" cy="46%" r="58%" fx="50%" fy="42%">
          {BODY_STOPS.map(({ offset, color }) => (
            <Stop key={offset} offset={offset} stopColor={color} />
          ))}
        </RadialGradient>
        <RadialGradient id="orbRim" cx="50%" cy="50%" r="50%">
          {RIM_STOPS.map(({ offset, opacity }) => (
            <Stop key={offset} offset={offset} stopColor="#06363D" stopOpacity={opacity} />
          ))}
        </RadialGradient>
        <RadialGradient id="orbSpecular" cx="50%" cy="50%" r="50%">
          {SPECULAR_STOPS.map(({ offset, opacity }) => (
            <Stop key={offset} offset={offset} stopColor="#F2FFFD" stopOpacity={opacity} />
          ))}
        </RadialGradient>
        <RadialGradient id="orbBounce" cx="50%" cy="50%" r="50%">
          {BOUNCE_STOPS.map(({ offset, opacity }) => (
            <Stop key={offset} offset={offset} stopColor="#9BEDE2" stopOpacity={opacity} />
          ))}
        </RadialGradient>
      </Defs>
      <Circle cx={r} cy={r} r={r} fill="url(#orbBody)" />
      <Circle cx={r} cy={r} r={r} fill="url(#orbRim)" />
      <Ellipse cx={r} cy={r * 1.72} rx={r * 0.62} ry={r * 0.26} fill="url(#orbBounce)" />
      <Ellipse cx={r} cy={r * 0.84} rx={r * 0.56} ry={r * 0.5} fill="url(#orbSpecular)" />
    </Svg>
  );
}

export const OrbSphere = memo(OrbSphereBase);
