'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';

type HeroMainVisualProps = {
  imageSrc: string;
  imageAlt: string;
};

type TiltState = {
  rotateX: number;
  rotateY: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function HeroMainVisual({ imageSrc, imageAlt }: HeroMainVisualProps) {
  const [tilt, setTilt] = useState<TiltState>({ rotateX: 0, rotateY: 0 });
  const cardTransform = useMemo(
    () => `perspective(1800px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
    [tilt.rotateX, tilt.rotateY],
  );

  return (
    <div className="relative min-h-[360px] sm:min-h-[480px] lg:min-h-[760px]">
      <div
        className="absolute inset-x-0 top-0 bottom-0 transition-transform duration-150 ease-out will-change-transform"
        style={{ transform: cardTransform }}
        onMouseMove={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          const offsetX = (event.clientX - bounds.left) / bounds.width - 0.5;
          const offsetY = (event.clientY - bounds.top) / bounds.height - 0.5;
          setTilt({
            rotateX: clamp(-offsetY * 8, -4, 4),
            rotateY: clamp(offsetX * 10, -5, 5),
          });
        }}
        onMouseLeave={() => setTilt({ rotateX: 0, rotateY: 0 })}
      >
        <div className="flex h-full w-full items-center justify-center p-0">
          <div className="relative flex h-full w-full items-center justify-center">
            <div className="hero-glow-a absolute inset-x-[6%] inset-y-[10%] rounded-[32px] bg-[linear-gradient(135deg,rgba(255,88,160,0.68),rgba(0,232,255,0.58)_48%,rgba(255,230,120,0.54))] blur-[72px]" />
            <div className="hero-glow-b absolute inset-x-[12%] inset-y-[14%] rounded-[28px] bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.7),rgba(0,232,255,0.22)_42%,rgba(255,88,160,0.12)_72%,transparent_100%)] blur-[52px]" />
            <Image
              src={imageSrc}
              alt={imageAlt}
              width={1197}
              height={768}
              priority
              className="relative z-10 block h-auto max-h-full w-auto max-w-full rounded-lg object-contain object-center opacity-85 shadow-[0_26px_60px_rgba(35,50,38,0.12)]"
            />
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes heroGlowA {
          0%,
          100% {
            transform: translate3d(-8px, 0, 0) scale(0.98);
            opacity: 0.88;
          }
          50% {
            transform: translate3d(10px, -24px, 0) scale(1.16);
            opacity: 1;
          }
        }

        @keyframes heroGlowB {
          0%,
          100% {
            transform: translate3d(10px, -4px, 0) scale(0.96);
            opacity: 0.7;
          }
          50% {
            transform: translate3d(-20px, 16px, 0) scale(1.22);
            opacity: 1;
          }
        }

        .hero-glow-a {
          animation: heroGlowA 5.5s ease-in-out infinite;
        }

        .hero-glow-b {
          animation: heroGlowB 6.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
