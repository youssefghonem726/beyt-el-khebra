import { useTranslation } from 'react-i18next';

const STATUS_CLASS_MAP: Record<string, string> = {
  unpriced_pending:            'unpriced',
  unpriced:                    'unpriced',
  pending_approval:            'pending',
  priced_pending_confirmation: 'pending-confirm',
  awaiting_confirmation:       'pending',
  in_progress:                 'in-progress',
  finishing:                   'progress',
  completed:                   'completed',
  done:                        'done',
  ready_for_archive:           'done',
  approved:                    'done',
  paid:                        'done',
  active:                      'done',
  canceled:                    'canceled',
  cancelled:                   'canceled',
  waiting:                     'hold',
  on_hold:                     'hold',
  not_started:                 'hold',
  awaiting_work:               'pending',
  in_production:               'progress',
  pending:                     'pending',
  unpaid:                      'pending',
  overdue:                     'hold',
  on_time:                     'delivery-on-time',
  delayed:                     'delivery-delayed',
  lost_in_transit:             'delivery-lost',
  lost:                        'delivery-lost',
  scheduled:                   'done',
  in_transit:                  'in-progress',
  out_for_delivery:            'in-progress',
  delivered:                   'done',
};

interface Props {
  status: string;
}

export default function StatusBadge({ status }: Props) {
  const { t } = useTranslation('common');
  const normalized = status.toLowerCase();
  const cls = STATUS_CLASS_MAP[normalized] ?? STATUS_CLASS_MAP[status] ?? 'pending';
  const labelKey = `statusLabels.${status}`;
  const translated = t(labelKey);
  const label = translated === labelKey ? status : translated;
  return <span className={`status ${cls}`}>{label}</span>;
}
