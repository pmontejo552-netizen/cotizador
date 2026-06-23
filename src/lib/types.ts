// Tipos compartidos entre frontend y backend.

export type Kind = 'material' | 'labor' | 'other';

export interface LineItemDTO {
  id: string;
  quoteId: string;
  kind: Kind;
  description: string;
  itemType: string | null;
  unit: string | null;
  quantity: number;
  unitPrice: number;
  amount: number | null;
  isEstimated: boolean;
  noPrice: boolean;
  estimateSource: string | null;
  estimateNote: string | null;
  position: number;
}

export interface AttachmentDTO {
  id: string;
  quoteId: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy: string | null;
  createdAt: string;
}

export interface HistoryDTO {
  id: string;
  userName: string;
  userRole: string;
  section: string;
  action: string;
  detail: string;
  createdAt: string;
}

export interface QuoteDTO {
  id: string;
  number: string;
  jobName: string;
  client: string;
  date: string;
  companyName: string;
  currency: 'GTQ' | 'USD' | string;
  ivaPct: number;
  wastePct: number;
  contingencyPct: number;
  markupPct: number;
  estimateSafetyPct: number;
  estimatedDays: number | null;
  status: string;
  approved: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  materialsClosed: boolean;
  laborClosed: boolean;
  otherClosed: boolean;
  markupClosed: boolean;
  materialsNote: string | null;
  laborNote: string | null;
  otherNote: string | null;
  consolidationNote: string | null;
  markupNote: string | null;
  materialsLastBy: string | null;
  laborLastBy: string | null;
  otherLastBy: string | null;
  markupLastBy: string | null;
  includeAttachmentsInPdf: boolean;
  items: LineItemDTO[];
  attachments: AttachmentDTO[];
  createdAt: string;
  updatedAt: string;
}

// Identidad del usuario actual (sin login): nombre + rol elegidos al abrir.
export interface Actor {
  name: string;
  role: string;
}
