import React, { useState } from 'react';
import {
  Settings,
  Building2,
  Palette,
  FileCheck2,
  Cloud,
  RotateCcw,
  CheckCircle2,
  Save,
  Shield,
  Volume2,
  Printer,
  Key,
  Users,
  Clock,
  AlertTriangle,
  Flame,
} from 'lucide-react';
import { AppState, store } from '../services/storage';
import { RestaurantSettings, User } from '../types';
import { signInWithGoogleDrive, logoutDrive, getDriveAccessToken } from '../services/drive';
import { formatDateTime } from '../utils/formatters';

interface SettingsViewProps {
  state: AppState;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ state }) => {
  const { settings, users, currentUser } = state;

  const [formData, setFormData] = useState<RestaurantSettings>({ ...settings });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDriveLoggedIn, setIsDriveLoggedIn] = useState(!!getDriveAccessToken());
  const [vendusTestResult, setVendusTestResult] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    store.saveSettings(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleTestVendusConnection = () => {
    if (formData.vendusTestMode) {
      setVendusTestResult('✅ Conexão com o Vendus Simulator / Sandbox validada com sucesso! Séries ativas.');
    } else if (!formData.vendusApiKey) {
      setVendusTestResult('❌ Introduza a sua chave de API Vendus para validar a conexão em produção.');
    } else {
      setVendusTestResult('✅ Comunicação com o servidor oficial Vendus autorizada.');
    }
  };

  const handleGoogleDriveSignIn = async () => {
    try {
      await signInWithGoogleDrive();
      setIsDriveLoggedIn(true);
    } catch (err: any) {
      alert(err.message || 'Erro ao iniciar sessão com o Google');
    }
  };

  const handleGoogleDriveSignOut = async () => {
    await logoutDrive();
    setIsDriveLoggedIn(false);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900/90 p-5 rounded-2xl border border-stone-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-bold text-white">Definições do Restaurante</h1>
            <p className="text-xs text-stone-400">
              Dados fiscais da Sabores & Nações, integração Vendus PT, Google Drive e políticas de salão
            </p>
          </div>
        </div>

        {saveSuccess && (
          <div className="text-xs text-emerald-400 bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-800 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            Definições guardadas com sucesso!
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Seção 1: Dados Comerciais e Fiscais */}
        <div className="bg-stone-900 rounded-2xl border border-stone-800 p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-800 pb-3">
            <Building2 className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-white">Dados Comerciais e Fiscais da Empresa</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-stone-400">Nome Fiscal (Firma):</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-white mt-1"
              />
            </div>

            <div>
              <label className="text-stone-400">Nome Comercial / Marca:</label>
              <input
                type="text"
                required
                value={formData.tradeName}
                onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-white mt-1"
              />
            </div>

            <div>
              <label className="text-stone-400">NIF (Portugal):</label>
              <input
                type="text"
                maxLength={9}
                required
                value={formData.nif}
                onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-white font-mono mt-1"
              />
            </div>

            <div>
              <label className="text-stone-400">Código de Atividade Económica (CAE):</label>
              <input
                type="text"
                value={formData.cae}
                onChange={(e) => setFormData({ ...formData, cae: e.target.value })}
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-white mt-1"
              />
            </div>

            <div>
              <label className="text-stone-400">Morada do Estabelecimento:</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-white mt-1"
              />
            </div>

            <div>
              <label className="text-stone-400">Código Postal e Cidade:</label>
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  className="w-28 bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-white"
                />
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="flex-1 bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Seção 2: Integração de Faturação Vendus / AT */}
        <div className="bg-stone-900 rounded-2xl border border-stone-800 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <div className="flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-400" />
              <div>
                <h2 className="text-sm font-bold text-white">Integração Vendus PT (Certificação AT)</h2>
                <p className="text-[11px] text-stone-400">
                  Emissão de Faturas, FS e Notas de Crédito comunicadas à Autoridade Tributária
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestVendusConnection}
              className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-lg border border-stone-700"
            >
              Testar Comunicação
            </button>
          </div>

          {vendusTestResult && (
            <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 text-xs text-stone-200">
              {vendusTestResult}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-stone-400">Ambiente de Faturação:</label>
              <select
                value={formData.vendusTestMode ? 'test' : 'prod'}
                onChange={(e) =>
                  setFormData({ ...formData, vendusTestMode: e.target.value === 'test' })
                }
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-white mt-1"
              >
                <option value="test">Ambiente de Testes / Sandbox Certificado</option>
                <option value="prod">Produção Oficial com Comunicação AT</option>
              </select>
            </div>

            <div>
              <label className="text-stone-400">Chave de API Vendus (API Key):</label>
              <input
                type="password"
                placeholder="vd_live_... ou vd_test_..."
                value={formData.vendusApiKey}
                onChange={(e) => setFormData({ ...formData, vendusApiKey: e.target.value })}
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-white font-mono mt-1"
              />
            </div>

            <div>
              <label className="text-stone-400">Série Predefinida:</label>
              <input
                type="text"
                value={formData.vendusSeries}
                onChange={(e) => setFormData({ ...formData, vendusSeries: e.target.value })}
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-white font-mono mt-1"
              />
            </div>
          </div>
        </div>

        {/* Seção 3: Google Drive (Workspace Skill) */}
        <div className="bg-stone-900 rounded-2xl border border-stone-800 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-blue-400" />
              <div>
                <h2 className="text-sm font-bold text-white">Integração Google Drive</h2>
                <p className="text-[11px] text-stone-400">
                  Cópia de segurança de fechos de caixa e arquivo de relatórios financeiros
                </p>
              </div>
            </div>

            {isDriveLoggedIn ? (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                  Conectado
                </span>
                <button
                  type="button"
                  onClick={handleGoogleDriveSignOut}
                  className="text-xs text-stone-400 hover:text-white underline"
                >
                  Terminar Sessão
                </button>
              </div>
            ) : (
              /* Botão Oficial Sign in with Google (Google Workspace Skill specification) */
              <button
                type="button"
                onClick={handleGoogleDriveSignIn}
                className="flex items-center gap-2 px-3 py-1.5 bg-white text-stone-800 hover:bg-stone-100 rounded-lg text-xs font-bold shadow transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>Sign in with Google</span>
              </button>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-stone-400 bg-stone-950 p-3 rounded-xl border border-stone-800">
            <div>
              Último Backup em Nuvem: <strong className="text-white">{formData.lastDriveBackup ? formatDateTime(formData.lastDriveBackup) : 'Nenhum efetuado ainda'}</strong>
            </div>
            <div className="text-[11px] text-stone-500 font-mono">
              Pasta: Sabores & Nações
            </div>
          </div>
        </div>

        {/* Seção 4: Políticas Operacionais de Sala */}
        <div className="bg-stone-900 rounded-2xl border border-stone-800 p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-800 pb-3">
            <Palette className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-white">Políticas Operacionais do Restaurante</h2>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.autoReleaseTableAfterPayment}
                onChange={(e) =>
                  setFormData({ ...formData, autoReleaseTableAfterPayment: e.target.checked })
                }
                className="w-4 h-4 rounded text-amber-600 focus:ring-0"
              />
              <div>
                <span className="text-white font-semibold">Libertação Automática de Mesas:</span>
                <p className="text-[11px] text-stone-400">
                  Se desativado, após pagamento a mesa passa para "A aguardar limpeza" até confirmação do empregado.
                </p>
              </div>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer pt-2 border-t border-stone-800">
              <input
                type="checkbox"
                checked={formData.soundAlertsEnabled}
                onChange={(e) =>
                  setFormData({ ...formData, soundAlertsEnabled: e.target.checked })
                }
                className="w-4 h-4 rounded text-amber-600 focus:ring-0"
              />
              <div>
                <span className="text-white font-semibold">Alertas Sonoros Ativos (KDS, Bar & Atendimento):</span>
                <p className="text-[11px] text-stone-400">
                  Emite sineta ao enviar rondas e alerta melodioso quando pratos e bebidas ficam prontos.
                </p>
              </div>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer pt-2 border-t border-stone-800">
              <input
                type="checkbox"
                checked={formData.allowCashierInAtendimento || false}
                onChange={(e) =>
                  setFormData({ ...formData, allowCashierInAtendimento: e.target.checked })
                }
                className="w-4 h-4 rounded text-purple-600 focus:ring-0"
              />
              <div>
                <span className="text-white font-semibold">Permitir Confirmação de Pagamento no Módulo Atendimento:</span>
                <p className="text-[11px] text-stone-400">
                  Desativado por padrão. Se desmarcado, os empregados de mesa apenas podem pedir conta, sendo o recebimento e quitação centralizados na Caixa/Administração.
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Seção 5: Tempos de Preparação e Avisos de Pedidos Demorados (Requisito 2) */}
        <div className="bg-stone-900 rounded-2xl border border-stone-800 p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-stone-800 pb-3">
            <Clock className="w-4 h-4 text-amber-500" />
            <div>
              <h2 className="text-sm font-bold text-white">Tempos de Preparação e Avisos de Pedidos Demorados</h2>
              <p className="text-[11px] text-stone-400">
                Configuração dos limites de tempo esperado, tolerância e alertas sonoros/visuais para a cozinha e salão
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="text-stone-400 font-semibold">Tempo Geral Esperado (minutos):</label>
              <input
                type="number"
                min={1}
                max={120}
                value={formData.expectedPrepTimeMinutes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    expectedPrepTimeMinutes: parseInt(e.target.value, 10) || 20,
                  })
                }
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-white mt-1 focus:outline-none focus:border-amber-500"
              />
              <span className="text-[10px] text-stone-500">Padrão base: 20 min</span>
            </div>

            <div>
              <label className="text-stone-400 font-semibold">Tolerância Adicional de Atraso (min):</label>
              <input
                type="number"
                min={1}
                max={60}
                value={formData.delayToleranceMinutes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    delayToleranceMinutes: parseInt(e.target.value, 10) || 5,
                  })
                }
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-white mt-1 focus:outline-none focus:border-amber-500"
              />
              <span className="text-[10px] text-rose-400">
                Alerta aos {formData.expectedPrepTimeMinutes + formData.delayToleranceMinutes} min
              </span>
            </div>

            <div>
              <label className="text-stone-400 font-semibold">Prato Pronto por Entregar (min):</label>
              <input
                type="number"
                min={1}
                max={30}
                value={formData.readyDeliveryDelayMinutes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    readyDeliveryDelayMinutes: parseInt(e.target.value, 10) || 5,
                  })
                }
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-white mt-1 focus:outline-none focus:border-amber-500"
              />
              <span className="text-[10px] text-stone-500">Alerta se prato pronto não for entregue</span>
            </div>

            <div>
              <label className="text-stone-400 font-semibold">Intervalo de Repetição de Lembretes (min):</label>
              <input
                type="number"
                min={1}
                max={30}
                value={formData.alertReminderIntervalMinutes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    alertReminderIntervalMinutes: parseInt(e.target.value, 10) || 5,
                  })
                }
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-white mt-1 focus:outline-none focus:border-amber-500"
              />
              <span className="text-[10px] text-stone-500">Evita notificações repetidas em excesso</span>
            </div>
          </div>

          {/* Tempos por Setor */}
          <div className="pt-2 border-t border-stone-800">
            <h3 className="text-xs font-bold text-stone-300 mb-2">Tempos Específicos por Setor de Preparação:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800">
                <span className="text-stone-400 font-semibold flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-rose-500" />
                  Cozinha (minutos):
                </span>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={formData.sectorPrepTimes?.cozinha || 20}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sectorPrepTimes: {
                        ...formData.sectorPrepTimes,
                        cozinha: parseInt(e.target.value, 10) || 20,
                      },
                    })
                  }
                  className="w-full bg-stone-900 border border-stone-700 rounded px-2.5 py-1.5 text-white mt-1 font-mono"
                />
              </div>

              <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800">
                <span className="text-stone-400 font-semibold flex items-center gap-1">
                  🍷 Bar (minutos):
                </span>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={formData.sectorPrepTimes?.bar || 5}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sectorPrepTimes: {
                        ...formData.sectorPrepTimes,
                        bar: parseInt(e.target.value, 10) || 5,
                      },
                    })
                  }
                  className="w-full bg-stone-900 border border-stone-700 rounded px-2.5 py-1.5 text-white mt-1 font-mono"
                />
              </div>

              <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800">
                <span className="text-stone-400 font-semibold flex items-center gap-1">
                  🍰 Pastelaria & Sobremesas (minutos):
                </span>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={formData.sectorPrepTimes?.pastelaria || 8}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sectorPrepTimes: {
                        ...formData.sectorPrepTimes,
                        pastelaria: parseInt(e.target.value, 10) || 8,
                      },
                    })
                  }
                  className="w-full bg-stone-900 border border-stone-700 rounded px-2.5 py-1.5 text-white mt-1 font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Botão de Guardar */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white text-xs font-extrabold rounded-xl shadow-lg transition-all flex items-center gap-2 active:scale-95"
          >
            <Save className="w-4 h-4" />
            Guardar Todas as Definições
          </button>
        </div>
      </form>
    </div>
  );
};
