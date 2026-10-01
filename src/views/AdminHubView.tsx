import React, { useState } from 'react';
import {
  LayoutDashboard,
  FileCheck2,
  Wallet,
  Receipt,
  Grid3X3,
  BookOpen,
  Users,
  Boxes,
  BarChart3,
  Settings,
  Flame,
  Wine,
  Globe,
  Plus,
  ArrowRight,
  Shield,
  Layers,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react';
import { AppState, store } from '../services/storage';
import { FiscalDocument, ModuleType } from '../types';
import { DashboardView } from './DashboardView';
import { InvoicesView } from './InvoicesView';
import { CashierView } from './CashierView';
import { SalesView } from './SalesView';
import { TablesView } from './TablesView';
import { MenuView } from './MenuView';
import { CustomersView } from './CustomersView';
import { UsersView } from './UsersView';
import { StockView } from './StockView';
import { ReportsView } from './ReportsView';
import { SettingsView } from './SettingsView';
import { OnlineOrdersView } from './OnlineOrdersView';
import { AdHocInvoiceModal } from '../components/AdHocInvoiceModal';

export type AdminSubTab =
  | 'dashboard'
  | 'faturacao'
  | 'caixa'
  | 'vendas'
  | 'operacional'
  | 'pedidos_site'
  | 'cardapio'
  | 'clientes'
  | 'utilizadores'
  | 'stock'
  | 'relatorios'
  | 'definicoes';

interface AdminHubViewProps {
  state: AppState;
  onViewReceipt: (doc: FiscalDocument) => void;
  onSwitchModule: (module: ModuleType) => void;
  initialSubTab?: AdminSubTab;
}

export const AdminHubView: React.FC<AdminHubViewProps> = ({
  state,
  onViewReceipt,
  onSwitchModule,
  initialSubTab = 'dashboard',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<AdminSubTab>(initialSubTab);
  const [adHocModalOpen, setAdHocModalOpen] = useState(false);

  const { comandas, sales, fiscalDocuments, onlineOrders, settings, isOnline } = state;

  // Badges e contadores
  const pendingInvoicesCount = sales.filter((s) => s.status === 'paga' && s.fiscalStatus !== 'faturado').length;
  const requestedBillsCount = comandas.filter((c) => c.status === 'conta_solicitada').length;
  const pendingSiteOrders = onlineOrders.filter((o) => o.prepStatus !== 'entregue').length;

  const navCategories = [
    {
      group: 'Financeiro & Controlo',
      items: [
        { id: 'dashboard' as AdminSubTab, label: 'Painel Geral', icon: LayoutDashboard },
        {
          id: 'faturacao' as AdminSubTab,
          label: 'Faturação',
          icon: FileCheck2,
          badge: pendingInvoicesCount > 0 ? `${pendingInvoicesCount}` : undefined,
          badgeColor: 'bg-amber-600 text-white',
        },
        {
          id: 'caixa' as AdminSubTab,
          label: 'Caixa & Pagamentos',
          icon: Wallet,
          badge: requestedBillsCount > 0 ? `Conta!` : undefined,
          badgeColor: 'bg-orange-500 text-white animate-bounce',
        },
        { id: 'vendas' as AdminSubTab, label: 'Gestão de Vendas', icon: Receipt },
      ],
    },
    {
      group: 'Operações & Salas',
      items: [
        { id: 'operacional' as AdminSubTab, label: 'Mesas & Salas', icon: Grid3X3 },
        {
          id: 'pedidos_site' as AdminSubTab,
          label: 'Pedidos do Site',
          icon: Globe,
          badge: pendingSiteOrders > 0 ? `${pendingSiteOrders}` : undefined,
          badgeColor: 'bg-cyan-600 text-white',
        },
      ],
    },
    {
      group: 'Cadastros & Equipa',
      items: [
        { id: 'cardapio' as AdminSubTab, label: 'Cardápio & Setores', icon: BookOpen },
        { id: 'clientes' as AdminSubTab, label: 'Clientes & Planos', icon: Users },
        { id: 'utilizadores' as AdminSubTab, label: 'Utilizadores & Permissões', icon: Shield },
        { id: 'stock' as AdminSubTab, label: 'Stock & Inventário', icon: Boxes },
      ],
    },
    {
      group: 'Estratégia & Sistema',
      items: [
        { id: 'relatorios' as AdminSubTab, label: 'Relatórios', icon: BarChart3 },
        { id: 'definicoes' as AdminSubTab, label: 'Definições & Fisco', icon: Settings },
      ],
    },
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Banner de Alternância Rápida entre os 4 Módulos mantendo a Identificação do Administrador */}
      <div className="bg-stone-900/90 border border-purple-900/40 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-bold text-stone-200">
            Painel do Administrador ({state.currentUser.name})
          </span>
          <span className="text-[10px] bg-purple-950 text-purple-300 border border-purple-800/80 px-2 py-0.5 rounded-full font-mono">
            Acesso Total aos 4 Módulos
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-stone-400 font-semibold mr-0.5">Alternar para:</span>
          <button
            onClick={() => onSwitchModule('atendimento')}
            className="px-2.5 py-1 bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-800/80 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
            title="Ir para o módulo Atendimento com sessão de Administrador"
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>Atendimento</span>
          </button>
          <button
            onClick={() => onSwitchModule('cozinha')}
            className="px-2.5 py-1 bg-orange-950/60 hover:bg-orange-900/80 text-orange-300 border border-orange-800/80 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
            title="Ir para o KDS Cozinha com sessão de Administrador"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Cozinha</span>
          </button>
          <button
            onClick={() => onSwitchModule('bar')}
            className="px-2.5 py-1 bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-800/80 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
            title="Ir para o BDS Bar com sessão de Administrador"
          >
            <Wine className="w-3.5 h-3.5" />
            <span>Bar</span>
          </button>
        </div>
      </div>

      {/* Sub-navegação em Categorias da Administração */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-2.5 shadow-xl">
        <div className="flex items-center justify-between px-2 pb-2 mb-2 border-b border-stone-800/80">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
            <span className="text-xs font-extrabold text-stone-200 uppercase tracking-wider">
              Área de Gestão & Administração
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAdHocModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg shadow transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Fatura Avulsa</span>
            </button>
          </div>
        </div>

        {/* Barra de Abas Scrollável */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1">
          {navCategories.flatMap((cat) => cat.items).map((item) => {
            const Icon = item.icon;
            const isActive = activeSubTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveSubTab(item.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all relative shrink-0 ${
                  isActive
                    ? 'bg-purple-700 text-white shadow-md shadow-purple-950/40 ring-1 ring-purple-500/50'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/80'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${item.badgeColor || 'bg-stone-700 text-white'}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Renderização do Conteúdo da Sub-Aba Selecionada */}
      <div>
        {activeSubTab === 'dashboard' && (
          <DashboardView
            state={state}
            onSelectTab={(tab) => {
              if (tab === 'faturas') setActiveSubTab('faturacao');
              else if (tab === 'caixa') setActiveSubTab('caixa');
              else if (tab === 'vendas') setActiveSubTab('vendas');
              else if (tab === 'mesas') setActiveSubTab('operacional');
              else if (tab === 'pedidos_site') setActiveSubTab('pedidos_site');
              else if (tab === 'atendimento') onSwitchModule('atendimento');
              else if (tab === 'cozinha') onSwitchModule('cozinha');
              else if (tab === 'bar') onSwitchModule('bar');
            }}
            onViewReceipt={onViewReceipt}
          />
        )}

        {activeSubTab === 'faturacao' && (
          <InvoicesView state={state} onViewReceipt={onViewReceipt} />
        )}

        {activeSubTab === 'caixa' && (
          <CashierView
            state={state}
            onViewReceipt={onViewReceipt}
            onSelectTab={(tab) => {
              if (tab === 'faturas') setActiveSubTab('faturacao');
              else if (tab === 'painel') setActiveSubTab('dashboard');
            }}
          />
        )}

        {activeSubTab === 'vendas' && (
          <SalesView
            state={state}
            onViewReceipt={onViewReceipt}
            onSelectTab={(tab) => {
              if (tab === 'faturas') setActiveSubTab('faturacao');
              else if (tab === 'caixa') setActiveSubTab('caixa');
            }}
          />
        )}

        {activeSubTab === 'operacional' && (
          <TablesView
            state={state}
            onSelectTab={(tab) => {
              if (tab === 'atendimento') onSwitchModule('atendimento');
              else if (tab === 'caixa') setActiveSubTab('caixa');
            }}
          />
        )}

        {activeSubTab === 'pedidos_site' && (
          <OnlineOrdersView state={state} onViewReceipt={onViewReceipt} />
        )}

        {activeSubTab === 'cardapio' && <MenuView state={state} />}

        {activeSubTab === 'clientes' && <CustomersView state={state} />}

        {activeSubTab === 'utilizadores' && <UsersView state={state} />}

        {activeSubTab === 'stock' && <StockView state={state} />}

        {activeSubTab === 'relatorios' && <ReportsView state={state} />}

        {activeSubTab === 'definicoes' && <SettingsView state={state} />}
      </div>

      {/* Modal Faturação Avulsa */}
      <AdHocInvoiceModal
        isOpen={adHocModalOpen}
        onClose={() => setAdHocModalOpen(false)}
        state={state}
        onViewReceipt={(doc) => onViewReceipt(doc)}
      />
    </div>
  );
};
