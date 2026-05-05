const STATUS_CLASS_MAP: Record<string, string> = {
  UNPRICED_PENDING: 'unpriced',
  UNPRICED: 'unpriced',
  'PENDING APPROVAL': 'pending',
  PRICED_PENDING_CONFIRMATION: 'pending-confirm',
  'Awaiting Confirmation': 'pending',
  IN_PROGRESS: 'in-progress',
  'IN PROGRESS': 'progress',
  FINISHING: 'progress',
  COMPLETED: 'completed',
  COMPLETED_: 'done',
  'READY FOR ARCHIVE': 'done',
  Approved: 'done',
  DONE: 'done',
  PAID: 'done',
  Paid: 'done',
  ACTIVE: 'done',
  CANCELED: 'canceled',
  WAITING: 'hold',
  'ON HOLD': 'hold',
  'AWAITING WORK': 'pending',
  'IN PRODUCTION': 'progress',
  Pending: 'pending',
  UNPAID: 'pending',
  Overdue: 'hold',
  'ON TIME': 'delivery-on-time',
  DELAYED: 'delivery-delayed',
  'LOST IN TRANSIT': 'delivery-lost',
};

interface Props {
  status: string;
}

export default function StatusBadge({ status }: Props) {
  const cls = STATUS_CLASS_MAP[status] ?? 'pending';
  return <span className={`status ${cls}`}>{status}</span>;
}
