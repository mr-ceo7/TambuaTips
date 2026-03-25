import React, { createContext, useContext, useState, useEffect } from 'react';

export interface BetSelection {
  id: string;
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  prediction: string;
  odds: number;
  bookmaker: string;
}

interface BetSlipContextType {
  selections: BetSelection[];
  addSelection: (selection: BetSelection) => void;
  removeSelection: (id: string) => void;
  clearSlip: () => void;
  isSlipOpen: boolean;
  setIsSlipOpen: (isOpen: boolean) => void;
}

const BetSlipContext = createContext<BetSlipContextType | undefined>(undefined);

export function BetSlipProvider({ children }: { children: React.ReactNode }) {
  const [selections, setSelections] = useState<BetSelection[]>(() => {
    const saved = localStorage.getItem('tumbuatips_betslip');
    return saved ? JSON.parse(saved) : [];
  });
  const [isSlipOpen, setIsSlipOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('tumbuatips_betslip', JSON.stringify(selections));
  }, [selections]);

  const addSelection = (selection: BetSelection) => {
    setSelections(prev => {
      // If match already exists, replace it
      const filtered = prev.filter(s => s.matchId !== selection.matchId);
      return [...filtered, selection];
    });
    setIsSlipOpen(true);
  };

  const removeSelection = (id: string) => {
    setSelections(prev => prev.filter(s => s.id !== id));
  };

  const clearSlip = () => {
    setSelections([]);
  };

  return (
    <BetSlipContext.Provider value={{
      selections,
      addSelection,
      removeSelection,
      clearSlip,
      isSlipOpen,
      setIsSlipOpen
    }}>
      {children}
    </BetSlipContext.Provider>
  );
}

export function useBetSlip() {
  const context = useContext(BetSlipContext);
  if (context === undefined) {
    throw new Error('useBetSlip must be used within a BetSlipProvider');
  }
  return context;
}
