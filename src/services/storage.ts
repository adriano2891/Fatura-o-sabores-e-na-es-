import {
  User,
  Table,
  Room,
  Category,
  Product,
  Comanda,
  OrderRound,
  OrderItem,
  Sale,
  FiscalDocument,
  CashSession,
  CashMovement,
  PaymentRecord,
  Customer,
  StockMovement,
  RestaurantSettings,
  FiscalDocumentType,
  PaymentMethod,
  ItemPrepStatus,
  TableSeat,
  AllergyRestriction,
  TableCall,
  CallType,
  Representative,
  OnlineOrder,
  ShiftHandover,
  MealPlan,
  CashbackMovement,
  InvoiceDispatchChannel,
  InvoiceDispatchStatus,
  InvoiceDispatchLog,
  AuditLog,
  ModuleType,
  PrepSector,
  FiscalStatus,
} from '../types';
import { issueFiscalDocument } from './vendus';
import { playAlertSound } from '../utils/formatters';

const STORAGE_KEY = 'sabores_nacoes_store_v3';
const SYNC_CHANNEL_NAME = 'sabores_nacoes_cross_device_sync_v3';

export interface AppState {
  currentUser: User;
  users: User[];
  rooms: Room[];
  tables: Table[];
  categories: Category[];
  products: Product[];
  comandas: Comanda[];
  sales: Sale[];
  fiscalDocuments: FiscalDocument[];
  cashSessions: CashSession[];
  currentCashSessionId: string | null;
  customers: Customer[];
  stockMovements: StockMovement[];
  representatives: Representative[];
  onlineOrders: OnlineOrder[];
  shiftHandovers: ShiftHandover[];
  tableCalls: TableCall[];
  settings: RestaurantSettings;
  auditLogs: AuditLog[];
  isOnline: boolean;
  pendingSyncQueue: { id: string; action: string; payload: unknown; timestamp: string }[];
  lastSequentialDocNumber: number;
}

const DEFAULT_USERS: User[] = [
  {
    id: 'u-1',
    name: 'Carlos Silva',
    role: 'admin',
    pin: '1234',
    avatar: '👨‍💼',
    email: 'carlos@saboresenacoes.pt',
    active: true,
    allowedModules: ['atendimento', 'cozinha', 'bar', 'admin'],
  },
  {
    id: 'u-2',
    name: 'Maria Santos',
    role: 'manager',
    pin: '5678',
    avatar: '👩‍💼',
    email: 'maria@saboresenacoes.pt',
    active: true,
    allowedModules: ['atendimento', 'cozinha', 'bar', 'admin'],
  },
  {
    id: 'u-3',
    name: 'João Pereira',
    role: 'waiter',
    pin: '1111',
    avatar: '🤵',
    email: 'joao@saboresenacoes.pt',
    active: true,
    allowedModules: ['atendimento'],
  },
  {
    id: 'u-4',
    name: 'Chef Rui',
    role: 'kitchen',
    pin: '2222',
    avatar: '👨‍🍳',
    email: 'rui@saboresenacoes.pt',
    active: true,
    allowedModules: ['cozinha'],
  },
  {
    id: 'u-bar',
    name: 'Marco Barista',
    role: 'bar',
    pin: '4444',
    avatar: '🍸',
    email: 'marco@saboresenacoes.pt',
    active: true,
    allowedModules: ['bar'],
  },
  {
    id: 'u-5',
    name: 'Ana Costa',
    role: 'cashier',
    pin: '3333',
    avatar: '👩‍💻',
    email: 'ana@saboresenacoes.pt',
    active: true,
    allowedModules: ['admin'],
  },
];

const DEFAULT_ROOMS: Room[] = [
  { id: 'r-1', name: 'Sala Principal', order: 1 },
  { id: 'r-2', name: 'Esplanada', order: 2 },
  { id: 'r-3', name: 'Balcão', order: 3 },
  { id: 'r-4', name: 'Sala VIP', order: 4 },
];

const DEFAULT_TABLES: Table[] = [
  { id: 't-1', number: 'Mesa 1', roomId: 'r-1', roomName: 'Sala Principal', capacity: 4, status: 'livre', qrCodeToken: 'sn-tbl-1-a7b9' },
  {
    id: 't-2',
    number: 'Mesa 2',
    roomId: 'r-1',
    roomName: 'Sala Principal',
    capacity: 2,
    status: 'ocupada',
    activeComandaId: 'cmd-sample-mesa-2',
    waiterId: 'u-3',
    waiterName: 'João Pereira',
    openedAt: new Date(Date.now() - 1200000).toISOString(),
    guestCount: 2,
    totalAmount: 18.9,
    qrCodeToken: 'sn-tbl-2-f3e1',
  },
  { id: 't-3', number: 'Mesa 3', roomId: 'r-1', roomName: 'Sala Principal', capacity: 4, status: 'livre', qrCodeToken: 'sn-tbl-3-98c4' },
  {
    id: 't-4',
    number: 'Mesa 4',
    roomId: 'r-1',
    roomName: 'Sala Principal',
    capacity: 6,
    status: 'livre',
    qrCodeToken: 'sn-tbl-4-d2e8',
    activeCall: {
      id: 'call-sample-1',
      tableId: 't-4',
      tableNumber: 'Mesa 4',
      type: 'chamar_empregado',
      status: 'solicitado',
      createdAt: new Date(Date.now() - 180000).toISOString(),
    },
  },
  { id: 't-5', number: 'Mesa 5', roomId: 'r-1', roomName: 'Sala Principal', capacity: 2, status: 'livre', qrCodeToken: 'sn-tbl-5-6b4a' },
  { id: 't-6', number: 'Mesa 6', roomId: 'r-1', roomName: 'Sala Principal', capacity: 4, status: 'livre', qrCodeToken: 'sn-tbl-6-1c9f' },
  { id: 't-11', number: 'Esplanada 11', roomId: 'r-2', roomName: 'Esplanada', capacity: 2, status: 'livre', qrCodeToken: 'sn-tbl-11-8e2b' },
  { id: 't-12', number: 'Esplanada 12', roomId: 'r-2', roomName: 'Esplanada', capacity: 4, status: 'livre', qrCodeToken: 'sn-tbl-12-7a4c' },
  { id: 't-13', number: 'Esplanada 13', roomId: 'r-2', roomName: 'Esplanada', capacity: 4, status: 'livre', qrCodeToken: 'sn-tbl-13-3f1d' },
  { id: 't-14', number: 'Esplanada 14', roomId: 'r-2', roomName: 'Esplanada', capacity: 6, status: 'livre', qrCodeToken: 'sn-tbl-14-5d9e' },
  { id: 't-21', number: 'Balcão 1', roomId: 'r-3', roomName: 'Balcão', capacity: 1, status: 'livre', qrCodeToken: 'sn-tbl-21-2a6c' },
  { id: 't-22', number: 'Balcão 2', roomId: 'r-3', roomName: 'Balcão', capacity: 1, status: 'livre', qrCodeToken: 'sn-tbl-22-4e8b' },
  { id: 't-31', number: 'Sala VIP 1', roomId: 'r-4', roomName: 'Sala VIP', capacity: 8, status: 'livre', qrCodeToken: 'sn-tbl-31-0c5a' },
];

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Pratos do Dia', icon: '🍲', order: 1 },
  { id: 'cat-2', name: 'Marmitas', icon: '🍱', order: 2 },
  { id: 'cat-3', name: 'Entradas', icon: '🧀', order: 3 },
  { id: 'cat-4', name: 'Bebidas', icon: '🍷', order: 4 },
  { id: 'cat-5', name: 'Sobremesas', icon: '🍰', order: 5 },
  { id: 'cat-6', name: 'Extras', icon: '🍟', order: 6 },
];

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'p-1',
    code: 'PRT-001',
    name: 'Bacalhau à Brás Tradicional',
    description: 'Bacalhau desfiado salteado com batata palha estaladiça, cebola caramelizada e ovos frescos, com azeitonas pretas e salsa.',
    categoryId: 'cat-1',
    price: 14.5,
    vatRate: 0.13,
    sector: 'cozinha',
    available: true,
    isFavorite: true,
    variants: [
      { id: 'v-1', name: 'Dose Inteira', priceDelta: 0 },
      { id: 'v-2', name: 'Meia Dose', priceDelta: -4.5 },
    ],
    extras: [
      { id: 'e-1', name: 'Ovo estrelado extra', priceDelta: 1.2 },
      { id: 'e-2', name: 'Salada mista de acompanhamento', priceDelta: 2.0 },
    ],
    allowedNotes: ['Sem cebola', 'Batata bem estaladiça', 'Pouco sal'],
    allergens: ['Peixe', 'Ovos'],
    trackStock: true,
    stockQuantity: 45,
    minStockAlert: 10,
  },
  {
    id: 'p-2',
    code: 'PRT-002',
    name: 'Polvo à Lagareiro no Forno',
    description: 'Tentáculo de polvo suculento assado no forno com azeite virgem extra, alho esmagado e batatas a murro.',
    categoryId: 'cat-1',
    price: 18.9,
    vatRate: 0.13,
    sector: 'cozinha',
    available: true,
    isFavorite: true,
    variants: [
      { id: 'v-3', name: 'Dose Individual', priceDelta: 0 },
      { id: 'v-4', name: 'Dose para Partilhar (2 pessoas)', priceDelta: 14.0 },
    ],
    extras: [
      { id: 'e-3', name: 'Grelos salteados extra', priceDelta: 2.5 },
      { id: 'e-4', name: 'Azeite aromatizado com ervas', priceDelta: 1.0 },
    ],
    allowedNotes: ['Alho ligeiro', 'Polvo bem tostado'],
    allergens: ['Moluscos'],
    trackStock: true,
    stockQuantity: 30,
    minStockAlert: 8,
  },
  {
    id: 'p-3',
    code: 'PRT-003',
    name: 'Francesinha Sabores & Nações',
    description: 'Sanduíche portuense com bife tenro, fiambre, linguiça e queijo gratinado, coberta com molho especial fumegante e batatas fritas.',
    categoryId: 'cat-1',
    price: 13.5,
    vatRate: 0.13,
    sector: 'cozinha',
    available: true,
    isFavorite: true,
    variants: [
      { id: 'v-5', name: 'Com Ovo Estrelado', priceDelta: 0 },
      { id: 'v-6', name: 'Simples (Sem Ovo)', priceDelta: -1.0 },
    ],
    extras: [
      { id: 'e-5', name: 'Molho extra à parte', priceDelta: 1.5 },
      { id: 'e-6', name: 'Batata frita extra', priceDelta: 2.2 },
    ],
    allowedNotes: ['Molho muito picante', 'Molho suave', 'Sem picante'],
    allergens: ['Glúten', 'Lacticínios', 'Ovos'],
    trackStock: true,
    stockQuantity: 50,
    minStockAlert: 15,
  },
  {
    id: 'p-4',
    code: 'MAR-001',
    name: 'Marmita Executiva de Picanha',
    description: 'Fatias nobres de picanha grelhada com arroz branco, feijão preto temperado, farofa crocante e batata frita.',
    categoryId: 'cat-2',
    price: 11.5,
    vatRate: 0.13,
    sector: 'cozinha',
    available: true,
    isFavorite: true,
    variants: [
      { id: 'v-7', name: 'Ao ponto', priceDelta: 0 },
      { id: 'v-8', name: 'Mal passada', priceDelta: 0 },
      { id: 'v-9', name: 'Bem passada', priceDelta: 0 },
    ],
    extras: [
      { id: 'e-7', name: 'Farofa de bacon extra', priceDelta: 1.5 },
      { id: 'e-8', name: 'Banana frita', priceDelta: 1.8 },
    ],
    allowedNotes: ['Feijão separado', 'Sem farofa', 'Pouco sal'],
    allergens: ['Glúten'],
    trackStock: true,
    stockQuantity: 40,
    minStockAlert: 10,
  },
  {
    id: 'p-5',
    code: 'ENT-001',
    name: 'Chouriço de Porco Preto Assado',
    description: 'Chouriço tradicional assado em canoa de barro com aguardente vínica.',
    categoryId: 'cat-3',
    price: 6.5,
    vatRate: 0.13,
    sector: 'cozinha',
    available: true,
    isFavorite: false,
    variants: [],
    extras: [{ id: 'e-9', name: 'Cesto de pão alentejano', priceDelta: 1.5 }],
    allowedNotes: ['Bem tostado', 'Assado na mesa'],
    allergens: ['Glúten'],
    trackStock: true,
    stockQuantity: 28,
    minStockAlert: 5,
  },
  {
    id: 'p-6',
    code: 'ENT-002',
    name: 'Cesto de Pães Caseiros e Manteigas',
    description: 'Pão de Mafra quentinho, broa de milho de Avintes e manteiga de alho e ervas.',
    categoryId: 'cat-3',
    price: 2.5,
    vatRate: 0.06,
    sector: 'cozinha',
    available: true,
    isFavorite: true,
    variants: [],
    extras: [{ id: 'e-10', name: 'Azeite virgem extra com orégãos', priceDelta: 1.2 }],
    allowedNotes: [],
    allergens: ['Glúten', 'Lacticínios'],
    trackStock: true,
    stockQuantity: 60,
    minStockAlert: 15,
  },
  {
    id: 'p-7',
    code: 'BEB-001',
    name: 'Cerveja Super Bock Pressão 33cl',
    description: 'Cerveja imperial tirada à pressão, fresca e com colarinho aveludado.',
    categoryId: 'cat-4',
    price: 2.5,
    vatRate: 0.23,
    sector: 'bar',
    available: true,
    isFavorite: true,
    variants: [
      { id: 'v-10', name: 'Fino / Imperial (20cl)', priceDelta: -0.7 },
      { id: 'v-11', name: 'Caneca (50cl)', priceDelta: 1.5 },
    ],
    extras: [],
    allowedNotes: ['Bem fresca', 'Sem muito colarinho'],
    allergens: ['Glúten'],
    trackStock: true,
    stockQuantity: 120,
    minStockAlert: 30,
  },
  {
    id: 'p-8',
    code: 'BEB-002',
    name: 'Vinho Tinto Douro Reserva Garrafa',
    description: 'Vinho tinto encorpado de castas Touriga Nacional e Franca com notas de frutos silvestres e madeira.',
    categoryId: 'cat-4',
    price: 15.0,
    vatRate: 0.23,
    sector: 'bar',
    available: true,
    isFavorite: true,
    variants: [
      { id: 'v-12', name: 'Garrafa 75cl', priceDelta: 0 },
      { id: 'v-13', name: 'Copo 15cl', priceDelta: -11.0 },
    ],
    extras: [],
    allowedNotes: ['Servir com decantador', 'Temperatura ambiente'],
    allergens: ['Sulfitos'],
    trackStock: true,
    stockQuantity: 42,
    minStockAlert: 10,
  },
  {
    id: 'p-9',
    code: 'BEB-003',
    name: 'Água das Pedras Salgadas 25cl',
    description: 'Água mineral natural gasocarbónica portuguesa.',
    categoryId: 'cat-4',
    price: 1.8,
    vatRate: 0.06,
    sector: 'bar',
    available: true,
    isFavorite: false,
    variants: [
      { id: 'v-14', name: 'Natural', priceDelta: 0 },
      { id: 'v-15', name: 'Com Limão', priceDelta: 0.2 },
    ],
    extras: [],
    allowedNotes: ['Sem gelo', 'Com rodela de limão'],
    allergens: [],
    trackStock: true,
    stockQuantity: 80,
    minStockAlert: 20,
  },
  {
    id: 'p-10',
    code: 'SOB-001',
    name: 'Pastel de Nata Quente com Canela',
    description: 'Pastel de nata artesanal servido morno com canela e açúcar em pó.',
    categoryId: 'cat-5',
    price: 1.8,
    vatRate: 0.13,
    sector: 'pastelaria',
    available: true,
    isFavorite: true,
    variants: [],
    extras: [{ id: 'e-11', name: 'Bola de gelado de baunilha', priceDelta: 1.5 }],
    allowedNotes: ['Com muita canela', 'Sem açúcar'],
    allergens: ['Glúten', 'Lacticínios', 'Ovos'],
    trackStock: true,
    stockQuantity: 40,
    minStockAlert: 10,
  },
  {
    id: 'p-11',
    code: 'SOB-002',
    name: 'Mousse de Chocolate Caseira',
    description: 'Mousse cremosa feita com chocolate negro 70% e raspas de laranja.',
    categoryId: 'cat-5',
    price: 3.8,
    vatRate: 0.13,
    sector: 'pastelaria',
    available: true,
    isFavorite: true,
    variants: [],
    extras: [{ id: 'e-12', name: 'Natas batidas caseiras', priceDelta: 0.8 }],
    allowedNotes: [],
    allergens: ['Lacticínios', 'Ovos'],
    trackStock: true,
    stockQuantity: 25,
    minStockAlert: 5,
  },
  {
    id: 'p-12',
    code: 'EXT-001',
    name: 'Dose de Batata Frita Caseira',
    description: 'Batata fresca cortada à mão e frita em azeite.',
    categoryId: 'cat-6',
    price: 2.8,
    vatRate: 0.13,
    sector: 'cozinha',
    available: true,
    isFavorite: false,
    variants: [],
    extras: [{ id: 'e-13', name: 'Maionese de alho caseira', priceDelta: 0.8 }],
    allowedNotes: ['Sem sal', 'Muito estaladiça'],
    allergens: [],
    trackStock: true,
    stockQuantity: 100,
    minStockAlert: 20,
  },
  {
    id: 'p-13',
    code: 'BEB-004',
    name: 'Café Espresso Delta Lote Chávena',
    description: 'Café espresso cremoso servido diretamente no atendimento.',
    categoryId: 'cat-4',
    price: 1.1,
    vatRate: 0.13,
    sector: 'atendimento',
    available: true,
    isFavorite: true,
    variants: [
      { id: 'v-16', name: 'Normal', priceDelta: 0 },
      { id: 'v-17', name: 'Curto', priceDelta: 0 },
      { id: 'v-18', name: 'Descafeinado', priceDelta: 0.1 },
    ],
    extras: [],
    allowedNotes: ['Com adoçante', 'Chávena escaldada', 'Sem açúcar'],
    allergens: [],
    trackStock: true,
    stockQuantity: 200,
    minStockAlert: 50,
  },
];

const DEFAULT_REPRESENTATIVES: Representative[] = [
  {
    code: 'REP-101',
    name: 'António Santos - Consultor Gastronómico',
    email: 'antonio.santos@parceiros.pt',
    phone: '+351 918 223 344',
    active: true,
    commissionRate: 0.05, // 5%
    rulesDescription: '5% sobre itens alimentares elegíveis (líquido de IVA e descontos)',
    totalCommissionEarned: 145.5,
    totalEligibleSales: 2910.0,
  },
  {
    code: 'REP-202',
    name: 'Lisboa Food & Tour Partners',
    email: 'contato@lisboafoodpartners.pt',
    phone: '+351 210 556 677',
    active: true,
    commissionRate: 0.07, // 7%
    rulesDescription: '7% sobre grupos turísticos e jantares corporativos',
    totalCommissionEarned: 320.0,
    totalEligibleSales: 4571.4,
  },
  {
    code: 'REP-303',
    name: 'Marta Silva - Relações Públicas',
    email: 'marta.silva@parceiros.pt',
    phone: '+351 961 889 900',
    active: true,
    commissionRate: 0.04, // 4%
    rulesDescription: '4% sobre clientes individuais recomendados',
    totalCommissionEarned: 62.0,
    totalEligibleSales: 1550.0,
  },
];

const DEFAULT_SETTINGS: RestaurantSettings = {
  name: 'Sabores & Nações Lda.',
  tradeName: 'Sabores & Nações',
  nif: '512345678',
  cae: '56101 - Restaurantes tipo tradicional',
  address: 'Avenida da Liberdade, 142',
  city: 'Lisboa',
  postalCode: '1250-146',
  phone: '+351 213 456 789',
  email: 'contacto@saboresenacoes.pt',
  primaryColor: '#c2410c',
  secondaryColor: '#0f172a',
  autoReleaseTableAfterPayment: false,
  vendusApiKey: '',
  vendusTestMode: true,
  vendusSeries: 'FS',
  vendusRegisterId: '1',
  defaultVatRate: 0.13,
  soundAlertsEnabled: true,
  allowCashierInAtendimento: false,
  googleDriveSyncEnabled: true,
  lastDriveBackup: null,
  // Alertas de Atraso de Preparação
  expectedPrepTimeMinutes: 20,
  delayToleranceMinutes: 5,
  readyDeliveryDelayMinutes: 5,
  sectorPrepTimes: {
    cozinha: 20,
    bar: 5,
    pastelaria: 8,
    atendimento: 3,
  },
  alertReminderIntervalMinutes: 5,
  whatsappBusinessConfigured: true,
  whatsappApiKey: 'vendus_wa_cloud_token_live',
  whatsappPhoneNumberId: '351912345678',
  emailSenderName: 'Sabores & Nações',
  emailSenderAddress: 'faturacao@saboresenacoes.pt',
  secureLinkValidityDays: 30,
};

const DEFAULT_CUSTOMERS: Customer[] = [
  {
    id: 'c-1',
    name: 'Consumidor Final',
    nif: '999999990',
    email: '',
    phone: '',
    address: 'Portugal',
    totalSpent: 420.5,
    visitCount: 15,
    lastVisit: new Date().toISOString(),
    cashbackBalance: 0,
    cashbackMovements: [],
    mealPlans: [],
  },
  {
    id: 'c-2',
    name: 'Manuel Rodrigues',
    nif: '219876543',
    email: 'manuel.rodrigues@email.pt',
    phone: '+351 912 345 678',
    address: 'Rua das Flores 12, Lisboa',
    totalSpent: 185.0,
    visitCount: 6,
    lastVisit: new Date().toISOString(),
    cashbackBalance: 12.5,
    cashbackMovements: [
      {
        id: 'cb-1',
        date: new Date(Date.now() - 86400000 * 2).toISOString(),
        type: 'credito',
        amount: 12.5,
        description: 'Crédito de 3% sobre refeição anterior',
      },
    ],
    mealPlans: [
      {
        id: 'pln-1',
        customerId: 'c-2',
        customerName: 'Manuel Rodrigues',
        planName: 'Pack 10 Marmitas Executivas',
        paymentStatus: 'pago',
        activatedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
        expiresAt: new Date(Date.now() + 86400000 * 50).toISOString(),
        totalMeals: 10,
        availableMeals: 7,
        reservedMeals: 0,
        usedMeals: 3,
        history: [
          {
            date: new Date(Date.now() - 86400000 * 5).toISOString(),
            action: 'consumo',
            staffName: 'João Pereira',
            notes: 'Levantamento no balcão: Marmita de Picanha',
          },
        ],
      },
    ],
  },
  {
    id: 'c-3',
    name: 'Empresa Lusitana Tech Lda.',
    nif: '501234564',
    email: 'financeiro@lusitanatech.pt',
    phone: '+351 210 987 654',
    address: 'Parque das Nações, Lote 4.12, Lisboa',
    totalSpent: 890.0,
    visitCount: 12,
    lastVisit: new Date().toISOString(),
    cashbackBalance: 45.0,
    cashbackMovements: [
      {
        id: 'cb-2',
        date: new Date(Date.now() - 86400000).toISOString(),
        type: 'credito',
        amount: 45.0,
        description: 'Cashback corporativo acordado',
      },
    ],
    mealPlans: [
      {
        id: 'pln-2',
        customerId: 'c-3',
        customerName: 'Empresa Lusitana Tech Lda.',
        planName: 'Pack 20 Almoços de Equipa',
        paymentStatus: 'pago',
        activatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        expiresAt: new Date(Date.now() + 86400000 * 30).toISOString(),
        totalMeals: 20,
        availableMeals: 16,
        reservedMeals: 0,
        usedMeals: 4,
        history: [],
      },
    ],
  },
];

const INITIAL_CASH_SESSION: CashSession = {
  id: 'CS-001',
  openedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  openedBy: 'u-5',
  openedByName: 'Ana Costa',
  initialFloat: 150.0,
  currentFloat: 150.0,
  status: 'aberto',
  movements: [
    {
      id: 'mov-1',
      sessionId: 'CS-001',
      type: 'abertura',
      amount: 150.0,
      reason: 'Fundo de maneio inicial do turno',
      registeredBy: 'u-5',
      registeredByName: 'Ana Costa',
      timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
  ],
  expectedTotals: {
    dinheiro: 0,
    cartao: 0,
    mbway: 0,
    transferencia: 0,
    total: 0,
  },
};

const DEFAULT_ONLINE_ORDERS: OnlineOrder[] = [
  {
    id: 'WEB-2026-0045',
    source: 'site_sabores_nacoes',
    customerName: 'Dra. Beatriz Mendes',
    customerPhone: '+351 933 445 566',
    customerNif: '234567890',
    deliveryType: 'entrega',
    deliveryAddress: 'Rua do Alecrim 45, 2º Dto, Lisboa',
    requestedTime: '13:00',
    items: [
      {
        id: 'WEB-ITM-1',
        productId: 'p-1',
        productCode: 'PRT-001',
        productName: 'Bacalhau à Brás Tradicional',
        quantity: 2,
        unitPrice: 14.5,
        vatRate: 0.13,
        sector: 'cozinha',
        selectedExtras: [],
        totalItemPrice: 29.0,
        notes: 'Sem cebola numa das doses',
        status: 'em_preparacao',
        statusUpdatedAt: new Date(Date.now() - 600000).toISOString(),
        roundNumber: 1,
        seatName: 'Entrega Web',
      },
      {
        id: 'WEB-ITM-2',
        productId: 'p-7',
        productCode: 'BEB-001',
        productName: 'Cerveja Super Bock Pressão 33cl',
        quantity: 2,
        unitPrice: 2.5,
        vatRate: 0.23,
        sector: 'bar',
        selectedExtras: [],
        totalItemPrice: 5.0,
        notes: '',
        status: 'pronto',
        statusUpdatedAt: new Date(Date.now() - 300000).toISOString(),
        roundNumber: 1,
        seatName: 'Entrega Web',
      },
    ],
    total: 34.0,
    subtotal: 29.75,
    taxTotal: 4.25,
    paymentStatus: 'pago_online',
    paymentMethod: 'MB Way Online (Site)',
    prepStatus: 'em_preparacao',
    createdAt: new Date(Date.now() - 900000).toISOString(),
    saleId: 'VENDA-WEB-0045',
    documentNumber: 'FS 2026/0038',
  },
];

const INITIAL_SAMPLE_COMANDA: Comanda = {
  id: 'cmd-sample-mesa-2',
  numberDisplay: 'CMD-001',
  tableId: 't-2',
  tableName: 'Mesa 2',
  roomName: 'Sala Principal',
  guestCount: 2,
  status: 'aberta',
  openedAt: new Date(Date.now() - 1200000).toISOString(),
  updatedAt: new Date(Date.now() - 300000).toISOString(),
  waiterId: 'u-3',
  waiterName: 'João Pereira',
  discountAmount: 0,
  seats: [
    { seatNumber: 1, name: 'Ana', allergies: [] },
    { seatNumber: 2, name: 'Pedro', allergies: [{ id: 'al-1', name: 'Marisco', type: 'alergia' }] },
  ],
  rounds: [
    {
      roundNumber: 1,
      createdAt: new Date(Date.now() - 900000).toISOString(),
      waiterId: 'u-3',
      waiterName: 'João Pereira',
      items: [
        {
          id: 'item-demo-1',
          productId: 'p-1',
          productCode: 'PRT-001',
          productName: 'Bacalhau à Brás Tradicional',
          quantity: 1,
          unitPrice: 14.5,
          vatRate: 0.13,
          sector: 'cozinha',
          selectedExtras: [],
          totalItemPrice: 14.5,
          notes: 'Bem estaladiço',
          status: 'em_preparacao',
          statusUpdatedAt: new Date(Date.now() - 600000).toISOString(),
          roundNumber: 1,
          seatNumber: 1,
          seatName: 'Ana',
        },
        {
          id: 'item-demo-2',
          productId: 'p-8',
          productCode: 'BEB-008',
          productName: 'Água das Pedras Salgadas 25cl',
          quantity: 2,
          unitPrice: 2.2,
          vatRate: 0.23,
          sector: 'bar',
          selectedExtras: [],
          totalItemPrice: 4.4,
          notes: 'Com limão e gelo',
          status: 'pronto',
          statusUpdatedAt: new Date(Date.now() - 200000).toISOString(),
          roundNumber: 1,
          seatNumber: 2,
          seatName: 'Pedro',
        },
      ],
    },
  ],
  total: 18.9,
  subtotal: 16.41,
  taxTotal: 2.49,
  paidAmount: 0,
  balanceDue: 18.9,
  saleId: 'VENDA-CMD-001',
  version: 1,
};

function getInitialState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const comandas = parsed.comandas?.length ? parsed.comandas : [INITIAL_SAMPLE_COMANDA];
      const tables = parsed.tables?.length ? parsed.tables : DEFAULT_TABLES;

      return {
        ...parsed,
        tables,
        comandas,
        isOnline: navigator.onLine,
        currentUser: parsed.currentUser || DEFAULT_USERS[0],
        users: parsed.users?.length ? parsed.users : DEFAULT_USERS,
        representatives: parsed.representatives || DEFAULT_REPRESENTATIVES,
        onlineOrders: parsed.onlineOrders || DEFAULT_ONLINE_ORDERS,
        shiftHandovers: parsed.shiftHandovers || [],
        tableCalls: parsed.tableCalls || [],
        auditLogs: parsed.auditLogs || [],
      };
    }
  } catch (err) {
    console.error('Falha ao ler estado local:', err);
  }

  return {
    currentUser: DEFAULT_USERS[0],
    users: DEFAULT_USERS,
    rooms: DEFAULT_ROOMS,
    tables: DEFAULT_TABLES,
    categories: DEFAULT_CATEGORIES,
    products: DEFAULT_PRODUCTS,
    comandas: [INITIAL_SAMPLE_COMANDA],
    sales: [],
    fiscalDocuments: [],
    cashSessions: [INITIAL_CASH_SESSION],
    currentCashSessionId: INITIAL_CASH_SESSION.id,
    customers: DEFAULT_CUSTOMERS,
    stockMovements: [],
    representatives: DEFAULT_REPRESENTATIVES,
    onlineOrders: DEFAULT_ONLINE_ORDERS,
    shiftHandovers: [],
    tableCalls: [],
    settings: DEFAULT_SETTINGS,
    auditLogs: [],
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pendingSyncQueue: [],
    lastSequentialDocNumber: 100,
  };
}

class Store {
  private state: AppState;
  private listeners: Set<(state: AppState) => void> = new Set();
  private broadcastChannel: BroadcastChannel | null = null;

  constructor() {
    this.state = getInitialState();
    this.initSync();
  }

  private initSync() {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        this.broadcastChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
        this.broadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'STATE_UPDATED') {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
              this.state = JSON.parse(raw);
              this.notify();
            }
          }
        };
      }

      if (typeof window !== 'undefined') {
        window.addEventListener('storage', (event) => {
          if (event.key === STORAGE_KEY && event.newValue) {
            this.state = JSON.parse(event.newValue);
            this.notify();
          }
        });

        window.addEventListener('online', () => this.setOnline(true));
        window.addEventListener('offline', () => this.setOnline(false));
      }
    } catch {
      // Silencioso em caso de restrições de sandbox
    }
  }

  public getState(): AppState {
    return this.state;
  }

  public subscribe(listener: (state: AppState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener(this.state));
  }

  private persistAndBroadcast() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      this.broadcastChannel?.postMessage({ type: 'STATE_UPDATED', timestamp: Date.now() });
    } catch (err) {
      console.error('Erro ao guardar estado:', err);
    }
    this.notify();
  }

  public setCurrentUser(user: User) {
    this.state = { ...this.state, currentUser: user };
    this.persistAndBroadcast();
  }

  // --- SEGURANÇA OPERACIONAL, RBAC & AUDITORIA ---

  public canUserAccessModule(user: User, module: ModuleType): boolean {
    if (!user || user.active === false) return false;
    if (user.role === 'admin' || user.role === 'manager') return true;
    if (user.allowedModules && user.allowedModules.length > 0) {
      return user.allowedModules.includes(module);
    }
    switch (user.role) {
      case 'waiter':
        return module === 'atendimento';
      case 'kitchen':
        return module === 'cozinha';
      case 'bar':
        return module === 'bar';
      case 'cashier':
        return module === 'admin';
      default:
        return false;
    }
  }

  public getDefaultModuleForUser(user: User): ModuleType {
    if (!user || user.active === false) return 'atendimento';
    switch (user.role) {
      case 'waiter':
        return 'atendimento';
      case 'kitchen':
        return 'cozinha';
      case 'bar':
        return 'bar';
      case 'cashier':
      case 'admin':
      case 'manager':
        return 'admin';
      default:
        return 'atendimento';
    }
  }

  public addAuditLog(entry: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const log: AuditLog = {
      ...entry,
      id: `AUDIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
    };
    const updatedLogs = [log, ...(this.state.auditLogs || [])].slice(0, 500);
    this.state = { ...this.state, auditLogs: updatedLogs };
    this.persistAndBroadcast();
    return log;
  }

  public saveUser(userToSave: User, operator: User): User {
    if (operator.role !== 'admin' && operator.role !== 'manager') {
      throw new Error('Apenas Administradores podem criar ou editar utilizadores');
    }

    const nowIso = new Date().toISOString();
    const existingIndex = this.state.users.findIndex((u) => u.id === userToSave.id);
    let updatedUsers: User[];
    let finalUser: User;

    if (existingIndex >= 0) {
      finalUser = { ...userToSave, active: userToSave.active !== false };
      updatedUsers = [...this.state.users];
      updatedUsers[existingIndex] = finalUser;
    } else {
      finalUser = {
        ...userToSave,
        id: userToSave.id || `u-${Date.now()}`,
        active: userToSave.active !== false,
        createdAt: nowIso,
      };
      updatedUsers = [...this.state.users, finalUser];
    }

    this.state = { ...this.state, users: updatedUsers };
    this.addAuditLog({
      userId: operator.id,
      userName: operator.name,
      userRole: operator.role,
      action: existingIndex >= 0 ? 'UTILIZADOR_ATUALIZADO' : 'UTILIZADOR_CRIADO',
      module: 'admin',
      details: `${existingIndex >= 0 ? 'Atualizado' : 'Criado'} utilizador ${finalUser.name} (${finalUser.role})`,
      targetId: finalUser.id,
    });
    this.persistAndBroadcast();
    return finalUser;
  }

  public toggleUserStatus(userId: string, active: boolean, operator: User): void {
    if (operator.role !== 'admin' && operator.role !== 'manager') {
      throw new Error('Apenas Administradores podem ativar ou desativar contas de utilizadores');
    }
    if (userId === operator.id && !active) {
      throw new Error('Não é possível desativar a sua própria conta de Administrador');
    }

    const targetUser = this.state.users.find((u) => u.id === userId);
    if (!targetUser) throw new Error('Utilizador não encontrado');

    const updatedUsers = this.state.users.map((u) => (u.id === userId ? { ...u, active } : u));
    this.state = { ...this.state, users: updatedUsers };

    this.addAuditLog({
      userId: operator.id,
      userName: operator.name,
      userRole: operator.role,
      action: active ? 'UTILIZADOR_ATIVADO' : 'UTILIZADOR_DESATIVADO',
      module: 'admin',
      details: `Conta de ${targetUser.name} (${targetUser.role}) foi ${active ? 'ativada' : 'desativada'}`,
      targetId: userId,
    });
    this.persistAndBroadcast();
  }

  public deleteUser(userId: string, operator: User): void {
    if (operator.role !== 'admin') {
      throw new Error('Apenas Administradores podem remover utilizadores');
    }
    if (userId === operator.id) {
      throw new Error('Não é possível apagar a sua própria conta');
    }

    const targetUser = this.state.users.find((u) => u.id === userId);
    const updatedUsers = this.state.users.filter((u) => u.id !== userId);
    this.state = { ...this.state, users: updatedUsers };

    if (targetUser) {
      this.addAuditLog({
        userId: operator.id,
        userName: operator.name,
        userRole: operator.role,
        action: 'UTILIZADOR_REMOVIDO',
        module: 'admin',
        details: `Conta de ${targetUser.name} (${targetUser.role}) foi eliminada`,
        targetId: userId,
      });
    }
    this.persistAndBroadcast();
  }

  public setOnline(isOnline: boolean) {
    this.state = { ...this.state, isOnline };
    if (isOnline && this.state.pendingSyncQueue.length > 0) {
      this.processPendingSyncQueue();
    }
    this.persistAndBroadcast();
  }

  public processPendingSyncQueue() {
    this.state = { ...this.state, pendingSyncQueue: [] };
    this.persistAndBroadcast();
  }

  public resetDatabase() {
    localStorage.removeItem(STORAGE_KEY);
    this.state = getInitialState();
    this.persistAndBroadcast();
  }

  // --- COMANDAS, LUGARES E MESAS ---

  public openComanda(
    tableId: string,
    guestCount: number,
    waiter: User,
    representativeCode?: string
  ): Comanda {
    const table = this.state.tables.find((t) => t.id === tableId);
    if (!table) throw new Error('Mesa não encontrada');

    if (table.activeComandaId) {
      const existing = this.state.comandas.find(
        (c) => c.id === table.activeComandaId && c.status === 'aberta'
      );
      if (existing) return existing;
    }

    const comandaId = `CMD-${Date.now().toString().slice(-6)}`;
    const saleId = `VENDA-${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();
    const count = Math.max(1, guestCount || 1);

    // Cria automaticamente os lugares com base no número de pessoas
    const initialSeats: TableSeat[] = Array.from({ length: count }, (_, i) => ({
      seatNumber: i + 1,
      name: '',
      allergies: [],
    }));

    // Verifica representante se informado
    let repName: string | undefined;
    let repRate: number | undefined;
    if (representativeCode) {
      const rep = this.state.representatives.find(
        (r) => r.code.toUpperCase() === representativeCode.toUpperCase() && r.active
      );
      if (rep) {
        repName = rep.name;
        repRate = rep.commissionRate;
      }
    }

    const newComanda: Comanda = {
      id: comandaId,
      numberDisplay: comandaId,
      tableId: table.id,
      tableName: table.number,
      roomName: table.roomName,
      waiterId: waiter.id,
      waiterName: waiter.name,
      guestCount: count,
      seats: initialSeats,
      openedAt: nowIso,
      updatedAt: nowIso,
      status: 'aberta',
      rounds: [],
      subtotal: 0,
      taxTotal: 0,
      total: 0,
      discountAmount: 0,
      paidAmount: 0,
      balanceDue: 0,
      saleId,
      version: 1,
      representativeCode,
      representativeName: repName,
      commissionRate: repRate,
      commissionAmount: 0,
    };

    const updatedTables = this.state.tables.map((t) =>
      t.id === tableId
        ? {
            ...t,
            status: 'ocupada' as const,
            waiterId: waiter.id,
            waiterName: waiter.name,
            activeComandaId: comandaId,
            guestCount: newComanda.guestCount,
            openedAt: nowIso,
            totalAmount: 0,
          }
        : t
    );

    const newSale: Sale = {
      id: saleId,
      comandaId,
      tableId: table.id,
      tableName: table.number,
      roomName: table.roomName,
      guestCount: newComanda.guestCount,
      waiterId: waiter.id,
      waiterName: waiter.name,
      createdAt: nowIso,
      subtotal: 0,
      taxTotal: 0,
      total: 0,
      discountAmount: 0,
      paidAmount: 0,
      balanceDue: 0,
      status: 'aberta',
      fiscalStatus: 'nao_emitida',
      items: [],
      payments: [],
      representativeCode,
      representativeName: repName,
    };

    this.state = {
      ...this.state,
      comandas: [newComanda, ...this.state.comandas],
      tables: updatedTables,
      sales: [newSale, ...this.state.sales],
    };

    this.persistAndBroadcast();
    return newComanda;
  }

  /**
   * Adiciona um novo lugar à comanda durante o atendimento
   */
  public addSeatToComanda(comandaId: string, name?: string, allergies: AllergyRestriction[] = []) {
    const comanda = this.state.comandas.find((c) => c.id === comandaId);
    if (!comanda) throw new Error('Comanda não encontrada');

    const nextSeatNum = (comanda.seats.length || 0) + 1;
    const newSeat: TableSeat = {
      seatNumber: nextSeatNum,
      name: name?.trim() || '',
      allergies,
    };

    const updatedComandas = this.state.comandas.map((c) =>
      c.id === comandaId
        ? {
            ...c,
            guestCount: c.guestCount + 1,
            seats: [...c.seats, newSeat],
            updatedAt: new Date().toISOString(),
          }
        : c
    );

    // Atualiza lugares na mesa
    const updatedTables = this.state.tables.map((t) =>
      t.id === comanda.tableId ? { ...t, guestCount: (t.guestCount || 1) + 1 } : t
    );

    this.state = { ...this.state, comandas: updatedComandas, tables: updatedTables };
    this.persistAndBroadcast();
  }

  /**
   * Atualiza dados de um lugar (nome e alergias/restrições)
   */
  public updateSeat(
    comandaId: string,
    seatNumber: number,
    name: string,
    allergies: AllergyRestriction[]
  ) {
    const updatedComandas = this.state.comandas.map((c) => {
      if (c.id === comandaId) {
        const updatedSeats = c.seats.map((s) =>
          s.seatNumber === seatNumber ? { ...s, name: name.trim(), allergies } : s
        );
        return { ...c, seats: updatedSeats, updatedAt: new Date().toISOString() };
      }
      return c;
    });

    this.state = { ...this.state, comandas: updatedComandas };
    this.persistAndBroadcast();
  }

  /**
   * Transfere um item entre lugares na mesma comanda (com registo de histórico)
   */
  public transferItemBetweenSeats(comandaId: string, itemId: string, targetSeatNumber?: number) {
    const comanda = this.state.comandas.find((c) => c.id === comandaId);
    if (!comanda) throw new Error('Comanda não encontrada');

    const updatedRounds = comanda.rounds.map((round) => {
      const itemIdx = round.items.findIndex((i) => i.id === itemId);
      if (itemIdx >= 0) {
        const item = round.items[itemIdx];
        const prevSeat = item.seatNumber;
        const targetSeat = targetSeatNumber
          ? comanda.seats.find((s) => s.seatNumber === targetSeatNumber)
          : undefined;

        const updatedItem: OrderItem = {
          ...item,
          seatNumber: targetSeatNumber,
          seatName: targetSeat?.name || (targetSeatNumber ? `Lugar ${targetSeatNumber}` : 'Para partilhar'),
          transferredFromSeat: prevSeat,
        };

        const newItems = [...round.items];
        newItems[itemIdx] = updatedItem;
        return { ...round, items: newItems };
      }
      return round;
    });

    const updatedComandas = this.state.comandas.map((c) =>
      c.id === comandaId ? { ...c, rounds: updatedRounds, updatedAt: new Date().toISOString() } : c
    );

    this.state = { ...this.state, comandas: updatedComandas };
    this.persistAndBroadcast();
  }

  /**
   * Adiciona nova ronda de pedidos à comanda
   */
  public addOrderRound(
    comandaId: string,
    items: Omit<OrderItem, 'id' | 'roundNumber' | 'status' | 'statusUpdatedAt'>[],
    waiter: User
  ): Comanda {
    if (!items || items.length === 0) {
      throw new Error('Nenhum item selecionado para envio');
    }

    // Validação estrita de setor responsável (Requisito 5)
    for (const it of items) {
      if (!it.sector || !['cozinha', 'bar', 'atendimento', 'pastelaria'].includes(it.sector)) {
        throw new Error(
          `Impossível enviar: o produto "${it.productName}" não tem um setor responsável configurado. O administrador deve aceder ao Cardápio e atribuir o setor obrigatório (Cozinha/Copa, Bar ou Atendimento).`
        );
      }
    }

    const comanda = this.state.comandas.find((c) => c.id === comandaId);
    if (!comanda) throw new Error('Comanda não encontrada');
    if (comanda.status !== 'aberta') {
      throw new Error('Não é possível adicionar itens a uma comanda já fechada ou em pagamento');
    }

    const nowIso = new Date().toISOString();
    const roundNumber = (comanda.rounds.length || 0) + 1;

    const createdItems: OrderItem[] = items.map((it, idx) => ({
      ...it,
      id: `ITEM-${Date.now()}-${roundNumber}-${idx}`,
      roundNumber,
      status: 'recebido' as const,
      statusUpdatedAt: nowIso,
    }));

    const newRound: OrderRound = {
      roundNumber,
      createdAt: nowIso,
      waiterId: waiter.id,
      waiterName: waiter.name,
      items: createdItems,
    };

    const updatedRounds = [...comanda.rounds, newRound];

    const allValidItems = updatedRounds
      .flatMap((r) => r.items)
      .filter((i) => i.status !== 'cancelado');

    const subtotal = allValidItems.reduce((acc, it) => acc + it.totalItemPrice / (1 + it.vatRate), 0);
    const total = allValidItems.reduce((acc, it) => acc + it.totalItemPrice, 0);
    const taxTotal = total - subtotal;
    const balanceDue = Math.max(0, total - comanda.paidAmount - comanda.discountAmount);

    // Comissão do representante sobre alimentos líquidos elegíveis
    let commissionAmount = 0;
    if (comanda.commissionRate) {
      const eligibleBase = allValidItems
        .filter((it) => it.sector === 'cozinha' || it.sector === 'pastelaria')
        .reduce((sum, it) => sum + it.totalItemPrice / (1 + it.vatRate), 0);
      commissionAmount = Math.round(eligibleBase * comanda.commissionRate * 100) / 100;
    }

    const updatedComanda: Comanda = {
      ...comanda,
      rounds: updatedRounds,
      subtotal: Math.round(subtotal * 100) / 100,
      taxTotal: Math.round(taxTotal * 100) / 100,
      total: Math.round(total * 100) / 100,
      balanceDue: Math.round(balanceDue * 100) / 100,
      commissionAmount,
      updatedAt: nowIso,
      version: comanda.version + 1,
    };

    // Baixa de stock
    const newStockMovements: StockMovement[] = [];
    const updatedProducts = this.state.products.map((p) => {
      const itemMatch = createdItems.find((ci) => ci.productId === p.id);
      if (itemMatch && p.trackStock) {
        const prev = p.stockQuantity;
        const next = Math.max(0, prev - itemMatch.quantity);
        newStockMovements.push({
          id: `STK-${Date.now()}-${p.id}`,
          productId: p.id,
          productName: p.name,
          type: 'saida_venda',
          quantity: itemMatch.quantity,
          previousStock: prev,
          newStock: next,
          reason: `Comanda ${comanda.numberDisplay} - Ronda ${roundNumber}`,
          date: nowIso,
          userName: waiter.name,
        });
        return { ...p, stockQuantity: next };
      }
      return p;
    });

    const updatedComandas = this.state.comandas.map((c) => (c.id === comandaId ? updatedComanda : c));

    const updatedTables = this.state.tables.map((t) =>
      t.id === comanda.tableId ? { ...t, totalAmount: updatedComanda.total } : t
    );

    const updatedSales = this.state.sales.map((s) =>
      s.id === comanda.saleId
        ? {
            ...s,
            items: allValidItems,
            subtotal: updatedComanda.subtotal,
            taxTotal: updatedComanda.taxTotal,
            total: updatedComanda.total,
            balanceDue: updatedComanda.balanceDue,
            commissionAmount,
          }
        : s
    );

    this.state = {
      ...this.state,
      comandas: updatedComandas,
      tables: updatedTables,
      sales: updatedSales,
      products: updatedProducts,
      stockMovements: [...newStockMovements, ...this.state.stockMovements],
    };

    if (this.state.settings.soundAlertsEnabled) {
      playAlertSound('order');
    }

    this.persistAndBroadcast();
    return updatedComanda;
  }

  /**
   * Repetir itens de rondas anteriores como uma nova ronda
   */
  public repeatOrderItems(
    comandaId: string,
    itemsToRepeat: {
      productId: string;
      quantity: number;
      seatNumber?: number;
      notes: string;
    }[],
    user: User
  ) {
    const comanda = this.state.comandas.find((c) => c.id === comandaId);
    if (!comanda) throw new Error('Comanda não encontrada');

    const mappedItems: Omit<OrderItem, 'id' | 'roundNumber' | 'status' | 'statusUpdatedAt'>[] = [];

    for (const req of itemsToRepeat) {
      const product = this.state.products.find((p) => p.id === req.productId);
      if (!product || !product.available) {
        throw new Error(`O produto "${product?.name || req.productId}" não está disponível no momento.`);
      }

      const seatObj = req.seatNumber ? comanda.seats.find((s) => s.seatNumber === req.seatNumber) : undefined;

      mappedItems.push({
        productId: product.id,
        productCode: product.code,
        productName: product.name,
        quantity: req.quantity,
        unitPrice: product.price,
        vatRate: product.vatRate,
        sector: product.sector,
        selectedExtras: [],
        totalItemPrice: product.price * req.quantity,
        notes: req.notes,
        seatNumber: req.seatNumber,
        seatName: seatObj?.name || (req.seatNumber ? `Lugar ${req.seatNumber}` : 'Para partilhar'),
      });
    }

    return this.addOrderRound(comandaId, mappedItems, user);
  }

  /**
   * Avisar copa/cozinha sobre pedido atrasado com registo de carimbo temporal
   */
  public alertKitchenForDelayedRound(comandaId: string, roundNumber: number) {
    const nowIso = new Date().toISOString();
    const updatedComandas = this.state.comandas.map((c) => {
      if (c.id === comandaId) {
        const updatedRounds = c.rounds.map((r) =>
          r.roundNumber === roundNumber ? { ...r, kitchenAlertedAt: nowIso } : r
        );
        return { ...c, rounds: updatedRounds };
      }
      return c;
    });

    this.state = { ...this.state, comandas: updatedComandas };

    if (this.state.settings.soundAlertsEnabled) {
      playAlertSound('cancel');
    }

    this.persistAndBroadcast();
  }

  /**
   * Cozinha confirma leitura do alerta de atraso
   */
  public acknowledgeKitchenAlert(comandaId: string, roundNumber: number, user: User) {
    const nowIso = new Date().toISOString();
    const updatedComandas = this.state.comandas.map((c) => {
      if (c.id === comandaId) {
        const updatedRounds = c.rounds.map((r) =>
          r.roundNumber === roundNumber
            ? { ...r, kitchenAcknowledgedAt: nowIso, kitchenAcknowledgedBy: user.name }
            : r
        );
        return { ...c, rounds: updatedRounds };
      }
      return c;
    });

    this.state = { ...this.state, comandas: updatedComandas };
    this.persistAndBroadcast();
  }

  /**
   * Chamar empregado por QR Code (Portal do Cliente na Mesa)
   */
  public createTableCall(tableId: string, type: CallType): TableCall {
    const table = this.state.tables.find((t) => t.id === tableId);
    if (!table) throw new Error('Mesa não encontrada');

    // Anti-spam: Não permitir chamada duplicada se já houver uma idêntica pendente
    const existingPending = this.state.tableCalls.find(
      (c) => c.tableId === tableId && c.type === type && c.status !== 'concluido'
    );
    if (existingPending) {
      return existingPending;
    }

    const newCall: TableCall = {
      id: `CALL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tableId,
      tableNumber: table.number,
      type,
      status: 'solicitado',
      createdAt: new Date().toISOString(),
    };

    const updatedTables = this.state.tables.map((t) =>
      t.id === tableId ? { ...t, activeCall: newCall } : t
    );

    this.state = {
      ...this.state,
      tableCalls: [newCall, ...this.state.tableCalls],
      tables: updatedTables,
    };

    if (this.state.settings.soundAlertsEnabled) {
      playAlertSound('ready');
    }

    this.persistAndBroadcast();
    return newCall;
  }

  public acceptTableCall(callId: string, user: User) {
    const updatedCalls = this.state.tableCalls.map((c) =>
      c.id === callId
        ? {
            ...c,
            status: 'em_atendimento' as const,
            handledBy: user.id,
            handledByName: user.name,
          }
        : c
    );

    const call = updatedCalls.find((c) => c.id === callId);
    const updatedTables = this.state.tables.map((t) =>
      t.id === call?.tableId ? { ...t, activeCall: call } : t
    );

    this.state = { ...this.state, tableCalls: updatedCalls, tables: updatedTables };
    this.persistAndBroadcast();
  }

  public completeTableCall(callId: string) {
    const nowIso = new Date().toISOString();
    const updatedCalls = this.state.tableCalls.map((c) =>
      c.id === callId
        ? { ...c, status: 'concluido' as const, completedAt: nowIso }
        : c
    );

    const call = this.state.tableCalls.find((c) => c.id === callId);
    const updatedTables = this.state.tables.map((t) =>
      t.id === call?.tableId ? { ...t, activeCall: undefined } : t
    );

    this.state = { ...this.state, tableCalls: updatedCalls, tables: updatedTables };
    this.persistAndBroadcast();
  }

  public regenerateTableQrToken(tableId: string): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const randomChunk = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const newToken = `sn-tbl-${tableId.replace('t-', '')}-${randomChunk}`;

    const updatedTables = this.state.tables.map((t) =>
      t.id === tableId ? { ...t, qrCodeToken: newToken } : t
    );

    this.state = { ...this.state, tables: updatedTables };
    this.persistAndBroadcast();
    return newToken;
  }

  /**
   * Passagem de Turno entre Empregados
   */
  public createShiftHandover(params: {
    outgoingWaiterId: string;
    incomingWaiterId: string;
    tableIds: string[];
    notes: string;
    isManagerOverride?: boolean;
    user: User;
  }): ShiftHandover {
    const { outgoingWaiterId, incomingWaiterId, tableIds, notes, isManagerOverride } = params;

    const outgoing = this.state.users.find((u) => u.id === outgoingWaiterId);
    const incoming = this.state.users.find((u) => u.id === incomingWaiterId);
    if (!outgoing || !incoming) throw new Error('Empregado não encontrado');

    // Calcula resumo do turno a transferir
    const openTables = this.state.tables.filter((t) => tableIds.includes(t.id));
    const activeCmds = this.state.comandas.filter(
      (c) => tableIds.includes(c.tableId) && c.status === 'aberta'
    );

    const preppingOrdersCount = activeCmds.reduce(
      (sum, c) =>
        sum +
        c.rounds.reduce(
          (rSum, r) =>
            rSum + r.items.filter((i) => i.status === 'recebido' || i.status === 'em_preparacao').length,
          0
        ),
      0
    );

    const readyUndeliveredCount = activeCmds.reduce(
      (sum, c) =>
        sum +
        c.rounds.reduce(
          (rSum, r) => rSum + r.items.filter((i) => i.status === 'pronto').length,
          0
        ),
      0
    );

    const handover: ShiftHandover = {
      id: `HND-${Date.now()}`,
      timestamp: new Date().toISOString(),
      outgoingWaiterId: outgoing.id,
      outgoingWaiterName: outgoing.name,
      incomingWaiterId: incoming.id,
      incomingWaiterName: incoming.name,
      tableIds,
      notes: notes.trim(),
      status: isManagerOverride ? 'atribuida_gerente' : 'aceite',
      summary: {
        openTablesCount: openTables.length,
        preppingOrdersCount,
        readyUndeliveredCount,
        delayAlertsCount: 0,
        pendingCallsCount: openTables.filter((t) => !!t.activeCall).length,
        activeAllergiesCount: activeCmds.reduce(
          (sum, c) => sum + c.seats.filter((s) => s.allergies.length > 0).length,
          0
        ),
      },
    };

    // Atualiza mesas e comandas para o novo empregado
    const updatedTables = this.state.tables.map((t) =>
      tableIds.includes(t.id) ? { ...t, waiterId: incoming.id, waiterName: incoming.name } : t
    );

    const updatedComandas = this.state.comandas.map((c) =>
      tableIds.includes(c.tableId) ? { ...c, waiterId: incoming.id, waiterName: incoming.name } : c
    );

    this.state = {
      ...this.state,
      shiftHandovers: [handover, ...this.state.shiftHandovers],
      tables: updatedTables,
      comandas: updatedComandas,
    };

    this.persistAndBroadcast();
    return handover;
  }

  /**
   * Utilizar refeição de Plano de Marmitas
   */
  public redeemMealPlanMeal(comandaId: string, customerId: string, mealPlanId: string, user: User) {
    const customer = this.state.customers.find((c) => c.id === customerId);
    if (!customer) throw new Error('Cliente não encontrado');

    const plan = customer.mealPlans?.find((p) => p.id === mealPlanId);
    if (!plan) throw new Error('Plano de marmitas não encontrado');
    if (plan.paymentStatus !== 'pago') throw new Error('O plano ainda aguarda confirmação de pagamento');
    if (plan.availableMeals <= 0) throw new Error('O plano não possui refeições disponíveis');

    const nowIso = new Date().toISOString();

    const updatedPlan: MealPlan = {
      ...plan,
      availableMeals: plan.availableMeals - 1,
      usedMeals: plan.usedMeals + 1,
      history: [
        {
          date: nowIso,
          action: 'consumo',
          staffName: user.name,
          notes: `Consumo na comanda ${comandaId}`,
        },
        ...(plan.history || []),
      ],
    };

    const updatedCustomers = this.state.customers.map((c) =>
      c.id === customerId
        ? {
            ...c,
            mealPlans: c.mealPlans.map((p) => (p.id === mealPlanId ? updatedPlan : p)),
          }
        : c
    );

    const updatedComandas = this.state.comandas.map((cmd) =>
      cmd.id === comandaId
        ? { ...cmd, planMealsUsed: (cmd.planMealsUsed || 0) + 1, customerId, customerName: customer.name }
        : cmd
    );

    this.state = {
      ...this.state,
      customers: updatedCustomers,
      comandas: updatedComandas,
    };

    this.persistAndBroadcast();
  }

  /**
   * Utilizar Saldo de Cashback como Pagamento / Desconto
   */
  public applyCashbackDiscount(comandaId: string, customerId: string, amount: number): number {
    const customer = this.state.customers.find((c) => c.id === customerId);
    if (!customer) throw new Error('Cliente não encontrado');
    if (amount <= 0) throw new Error('Valor inválido');
    if (amount > customer.cashbackBalance) {
      throw new Error(`Saldo de cashback insuficiente. Disponível: ${customer.cashbackBalance.toFixed(2)} €`);
    }

    const comanda = this.state.comandas.find((c) => c.id === comandaId);
    if (!comanda) throw new Error('Comanda não encontrada');

    const effectiveAmount = Math.min(amount, comanda.balanceDue);
    const nowIso = new Date().toISOString();

    const cashbackMov: CashbackMovement = {
      id: `CB-MOV-${Date.now()}`,
      date: nowIso,
      type: 'utilizacao',
      amount: effectiveAmount,
      saleId: comanda.saleId,
      description: `Utilização de cashback na comanda ${comanda.numberDisplay}`,
    };

    const updatedCustomers = this.state.customers.map((c) =>
      c.id === customerId
        ? {
            ...c,
            cashbackBalance: Math.round((c.cashbackBalance - effectiveAmount) * 100) / 100,
            cashbackMovements: [cashbackMov, ...(c.cashbackMovements || [])],
          }
        : c
    );

    const updatedComandas = this.state.comandas.map((c) =>
      c.id === comandaId
        ? {
            ...c,
            cashbackUsed: (c.cashbackUsed || 0) + effectiveAmount,
            paidAmount: c.paidAmount + effectiveAmount,
            balanceDue: Math.max(0, c.balanceDue - effectiveAmount),
          }
        : c
    );

    this.state = {
      ...this.state,
      customers: updatedCustomers,
      comandas: updatedComandas,
    };

    this.persistAndBroadcast();
    return effectiveAmount;
  }

  /**
   * Associar Representante a uma Comanda
   */
  public associateRepresentativeToComanda(comandaId: string, repCode: string) {
    const rep = this.state.representatives.find(
      (r) => r.code.toUpperCase() === repCode.toUpperCase() && r.active
    );
    if (!rep) throw new Error('Código de representante inválido ou inativo');

    const comanda = this.state.comandas.find((c) => c.id === comandaId);
    if (!comanda) throw new Error('Comanda não encontrada');

    // Calcula comissão
    const allValidItems = comanda.rounds.flatMap((r) => r.items).filter((i) => i.status !== 'cancelado');
    const eligibleBase = allValidItems
      .filter((it) => it.sector === 'cozinha' || it.sector === 'pastelaria')
      .reduce((sum, it) => sum + it.totalItemPrice / (1 + it.vatRate), 0);
    const commissionAmount = Math.round(eligibleBase * rep.commissionRate * 100) / 100;

    const updatedComandas = this.state.comandas.map((c) =>
      c.id === comandaId
        ? {
            ...c,
            representativeCode: rep.code,
            representativeName: rep.name,
            commissionRate: rep.commissionRate,
            commissionAmount,
          }
        : c
    );

    this.state = { ...this.state, comandas: updatedComandas };
    this.persistAndBroadcast();
  }

  /**
   * Aceitar Pedido Online do Site e despachar para cozinha/bar
   */
  public acceptOnlineOrder(orderId: string, user: User) {
    const order = this.state.onlineOrders.find((o) => o.id === orderId);
    if (!order) throw new Error('Pedido online não encontrado');

    const updatedOrders = this.state.onlineOrders.map((o) =>
      o.id === orderId ? { ...o, prepStatus: 'em_preparacao' as const } : o
    );

    this.state = { ...this.state, onlineOrders: updatedOrders };

    if (this.state.settings.soundAlertsEnabled) {
      playAlertSound('order');
    }

    this.persistAndBroadcast();
  }

  public updateOnlineOrderPrep(orderId: string, prepStatus: OnlineOrder['prepStatus']) {
    const updatedOrders = this.state.onlineOrders.map((o) =>
      o.id === orderId ? { ...o, prepStatus } : o
    );

    this.state = { ...this.state, onlineOrders: updatedOrders };

    if (prepStatus === 'pronto' && this.state.settings.soundAlertsEnabled) {
      playAlertSound('ready');
    }

    this.persistAndBroadcast();
  }

  // --- MÉTODOS DE BASE (KDS, CAIXA, PAGAMENTOS E FATURAÇÃO) ---

  public updateItemPrepStatus(itemId: string, newStatus: ItemPrepStatus, user: User) {
    const nowIso = new Date().toISOString();
    let targetItemFound: OrderItem | null = null;

    const updatedComandas = this.state.comandas.map((comanda) => {
      let changed = false;
      const updatedRounds = comanda.rounds.map((round) => {
        const itemIdx = round.items.findIndex((i) => i.id === itemId);
        if (itemIdx >= 0) {
          changed = true;
          const currentItem = round.items[itemIdx];
          const updatedItem: OrderItem = {
            ...currentItem,
            status: newStatus,
            statusUpdatedAt: nowIso,
          };
          targetItemFound = updatedItem;
          const newItems = [...round.items];
          newItems[itemIdx] = updatedItem;
          return { ...round, items: newItems };
        }
        return round;
      });

      if (changed) {
        return { ...comanda, rounds: updatedRounds, updatedAt: nowIso };
      }
      return comanda;
    });

    if (!targetItemFound) return;

    this.state = { ...this.state, comandas: updatedComandas };

    if (newStatus === 'pronto' && this.state.settings.soundAlertsEnabled) {
      playAlertSound('ready');
    }

    if (newStatus === 'pronto' || newStatus === 'entregue') {
      this.addAuditLog({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: newStatus === 'pronto' ? 'ITEM_PRONTO' : 'ITEM_ENTREGUE',
        module: user.role === 'bar' ? 'bar' : user.role === 'kitchen' ? 'cozinha' : 'atendimento',
        details: `Item "${(targetItemFound as OrderItem).productName}" marcado como ${newStatus}`,
        targetId: (targetItemFound as OrderItem).id,
      });
    }

    this.persistAndBroadcast();
  }

  /**
   * Concluir todos os itens de um setor numa ronda específica
   */
  public markRoundSectorReady(comandaId: string, roundNumber: number, sector: PrepSector, user: User) {
    const nowIso = new Date().toISOString();
    const updatedComandas = this.state.comandas.map((c) => {
      if (c.id === comandaId) {
        const updatedRounds = c.rounds.map((r) => {
          if (r.roundNumber === roundNumber) {
            const updatedItems = r.items.map((i) => {
              const matchesSector =
                sector === 'cozinha'
                  ? i.sector === 'cozinha' || i.sector === 'pastelaria'
                  : i.sector === sector;
              if (matchesSector && (i.status === 'recebido' || i.status === 'em_preparacao')) {
                return { ...i, status: 'pronto' as const, statusUpdatedAt: nowIso };
              }
              return i;
            });
            return { ...r, items: updatedItems };
          }
          return r;
        });
        return { ...c, rounds: updatedRounds, updatedAt: nowIso };
      }
      return c;
    });

    this.state = { ...this.state, comandas: updatedComandas };
    if (this.state.settings.soundAlertsEnabled) {
      playAlertSound('ready');
    }
    this.addAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'SETOR_PRONTO',
      module: sector === 'bar' ? 'bar' : 'cozinha',
      details: `Todos os itens do setor ${sector.toUpperCase()} da Ronda ${roundNumber} marcados como prontos`,
      targetId: comandaId,
    });
    this.persistAndBroadcast();
  }

  /**
   * Concluir itens de um setor num pedido online
   */
  public markOnlineOrderSectorReady(orderId: string, sector: PrepSector, user: User) {
    const nowIso = new Date().toISOString();
    const updatedOrders = this.state.onlineOrders.map((o) => {
      if (o.id === orderId) {
        const updatedItems = o.items.map((i) => {
          const matchesSector =
            sector === 'cozinha'
              ? i.sector === 'cozinha' || i.sector === 'pastelaria'
              : i.sector === sector;
          if (matchesSector && (i.status === 'recebido' || i.status === 'em_preparacao')) {
            return { ...i, status: 'pronto' as const, statusUpdatedAt: nowIso };
          }
          return i;
        });
        const allReadyOrDelivered = updatedItems.every(
          (it) => it.status === 'pronto' || it.status === 'entregue'
        );
        return {
          ...o,
          items: updatedItems,
          prepStatus: allReadyOrDelivered ? ('pronto' as const) : o.prepStatus,
        };
      }
      return o;
    });

    this.state = { ...this.state, onlineOrders: updatedOrders };
    if (this.state.settings.soundAlertsEnabled) {
      playAlertSound('ready');
    }
    this.persistAndBroadcast();
  }

  public cancelItemAfterDispatch(itemId: string, reason: string, wasteStock: boolean, user: User) {
    if (!reason || !reason.trim()) {
      throw new Error('É obrigatório indicar o motivo do cancelamento');
    }

    const nowIso = new Date().toISOString();
    let cancelledItem: OrderItem | null = null;
    let targetComandaId: string | null = null;

    const updatedComandas = this.state.comandas.map((comanda) => {
      let comandaChanged = false;
      const updatedRounds = comanda.rounds.map((round) => {
        const itemIdx = round.items.findIndex((i) => i.id === itemId);
        if (itemIdx >= 0) {
          comandaChanged = true;
          targetComandaId = comanda.id;
          const curr = round.items[itemIdx];
          const updated: OrderItem = {
            ...curr,
            status: 'cancelado',
            statusUpdatedAt: nowIso,
            cancelReason: reason.trim(),
            cancelledBy: user.name,
          };
          cancelledItem = updated;
          const newItems = [...round.items];
          newItems[itemIdx] = updated;
          return { ...round, items: newItems };
        }
        return round;
      });

      if (comandaChanged) {
        const validItems = updatedRounds.flatMap((r) => r.items).filter((i) => i.status !== 'cancelado');
        const subtotal = validItems.reduce((acc, it) => acc + it.totalItemPrice / (1 + it.vatRate), 0);
        const total = validItems.reduce((acc, it) => acc + it.totalItemPrice, 0);
        const taxTotal = total - subtotal;
        const balanceDue = Math.max(0, total - comanda.paidAmount - comanda.discountAmount);

        return {
          ...comanda,
          rounds: updatedRounds,
          subtotal: Math.round(subtotal * 100) / 100,
          taxTotal: Math.round(taxTotal * 100) / 100,
          total: Math.round(total * 100) / 100,
          balanceDue: Math.round(balanceDue * 100) / 100,
          updatedAt: nowIso,
          version: comanda.version + 1,
        };
      }
      return comanda;
    });

    if (!cancelledItem || !targetComandaId) return;

    let updatedProducts = this.state.products;
    const newStockMovements: StockMovement[] = [];
    const itemObj: OrderItem = cancelledItem;

    if (!wasteStock) {
      updatedProducts = this.state.products.map((p) => {
        if (p.id === itemObj.productId && p.trackStock) {
          const prev = p.stockQuantity;
          const next = prev + itemObj.quantity;
          newStockMovements.push({
            id: `STK-${Date.now()}-${p.id}`,
            productId: p.id,
            productName: p.name,
            type: 'retorno_cancelamento',
            quantity: itemObj.quantity,
            previousStock: prev,
            newStock: next,
            reason: `Cancelamento: ${reason}`,
            date: nowIso,
            userName: user.name,
          });
          return { ...p, stockQuantity: next };
        }
        return p;
      });
    }

    const affectedComanda = updatedComandas.find((c) => c.id === targetComandaId);
    const updatedTables = this.state.tables.map((t) =>
      affectedComanda && t.id === affectedComanda.tableId ? { ...t, totalAmount: affectedComanda.total } : t
    );

    const updatedSales = this.state.sales.map((s) => {
      if (affectedComanda && s.id === affectedComanda.saleId) {
        return {
          ...s,
          items: affectedComanda.rounds.flatMap((r) => r.items).filter((i) => i.status !== 'cancelado'),
          subtotal: affectedComanda.subtotal,
          taxTotal: affectedComanda.taxTotal,
          total: affectedComanda.total,
          balanceDue: affectedComanda.balanceDue,
        };
      }
      return s;
    });

    this.state = {
      ...this.state,
      comandas: updatedComandas,
      tables: updatedTables,
      sales: updatedSales,
      products: updatedProducts,
      stockMovements: [...newStockMovements, ...this.state.stockMovements],
    };

    if (this.state.settings.soundAlertsEnabled) {
      playAlertSound('cancel');
    }

    this.persistAndBroadcast();
  }

  public requestBill(comandaId: string, customerNif?: string, customerName?: string) {
    const comanda = this.state.comandas.find((c) => c.id === comandaId);
    if (!comanda) throw new Error('Comanda não encontrada');

    const updatedComandas = this.state.comandas.map((c) =>
      c.id === comandaId
        ? {
            ...c,
            status: 'conta_solicitada' as const,
            customerNif: customerNif || c.customerNif,
            customerName: customerName || c.customerName,
            updatedAt: new Date().toISOString(),
          }
        : c
    );

    const updatedTables = this.state.tables.map((t) =>
      t.id === comanda.tableId ? { ...t, status: 'conta_solicitada' as const } : t
    );

    this.state = { ...this.state, comandas: updatedComandas, tables: updatedTables };
    this.persistAndBroadcast();
  }

  public transferTable(sourceTableId: string, targetTableId: string, user: User) {
    const sourceTable = this.state.tables.find((t) => t.id === sourceTableId);
    const targetTable = this.state.tables.find((t) => t.id === targetTableId);

    if (!sourceTable || !targetTable) throw new Error('Mesa de origem ou destino não encontrada');
    if (!sourceTable.activeComandaId) throw new Error('Mesa de origem não tem comanda ativa');
    if (targetTable.activeComandaId || targetTable.status !== 'livre') {
      throw new Error('A mesa de destino deve estar livre');
    }

    const comandaId = sourceTable.activeComandaId;

    const updatedComandas = this.state.comandas.map((c) =>
      c.id === comandaId
        ? {
            ...c,
            tableId: targetTable.id,
            tableName: targetTable.number,
            roomName: targetTable.roomName,
            updatedAt: new Date().toISOString(),
          }
        : c
    );

    const updatedTables = this.state.tables.map((t) => {
      if (t.id === sourceTableId) {
        return {
          ...t,
          status: 'livre' as const,
          activeComandaId: undefined,
          waiterId: undefined,
          waiterName: undefined,
          openedAt: undefined,
          guestCount: undefined,
          totalAmount: 0,
        };
      }
      if (t.id === targetTableId) {
        return {
          ...t,
          status: sourceTable.status,
          activeComandaId: comandaId,
          waiterId: sourceTable.waiterId,
          waiterName: sourceTable.waiterName,
          openedAt: sourceTable.openedAt,
          guestCount: sourceTable.guestCount,
          totalAmount: sourceTable.totalAmount,
        };
      }
      return t;
    });

    this.state = { ...this.state, comandas: updatedComandas, tables: updatedTables };
    this.persistAndBroadcast();
  }

  public registerPayment(params: {
    comandaId: string;
    payments: { method: PaymentMethod; amount: number; receivedAmount?: number; seatNumber?: number }[];
    user: User;
    discountAmount?: number;
    discountReason?: string;
    itemIds?: string[];
    seatNumber?: number;
  }) {
    const { comandaId, payments, user, discountAmount = 0, discountReason, itemIds, seatNumber } = params;
    const comanda = this.state.comandas.find((c) => c.id === comandaId);
    if (!comanda) throw new Error('Comanda não encontrada');

    const totalToPay = payments.reduce((acc, p) => acc + p.amount, 0);
    if (totalToPay <= 0) throw new Error('O valor do pagamento deve ser superior a 0 €');

    const currentSession = this.state.cashSessions.find(
      (s) => s.id === this.state.currentCashSessionId && s.status === 'aberto'
    );
    if (!currentSession) throw new Error('Não existe sessão de caixa aberta para registar pagamentos');

    const nowIso = new Date().toISOString();

    // Se foram especificados itens (ex: divisão por lugar), verifica proteção contra cobrança duplicada
    let updatedRounds = comanda.rounds;
    if (itemIds && itemIds.length > 0) {
      const itemIdSet = new Set(itemIds);
      for (const round of comanda.rounds) {
        for (const it of round.items) {
          if (itemIdSet.has(it.id)) {
            if (it.isPaid) {
              throw new Error(`O item "${it.productName}" já foi pago e liquidado anteriormente!`);
            }
          }
        }
      }

      // Marca os itens como pagos
      updatedRounds = comanda.rounds.map((r) => ({
        ...r,
        items: r.items.map((it) =>
          itemIdSet.has(it.id)
            ? { ...it, isPaid: true, paidAt: nowIso, paidBySeat: seatNumber ?? it.seatNumber }
            : it
        ),
      }));
    }

    const paymentRecords: PaymentRecord[] = payments.map((p) => {
      const received = p.receivedAmount ?? p.amount;
      const change = p.method === 'dinheiro' ? Math.max(0, received - p.amount) : 0;
      return {
        id: `PAG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        comandaId: comanda.id,
        saleId: comanda.saleId,
        amount: p.amount,
        method: p.method,
        receivedAmount: received,
        changeAmount: change,
        registeredBy: user.id,
        registeredByName: user.name,
        cashSessionId: currentSession.id,
        timestamp: nowIso,
        isManualConfirmed: true,
        seatNumber: p.seatNumber ?? seatNumber,
        itemIds: itemIds,
      };
    });

    const newPaidTotal = comanda.paidAmount + totalToPay;
    const effectiveDiscount = discountAmount > 0 ? discountAmount : comanda.discountAmount;
    const newBalanceDue = Math.max(0, comanda.total - effectiveDiscount - newPaidTotal);

    // Verifica se todos os itens não-cancelados estão pagos ou se o saldo está a zero
    const allValidItems = updatedRounds.flatMap((r) => r.items).filter((i) => i.status !== 'cancelado');
    const allItemsMarkedPaid = allValidItems.length > 0 && allValidItems.every((i) => i.isPaid);
    const isFullyPaid = newBalanceDue <= 0.005 || allItemsMarkedPaid;

    const updatedComanda: Comanda = {
      ...comanda,
      rounds: updatedRounds,
      paidAmount: Math.round(newPaidTotal * 100) / 100,
      discountAmount: Math.round(effectiveDiscount * 100) / 100,
      discountReason: discountReason || comanda.discountReason,
      balanceDue: isFullyPaid ? 0 : Math.round(newBalanceDue * 100) / 100,
      status: isFullyPaid ? 'paga' : 'a_aguardar_pagamento',
      updatedAt: nowIso,
    };

    // Atualiza totais de caixa
    const newMovements: CashMovement[] = [];
    let cashDelta = 0;
    const sessionTotals = { ...currentSession.expectedTotals };

    for (const p of payments) {
      const methodKey = p.method as keyof typeof sessionTotals;
      if (methodKey in sessionTotals) {
        sessionTotals[methodKey] = (sessionTotals[methodKey] || 0) + p.amount;
      }
      sessionTotals.total += p.amount;

      if (p.method === 'dinheiro') {
        cashDelta += p.amount;
        newMovements.push({
          id: `MOV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          sessionId: currentSession.id,
          type: 'venda_dinheiro',
          amount: p.amount,
          reason: `Pagamento Comanda ${comanda.numberDisplay}`,
          registeredBy: user.id,
          registeredByName: user.name,
          timestamp: nowIso,
        });
      }
    }

    const updatedCashSessions = this.state.cashSessions.map((s) =>
      s.id === currentSession.id
        ? {
            ...s,
            currentFloat: s.currentFloat + cashDelta,
            movements: [...newMovements, ...s.movements],
            expectedTotals: sessionTotals,
          }
        : s
    );

    // Se o cliente estiver identificado e a conta for liquidada, credita cashback (3% sobre alimentos pagos)
    let updatedCustomers = this.state.customers;
    let earnedCashback = 0;
    if (isFullyPaid && comanda.customerId) {
      const cust = this.state.customers.find((c) => c.id === comanda.customerId);
      if (cust) {
        earnedCashback = Math.round(comanda.subtotal * 0.03 * 100) / 100;
        if (earnedCashback > 0) {
          const cbMov: CashbackMovement = {
            id: `CB-${Date.now()}`,
            date: nowIso,
            type: 'credito',
            amount: earnedCashback,
            saleId: comanda.saleId,
            description: `Cashback de 3% ganho na refeição ${comanda.numberDisplay}`,
          };

          updatedCustomers = this.state.customers.map((c) =>
            c.id === cust.id
              ? {
                  ...c,
                  cashbackBalance: Math.round((c.cashbackBalance + earnedCashback) * 100) / 100,
                  cashbackMovements: [cbMov, ...(c.cashbackMovements || [])],
                  totalSpent: c.totalSpent + comanda.total,
                  visitCount: c.visitCount + 1,
                  lastVisit: nowIso,
                }
              : c
          );
        }
      }
    }

    // Atualiza representante se associado
    let updatedRepresentatives = this.state.representatives;
    if (isFullyPaid && comanda.representativeCode && comanda.commissionAmount) {
      updatedRepresentatives = this.state.representatives.map((r) =>
        r.code.toUpperCase() === comanda.representativeCode!.toUpperCase()
          ? {
              ...r,
              totalCommissionEarned: r.totalCommissionEarned + comanda.commissionAmount!,
              totalEligibleSales: r.totalEligibleSales + comanda.subtotal,
            }
          : r
      );
    }

    // Atualiza mesa
    const updatedTables = this.state.tables.map((t) => {
      if (t.id === comanda.tableId) {
        if (isFullyPaid) {
          const nextStatus = this.state.settings.autoReleaseTableAfterPayment
            ? ('livre' as const)
            : ('a_aguardar_limpeza' as const);

          return {
            ...t,
            status: nextStatus,
            activeComandaId: nextStatus === 'livre' ? undefined : t.activeComandaId,
            openedAt: nextStatus === 'livre' ? undefined : t.openedAt,
            waiterId: nextStatus === 'livre' ? undefined : t.waiterId,
            waiterName: nextStatus === 'livre' ? undefined : t.waiterName,
            guestCount: nextStatus === 'livre' ? undefined : t.guestCount,
            totalAmount: nextStatus === 'livre' ? 0 : t.totalAmount,
          };
        } else {
          return { ...t, status: 'a_aguardar_pagamento' as const };
        }
      }
      return t;
    });

    const updatedSales = this.state.sales.map((s) => {
      if (s.id === comanda.saleId) {
        return {
          ...s,
          paidAmount: updatedComanda.paidAmount,
          discountAmount: updatedComanda.discountAmount,
          balanceDue: updatedComanda.balanceDue,
          status: (isFullyPaid ? 'paga' : 'parcialmente_paga') as 'paga' | 'parcialmente_paga',
          payments: [...s.payments, ...paymentRecords],
          closedAt: isFullyPaid ? nowIso : undefined,
          cashbackEarned: earnedCashback,
          cashbackUsed: comanda.cashbackUsed,
        };
      }
      return s;
    });

    const updatedComandas = this.state.comandas.map((c) => (c.id === comandaId ? updatedComanda : c));

    this.state = {
      ...this.state,
      comandas: updatedComandas,
      tables: updatedTables,
      sales: updatedSales,
      cashSessions: updatedCashSessions,
      customers: updatedCustomers,
      representatives: updatedRepresentatives,
    };

    if (this.state.settings.soundAlertsEnabled) {
      playAlertSound('success');
    }

    this.persistAndBroadcast();
    return { isFullyPaid, updatedComanda };
  }

  public releaseTable(tableId: string) {
    const updatedTables = this.state.tables.map((t) =>
      t.id === tableId
        ? {
            ...t,
            status: 'livre' as const,
            activeComandaId: undefined,
            waiterId: undefined,
            waiterName: undefined,
            openedAt: undefined,
            guestCount: undefined,
            totalAmount: 0,
            activeCall: undefined,
          }
        : t
    );

    this.state = { ...this.state, tables: updatedTables };
    this.persistAndBroadcast();
  }

  public async issueFiscalDocForSale(params: {
    saleId: string;
    docType: FiscalDocumentType;
    customerNif?: string;
    customerName?: string;
    customerAddress?: string;
    user: User;
    items?: OrderItem[];
    seatNumber?: number;
  }): Promise<FiscalDocument> {
    const { saleId, docType, customerNif, customerName, customerAddress, user, items, seatNumber } = params;
    const sale = this.state.sales.find((s) => s.id === saleId);
    if (!sale) throw new Error('Venda não encontrada');

    // Se não for parcial por itens, verifica se já existe documento total emitido
    if (!items || items.length === 0) {
      if (sale.documentId) {
        const existingDoc = this.state.fiscalDocuments.find((d) => d.id === sale.documentId);
        if (existingDoc && existingDoc.status !== 'cancelada_por_retificacao') {
          throw new Error(`Esta venda já tem o documento ${existingDoc.series} emitido!`);
        }
      }
    }

    const nextSeq = this.state.lastSequentialDocNumber + 1;

    const doc = await issueFiscalDocument({
      sale,
      docType,
      settings: this.state.settings,
      operatorName: user.name,
      sequentialNumber: nextSeq,
      customerNif,
      customerName,
      customerAddress,
      items,
    });

    // Se foram faturados itens específicos, marca o docId e isPaid nesses itens na comanda
    let updatedComandas = this.state.comandas;
    if (items && items.length > 0) {
      const itemIds = new Set(items.map((i) => i.id));
      const nowIso = new Date().toISOString();
      updatedComandas = this.state.comandas.map((c) => {
        if (c.saleId === saleId) {
          return {
            ...c,
            rounds: c.rounds.map((r) => ({
              ...r,
              items: r.items.map((it) =>
                itemIds.has(it.id)
                  ? {
                      ...it,
                      isPaid: true,
                      paidAt: it.paidAt || nowIso,
                      paidDocumentId: doc.id,
                      paidBySeat: it.paidBySeat ?? seatNumber ?? it.seatNumber,
                    }
                  : it
              ),
            })),
          };
        }
        return c;
      });
    }

    const updatedSales = this.state.sales.map((s) =>
      s.id === saleId
        ? {
            ...s,
            fiscalStatus: doc.status === 'comunicada_at' ? ('comunicada_at' as const) : ('emitida' as const),
            documentId: (!items || items.length === 0) ? doc.id : s.documentId || doc.id,
            documentNumber: (!items || items.length === 0) ? doc.series : s.documentNumber || doc.series,
            documentType: (!items || items.length === 0) ? doc.type : s.documentType || doc.type,
            customerNif: doc.customerNif,
            customerName: doc.customerName,
            customerAddress: doc.customerAddress,
          }
        : s
    );

    this.state = {
      ...this.state,
      sales: updatedSales,
      comandas: updatedComandas,
      fiscalDocuments: [doc, ...this.state.fiscalDocuments],
      lastSequentialDocNumber: nextSeq,
    };

    this.persistAndBroadcast();
    return doc;
  }

  // --- FATURA AVULSA (Requisito 14) ---
  public async createAdHocInvoice(params: {
    docType: FiscalDocumentType;
    customerNif?: string;
    customerName?: string;
    customerAddress?: string;
    items: {
      productId?: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      vatRate: number;
      discountPercent?: number;
      notes?: string;
    }[];
    isPaid: boolean;
    paymentMethod?: PaymentMethod;
    receivedAmount?: number;
    notes?: string;
    discountAmount?: number;
    user: User;
  }): Promise<{ sale: Sale; document: FiscalDocument }> {
    const {
      docType,
      customerNif = '999999990',
      customerName = 'Consumidor Final',
      customerAddress,
      items: rawItems,
      isPaid,
      paymentMethod = 'dinheiro',
      receivedAmount,
      discountAmount = 0,
      user,
    } = params;

    if (!rawItems || rawItems.length === 0) {
      throw new Error('A fatura avulsa deve conter pelo menos um item.');
    }

    const nowIso = new Date().toISOString();
    const saleId = `SAL-AV-${Date.now().toString().slice(-6)}`;

    const orderItems: OrderItem[] = rawItems.map((it, idx) => {
      const discountP = it.discountPercent || 0;
      const unitAfterDisc = it.unitPrice * (1 - discountP / 100);
      const totalItem = Math.round(unitAfterDisc * it.quantity * 100) / 100;
      return {
        id: `ITM-AV-${Date.now()}-${idx}`,
        productId: it.productId || `PROD-AV-${idx}`,
        productCode: `AV-${idx + 1}`,
        productName: it.productName.trim(),
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        vatRate: it.vatRate,
        sector: 'cozinha',
        selectedExtras: [],
        totalItemPrice: totalItem,
        notes: it.notes || '',
        roundNumber: 1,
        status: 'entregue',
        statusUpdatedAt: nowIso,
        isBilled: true,
        isPaid,
      };
    });

    const subtotal = orderItems.reduce((acc, it) => acc + it.totalItemPrice / (1 + it.vatRate), 0);
    const grossWithoutDiscount = orderItems.reduce((acc, it) => acc + it.totalItemPrice, 0);
    const finalGrossTotal = Math.max(0, grossWithoutDiscount - discountAmount);
    const taxTotal = finalGrossTotal - subtotal * (finalGrossTotal / (grossWithoutDiscount || 1));

    const nextSeq = this.state.lastSequentialDocNumber + 1;

    const payments: PaymentRecord[] = [];
    let updatedCashSessions = this.state.cashSessions;

    if (isPaid) {
      const paymentRecord: PaymentRecord = {
        id: `PAY-AV-${Date.now()}`,
        comandaId: '',
        saleId,
        amount: finalGrossTotal,
        method: paymentMethod,
        receivedAmount: receivedAmount || finalGrossTotal,
        changeAmount: Math.max(0, (receivedAmount || finalGrossTotal) - finalGrossTotal),
        registeredBy: user.id,
        registeredByName: user.name,
        cashSessionId: this.state.currentCashSessionId || '',
        timestamp: nowIso,
        isManualConfirmed: true,
      };
      payments.push(paymentRecord);

      // Se houver sessão de caixa aberta e for em dinheiro, atualiza gaveta e movimentos
      const currentSession = this.state.cashSessions.find(
        (s) => s.id === this.state.currentCashSessionId && s.status === 'aberto'
      );
      if (currentSession && paymentMethod === 'dinheiro') {
        const sessionTotals = { ...currentSession.expectedTotals };
        sessionTotals.dinheiro += finalGrossTotal;
        sessionTotals.total += finalGrossTotal;

        const newMov: CashMovement = {
          id: `MOV-AV-${Date.now()}`,
          sessionId: currentSession.id,
          type: 'venda_dinheiro',
          amount: finalGrossTotal,
          reason: `Fatura Avulsa - Venda de Balcão`,
          registeredBy: user.id,
          registeredByName: user.name,
          timestamp: nowIso,
        };

        updatedCashSessions = this.state.cashSessions.map((s) =>
          s.id === currentSession.id
            ? {
                ...s,
                currentFloat: s.currentFloat + finalGrossTotal,
                movements: [newMov, ...s.movements],
                expectedTotals: sessionTotals,
              }
            : s
        );
      }
    }

    const sale: Sale = {
      id: saleId,
      comandaId: '',
      tableId: 'avulso',
      tableName: 'Venda Avulsa / Balcão',
      roomName: 'Balcão',
      guestCount: 1,
      waiterId: user.id,
      waiterName: user.name,
      createdAt: nowIso,
      closedAt: nowIso,
      subtotal: Math.round(subtotal * 100) / 100,
      taxTotal: Math.round(taxTotal * 100) / 100,
      total: Math.round(finalGrossTotal * 100) / 100,
      discountAmount,
      paidAmount: isPaid ? finalGrossTotal : 0,
      balanceDue: isPaid ? 0 : finalGrossTotal,
      status: isPaid ? 'paga' : 'aberta',
      fiscalStatus: 'faturado',
      items: orderItems,
      payments,
      customerNif,
      customerName,
      customerAddress,
    };

    const doc = await issueFiscalDocument({
      sale,
      docType,
      settings: this.state.settings,
      operatorName: user.name,
      sequentialNumber: nextSeq,
      customerNif,
      customerName,
      customerAddress,
      items: orderItems,
    });

    const finalizedItems = orderItems.map((it) => ({
      ...it,
      billedDocumentId: doc.id,
      billedAt: nowIso,
      paidDocumentId: isPaid ? doc.id : undefined,
    }));

    const finalizedSale: Sale = {
      ...sale,
      items: finalizedItems,
      documentId: doc.id,
      documentNumber: doc.series,
      documentType: doc.type,
      documentIds: [doc.id],
      fiscalStatus: 'faturado',
    };

    this.state = {
      ...this.state,
      sales: [finalizedSale, ...this.state.sales],
      cashSessions: updatedCashSessions,
      fiscalDocuments: [doc, ...this.state.fiscalDocuments],
      lastSequentialDocNumber: nextSeq,
    };

    this.persistAndBroadcast();
    return { sale: finalizedSale, document: doc };
  }

  // --- FATURA DA COMANDA DA MESA (Requisito 14) ---
  public async issueInvoiceForComanda(params: {
    comandaId: string;
    docType: FiscalDocumentType;
    customerNif?: string;
    customerName?: string;
    customerAddress?: string;
    itemIds?: string[];
    user: User;
  }): Promise<FiscalDocument> {
    const { comandaId, docType, customerNif, customerName, customerAddress, itemIds, user } = params;
    const comanda = this.state.comandas.find((c) => c.id === comandaId);
    if (!comanda) throw new Error('Comanda não encontrada');

    const sale = this.state.sales.find((s) => s.id === comanda.saleId);
    if (!sale) throw new Error('Venda associada à comanda não encontrada');

    // Itens ativos
    const allActiveItems = comanda.rounds
      .flatMap((r) => r.items)
      .filter((it) => it.status !== 'cancelado');

    // Filtra itens a faturar (exclui cancelados e já faturados)
    const itemsToBill = allActiveItems.filter((it) => {
      if (it.isBilled || it.billedDocumentId) return false;
      if (itemIds && itemIds.length > 0) {
        return itemIds.includes(it.id);
      }
      return true;
    });

    if (itemsToBill.length === 0) {
      // Se não há itens pendentes, verifica se já existe fatura emitida para a comanda
      const existingDoc = this.state.fiscalDocuments.find(
        (d) => d.saleId === sale.id && d.status !== 'cancelada_por_retificacao'
      );
      if (existingDoc) {
        return existingDoc;
      }
      throw new Error('Todos os itens desta comanda já foram faturados ou não existem itens a faturar.');
    }

    const nextSeq = this.state.lastSequentialDocNumber + 1;

    const doc = await issueFiscalDocument({
      sale,
      docType,
      settings: this.state.settings,
      operatorName: user.name,
      sequentialNumber: nextSeq,
      customerNif: customerNif || comanda.customerNif,
      customerName: customerName || comanda.customerName,
      customerAddress,
      items: itemsToBill,
    });

    const billedItemIds = new Set(itemsToBill.map((i) => i.id));
    const nowIso = new Date().toISOString();

    // Atualiza itens na comanda
    const updatedComandas = this.state.comandas.map((c) => {
      if (c.id === comandaId) {
        const updatedRounds = c.rounds.map((r) => ({
          ...r,
          items: r.items.map((it) => {
            if (billedItemIds.has(it.id)) {
              return {
                ...it,
                isBilled: true,
                billedAt: nowIso,
                billedDocumentId: doc.id,
              };
            }
            return it;
          }),
        }));

        const remainingUnbilled = updatedRounds
          .flatMap((r) => r.items)
          .filter((it) => it.status !== 'cancelado' && !it.isBilled && !it.billedDocumentId);

        const newFiscalStatus: FiscalStatus =
          remainingUnbilled.length === 0 ? 'faturado' : 'parcialmente_faturado';

        return {
          ...c,
          customerNif: doc.customerNif,
          customerName: doc.customerName,
          fiscalStatus: newFiscalStatus,
          documentId: doc.id,
          documentIds: [...(c.documentIds || []), doc.id],
          rounds: updatedRounds,
        };
      }
      return c;
    });

    // Atualiza a venda preservando pagamentos existentes
    const updatedSales = this.state.sales.map((s) => {
      if (s.id === sale.id) {
        const remainingUnbilledInSale = updatedComandas
          .find((c) => c.id === comandaId)
          ?.rounds.flatMap((r) => r.items)
          .filter((it) => it.status !== 'cancelado' && !it.isBilled);

        const newSaleFiscalStatus: FiscalStatus =
          !remainingUnbilledInSale || remainingUnbilledInSale.length === 0
            ? 'faturado'
            : 'parcialmente_faturado';

        return {
          ...s,
          customerNif: doc.customerNif,
          customerName: doc.customerName,
          customerAddress: doc.customerAddress,
          fiscalStatus: newSaleFiscalStatus,
          documentId: doc.id,
          documentNumber: doc.series,
          documentType: doc.type,
          documentIds: [...(s.documentIds || []), doc.id],
        };
      }
      return s;
    });

    this.state = {
      ...this.state,
      comandas: updatedComandas,
      sales: updatedSales,
      fiscalDocuments: [doc, ...this.state.fiscalDocuments],
      lastSequentialDocNumber: nextSeq,
    };

    this.persistAndBroadcast();
    return doc;
  }

  public async rectifyDocumentWithCreditNote(
    originalDocId: string,
    reason: string,
    user: User
  ): Promise<FiscalDocument> {
    if (!reason || !reason.trim()) throw new Error('É obrigatório indicar o motivo da retificação');

    const originalDoc = this.state.fiscalDocuments.find((d) => d.id === originalDocId);
    if (!originalDoc) throw new Error('Documento original não encontrado');
    if (originalDoc.type === 'NC') throw new Error('Não é possível emitir nota de crédito de outra nota de crédito');

    const sale = this.state.sales.find((s) => s.id === originalDoc.saleId);
    if (!sale) throw new Error('Venda associada não encontrada');

    const nextSeq = this.state.lastSequentialDocNumber + 1;

    const creditNote = await issueFiscalDocument({
      sale,
      docType: 'NC',
      settings: this.state.settings,
      operatorName: user.name,
      sequentialNumber: nextSeq,
      customerNif: originalDoc.customerNif,
      customerName: originalDoc.customerName,
      customerAddress: originalDoc.customerAddress,
      rectifiesDocumentId: originalDoc.id,
      rectifyReason: reason.trim(),
    });

    const updatedDocs = this.state.fiscalDocuments.map((d) =>
      d.id === originalDocId ? { ...d, status: 'cancelada_por_retificacao' as const } : d
    );

    this.state = {
      ...this.state,
      fiscalDocuments: [creditNote, ...updatedDocs],
      lastSequentialDocNumber: nextSeq,
    };

    this.persistAndBroadcast();
    return creditNote;
  }

  // --- ENVIO E REGISTO DE FATURAÇÃO (Requisito 13) ---
  public recordInvoiceDispatch(params: {
    documentId: string;
    channel: InvoiceDispatchChannel;
    recipient: string;
    recipientName?: string;
    countryCode?: string;
    status: InvoiceDispatchStatus;
    user: User;
    errorMessage?: string;
    providerResponseId?: string;
  }): InvoiceDispatchLog {
    const doc = this.state.fiscalDocuments.find((d) => d.id === params.documentId);
    if (!doc) throw new Error('Documento fiscal não encontrado');

    const now = new Date();
    const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 dias de validade
    const randomHex =
      Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 8);
    const secureToken = `${doc.atcud || 'DOC'}_${randomHex}`;
    const secureUrl = `https://saboresenacoes.pt/fatura/${encodeURIComponent(
      doc.series.replace(/[\s/]/g, '_')
    )}?token=${secureToken}`;

    const dispatchLog: InvoiceDispatchLog = {
      id: `DISP-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      documentId: doc.id,
      documentNumber: doc.series,
      saleId: doc.saleId,
      channel: params.channel,
      recipient: params.recipient,
      recipientName: params.recipientName,
      countryCode: params.countryCode || '+351',
      status: params.status,
      timestamp: now.toISOString(),
      operatorId: params.user.id,
      operatorName: params.user.name,
      secureToken,
      secureUrl,
      expiresAt: expires.toISOString(),
      errorMessage: params.errorMessage,
      providerResponseId: params.providerResponseId,
      consentGiven: true,
    };

    const existingLogs = doc.dispatchLogs || [];
    const updatedDocs = this.state.fiscalDocuments.map((d) =>
      d.id === doc.id
        ? {
            ...d,
            dispatchLogs: [dispatchLog, ...existingLogs],
          }
        : d
    );

    this.state = {
      ...this.state,
      fiscalDocuments: updatedDocs,
    };

    this.persistAndBroadcast();
    return dispatchLog;
  }

  public addInvoiceDispatchLog(log: InvoiceDispatchLog): void {
    const updatedDocs = this.state.fiscalDocuments.map((d) => {
      if (d.id === log.documentId) {
        return {
          ...d,
          dispatchLogs: [log, ...(d.dispatchLogs || [])],
        };
      }
      return d;
    });

    this.state = {
      ...this.state,
      fiscalDocuments: updatedDocs,
    };

    this.persistAndBroadcast();
  }

  public updateInvoiceDispatchStatus(logId: string, status: InvoiceDispatchStatus): void {
    const updatedDocs = this.state.fiscalDocuments.map((d) => {
      if (!d.dispatchLogs) return d;
      const hasLog = d.dispatchLogs.some((l) => l.id === logId);
      if (!hasLog) return d;

      return {
        ...d,
        dispatchLogs: d.dispatchLogs.map((l) => (l.id === logId ? { ...l, status } : l)),
      };
    });

    this.state = {
      ...this.state,
      fiscalDocuments: updatedDocs,
    };

    this.persistAndBroadcast();
  }

  // --- SESSÕES DE CAIXA ---

  public openCashSession(initialFloat: number, user: User): CashSession {
    const existing = this.state.cashSessions.find(
      (s) => s.id === this.state.currentCashSessionId && s.status === 'aberto'
    );
    if (existing) throw new Error('Já existe uma sessão de caixa aberta');

    const sessionId = `CS-${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();

    const newSession: CashSession = {
      id: sessionId,
      openedAt: nowIso,
      openedBy: user.id,
      openedByName: user.name,
      initialFloat,
      currentFloat: initialFloat,
      status: 'aberto',
      movements: [
        {
          id: `MOV-${Date.now()}`,
          sessionId,
          type: 'abertura',
          amount: initialFloat,
          reason: 'Fundo de maneio de abertura',
          registeredBy: user.id,
          registeredByName: user.name,
          timestamp: nowIso,
        },
      ],
      expectedTotals: {
        dinheiro: 0,
        cartao: 0,
        mbway: 0,
        transferencia: 0,
        total: 0,
      },
    };

    this.state = {
      ...this.state,
      cashSessions: [newSession, ...this.state.cashSessions],
      currentCashSessionId: sessionId,
    };

    this.persistAndBroadcast();
    return newSession;
  }

  public closeCashSession(params: {
    sessionId: string;
    countedCash: number;
    closingNotes?: string;
    user: User;
  }): CashSession {
    const { sessionId, countedCash, closingNotes, user } = params;
    const session = this.state.cashSessions.find((s) => s.id === sessionId);
    if (!session) throw new Error('Sessão de caixa não encontrada');
    if (session.status === 'fechado') throw new Error('Esta sessão de caixa já se encontra fechada');

    const expectedCashInDrawer = session.initialFloat + session.expectedTotals.dinheiro;
    const difference = Math.round((countedCash - expectedCashInDrawer) * 100) / 100;
    const nowIso = new Date().toISOString();

    const updatedSession: CashSession = {
      ...session,
      status: 'fechado',
      closedAt: nowIso,
      closedBy: user.id,
      closedByName: user.name,
      countedCash,
      difference,
      closingNotes,
      movements: [
        {
          id: `MOV-${Date.now()}`,
          sessionId: session.id,
          type: 'fecho',
          amount: countedCash,
          reason: `Fecho de Caixa. Diferença: ${difference >= 0 ? '+' : ''}${difference.toFixed(2)} €`,
          registeredBy: user.id,
          registeredByName: user.name,
          timestamp: nowIso,
        },
        ...session.movements,
      ],
    };

    const updatedSessions = this.state.cashSessions.map((s) => (s.id === sessionId ? updatedSession : s));

    this.state = {
      ...this.state,
      cashSessions: updatedSessions,
      currentCashSessionId: null,
    };

    this.persistAndBroadcast();
    return updatedSession;
  }

  public addCashMovement(params: {
    sessionId: string;
    type: 'sangria' | 'suprimento';
    amount: number;
    reason: string;
    user: User;
  }) {
    const { sessionId, type, amount, reason, user } = params;
    const session = this.state.cashSessions.find((s) => s.id === sessionId && s.status === 'aberto');
    if (!session) throw new Error('Sessão de caixa aberta não encontrada');
    if (amount <= 0) throw new Error('O valor do movimento deve ser superior a zero');
    if (!reason || !reason.trim()) throw new Error('É obrigatório indicar o motivo do movimento');

    const nowIso = new Date().toISOString();
    const movement: CashMovement = {
      id: `MOV-${Date.now()}`,
      sessionId,
      type,
      amount,
      reason: reason.trim(),
      registeredBy: user.id,
      registeredByName: user.name,
      timestamp: nowIso,
    };

    const floatDelta = type === 'suprimento' ? amount : -amount;

    const updatedSessions = this.state.cashSessions.map((s) =>
      s.id === sessionId
        ? {
            ...s,
            currentFloat: s.currentFloat + floatDelta,
            movements: [movement, ...s.movements],
          }
        : s
    );

    this.state = { ...this.state, cashSessions: updatedSessions };
    this.persistAndBroadcast();
  }

  // --- PRODUTOS, STOCK, CLIENTES & DEFINIÇÕES ---

  public toggleProductAvailability(productId: string) {
    const updatedProducts = this.state.products.map((p) =>
      p.id === productId ? { ...p, available: !p.available } : p
    );
    this.state = { ...this.state, products: updatedProducts };
    this.persistAndBroadcast();
  }

  public saveProduct(product: Product) {
    if (!product.sector || !['cozinha', 'bar', 'atendimento', 'pastelaria'].includes(product.sector)) {
      throw new Error(`A indicação do setor responsável (Cozinha/Copa, Bar ou Entrega Direta) é obrigatória para o produto "${product.name}".`);
    }
    const exists = this.state.products.some((p) => p.id === product.id);
    const updatedProducts = exists
      ? this.state.products.map((p) => (p.id === product.id ? product : p))
      : [product, ...this.state.products];

    this.state = { ...this.state, products: updatedProducts };
    this.persistAndBroadcast();
  }

  public deleteProduct(productId: string) {
    const updatedProducts = this.state.products.filter((p) => p.id !== productId);
    this.state = { ...this.state, products: updatedProducts };
    this.persistAndBroadcast();
  }

  public adjustStock(params: { productId: string; newStock: number; reason: string; user: User }) {
    const { productId, newStock, reason, user } = params;
    const product = this.state.products.find((p) => p.id === productId);
    if (!product) throw new Error('Produto não encontrado');

    const prev = product.stockQuantity;
    const diff = newStock - prev;
    const nowIso = new Date().toISOString();

    const movement: StockMovement = {
      id: `STK-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      type: diff >= 0 ? 'entrada' : 'ajuste',
      quantity: Math.abs(diff),
      previousStock: prev,
      newStock,
      reason: reason.trim() || 'Ajuste manual de inventário',
      date: nowIso,
      userName: user.name,
    };

    const updatedProducts = this.state.products.map((p) =>
      p.id === productId ? { ...p, stockQuantity: newStock } : p
    );

    this.state = {
      ...this.state,
      products: updatedProducts,
      stockMovements: [movement, ...this.state.stockMovements],
    };

    this.persistAndBroadcast();
  }

  public saveCustomer(customer: Customer) {
    const exists = this.state.customers.some((c) => c.id === customer.id);
    const updated = exists
      ? this.state.customers.map((c) => (c.id === customer.id ? customer : c))
      : [customer, ...this.state.customers];

    this.state = { ...this.state, customers: updated };
    this.persistAndBroadcast();
  }

  public saveSettings(settings: RestaurantSettings) {
    this.state = { ...this.state, settings };
    this.persistAndBroadcast();
  }

  public saveTable(table: Table) {
    const exists = this.state.tables.some((t) => t.id === table.id);
    const updated = exists
      ? this.state.tables.map((t) => (t.id === table.id ? table : t))
      : [...this.state.tables, table];
    this.state = { ...this.state, tables: updated };
    this.persistAndBroadcast();
  }

  public deleteTable(tableId: string) {
    const updated = this.state.tables.filter((t) => t.id !== tableId);
    this.state = { ...this.state, tables: updated };
    this.persistAndBroadcast();
  }
}

export const store = new Store();
