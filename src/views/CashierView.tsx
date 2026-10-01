import React, { useState } from 'react';
import {
  Wallet,
  DollarSign,
  CreditCard,
  Smartphone,
  Landmark,
  FileCheck2,
  Lock,
  Unlock,
  PlusCircle,
  MinusCircle,
  Receipt,
  CheckCircle2,
  Clock,
  Printer,
  X,
  Split,
  Percent,
  Users,
  Check,
  FilePlus,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import { AppState, store } from '../services/storage';
import { Comanda, PaymentMethod, CashSession, FiscalDocumentType, OrderItem } from '../types';
import { formatCurrency, formatTime, formatDateTime, validatePortugueseNIF } from '../utils/formatters';
import { AdHocInvoiceModal } from '../components/AdHocInvoiceModal';
import { ComandaInvoiceModal } from '../components/ComandaInvoiceModal';

interface CashierViewProps {
  state: AppState;
  onViewReceipt: (doc: any) => void;
  onSelectTab: (tab: any) => void;
}

export const CashierView: React.FC<CashierViewProps> = ({ state, onViewReceipt, onSelectTab }) => {
  const { comandas, cashSessions, currentCashSessionId, currentUser, settings, tables, sales } = state;

  const currentSession = cashSessions.find(
    (s) => s.id === currentCashSessionId && s.status === 'aberto'
  );

  // Comanda selecionada para pagamento
  const [selectedComandaId, setSelectedComandaId] = useState<string | null>(null);

  // Modo de pagamento: Conta Total ou Dividir por Lugar / Pessoa
  const [splitMode, setSplitMode] = useState<'total' | 'por_lugar'>('total');
  const [selectedSeatForSplit, setSelectedSeatForSplit] = useState<number | 'partilhar' | null>(1);
  const [selectedItemIdsForSeatPayment, setSelectedItemIdsForSeatPayment] = useState<string[]>([]);

  // Pagamento misto state
  const [paymentAmounts, setPaymentAmounts] = useState<Record<PaymentMethod, number>>({
    dinheiro: 0,
    cartao: 0,
    mbway: 0,
    transferencia: 0,
    cashback: 0,
    plano: 0,
    outro: 0,
  });
  const [cashReceivedAmount, setCashReceivedAmount] = useState<number>(0);
  const [discountInput, setDiscountInput] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>('');

  // Dados do cliente para faturação
  const [customerNif, setCustomerNif] = useState<string>('999999990');
  const [customerName, setCustomerName] = useState<string>('Consumidor Final');
  const [selectedDocType, setSelectedDocType] = useState<FiscalDocumentType>('FS');
  const [nifError, setNifError] = useState<string>('');

  // Modais de Sessão de Caixa
  const [openSessionModal, setOpenSessionModal] = useState(false);
  const [initialFloatInput, setInitialFloatInput] = useState(150.0);

  const [closeSessionModal, setCloseSessionModal] = useState(false);
  const [countedCashInput, setCountedCashInput] = useState<number>(0);
  const [closingNotesInput, setClosingNotesInput] = useState<string>('');

  const [movementModal, setMovementModal] = useState<'sangria' | 'suprimento' | null>(null);
  const [movementAmount, setMovementAmount] = useState<number>(20);
  const [movementReason, setMovementReason] = useState<string>('');

  // Modais de Faturação (Requisito 14)
  const [adHocModalOpen, setAdHocModalOpen] = useState(false);
  const [comandaInvoiceModalOpen, setComandaInvoiceModalOpen] = useState(false);

  // Comandas a aguardar pagamento
  const pendingComandas = comandas.filter(
    (c) => c.status === 'conta_solicitada' || c.status === 'a_aguardar_pagamento' || c.status === 'aberta'
  );

  const selectedComanda = comandas.find((c) => c.id === selectedComandaId);

  // Inicializa valores ao selecionar comanda
  const handleSelectComanda = (c: Comanda) => {
    setSelectedComandaId(c.id);
    const balance = c.balanceDue > 0 ? c.balanceDue : c.total - c.paidAmount;
    setPaymentAmounts({
      dinheiro: balance,
      cartao: 0,
      mbway: 0,
      transferencia: 0,
      cashback: 0,
      plano: 0,
      outro: 0,
    });
    setCashReceivedAmount(balance);
    setDiscountInput(c.discountAmount || 0);
    setDiscountReason(c.discountReason || '');
    setCustomerNif(c.customerNif || '999999990');
    setCustomerName(c.customerName || (c.customerNif === '999999990' ? 'Consumidor Final' : 'Cliente'));
    setNifError('');
    setSplitMode('total');
    setSelectedSeatForSplit(1);

    // Prepara itens não pagos do primeiro lugar
    const firstSeatItems = c.rounds
      .flatMap((r) => r.items)
      .filter((it) => it.status !== 'cancelado' && !it.isPaid && it.seatNumber === 1);
    setSelectedItemIdsForSeatPayment(firstSeatItems.map((it) => it.id));
  };

  const handleSelectSeat = (seatNum: number | 'partilhar') => {
    setSelectedSeatForSplit(seatNum);
    if (!selectedComanda) return;
    const seatObj = typeof seatNum === 'number' ? selectedComanda.seats.find((s) => s.seatNumber === seatNum) : null;
    const seatItems = selectedComanda.rounds
      .flatMap((r) => r.items)
      .filter((it) =>
        it.status !== 'cancelado' &&
        !it.isPaid &&
        (seatNum === 'partilhar' ? it.seatNumber === undefined : it.seatNumber === seatNum)
      );

    const ids = seatItems.map((it) => it.id);
    setSelectedItemIdsForSeatPayment(ids);
    const seatTotal = Math.round(seatItems.reduce((acc, it) => acc + it.totalItemPrice, 0) * 100) / 100;

    setPaymentAmounts({
      dinheiro: seatTotal,
      cartao: 0,
      mbway: 0,
      transferencia: 0,
      cashback: 0,
      plano: 0,
      outro: 0,
    });
    setCashReceivedAmount(seatTotal);

    if (seatObj?.name) {
      setCustomerName(seatObj.name);
    } else if (typeof seatNum === 'number') {
      setCustomerName(`Lugar ${seatNum}`);
    } else {
      setCustomerName('Consumidor Final');
    }
  };

  const handleToggleItemForPayment = (itemId: string) => {
    if (!selectedComanda) return;
    let nextIds: string[];
    if (selectedItemIdsForSeatPayment.includes(itemId)) {
      nextIds = selectedItemIdsForSeatPayment.filter((id) => id !== itemId);
    } else {
      nextIds = [...selectedItemIdsForSeatPayment, itemId];
    }
    setSelectedItemIdsForSeatPayment(nextIds);

    const allItems = selectedComanda.rounds.flatMap((r) => r.items);
    const computedTotal = Math.round(
      nextIds.reduce((sum, id) => {
        const it = allItems.find((i) => i.id === id);
        return sum + (it ? it.totalItemPrice : 0);
      }, 0) * 100
    ) / 100;

    setPaymentAmounts({
      dinheiro: computedTotal,
      cartao: 0,
      mbway: 0,
      transferencia: 0,
      cashback: 0,
      plano: 0,
      outro: 0,
    });
    setCashReceivedAmount(computedTotal);
  };

  // Processar pagamento
  const handleConfirmPayment = async () => {
    if (!selectedComanda) return;
    if (!currentSession) {
      alert('É necessário abrir a caixa antes de receber pagamentos');
      return;
    }

    // Validação NIF
    if (customerNif && customerNif !== '999999990') {
      const nifCheck = validatePortugueseNIF(customerNif);
      if (!nifCheck.valid) {
        setNifError(nifCheck.message || 'NIF inválido para Portugal');
        return;
      }
    }

    const paymentsToRegister = (
      Object.entries(paymentAmounts) as [PaymentMethod, number][]
    )
      .filter(([_, amt]) => amt > 0)
      .map(([method, amount]) => ({
        method,
        amount,
        receivedAmount: method === 'dinheiro' ? cashReceivedAmount : amount,
        seatNumber: splitMode === 'por_lugar' && typeof selectedSeatForSplit === 'number' ? selectedSeatForSplit : undefined,
      }));

    if (paymentsToRegister.length === 0) {
      alert('Introduza pelo menos um valor de pagamento válido');
      return;
    }

    try {
      if (splitMode === 'por_lugar') {
        if (selectedItemIdsForSeatPayment.length === 0) {
          alert('Selecione pelo menos um item para pagamento deste lugar');
          return;
        }

        const allItems = selectedComanda.rounds.flatMap((r) => r.items);
        const itemsToPay = allItems.filter((i) => selectedItemIdsForSeatPayment.includes(i.id));

        const result = store.registerPayment({
          comandaId: selectedComanda.id,
          payments: paymentsToRegister,
          user: currentUser,
          discountAmount: discountInput,
          discountReason,
          itemIds: selectedItemIdsForSeatPayment,
          seatNumber: typeof selectedSeatForSplit === 'number' ? selectedSeatForSplit : undefined,
        });

        // Emite Fatura Certificada para estes itens específicos do lugar
        const doc = await store.issueFiscalDocForSale({
          saleId: selectedComanda.saleId,
          docType: selectedDocType,
          customerNif,
          customerName,
          user: currentUser,
          items: itemsToPay,
          seatNumber: typeof selectedSeatForSplit === 'number' ? selectedSeatForSplit : undefined,
        });

        onViewReceipt(doc);

        if (result.isFullyPaid) {
          setSelectedComandaId(null);
        } else {
          // Atualiza dados na comanda atual
          const refreshedComanda = store.getState().comandas.find((c) => c.id === selectedComanda.id);
          if (refreshedComanda) {
            // Procura o próximo lugar com itens pendentes
            const nextUnpaidSeat = refreshedComanda.seats.find((s) =>
              refreshedComanda.rounds
                .flatMap((r) => r.items)
                .some((it) => it.seatNumber === s.seatNumber && !it.isPaid && it.status !== 'cancelado')
            );
            if (nextUnpaidSeat) {
              handleSelectSeat(nextUnpaidSeat.seatNumber);
            } else {
              handleSelectComanda(refreshedComanda);
            }
          }
        }
      } else {
        // Conta Completa
        const result = store.registerPayment({
          comandaId: selectedComanda.id,
          payments: paymentsToRegister,
          user: currentUser,
          discountAmount: discountInput,
          discountReason,
        });

        // Emite Fatura Certificada imediatamente se a conta ficou liquidada
        if (result.isFullyPaid) {
          const doc = await store.issueFiscalDocForSale({
            saleId: selectedComanda.saleId,
            docType: selectedDocType,
            customerNif,
            customerName,
            user: currentUser,
          });

          onViewReceipt(doc);
        }

        setSelectedComandaId(null);
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao processar pagamento');
    }
  };

  // Abrir Caixa
  const handleOpenCashSession = () => {
    try {
      store.openCashSession(initialFloatInput, currentUser);
      setOpenSessionModal(false);
    } catch (err: any) {
      alert(err.message || 'Erro ao abrir caixa');
    }
  };

  // Fechar Caixa
  const handleCloseCashSession = () => {
    if (!currentSession) return;
    try {
      store.closeCashSession({
        sessionId: currentSession.id,
        countedCash: countedCashInput,
        closingNotes: closingNotesInput,
        user: currentUser,
      });
      setCloseSessionModal(false);
    } catch (err: any) {
      alert(err.message || 'Erro ao fechar caixa');
    }
  };

  // Sangria ou Suprimento
  const handleAddMovement = () => {
    if (!currentSession || !movementModal) return;
    try {
      store.addCashMovement({
        sessionId: currentSession.id,
        type: movementModal,
        amount: movementAmount,
        reason: movementReason,
        user: currentUser,
      });
      setMovementModal(null);
      setMovementReason('');
    } catch (err: any) {
      alert(err.message || 'Erro ao registar movimento');
    }
  };

  const totalToPayNow = Object.values(paymentAmounts).reduce((acc, v) => acc + (v || 0), 0);
  const changeAmount = Math.max(0, cashReceivedAmount - (paymentAmounts.dinheiro || 0));

  return (
    <div className="space-y-4">
      {/* Barra de Estado do Caixa */}
      <div className="bg-stone-900/90 p-4 rounded-2xl border border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white">Operação de Caixa & Pagamentos</h1>
              {currentSession ? (
                <span className="text-[10px] bg-emerald-950/80 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-bold uppercase">
                  Caixa Aberto ({currentSession.id})
                </span>
              ) : (
                <span className="text-[10px] bg-rose-950/80 text-rose-400 border border-rose-800 px-2 py-0.5 rounded-full font-bold uppercase">
                  Caixa Fechado
                </span>
              )}
            </div>
            <div className="text-xs text-stone-400 mt-0.5">
              {currentSession
                ? `Aberto por ${currentSession.openedByName} às ${formatTime(currentSession.openedAt)} • Gaveta: ${formatCurrency(currentSession.currentFloat)}`
                : 'Abra a sessão de caixa para começar a receber'}
            </div>
          </div>
        </div>

        {/* Ações da Sessão de Caixa & Faturação Avulsa */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setAdHocModalOpen(true)}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md shadow-amber-950/40 transition-colors"
          >
            <FilePlus className="w-3.5 h-3.5" />
            Nova Fatura Avulsa
          </button>

          {currentSession ? (
            <>
              <button
                onClick={() => setMovementModal('suprimento')}
                className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold rounded-lg flex items-center gap-1 border border-stone-700"
              >
                <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                Suprimento
              </button>
              <button
                onClick={() => setMovementModal('sangria')}
                className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold rounded-lg flex items-center gap-1 border border-stone-700"
              >
                <MinusCircle className="w-3.5 h-3.5 text-rose-400" />
                Sangria
              </button>
              <button
                onClick={() => {
                  setCountedCashInput(currentSession.currentFloat);
                  setCloseSessionModal(true);
                }}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md"
              >
                <Lock className="w-3.5 h-3.5" />
                Fechar Caixa (Z-Report)
              </button>
            </>
          ) : (
            <button
              onClick={() => setOpenSessionModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-lg"
            >
              <Unlock className="w-4 h-4" />
              Abrir Caixa
            </button>
          )}
        </div>
      </div>

      {/* Conteúdo Principal do Caixa */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Coluna Esquerda: Fila de Comandas / Contas Solicitadas (5 cols) */}
        <div className="lg:col-span-5 bg-stone-900 rounded-2xl border border-stone-800 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-stone-800 pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-500" />
              Comandas Pendentes de Recebimento
            </h2>
            <span className="text-xs font-mono text-stone-400 font-bold">
              {pendingComandas.length}
            </span>
          </div>

          {pendingComandas.length === 0 ? (
            <div className="text-center py-12 text-stone-500 text-xs">
              Nenhuma conta pendente para pagamento no momento.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {pendingComandas.map((cmd) => {
                const isSelected = selectedComandaId === cmd.id;
                const isRequested = cmd.status === 'conta_solicitada';

                return (
                  <div
                    key={cmd.id}
                    onClick={() => handleSelectComanda(cmd)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/15 shadow-md shadow-amber-950/30'
                        : isRequested
                        ? 'border-orange-500/80 bg-stone-950 animate-pulse'
                        : 'border-stone-800 bg-stone-950/60 hover:bg-stone-800/40'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-extrabold text-sm text-white flex items-center gap-2">
                          <span>{cmd.tableName}</span>
                          <span className="text-xs font-normal text-stone-400">
                            ({cmd.roomName})
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-400 mt-0.5">
                          {cmd.numberDisplay} • {cmd.waiterName} • {cmd.guestCount} pax
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-bold text-sm text-amber-400">
                          {formatCurrency(cmd.balanceDue > 0 ? cmd.balanceDue : cmd.total)}
                        </div>
                        <span
                          className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded ${
                            isRequested
                              ? 'bg-orange-500 text-white font-extrabold'
                              : 'bg-stone-800 text-stone-300'
                          }`}
                        >
                          {cmd.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Coluna Direita: Painel de Pagamento e Faturação (7 cols) */}
        <div className="lg:col-span-7 bg-stone-900 rounded-2xl border border-stone-800 p-5 space-y-5">
          {!selectedComanda ? (
            <div className="text-center py-16 text-stone-500 text-xs">
              Selecione uma comanda à esquerda para registar o pagamento e emitir a fatura certificada.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header da Conta Selecionada */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-800 pb-3 gap-2">
                <div>
                  <div className="font-extrabold text-base text-white flex items-center gap-2">
                    <span>Conta: {selectedComanda.tableName}</span>
                    <span className="text-xs font-normal text-stone-400">
                      ({selectedComanda.roomName})
                    </span>
                    {/* Badge do Estado de Faturação */}
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        selectedComanda.fiscalStatus === 'faturado'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : selectedComanda.fiscalStatus === 'parcialmente_faturado'
                          ? 'bg-blue-950 text-blue-400 border border-blue-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}
                    >
                      {selectedComanda.fiscalStatus === 'faturado'
                        ? 'Faturado'
                        : selectedComanda.fiscalStatus === 'parcialmente_faturado'
                        ? 'Parcialmente Faturado'
                        : 'Por Faturar'}
                    </span>
                  </div>
                  <div className="text-xs text-stone-400 mt-0.5">
                    Comanda {selectedComanda.numberDisplay} • Empregado: {selectedComanda.waiterName}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setComandaInvoiceModalOpen(true)}
                    className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Receipt className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      {selectedComanda.fiscalStatus === 'faturado'
                        ? 'Ver / Reenviar Fatura'
                        : 'Emitir Fatura'}
                    </span>
                  </button>

                  <div className="text-right">
                    <div className="text-xs text-stone-400">Saldo por Liquidar</div>
                    <div className="font-mono text-xl font-extrabold text-amber-400">
                      {formatCurrency(selectedComanda.balanceDue)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Seletor de Modo: Conta Completa vs Divisão por Lugar / Pessoa */}
              <div className="flex items-center gap-2 p-1.5 bg-stone-950 rounded-xl border border-stone-800">
                <button
                  type="button"
                  onClick={() => {
                    setSplitMode('total');
                    handleSelectComanda(selectedComanda);
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    splitMode === 'total'
                      ? 'bg-amber-600 text-white shadow'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  Conta Completa ({formatCurrency(selectedComanda.balanceDue)})
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSplitMode('por_lugar');
                    handleSelectSeat(1);
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    splitMode === 'por_lugar'
                      ? 'bg-amber-600 text-white shadow'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  Dividir por Lugar / Pessoa
                </button>
              </div>

              {/* Painel de Seleção de Lugares e Itens Individuais (Requisito 1) */}
              {splitMode === 'por_lugar' && (
                <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-stone-200 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-amber-500" />
                      Selecione o Lugar para Liquidar:
                    </span>
                    <span className="text-[11px] text-stone-400">
                      {selectedItemIdsForSeatPayment.length} item(ns) selecionado(s)
                    </span>
                  </div>

                  {/* Abas dos Lugares */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    {selectedComanda.seats.map((seat) => {
                      const isSelected = selectedSeatForSplit === seat.seatNumber;
                      const seatItems = selectedComanda.rounds
                        .flatMap((r) => r.items)
                        .filter((it) => it.status !== 'cancelado' && it.seatNumber === seat.seatNumber);
                      const isAllPaid = seatItems.length > 0 && seatItems.every((it) => it.isPaid);

                      return (
                        <button
                          key={seat.seatNumber}
                          type="button"
                          onClick={() => handleSelectSeat(seat.seatNumber)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-amber-600 border-amber-500 text-white shadow'
                              : isAllPaid
                              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                              : 'bg-stone-900 border-stone-800 text-stone-300 hover:text-white'
                          }`}
                        >
                          <span>Lugar {seat.seatNumber}</span>
                          {seat.name && <span className="font-bold">({seat.name})</span>}
                          {isAllPaid && <Check className="w-3 h-3 text-emerald-400" />}
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => handleSelectSeat('partilhar')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                        selectedSeatForSplit === 'partilhar'
                          ? 'bg-purple-600 border-purple-500 text-white shadow'
                          : 'bg-stone-900 border-stone-800 text-stone-300 hover:text-white'
                      }`}
                    >
                      Para Partilhar
                    </button>
                  </div>

                  {/* Lista de Itens do Lugar com Proteção Anti-Cobrança Dupla */}
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {selectedComanda.rounds
                      .flatMap((r) => r.items)
                      .filter((it) =>
                        it.status !== 'cancelado' &&
                        (selectedSeatForSplit === 'partilhar'
                          ? it.seatNumber === undefined
                          : it.seatNumber === selectedSeatForSplit)
                      )
                      .map((it) => {
                        const isPaid = !!it.isPaid;
                        const isChecked = selectedItemIdsForSeatPayment.includes(it.id);

                        return (
                          <div
                            key={it.id}
                            onClick={() => !isPaid && handleToggleItemForPayment(it.id)}
                            className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                              isPaid
                                ? 'bg-emerald-950/20 border-emerald-800/40 opacity-70 cursor-not-allowed'
                                : isChecked
                                ? 'bg-amber-950/30 border-amber-600/80 cursor-pointer'
                                : 'bg-stone-900/60 border-stone-800 cursor-pointer hover:bg-stone-850'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                disabled={isPaid}
                                checked={isPaid || isChecked}
                                onChange={() => !isPaid && handleToggleItemForPayment(it.id)}
                                className="w-3.5 h-3.5 rounded text-amber-500 cursor-pointer"
                              />
                              <div>
                                <span className={`font-semibold ${isPaid ? 'line-through text-stone-400' : 'text-white'}`}>
                                  {it.quantity}x {it.productName}
                                </span>
                                {it.selectedVariant && (
                                  <span className="text-[10px] text-stone-400 ml-1.5">
                                    ({it.selectedVariant.name})
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {isPaid ? (
                                <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700 px-1.5 py-0.5 rounded font-bold">
                                  ✓ Liquidado
                                </span>
                              ) : (
                                <span className="font-mono font-bold text-amber-400">
                                  {formatCurrency(it.totalItemPrice)}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Informação Legal de Não-Cobrança Dupla */}
                  <div className="text-[10px] text-stone-400 flex items-center gap-1 pt-1 border-t border-stone-800/80">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span>Os itens já faturados ficam bloqueados contra duplicidade de cobrança.</span>
                  </div>
                </div>
              )}

              {/* Formas de Pagamento e Valores Mistos */}
              <div className="space-y-3 bg-stone-950 p-4 rounded-xl border border-stone-800">
                <div className="flex items-center justify-between text-xs font-bold text-stone-200">
                  <span>Distribuição do Pagamento (Suporta Pagamentos Mistos)</span>
                  <span className="font-mono text-amber-400">
                    Total: {formatCurrency(totalToPayNow)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Dinheiro */}
                  <div className="bg-stone-900 p-2.5 rounded-lg border border-stone-800 space-y-1">
                    <label className="text-xs text-stone-300 font-semibold flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                      Dinheiro (€):
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={paymentAmounts.dinheiro || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setPaymentAmounts((prev) => ({ ...prev, dinheiro: val }));
                        setCashReceivedAmount(val);
                      }}
                      className="w-full bg-stone-950 border border-stone-700 rounded px-2.5 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-amber-500"
                    />

                    {paymentAmounts.dinheiro > 0 && (
                      <div className="pt-1.5 border-t border-stone-800/80 space-y-1 text-[11px]">
                        <div className="flex justify-between text-stone-400">
                          <span>Valor Entregue pelo Cliente:</span>
                          <input
                            type="number"
                            step="0.01"
                            value={cashReceivedAmount || ''}
                            onChange={(e) => setCashReceivedAmount(parseFloat(e.target.value) || 0)}
                            className="w-20 bg-stone-950 border border-stone-700 rounded px-1.5 py-0.5 text-right font-mono text-xs text-white"
                          />
                        </div>
                        <div className="flex justify-between font-bold text-emerald-400">
                          <span>Troco a Devolver:</span>
                          <span className="font-mono">{formatCurrency(changeAmount)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cartão de Débito / Crédito */}
                  <div className="bg-stone-900 p-2.5 rounded-lg border border-stone-800 space-y-1">
                    <label className="text-xs text-stone-300 font-semibold flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
                      Cartão (€):
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={paymentAmounts.cartao || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setPaymentAmounts((prev) => ({ ...prev, cartao: val }));
                      }}
                      className="w-full bg-stone-950 border border-stone-700 rounded px-2.5 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* MB Way */}
                  <div className="bg-stone-900 p-2.5 rounded-lg border border-stone-800 space-y-1">
                    <label className="text-xs text-stone-300 font-semibold flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-rose-400" />
                      MB Way (€):
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={paymentAmounts.mbway || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setPaymentAmounts((prev) => ({ ...prev, mbway: val }));
                      }}
                      className="w-full bg-stone-950 border border-stone-700 rounded px-2.5 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Transferência Bancária */}
                  <div className="bg-stone-900 p-2.5 rounded-lg border border-stone-800 space-y-1">
                    <label className="text-xs text-stone-300 font-semibold flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5 text-amber-400" />
                      Transferência (€):
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={paymentAmounts.transferencia || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setPaymentAmounts((prev) => ({ ...prev, transferencia: val }));
                      }}
                      className="w-full bg-stone-950 border border-stone-700 rounded px-2.5 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Dados do Cliente e Documento Fiscal */}
              <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-stone-200">
                  <span className="flex items-center gap-1.5">
                    <FileCheck2 className="w-4 h-4 text-emerald-400" />
                    Emissão de Documento Fiscal Certificado (AT)
                  </span>
                  <span className="text-[10px] text-stone-400 font-mono">Vendus API</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-stone-400">Tipo de Documento:</label>
                    <select
                      value={selectedDocType}
                      onChange={(e) => setSelectedDocType(e.target.value as FiscalDocumentType)}
                      className="w-full bg-stone-900 border border-stone-700 rounded px-2.5 py-1.5 text-xs text-white mt-1"
                    >
                      <option value="FS">Fatura Simplificada (FS)</option>
                      <option value="FT">Fatura (FT)</option>
                      <option value="FR">Fatura-Recibo (FR)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-stone-400">NIF do Adquirente:</label>
                    <input
                      type="text"
                      maxLength={9}
                      value={customerNif}
                      onChange={(e) => {
                        setCustomerNif(e.target.value);
                        setNifError('');
                      }}
                      className="w-full bg-stone-900 border border-stone-700 rounded px-2.5 py-1.5 text-xs font-mono text-white mt-1"
                    />
                    {nifError && <p className="text-[9px] text-rose-400 mt-0.5">{nifError}</p>}
                  </div>

                  <div>
                    <label className="text-[11px] text-stone-400">Nome do Cliente:</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-700 rounded px-2.5 py-1.5 text-xs text-white mt-1"
                    />
                  </div>
                </div>
              </div>

              {/* Botão de Confirmação Final do Pagamento */}
              <button
                onClick={handleConfirmPayment}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-extrabold rounded-xl shadow-xl transition-all active:scale-98 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                Confirmar Pagamento e Emitir Documento Fiscal
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal Abertura de Caixa */}
      {openSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 text-stone-100">
            <h3 className="font-bold text-sm text-white">Abertura de Caixa (Novo Turno)</h3>
            <p className="text-xs text-stone-400">
              Operador: <strong className="text-white">{currentUser.name}</strong>
            </p>

            <div>
              <label className="text-xs text-stone-400">Fundo de Maneio Inicial (€):</label>
              <input
                type="number"
                step="0.01"
                min={0}
                value={initialFloatInput}
                onChange={(e) => setInitialFloatInput(parseFloat(e.target.value) || 0)}
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-base font-mono text-white mt-1"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
              <button
                onClick={() => setOpenSessionModal(false)}
                className="px-3 py-1.5 bg-stone-800 text-stone-300 text-xs font-semibold rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleOpenCashSession}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg"
              >
                Confirmar Abertura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Fecho de Caixa (Z-Report) */}
      {closeSessionModal && currentSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 text-stone-100">
            <h3 className="font-bold text-sm text-white">Fecho de Caixa (Z-Report)</h3>
            <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-stone-400">
                <span>Fundo Inicial:</span>
                <span className="font-mono">{formatCurrency(currentSession.initialFloat)}</span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>Vendas em Dinheiro:</span>
                <span className="font-mono">{formatCurrency(currentSession.expectedTotals.dinheiro)}</span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>Vendas em Cartão:</span>
                <span className="font-mono">{formatCurrency(currentSession.expectedTotals.cartao)}</span>
              </div>
              <div className="flex justify-between font-bold text-white pt-1 border-t border-stone-800">
                <span>Valor Esperado na Gaveta:</span>
                <span className="font-mono text-amber-400">
                  {formatCurrency(currentSession.currentFloat)}
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs text-stone-400">Contagem Física de Dinheiro em Caixa (€):</label>
              <input
                type="number"
                step="0.01"
                value={countedCashInput}
                onChange={(e) => setCountedCashInput(parseFloat(e.target.value) || 0)}
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-base font-mono text-white mt-1"
              />
              <div className="text-[11px] text-stone-400 mt-1 flex justify-between">
                <span>Diferença apurada:</span>
                <span
                  className={`font-mono font-bold ${
                    countedCashInput - currentSession.currentFloat === 0
                      ? 'text-emerald-400'
                      : countedCashInput - currentSession.currentFloat > 0
                      ? 'text-cyan-400'
                      : 'text-rose-400'
                  }`}
                >
                  {formatCurrency(countedCashInput - currentSession.currentFloat)}
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs text-stone-400">Observações do Fecho:</label>
              <input
                type="text"
                placeholder="Ex: Turno encerrado sem ocorrências..."
                value={closingNotesInput}
                onChange={(e) => setClosingNotesInput(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-white mt-1"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
              <button
                onClick={() => setCloseSessionModal(false)}
                className="px-3 py-1.5 bg-stone-800 text-stone-300 text-xs font-semibold rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleCloseCashSession}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg shadow-md"
              >
                Encerrar Caixa Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Sangria / Suprimento */}
      {movementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 text-stone-100">
            <h3 className="font-bold text-sm text-white">
              Registar {movementModal === 'sangria' ? 'Sangria (Saída)' : 'Suprimento (Entrada)'}
            </h3>

            <div>
              <label className="text-xs text-stone-400">Valor (€):</label>
              <input
                type="number"
                step="0.01"
                min={0.01}
                value={movementAmount}
                onChange={(e) => setMovementAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-sm font-mono text-white mt-1"
              />
            </div>

            <div>
              <label className="text-xs text-stone-400">Motivo Obrigatório:</label>
              <input
                type="text"
                required
                placeholder="Ex: Pagamento de compras urgentes, reforço de trocos..."
                value={movementReason}
                onChange={(e) => setMovementReason(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-white mt-1"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
              <button
                onClick={() => setMovementModal(null)}
                className="px-3 py-1.5 bg-stone-800 text-stone-300 text-xs font-semibold rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddMovement}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg shadow-md"
              >
                Confirmar Movimento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Fatura Avulsa (Requisito 14) */}
      <AdHocInvoiceModal
        isOpen={adHocModalOpen}
        onClose={() => setAdHocModalOpen(false)}
        state={state}
        onViewReceipt={onViewReceipt}
      />

      {/* Modal Fatura da Comanda da Mesa (Requisito 14) */}
      <ComandaInvoiceModal
        isOpen={comandaInvoiceModalOpen}
        onClose={() => setComandaInvoiceModalOpen(false)}
        comanda={selectedComanda || null}
        state={state}
        onViewReceipt={onViewReceipt}
      />
    </div>
  );
};
