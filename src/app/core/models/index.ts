// Modèles miroirs du backend FactureChain

export type Role = 'subscriber' | 'agent' | 'admin';

export interface User {
  _id: string;
  email: string;
  role: Role;
  status: 'active' | 'suspended' | 'pending';
  firstName?: string;
  lastName?: string;
  phone?: string;
  customerId?: string | Customer | null;
}

export interface Address {
  street?: string;
  neighborhood?: string;
  city?: string;
  region?: string;
  country?: string;
  coordinates?: { lat: number; lng: number };
}

export interface Customer {
  _id: string;
  clientId: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  nationalIdNumber?: string;
  address?: Address;
  customerType: 'residential' | 'commercial' | 'industrial';
}

export type TariffCategory = 'BT_SOCIAL' | 'BT_RESIDENTIAL' | 'BT_PROFESSIONAL' | 'MT_INDUSTRIAL';

export interface Meter {
  _id: string;
  meterNumber: string;
  customerId: string;
  label?: string;
  tariffCategory: TariffCategory;
  contractedPower: number;
  address?: Address;
  status: 'active' | 'suspended' | 'disputed' | 'closed';
  installedAt: string;
  lastIndex?: { value: number; readingDate: string; source: string };
}

export interface InvoiceBreakdownLine {
  label: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  meterId: string | Meter;
  customerId: string | Customer;
  period: { year: number; month: number };
  previousIndex: number;
  currentIndex: number;
  consumptionKwh: number;
  amountBilled: number;
  amountRecomputed: number;
  discrepancy: number;
  breakdown: InvoiceBreakdownLine[];
  taxes: number;
  fixedFee: number;
  issueDate: string;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue' | 'disputed' | 'cancelled';
  source: 'ENEO' | 'SEED' | 'COMPUTED';
  hash: string;
  previousHash: string | null;
  sealedAt: string;
}

export type AnomalyType =
  | 'CONSUMPTION_SPIKE' | 'YOY_DEVIATION' | 'NEGATIVE_INCREMENT'
  | 'AMOUNT_MISMATCH' | 'IMPOSSIBLE_CONSUMPTION' | 'MISSING_READING';

export type Severity = 'low' | 'medium' | 'high';

export interface Anomaly {
  _id: string;
  meterId: string;
  customerId: string;
  invoiceId?: string | null;
  type: AnomalyType;
  severity: Severity;
  title: string;
  description: string;
  metrics: Record<string, unknown>;
  detectedAt: string;
  resolved: boolean;
}

export type ClaimType =
  | 'BILLING_DISPUTE' | 'METER_DEFECT' | 'WRONG_READING'
  | 'POWER_OUTAGE' | 'CONNECTION_ISSUE' | 'OTHER';

export type ClaimStatus =
  | 'submitted' | 'received' | 'investigating' | 'transmitted_to_eneo'
  | 'awaiting_response' | 'resolved' | 'rejected' | 'closed';

export interface ClaimMessage {
  _id: string;
  authorId: string;
  authorRole: 'subscriber' | 'agent' | 'admin' | 'system';
  body: string;
  createdAt: string;
}

export interface Claim {
  _id: string;
  claimNumber: string;
  customerId: string;
  meterId?: string | null;
  invoiceId?: string | null;
  type: ClaimType;
  title: string;
  description: string;
  status: ClaimStatus;
  statusHistory: { status: ClaimStatus; note?: string; at: string }[];
  priority: 'low' | 'medium' | 'high';
  slaDueAt?: string | null;
  messages: ClaimMessage[];
  resolution?: string;
  resolvedAt?: string | null;
  eneoTransmissionRef?: string | null;
  submittedAt: string;
}

export interface PowerOutage {
  _id: string;
  region: string;
  city: string;
  neighborhood?: string;
  startTime: string;
  endTime?: string | null;
  status: 'reported' | 'confirmed' | 'resolved' | 'rejected';
  confirmations: number;
  description?: string;
  isOfficial: boolean;
}

export interface ConsumptionStats {
  series: { year: number; month: number; consumption: number; amount: number }[];
  summary: { total12Months: number; avgMonthly: number; lastIndex?: { value: number; readingDate: string } };
}

// API enveloppes
export interface ApiOk<T> {
  success: true;
  data: T;
  meta?: { pagination?: { total: number; page: number; limit: number; pages: number } };
}

export interface ApiError {
  success: false;
  error: { code: string; message: string; details?: unknown };
}
