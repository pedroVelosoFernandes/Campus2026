import { router, type Href } from 'expo-router';
import { CalendarDays, FilePlus, Syringe, type LucideIcon } from 'lucide-react-native';

import { MonitorUser } from '@/components/cuidar-saude/MonitorUserIcon';

/** Uma das quatro formas de cuidar da saúde (tela "Como você quer cuidar da saúde?" e Início). */
export type CareOption = {
  key: 'teleconsulta' | 'vacinacao' | 'sintomas' | 'rotina';
  icon: LucideIcon;
  title: string;
  subtitle: string;
  open: () => void;
};

const go = (href: Href) => () => router.push(href);

/** Conversas é outra aba: navigate reaproveita a pilha existente. */
const openSymptoms = () => router.navigate('/conversas?topic=sintomas');

export const CARE_OPTIONS: readonly CareOption[] = [
  {
    key: 'teleconsulta',
    icon: MonitorUser,
    title: 'Teleconsulta',
    subtitle: 'Ver opções pelo SUS',
    open: go('/teleconsulta'),
  },
  {
    key: 'vacinacao',
    icon: Syringe,
    title: 'Vacinação',
    subtitle: 'Encontre uma unidade',
    open: go('/vacinacao'),
  },
  {
    key: 'sintomas',
    icon: FilePlus,
    title: 'Estou com sintomas',
    subtitle: 'Receba orientação de atendimento',
    open: openSymptoms,
  },
  {
    // Sem tela própria: o buscador de unidades mostra a UBS de referência.
    key: 'rotina',
    icon: CalendarDays,
    title: 'Consulta de rotina',
    subtitle: 'Planeje seu próximo cuidado',
    open: go('/vacinacao?servico=ubs'),
  },
];
