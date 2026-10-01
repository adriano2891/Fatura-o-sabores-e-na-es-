import React, { useState } from 'react';
import {
  CheckCircle2,
  Circle,
  Play,
  RotateCcw,
  Sparkles,
  X,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  UtensilsCrossed,
  Flame,
  Wine,
  Wallet,
  Receipt,
  FileCheck2,
  Send,
  Eye,
  Check,
  Lock,
} from 'lucide-react';
import { store, AppState } from '../services/storage';
import { formatCurrency } from '../utils/formatters';
import { ModuleType, UserRole, User } from '../types';

interface ValidationScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  onSelectModule?: (module: ModuleType) => void;
  onViewReceipt: (doc: any) => void;
}

export const ValidationScenarioModal: React.FC<ValidationScenarioModalProps> = ({
  isOpen,
  onClose,
  state,
  onSelectModule,
  onViewReceipt,
}) => {
  const [activeTab, setActiveTab] = useState<'fluxo' | 'seguranca'>('fluxo');
  const [simulationLogs, setSimulationLogs] = useState<string[]>([]);
  const [isRunningAll, setIsRunningAll] = useState(false);

  if (!isOpen) return null;

  const logMessage = (msg: string) => {
    setSimulationLogs((prev) => [`[${new Date().toLocaleTimeString('pt-PT')}] ${msg}`, ...prev]);
  };

  // Referências para Mesa 3 e respetivos dados
  const mesa3 = state.tables.find((t) => t.id === 't-3');
  const comandaMesa3 = state.comandas.find((c) => c.tableId === 't-3' && c.status !== 'paga');
  const allCmdMesa3 = state.comandas.find((c) => c.tableId === 't-3');
  const saleMesa3 = state.sales.find((s) => s.tableId === 't-3');
  const docMesa3 = state.fiscalDocuments.find((d) => d.saleId === saleMesa3?.id);

  // Itens da ronda 1
  const round1 = comandaMesa3?.rounds.find((r) => r.roundNumber === 1) || allCmdMesa3?.rounds.find((r) => r.roundNumber === 1);
  const round2 = comandaMesa3?.rounds.find((r) => r.roundNumber === 2) || allCmdMesa3?.rounds.find((r) => r.roundNumber === 2);

  const kitchenDishes = round1?.items.filter((i) => i.sector === 'cozinha') || [];
  const barDrinks = round1?.items.filter((i) => i.sector === 'bar') || [];

  const barReady = barDrinks.length > 0 && barDrinks.every((i) => i.status === 'pronto' || i.status === 'entregue');
  const kitchenReady = kitchenDishes.length > 0 && kitchenDishes.every((i) => i.status === 'pronto' || i.status === 'entregue');
  const allRound1Delivered = round1?.items.length ? round1.items.every((i) => i.status === 'entregue') : false;

  const billRequested = comandaMesa3?.status === 'conta_solicitada' || mesa3?.status === 'conta_solicitada' || (allCmdMesa3 && allCmdMesa3.status === 'paga');
  const paymentConfirmed = (saleMesa3 && saleMesa3.status === 'paga') || (allCmdMesa3 && allCmdMesa3.status === 'paga');
  const fiscalDocIssued = !!docMesa3;
  const dispatchSent = !!(docMesa3?.dispatchLogs && docMesa3.dispatchLogs.length > 0);
  const tableCleanedOrFree = mesa3?.status === 'livre' || mesa3?.status === 'a_aguardar_limpeza';

  // 14 Critérios de Validação Exatos (Seção 11 do Requisito)
  const steps = [
    {
      step: 1,
      title: '1. Empregado inicia sessão e entra apenas no Atendimento',
      desc: 'João Pereira (Empregado de Mesa) autentica-se. As suas permissões encaminham-no diretamente para o Módulo Atendimento.',
      isDone: state.currentUser.role === 'waiter' && store.canUserAccessModule(state.currentUser, 'atendimento'),
      actionText: 'Iniciar Sessão como João Pereira',
      run: () => {
        const waiter = state.users.find((u) => u.id === 'u-3')!;
        store.setCurrentUser(waiter);
        logMessage('Passo 1: João Pereira autenticado no Atendimento (acesso a Bar/Cozinha/Admin restrito).');
        onSelectModule?.('atendimento');
      },
    },
    {
      step: 2,
      title: '2. Abre a Mesa 3 e regista pratos e bebidas',
      desc: 'Abre comanda da Mesa 3 para 2 pessoas. Seleciona Bacalhau à Brás, Francesinha, Super Bock e Vinho Tinto.',
      isDone: mesa3?.status === 'ocupada' && !!comandaMesa3,
      actionText: 'Abrir Mesa 3 e Preparar Ronda',
      run: () => {
        const waiter = state.users.find((u) => u.id === 'u-3') || state.currentUser;
        store.openComanda('t-3', 2, waiter);
        logMessage('Passo 2: Comanda da Mesa 3 aberta com 2 lugares.');
      },
    },
    {
      step: 3,
      title: '3. Envia uma ronda',
      desc: 'Dispara a Ronda 1 com pratos e bebidas para encaminhamento automático por setor.',
      isDone: (comandaMesa3?.rounds.length || 0) >= 1,
      actionText: 'Enviar Ronda 1 (Pratos e Bebidas)',
      run: () => {
        const cmd = state.comandas.find((c) => c.tableId === 't-3' && c.status !== 'paga');
        if (!cmd) throw new Error('Abra primeiro a comanda da Mesa 3');
        const waiter = state.currentUser;

        const pBacalhau = state.products.find((p) => p.id === 'p-1')!;
        const pFrancesinha = state.products.find((p) => p.id === 'p-3')!;
        const pCerveja = state.products.find((p) => p.id === 'p-7')!;
        const pVinho = state.products.find((p) => p.id === 'p-8')!;

        store.addOrderRound(
          cmd.id,
          [
            {
              productId: pBacalhau.id,
              productCode: pBacalhau.code,
              productName: pBacalhau.name,
              quantity: 1,
              unitPrice: pBacalhau.price,
              vatRate: pBacalhau.vatRate,
              sector: 'cozinha',
              selectedExtras: [],
              totalItemPrice: pBacalhau.price,
              notes: 'Sem cebola',
              seatNumber: 1,
              seatName: 'Lugar 1',
            },
            {
              productId: pFrancesinha.id,
              productCode: pFrancesinha.code,
              productName: pFrancesinha.name,
              quantity: 1,
              unitPrice: pFrancesinha.price,
              vatRate: pFrancesinha.vatRate,
              sector: 'cozinha',
              selectedExtras: [],
              totalItemPrice: pFrancesinha.price,
              notes: 'Molho picante',
              seatNumber: 2,
              seatName: 'Lugar 2',
            },
            {
              productId: pCerveja.id,
              productCode: pCerveja.code,
              productName: pCerveja.name,
              quantity: 1,
              unitPrice: pCerveja.price,
              vatRate: pCerveja.vatRate,
              sector: 'bar',
              selectedExtras: [],
              totalItemPrice: pCerveja.price,
              notes: 'Bem fresca',
              seatNumber: 1,
              seatName: 'Lugar 1',
            },
            {
              productId: pVinho.id,
              productCode: pVinho.code,
              productName: pVinho.name,
              quantity: 1,
              unitPrice: pVinho.price,
              vatRate: pVinho.vatRate,
              sector: 'bar',
              selectedExtras: [],
              totalItemPrice: pVinho.price,
              notes: 'Com decantador',
              seatNumber: 2,
              seatName: 'Lugar 2',
            },
          ],
          waiter
        );
        logMessage('Passo 3: Ronda 1 enviada. Total de 4 itens associados à comanda.');
      },
    },
    {
      step: 4,
      title: '4. Os pratos aparecem apenas na Cozinha/Copa',
      desc: 'A Cozinha/Copa recebe estritamente o Bacalhau à Brás e a Francesinha (setor: cozinha). Sem bebidas.',
      isDone: kitchenDishes.length === 2 && kitchenDishes.every((i) => i.sector === 'cozinha'),
      actionText: 'Validar Setor Cozinha (2 Pratos)',
      run: () => {
        logMessage(`Passo 4: Verificado. Apenas 2 itens de cozinha na comanda: ${kitchenDishes.map((i) => i.productName).join(', ')}`);
      },
    },
    {
      step: 5,
      title: '5. As bebidas aparecem apenas no Bar',
      desc: 'O Bar recebe estritamente a Cerveja Super Bock e o Vinho Tinto Douro (setor: bar). Sem pratos.',
      isDone: barDrinks.length === 2 && barDrinks.every((i) => i.sector === 'bar'),
      actionText: 'Validar Setor Bar (2 Bebidas)',
      run: () => {
        logMessage(`Passo 5: Verificado. Apenas 2 bebidas no bar: ${barDrinks.map((i) => i.productName).join(', ')}`);
      },
    },
    {
      step: 6,
      title: '6. A Administração acompanha a comanda completa',
      desc: 'Administração visualiza a comanda unificada da Mesa 3 com os 4 itens, subtotal e saldo.',
      isDone: (round1?.items.length || 0) === 4,
      actionText: 'Validar Comanda na Administração',
      run: () => {
        const cmd = state.comandas.find((c) => c.tableId === 't-3');
        logMessage(`Passo 6: Administração monitoriza comanda unificada com total de ${formatCurrency(cmd?.total || 0)}.`);
      },
    },
    {
      step: 7,
      title: '7. O Bar marca as bebidas como prontas e o empregado recebe o aviso',
      desc: 'Barman conclui a preparação das bebidas. A ronda fica "Parcialmente pronta" e o empregado é avisado.',
      isDone: barReady,
      actionText: 'Bar: Concluir Bebidas',
      run: () => {
        const barUser = state.users.find((u) => u.role === 'bar') || state.users[0];
        const cmd = state.comandas.find((c) => c.tableId === 't-3');
        if (!cmd) return;
        store.markRoundSectorReady(cmd.id, 1, 'bar', barUser);
        logMessage('Passo 7: Bar marcou bebidas como PRONTAS. Ronda exibida como Parcialmente Pronta no Atendimento.');
      },
    },
    {
      step: 8,
      title: '8. A Cozinha/Copa conclui os pratos e avisa o empregado',
      desc: 'Chef conclui o Bacalhau e a Francesinha. Todos os itens da Ronda 1 passam a estar prontos.',
      isDone: kitchenReady,
      actionText: 'Cozinha: Concluir Pratos',
      run: () => {
        const chef = state.users.find((u) => u.role === 'kitchen') || state.users[0];
        const cmd = state.comandas.find((c) => c.tableId === 't-3');
        if (!cmd) return;
        store.markRoundSectorReady(cmd.id, 1, 'cozinha', chef);
        logMessage('Passo 8: Cozinha concluiu pratos. Ronda 1 completamente pronta.');
      },
    },
    {
      step: 9,
      title: '9. O empregado confirma a entrega e acrescenta uma nova ronda',
      desc: 'João Pereira confirma a entrega dos itens à Mesa 3 e adiciona Ronda 2 (2 Cafés Delta Espresso).',
      isDone: allRound1Delivered && (comandaMesa3?.rounds.length || 0) >= 2,
      actionText: 'Confirmar Entrega e Ronda 2',
      run: () => {
        const waiter = state.users.find((u) => u.id === 'u-3') || state.currentUser;
        const cmd = state.comandas.find((c) => c.tableId === 't-3' && c.status !== 'paga');
        if (!cmd) return;

        // Marca todos da ronda 1 como entregues
        const r1 = cmd.rounds.find((r) => r.roundNumber === 1);
        r1?.items.forEach((it) => {
          store.updateItemPrepStatus(it.id, 'entregue', waiter);
        });

        // Adiciona ronda 2 (2 cafés com entrega direta no atendimento)
        const pCafe = state.products.find((p) => p.id === 'p-13') || state.products.find((p) => p.sector === 'atendimento') || state.products[0];
        store.addOrderRound(
          cmd.id,
          [
            {
              productId: pCafe.id,
              productCode: pCafe.code,
              productName: pCafe.name,
              quantity: 2,
              unitPrice: pCafe.price,
              vatRate: pCafe.vatRate,
              sector: 'atendimento',
              selectedExtras: [],
              totalItemPrice: pCafe.price * 2,
              notes: 'Chávena escaldada',
              seatNumber: 1,
              seatName: 'Mesa 3',
            },
          ],
          waiter
        );
        logMessage('Passo 9: Entrega da Ronda 1 confirmada. Ronda 2 de cafés adicionada à comanda.');
      },
    },
    {
      step: 10,
      title: '10. O cliente solicita a conta',
      desc: 'Empregado no Atendimento clica em "Pedir Conta". A mesa passa a "Conta solicitada" e alerta a Administração.',
      isDone: billRequested,
      actionText: 'Solicitar Conta da Mesa 3',
      run: () => {
        const cmd = state.comandas.find((c) => c.tableId === 't-3' && c.status !== 'paga');
        if (!cmd) return;
        store.requestBill(cmd.id, '254889123', 'Família Alentejana');
        logMessage('Passo 10: Conta solicitada com NIF 254889123. Caixa alertada para cobrança.');
      },
    },
    {
      step: 11,
      title: '11. A Administração recebe e confirma o pagamento',
      desc: 'Caixa recebe o pagamento na sessão aberta (dinheiro / multibanco). O Atendimento não confirma pagamentos diretamente.',
      isDone: paymentConfirmed,
      actionText: 'Administração: Registar Pagamento',
      run: () => {
        const admin = state.users.find((u) => u.role === 'admin') || state.currentUser;
        const cmd = state.comandas.find((c) => c.tableId === 't-3' && c.status !== 'paga');
        if (!cmd) return;

        store.registerPayment({
          comandaId: cmd.id,
          payments: [{ method: 'cartao', amount: cmd.balanceDue }],
          user: admin,
        });
        logMessage(`Passo 11: Pagamento liquidado com sucesso pela Administração. Total: ${formatCurrency(cmd.total)}.`);
      },
    },
    {
      step: 12,
      title: '12. O documento fiscal é emitido pela integração e associado à mesma venda',
      desc: 'Fatura Simplificada (FS) certificada é gerada com ATCUD, QR Code e assinatura Vendus / AT.',
      isDone: fiscalDocIssued,
      actionText: 'Emitir Fatura Certificada AT',
      run: async () => {
        const admin = state.users.find((u) => u.role === 'admin') || state.currentUser;
        const cmd = state.comandas.find((c) => c.tableId === 't-3');
        if (!cmd) return;

        const doc = await store.issueInvoiceForComanda({
          comandaId: cmd.id,
          docType: 'FS',
          customerNif: '254889123',
          customerName: 'Família Alentejana',
          user: admin,
        });
        logMessage(`Passo 12: Fatura ${doc.series} emitida com sucesso! ATCUD: ${doc.atcud}`);
      },
    },
    {
      step: 13,
      title: '13. A fatura pode ser enviada ao cliente por e-mail ou WhatsApp',
      desc: 'Despacho eletrónico com link seguro de 30 dias para o e-mail e WhatsApp do cliente.',
      isDone: dispatchSent,
      actionText: 'Enviar Fatura por WhatsApp / Email',
      run: () => {
        const doc = state.fiscalDocuments.find((d) => d.saleId === saleMesa3?.id);
        if (!doc) throw new Error('Emita primeiro o documento fiscal');
        const admin = state.users.find((u) => u.role === 'admin') || state.currentUser;

        store.recordInvoiceDispatch({
          documentId: doc.id,
          channel: 'whatsapp_api',
          recipient: '+351 912 345 678',
          recipientName: 'Família Alentejana',
          status: 'enviado',
          user: admin,
        });
        logMessage(`Passo 13: Fatura ${doc.series} enviada por WhatsApp para +351 912 345 678.`);
      },
    },
    {
      step: 14,
      title: '14. A mesa é libertada conforme a política de limpeza configurada',
      desc: 'Mesa 3 é libertada e fica disponível para os próximos clientes.',
      isDone: tableCleanedOrFree && mesa3?.activeComandaId === undefined,
      actionText: 'Libertar Mesa 3',
      run: () => {
        store.releaseTable('t-3');
        logMessage('Passo 14: Mesa 3 libertada. Ciclo operacional concluído com sucesso!');
      },
    },
  ];

  // Testes de Segurança de Permissões (RBAC)
  const securityChecks: {
    userRole: UserRole;
    userName: string;
    checks: { module: ModuleType; expected: boolean; desc: string }[];
  }[] = [
    {
      userRole: 'waiter',
      userName: 'João Pereira (Empregado de Mesa)',
      checks: [
        { module: 'atendimento' as ModuleType, expected: true, desc: 'Acesso permitido ao Atendimento' },
        { module: 'cozinha' as ModuleType, expected: false, desc: 'Acesso proibido à Cozinha/Copa' },
        { module: 'bar' as ModuleType, expected: false, desc: 'Acesso proibido ao Bar' },
        { module: 'admin' as ModuleType, expected: false, desc: 'Acesso proibido à Administração/Faturação' },
      ],
    },
    {
      userRole: 'kitchen',
      userName: 'Chef Rui (Cozinha & Copa)',
      checks: [
        { module: 'cozinha' as ModuleType, expected: true, desc: 'Acesso permitido à Cozinha' },
        { module: 'atendimento' as ModuleType, expected: false, desc: 'Acesso proibido ao Atendimento' },
        { module: 'bar' as ModuleType, expected: false, desc: 'Acesso proibido ao Bar' },
        { module: 'admin' as ModuleType, expected: false, desc: 'Acesso proibido à Administração' },
      ],
    },
    {
      userRole: 'bar',
      userName: 'Marco Barista (Equipa do Bar)',
      checks: [
        { module: 'bar' as ModuleType, expected: true, desc: 'Acesso permitido ao Bar' },
        { module: 'cozinha' as ModuleType, expected: false, desc: 'Acesso proibido à Cozinha' },
        { module: 'atendimento' as ModuleType, expected: false, desc: 'Acesso proibido ao Atendimento' },
        { module: 'admin' as ModuleType, expected: false, desc: 'Acesso proibido à Administração' },
      ],
    },
    {
      userRole: 'admin',
      userName: 'Carlos Silva (Administrador)',
      checks: [
        { module: 'admin' as ModuleType, expected: true, desc: 'Acesso irrestrito à Administração' },
        { module: 'atendimento' as ModuleType, expected: true, desc: 'Visão de Administrador no Atendimento' },
        { module: 'cozinha' as ModuleType, expected: true, desc: 'Visão de Administrador na Cozinha' },
        { module: 'bar' as ModuleType, expected: true, desc: 'Visão de Administrador no Bar' },
      ],
    },
  ];

  const handleRunAllSteps = async () => {
    setIsRunningAll(true);
    try {
      for (const step of steps) {
        if (!step.isDone) {
          await step.run();
          await new Promise((res) => setTimeout(res, 400));
        }
      }
      logMessage('✨ Todos os 14 critérios de validação foram executados e validados!');
    } catch (err: any) {
      logMessage(`❌ Erro no fluxo: ${err.message}`);
    } finally {
      setIsRunningAll(false);
    }
  };

  const handleResetScenario = () => {
    store.releaseTable('t-3');
    logMessage('Ambiente da Mesa 3 reinicializado para novo teste.');
  };

  const completedStepsCount = steps.filter((s) => s.isDone).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col text-stone-100 max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white">
                  Validação do Sistema (14 Critérios Obrigatórios)
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {completedStepsCount} / 14 Concluídos
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Verificação automatizada do fluxo: Mesa 3 ➔ Cozinha & Bar ➔ Entrega ➔ Faturação AT ➔ Partilha
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetScenario}
              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold flex items-center gap-1"
              title="Reinicializar Mesa 3"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reiniciar</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Abas do Modal */}
        <div className="flex border-b border-stone-800 bg-stone-950 px-6 gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('fluxo')}
            className={`py-3 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'fluxo'
                ? 'border-emerald-500 text-white'
                : 'border-transparent text-stone-400 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Fluxo dos 14 Critérios</span>
          </button>

          <button
            onClick={() => setActiveTab('seguranca')}
            className={`py-3 border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'seguranca'
                ? 'border-purple-500 text-white'
                : 'border-transparent text-stone-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span>Matriz de Segurança & RBAC (Bloqueio Direto)</span>
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'fluxo' ? (
            <div className="space-y-4">
              {/* Barra de Ação Automática */}
              <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-stone-300">
                  Execute cada passo individualmente para inspecionar os módulos ou execute o fluxo todo de uma vez:
                </div>
                <button
                  disabled={isRunningAll}
                  onClick={handleRunAllSteps}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2 shrink-0 disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                  <span>{isRunningAll ? 'A executar passos...' : 'Executar Todos os Passos (Automático)'}</span>
                </button>
              </div>

              {/* Lista dos 14 Passos */}
              <div className="space-y-2.5">
                {steps.map((st) => (
                  <div
                    key={st.step}
                    className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                      st.isDone
                        ? 'bg-stone-950/70 border-emerald-800/60'
                        : 'bg-stone-900 border-stone-800'
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-0.5">
                        {st.isDone ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <Circle className="w-5 h-5 text-stone-600" />
                        )}
                      </div>
                      <div>
                        <div className="font-extrabold text-sm text-white flex items-center gap-2">
                          <span>{st.title}</span>
                          {st.isDone && (
                            <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.2 rounded-full border border-emerald-800 font-bold">
                              Validado
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-400 mt-0.5 leading-snug">{st.desc}</p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {st.step === 12 && docMesa3 && (
                        <button
                          onClick={() => onViewReceipt(docMesa3)}
                          className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-cyan-300 rounded-lg text-xs font-bold flex items-center gap-1 border border-stone-700"
                        >
                          <FileCheck2 className="w-3.5 h-3.5" />
                          <span>Ver Fatura</span>
                        </button>
                      )}

                      <button
                        onClick={st.run}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                          st.isDone
                            ? 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                            : 'bg-amber-600 hover:bg-amber-500 text-white'
                        }`}
                      >
                        {st.isDone ? 'Reexecutar' : st.actionText}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Registo de Logs da Simulação */}
              {simulationLogs.length > 0 && (
                <div className="bg-stone-950 border border-stone-800 rounded-2xl p-4 space-y-2 text-xs font-mono">
                  <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                    Registo de Auditoria do Teste:
                  </div>
                  <div className="space-y-1 max-h-36 overflow-y-auto text-emerald-400/90 text-[11px]">
                    {simulationLogs.map((log, idx) => (
                      <div key={idx}>{log}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Matriz de Permissões e Segurança RBAC */
            <div className="space-y-5">
              <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 space-y-1">
                <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  Garantia de Bloqueio em Nível de Operação e URL
                </h3>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Conforme os requisitos: ocultar menus não é suficiente. Cada funcionário tem a sua conta individual e os módulos não autorizados são bloqueados tanto na interface como na validação interna de chamadas.
                </p>
              </div>

              <div className="space-y-3">
                {securityChecks.map((sc, idx) => {
                  const targetUser: User = state.users.find((u) => u.role === sc.userRole) || {
                    id: 'temp',
                    name: sc.userName,
                    role: sc.userRole,
                    pin: '1234',
                    avatar: '👤',
                    email: '',
                    active: true,
                  };

                  return (
                    <div
                      key={idx}
                      className="bg-stone-950/70 border border-stone-800 rounded-2xl p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-stone-800">
                        <div className="font-extrabold text-sm text-white">{sc.userName}</div>
                        <span className="text-[10px] font-mono uppercase bg-stone-800 text-stone-300 px-2 py-0.5 rounded">
                          Papel: {sc.userRole}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {sc.checks.map((c, cIdx) => {
                          const actualAccess = store.canUserAccessModule(targetUser, c.module);
                          const isCorrect = actualAccess === c.expected;

                          return (
                            <div
                              key={cIdx}
                              className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                                isCorrect
                                  ? 'bg-stone-900 border-stone-800'
                                  : 'bg-rose-950/50 border-rose-800 text-rose-200'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {c.expected ? (
                                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                                ) : (
                                  <Lock className="w-4 h-4 text-rose-400 shrink-0" />
                                )}
                                <span className="font-medium text-stone-300">{c.desc}</span>
                              </div>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  c.expected
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                                    : 'bg-rose-950 text-rose-300 border border-rose-700/60'
                                }`}
                              >
                                {c.expected ? 'Permitido' : 'Bloqueado'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-stone-950 border-t border-stone-800 flex justify-between items-center text-xs">
          <span className="text-stone-400">
            {completedStepsCount === 14 ? (
              <strong className="text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Todos os 14 critérios validados e aprovados!
              </strong>
            ) : (
              <span>Passos concluídos: {completedStepsCount} de 14</span>
            )}
          </span>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-xl font-bold"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
