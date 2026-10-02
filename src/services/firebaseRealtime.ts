/**
 * Sincronização em Tempo Real na Nuvem via Firebase Firestore
 * Permite que múltiplos dispositivos (telemóvel do garçom, tablet da cozinha KDS,
 * ecrã do bar BDS e computador do caixa) comuniquem de forma síncrona e reativa.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot, setDoc, Firestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { AppState, store } from './storage';

let firestoreDb: Firestore | null = null;
let isPushingToRemote = false;
let isInitialized = false;

export function initFirebaseRealtimeSync(): {
  isSupported: boolean;
  unsubscribe?: () => void;
} {
  if (isInitialized) {
    return { isSupported: !!firestoreDb };
  }

  try {
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      console.warn('Configuração do Firebase não encontrada ou incompleta.');
      return { isSupported: false };
    }

    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    firestoreDb = getFirestore(app);
    isInitialized = true;

    const syncDocRef = doc(firestoreDb, 'sabores_nacoes_system', 'live_state');

    // 1. Ouvinte em tempo real da nuvem (Recebe atualizações de outros dispositivos)
    const unsubscribeSnapshot = onSnapshot(
      syncDocRef,
      (snapshot) => {
        if (isPushingToRemote) return; // Ignora eco local
        if (snapshot.exists()) {
          const remoteData = snapshot.data();
          if (remoteData && remoteData.statePayload) {
            try {
              const parsedState = JSON.parse(remoteData.statePayload) as AppState;
              store.loadRemoteState(parsedState);
            } catch (err) {
              console.error('Erro ao deserializar estado remoto do Firebase:', err);
            }
          }
        }
      },
      (error) => {
        console.warn('Aviso de conexão Firebase Firestore (modo local ativo):', error.message);
      }
    );

    // 2. Transmissor em tempo real (Envia alterações locais para a nuvem)
    let syncTimeout: any = null;
    const unsubscribeStore = store.subscribe((newState) => {
      if (!firestoreDb || isPushingToRemote) return;

      if (syncTimeout) clearTimeout(syncTimeout);
      syncTimeout = setTimeout(async () => {
        try {
          isPushingToRemote = true;
          // Serializa o estado essencial para nuvem
          const payload = JSON.stringify({
            tables: newState.tables,
            comandas: newState.comandas,
            tableCalls: newState.tableCalls,
            sales: newState.sales,
            fiscalDocuments: newState.fiscalDocuments,
            cashSessions: newState.cashSessions,
            currentCashSessionId: newState.currentCashSessionId,
            customers: newState.customers,
            products: newState.products,
            settings: newState.settings,
            shiftHandovers: newState.shiftHandovers,
          });

          await setDoc(syncDocRef, {
            updatedAt: new Date().toISOString(),
            lastOperator: newState.currentUser.name,
            statePayload: payload,
          }, { merge: true });
        } catch (err) {
          // Falha de rede tratada transparentemente
        } finally {
          setTimeout(() => {
            isPushingToRemote = false;
          }, 300);
        }
      }, 500); // Debounce de 500ms para evitar excesso de escritas
    });

    return {
      isSupported: true,
      unsubscribe: () => {
        unsubscribeSnapshot();
        unsubscribeStore();
      },
    };
  } catch (error) {
    console.warn('Inicialização do Firebase Realtime falhou, a usar sincronização por BroadcastChannel:', error);
    return { isSupported: false };
  }
}
