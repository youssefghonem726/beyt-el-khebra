export type ProductionStep = 'pending' | 'design' | 'printing' | 'cutting' | 'packaging' | 'ready' | 'delivered';

export interface ProductionFile {
  id: number;
  file_name?: string | null;
  url?: string | null;
  file_size?: number | null;
}

export interface ProductionJob {
  id: number;
  job_id: string;
  order_id: number;
  order_status: string;
  client_id: number;
  client_name: string;
  client_email?: string;
  product: string;
  quantity: number;
  completed_quantity: number;
  current_step: ProductionStep;
  status: string;
  progress_percentage: number;
  due_date?: string | null;
  notes?: string;
  specs?: Record<string, string | number | null | undefined>;
  files?: ProductionFile[];
  created_at?: string;
}

export const PRODUCTION_STEPS: Array<{ value: ProductionStep; label: string }> = [
  { value: 'pending', label: 'Ready / Not Started' },
  { value: 'design', label: 'Design / Preparing' },
  { value: 'printing', label: 'Printing' },
  { value: 'cutting', label: 'Cutting' },
  { value: 'packaging', label: 'Packaging / Finishing' },
  { value: 'ready', label: 'Ready / Completed' },
];

export function formatDate(value?: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function progressPercent(job: ProductionJob): number {
  if (typeof job.progress_percentage === 'number') return job.progress_percentage;
  if (!job.quantity) return 0;
  return Math.round((Number(job.completed_quantity || 0) / Number(job.quantity)) * 100);
}

export function stepLabel(step?: string | null): string {
  return PRODUCTION_STEPS.find((entry) => entry.value === step)?.label || step || 'Not provided';
}

export function statusLabel(status?: string | null): string {
  if (!status) return 'unknown';
  if (status === 'ready_for_production') return 'ready';
  return status;
}

export function specSummary(specs?: ProductionJob['specs']): string {
  if (!specs) return 'Not provided';
  const parts = [
    specs.size && `Size: ${specs.size}`,
    specs.page_count && `Pages: ${specs.page_count}`,
    specs.paper && `Paper: ${specs.paper}`,
    specs.material && `Material: ${specs.material}`,
    specs.color_mode && `Color: ${specs.color_mode}`,
    specs.cover && `Cover: ${specs.cover}`,
    specs.binding && `Binding: ${specs.binding}`,
    specs.coil && `Coil: ${specs.coil}`,
    specs.finish && `Finish: ${specs.finish}`,
    specs.print_type && `Print: ${specs.print_type}`,
  ].filter(Boolean);

  return parts.length ? parts.join(' | ') : 'Not provided';
}

export function fileName(file: ProductionFile): string {
  return file.file_name || file.url?.split('/').pop() || `File #${file.id}`;
}

export function fileUrl(file: ProductionFile): string | null {
  if (!file.url) return null;
  if (/^https?:\/\//i.test(file.url)) return file.url;
  const base = import.meta.env.VITE_API_BASE_URL || window.location.origin;
  return `${base.replace(/\/$/, '')}/${file.url.replace(/^\//, '')}`;
}
