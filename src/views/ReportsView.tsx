import React, { useState } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  Printer,
  CloudUpload,
  CheckCircle2,
  TrendingUp,
  CreditCard,
  Users,
  Flame,
  AlertCircle,
  FileSpreadsheet,
  Check,
  X,
} from 'lucide-react';
import { AppState, store } from '../services/storage';
import {
  formatCurrency,
  formatDateTime,
  formatDate,
  formatTime,
} from '../utils/formatters';
import {
  initDriveAuth,
  signInWithGoogleDrive,
  getDriveAccessToken,
  uploadFileToDrive,
} from '../services/drive';

interface ReportsViewProps {
  state: AppState;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ state }) => {
  const { sales, comandas, fiscalDocuments, cashSessions, products, settings } = state;

  const [period, setPeriod] = useState<'hoje' | 'semana' | 'mes'>('hoje');
  const [driveSyncing, setDriveSyncing] = useState(false);
  const [driveSuccessMsg, setDriveSuccessMsg] = useState('');
  const [driveConfirmModal, setDriveConfirmModal] = useState(false);

  // Cálculos consolidados
  const totalSales = sales.reduce((acc, s) => acc + s.total, 0);
  const totalReceived = sales.reduce((acc, s) => acc + s.paidAmount, 0);
  const totalInvoices = fiscalDocuments.length;
  const countSales = sales.length;
  const averageTicket = countSales > 0 ? totalSales / countSales : 0;

  // Breakdown por Métodos de Pagamento
  const paymentTotals: Record<string, number> = {
    dinheiro: 0,
    cartao: 0,
    mbway: 0,
    transferencia: 0,
  };

  sales.forEach((s) => {
    s.payments.forEach((p) => {
      paymentTotals[p.method] = (paymentTotals[p.method] || 0) + p.amount;
    });
  });

  // Produtos mais vendidos
  const productSalesMap: Record<string, { name: string; qty: number; total: number }> = {};
  sales.forEach((s) => {
    s.items.forEach((it) => {
      if (it.status !== 'cancelado') {
        if (!productSalesMap[it.productId]) {
          productSalesMap[it.productId] = { name: it.productName, qty: 0, total: 0 };
        }
        productSalesMap[it.productId].qty += it.quantity;
        productSalesMap[it.productId].total += it.totalItemPrice;
      }
    });
  });

  const topProducts = Object.values(productSalesMap).sort((a, b) => b.qty - a.qty).slice(0, 5);

  // Cancelamentos e auditoria
  const cancelledItems = comandas.flatMap((c) =>
    c.rounds.flatMap((r) => r.items.filter((i) => i.status === 'cancelado'))
  );

  // Exportar CSV
  const handleExportCSV = () => {
    const headers = 'ID Venda;Mesa;Data/Hora;Empregado;Cliente;NIF;Total;Pago;Saldo;Doc Fiscal\n';
    const rows = sales
      .map(
        (s) =>
          `"${s.id}";"${s.tableName}";"${formatDateTime(s.createdAt)}";"${s.waiterName}";"${s.customerName || ''}";"${s.customerNif || ''}";"${s.total.toFixed(
            2
          )}";"${s.paidAmount.toFixed(2)}";"${s.balanceDue.toFixed(2)}";"${s.documentNumber || 'N/A'}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `Relatorio_Vendas_Sabores_Nacoes_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  // Google Drive: Backup com confirmação do utilizador obrigatória
  const handleInitiateDriveBackup = () => {
    setDriveConfirmModal(true);
  };

  const handleExecuteDriveBackup = async () => {
    setDriveConfirmModal(false);
    setDriveSyncing(true);
    setDriveSuccessMsg('');

    try {
      let token = getDriveAccessToken();
      if (!token) {
        const authRes = await signInWithGoogleDrive();
        token = authRes.accessToken;
      }

      const reportPayload = {
        restaurante: settings.name,
        nif: settings.nif,
        geradoEm: new Date().toISOString(),
        vendasTotais: totalSales,
        valorRecebido: totalReceived,
        ticketMedio: averageTicket,
        faturasEmitidas: fiscalDocuments.length,
        distribuicaoPagamentos: paymentTotals,
        topProdutos: topProducts,
        vendas: sales,
        sessoesCaixa: cashSessions,
      };

      const fileName = `Sabores_Nacoes_Relatorio_Diario_${new Date().toISOString().slice(0, 10)}.json`;
      const uploaded = await uploadFileToDrive(
        fileName,
        JSON.stringify(reportPayload, null, 2),
        'application/json'
      );

      store.saveSettings({
        ...settings,
        lastDriveBackup: new Date().toISOString(),
      });

      setDriveSuccessMsg(`Cópia de segurança enviada para o Google Drive com sucesso! (Ficheiro: ${uploaded.name})`);
    } catch (err: any) {
      alert(err.message || 'Erro ao comunicar com o Google Drive');
    } finally {
      setDriveSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-900/90 p-5 rounded-2xl border border-stone-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-bold text-white">Relatórios Financeiros & Operacionais</h1>
            <p className="text-xs text-stone-400 mt-0.5">
              Análise de desempenho diário, ticket médio e exportação para contabilidade
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Botão de Backup para o Google Drive (Workspace Skill) */}
          <button
            disabled={driveSyncing}
            onClick={handleInitiateDriveBackup}
            className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all"
            title="Guardar relatório diário e cópia de segurança no Google Drive"
          >
            <CloudUpload className="w-4 h-4" />
            <span>{driveSyncing ? 'A enviar...' : 'Backup no Google Drive'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-xl border border-stone-700 flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Exportar CSV
          </button>

          <button
            onClick={() => window.print()}
            className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-xl border border-stone-700 flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            Imprimir Resumo
          </button>
        </div>
      </div>

      {driveSuccessMsg && (
        <div className="bg-emerald-950/60 text-emerald-300 text-xs p-3 rounded-xl border border-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{driveSuccessMsg}</span>
        </div>
      )}

      {/* KPI Cards de Relatório */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-stone-900 p-4 rounded-xl border border-stone-800 space-y-1">
          <span className="text-xs text-stone-400">Total Faturado / Vendido</span>
          <div className="font-mono text-xl md:text-2xl font-black text-amber-400">
            {formatCurrency(totalSales)}
          </div>
        </div>

        <div className="bg-stone-900 p-4 rounded-xl border border-stone-800 space-y-1">
          <span className="text-xs text-stone-400">Total Efetivamente Recebido</span>
          <div className="font-mono text-xl md:text-2xl font-black text-emerald-400">
            {formatCurrency(totalReceived)}
          </div>
        </div>

        <div className="bg-stone-900 p-4 rounded-xl border border-stone-800 space-y-1">
          <span className="text-xs text-stone-400">Ticket Médio por Venda</span>
          <div className="font-mono text-xl md:text-2xl font-black text-cyan-400">
            {formatCurrency(averageTicket)}
          </div>
        </div>

        <div className="bg-stone-900 p-4 rounded-xl border border-stone-800 space-y-1">
          <span className="text-xs text-stone-400">Total de Contas / Documentos</span>
          <div className="font-mono text-xl md:text-2xl font-black text-purple-400">
            {countSales} vendas ({totalInvoices} faturas)
          </div>
        </div>
      </div>

      {/* Grid: Métodos de Pagamento e Produtos Mais Vendidos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Distribuição por Forma de Pagamento */}
        <div className="bg-stone-900 rounded-2xl border border-stone-800 p-5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-amber-500" />
            Recebimentos por Forma de Pagamento
          </h2>

          <div className="space-y-2 pt-2 text-xs">
            <div className="flex justify-between items-center p-2.5 rounded-lg bg-stone-950 border border-stone-850">
              <span className="font-bold text-white">Dinheiro em Gaveta</span>
              <span className="font-mono font-bold text-emerald-400">
                {formatCurrency(paymentTotals.dinheiro)}
              </span>
            </div>

            <div className="flex justify-between items-center p-2.5 rounded-lg bg-stone-950 border border-stone-850">
              <span className="font-bold text-white">Cartão de Débito / Crédito</span>
              <span className="font-mono font-bold text-cyan-400">
                {formatCurrency(paymentTotals.cartao)}
              </span>
            </div>

            <div className="flex justify-between items-center p-2.5 rounded-lg bg-stone-950 border border-stone-850">
              <span className="font-bold text-white">MB Way</span>
              <span className="font-mono font-bold text-rose-400">
                {formatCurrency(paymentTotals.mbway)}
              </span>
            </div>

            <div className="flex justify-between items-center p-2.5 rounded-lg bg-stone-950 border border-stone-850">
              <span className="font-bold text-white">Transferência Bancária</span>
              <span className="font-mono font-bold text-amber-400">
                {formatCurrency(paymentTotals.transferencia)}
              </span>
            </div>
          </div>
        </div>

        {/* Top 5 Produtos Mais Vendidos */}
        <div className="bg-stone-900 rounded-2xl border border-stone-800 p-5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Produtos Mais Vendidos
          </h2>

          {topProducts.length === 0 ? (
            <div className="text-center py-8 text-stone-500 text-xs italic">
              Ainda não existem vendas consolidadas no período.
            </div>
          ) : (
            <div className="space-y-2 pt-2 text-xs">
              {topProducts.map((p, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center p-2.5 rounded-lg bg-stone-950 border border-stone-850"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-stone-800 text-stone-300 font-bold flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-white">{p.name}</span>
                  </div>

                  <div className="text-right font-mono">
                    <span className="font-bold text-amber-400">{p.qty} un.</span>
                    <span className="text-stone-400 text-[10px] ml-2">({formatCurrency(p.total)})</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Registo de Cancelamentos e Desperdício */}
      <div className="bg-stone-900 rounded-2xl border border-stone-800 p-5 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500" />
          Auditoria de Cancelamentos de Pedidos
        </h2>

        {cancelledItems.length === 0 ? (
          <div className="text-center py-4 text-stone-500 text-xs italic">
            Nenhum cancelamento registado nas comandas do restaurante.
          </div>
        ) : (
          <div className="space-y-2 text-xs">
            {cancelledItems.map((item, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-stone-950 border border-stone-850 flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-white">
                    {item.quantity}x {item.productName}
                  </span>
                  <div className="text-[10px] text-rose-400">
                    Motivo: {item.cancelReason || 'Sem motivo'} • Cancelado por: {item.cancelledBy || 'Operador'}
                  </div>
                </div>

                <div className="font-mono text-stone-400 text-right">
                  {formatCurrency(item.totalItemPrice)}
                  <div className="text-[10px] text-stone-500">{formatTime(item.statusUpdatedAt)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Obrigatório de Confirmação para Destrutivo/Gravação no Google Drive (Workspace Skill) */}
      {driveConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 text-stone-100">
            <div className="flex items-center gap-2 text-indigo-400 border-b border-stone-800 pb-3">
              <CloudUpload className="w-5 h-5" />
              <h3 className="font-bold text-sm text-white">
                Confirmar Envio para o Google Drive
              </h3>
            </div>

            <p className="text-xs text-stone-300 leading-relaxed">
              Está prestes a criar e guardar o ficheiro consolidado de relatório diário e fecho de turno no seu Google Drive pessoal/corporativo.
            </p>

            <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 text-xs space-y-1 font-mono">
              <div className="text-stone-400">
                Ficheiro: Sabores_Nacoes_Relatorio_Diario_{new Date().toISOString().slice(0, 10)}.json
              </div>
              <div className="text-stone-400">Total Vendas: {formatCurrency(totalSales)}</div>
              <div className="text-stone-400">Faturas Incluídas: {fiscalDocuments.length} documentos</div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
              <button
                onClick={() => setDriveConfirmModal(false)}
                className="px-3 py-1.5 bg-stone-800 text-stone-300 text-xs font-semibold rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleExecuteDriveBackup}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-md"
              >
                Sim, Enviar para o Google Drive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
