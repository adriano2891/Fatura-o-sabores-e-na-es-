export type UserRole = 'admin' | 'manager' | 'waiter' | 'kitchen' | 'bar' | 'cashier';

export type ModuleType = 'atendimento' | 'cozinha' | 'bar' | 'admin' | 'faturacao';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  pin: string;
  avatar: string;
  email: string;
  active?: boolean;
  allowedModules?: ModuleType[];
  createdAt?: string;
  lastLoginAt?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  module: ModuleType | 'auth';
  details: string;
  targetId?: string;
}

export type TableStatus =
  | 'livre'
  | 'ocupada'
  | 'conta_solicitada'
  | 'a_aguardar_pagamento'
  | 'a_aguardar_limpeza'
  | 'indisponivel';

export interface Room {
  id: string;
  name: string;
  order: number;
}

export type CallType = 'chamar_empregado' | 'pedir_conta' | 'ajuda';
export type CallStatus = 'solicitado' | 'em_atendimento' | 'concluido';

export interface TableCall {
  id: string;
  tableId: string;
  tableNumber: string;
  type: CallType;
  status: CallStatus;
  createdAt: string;
  handledBy?: string;
  handledByName?: string;
  completedAt?: string;
}

export interface Table {
  id: string;
  number: string;
  roomId: string;
  roomName: string;
  capacity: number;
  status: TableStatus;
  waiterId?: string;
  waiterName?: string;
  activeComandaId?: string;
  guestCount?: number;
  openedAt?: string; // ISO
  totalAmount?: number;
  qrCodeToken: string; // Token imprevisível único para o QR Code da mesa
  activeCall?: TableCall;
}

export type PrepSector = 'cozinha' | 'bar' | 'atendimento' | 'pastelaria';

export interface ProductVariant {
  id: string;
  name: string;
  priceDelta: number;
}

export interface ProductExtra {
  id: string;
  name: string;
  priceDelta: number;
  sector?: PrepSector; // Setor do extra quando precisa de preparação separada
}

export interface Product {
  id: string;
  code: string;
  name: string;
  description: string;
  categoryId: string;
  price: number;
  vatRate: number; // 0.23, 0.13, 0.06, 0
  vatExemptionReason?: string;
  imageUrl?: string;
  sector: PrepSector;
  available: boolean;
  isFavorite: boolean;
  variants: ProductVariant[];
  extras: ProductExtra[];
  allowedNotes: string[];
  allergens: string[];
  trackStock: boolean;
  stockQuantity: number;
  minStockAlert: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  order: number;
}

export type ItemPrepStatus = 'recebido' | 'em_preparacao' | 'pronto' | 'entregue' | 'cancelado';

export type RestrictionType = 'alergia' | 'intolerancia' | 'restricao' | 'preferencia';

export interface AllergyRestriction {
  id: string;
  type: RestrictionType;
  name: string; // Ex: Glúten, Lactose, Crustáceos, Vegetariano, Sem Sal
  notes?: string;
}

export interface TableSeat {
  seatNumber: number; // 1, 2, 3...
  name?: string; // Ex: "Ana", "João" (opcional)
  allergies: AllergyRestriction[];
}

export interface OrderItem {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  sector: PrepSector;
  selectedVariant?: ProductVariant;
  selectedExtras: ProductExtra[];
  totalItemPrice: number;
  notes: string;
  status: ItemPrepStatus;
  statusUpdatedAt: string;
  cancelReason?: string;
  cancelledBy?: string;
  roundNumber: number;
  // Lugar / Pessoa na mesa
  seatNumber?: number; // undefined = "Para partilhar"
  seatName?: string;
  transferredFromSeat?: number;
  // Alergias
  allergyWarnings?: string[];
  allergyConfirmedByWaiter?: boolean;
  allergyConfirmedByKitchen?: boolean;
  // Estado de Pagamento e Faturação por Lugar
  isPaid?: boolean;
  paidAt?: string;
  paidDocumentId?: string;
  paidBySeat?: number;
  isBilled?: boolean;
  billedAt?: string;
  billedDocumentId?: string;
}

export interface OrderRound {
  roundNumber: number;
  createdAt: string;
  waiterId: string;
  waiterName: string;
  items: OrderItem[];
  // Avisos de atraso
  kitchenAlertedAt?: string;
  kitchenAcknowledgedAt?: string;
  kitchenAcknowledgedBy?: string;
}

export type ComandaStatus = 'aberta' | 'conta_solicitada' | 'a_aguardar_pagamento' | 'paga' | 'cancelada';

export interface Comanda {
  id: string;
  numberDisplay: string; // e.g. "CMD-0034"
  tableId: string;
  tableName: string;
  roomName: string;
  waiterId: string;
  waiterName: string;
  guestCount: number;
  seats: TableSeat[]; // Lugares organizados da mesa
  openedAt: string;
  updatedAt: string;
  status: ComandaStatus;
  rounds: OrderRound[];
  subtotal: number;
  taxTotal: number;
  total: number;
  discountAmount: number;
  discountReason?: string;
  paidAmount: number;
  balanceDue: number;
  customerId?: string;
  customerNif?: string;
  customerName?: string;
  saleId: string;
  version: number;
  // Representante
  representativeCode?: string;
  representativeName?: string;
  commissionRate?: number;
  commissionAmount?: number;
  // Planos e Cashback
  planMealsUsed?: number;
  cashbackUsed?: number;
  // Estado de Faturação
  fiscalStatus?: FiscalStatus;
  documentId?: string;
  documentIds?: string[];
}

export type PaymentMethod = 'dinheiro' | 'cartao' | 'mbway' | 'transferencia' | 'cashback' | 'plano' | 'outro';

export interface PaymentRecord {
  id: string;
  comandaId: string;
  saleId: string;
  amount: number;
  method: PaymentMethod;
  receivedAmount: number;
  changeAmount: number;
  registeredBy: string;
  registeredByName: string;
  cashSessionId: string;
  timestamp: string;
  providerReference?: string;
  isManualConfirmed: boolean;
  seatNumber?: number; // Quando pago por lugar
  itemIds?: string[]; // IDs dos itens quitados neste pagamento
}

export type SaleStatus = 'aberta' | 'parcialmente_paga' | 'paga' | 'anulada';
export type FiscalStatus =
  | 'por_faturar'
  | 'em_emissao'
  | 'parcialmente_faturado'
  | 'faturado'
  | 'erro_emissao'
  | 'nao_emitida'
  | 'pendente'
  | 'emitida'
  | 'comunicada_at'
  | 'erro';

export interface Sale {
  id: string;
  comandaId: string;
  tableId: string;
  tableName: string;
  roomName: string;
  guestCount: number;
  waiterId: string;
  waiterName: string;
  createdAt: string;
  closedAt?: string;
  subtotal: number;
  taxTotal: number;
  total: number;
  discountAmount: number;
  paidAmount: number;
  balanceDue: number;
  status: SaleStatus;
  fiscalStatus: FiscalStatus;
  documentId?: string;
  documentIds?: string[];
  documentNumber?: string;
  documentType?: string;
  items: OrderItem[];
  payments: PaymentRecord[];
  customerId?: string;
  customerNif?: string;
  customerName?: string;
  customerAddress?: string;
  representativeCode?: string;
  representativeName?: string;
  commissionAmount?: number;
  cashbackEarned?: number;
  cashbackUsed?: number;
}

export type FiscalDocumentType = 'FT' | 'FS' | 'FR' | 'RC' | 'NC';

export interface VatBreakdown {
  rate: number;
  rateLabel: string;
  baseAmount: number;
  vatAmount: number;
}

export type InvoiceDispatchChannel =
  | 'email'
  | 'whatsapp_api'
  | 'whatsapp_manual'
  | 'share_api'
  | 'download_pdf'
  | 'print';

export type InvoiceDispatchStatus =
  | 'pendente'
  | 'partilha_iniciada'
  | 'enviado'
  | 'entregue'
  | 'lido'
  | 'falha';

export interface InvoiceDispatchLog {
  id: string;
  documentId: string;
  documentNumber: string;
  saleId: string;
  channel: InvoiceDispatchChannel;
  recipient: string; // email ou telefone com indicativo
  recipientName?: string;
  countryCode?: string; // e.g. "+351", "+34", "+55", etc.
  status: InvoiceDispatchStatus;
  timestamp: string;
  operatorId: string;
  operatorName: string;
  secureToken: string;
  secureUrl: string;
  expiresAt: string;
  errorMessage?: string;
  providerResponseId?: string;
  consentGiven: boolean; // Consentimento exclusivo para envio do documento (não marketing)
}

export interface FiscalDocument {
  id: string;
  saleId: string;
  comandaId: string;
  type: FiscalDocumentType;
  series: string; // e.g. "FS 2026/0014"
  sequentialNumber: number;
  atcud: string; // e.g. "CS894K-0014"
  qrCodeData: string;
  hashSignature: string;
  issuedAt: string;
  operatorName: string;
  customerNif: string;
  customerName: string;
  customerAddress?: string;
  items: {
    productName: string;
    quantity: number;
    unitPrice: number;
    vatRate: number;
    total: number;
  }[];
  vatBreakdown: VatBreakdown[];
  subtotal: number;
  taxTotal: number;
  grossTotal: number;
  paymentMethod: string;
  status: 'emitida' | 'comunicada_at' | 'pendente_tentativa' | 'cancelada_por_retificacao';
  vendusDocumentId?: string;
  rectifiesDocumentId?: string;
  rectifyReason?: string;
  pdfUrl?: string;
  dispatchLogs?: InvoiceDispatchLog[];
  secureShareToken?: string;
  secureShareExpiresAt?: string;
  customerEmail?: string;
  customerPhone?: string;
  countryCode?: string;
  sendPreference?: 'nenhum' | 'email' | 'whatsapp';
}

export interface CashMovement {
  id: string;
  sessionId: string;
  type: 'abertura' | 'venda_dinheiro' | 'sangria' | 'suprimento' | 'fecho';
  amount: number;
  reason: string;
  registeredBy: string;
  registeredByName: string;
  timestamp: string;
}

export interface CashSession {
  id: string;
  openedAt: string;
  closedAt?: string;
  openedBy: string;
  openedByName: string;
  closedBy?: string;
  closedByName?: string;
  initialFloat: number;
  currentFloat: number;
  status: 'aberto' | 'fechado';
  movements: CashMovement[];
  expectedTotals: {
    dinheiro: number;
    cartao: number;
    mbway: number;
    transferencia: number;
    cashback?: number;
    plano?: number;
    total: number;
  };
  countedCash?: number;
  difference?: number;
  closingNotes?: string;
}

// Planos e Packs de Marmitas
export interface MealPlan {
  id: string;
  customerId: string;
  customerName: string;
  planName: string; // e.g. "Pack 10 Marmitas Executivas"
  paymentStatus: 'pago' | 'pendente';
  activatedAt: string;
  expiresAt: string;
  totalMeals: number;
  availableMeals: number;
  reservedMeals: number;
  usedMeals: number;
  history: {
    date: string;
    action: 'reserva' | 'consumo' | 'cancelamento';
    staffName: string;
    notes?: string;
  }[];
}

// Cashback
export interface CashbackMovement {
  id: string;
  date: string;
  type: 'credito' | 'utilizacao' | 'ajuste' | 'estorno';
  amount: number;
  saleId?: string;
  description: string;
}

export interface Customer {
  id: string;
  name: string;
  nif: string;
  email: string;
  phone: string;
  address: string;
  totalSpent: number;
  visitCount: number;
  lastVisit?: string;
  cashbackBalance: number;
  cashbackMovements: CashbackMovement[];
  mealPlans: MealPlan[];
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'entrada' | 'saida_venda' | 'ajuste' | 'desperdicio' | 'retorno_cancelamento';
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  date: string;
  userName: string;
}

// Representante comercial
export interface Representative {
  code: string; // e.g. "REP-101"
  name: string;
  email: string;
  phone: string;
  active: boolean;
  commissionRate: number; // e.g. 0.05 (5%)
  rulesDescription: string;
  totalCommissionEarned: number;
  totalEligibleSales: number;
}

// Pedidos Online do Site
export interface OnlineOrder {
  id: string; // e.g. "WEB-2026-0045"
  source: 'site_sabores_nacoes';
  customerName: string;
  customerPhone: string;
  customerNif: string;
  deliveryType: 'entrega' | 'levantamento';
  deliveryAddress?: string;
  requestedTime: string;
  items: OrderItem[];
  total: number;
  subtotal: number;
  taxTotal: number;
  paymentStatus: 'pago_online' | 'pendente_levantamento';
  paymentMethod: string;
  prepStatus: 'recebido' | 'aceite' | 'em_preparacao' | 'pronto' | 'entregue';
  representativeCode?: string;
  planMealRedeemed?: boolean;
  createdAt: string;
  saleId?: string;
  documentNumber?: string;
}

// Passagem de turno
export interface ShiftHandover {
  id: string;
  timestamp: string;
  outgoingWaiterId: string;
  outgoingWaiterName: string;
  incomingWaiterId: string;
  incomingWaiterName: string;
  tableIds: string[];
  notes: string;
  status: 'pendente' | 'aceite' | 'atribuida_gerente';
  summary: {
    openTablesCount: number;
    preppingOrdersCount: number;
    readyUndeliveredCount: number;
    delayAlertsCount: number;
    pendingCallsCount: number;
    activeAllergiesCount: number;
  };
}

export interface RestaurantSettings {
  name: string;
  tradeName: string;
  nif: string;
  cae: string;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
  email: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  autoReleaseTableAfterPayment: boolean;
  vendusApiKey: string;
  vendusTestMode: boolean;
  vendusSeries: string;
  vendusRegisterId: string;
  defaultVatRate: number;
  soundAlertsEnabled: boolean;
  allowCashierInAtendimento: boolean; // Desativada por padrão no Atendimento, configurável pelo Admin
  googleDriveSyncEnabled: boolean;
  lastDriveBackup: string | null;
  // Avisos de pedidos demorados
  expectedPrepTimeMinutes: number; // Padrão: 20 min
  delayToleranceMinutes: number; // Tolerância: 5 min -> alerta aos 25 min
  readyDeliveryDelayMinutes: number; // Alerta prato pronto por entregar: 5 min
  sectorPrepTimes: Record<PrepSector, number>; // Cozinha: 20m, Bar: 5m, Pastelaria: 8m
  alertReminderIntervalMinutes: number; // Intervalo de lembrete: 5 min
  // Envio de Faturas por Email e WhatsApp (Requisito 13)
  whatsappBusinessConfigured: boolean;
  whatsappApiKey?: string;
  whatsappPhoneNumberId?: string;
  emailSenderName: string;
  emailSenderAddress: string;
  secureLinkValidityDays: number; // Padrão: 30 dias
}
