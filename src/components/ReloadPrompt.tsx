import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export function ReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setNeedRefresh(false);
  };

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-24 sm:bottom-6 right-4 sm:right-6 z-[100] bg-zinc-900 border border-emerald-500/30 p-4 rounded-2xl shadow-2xl flex flex-col gap-3 min-w-[300px]"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Update Available</span>
            </div>
            <button
              onClick={close}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <p className="text-sm text-zinc-300 leading-relaxed">
            A new version of TambuaTips is available. Update now to get the latest features and odds!
          </p>
          
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => updateServiceWorker(true)}
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-2 rounded-xl text-sm transition-colors"
            >
              Update App
            </button>
            <button
              onClick={close}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium py-2 rounded-xl text-sm transition-colors"
            >
              Later
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
