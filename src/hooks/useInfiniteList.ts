import { useReducer, useEffect, useRef, useCallback } from "react";

const DEFAULT_BATCH_SIZE = 20;

type InfiniteListAction =
  | { type: "reset"; batchSize: number }
  | { type: "load-more"; batchSize: number; itemCount: number };

function infiniteListReducer(visibleCount: number, action: InfiniteListAction) {
  switch (action.type) {
    case "reset":
      return action.batchSize;
    case "load-more":
      return Math.min(visibleCount + action.batchSize, action.itemCount);
    default:
      return visibleCount;
  }
}

export function useInfiniteList<T>(items: T[], batchSize = DEFAULT_BATCH_SIZE) {
  const [visibleCount, dispatch] = useReducer(infiniteListReducer, batchSize);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    dispatch({ type: "reset", batchSize });
  }, [items, batchSize]);

  const sentinelCallback = useCallback(
    (node: HTMLDivElement | null) => {
      sentinelRef.current = node;
    },
    []
  );

  // Observe sentinel element to load more
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          dispatch({ type: "load-more", batchSize, itemCount: items.length });
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [items.length, batchSize]);

  const visibleItems = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  return { visibleItems, hasMore, sentinelRef: sentinelCallback };
}
