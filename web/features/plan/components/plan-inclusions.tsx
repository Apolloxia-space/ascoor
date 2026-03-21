import { Check } from 'lucide-react';

import { cn } from '@shared/lib/utils';

type PlanInclusionsProps = {
  features: Array<string>;
  limitResetNote?: string;
  title?: string;
  className?: string;
  titleClassName?: string;
  listClassName?: string;
  itemClassName?: string;
  iconClassName?: string;
  noteClassName?: string;
};

export function PlanInclusions({
  features,
  limitResetNote,
  title,
  className,
  titleClassName,
  listClassName,
  itemClassName,
  iconClassName,
  noteClassName,
}: PlanInclusionsProps) {
  return (
    <div className={className}>
      {title && <p className={titleClassName}>{title}</p>}
      <ul className={listClassName}>
        {features.map((feature) => (
          <li key={feature} className={itemClassName}>
            <Check className={cn('size-4 text-primary', iconClassName)} />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      {limitResetNote && <p className={noteClassName}>{limitResetNote}</p>}
    </div>
  );
}
