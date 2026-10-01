import React, { useState } from 'react';
import {
  QrCode,
  X,
  Printer,
  RotateCw,
  Bell,
  FileText,
  BookOpen,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import { Table, TableCall } from '../types';
import { store } from '../services/storage';

interface TableQRModalProps {
  table: Table | null;
  onClose: () => void;
  onSelectTab: (tab: any) => void;
}

export const TableQRModal: React.FC<TableQRModalProps> = ({ table, onClose, onSelectTab }) => {
  const [activeCallStatus, setActiveCallStatus] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  if (!table) return null;

  const qrUrl = `https://saboresenacoes.pt/mesa/${table.qrCodeToken}`;

  const handleSimulateCustomerCall = (type: 'chamar_empregado' | 'pedir_conta') => {
    if (cooldownSeconds > 0) return;

    try {
      const call = store.createTableCall(table.id, type);
      setActiveCallStatus(
        type === 'chamar_empregado'
          ? 'Empregado chamado com sucesso! A equipa da Sabores & Nações já foi notificada.'
          : 'Pedido de conta enviado ao operador de caixa.'
      );
      setCooldownSeconds(30);

      const interval = setInterval(() => {
        setCooldownSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      alert(err.message || 'Erro ao chamar empregado');
    }
  };

  const handleRegenerateToken = () => {
    if (
      confirm(
        'Tem a certeza que deseja gerar um novo QR Code? O código impresso atual deixará de funcionar imediatamente.'
      )
    ) {
      store.regenerateTableQrToken(table.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-stone-100">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-amber-500" />
            <div>
              <h2 className="text-base font-bold text-white">QR Code Exclusivo: {table.number}</h2>
              <p className="text-xs text-stone-400">
                {table.roomName} • Chamadas de atendimento, consulta de cardápio e pedido de conta
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Cartão de Mesa para Impressão */}
            <div className="bg-white text-stone-950 p-6 rounded-2xl shadow-xl border border-stone-300 flex flex-col items-center text-center space-y-3">
              <div className="text-[10px] tracking-widest font-extrabold uppercase text-amber-700">
                SABORES & NAÇÕES • LISBOA
              </div>

              <div className="p-4 border-2 border-stone-900 rounded-xl bg-stone-50 flex flex-col items-center">
                <QrCode className="w-36 h-36 text-stone-950" />
                <span className="text-[9px] font-mono text-stone-600 mt-1">TOKEN: {table.qrCodeToken}</span>
              </div>

              <div>
                <h3 className="text-lg font-black text-stone-900">{table.number}</h3>
                <p className="text-xs text-stone-600 font-medium">Aponte a câmara do telemóvel para aceder</p>
              </div>

              <div className="pt-2 border-t border-dashed border-stone-300 w-full text-[10px] text-stone-500 space-y-0.5">
                <div>• Chamar Empregado</div>
                <div>• Consultar Cardápio</div>
                <div>• Pedir a Conta</div>
              </div>
            </div>

            {/* Ações e Simulador do Cliente */}
            <div className="space-y-4">
              <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-amber-400" />
                    Simulador: Portal Público do Cliente
                  </span>
                  <span className="text-[10px] text-stone-500 font-mono">Sem login</span>
                </div>

                <p className="text-[11px] text-stone-400">
                  Esta é a interface simplificada aberta pelo cliente na mesa ao ler o QR Code:
                </p>

                {table.activeCall && (
                  <div className="p-2.5 rounded-lg bg-amber-950/60 border border-amber-800 text-amber-200 text-xs space-y-1">
                    <div className="font-bold flex items-center justify-between">
                      <span>Chamado em Curso:</span>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-amber-900 rounded">
                        {table.activeCall.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="text-[10px] text-amber-300/80">
                      {table.activeCall.handledByName
                        ? `Em atendimento por ${table.activeCall.handledByName}`
                        : 'Aguardando aceitação de um funcionário...'}
                    </div>
                  </div>
                )}

                {activeCallStatus && (
                  <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{activeCallStatus}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <button
                    disabled={cooldownSeconds > 0}
                    onClick={() => handleSimulateCustomerCall('chamar_empregado')}
                    className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
                  >
                    <Bell className="w-4 h-4" />
                    <span>
                      {cooldownSeconds > 0
                        ? `Aguarde ${cooldownSeconds}s antes de chamar novamente`
                        : 'Chamar Empregado de Mesa'}
                    </span>
                  </button>

                  <button
                    disabled={cooldownSeconds > 0}
                    onClick={() => handleSimulateCustomerCall('pedir_conta')}
                    className="w-full py-2.5 bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-stone-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 border border-stone-700 transition-all"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Pedir a Conta</span>
                  </button>

                  <button
                    onClick={() => {
                      onClose();
                      onSelectTab('cardapio');
                    }}
                    className="w-full py-2 bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white text-xs rounded-xl flex items-center justify-center gap-2 transition-colors"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Ver Cardápio Digital da Casa</span>
                  </button>
                </div>
              </div>

              {/* Botões de Gestão do QR Code */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-xl border border-stone-700 flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir Placa de Mesa
                </button>

                <button
                  onClick={handleRegenerateToken}
                  className="p-2 bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white rounded-xl border border-stone-700"
                  title="Substituir QR Code (Gerar novo token)"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-stone-950 border-t border-stone-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold rounded-lg"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
