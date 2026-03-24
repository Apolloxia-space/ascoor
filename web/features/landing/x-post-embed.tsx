'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

declare global {
  interface Window {
    twttr?: {
      widgets?: {
        createTweet: (
          tweetId: string,
          element: HTMLElement,
          options?: {
            align?: 'left' | 'center' | 'right';
            dnt?: boolean;
            theme?: 'light' | 'dark';
          },
        ) => Promise<HTMLElement>;
      };
    };
  }
}

const TWEET_ID = '2036019480565026962';

export function XPostEmbed() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const loadEmbed = async () => {
    if (!containerRef.current) return;
    const widgets = window.twttr?.widgets;
    if (!widgets?.createTweet) return;
    if (containerRef.current.childElementCount > 0) return;

    try {
      await widgets.createTweet(TWEET_ID, containerRef.current, {
        align: 'center',
        dnt: true,
        theme: 'light',
      });
      setIsReady(true);
    } catch {
      setIsReady(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    void loadEmbed();
  }, [isMounted]);

  return (
    <div className="relative sm:px-2">
      {!isReady ? <TweetSkeleton /> : null}
      <div
        ref={containerRef}
        className={isReady ? 'relative z-10' : 'absolute inset-0 opacity-0 pointer-events-none'}
      />
      <Script
        src="https://platform.twitter.com/widgets.js"
        strategy="lazyOnload"
        onReady={() => {
          void loadEmbed();
        }}
      />
    </div>
  );
}

function TweetSkeleton() {
  return (
    <div className="mx-auto max-w-[550px] rounded-[24px] border border-border/60 bg-card/70 p-4 shadow-[var(--shadow-card)] sm:p-5">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-full bg-muted" />
        <div className="space-y-2">
          <div className="h-3 w-36 rounded-full bg-muted" />
          <div className="h-3 w-24 rounded-full bg-muted/70" />
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <div className="h-3 w-full rounded-full bg-muted" />
        <div className="h-3 w-[92%] rounded-full bg-muted" />
        <div className="h-3 w-[88%] rounded-full bg-muted" />
        <div className="h-3 w-[68%] rounded-full bg-muted" />
      </div>
      <div className="mt-4 aspect-[16/9] rounded-[18px] bg-muted/80" />
      <div className="mt-4 flex gap-5">
        <div className="h-3 w-12 rounded-full bg-muted" />
        <div className="h-3 w-12 rounded-full bg-muted" />
        <div className="h-3 w-12 rounded-full bg-muted" />
      </div>
    </div>
  );
}
