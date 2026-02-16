import { useState, useEffect, useRef, useCallback } from "react";

const DEFAULT_BATCH_SIZE = 20;

export function useInfiniteList<T>(items: T[], batchSize = DEFAULT_BATCH_SIZE) {
  const [visibleCount, setVisibleCount] = useState(batchSize);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset visible count when items change (new search/filter)
  useEffect(() => {
    setVisibleCount(batchSize);
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
          setVisibleCount((prev) => Math.min(prev + batchSize, items.length));
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [items.length, batchSize, sentinelRef.current]);

  const visibleItems = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  return { visibleItems, hasMore, sentinelRef: sentinelCallback };
}
