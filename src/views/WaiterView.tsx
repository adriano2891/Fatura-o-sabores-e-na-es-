import React, { useState } from 'react';
import {
  UtensilsCrossed,
  Search,
  Plus,
  Minus,
  Trash2,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
  ChevronRight,
  Sparkles,
  ArrowRightLeft,
  X,
  Check,
  RotateCcw,
  AlertTriangle,
  QrCode,
  Users,
  ShieldCheck,
  Bell,
  Layers,
  Award,
} from 'lucide-react';
import { AppState, store } from '../services/storage';
import {
  Table,
  Product,
  OrderItem,
  ProductVariant,
  ProductExtra,
  TableSeat,
  AllergyRestriction,
  RestrictionType,
  PaymentMethod,
} from '../types';
import { formatCurrency, formatTime, getElapsedMinutes, formatElapsed, validatePortugueseNIF } from '../utils/formatters';
import { RepeatItemsModal } from '../components/RepeatItemsModal';
import { TableQRModal } from '../components/TableQRModal';
import { ShiftHandoverModal } from '../components/ShiftHandoverModal';

interface WaiterViewProps {
  state: AppState;
  onSelectTab: (tab: any) => void;
}

export const WaiterView: React.FC<WaiterViewProps> = ({ state, onSelectTab }) => {
  const { tables, products, categories, comandas, currentUser, settings, representatives, customers } = state;

  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [tableFilter, setTableFilter] = useState<'minhas' | 'livres' | 'ocupadas' | 'alertas'>('minhas');
  const [tableSearchQuery, setTableSearchQuery] = useState<string>('');
  const [guestCountInput, setGuestCountInput] = useState<number>(2);
  const [repCodeInput, setRepCodeInput] = useState<string>('');
  const [repVerifiedName, setRepVerifiedName] = useState<string | null>(null);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('cat-1');
  const [searchQuery, setSearchQuery] = useState('');

  // Lugar ativo para o qual os itens estão a ser adicionados
  const [activeSeatNumber, setActiveSeatNumber] = useState<number | undefined>(1); // undefined = "Para partilhar"
  const [filterSeatView, setFilterSeatView] = useState<number | 'todos' | 'partilhar'>('todos');

  // Itens da nova ronda antes de enviar à cozinha
  const [pendingCart, setPendingCart] = useState<
    {
      product: Product;
      quantity: number;
      variant?: ProductVariant;
      extras: ProductExtra[];
      notes: string;
      totalPrice: number;
      seatNumber?: number;
      seatName?: string;
    }[]
  >([]);

  // Modais
  const [productModal, setProductModal] = useState<Product | null>(null);
  const [modalVariant, setModalVariant] = useState<ProductVariant | undefined>(undefined);
  const [modalExtras, setModalExtras] = useState<ProductExtra[]>([]);
  const [modalNotes, setModalNotes] = useState<string>('');
  const [modalQty, setModalQty] = useState<number>(1);
  const [allergyWarningAck, setAllergyWarningAck] = useState<boolean>(false);

  // Modal Lugar / Alergias
  const [editSeatModal, setEditSeatModal] = useState<TableSeat | null>(null);
  const [seatNameInput, setSeatNameInput] = useState<string>('');
  const [newAllergyName, setNewAllergyName] = useState<string>('');
  const [newAllergyType, setNewAllergyType] = useState<RestrictionType>('alergia');

  // Modal Transferir Item entre Lugares
  const [transferItemModal, setTransferItemModal] = useState<OrderItem | null>(null);
  const [targetSeatForTransfer, setTargetSeatForTransfer] = useState<number | undefined>(undefined);

  // Modais de Apoio
  const [repeatModalOpen, setRepeatModalOpen] = useState(false);
  const [qrModalTable, setQrModalTable] = useState<Table | null>(null);
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [transferTableModalOpen, setTransferTableModalOpen] = useState(false);
  const [targetTransferTableId, setTargetTransferTableId] = useState('');
  const [customerNifInput, setCustomerNifInput] = useState('999999990');
  const [customerNameInput, setCustomerNameInput] = useState('Consumidor Final');
  const [nifError, setNifError] = useState('');
  const [directPaymentMethod, setDirectPaymentMethod] = useState<PaymentMethod>('cartao');

  // Modal Plano de Marmitas
  const [mealPlanModalOpen, setMealPlanModalOpen] = useState(false);

  // Proteção contra envio duplo
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedTable = tables.find((t) => t.id === selectedTableId);
  const activeComanda = comandas.find(
    (c) => c.id === selectedTable?.activeComandaId && c.status !== 'paga'
  );

  // Filtro de mesas
  const filteredTables = tables.filter((t) => {
    // Filtro de texto por número da mesa ou sala
    if (tableSearchQuery.trim()) {
      const q = tableSearchQuery.toLowerCase();
      if (!t.number.toLowerCase().includes(q) && !t.roomName.toLowerCase().includes(q)) {
        return false;
      }
    }

    if (tableFilter === 'minhas') {
      return t.waiterId === currentUser.id;
    }
    if (tableFilter === 'livres') {
      return t.status === 'livre';
    }
    if (tableFilter === 'ocupadas') {
      return t.status === 'ocupada' || t.status === 'conta_solicitada';
    }
    if (tableFilter === 'alertas') {
      const cmd = comandas.find((c) => c.id === t.activeComandaId);
      const hasLateRound = cmd?.rounds.some((r) => {
        const elapsed = getElapsedMinutes(r.createdAt);
        return (
          elapsed > (settings.expectedPrepTimeMinutes + settings.delayToleranceMinutes) &&
          r.items.some((i) => i.status === 'recebido' || i.status === 'em_preparacao')
        );
      });
      const hasReadyUndelivered = cmd?.rounds.some((r) =>
        r.items.some(
          (i) => i.status === 'pronto' && getElapsedMinutes(i.statusUpdatedAt) > settings.readyDeliveryDelayMinutes
        )
      );
      return !!t.activeCall || hasLateRound || hasReadyUndelivered;
    }
    return true;
  });

  // Abertura de comanda
  const handleOpenComanda = (tableId: string) => {
    try {
      const comanda = store.openComanda(tableId, guestCountInput, currentUser, repCodeInput || undefined);
      setSelectedTableId(tableId);
      setActiveSeatNumber(1);
      setPendingCart([]);
      setRepCodeInput('');
      setRepVerifiedName(null);
    } catch (err: any) {
      alert(err.message || 'Erro ao abrir comanda');
    }
  };

  // Verificação de código de representante
  const handleVerifyRepCode = (code: string) => {
    setRepCodeInput(code);
    const rep = representatives.find((r) => r.code.toUpperCase() === code.trim().toUpperCase() && r.active);
    if (rep) {
      setRepVerifiedName(rep.name);
    } else {
      setRepVerifiedName(null);
    }
  };

  // Preparar adição de produto
  const handleOpenProductOptions = (product: Product) => {
    setProductModal(product);
    setModalVariant(product.variants.length > 0 ? product.variants[0] : undefined);
    setModalExtras([]);
    setModalNotes('');
    setModalQty(1);
    setAllergyWarningAck(false);
  };

  // Verifica se o lugar ativo tem alergia incompatível com o produto
  const activeSeatObj = activeComanda?.seats.find((s) => s.seatNumber === activeSeatNumber);
  const detectedAllergens =
    productModal && activeSeatObj
      ? activeSeatObj.allergies
          .filter((a) => productModal.allergens.some((pa) => pa.toLowerCase().includes(a.name.toLowerCase())))
          .map((a) => a.name)
      : [];

  const handleAddProductToPendingCart = () => {
    if (!productModal) return;

    if (detectedAllergens.length > 0 && !allergyWarningAck) {
      alert(`Atenção: Este produto contém [${detectedAllergens.join(', ')}]. É obrigatório confirmar a verificação de alergia antes de adicionar.`);
      return;
    }

    const basePrice = productModal.price + (modalVariant?.priceDelta || 0);
    const extrasPrice = modalExtras.reduce((sum, e) => sum + e.priceDelta, 0);
    const unitPrice = basePrice + extrasPrice;
    const totalPrice = unitPrice * modalQty;

    const seatName = activeSeatNumber
      ? activeSeatObj?.name || `Lugar ${activeSeatNumber}`
      : 'Para partilhar';

    setPendingCart((prev) => [
      ...prev,
      {
        product: productModal,
        quantity: modalQty,
        variant: modalVariant,
        extras: modalExtras,
        notes: modalNotes.trim(),
        totalPrice,
        seatNumber: activeSeatNumber,
        seatName,
      },
    ]);

    setProductModal(null);
  };

  // Enviar ronda à cozinha / bar com proteção contra toques repetidos
  const handleSendRound = () => {
    if (!activeComanda) return;
    if (pendingCart.length === 0) return;
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const itemsToSend = pendingCart.map((item) => ({
        productId: item.product.id,
        productCode: item.product.code,
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.totalPrice / item.quantity,
        vatRate: item.product.vatRate,
        sector: item.product.sector,
        selectedVariant: item.variant,
        selectedExtras: item.extras,
        totalItemPrice: item.totalPrice,
        notes: item.notes,
        seatNumber: item.seatNumber,
        seatName: item.seatName,
      }));

      store.addOrderRound(activeComanda.id, itemsToSend, currentUser);
      setPendingCart([]);
    } catch (err: any) {
      alert(err.message || 'Erro ao enviar pedido à cozinha');
    } finally {
      setTimeout(() => setIsSubmitting(false), 500);
    }
  };

  // Gestão de Lugares e Alergias
  const handleOpenEditSeat = (seat: TableSeat) => {
    setEditSeatModal(seat);
    setSeatNameInput(seat.name || '');
    setNewAllergyName('');
  };

  const handleSaveSeat = () => {
    if (!activeComanda || !editSeatModal) return;
    store.updateSeat(activeComanda.id, editSeatModal.seatNumber, seatNameInput, editSeatModal.allergies);
    setEditSeatModal(null);
  };

  const handleAddAllergyToSeat = () => {
    if (!newAllergyName.trim() || !editSeatModal) return;
    const newAllergy: AllergyRestriction = {
      id: `ALG-${Date.now()}`,
      type: newAllergyType,
      name: newAllergyName.trim(),
    };
    setEditSeatModal({
      ...editSeatModal,
      allergies: [...editSeatModal.allergies, newAllergy],
    });
    setNewAllergyName('');
  };

  const handleRemoveAllergyFromSeat = (algId: string) => {
    if (!editSeatModal) return;
    setEditSeatModal({
      ...editSeatModal,
      allergies: editSeatModal.allergies.filter((a) => a.id !== algId),
    });
  };

  // Transferência de item entre lugares
  const handleConfirmTransferItem = () => {
    if (!activeComanda || !transferItemModal) return;
    store.transferItemBetweenSeats(activeComanda.id, transferItemModal.id, targetSeatForTransfer);
    setTransferItemModal(null);
  };

  // Solicitar conta
  const handleConfirmRequestBill = () => {
    if (!activeComanda) return;
    if (customerNifInput && customerNifInput !== '999999990') {
      const nifCheck = validatePortugueseNIF(customerNifInput);
      if (!nifCheck.valid) {
        setNifError(nifCheck.message || 'NIF inválido para Portugal');
        return;
      }
    }

    store.requestBill(activeComanda.id, customerNifInput, customerNameInput);
    setBillModalOpen(false);
    setNifError('');
  };

  // Liquidação direta de pagamento no Atendimento (quando ativado expressamente pelo Administrador)
  const handleDirectPayment = () => {
    if (!activeComanda) return;
    try {
      store.registerPayment({
        comandaId: activeComanda.id,
        payments: [{ method: directPaymentMethod, amount: activeComanda.balanceDue }],
        user: currentUser,
      });
      setBillModalOpen(false);
      alert(`Pagamento registado com sucesso via ${directPaymentMethod === 'cartao' ? 'Multibanco' : directPaymentMethod === 'mbway' ? 'MB WAY' : 'Numerário'}!`);
    } catch (err: any) {
      alert(err.message || 'Erro ao processar pagamento');
    }
  };

  // Transferir mesa inteira
  const handleConfirmTransferTable = () => {
    if (!selectedTable || !targetTransferTableId) return;
    try {
      store.transferTable(selectedTable.id, targetTransferTableId, currentUser);
      setSelectedTableId(targetTransferTableId);
      setTransferTableModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Erro ao transferir mesa');
    }
  };

  // Resgate de Refeição de Plano
  const handleRedeemMeal = (customerId: string, planId: string) => {
    if (!activeComanda) return;
    try {
      store.redeemMealPlanMeal(activeComanda.id, customerId, planId, currentUser);
      setMealPlanModalOpen(false);
      alert('Refeição debitada do plano com sucesso!');
    } catch (err: any) {
      alert(err.message || 'Erro ao resgatar refeição');
    }
  };

  // Filtragem de produtos
  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategoryId ? p.categoryId === selectedCategoryId : true;
    const matchesQuery = searchQuery
      ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="space-y-4">
      {/* Barra de Seleção Rápida de Mesa & Filtros PWA */}
      <div className="bg-stone-900/90 p-4 rounded-2xl border border-stone-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-amber-500" />
            <h2 className="text-sm md:text-base font-bold text-white">
              Comanda Digital do Empregado de Mesa
            </h2>
          </div>

          {/* Filtros de Mesas & Pesquisa para Navegação com Uma Mão */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-36">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar mesa..."
                value={tableSearchQuery}
                onChange={(e) => setTableSearchQuery(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-8 pr-2.5 py-1 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs">
              <button
                onClick={() => setTableFilter('minhas')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  tableFilter === 'minhas' ? 'bg-amber-600 text-white' : 'text-stone-400'
                }`}
              >
                Minhas mesas
              </button>
              <button
                onClick={() => setTableFilter('livres')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  tableFilter === 'livres' ? 'bg-amber-600 text-white' : 'text-stone-400'
                }`}
              >
                Livres
              </button>
              <button
                onClick={() => setTableFilter('ocupadas')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  tableFilter === 'ocupadas' ? 'bg-amber-600 text-white' : 'text-stone-400'
                }`}
              >
                Ocupadas
              </button>
              <button
                onClick={() => setTableFilter('alertas')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  tableFilter === 'alertas' ? 'bg-rose-600 text-white animate-pulse' : 'text-stone-400'
                }`}
              >
                Com alertas
              </button>
              <button
                onClick={() => setShiftModalOpen(true)}
                className="px-2 py-1 rounded-lg font-semibold text-stone-300 hover:text-white hover:bg-stone-900 border border-stone-800 transition-all flex items-center gap-1"
                title="Passagem de turno"
              >
                <ArrowRightLeft className="w-3 h-3 text-amber-500" />
                <span className="hidden sm:inline">Passar Turno</span>
              </button>
            </div>
          </div>
        </div>

        {/* Grelha de Mesas */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
          {filteredTables.map((tbl) => {
            const isSelected = selectedTableId === tbl.id;
            const isOccupied = tbl.status === 'ocupada' || tbl.status === 'conta_solicitada';
            const hasCall = !!tbl.activeCall;

            return (
              <button
                key={tbl.id}
                onClick={() => {
                  setSelectedTableId(tbl.id);
                  setPendingCart([]);
                  setActiveSeatNumber(1);
                  setFilterSeatView('todos');
                }}
                className={`p-2.5 rounded-xl border text-center transition-all relative ${
                  hasCall
                    ? 'border-rose-500 bg-rose-950/60 text-rose-200 animate-pulse'
                    : isSelected
                    ? 'border-amber-500 bg-amber-500/20 text-white shadow-lg'
                    : isOccupied
                    ? 'border-amber-800/80 bg-stone-950 text-amber-300 hover:border-amber-600'
                    : 'border-stone-800 bg-stone-950/40 text-stone-300 hover:bg-stone-800'
                }`}
              >
                {hasCall && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500 ring-2 ring-stone-950" />
                )}
                <div className="font-bold text-xs truncate">{tbl.number}</div>
                <div className="text-[10px] text-stone-400 mt-0.5">
                  {hasCall ? 'Chamada!' : isOccupied ? formatCurrency(tbl.totalAmount) : `${tbl.capacity} pax`}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conteúdo Principal: Comanda Selecionada */}
      {!selectedTable ? (
        <div className="bg-stone-900/60 border border-dashed border-stone-800 rounded-2xl p-12 text-center text-stone-500 text-sm">
          Selecione uma mesa acima para abrir a comanda ou consultar os pedidos.
        </div>
      ) : !activeComanda ? (
        /* Mesa Livre: Abertura de Comanda com Lugares e Representante */
        <div className="bg-stone-900 p-8 rounded-2xl border border-stone-800 max-w-md mx-auto text-center space-y-5">
          <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center mx-auto">
            <UtensilsCrossed className="w-6 h-6" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-white">Abrir Comanda para {selectedTable.number}</h3>
            <p className="text-xs text-stone-400 mt-1">{selectedTable.roomName} • Capacidade {selectedTable.capacity} pessoas</p>
          </div>

          <div className="space-y-4 text-left bg-stone-950 p-4 rounded-xl border border-stone-800">
            <div>
              <label className="text-xs font-semibold text-stone-300">Número de Pessoas à Mesa (Cria Lugares Automáticos):</label>
              <div className="flex items-center gap-3 mt-1.5">
                <button
                  type="button"
                  onClick={() => setGuestCountInput((prev) => Math.max(1, prev - 1))}
                  className="w-10 h-10 rounded-lg bg-stone-800 hover:bg-stone-700 text-white font-bold flex items-center justify-center"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-mono text-xl font-bold text-white flex-1 text-center">
                  {guestCountInput}
                </span>
                <button
                  type="button"
                  onClick={() => setGuestCountInput((prev) => prev + 1)}
                  className="w-10 h-10 rounded-lg bg-stone-800 hover:bg-stone-700 text-white font-bold flex items-center justify-center"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Código do Representante (Requisito 6) */}
            <div>
              <label className="text-xs font-semibold text-stone-300">Código do Representante (Opcional):</label>
              <input
                type="text"
                placeholder="Ex: REP-101, REP-202..."
                value={repCodeInput}
                onChange={(e) => handleVerifyRepCode(e.target.value)}
                className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-2 text-xs text-white uppercase font-mono mt-1"
              />
              {repVerifiedName && (
                <div className="text-[11px] text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Representante validado: {repVerifiedName}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => handleOpenComanda(selectedTable.id)}
            className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Abrir Comanda e Iniciar Atendimento
          </button>
        </div>
      ) : (
        /* Mesa Ocupada: Ecrã de Gestão de Comanda & Cardápio */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Coluna Esquerda: Cardápio & Seleção por Lugar (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Barra de Lugares na Mesa (Requisito 1: Identificar clientes por lugar na mesa) */}
            <div className="bg-stone-900 p-3.5 rounded-2xl border border-stone-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-stone-200">
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-amber-500" />
                  Lugares na Mesa (Selecione para associar o item):
                </span>
                <button
                  type="button"
                  onClick={() => store.addSeatToComanda(activeComanda.id)}
                  className="text-amber-400 hover:underline flex items-center gap-1 text-[11px]"
                >
                  <Plus className="w-3 h-3" /> Adicionar Lugar
                </button>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {/* Botão Para Partilhar */}
                <button
                  onClick={() => setActiveSeatNumber(undefined)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                    activeSeatNumber === undefined
                      ? 'bg-purple-600 border-purple-500 text-white shadow-md'
                      : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-white'
                  }`}
                >
                  Para Partilhar
                </button>

                {/* Lugares Individuais */}
                {activeComanda.seats.map((seat) => {
                  const isSelected = activeSeatNumber === seat.seatNumber;
                  const hasAllergies = seat.allergies.length > 0;

                  return (
                    <div key={seat.seatNumber} className="flex items-center shrink-0">
                      <button
                        onClick={() => setActiveSeatNumber(seat.seatNumber)}
                        className={`px-3 py-1.5 rounded-l-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                          isSelected
                            ? 'bg-amber-600 border-amber-500 text-white shadow-md'
                            : 'bg-stone-950 border-stone-800 text-stone-300 hover:text-white'
                        }`}
                      >
                        <span>Lugar {seat.seatNumber}</span>
                        {seat.name && <span className="font-bold ml-1">({seat.name})</span>}
                        {hasAllergies && (
                          <span className="ml-1 text-[10px] text-rose-300 font-bold">⚠</span>
                        )}
                      </button>

                      {/* Botão Editar Lugar / Alergias */}
                      <button
                        onClick={() => handleOpenEditSeat(seat)}
                        className={`px-1.5 py-1.5 rounded-r-xl border-y border-r text-xs transition-colors ${
                          isSelected
                            ? 'bg-amber-700 border-amber-500 text-white'
                            : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-white'
                        }`}
                        title="Editar nome e restrições alimentares"
                      >
                        ✏️
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Destaque de Alergias do Lugar Ativo */}
              {activeSeatObj && activeSeatObj.allergies.length > 0 && (
                <div className="p-2 bg-rose-950/60 border border-rose-800 text-rose-200 rounded-xl text-xs flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>
                      Alergias em <strong>{activeSeatObj.name || `Lugar ${activeSeatObj.seatNumber}`}</strong>:{' '}
                      {activeSeatObj.allergies.map((a) => a.name).join(', ')}
                    </span>
                  </div>
                  <span className="text-[10px] bg-rose-900 px-1.5 py-0.5 rounded font-bold uppercase">
                    Aviso Ativo
                  </span>
                </div>
              )}
            </div>

            {/* Categorias */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    selectedCategoryId === cat.id
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'bg-stone-900 hover:bg-stone-800 text-stone-400 border border-stone-800'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>

            {/* Barra de Pesquisa */}
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Pesquisar prato, bebida ou código..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-stone-900 border border-stone-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Grelha de Produtos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredProducts.map((p) => {
                const isOutOfStock = p.trackStock && p.stockQuantity <= 0;
                // Alerta prévio de alérgeno
                const hasAllergenConflict =
                  activeSeatObj &&
                  activeSeatObj.allergies.some((a) =>
                    p.allergens.some((pa) => pa.toLowerCase().includes(a.name.toLowerCase()))
                  );

                return (
                  <button
                    key={p.id}
                    disabled={!p.available || isOutOfStock}
                    onClick={() => handleOpenProductOptions(p)}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all relative ${
                      !p.available || isOutOfStock
                        ? 'opacity-40 border-stone-900 bg-stone-950/40 cursor-not-allowed'
                        : hasAllergenConflict
                        ? 'border-rose-600 bg-stone-900 shadow-md shadow-rose-950/20'
                        : 'border-stone-800 bg-stone-900 hover:border-amber-500/60 hover:bg-stone-850 active:scale-98 shadow-sm'
                    }`}
                  >
                    {hasAllergenConflict && (
                      <span className="absolute top-2 right-2 text-[10px] bg-rose-950 text-rose-300 border border-rose-700 px-1 rounded font-bold">
                        ⚠ Alérgeno
                      </span>
                    )}

                    <div>
                      <div className="flex items-start justify-between gap-1 pr-6">
                        <span className="font-bold text-xs text-white line-clamp-1">{p.name}</span>
                        <span className="text-[10px] text-stone-400 uppercase font-mono">{p.sector}</span>
                      </div>
                      <p className="text-[11px] text-stone-400 line-clamp-2 mt-1 leading-snug">
                        {p.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-stone-800/60">
                      <span className="font-bold text-xs text-amber-400 font-mono">
                        {formatCurrency(p.price)}
                      </span>
                      <span className="w-6 h-6 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center font-bold text-xs hover:bg-amber-600 hover:text-white transition-colors">
                        +
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Coluna Direita: Detalhe da Comanda, Lugares & Carrinho de Ronda (5 cols) */}
          <div className="lg:col-span-5 bg-stone-900 rounded-2xl border border-stone-800 p-4 space-y-4">
            {/* Header da Comanda */}
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-white">{selectedTable.number}</span>
                  <span className="text-xs text-stone-400">({selectedTable.roomName})</span>
                  <span className="text-[10px] bg-stone-800 text-amber-400 px-2 py-0.5 rounded-full font-mono">
                    {activeComanda.numberDisplay}
                  </span>
                </div>
                <div className="text-[11px] text-stone-400 mt-0.5">
                  {activeComanda.guestCount} pax • Empregado: {activeComanda.waiterName}
                  {activeComanda.representativeName && (
                    <div className="text-emerald-400 text-[10px] mt-0.5">
                      Rep: {activeComanda.representativeName}
                    </div>
                  )}
                </div>
              </div>

              {/* Ações da Mesa */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setQrModalTable(selectedTable)}
                  className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300"
                  title="Ver QR Code da mesa"
                >
                  <QrCode className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setRepeatModalOpen(true)}
                  className="px-2 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold rounded-lg flex items-center gap-1"
                  title="Repetir itens de rondas anteriores"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Repetir
                </button>
                <button
                  onClick={() => setBillModalOpen(true)}
                  className="px-2.5 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 text-xs font-bold rounded-lg flex items-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Pedir Conta
                </button>
              </div>
            </div>

            {/* SEÇÃO 1: Novos Itens da Próxima Ronda */}
            <div className="bg-stone-950 p-3 rounded-xl border border-amber-600/30 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                <span>Novos Itens a Enviar (Ronda {(activeComanda.rounds.length || 0) + 1})</span>
                <span>{pendingCart.length} itens</span>
              </div>

              {pendingCart.length === 0 ? (
                <div className="text-center py-4 text-[11px] text-stone-500 italic">
                  Toque nos produtos à esquerda para adicionar a esta ronda.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {pendingCart.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-stone-900 border border-stone-800 flex items-start justify-between gap-2 text-xs"
                    >
                      <div className="flex-1">
                        <div className="font-bold text-white flex items-center gap-1">
                          <span>{item.quantity}x {item.product.name}</span>
                          <span className="text-[10px] text-amber-400 bg-stone-800 px-1.5 rounded">
                            {item.seatName}
                          </span>
                        </div>
                        {item.variant && (
                          <div className="text-[10px] text-stone-400">• Opção: {item.variant.name}</div>
                        )}
                        {item.extras.length > 0 && (
                          <div className="text-[10px] text-stone-400">
                            • Extras: {item.extras.map((e) => e.name).join(', ')}
                          </div>
                        )}
                        {item.notes && (
                          <div className="text-[10px] text-amber-400 italic">Obs: {item.notes}</div>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-bold text-white">
                          {formatCurrency(item.totalPrice)}
                        </div>
                        <button
                          onClick={() => setPendingCart((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-stone-500 hover:text-rose-400 p-0.5 mt-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    disabled={isSubmitting}
                    onClick={handleSendRound}
                    className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmitting ? 'A enviar...' : 'Enviar à Cozinha e Bar'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* SEÇÃO 2: Rondas Anteriores & Filtro por Lugar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-300">
                  Itens Já Enviados ({activeComanda.rounds.length} rondas)
                </span>

                {/* Filtro de Visualização por Lugar */}
                <select
                  value={filterSeatView}
                  onChange={(e) =>
                    setFilterSeatView(
                      e.target.value === 'todos'
                        ? 'todos'
                        : e.target.value === 'partilhar'
                        ? 'partilhar'
                        : parseInt(e.target.value, 10)
                    )
                  }
                  className="bg-stone-950 border border-stone-800 rounded px-2 py-0.5 text-[10px] text-stone-300"
                >
                  <option value="todos">Ver todos os lugares</option>
                  <option value="partilhar">Para partilhar</option>
                  {activeComanda.seats.map((s) => (
                    <option key={s.seatNumber} value={s.seatNumber}>
                      Lugar {s.seatNumber}{s.name ? `: ${s.name}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {activeComanda.rounds.length === 0 ? (
                <div className="text-center py-4 text-xs text-stone-500">
                  Nenhuma ronda enviada ainda.
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {activeComanda.rounds.map((round) => {
                    const elapsed = getElapsedMinutes(round.createdAt);
                    const isDelayed =
                      elapsed > (settings.expectedPrepTimeMinutes + settings.delayToleranceMinutes);

                    const readyItemsInRound = round.items.filter((i) => i.status === 'pronto');
                    const preppingItemsInRound = round.items.filter(
                      (i) => i.status === 'recebido' || i.status === 'em_preparacao'
                    );
                    const isPartiallyReady = readyItemsInRound.length > 0 && preppingItemsInRound.length > 0;
                    const isFullyReady = round.items.length > 0 && round.items.every((i) => i.status === 'pronto' || i.status === 'entregue' || i.status === 'cancelado');

                    // Filtrar itens da ronda pelo filtro selecionado
                    const visibleItems = round.items.filter((item) => {
                      if (filterSeatView === 'todos') return true;
                      if (filterSeatView === 'partilhar') return item.seatNumber === undefined;
                      return item.seatNumber === filterSeatView;
                    });

                    if (visibleItems.length === 0) return null;

                    return (
                      <div
                        key={round.roundNumber}
                        className={`p-3 rounded-xl border space-y-2 text-xs transition-all ${
                          isDelayed
                            ? 'bg-rose-950/20 border-rose-800/80 ring-1 ring-rose-500/30'
                            : isPartiallyReady
                            ? 'bg-amber-950/20 border-amber-600/60 ring-1 ring-amber-500/20'
                            : isFullyReady
                            ? 'bg-emerald-950/20 border-emerald-700/60'
                            : 'bg-stone-950/70 border-stone-800'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] text-stone-400 border-b border-stone-800/80 pb-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-stone-200">
                              Ronda #{round.roundNumber} • {formatTime(round.createdAt)}
                            </span>

                            {isPartiallyReady && (
                              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/40 animate-pulse">
                                🟡 Parcialmente pronta ({readyItemsInRound.length} itens disponíveis)
                              </span>
                            )}

                            {isFullyReady && !round.items.every(i => i.status === 'entregue') && (
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/40">
                                🟢 Pronta para entrega total
                              </span>
                            )}

                            {isDelayed && (
                              <span className="text-[9px] bg-rose-600 text-white font-bold px-1.5 py-0.2 rounded animate-pulse">
                                Atraso: {elapsed} min
                              </span>
                            )}
                          </div>

                          {/* Botão Avisar Copa/Cozinha de Atraso */}
                          {isDelayed && (
                            <button
                              onClick={() => store.alertKitchenForDelayedRound(activeComanda.id, round.roundNumber)}
                              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold rounded flex items-center gap-1 shadow"
                              title="Avisar cozinha do atraso com registo temporal"
                            >
                              <Bell className="w-3 h-3" />
                              Avisar Cozinha
                            </button>
                          )}
                        </div>

                        {round.kitchenAcknowledgedAt && (
                          <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Cozinha confirmou visualização às {formatTime(round.kitchenAcknowledgedAt)} ({round.kitchenAcknowledgedBy})
                          </div>
                        )}

                        <div className="space-y-1.5">
                          {visibleItems.map((it) => {
                            const isReady = it.status === 'pronto';
                            const isReadyDelayed =
                              isReady &&
                              getElapsedMinutes(it.statusUpdatedAt) > settings.readyDeliveryDelayMinutes;

                            return (
                              <div
                                key={it.id}
                                className={`flex items-center justify-between text-xs py-1 ${
                                  isReadyDelayed ? 'p-1 rounded bg-rose-950/40 border border-rose-800' : ''
                                }`}
                              >
                                <div>
                                  <span className="font-bold text-white mr-1.5">{it.quantity}x</span>
                                  <span>{it.productName}</span>
                                  <span className="text-[10px] text-amber-400 ml-1.5 bg-stone-900 px-1 rounded">
                                    {it.seatName || 'Partilhar'}
                                  </span>
                                  {/* Setor responsável */}
                                  <span
                                    className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded ml-1.5 ${
                                      it.sector === 'bar'
                                        ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                                        : it.sector === 'atendimento'
                                        ? 'bg-purple-950 text-purple-300 border border-purple-800'
                                        : 'bg-orange-950 text-orange-300 border border-orange-800'
                                    }`}
                                  >
                                    {it.sector === 'atendimento' ? 'Direto' : it.sector}
                                  </span>
                                  {it.transferredFromSeat && (
                                    <span className="text-[9px] text-stone-500 ml-1">
                                      (Transf. L{it.transferredFromSeat})
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5">
                                  {/* Botão para Transferir Lugar */}
                                  <button
                                    onClick={() => {
                                      setTransferItemModal(it);
                                      setTargetSeatForTransfer(it.seatNumber);
                                    }}
                                    className="p-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-400 text-[10px]"
                                    title="Mudar pessoa/lugar deste item"
                                  >
                                    ⇄
                                  </button>

                                  {/* Entrega direta pelo atendimento */}
                                  {it.sector === 'atendimento' && (it.status === 'recebido' || it.status === 'em_preparacao') && (
                                    <button
                                      onClick={() => store.updateItemPrepStatus(it.id, 'pronto', currentUser)}
                                      className="px-2 py-0.5 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold rounded shadow"
                                      title="Item de serviço direto no atendimento"
                                    >
                                      Servir
                                    </button>
                                  )}

                                  {isReady && (
                                    <button
                                      onClick={() =>
                                        store.updateItemPrepStatus(it.id, 'entregue', currentUser)
                                      }
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-extrabold rounded-lg shadow-md animate-pulse flex items-center gap-1"
                                      title="Confirmar entrega deste item à mesa"
                                    >
                                      <Check className="w-3 h-3" />
                                      Confirmar Entrega
                                    </button>
                                  )}

                                  <span
                                    className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-mono ${
                                      it.status === 'pronto'
                                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-600 animate-pulse font-bold'
                                        : it.status === 'entregue'
                                        ? 'bg-stone-850 text-stone-400'
                                        : 'bg-stone-800 text-stone-300'
                                    }`}
                                  >
                                    {it.status.replace(/_/g, ' ')}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Totalizador da Comanda */}
            <div className="pt-3 border-t border-stone-800 space-y-1 text-xs">
              <div className="flex justify-between text-stone-400">
                <span>Subtotal (sem IVA):</span>
                <span>{formatCurrency(activeComanda.subtotal)}</span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>Total IVA:</span>
                <span>{formatCurrency(activeComanda.taxTotal)}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-white pt-1 border-t border-stone-800">
                <span>TOTAL ACUMULADO:</span>
                <span className="font-mono text-amber-400">{formatCurrency(activeComanda.total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Lugar e Alergias (Requisitos 1 e 5) */}
      {editSeatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 text-stone-100">
            <div className="flex justify-between items-center border-b border-stone-800 pb-3">
              <h3 className="font-bold text-sm text-white">
                Configurar Lugar {editSeatModal.seatNumber}
              </h3>
              <button
                onClick={() => setEditSeatModal(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-stone-400">Nome do Cliente no Lugar (Opcional):</label>
                <input
                  type="text"
                  placeholder="Ex: Ana, João, Dr. Silva..."
                  value={seatNameInput}
                  onChange={(e) => setSeatNameInput(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-white mt-1"
                />
              </div>

              {/* Lista de Alergias e Restrições Cadastradas para o Lugar */}
              <div className="space-y-2">
                <label className="text-stone-300 font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  Alergias, Intolerâncias e Restrições:
                </label>

                {editSeatModal.allergies.length === 0 ? (
                  <div className="text-stone-500 italic text-[11px] p-2 bg-stone-950 rounded-lg border border-stone-850">
                    Nenhuma alergia registada para esta pessoa.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {editSeatModal.allergies.map((alg) => (
                      <div
                        key={alg.id}
                        className="p-2 rounded-lg bg-stone-950 border border-rose-900/60 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-rose-300 uppercase text-[10px] mr-1.5">
                            [{alg.type}]
                          </span>
                          <span className="text-white">{alg.name}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveAllergyFromSeat(alg.id)}
                          className="text-stone-500 hover:text-rose-400"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Adicionar Alergia */}
                <div className="flex gap-2 pt-1">
                  <select
                    value={newAllergyType}
                    onChange={(e) => setNewAllergyType(e.target.value as RestrictionType)}
                    className="bg-stone-950 border border-stone-700 rounded px-2 py-1 text-xs text-white"
                  >
                    <option value="alergia">Alergia Grave</option>
                    <option value="intolerancia">Intolerância</option>
                    <option value="restricao">Restrição Alimentar</option>
                    <option value="preferencia">Preferência</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Ex: Glúten, Lactose, Amendoim..."
                    value={newAllergyName}
                    onChange={(e) => setNewAllergyName(e.target.value)}
                    className="flex-1 bg-stone-950 border border-stone-700 rounded px-2 py-1 text-xs text-white"
                  />

                  <button
                    type="button"
                    onClick={handleAddAllergyToSeat}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setEditSeatModal(null)}
                className="px-3 py-1.5 bg-stone-800 text-stone-300 text-xs font-semibold rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveSeat}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg shadow-md"
              >
                Guardar Lugar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Transferir Item entre Lugares */}
      {transferItemModal && activeComanda && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4 text-stone-100">
            <h3 className="font-bold text-sm text-white">Transferir Item de Lugar</h3>
            <p className="text-xs text-stone-400">
              {transferItemModal.quantity}x {transferItemModal.productName}
            </p>

            <div>
              <label className="text-xs text-stone-400">Transferir para:</label>
              <select
                value={targetSeatForTransfer || ''}
                onChange={(e) =>
                  setTargetSeatForTransfer(e.target.value ? parseInt(e.target.value, 10) : undefined)
                }
                className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-xs text-white mt-1"
              >
                <option value="">Para partilhar</option>
                {activeComanda.seats.map((s) => (
                  <option key={s.seatNumber} value={s.seatNumber}>
                    Lugar {s.seatNumber}{s.name ? `: ${s.name}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
              <button
                onClick={() => setTransferItemModal(null)}
                className="px-3 py-1.5 bg-stone-800 text-stone-300 text-xs font-semibold rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmTransferItem}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Opções do Produto com Verificação de Alérgenos */}
      {productModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 text-stone-100">
            <div className="flex justify-between items-start border-b border-stone-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-white">{productModal.name}</h3>
                <p className="text-xs text-stone-400">{productModal.description}</p>
                <div className="text-[10px] text-amber-400 mt-1 font-semibold">
                  A associar ao:{' '}
                  {activeSeatNumber
                    ? activeSeatObj?.name || `Lugar ${activeSeatNumber}`
                    : 'Para partilhar'}
                </div>
              </div>
              <button
                onClick={() => setProductModal(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Aviso Obrigatório de Alérgenos se houver incompatibilidade */}
            {detectedAllergens.length > 0 && (
              <div className="p-3 bg-rose-950/80 border border-rose-700 rounded-xl space-y-2 text-xs text-rose-200">
                <div className="font-bold flex items-center gap-1.5 text-rose-300">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  Alerta de Incompatibilidade Alimentar!
                </div>
                <p>
                  O cliente deste lugar tem restrição a: <strong>{detectedAllergens.join(', ')}</strong>.
                  Este produto contém os ingredientes selecionados.
                </p>
                <label className="flex items-center gap-2 cursor-pointer pt-1 font-semibold text-white">
                  <input
                    type="checkbox"
                    checked={allergyWarningAck}
                    onChange={(e) => setAllergyWarningAck(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600"
                  />
                  <span>Confirmo que alertei o cliente e a cozinha sobre a alergia</span>
                </label>
              </div>
            )}

            {/* Variantes */}
            {productModal.variants.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-300">Tamanho / Opção:</label>
                <div className="grid grid-cols-2 gap-2">
                  {productModal.variants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setModalVariant(v)}
                      className={`p-2 rounded-lg text-xs font-semibold border text-left transition-all ${
                        modalVariant?.id === v.id
                          ? 'border-amber-500 bg-amber-500/20 text-white'
                          : 'border-stone-800 bg-stone-950 text-stone-400'
                      }`}
                    >
                      <div>{v.name}</div>
                      <div className="text-[10px] text-amber-400">
                        {v.priceDelta !== 0
                          ? `${v.priceDelta > 0 ? '+' : ''}${formatCurrency(v.priceDelta)}`
                          : 'Padrão'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Extras */}
            {productModal.extras.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-300">Extras / Acompanhamentos:</label>
                <div className="grid grid-cols-2 gap-2">
                  {productModal.extras.map((extra) => {
                    const isChecked = modalExtras.some((e) => e.id === extra.id);
                    return (
                      <button
                        key={extra.id}
                        onClick={() => {
                          if (isChecked) {
                            setModalExtras((prev) => prev.filter((e) => e.id !== extra.id));
                          } else {
                            setModalExtras((prev) => [...prev, extra]);
                          }
                        }}
                        className={`p-2 rounded-lg text-xs font-semibold border text-left transition-all flex items-center justify-between ${
                          isChecked
                            ? 'border-amber-500 bg-amber-500/20 text-white'
                            : 'border-stone-800 bg-stone-950 text-stone-400'
                        }`}
                      >
                        <span>{extra.name}</span>
                        <span className="text-[10px] text-amber-400">
                          +{formatCurrency(extra.priceDelta)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Observações */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-300">Observações para Cozinha / Bar:</label>
              <input
                type="text"
                placeholder="Ex: sem cebola, bem passado, sem gelo..."
                value={modalNotes}
                onChange={(e) => setModalNotes(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Quantidade & Confirmação */}
            <div className="flex items-center justify-between pt-2 border-t border-stone-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setModalQty((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-lg bg-stone-800 text-white font-bold flex items-center justify-center"
                >
                  -
                </button>
                <span className="font-mono text-sm font-bold px-2">{modalQty}</span>
                <button
                  onClick={() => setModalQty((q) => q + 1)}
                  className="w-8 h-8 rounded-lg bg-stone-800 text-white font-bold flex items-center justify-center"
                >
                  +
                </button>
              </div>

              <button
                onClick={handleAddProductToPendingCart}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md"
              >
                <Plus className="w-4 h-4" />
                Adicionar à Ronda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Repetir Itens (Requisito 11) */}
      {repeatModalOpen && activeComanda && (
        <RepeatItemsModal
          comanda={activeComanda}
          state={state}
          onClose={() => setRepeatModalOpen(false)}
        />
      )}

      {/* Modal QR Code da Mesa (Requisito 3) */}
      {qrModalTable && (
        <TableQRModal
          table={qrModalTable}
          onClose={() => setQrModalTable(null)}
          onSelectTab={onSelectTab}
        />
      )}

      {/* Modal Solicitar Conta */}
      {billModalOpen && activeComanda && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 text-stone-100">
            <div className="flex justify-between items-center border-b border-stone-800 pb-3">
              <h3 className="font-bold text-sm text-white">Solicitar Conta / Fechar Comanda</h3>
              <button
                onClick={() => setBillModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-stone-400">NIF do Cliente para Faturação:</label>
                <input
                  type="text"
                  maxLength={9}
                  value={customerNifInput}
                  onChange={(e) => {
                    setCustomerNifInput(e.target.value);
                    setNifError('');
                  }}
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-white font-mono mt-1"
                />
                {nifError && <p className="text-[10px] text-rose-400 mt-0.5">{nifError}</p>}
              </div>

              <div>
                <label className="text-stone-400">Nome do Cliente:</label>
                <input
                  type="text"
                  value={customerNameInput}
                  onChange={(e) => setCustomerNameInput(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-white mt-1"
                />
              </div>

              <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 space-y-1.5">
                <div className="flex justify-between text-stone-400">
                  <span>Mesa:</span>
                  <span className="font-bold text-white">{selectedTable?.number}</span>
                </div>
                <div className="flex justify-between text-stone-400">
                  <span>Total da Conta:</span>
                  <span className="font-bold text-amber-400 font-mono">
                    {formatCurrency(activeComanda.total)}
                  </span>
                </div>
                <div className="flex justify-between text-stone-400">
                  <span>Saldo por Pagar:</span>
                  <span className="font-bold text-rose-400 font-mono">
                    {formatCurrency(activeComanda.balanceDue)}
                  </span>
                </div>
              </div>

              {/* Informação / Controlo de Permissões de Pagamento */}
              {!settings.allowCashierInAtendimento ? (
                <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 text-[11px] text-stone-400 space-y-1">
                  <div className="font-bold text-amber-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                    Pagamentos Centralizados na Caixa
                  </div>
                  <p>
                    A confirmação direta de pagamento pelo Atendimento está desativada por padrão.
                    Ao confirmar, a mesa é marcada como "Conta Solicitada" e o pagamento é liquidado pelo operador de caixa/administrador.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-purple-950/40 rounded-xl border border-purple-800/60 text-xs space-y-2">
                  <div className="font-bold text-purple-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                    Recebimento Autorizado pelo Administrador
                  </div>
                  <label className="text-stone-300 text-[11px]">Método de Pagamento:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['cartao', 'numerario', 'mbway'] as PaymentMethod[]).map((m) => (
                      <button
                        type="button"
                        key={m}
                        onClick={() => setDirectPaymentMethod(m)}
                        className={`p-1.5 rounded-lg text-xs font-semibold border capitalize transition-all ${
                          directPaymentMethod === m
                            ? 'bg-purple-600 border-purple-500 text-white'
                            : 'bg-stone-900 border-stone-800 text-stone-400'
                        }`}
                      >
                        {m === 'cartao' ? 'Multibanco' : m === 'mbway' ? 'MB WAY' : 'Numerário'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
              <button
                onClick={() => setBillModalOpen(false)}
                className="px-3 py-1.5 bg-stone-800 text-stone-300 text-xs font-semibold rounded-lg"
              >
                Voltar
              </button>

              {settings.allowCashierInAtendimento && (
                <button
                  onClick={handleDirectPayment}
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md"
                >
                  <Check className="w-4 h-4" />
                  Liquidar no Atendimento
                </button>
              )}

              <button
                onClick={handleConfirmRequestBill}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md"
              >
                <Check className="w-4 h-4" />
                Solicitar à Caixa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Passagem de Turno */}
      <ShiftHandoverModal
        isOpen={shiftModalOpen}
        onClose={() => setShiftModalOpen(false)}
        state={state}
      />
    </div>
  );
};
