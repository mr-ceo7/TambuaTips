// Mock for virtual:pwa-register/react used by ReloadPrompt.tsx
export function useRegisterSW(_options?: any) {
  return {
    needRefresh: [false, () => {}] as [boolean, (v: boolean) => void],
    offlineReady: [false, () => {}] as [boolean, (v: boolean) => void],
    updateServiceWorker: async (_reloadPage?: boolean) => {},
  };
}
