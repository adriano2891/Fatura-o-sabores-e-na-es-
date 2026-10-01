import React, { useState } from 'react';
import {
  FileCheck2,
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
  FilePlus,
} from 'lucide-react';
import { AppState, store } from '../services/storage';
import { FiscalDocument, FiscalDocumentType } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { AdHocInvoiceModal } from '../components/AdHocInvoiceModal';

interface InvoicesViewProps {
  state: AppState;
  onViewReceipt: (doc: FiscalDocument) => void;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({ state, onViewReceipt }) => {
  const { fiscalDocuments, currentUser, settings } = state;

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'todos' | FiscalDocumentType>('todos');
  const [adHocModalOpen, setAdHocModalOpen] = useState(false);

  // Modal de Nota de Crédito (Retificação)
  const [rectifyModalDoc, setRectifyModalDoc] = useState<FiscalDocument | null>(null);
  const [rectifyReasonInput, setRectifyReasonInput] = useState('');
  const [isProcessingNC, setIsProcessingNC] = useState(false);

  const filteredDocs = fiscalDocuments.filter((doc) => {
    const matchesType = typeFilter === 'todos' || doc.type === typeFilter;
    const matchesQuery = searchQuery
      ? doc.series.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.atcud.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.customerNif.includes(searchQuery)
      : true;
    return matchesType && matchesQuery;
  });

  const handleIssueCreditNote = async () => {
    if (!rectifyModalDoc || !rectifyReasonInput.trim()) return;

    // Apenas Gerente ou Administrador pode emitir notas de crédito
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
      onViewReceipt(nc);
    } catch (err: any) {
      alert(err.message || 'Erro ao emitir nota de crédito');
    } finally {
      setIsProcessingNC(false);
    }
  };

  const handleExportCsv = () => {
    const headers = 'Série;Tipo;ATCUD;Data/Hora;NIF Cliente;Nome Cliente;Base Incidência;Total IVA;Total Bruto;Estado\n';
    const rows = fiscalDocuments
      .map(
        (d) =>
          `"${d.series}";"${d.type}";"${d.atcud}";"${formatDateTime(d.issuedAt)}";"${d.customerNif}";"${d.customerName}";"${d.subtotal.toFixed(
            2
          )}";"${d.taxTotal.toFixed(2)}";"${d.grossTotal.toFixed(2)}";"${d.status}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `Faturas_Sabores_Nacoes_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900/90 p-4 rounded-2xl border border-stone-800">
        <div className="flex items-center gap-2">
          <FileCheck2 className="w-5 h-5 text-emerald-400" />
          <div>
            <h1 className="text-base font-bold text-white">Faturação Certificada (Vendus / AT)</h1>
            <p className="text-xs text-stone-400">
              Séries autenticadas, ATCUD, QR Code e arquivo digital para a Autoridade Tributária
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Pesquisar série, ATCUD ou NIF..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-stone-950 border border-stone-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 w-56"
            />
          </div>

          <button
            onClick={() => setAdHocModalOpen(true)}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-amber-950/40 transition-colors"
          >
            <FilePlus className="w-3.5 h-3.5" />
            Nova Fatura Avulsa
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-xl border border-stone-700 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Filtros por Tipo de Documento */}
      <div className="flex items-center gap-1.5 bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs w-fit">
        <button
          onClick={() => setTypeFilter('todos')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
            typeFilter === 'todos' ? 'bg-amber-600 text-white' : 'text-stone-400 hover:text-white'
          }`}
        >
          Todos ({fiscalDocuments.length})
        </button>
        <button
          onClick={() => setTypeFilter('FS')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
            typeFilter === 'FS' ? 'bg-amber-600 text-white' : 'text-stone-400 hover:text-white'
          }`}
        >
          Faturas Simplificadas (FS)
        </button>
        <button
          onClick={() => setTypeFilter('FT')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
            typeFilter === 'FT' ? 'bg-amber-600 text-white' : 'text-stone-400 hover:text-white'
          }`}
        >
          Faturas (FT)
        </button>
        <button
          onClick={() => setTypeFilter('NC')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
            typeFilter === 'NC' ? 'bg-amber-600 text-white' : 'text-stone-400 hover:text-white'
          }`}
        >
          Notas de Crédito (NC)
        </button>
      </div>

      {/* Tabela de Faturas Emitidas */}
      <div className="bg-stone-900 rounded-2xl border border-stone-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-300">
            <thead className="bg-stone-950 border-b border-stone-800 uppercase text-[10px] tracking-wider text-stone-400">
              <tr>
                <th className="px-4 py-3">Documento & Série</th>
                <th className="px-4 py-3">Código ATCUD</th>
                <th className="px-4 py-3">Data / Hora (Lisboa)</th>
                <th className="px-4 py-3">Cliente / NIF</th>
                <th className="px-4 py-3 text-right">Líquido</th>
                <th className="px-4 py-3 text-right">IVA</th>
                <th className="px-4 py-3 text-right">Total Bruto</th>
                <th className="px-4 py-3 text-center">Estado AT</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/80">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-stone-500 italic">
                    Nenhum documento fiscal encontrado.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => {
                  const isNC = doc.type === 'NC';
                  const isCancelled = doc.status === 'cancelada_por_retificacao';

                  return (
                    <tr
                      key={doc.id}
                      className={`hover:bg-stone-850 transition-colors ${
                        isCancelled ? 'opacity-60 bg-stone-950/40' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-white flex items-center gap-1.5">
                          <span>{doc.series}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold ${
                              isNC ? 'bg-rose-950 text-rose-300' : 'bg-emerald-950 text-emerald-300'
                            }`}
                          >
                            {doc.type}
                          </span>
                        </div>
                        {doc.rectifiesDocumentId && (
                          <div className="text-[10px] text-rose-400">
                            Retifica: {doc.rectifiesDocumentId}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 font-mono font-semibold text-amber-400 text-xs">
                        {doc.atcud}
                      </td>

                      <td className="px-4 py-3 font-mono text-stone-400">
                        {formatDateTime(doc.issuedAt)}
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-white font-medium">{doc.customerName}</div>
                        <div className="text-[10px] text-stone-400 font-mono">{doc.customerNif}</div>
                      </td>

                      <td className="px-4 py-3 text-right font-mono text-stone-300">
                        {formatCurrency(doc.subtotal)}
                      </td>

                      <td className="px-4 py-3 text-right font-mono text-stone-400">
                        {formatCurrency(doc.taxTotal)}
                      </td>

                      <td className="px-4 py-3 text-right font-mono font-bold text-sm text-white">
                        {formatCurrency(doc.grossTotal)}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-[9px] uppercase px-2 py-0.5 rounded-full font-bold border ${
                            isCancelled
                              ? 'bg-rose-950/80 text-rose-400 border-rose-800'
                              : doc.status === 'comunicada_at'
                              ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                              : 'bg-teal-950/80 text-teal-400 border-teal-800'
                          }`}
                        >
                          {isCancelled
                            ? 'Retificada p/ NC'
                            : doc.status === 'comunicada_at'
                            ? 'Comunicada AT'
                            : 'Emitida'}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right space-x-1.5">
                        <button
                          onClick={() => onViewReceipt(doc)}
                          className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 transition-colors"
                          title="Ver Recibo / Talão"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {!isNC && !isCancelled && (
                          <button
                            onClick={() => setRectifyModalDoc(doc)}
                            className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800 transition-colors"
                            title="Emitir Nota de Crédito (Retificação)"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Emitir Nota de Crédito */}
      {rectifyModalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 text-stone-100">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-sm text-white">
                Emitir Nota de Crédito: {rectifyModalDoc.series}
              </h3>
            </div>

            <p className="text-xs text-stone-300">
              A Autoridade Tributária exige a emissão formal de uma Nota de Crédito (NC) para retificar ou anular um documento fiscal emitido.
            </p>

            <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 text-xs space-y-1">
              <div className="flex justify-between text-stone-400">
                <span>Documento Original:</span>
                <span className="font-mono text-white">{rectifyModalDoc.series}</span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>Valor a Anular/Retificar:</span>
                <span className="font-mono text-rose-400 font-bold">
                  {formatCurrency(rectifyModalDoc.grossTotal)}
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs text-stone-400">Motivo Formal da Retificação:</label>
              <input
                type="text"
                required
                placeholder="Ex: Correção de NIF, engano em prato faturado..."
                value={rectifyReasonInput}
                onChange={(e) => setRectifyReasonInput(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-white mt-1 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
              <button
                onClick={() => setRectifyModalDoc(null)}
                className="px-3 py-1.5 bg-stone-800 text-stone-300 text-xs font-semibold rounded-lg"
              >
                Cancelar
              </button>
              <button
                disabled={!rectifyReasonInput.trim() || isProcessingNC}
                onClick={handleIssueCreditNote}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg shadow-md"
              >
                {isProcessingNC ? 'A emitir NC...' : 'Emitir Nota de Crédito'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Nova Fatura Avulsa (Requisito 14) */}
      <AdHocInvoiceModal
        isOpen={adHocModalOpen}
        onClose={() => setAdHocModalOpen(false)}
        state={state}
        onViewReceipt={onViewReceipt}
      />
    </div>
  );
};
