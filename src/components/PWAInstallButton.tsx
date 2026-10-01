import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, Check } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    install,
  };
}

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => {
          if (isInstallable) {
            install();
          } else {
            setShowGuide(true);
          }
        }}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-200 text-xs font-semibold rounded-lg border border-stone-700 shadow-sm transition-all"
        title="Instalar Sabores & Nações no Ecrã Principal (App de Mão)"
      >
        <Smartphone className="w-3.5 h-3.5 text-amber-400" />
        <span className="hidden sm:inline">Instalar App</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4 text-stone-100">
            <div className="flex justify-between items-center border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-sm text-white">Instalar App Sabores & Nações</h3>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-stone-300">
              <p>
                Utilize o sistema como aplicação de mão no telemóvel ou tablet do empregado de mesa, com acesso rápido e ecrã inteiro:
              </p>

              <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 space-y-2">
                <div className="font-bold text-amber-400">No iPhone ou iPad (Safari):</div>
                <ol className="list-decimal pl-4 space-y-1 text-stone-400">
                  <li>Toque no botão <strong>Partilhar</strong> (ícone de quadrado com seta para cima).</li>
                  <li>Deslize para baixo e toque em <strong>Ecrã Principal / Adicionar ao Ecrã Principal</strong>.</li>
                  <li>Toque em <strong>Adicionar</strong> no canto superior direito.</li>
                </ol>
              </div>

              <div className="bg-stone-950 p-3 rounded-xl border border-stone-800 space-y-2">
                <div className="font-bold text-amber-400">No Android (Chrome ou Edge):</div>
                <ol className="list-decimal pl-4 space-y-1 text-stone-400">
                  <li>Toque nos <strong>três pontos</strong> do menu no topo do navegador.</li>
                  <li>Selecione <strong>Instalar aplicação</strong> ou <strong>Adicionar ao ecrã inicial</strong>.</li>
                </ol>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-stone-800">
              <button
                onClick={() => setShowGuide(false)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg shadow-md"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
