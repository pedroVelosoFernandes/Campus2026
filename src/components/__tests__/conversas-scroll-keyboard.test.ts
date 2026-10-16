import { keyboardOverlap } from '@/components/conversas/useKeyboardInset';
import { endOffset } from '@/components/conversas/useStickToBottom';

describe('keyboardOverlap', () => {
  it('desconta a barra de abas que o teclado cobre', () => {
    // Tela de 874 pt com barra de abas de 83 pt: o contêiner termina em 791.
    expect(keyboardOverlap(791, 874 - 336)).toBe(253);
  });

  it('sem barra de abas, o deslocamento é a altura do teclado', () => {
    expect(keyboardOverlap(874, 874 - 336)).toBe(336);
  });

  it('teclado fechado (abaixo do contêiner) não desloca nada', () => {
    expect(keyboardOverlap(791, 874)).toBe(0);
  });
});

describe('endOffset', () => {
  it('rola até o fim real do conteúdo, incluindo o rodapé', () => {
    expect(endOffset(1400, 600)).toBe(800);
  });

  it('conteúdo menor que a área visível fica no topo', () => {
    expect(endOffset(300, 600)).toBe(0);
  });
});
