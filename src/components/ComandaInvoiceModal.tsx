import React, { useState } from 'react';
import {
  X,
  FileCheck2,
  Receipt,
  RotateCw,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Eye,
  Send,
  Users,
  CreditCard,
  Printer,
  Mail,
  MessageCircle,
} from 'lucide-react';
import {
  Comanda,
  FiscalDocument,
  FiscalDocumentType,
  OrderItem,
  Sale,
  User,
} from '../types';
import { store, AppState } from '../services/storage';
import { formatCurrency, formatDateTime, validatePortugueseNIF } from '../utils/formatters';

interface ComandaInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  comanda: Comanda | null;
  state: AppState;
  onViewReceipt: (doc: FiscalDocument) => void;
}

export const ComandaInvoiceModal: React.FC<ComandaInvoiceModalProps> = ({
  isOpen,
  onClose,
  comanda,
  state,
  onViewReceipt,
}) => {
  const { fiscalDocuments, sales, currentUser, settings } = state;

  if (!isOpen || !comanda) return null;

  const associatedSale = sales.find((s) => s.id === comanda.saleId);

  // Documentos fiscais já emitidos para esta comanda / venda
  const existingDocs = fiscalDocuments.filter(
    (d) =>
      (d.comandaId === comanda.id || d.saleId === comanda.saleId) &&
      d.status !== 'cancelada_por_retificacao'
  );

  // Itens da comanda
  const allActiveItems = comanda.rounds
    .flatMap((r) => r.items)
    .filter((it) => it.status !== 'cancelado');

  // Itens já faturados vs itens pendentes de faturação
  const billedItems = allActiveItems.filter((it) => it.isBilled || it.billedDocumentId);
  const unbilledItems = allActiveItems.filter((it) => !it.isBilled && !it.billedDocumentId);

  // Seleção de itens a faturar (por defeito todos os não faturados)
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(
    unbilledItems.map((it) => it.id)
  );

  // Dados do cliente
  const [docType, setDocType] = useState<FiscalDocumentType>('FS');
  const [customerName, setCustomerName] = useState<string>(
    comanda.customerName || 'Consumidor Final'
  );
  const [customerNif, setCustomerNif] = useState<string>(
    comanda.customerNif || '999999990'
  );
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [nifError, setNifError] = useState<string | null>(null);

  // Estado de submissão
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Itens selecionados atualmente
  const itemsToBill = unbilledItems.filter((it) => selectedItemIds.includes(it.id));

  // Totais dos itens a faturar
  const totalGrossToBill = itemsToBill.reduce((sum, it) => sum + it.totalItemPrice, 0);
  const subtotalNetToBill = itemsToBill.reduce(
    (sum, it) => sum + it.totalItemPrice / (1 + it.vatRate),
    0
  );
  const totalVatToBill = totalGrossToBill - subtotalNetToBill;

  // Estado geral de faturação da comanda
  const currentFiscalStatus =
    unbilledItems.length === 0 && billedItems.length > 0
      ? 'faturado'
      : billedItems.length > 0
      ? 'parcialmente_faturado'
      : 'por_faturar';

  const handleNifChange = (nifVal: string) => {
    setCustomerNif(nifVal);
    if (!nifVal || nifVal === '999999990') {
      setNifError(null);
      return;
    }
    const isValid = validatePortugueseNIF(nifVal);
    if (!isValid) {
      setNifError('NIF português inválido.');
    } else {
      setNifError(null);
    }
  };

  const handleToggleItem = (itemId: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const handleSelectAllUnbilled = () => {
    setSelectedItemIds(unbilledItems.map((it) => it.id));
  };

  // Emissão Certificada da Fatura
  const handleIssueInvoice = async () => {
    if (isSubmitting) return;

    if (itemsToBill.length === 0) {
      alert('Selecione pelo menos um item para faturar.');
      return;
    }

    if (customerNif && customerNif !== '999999990' && !validatePortugueseNIF(customerNif)) {
      alert('O NIF indicado é inválido. Corrija antes de prosseguir.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const doc = await store.issueInvoiceForComanda({
        comandaId: comanda.id,
        docType,
        customerNif: customerNif.trim() || '999999990',
        customerName: customerName.trim() || 'Consumidor Final',
        customerAddress: customerAddress.trim() || undefined,
        itemIds: selectedItemIds,
        user: currentUser,
      });

      onClose();
      onViewReceipt(doc);
    } catch (err: any) {
      setSubmitError(err.message || 'Erro ao comunicar com o servidor de faturação certificada.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  Fatura da Comanda: {comanda.tableName} ({comanda.numberDisplay})
                </h3>
                <span
                  className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    currentFiscalStatus === 'faturado'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : currentFiscalStatus === 'parcialmente_faturado'
                      ? 'bg-blue-950 text-blue-400 border border-blue-800'
                      : 'bg-amber-950 text-amber-400 border border-amber-800'
                  }`}
                >
                  {currentFiscalStatus === 'faturado'
                    ? 'Faturado'
                    : currentFiscalStatus === 'parcialmente_faturado'
                    ? 'Parcialmente Faturado'
                    : 'Por Faturar'}
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                Emissão certificada AT com ATCUD e QR Code oficial
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

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* Se já existirem documentos emitidos */}
          {existingDocs.length > 0 && (
            <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Documentos Fiscais Já Emitidos ({existingDocs.length}):
                </span>
                <span className="text-[10px] text-stone-500 font-mono">
                  Reenviar não duplica pagamento
                </span>
              </div>

              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {existingDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-2.5 bg-stone-900 border border-stone-800 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span className="font-mono">{doc.series}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 font-bold">
                          {doc.type}
                        </span>
                      </div>
                      <div className="text-[10px] text-stone-400">
                        {formatDateTime(doc.issuedAt)} • {doc.customerName} ({doc.customerNif})
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-emerald-400">
                        {formatCurrency(doc.grossTotal)}
                      </span>
                      <button
                        onClick={() => onViewReceipt(doc)}
                        className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Ver / Reenviar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dados do Cliente e Documento */}
          <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-200">
                Dados do Destinatário & Tipo de Documento:
              </span>

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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-stone-400">Nome do Cliente:</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-xs text-white mt-1 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-stone-400">NIF (Validação PT):</label>
                <input
                  type="text"
                  maxLength={9}
                  value={customerNif}
                  onChange={(e) => handleNifChange(e.target.value)}
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
                placeholder="Rua, Número, Código Postal, Localidade"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-xs text-stone-200 mt-1 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Itens Pendentes de Faturação */}
          <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-stone-200">
                Itens a Faturar ({itemsToBill.length} selecionados de {unbilledItems.length} pendentes):
              </span>

              {unbilledItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAllUnbilled}
                  className="text-amber-400 hover:underline text-[11px]"
                >
                  Selecionar Todos
                </button>
              )}
            </div>

            {unbilledItems.length === 0 ? (
              <div className="p-4 rounded-xl bg-stone-900 text-center text-xs text-stone-400 italic">
                Todos os itens ativos desta comanda já foram devidamente faturados!
              </div>
            ) : (
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {unbilledItems.map((it) => {
                  const isChecked = selectedItemIds.includes(it.id);
                  return (
                    <label
                      key={it.id}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer text-xs transition-all ${
                        isChecked
                          ? 'bg-amber-950/30 border-amber-500/80 text-white'
                          : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleItem(it.id)}
                          className="rounded text-amber-600 focus:ring-amber-500"
                        />
                        <div>
                          <div className="font-semibold text-white">
                            {it.quantity}x {it.productName}
                          </div>
                          <div className="text-[10px] text-stone-400">
                            {it.seatName || 'Para partilhar'} • IVA {(it.vatRate * 100).toFixed(0)}%
                          </div>
                        </div>
                      </div>

                      <div className="font-mono font-bold text-stone-200">
                        {formatCurrency(it.totalItemPrice)}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Resumo Financeiro da Faturação a Emitir */}
            {itemsToBill.length > 0 && (
              <div className="bg-stone-900 p-3 rounded-xl border border-stone-800 space-y-1 text-xs">
                <div className="flex justify-between text-stone-400">
                  <span>Incidência Líquida:</span>
                  <span className="font-mono">{formatCurrency(subtotalNetToBill)}</span>
                </div>
                <div className="flex justify-between text-stone-400">
                  <span>Total IVA:</span>
                  <span className="font-mono">{formatCurrency(totalVatToBill)}</span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-white pt-1 border-t border-stone-800">
                  <span>TOTAL A FATURAR:</span>
                  <span className="font-mono text-amber-400">
                    {formatCurrency(totalGrossToBill)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Pagamentos Já Associados à Comanda */}
          {comanda.paidAmount > 0 && (
            <div className="bg-emerald-950/20 border border-emerald-900/60 p-3 rounded-xl text-xs space-y-1">
              <div className="flex justify-between font-semibold text-emerald-300">
                <span>Pagamento já registado na comanda:</span>
                <span className="font-mono">{formatCurrency(comanda.paidAmount)}</span>
              </div>
              <p className="text-[11px] text-stone-400">
                A emissão do documento fiscal certifica os valores consumidos e não duplicará recebimentos na tesouraria.
              </p>
            </div>
          )}

          {submitError && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{submitError}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold rounded-xl"
          >
            Fechar
          </button>

          {unbilledItems.length > 0 && (
            <button
              type="button"
              disabled={isSubmitting || itemsToBill.length === 0}
              onClick={handleIssueInvoice}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg transition-colors"
            >
              {isSubmitting ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  A Emitir no Programa Certificado...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Emitir Fatura Certificada ({formatCurrency(totalGrossToBill)})
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
