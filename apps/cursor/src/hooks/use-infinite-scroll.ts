import { useEffect, useCallback, useRef } from 'react';

interface UseInfiniteScrollProps {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  threshold?: number;
}

// Throttle function to limit how often the scroll handler runs
function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastExecTime = 0;
  
  return (...args: Parameters<T>) => {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func(...args);
      lastExecTime = currentTime;
    } else {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func(...args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
}

export function useInfiniteScroll({
  hasMore,
  isLoading,
  onLoadMore,
  threshold = 200
}: UseInfiniteScrollProps) {
  const isLoadingRef = useRef(false);
  
  const handleScroll = useCallback(() => {
    if (isLoadingRef.current || !hasMore) return;

    const scrollTop = document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = document.documentElement.clientHeight;

    if (scrollTop + clientHeight >= scrollHeight - threshold) {
      isLoadingRef.current = true;
      onLoadMore();
    }
  }, [hasMore, onLoadMore, threshold]);

  // Update the loading ref when isLoading changes
  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  // Throttle the scroll handler to run at most every 100ms
  const throttledHandleScroll = useCallback(
    throttle(handleScroll, 100),
    [handleScroll]
  );

  useEffect(() => {
    window.addEventListener('scroll', throttledHandleScroll, { passive: true });
    return () => window.removeEventListener('scroll', throttledHandleScroll);
  }, [throttledHandleScroll]);
}