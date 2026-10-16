import { useCallback, useRef, type RefObject } from 'react';
import type { LayoutChangeEvent } from 'react-native';

type Scrollable = { scrollToOffset: (params: { offset: number; animated?: boolean }) => void };

/** Deslocamento que mostra o fim do conteúdo (incluindo rodapé e padding) na área visível. */
export function endOffset(contentHeight: number, viewportHeight: number): number {
  return Math.max(0, contentHeight - viewportHeight);
}

/**
 * Mantém a lista sempre no fim, usando a altura real do conteúdo. O `scrollToEnd`
 * do FlatList usa a altura do rodapé medida antes do cartão de próximo passo
 * aparecer e para antes do fim, deixando o cartão escondido atrás do campo.
 */
export function useStickToBottom(listRef: RefObject<Scrollable | null>) {
  const contentHeight = useRef(0);
  const viewportHeight = useRef(0);

  const scrollToEnd = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: endOffset(contentHeight.current, viewportHeight.current), animated: true });
  }, [listRef]);

  const onContentSizeChange = useCallback(
    (_width: number, height: number) => {
      contentHeight.current = height;
      scrollToEnd();
    },
    [scrollToEnd],
  );

  const onListLayout = useCallback(
    (event: LayoutChangeEvent) => {
      viewportHeight.current = event.nativeEvent.layout.height;
      scrollToEnd();
    },
    [scrollToEnd],
  );

  return { onContentSizeChange, onListLayout };
}
