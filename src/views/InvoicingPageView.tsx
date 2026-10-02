/**
 * Sabores & Nações - Módulo Dedicado de Faturação e Emissão de Notas
 * Emissão Certificada (Vendus / AT), Faturação de Vendas, Comandas, Pedidos do Site e Faturas Avulsas
 * Totalmente integrado em tempo real com Atendimento, Caixa, Cozinha, Bar e Admin
 */

import React, { useState, useMemo } from 'react';
import {
  FileCheck2,
  FilePlus,
  Search,
  Filter,
  Printer,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  Eye,
  Download,
  Calendar,
  Layers,
  CheckCircle2,
  Send,
  MessageCircle,
  Mail,
  Clock,
  Ban,
  DollarSign,
  CreditCard,
  Banknote,
  Receipt,
  UserCheck,
  RefreshCw,
  Share2,
  Globe,
  Utensils,
  ExternalLink,
  ChevronRight,
  X,
  FileText,
} from 'lucide-react';
import { AppState, store } from '../services/storage';
import {
  FiscalDocument,
  FiscalDocumentType,
  Sale,
  OrderItem,
  InvoiceDispatchLog,
  User,
} from '../types';
import {
  formatCurrency,
  formatDateTime,
  formatTime,
  validatePortugueseNIF,
} from '../utils/formatters';
import { AdHocInvoiceModal } from '../components/AdHocInvoiceModal';
import { ReceiptModal } from '../components/ReceiptModal';

interface InvoicingPageViewProps {
  state: AppState;
  onViewReceipt?: (doc: FiscalDocument) => void;
  onSwitchModule?: (mod: any) => void;
}

export type InvoicingTab = 'pendentes' | 'emitidos' | 'parciais' | 'falhas' | 'historico_envios';

export const InvoicingPageView: React.FC<InvoicingPageViewProps> = ({
  state,
  onViewReceipt,
  onSwitchModule,
}) => {
  const { fiscalDocuments, sales, comandas, currentUser, settings, onlineOrders } = state;

  // Abas e Filtros
  const [activeTab, setActiveTab] = useState<InvoicingTab>('pendentes');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'todos' | FiscalDocumentType>('todos');
  const [originFilter, setOriginFilter] = useState<'todas' | 'mesas' | 'site' | 'avulso'>('todas');
  const [periodFilter, setPeriodFilter] = useState<'todos' | 'hoje' | 'semana' | 'mes'>('todos');

  // Modais
  const [adHocModalOpen, setAdHocModalOpen] = useState(false);
  const [activeReceiptDoc, setActiveReceiptDoc] = useState<FiscalDocument | null>(null);

  // Modal de Emissão a partir de Venda
  const [issueModalSale, setIssueModalSale] = useState<Sale | null>(null);
  const [issueDocType, setIssueDocType] = useState<FiscalDocumentType>('FS');
  const [issueCustomerName, setIssueCustomerName] = useState('');
  const [issueCustomerNif, setIssueCustomerNif] = useState('');
  const [issueCustomerAddress, setIssueCustomerAddress] = useState('');
  const [issueNifError, setIssueNifError] = useState<string | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);

  // Modal de Nota de Crédito (Retificação)
  const [rectifyModalDoc, setRectifyModalDoc] = useState<FiscalDocument | null>(null);
  const [rectifyReasonInput, setRectifyReasonInput] = useState('');
  const [isProcessingNC, setIsProcessingNC] = useState(false);

  // 1. Métricas Financeiras e Fiscais Rigorosamente Separadas
  const metrics = useMemo(() => {
    // Total Vendido
    const totalSold = sales.reduce((acc, s) => acc + s.total, 0);

    // Total Efetivamente Cobrado / Pago
    const totalPaid = sales.reduce((acc, s) => acc + s.paidAmount, 0);

    // Total Faturado em Documentos Certificados (Exclui documentos cancelados por retificação)
    const validFiscalDocs = fiscalDocuments.filter(
      (d) => d.status !== 'cancelada_por_retificacao' && d.type !== 'NC'
    );
    const totalInvoiced = validFiscalDocs.reduce((acc, d) => acc + d.grossTotal, 0);

    // Total de Notas de Crédito
    const creditNotes = fiscalDocuments.filter((d) => d.type === 'NC');
    const totalCreditNotes = creditNotes.reduce((acc, d) => acc + d.grossTotal, 0);

    // Vendas Pendentes de Faturação
    const pendingSales = sales.filter((s) => s.fiscalStatus === 'por_faturar' || s.fiscalStatus === 'pendente' || !s.documentId);
    const partiallyInvoicedSales = sales.filter((s) => s.fiscalStatus === 'parcialmente_faturado');

    return {
      totalSold,
      totalPaid,
      totalInvoiced,
      totalCreditNotes,
      netInvoiced: totalInvoiced - totalCreditNotes,
      pendingCount: pendingSales.length,
      partialCount: partiallyInvoicedSales.length,
      totalDocsCount: fiscalDocuments.length,
    };
  }, [sales, fiscalDocuments]);

  // 2. Filtragem de Vendas Pendentes
  const filteredPendingSales = useMemo(() => {
    return sales.filter((sale) => {
      // Exclui vendas totalmente faturadas
      const isAlreadyInvoiced = sale.documentId && sale.fiscalStatus !== 'por_faturar' && sale.fiscalStatus !== 'pendente' && sale.fiscalStatus !== 'parcialmente_faturado';
      if (isAlreadyInvoiced) return false;

      // Filtro de Origem
      if (originFilter === 'mesas' && (sale.tableId === 'balcao' || sale.tableId === 'site-delivery' || sale.tableId.startsWith('site-'))) return false;
      if (originFilter === 'site' && !sale.tableId.startsWith('site-') && sale.tableId !== 'site-delivery') return false;
      if (originFilter === 'avulso' && sale.tableId !== 'balcao' && !sale.tableId.startsWith('avulso')) return false;

      // Filtro de Pesquisa
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTable = sale.tableName.toLowerCase().includes(q);
        const matchId = sale.id.toLowerCase().includes(q);
        const matchWaiter = sale.waiterName.toLowerCase().includes(q);
        const matchCustomer = (sale.customerName || '').toLowerCase().includes(q);
        const matchNif = (sale.customerNif || '').includes(q);
        if (!matchTable && !matchId && !matchWaiter && !matchCustomer && !matchNif) return false;
      }

      return true;
    });
  }, [sales, originFilter, searchQuery]);

  // 3. Filtragem de Documentos Emitidos
  const filteredDocs = useMemo(() => {
    return fiscalDocuments.filter((doc) => {
      // Filtro por Tipo de Documento
      if (typeFilter !== 'todos' && doc.type !== typeFilter) return false;

      // Filtro por Período
      if (periodFilter !== 'todos') {
        const docDate = new Date(doc.issuedAt);
        const now = new Date();
        if (periodFilter === 'hoje') {
          if (docDate.toDateString() !== now.toDateString()) return false;
        } else if (periodFilter === 'semana') {
          const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (docDate < oneWeekAgo) return false;
        } else if (periodFilter === 'mes') {
          if (docDate.getMonth() !== now.getMonth() || docDate.getFullYear() !== now.getFullYear()) return false;
        }
      }

      // Filtro de Pesquisa
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSeries = doc.series.toLowerCase().includes(q);
        const matchAtcud = doc.atcud.toLowerCase().includes(q);
        const matchCustomer = doc.customerName.toLowerCase().includes(q);
        const matchNif = doc.customerNif.includes(q);
        const matchSale = doc.saleId.toLowerCase().includes(q);
        if (!matchSeries && !matchAtcud && !matchCustomer && !matchNif && !matchSale) return false;
      }

      return true;
    });
  }, [fiscalDocuments, typeFilter, periodFilter, searchQuery]);

  // 4. Histórico Consolidado de Envios (E-mail e WhatsApp)
  const allDispatchLogs = useMemo(() => {
    const logs: (InvoiceDispatchLog & { docSeries: string; docId: string; customerName: string; grossTotal: number })[] = [];
    fiscalDocuments.forEach((doc) => {
      if (doc.dispatchLogs && doc.dispatchLogs.length > 0) {
        doc.dispatchLogs.forEach((l) => {
          logs.push({
            ...l,
            docSeries: doc.series,
            docId: doc.id,
            customerName: doc.customerName,
            grossTotal: doc.grossTotal,
          });
        });
      }
    });
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return logs;
  }, [fiscalDocuments]);

  // Preparar Modal de Emissão para uma Venda
  const handleOpenIssueModal = (sale: Sale) => {
    setIssueModalSale(sale);
    setIssueCustomerName(sale.customerName || 'Consumidor Final');
    setIssueCustomerNif(sale.customerNif || '999999990');
    setIssueCustomerAddress(sale.customerAddress || '');
    setIssueNifError(null);
    setIssueDocType(sale.total <= 100 ? 'FS' : 'FR');
    // Por padrão seleciona todos os itens da venda
    setSelectedItemIds(sale.items.map((i) => i.id));
  };

  // Validar NIF ao digitar
  const handleNifChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 9);
    setIssueCustomerNif(clean);
    if (clean.length === 9) {
      const res = validatePortugueseNIF(clean);
      setIssueNifError(res.valid ? null : res.message || 'NIF inválido');
    } else if (clean.length > 0) {
      setIssueNifError('O NIF deve conter 9 dígitos');
    } else {
      setIssueNifError(null);
    }
  };

  // Confirmar Emissão do Documento
  const handleConfirmIssueDocument = async () => {
    if (!issueModalSale || isSubmittingIssue) return;

    if (issueNifError) {
      alert(`Por favor corrija o NIF: ${issueNifError}`);
      return;
    }

    // Se o NIF não for consumidor final e o nome estiver vazio
    if (issueCustomerNif && issueCustomerNif !== '999999990' && (!issueCustomerName || issueCustomerName.trim() === 'Consumidor Final')) {
      alert('Para emissão com NIF de contribuinte, é obrigatório preencher o Nome do Cliente ou Empresa.');
      return;
    }

    if (selectedItemIds.length === 0) {
      alert('Selecione pelo menos um item para faturar.');
      return;
    }

    setIsSubmittingIssue(true);
    try {
      const selectedItems = issueModalSale.items.filter((i) => selectedItemIds.includes(i.id));

      const isPartial = selectedItems.length < issueModalSale.items.length;

      const doc = await store.issueFiscalDocForSale({
        saleId: issueModalSale.id,
        docType: issueDocType,
        customerNif: issueCustomerNif || '999999990',
        customerName: issueCustomerName || 'Consumidor Final',
        customerAddress: issueCustomerAddress,
        user: currentUser,
        items: isPartial ? selectedItems : undefined,
      });

      setIssueModalSale(null);
      // Abrir recibo imediatamente
      setActiveReceiptDoc(doc);
      if (onViewReceipt) onViewReceipt(doc);
    } catch (err: any) {
      alert(err.message || 'Erro ao emitir documento fiscal');
    } finally {
      setIsSubmittingIssue(false);
    }
  };

  // Emissão de Nota de Crédito
  const handleIssueCreditNote = async () => {
    if (!rectifyModalDoc || !rectifyReasonInput.trim()) return;

    if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
      alert('A emissão de Nota de Crédito requer permissão de Gerente ou Administrador.');
      return;
    }

    setIsProcessingNC(true);
    try {
      const nc = await store.rectifyDocumentWithCreditNote(
        rectifyModalDoc.id,
        rectifyReasonInput,
        currentUser
      );
      setRectifyModalDoc(null);
      setRectifyReasonInput('');
      setActiveReceiptDoc(nc);
      if (onViewReceipt) onViewReceipt(nc);
    } catch (err: any) {
      alert(err.message || 'Erro ao emitir nota de crédito');
    } finally {
      setIsProcessingNC(false);
    }
  };

  // Exportar Relatório CSV de Faturação
  const handleExportCsv = () => {
    const headers =
      'Série;Tipo;ATCUD;Data/Hora;NIF Cliente;Nome Cliente;Base Incidência;Total IVA;Total Bruto;Estado;Operador\n';
    const rows = fiscalDocuments
      .map(
        (d) =>
          `"${d.series}";"${d.type}";"${d.atcud}";"${formatDateTime(d.issuedAt)}";"${d.customerNif}";"${d.customerName}";"${d.subtotal.toFixed(
            2
          )}";"${d.taxTotal.toFixed(2)}";"${d.grossTotal.toFixed(2)}";"${d.status}";"${d.operatorName}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `Faturacao_Sabores_Nacoes_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const handleOpenDocReceipt = (doc: FiscalDocument) => {
    setActiveReceiptDoc(doc);
    if (onViewReceipt) onViewReceipt(doc);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Top Banner de Faturação e Conformidade Fiscal */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-900/95 to-emerald-950/40 border border-stone-800 rounded-3xl p-4 md:p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
            <FileCheck2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
                Faturação e Emissão de Notas
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                {settings.vendusApiKey ? (settings.vendusTestMode ? 'Vendus Testes (AT)' : 'Vendus Produção') : 'Software Certificado AT'}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700 font-mono">
                Série 2026
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              Conformidade Autoridade Tributária (AT) • QR Code & ATCUD Válidos • Operador: <strong className="text-stone-200">{currentUser.name}</strong>
            </p>
          </div>
        </div>

        {/* Ações Primárias */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setAdHocModalOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs rounded-2xl shadow-lg shadow-orange-950/40 flex items-center gap-2 transition-all active:scale-95"
          >
            <FilePlus className="w-4 h-4" />
            <span>Criar Fatura Avulsa</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2.5 bg-stone-900 hover:bg-stone-800 text-stone-200 font-semibold text-xs rounded-2xl border border-stone-800 shadow-sm flex items-center gap-1.5 transition-all"
            title="Exportar documentos em CSV para contabilidade"
          >
            <Download className="w-4 h-4 text-stone-400" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Cartões de Métricas Financeiras e Fiscais Rigorosamente Separadas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Total Faturado */}
        <div className="bg-stone-900 border border-stone-800/80 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span>Total Faturado Líquido</span>
            <Receipt className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl md:text-2xl font-black text-emerald-400 font-mono">
              {formatCurrency(metrics.netInvoiced)}
            </div>
            <div className="text-[11px] text-stone-400 mt-0.5">
              {metrics.totalDocsCount} documentos emitidos
            </div>
          </div>
        </div>

        {/* Total Vendido (Volume de Negócios) */}
        <div className="bg-stone-900 border border-stone-800/80 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span>Total Vendido (POS)</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl md:text-2xl font-black text-white font-mono">
              {formatCurrency(metrics.totalSold)}
            </div>
            <div className="text-[11px] text-stone-400 mt-0.5">
              Volume total de vendas registadas
            </div>
          </div>
        </div>

        {/* Total Recebido / Cobrado */}
        <div className="bg-stone-900 border border-stone-800/80 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span>Total Recebido no Caixa</span>
            <Banknote className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl md:text-2xl font-black text-cyan-400 font-mono">
              {formatCurrency(metrics.totalPaid)}
            </div>
            <div className="text-[11px] text-stone-400 mt-0.5">
              Recebimentos em cartão, numerário e MB WAY
            </div>
          </div>
        </div>

        {/* Vendas Pendentes de Faturação */}
        <div className="bg-stone-900 border border-stone-800/80 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span>Pendentes de Emissão</span>
            <Clock className="w-4 h-4 text-orange-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl md:text-2xl font-black text-orange-400 font-mono">
              {metrics.pendingCount}
            </div>
            <div className="text-[11px] text-stone-400 mt-0.5">
              {metrics.partialCount > 0 ? `${metrics.partialCount} parcialmente faturadas` : 'Aguardando fatura'}
            </div>
          </div>
        </div>
      </div>

      {/* Abas e Barra de Filtros */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Abas do Módulo de Faturação */}
        <div className="flex items-center gap-1 bg-stone-900 p-1.5 rounded-2xl border border-stone-800 overflow-x-auto no-scrollbar text-xs">
          <button
            onClick={() => setActiveTab('pendentes')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              activeTab === 'pendentes'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            Vendas Pendentes ({filteredPendingSales.length})
          </button>
          <button
            onClick={() => setActiveTab('emitidos')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              activeTab === 'emitidos'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            Documentos Emitidos ({filteredDocs.length})
          </button>
          <button
            onClick={() => setActiveTab('parciais')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              activeTab === 'parciais'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            Faturação Parcial ({metrics.partialCount})
          </button>
          <button
            onClick={() => setActiveTab('historico_envios')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
              activeTab === 'historico_envios'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            Envios & Despacho ({allDispatchLogs.length})
          </button>
        </div>

        {/* Filtros de Pesquisa, Tipo e Período */}
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'emitidos' && (
            <>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="bg-stone-900 border border-stone-800 rounded-xl px-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="todos">Todos os Tipos</option>
                <option value="FS">FS - Fatura Simplificada</option>
                <option value="FR">FR - Fatura-Recibo</option>
                <option value="FT">FT - Fatura</option>
                <option value="RC">RC - Recibo</option>
                <option value="NC">NC - Nota de Crédito</option>
              </select>

              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value as any)}
                className="bg-stone-900 border border-stone-800 rounded-xl px-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="todos">Todo o Período</option>
                <option value="hoje">Hoje</option>
                <option value="semana">Esta Semana</option>
                <option value="mes">Este Mês</option>
              </select>
            </>
          )}

          {activeTab === 'pendentes' && (
            <select
              value={originFilter}
              onChange={(e) => setOriginFilter(e.target.value as any)}
              className="bg-stone-900 border border-stone-800 rounded-xl px-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
            >
              <option value="todas">Todas as Origens</option>
              <option value="mesas">Mesas do Restaurante</option>
              <option value="site">Pedidos Online (Site)</option>
              <option value="avulso">Balcão / Takeaway</option>
            </select>
          )}

          {/* Campo de Pesquisa */}
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar NIF, cliente, série..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-stone-900 border border-stone-800 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Conteúdo Principal Conforme a Aba Selecionada */}

      {/* 1. ABA: VENDAS PENDENTES DE FATURAÇÃO */}
      {activeTab === 'pendentes' && (
        <div className="space-y-3">
          {filteredPendingSales.length === 0 ? (
            <div className="bg-stone-900/60 border border-dashed border-stone-800 rounded-3xl p-16 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-white">Todas as vendas estão devidamente faturadas!</h3>
              <p className="text-xs text-stone-400 max-w-sm mx-auto">
                Não existem vendas ou comandas pendentes de emissão fiscal no filtro atual.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPendingSales.map((sale) => {
                const isPaid = sale.status === 'paga' || sale.balanceDue <= 0;
                const isPartiallyPaid = sale.paidAmount > 0 && sale.balanceDue > 0;
                const hasExistingDocs = sale.documentId || (sale.documentIds && sale.documentIds.length > 0);

                return (
                  <div
                    key={sale.id}
                    className="bg-stone-900 border border-stone-800 hover:border-stone-700 rounded-3xl p-4 shadow-xl flex flex-col justify-between transition-all"
                  >
                    <div>
                      {/* Topo do Card da Venda */}
                      <div className="flex items-start justify-between gap-2 pb-3 border-b border-stone-800/80">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-base text-white">{sale.tableName}</span>
                            <span className="text-[10px] px-1.5 py-0.2 font-mono bg-stone-800 text-stone-300 rounded">
                              {sale.id}
                            </span>
                          </div>
                          <div className="text-[11px] text-stone-400 mt-0.5">
                            {sale.roomName} • Empregado: <strong className="text-stone-300">{sale.waiterName}</strong>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-lg font-mono ${
                              isPaid
                                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                                : isPartiallyPaid
                                ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                                : 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
                            }`}
                          >
                            {isPaid ? 'Pago' : isPartiallyPaid ? 'Parcialmente Pago' : 'Aguardando Pagamento'}
                          </span>
                          <div className="text-[10px] text-stone-500 font-mono mt-1">
                            {formatTime(sale.createdAt)}
                          </div>
                        </div>
                      </div>

                      {/* Dados do Cliente e Resumo de Itens */}
                      <div className="py-3 space-y-2 text-xs">
                        <div className="flex items-center justify-between text-stone-300">
                          <span className="text-stone-400">Cliente:</span>
                          <span className="font-bold">{sale.customerName || 'Consumidor Final'}</span>
                        </div>
                        <div className="flex items-center justify-between text-stone-300">
                          <span className="text-stone-400">NIF:</span>
                          <span className="font-mono">{sale.customerNif || '999999990'}</span>
                        </div>
                        <div className="flex items-center justify-between text-stone-300">
                          <span className="text-stone-400">Produtos:</span>
                          <span>{sale.items.length} itens ({sale.items.reduce((acc, i) => acc + i.quantity, 0)} unidades)</span>
                        </div>

                        {/* Totais Separados */}
                        <div className="mt-2 pt-2 border-t border-stone-800/60 flex items-center justify-between">
                          <span className="text-xs text-stone-400">Total da Venda:</span>
                          <span className="text-base font-extrabold text-white font-mono">
                            {formatCurrency(sale.total)}
                          </span>
                        </div>
                        {sale.paidAmount > 0 && sale.paidAmount < sale.total && (
                          <div className="flex items-center justify-between text-[11px] text-amber-400">
                            <span>Saldo Restante:</span>
                            <span className="font-bold font-mono">{formatCurrency(sale.balanceDue)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="pt-3 border-t border-stone-800 flex items-center justify-between gap-2">
                      {hasExistingDocs && (
                        <button
                          onClick={() => {
                            const doc = fiscalDocuments.find((d) => d.id === sale.documentId);
                            if (doc) handleOpenDocReceipt(doc);
                          }}
                          className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-xl text-xs font-semibold flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver Fatura</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenIssueModal(sale)}
                        className="flex-1 py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95"
                      >
                        <FileCheck2 className="w-4 h-4" />
                        <span>{hasExistingDocs ? 'Faturar Restante' : 'Emitir Fatura'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. ABA: DOCUMENTOS FISCAIS EMITIDOS */}
      {activeTab === 'emitidos' && (
        <div className="bg-stone-900 border border-stone-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/40">
            <div>
              <h3 className="font-bold text-sm text-white">Documentos Fiscais Certificados</h3>
              <p className="text-xs text-stone-400">
                Faturas, Faturas-Recibo e Notas de Crédito registadas com assinatura hash e ATCUD
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-xl border border-emerald-800/40">
              Total: {filteredDocs.length} documentos
            </span>
          </div>

          {filteredDocs.length === 0 ? (
            <div className="p-12 text-center text-xs text-stone-400 space-y-2">
              <FileText className="w-8 h-8 text-stone-600 mx-auto" />
              <p>Nenhum documento encontrado com os filtros aplicados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-300">
                <thead className="bg-stone-950/80 text-[11px] uppercase font-bold text-stone-400 border-b border-stone-800">
                  <tr>
                    <th className="py-3 px-4">Documento / Série</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Data / Hora</th>
                    <th className="py-3 px-4">Cliente / NIF</th>
                    <th className="py-3 px-4 text-right">Base Incidência</th>
                    <th className="py-3 px-4 text-right">Total IVA</th>
                    <th className="py-3 px-4 text-right">Total Bruto</th>
                    <th className="py-3 px-4 text-center">Estado Fiscal</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60">
                  {filteredDocs.map((doc) => {
                    const isCreditNote = doc.type === 'NC';
                    const isCancelled = doc.status === 'cancelada_por_retificacao';

                    return (
                      <tr
                        key={doc.id}
                        className={`hover:bg-stone-800/40 transition-colors ${
                          isCancelled ? 'opacity-60 bg-rose-950/10' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="font-bold font-mono text-white flex items-center gap-1.5">
                            <span>{doc.series}</span>
                          </div>
                          <div className="text-[10px] text-stone-500 font-mono mt-0.5">
                            ATCUD: {doc.atcud}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono ${
                              doc.type === 'FS'
                                ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                                : doc.type === 'FR'
                                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                                : doc.type === 'FT'
                                ? 'bg-blue-950/60 text-blue-300 border border-blue-800/60'
                                : doc.type === 'NC'
                                ? 'bg-rose-950/60 text-rose-300 border border-rose-800/60'
                                : 'bg-stone-800 text-stone-300'
                            }`}
                          >
                            {doc.type}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="text-stone-200">{formatDateTime(doc.issuedAt)}</div>
                          <div className="text-[10px] text-stone-500">Por: {doc.operatorName}</div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-white">{doc.customerName}</div>
                          <div className="text-[11px] text-stone-400 font-mono">
                            NIF: {doc.customerNif}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right font-mono text-stone-300">
                          {formatCurrency(doc.subtotal)}
                        </td>

                        <td className="py-3 px-4 text-right font-mono text-amber-400">
                          {formatCurrency(doc.taxTotal)}
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-bold text-base text-emerald-400">
                          {isCreditNote ? `-${formatCurrency(doc.grossTotal)}` : formatCurrency(doc.grossTotal)}
                        </td>

                        <td className="py-3 px-4 text-center">
                          {isCancelled ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950/60 text-rose-400 border border-rose-800/60">
                              Anulado p/ Retificação
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-700/60 flex items-center justify-center gap-1 mx-auto w-max">
                              <ShieldCheck className="w-3 h-3 text-emerald-400" />
                              <span>{doc.status === 'comunicada_at' ? 'Comunicada AT' : 'Emitida'}</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenDocReceipt(doc)}
                              className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 hover:text-white rounded-lg transition-all"
                              title="Visualizar documento, imprimir ou descarregar PDF"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleOpenDocReceipt(doc)}
                              className="p-1.5 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 rounded-lg transition-all border border-cyan-800/40"
                              title="Reenviar por E-mail ou WhatsApp"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>

                            {!isCreditNote && !isCancelled && (
                              <button
                                onClick={() => {
                                  setRectifyModalDoc(doc);
                                  setRectifyReasonInput('');
                                }}
                                className="p-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded-lg transition-all border border-rose-800/40"
                                title="Emitir Nota de Crédito (Retificação)"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 3. ABA: FATURAÇÃO PARCIAL */}
      {activeTab === 'parciais' && (
        <div className="space-y-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 shadow-xl">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-400" />
              Gestão de Vendas com Faturação Dividida / Parcial
            </h3>
            <p className="text-xs text-stone-400 mt-1">
              Casos em que clientes na mesma mesa solicitam faturas separadas por prato, por pessoa (lugar) ou por frações do valor total. O sistema garante que cada produto só é faturado uma única vez.
            </p>
          </div>

          {sales.filter((s) => s.fiscalStatus === 'parcialmente_faturado').length === 0 ? (
            <div className="bg-stone-900/40 border border-dashed border-stone-800 rounded-3xl p-12 text-center text-xs text-stone-400">
              Não existem vendas parcialmente faturadas pendentes.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sales
                .filter((s) => s.fiscalStatus === 'parcialmente_faturado')
                .map((sale) => (
                  <div
                    key={sale.id}
                    className="bg-stone-900 border border-purple-800/40 rounded-3xl p-4 shadow-xl flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                        <div>
                          <div className="font-extrabold text-base text-white">{sale.tableName}</div>
                          <div className="text-[11px] text-stone-400">ID Venda: {sale.id}</div>
                        </div>
                        <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-purple-950/80 text-purple-300 border border-purple-800/60">
                          Faturação Parcial
                        </span>
                      </div>

                      <div className="py-3 space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-stone-400">Total da Venda:</span>
                          <span className="font-bold text-white font-mono">{formatCurrency(sale.total)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-400">Itens Totais:</span>
                          <span>{sale.items.length} itens</span>
                        </div>
                        <div className="flex justify-between text-amber-400">
                          <span>Faturas Já Emitidas:</span>
                          <span>{sale.documentIds?.length || 1} documento(s)</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenIssueModal(sale)}
                      className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all"
                    >
                      <FileCheck2 className="w-4 h-4" />
                      <span>Emitir Próxima Fatura Parcial</span>
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* 4. ABA: HISTÓRICO DE ENVIOS (E-MAIL E WHATSAPP) */}
      {activeTab === 'historico_envios' && (
        <div className="bg-stone-900 border border-stone-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/40">
            <div>
              <h3 className="font-bold text-sm text-white">Registo de Despacho & Partilha de Faturas</h3>
              <p className="text-xs text-stone-400">
                Auditoria de envios por correio eletrónico e partilhas via WhatsApp Web
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/60 px-3 py-1 rounded-xl border border-cyan-800/40">
              {allDispatchLogs.length} envios registados
            </span>
          </div>

          {allDispatchLogs.length === 0 ? (
            <div className="p-12 text-center text-xs text-stone-400 space-y-2">
              <Share2 className="w-8 h-8 text-stone-600 mx-auto" />
              <p>Ainda não foram registados envios de faturas nesta sessão.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-300">
                <thead className="bg-stone-950/80 text-[11px] uppercase font-bold text-stone-400 border-b border-stone-800">
                  <tr>
                    <th className="py-3 px-4">Data / Hora</th>
                    <th className="py-3 px-4">Canal</th>
                    <th className="py-3 px-4">Documento</th>
                    <th className="py-3 px-4">Destinatário</th>
                    <th className="py-3 px-4">Operador</th>
                    <th className="py-3 px-4 text-center">Estado do Envio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60">
                  {allDispatchLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-stone-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-stone-300">
                        {formatDateTime(log.timestamp)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 w-max ${
                            log.channel.startsWith('whatsapp')
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
                              : 'bg-cyan-950/80 text-cyan-300 border border-cyan-700/60'
                          }`}
                        >
                          {log.channel.startsWith('whatsapp') ? (
                            <>
                              <MessageCircle className="w-3 h-3 text-emerald-400" />
                              <span>WhatsApp</span>
                            </>
                          ) : (
                            <>
                              <Mail className="w-3 h-3 text-cyan-400" />
                              <span>E-mail</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        {log.docSeries}
                      </td>
                      <td className="py-3 px-4 font-mono text-stone-200">
                        {log.recipient}
                      </td>
                      <td className="py-3 px-4 text-stone-400">
                        {log.operatorName}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.status === 'enviado'
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60'
                              : log.status === 'partilha_iniciada'
                              ? 'bg-amber-950/80 text-amber-300 border border-amber-700/60'
                              : 'bg-rose-950/80 text-rose-300 border border-rose-700/60'
                          }`}
                        >
                          {log.status === 'partilha_iniciada'
                            ? 'Partilha Iniciada'
                            : log.status === 'enviado'
                            ? 'Enviado com Sucesso'
                            : 'Falha no Envio'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL DE EMISSÃO A PARTIR DE VENDA COM REVISÃO COMPLETA */}
      {issueModalSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col text-stone-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Cabeçalho */}
            <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/70">
              <div className="flex items-center gap-2.5">
                <FileCheck2 className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-base text-white">Emitir Documento Fiscal</h3>
                  <div className="text-xs text-stone-400">
                    Origem: <strong className="text-stone-200">{issueModalSale.tableName}</strong> ({issueModalSale.roomName})
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIssueModalSale(null)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corpo com Revisão dos Dados */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Seleção do Tipo de Documento */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-300">Tipo de Documento Fiscal:</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'FS', label: 'Fatura Simplificada' },
                    { id: 'FR', label: 'Fatura-Recibo' },
                    { id: 'FT', label: 'Fatura' },
                    { id: 'RC', label: 'Recibo' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setIssueDocType(t.id as FiscalDocumentType)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                        issueDocType === t.id
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                          : 'bg-stone-950 border-stone-800 text-stone-300 hover:bg-stone-800'
                      }`}
                    >
                      {t.id} - {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dados do Cliente */}
              <div className="p-4 bg-stone-950/70 border border-stone-800 rounded-2xl space-y-3">
                <div className="font-bold text-xs text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4" />
                  <span>Identificação do Cliente / Adquirente</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-stone-400">NIF (9 dígitos):</label>
                    <input
                      type="text"
                      value={issueCustomerNif}
                      onChange={(e) => handleNifChange(e.target.value)}
                      placeholder="999999990"
                      className={`w-full px-3 py-2 bg-stone-900 border rounded-xl text-xs font-mono text-white focus:outline-none ${
                        issueNifError ? 'border-rose-500' : 'border-stone-800 focus:border-emerald-500'
                      }`}
                    />
                    {issueNifError && (
                      <p className="text-[10px] text-rose-400 font-bold">{issueNifError}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-stone-400">Nome / Razão Social:</label>
                    <input
                      type="text"
                      value={issueCustomerName}
                      onChange={(e) => setIssueCustomerName(e.target.value)}
                      placeholder="Consumidor Final"
                      className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-stone-400">Morada Fiscal (Opcional):</label>
                  <input
                    type="text"
                    value={issueCustomerAddress}
                    onChange={(e) => setIssueCustomerAddress(e.target.value)}
                    placeholder="Rua, Número, Código Postal, Localidade"
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Seleção de Itens para Faturação (Permite Parcial) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-stone-300">Itens a Incluir no Documento:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedItemIds(issueModalSale.items.map((i) => i.id))}
                      className="text-[11px] text-emerald-400 hover:underline"
                    >
                      Selecionar Todos
                    </button>
                    <span className="text-stone-600">•</span>
                    <button
                      type="button"
                      onClick={() => setSelectedItemIds([])}
                      className="text-[11px] text-stone-400 hover:underline"
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {issueModalSale.items.map((item) => {
                    const isSelected = selectedItemIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          setSelectedItemIds((prev) =>
                            prev.includes(item.id)
                              ? prev.filter((id) => id !== item.id)
                              : [...prev, item.id]
                          );
                        }}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-950/30 border-emerald-600/70 text-emerald-200'
                            : 'bg-stone-950 border-stone-800 text-stone-400 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded border-stone-700 text-emerald-600 focus:ring-0"
                          />
                          <div>
                            <span className="font-bold text-white">
                              {item.quantity}x {item.productName}
                            </span>
                            {item.seatName && item.seatName !== 'Para partilhar' && (
                              <span className="ml-2 text-[10px] text-amber-400">({item.seatName})</span>
                            )}
                          </div>
                        </div>

                        <div className="font-mono font-bold">
                          {formatCurrency((item.totalItemPrice || item.unitPrice * item.quantity))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Resumo Financeiro da Faturação */}
              <div className="p-4 bg-stone-950 border border-stone-800 rounded-2xl space-y-1.5 text-xs">
                <div className="flex justify-between text-stone-400">
                  <span>Itens Selecionados:</span>
                  <span className="font-mono text-white">{selectedItemIds.length} de {issueModalSale.items.length}</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-emerald-400 pt-2 border-t border-stone-800">
                  <span>Total do Documento:</span>
                  <span className="font-mono">
                    {formatCurrency(
                      issueModalSale.items
                        .filter((i) => selectedItemIds.includes(i.id))
                        .reduce((acc, i) => acc + (i.totalItemPrice || i.unitPrice * i.quantity), 0)
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Rodapé com Confirmação */}
            <div className="px-6 py-4 border-t border-stone-800 bg-stone-950/70 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIssueModalSale(null)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs rounded-xl"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={isSubmittingIssue || selectedItemIds.length === 0}
                onClick={handleConfirmIssueDocument}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl shadow-lg flex items-center gap-2 disabled:opacity-50 transition-all active:scale-95"
              >
                {isSubmittingIssue ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>A Certificar junto da AT...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Confirmar e Emitir Fatura</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE NOTA DE CRÉDITO (RETIFICAÇÃO DE DOCUMENTO) */}
      {rectifyModalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-stone-900 border border-rose-900/60 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col text-stone-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-rose-950/40">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-base text-white">Emitir Nota de Crédito (Retificação)</h3>
              </div>
              <button
                onClick={() => setRectifyModalDoc(null)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-stone-950 border border-stone-800 rounded-2xl space-y-1">
                <div className="text-stone-400">Documento a Retificar:</div>
                <div className="text-sm font-bold text-white font-mono">
                  {rectifyModalDoc.series} ({rectifyModalDoc.atcud})
                </div>
                <div className="text-stone-400">
                  Cliente: <strong className="text-stone-200">{rectifyModalDoc.customerName}</strong> (NIF: {rectifyModalDoc.customerNif})
                </div>
                <div className="text-rose-400 font-mono font-bold text-sm">
                  Valor a Estornar: {formatCurrency(rectifyModalDoc.grossTotal)}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-stone-300">
                  Motivo Obrigatório da Retificação / Anulação (Art. 78.º do CIVA):
                </label>
                <textarea
                  value={rectifyReasonInput}
                  onChange={(e) => setRectifyReasonInput(e.target.value)}
                  placeholder="Ex: Erro no NIF do cliente, devolução de produto, troca de prato..."
                  rows={3}
                  className="w-full p-3 bg-stone-950 border border-stone-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <p className="text-[11px] text-stone-400">
                A emissão de Nota de Crédito anula fiscalmente o documento anterior perante a Autoridade Tributária e gera um novo documento oficial com hash e ATCUD negativo.
              </p>
            </div>

            <div className="px-6 py-4 border-t border-stone-800 bg-stone-950/70 flex items-center justify-between">
              <button
                onClick={() => setRectifyModalDoc(null)}
                className="px-4 py-2 bg-stone-800 text-stone-300 rounded-xl text-xs font-bold"
              >
                Cancelar
              </button>

              <button
                disabled={isProcessingNC || !rectifyReasonInput.trim()}
                onClick={handleIssueCreditNote}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5 disabled:opacity-50 transition-all"
              >
                {isProcessingNC ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>A Emitir NC...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Emitir Nota de Crédito</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE FATURA AVULSA (AdHocInvoiceModal) */}
      <AdHocInvoiceModal
        isOpen={adHocModalOpen}
        onClose={() => setAdHocModalOpen(false)}
        state={state}
        onViewReceipt={(doc) => {
          setAdHocModalOpen(false);
          setActiveReceiptDoc(doc);
          if (onViewReceipt) onViewReceipt(doc);
        }}
      />

      {/* MODAL DE VISUALIZAÇÃO, IMPRESSÃO, PDF E ENVIO (ReceiptModal) */}
      {activeReceiptDoc && (
        <ReceiptModal
          document={activeReceiptDoc}
          settings={settings}
          currentUser={currentUser}
          onClose={() => setActiveReceiptDoc(null)}
        />
      )}
    </div>
  );
};
