import { cn } from '@/shared/lib/utils';

type WorkspaceThumbnailPlaceholderProps = {
  className?: string;
  iconClassName?: string;
};

export function WorkspaceThumbnailPlaceholder({
  className,
  iconClassName,
}: WorkspaceThumbnailPlaceholderProps) {
  return (
    <div
      className={cn(
        'flex h-full w-full items-center justify-center bg-[linear-gradient(180deg,#f8faf8_0%,#eef4ee_100%)]',
        className,
      )}
    >
      <svg
        viewBox="0 0 64 64"
        aria-hidden="true"
        className={cn('h-full w-full p-3 text-[#8aa18d]', iconClassName)}
        fill="none"
      >
        <rect
          x="6"
          y="8"
          width="52"
          height="44"
          rx="8"
          fill="currentColor"
          fillOpacity="0.14"
          stroke="currentColor"
          strokeOpacity="0.4"
          strokeWidth="2"
        />
        <path
          d="M15 42L27 29L35 35L44 24L51 42"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="22" cy="21" r="4" fill="currentColor" fillOpacity="0.75" />
      </svg>
    </div>
  );
}
