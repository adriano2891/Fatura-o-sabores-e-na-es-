import React, { useState } from 'react';
import {
  X,
  FilePlus,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  AlertCircle,
  RotateCw,
  Search,
  Receipt,
  UserCheck,
  CreditCard,
  Banknote,
  DollarSign,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ShoppingBag,
  Utensils,
  Tag,
} from 'lucide-react';
import {
  Customer,
  FiscalDocument,
  FiscalDocumentType,
  PaymentMethod,
  Product,
  Sale,
  User,
} from '../types';
import { store, AppState } from '../services/storage';
import { formatCurrency, validatePortugueseNIF } from '../utils/formatters';

interface AdHocInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  onViewReceipt: (doc: FiscalDocument) => void;
}

interface AdHocItemLine {
  id: string;
  productId?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  discountPercent: number;
  notes?: string;
}

const VAT_RATES = [
  { rate: 0.13, label: 'Taxa Intermédia (13%)' },
  { rate: 0.23, label: 'Taxa Normal (23%)' },
  { rate: 0.06, label: 'Taxa Reduzida (6%)' },
  { rate: 0.0, label: 'Isento - Artigo 9.º do CIVA (0%)' },
];

export const AdHocInvoiceModal: React.FC<AdHocInvoiceModalProps> = ({
  isOpen,
  onClose,
  state,
  onViewReceipt,
}) => {
  const { customers, products, sales, currentUser, settings, categories } = state;

  // Modo: 'nova_venda' ou 'venda_existente'
  const [modalMode, setModalMode] = useState<'nova_venda' | 'venda_existente'>('nova_venda');

  // Filtro de Categorias e Pesquisa do Cardápio Integrado
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [productSearch, setProductSearch] = useState<string>('');

  // Vendas existentes sem documento fiscal
  const unbilledSales = sales.filter(
    (s) =>
      (!s.documentId || s.fiscalStatus === 'por_faturar' || s.fiscalStatus === 'nao_emitida') &&
      s.status !== 'anulada'
  );

  const [selectedExistingSaleId, setSelectedExistingSaleId] = useState<string>('');

  // Cliente e NIF
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('Consumidor Final');
  const [customerNif, setCustomerNif] = useState<string>('999999990');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [nifError, setNifError] = useState<string | null>(null);

  // Documento
  const [docType, setDocType] = useState<FiscalDocumentType>('FS');

  // Linhas de itens
  const [items, setItems] = useState<AdHocItemLine[]>([]);

  // Pagamento (Separação entre faturado e pago)
  const [isPaid, setIsPaid] = useState<boolean>(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('dinheiro');
  const [receivedAmount, setReceivedAmount] = useState<number>(0);

  // Desconto global e notas
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [invoiceNotes, setInvoiceNotes] = useState<string>('');

  // Etapa de confirmação antes da emissão
  const [step, setStep] = useState<'formulario' | 'confirmacao'>('formulario');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Quando seleciona cliente da lista
  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomerId(customerId);
    if (!customerId) {
      setCustomerName('Consumidor Final');
      setCustomerNif('999999990');
      setCustomerAddress('');
      setNifError(null);
      return;
    }
    const cust = customers.find((c) => c.id === customerId);
    if (cust) {
      setCustomerName(cust.name);
      setCustomerNif(cust.nif || '999999990');
      setCustomerAddress(cust.address || '');
      setNifError(null);
    }
  };

  // Validação de NIF em tempo real
  const handleNifChange = (nifVal: string) => {
    setCustomerNif(nifVal);
    if (!nifVal || nifVal === '999999990') {
      setNifError(null);
      return;
    }
    const isValid = validatePortugueseNIF(nifVal);
    if (!isValid) {
      setNifError('NIF português inválido (dígito de controlo incorreto).');
    } else {
      setNifError(null);
    }
  };

  // Adicionar produto do catálogo à linha
  const handleAddCatalogProduct = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    setItems((prev) =>
      prev.map((it, idx) =>
        idx === index
          ? {
              ...it,
              productId: prod.id,
              productName: prod.name,
              unitPrice: prod.price,
              vatRate: prod.vatRate,
            }
          : it
      )
    );
  };

  // Filtragem de produtos por categoria e pesquisa
  const filteredCatalogProducts = products.filter((p) => {
    const matchesCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const matchesSearch = productSearch.trim()
      ? p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.code.toLowerCase().includes(productSearch.toLowerCase())
      : true;
    return matchesCat && matchesSearch;
  });

  // Ao clicar num produto do cardápio: adiciona ou incrementa quantidade
  const handleProductClick = (prod: Product) => {
    setItems((prev) => {
      const existingIdx = prev.findIndex((it) => it.productId === prod.id);
      if (existingIdx >= 0) {
        return prev.map((it, idx) =>
          idx === existingIdx ? { ...it, quantity: it.quantity + 1 } : it
        );
      }
      // Se houver apenas 1 linha em branco inicial sem produto definido, substitui-a
      if (prev.length === 1 && !prev[0].productId && !prev[0].productName.trim() && prev[0].unitPrice === 0) {
        return [
          {
            id: `item-${Date.now()}-${prod.id}`,
            productId: prod.id,
            productName: prod.name,
            quantity: 1,
            unitPrice: prod.price,
            vatRate: prod.vatRate,
            discountPercent: 0,
          },
        ];
      }
      return [
        ...prev,
        {
          id: `item-${Date.now()}-${prod.id}`,
          productId: prod.id,
          productName: prod.name,
          quantity: 1,
          unitPrice: prod.price,
          vatRate: prod.vatRate,
          discountPercent: 0,
        },
      ];
    });
  };

  const handleIncrementQty = (index: number) => {
    setItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, quantity: it.quantity + 1 } : it))
    );
  };

  const handleDecrementQty = (index: number) => {
    setItems((prev) => {
      const target = prev[index];
      if (target.quantity > 1) {
        return prev.map((it, idx) => (idx === index ? { ...it, quantity: it.quantity - 1 } : it));
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  // Atualizar campo de linha
  const handleUpdateItem = (index: number, field: keyof AdHocItemLine, value: any) => {
    setItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, [field]: value } : it))
    );
  };

  const handleAddNewLine = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        productName: '',
        quantity: 1,
        unitPrice: 0,
        vatRate: 0.13,
        discountPercent: 0,
      },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Cálculos de totais
  const grossTotalBeforeDiscount = items.reduce((sum, it) => {
    const lineDiscount = it.discountPercent || 0;
    const priceAfterLineDisc = it.unitPrice * (1 - lineDiscount / 100);
    return sum + priceAfterLineDisc * (it.quantity || 0);
  }, 0);

  const finalGrossTotal = Math.max(0, grossTotalBeforeDiscount - globalDiscount);
  const subtotalNet = items.reduce((sum, it) => {
    const lineDiscount = it.discountPercent || 0;
    const priceAfterLineDisc = it.unitPrice * (1 - lineDiscount / 100);
    const lineGross = priceAfterLineDisc * (it.quantity || 0);
    return sum + lineGross / (1 + it.vatRate);
  }, 0);

  const totalVat = Math.max(0, finalGrossTotal - subtotalNet);
  const changeAmount = Math.max(0, (receivedAmount || finalGrossTotal) - finalGrossTotal);

  // Avançar para resumo
  const handleProceedToConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalMode === 'nova_venda') {
      if (items.length === 0) {
        alert('Por favor, selecione pelo menos um produto do cardápio ou adicione uma linha à fatura.');
        return;
      }
      const invalidItems = items.some((it) => !it.productName.trim() || it.quantity <= 0);
      if (invalidItems) {
        alert('Por favor, preencha o nome e quantidade válida de todos os itens.');
        return;
      }
      if (finalGrossTotal <= 0) {
        alert('O valor total da fatura deve ser superior a 0,00 €.');
        return;
      }
    } else {
      if (!selectedExistingSaleId) {
        alert('Por favor, selecione uma venda existente.');
        return;
      }
    }

    if (customerNif && customerNif !== '999999990' && !validatePortugueseNIF(customerNif)) {
      alert('O NIF indicado é inválido. Corrija antes de emitir o documento fiscal.');
      return;
    }

    setStep('confirmacao');
    setSubmitError(null);
  };

  // Emissão Oficial
  const handleEmitInvoice = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (modalMode === 'nova_venda') {
        const result = await store.createAdHocInvoice({
          docType,
          customerNif: customerNif.trim() || '999999990',
          customerName: customerName.trim() || 'Consumidor Final',
          customerAddress: customerAddress.trim() || undefined,
          items: items.map((it) => ({
            productId: it.productId,
            productName: it.productName.trim(),
            quantity: Number(it.quantity),
            unitPrice: Number(it.unitPrice),
            vatRate: Number(it.vatRate),
            discountPercent: Number(it.discountPercent || 0),
            notes: it.notes,
          })),
          isPaid,
          paymentMethod: isPaid ? paymentMethod : undefined,
          receivedAmount: isPaid ? (receivedAmount || finalGrossTotal) : undefined,
          notes: invoiceNotes.trim() || undefined,
          discountAmount: globalDiscount,
          user: currentUser,
        });

        onClose();
        onViewReceipt(result.document);
      } else {
        // Emitir para venda existente
        const targetSale = sales.find((s) => s.id === selectedExistingSaleId);
        if (!targetSale) throw new Error('Venda não encontrada');

        const doc = await store.issueFiscalDocForSale({
          saleId: targetSale.id,
          docType,
          customerNif: customerNif.trim() || targetSale.customerNif,
          customerName: customerName.trim() || targetSale.customerName,
          customerAddress: customerAddress.trim() || targetSale.customerAddress,
          user: currentUser,
        });

        onClose();
        onViewReceipt(doc);
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Erro ao emitir fatura no programa certificado.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <FilePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Nova Fatura Avulsa</h3>
              <p className="text-[11px] text-stone-400">
                Registo de fatura certificada sem mesa ou pedido do site
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Seletor de Modo: Nova Venda vs Venda Existente sem Fatura */}
        <div className="px-5 pt-3 bg-stone-950 border-b border-stone-800 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setModalMode('nova_venda');
              setStep('formulario');
            }}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              modalMode === 'nova_venda'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <FilePlus className="w-3.5 h-3.5" />
            Nova Venda Avulsa / Balcão
          </button>

          <button
            type="button"
            onClick={() => {
              setModalMode('venda_existente');
              setStep('formulario');
            }}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
              modalMode === 'venda_existente'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            Venda Existente sem Fatura ({unbilledSales.length})
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {step === 'formulario' ? (
            <form onSubmit={handleProceedToConfirmation} className="space-y-4">
              {/* Se for Venda Existente sem Fatura */}
              {modalMode === 'venda_existente' && (
                <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800 space-y-2">
                  <label className="text-xs font-semibold text-stone-300">
                    Selecione a Venda Pendente de Emissão:
                  </label>
                  {unbilledSales.length === 0 ? (
                    <div className="text-xs text-stone-500 italic p-3 text-center bg-stone-900 rounded-lg">
                      Não existem vendas pendentes de faturação no sistema.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {unbilledSales.map((s) => (
                        <label
                          key={s.id}
                          className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer text-xs transition-all ${
                            selectedExistingSaleId === s.id
                              ? 'bg-amber-950/40 border-amber-500 text-white'
                              : 'bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-800'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="existingSale"
                              checked={selectedExistingSaleId === s.id}
                              onChange={() => {
                                setSelectedExistingSaleId(s.id);
                                setCustomerName(s.customerName || 'Consumidor Final');
                                setCustomerNif(s.customerNif || '999999990');
                                setCustomerAddress(s.customerAddress || '');
                              }}
                              className="text-amber-500 focus:ring-amber-500"
                            />
                            <div>
                              <div className="font-semibold text-white">
                                {s.tableName} • {s.items.length} itens
                              </div>
                              <div className="text-[11px] text-stone-400">
                                {s.customerName} ({s.customerNif || 'Sem NIF'}) • {s.id}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-bold text-amber-400">
                              {formatCurrency(s.total)}
                            </div>
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                s.status === 'paga'
                                  ? 'bg-emerald-950 text-emerald-400'
                                  : 'bg-amber-950 text-amber-400'
                              }`}
                            >
                              {s.status}
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Dados do Cliente e Enquadramento Fiscal */}
              <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-amber-500" />
                    Dados do Cliente e Tipo de Fatura
                  </span>

                  {/* Tipo de Documento */}
                  <div className="flex rounded-lg bg-stone-900 p-0.5 border border-stone-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setDocType('FS')}
                      className={`px-3 py-1 rounded-md font-semibold transition-all ${
                        docType === 'FS' ? 'bg-amber-600 text-white shadow' : 'text-stone-400 hover:text-white'
                      }`}
                    >
                      Fatura Simplificada (FS)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDocType('FT')}
                      className={`px-3 py-1 rounded-md font-semibold transition-all ${
                        docType === 'FT' ? 'bg-amber-600 text-white shadow' : 'text-stone-400 hover:text-white'
                      }`}
                    >
                      Fatura (FT)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-stone-400">Selecionar Cliente Registado:</label>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => handleSelectCustomer(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-2 text-xs text-stone-200 mt-1 focus:outline-none focus:border-amber-500"
                    >
                      <option value="">Consumidor Final (Sem ficha)</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.nif ? `(${c.nif})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-stone-400">Nome do Destinatário:</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Ex: João Ferreira ou Consumidor Final"
                      className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-xs text-white mt-1 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-stone-400">NIF (com validação PT):</label>
                    <input
                      type="text"
                      maxLength={9}
                      value={customerNif}
                      onChange={(e) => handleNifChange(e.target.value)}
                      placeholder="999999990"
                      className={`w-full bg-stone-900 border rounded-lg px-3 py-2 text-xs font-mono text-white mt-1 focus:outline-none ${
                        nifError ? 'border-rose-500 text-rose-300' : 'border-stone-700 focus:border-amber-500'
                      }`}
                    />
                    {nifError && <p className="text-[10px] text-rose-400 mt-0.5">{nifError}</p>}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-stone-400">Morada Fiscal (Opcional):</label>
                  <input
                    type="text"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="Rua, Número, Localidade, Código Postal"
                    className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-200 mt-1 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Itens da Venda com Cardápio Integrado (Apenas no modo Nova Venda) */}
              {modalMode === 'nova_venda' && (
                <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-4">
                  {/* Cabeçalho do Cardápio */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800/80 pb-2.5">
                    <div>
                      <span className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                        <Utensils className="w-4 h-4 text-amber-500" />
                        Cardápio Integrado
                      </span>
                      <p className="text-[11px] text-stone-400">
                        Clique nos produtos para adicionar ou aumentar a quantidade na fatura
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddNewLine}
                      className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-400" />
                      <span>+ Linha Manual / Serviço</span>
                    </button>
                  </div>

                  {/* Barra de Categorias com Pills */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                      <button
                        type="button"
                        onClick={() => setSelectedCategory('all')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                          selectedCategory === 'all'
                            ? 'bg-amber-600 text-white shadow-md'
                            : 'bg-stone-900 hover:bg-stone-800 text-stone-400 border border-stone-800'
                        }`}
                      >
                        <Tag className="w-3.5 h-3.5" />
                        <span>Todas ({products.length})</span>
                      </button>

                      {categories.map((cat) => {
                        const count = products.filter((p) => p.categoryId === cat.id).length;
                        const isSelected = selectedCategory === cat.id;

                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-amber-600 text-white shadow-md'
                                : 'bg-stone-900 hover:bg-stone-800 text-stone-400 border border-stone-800'
                            }`}
                          >
                            <span>{cat.icon || '🍽'}</span>
                            <span>{cat.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-stone-950/60 font-mono">
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Pesquisa de Produtos */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Filtrar produtos do cardápio por nome ou código..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="w-full bg-stone-900 border border-stone-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500"
                      />
                      {productSearch && (
                        <button
                          type="button"
                          onClick={() => setProductSearch('')}
                          className="absolute right-2.5 top-2 text-stone-400 hover:text-white text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Grelha de Produtos do Cardápio */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-52 overflow-y-auto pr-1">
                    {filteredCatalogProducts.map((p) => {
                      const existingItem = items.find((it) => it.productId === p.id);
                      const currentQty = existingItem ? existingItem.quantity : 0;
                      const isOutOfStock = p.trackStock && p.stockQuantity <= 0;

                      return (
                        <button
                          type="button"
                          key={p.id}
                          disabled={!p.available || isOutOfStock}
                          onClick={() => handleProductClick(p)}
                          className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all relative ${
                            !p.available || isOutOfStock
                              ? 'opacity-40 border-stone-900 bg-stone-950/40 cursor-not-allowed'
                              : currentQty > 0
                              ? 'border-amber-500 bg-amber-950/30 text-white shadow-sm ring-1 ring-amber-500/50'
                              : 'border-stone-800/90 bg-stone-900 hover:border-amber-500/60 hover:bg-stone-850 active:scale-95 shadow-sm'
                          }`}
                        >
                          {currentQty > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-stone-950 text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-md animate-in zoom-in-50">
                              {currentQty}x
                            </span>
                          )}

                          <div>
                            <div className="font-bold text-xs text-white line-clamp-1">{p.name}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-stone-400 font-mono">
                                IVA {(p.vatRate * 100).toFixed(0)}%
                              </span>
                              {p.code && (
                                <span className="text-[9px] text-stone-500 font-mono">
                                  {p.code}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-stone-800/60">
                            <span className="font-mono font-bold text-xs text-amber-400">
                              {formatCurrency(p.price)}
                            </span>
                            <span className="w-5 h-5 rounded-md bg-amber-600/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                              +
                            </span>
                          </div>
                        </button>
                      );
                    })}

                    {filteredCatalogProducts.length === 0 && (
                      <div className="col-span-full py-6 text-center text-xs text-stone-500 italic">
                        Nenhum produto encontrado nesta categoria ou pesquisa.
                      </div>
                    )}
                  </div>

                  {/* Lista de Itens Selecionados da Fatura */}
                  <div className="border-t border-stone-800 pt-3 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-bold text-stone-200">
                      <span className="flex items-center gap-1.5">
                        <ShoppingBag className="w-4 h-4 text-amber-500" />
                        Itens Selecionados da Fatura ({items.reduce((sum, it) => sum + (it.quantity || 0), 0)} itens):
                      </span>
                      <span className="text-[11px] text-stone-400 font-mono">
                        Subtotal: {formatCurrency(grossTotalBeforeDiscount)}
                      </span>
                    </div>

                    {items.length === 0 ? (
                      <div className="p-4 bg-stone-900/60 border border-dashed border-stone-800 rounded-xl text-center text-xs text-stone-400 space-y-1">
                        <p className="font-semibold text-stone-300">Nenhum item adicionado à fatura.</p>
                        <p className="text-[11px] text-stone-500">
                          Clique nos produtos do cardápio acima para incluir na fatura ou utilize o botão "+ Linha Manual / Serviço".
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {items.map((item, idx) => {
                          const lineDisc = item.discountPercent || 0;
                          const lineTotal = (item.unitPrice * (1 - lineDisc / 100)) * item.quantity;

                          return (
                            <div
                              key={item.id}
                              className="p-2.5 bg-stone-900 border border-stone-800 rounded-xl space-y-2 text-xs"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-bold text-amber-400 uppercase">
                                  Item #{idx + 1} {item.productId ? '• Cardápio' : '• Linha Avulsa'}
                                </span>

                                <div className="flex items-center gap-3">
                                  <span className="font-mono font-bold text-white text-xs">
                                    {formatCurrency(lineTotal)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveLine(idx)}
                                    className="text-stone-500 hover:text-rose-400 p-1 transition-colors"
                                    title="Remover este item"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                                {/* Nome / Descrição */}
                                <div className="sm:col-span-5">
                                  <input
                                    type="text"
                                    required
                                    value={item.productName}
                                    onChange={(e) => handleUpdateItem(idx, 'productName', e.target.value)}
                                    placeholder="Ex: Bacalhau à Brás, Café, Consultoria..."
                                    className="w-full bg-stone-950 border border-stone-700 rounded px-2.5 py-1 text-xs text-white"
                                  />
                                </div>

                                {/* Quantidade com [-] e [+] */}
                                <div className="sm:col-span-3 flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleDecrementQty(idx)}
                                    className="w-6 h-6 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 flex items-center justify-center font-bold text-xs"
                                    title="Diminuir quantidade"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <input
                                    type="number"
                                    min={1}
                                    step={1}
                                    required
                                    value={item.quantity}
                                    onChange={(e) =>
                                      handleUpdateItem(idx, 'quantity', Math.max(1, parseInt(e.target.value) || 1))
                                    }
                                    className="w-12 bg-stone-950 border border-stone-700 rounded px-1 py-1 text-xs font-mono text-white text-center"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleIncrementQty(idx)}
                                    className="w-6 h-6 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 flex items-center justify-center font-bold text-xs"
                                    title="Aumentar quantidade"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>

                                {/* Preço Unitário */}
                                <div className="sm:col-span-2">
                                  <div className="relative">
                                    <input
                                      type="number"
                                      min={0}
                                      step="0.01"
                                      required
                                      value={item.unitPrice}
                                      onChange={(e) =>
                                        handleUpdateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)
                                      }
                                      className="w-full bg-stone-950 border border-stone-700 rounded px-2 py-1 text-xs font-mono text-white text-right"
                                    />
                                    <span className="absolute right-1.5 top-1 text-[10px] text-stone-500 pointer-events-none">
                                      €
                                    </span>
                                  </div>
                                </div>

                                {/* Taxa de IVA */}
                                <div className="sm:col-span-2">
                                  <select
                                    value={item.vatRate}
                                    onChange={(e) =>
                                      handleUpdateItem(idx, 'vatRate', parseFloat(e.target.value))
                                    }
                                    className="w-full bg-stone-950 border border-stone-700 rounded px-1.5 py-1 text-xs text-stone-200 font-mono"
                                  >
                                    {VAT_RATES.map((vr) => (
                                      <option key={vr.rate} value={vr.rate}>
                                        {(vr.rate * 100).toFixed(0)}%
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Resumo de Valores */}
                  <div className="bg-stone-900 p-3.5 rounded-xl border border-stone-800 space-y-1.5 text-xs">
                    <div className="flex justify-between text-stone-400">
                      <span>Subtotal (sem IVA):</span>
                      <span className="font-mono">{formatCurrency(subtotalNet)}</span>
                    </div>
                    <div className="flex justify-between text-stone-400">
                      <span>Total Imposto (IVA):</span>
                      <span className="font-mono">{formatCurrency(totalVat)}</span>
                    </div>
                    <div className="flex justify-between items-center text-stone-400 pt-1 border-t border-stone-800">
                      <span>Desconto Geral (€):</span>
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        value={globalDiscount}
                        onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)}
                        className="w-24 bg-stone-950 border border-stone-700 rounded px-2 py-1 text-xs font-mono text-white text-right"
                      />
                    </div>
                    <div className="flex justify-between text-sm font-extrabold text-white pt-1.5 border-t border-stone-800">
                      <span>TOTAL A FATURAR:</span>
                      <span className="font-mono text-amber-400 text-base">{formatCurrency(finalGrossTotal)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Estado do Pagamento (Requisito: Separar faturação de pagamento) */}
              <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                    <Banknote className="w-4 h-4 text-emerald-400" />
                    Condição de Pagamento do Documento
                  </span>

                  <div className="flex rounded-lg bg-stone-900 p-0.5 border border-stone-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setIsPaid(true)}
                      className={`px-3 py-1 rounded-md font-semibold transition-all ${
                        isPaid ? 'bg-emerald-600 text-white shadow' : 'text-stone-400 hover:text-white'
                      }`}
                    >
                      Pagamento Já Recebido
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPaid(false)}
                      className={`px-3 py-1 rounded-md font-semibold transition-all ${
                        !isPaid ? 'bg-amber-600 text-white shadow' : 'text-stone-400 hover:text-white'
                      }`}
                    >
                      Pendente / A Prazo (A Crédito)
                    </button>
                  </div>
                </div>

                {isPaid ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] text-stone-400">Forma de Pagamento:</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                        className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-xs text-white mt-1"
                      >
                        <option value="dinheiro">Dinheiro (Numerário)</option>
                        <option value="cartao">Cartão Multibanco / Crédito</option>
                        <option value="mbway">MB WAY</option>
                        <option value="transferencia">Transferência Bancária</option>
                        <option value="outro">Outro</option>
                      </select>
                    </div>

                    {paymentMethod === 'dinheiro' && (
                      <div>
                        <label className="text-[11px] text-stone-400">
                          Valor Entregue pelo Cliente (€):
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder={finalGrossTotal.toFixed(2)}
                          value={receivedAmount || ''}
                          onChange={(e) => setReceivedAmount(parseFloat(e.target.value) || 0)}
                          className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-xs font-mono text-white mt-1"
                        />
                        {receivedAmount > finalGrossTotal && (
                          <div className="text-[11px] text-emerald-400 mt-1 flex justify-between font-mono">
                            <span>Troco:</span>
                            <strong>{formatCurrency(changeAmount)}</strong>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-amber-300/80 bg-amber-950/20 border border-amber-900/50 p-2.5 rounded-lg">
                    A fatura será emitida legalmente com a indicação de pagamento pendente. O recebimento poderá ser liquidado posteriormente no Caixa sem duplicar a fatura.
                  </p>
                )}
              </div>

              {/* Observações */}
              <div>
                <label className="text-xs text-stone-400">Observações no Documento (Opcional):</label>
                <input
                  type="text"
                  placeholder="Ex: Refeição executiva avulsa, evento..."
                  value={invoiceNotes}
                  onChange={(e) => setInvoiceNotes(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-white mt-1"
                />
              </div>

              {/* Botão de Avançar */}
              <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-amber-950/40"
                >
                  <span>Rever Resumo e Emitir</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : (
            /* ETAPA DE CONFIRMAÇÃO PRÉVIA */
            <div className="space-y-4">
              <div className="bg-amber-950/20 border border-amber-900/60 p-4 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase">
                  <ShieldCheck className="w-4 h-4" />
                  Confirmação de Emissão Fiscal Certificada (Vendus / AT)
                </div>
                <p className="text-xs text-stone-300">
                  Por favor, confirme os dados abaixo antes de submeter à Autoridade Tributária. Após a emissão, o documento fiscal é gerado com código ATCUD e assinatura digital.
                </p>
              </div>

              <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-2.5 text-xs">
                <div className="flex justify-between border-b border-stone-800/80 pb-2">
                  <span className="text-stone-400">Tipo de Documento:</span>
                  <span className="font-bold text-white">
                    {docType === 'FT' ? 'Fatura (FT)' : 'Fatura Simplificada (FS)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Cliente / NIF:</span>
                  <span className="font-semibold text-white">
                    {customerName} • {customerNif}
                  </span>
                </div>
                {customerAddress && (
                  <div className="flex justify-between">
                    <span className="text-stone-400">Morada:</span>
                    <span className="text-stone-300">{customerAddress}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-stone-400">Estado de Pagamento:</span>
                  <span
                    className={`font-bold ${isPaid ? 'text-emerald-400' : 'text-amber-400'}`}
                  >
                    {isPaid ? `Liquidado (${paymentMethod.toUpperCase()})` : 'Pendente / A Crédito'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Operador Certificado:</span>
                  <span className="text-stone-300 font-medium">{currentUser.name}</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-white pt-2 border-t border-stone-800">
                  <span>TOTAL A PAGAR:</span>
                  <span className="font-mono text-amber-400">
                    {formatCurrency(finalGrossTotal)}
                  </span>
                </div>
              </div>

              {submitError && (
                <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setStep('formulario')}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold rounded-xl"
                >
                  Voltar e Editar
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleEmitInvoice}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      A Comunicar com Vendus / AT...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Confirmar e Emitir Fatura
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
