import { useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import { formatFactoryDate, formatFactoryTime } from '@/lib/factory-time';

export default function FactoryClock() {
  const [instant, setInstant] = useState(() => new Date().toISOString());

  useEffect(() => {
    const update = () => setInstant(new Date().toISOString());
    const timer = window.setInterval(update, 15000);

    window.addEventListener('focus', update);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', update);
    };
  }, []);

  return (
    <time
      dateTime={instant}
      aria-label="Current factory date and time in Indian Standard Time"
      className="flex flex-wrap items-center gap-2 text-xs font-semibold tabular-nums text-muted-foreground"
    >
      <Icon name="Clock3" size={15} />
      <span>{formatFactoryDate(instant)}</span>
      <span aria-hidden="true">/</span>
      <span>{formatFactoryTime(instant)} IST</span>
    </time>
  );
}
