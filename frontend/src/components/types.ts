export type ItemType = 'book' | 'booklet' | 'card' | 'sticker' | 'poster';

export interface PackageItem {
  id: string;
  type: ItemType;
  data: Record<string, any>;
}

export interface ClientDocument {
  id: string;
  name: string;
  fileName: string;
  type: string;
  sizeKB: number;
  uploadedDate: string;
  reorderCount?: number;
  url?: string;
}

export interface Client {
  name: string;
  email: string;
  phone: string;
  page: string;
}

export const ITEM_TYPES: { id: ItemType; label: string; icon: string }[] = [
  { id: 'book',    label: 'Book',          icon: '📚' },
  { id: 'booklet', label: 'Booklet',       icon: '📖' },
  { id: 'card',    label: 'Business Card', icon: '🃏' },
  { id: 'sticker', label: 'Sticker',       icon: '🏷️' },
  { id: 'poster',  label: 'Poster',        icon: '🖼️' },
];

export function fileTypeColor(type: string): string {
  switch (type.toUpperCase()) {
    case 'PDF': return '#e74c3c';
    case 'AI':  return '#f47d01';
    case 'PSD': return '#3498db';
    case 'PNG':
    case 'JPG': return '#27ae60';
    default:    return '#7f8c8d';
  }
}

export function fmtSize(kb: number): string {
  return kb >= 1024 ? (kb / 1024).toFixed(1) + ' MB' : kb + ' KB';
}
