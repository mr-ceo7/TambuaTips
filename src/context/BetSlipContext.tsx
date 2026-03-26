import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { BetSelection } from '../types';

interface BetSlipContextType {
  selections: BetSelection[];
  addSelection: (selection: BetSelection) => void;
  removeSelection: (id: string) => void;
  clearSlip: () => void;
  isSlipOpen: boolean;
  setIsSlipOpen: (isOpen: boolean) => void;
  stake: number;
  setStake: (amount: number) => void;
  totalOdds: number;
  potentialReturn: number;
}

const BetSlipContext = createContext<BetSlipContextType | undefined>(undefined);

export function BetSlipProvider({ children }: { children: React.ReactNode }) {
  const [selections, setSelections] = useState<BetSelection[]>(() => {
    try {
      const saved = localStorage.getItem('tumbuatips_betslip_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isSlipOpen, setIsSlipOpen] = useState(false);
  const [stake, setStake] = useState<number>(1000);

  useEffect(() => {
    localStorage.setItem('tumbuatips_betslip_v2', JSON.stringify(selections));
  }, [selections]);

  const addSelection = (selection: BetSelection) => {
    setSelections(prev => {
      // If match already exists, replace it to only allow 1 pick per match
      const filtered = prev.filter(s => s.fixtureId !== selection.fixtureId);
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

  const totalOdds = useMemo(() => {
    if (selections.length === 0) return 0;
    const total = selections.reduce((acc, curr) => acc * curr.odds, 1);
    return Number(total.toFixed(2));
  }, [selections]);

  const potentialReturn = useMemo(() => {
    return Number((totalOdds * stake).toFixed(2));
  }, [totalOdds, stake]);

  return (
    <BetSlipContext.Provider value={{
      selections,
      addSelection,
      removeSelection,
      clearSlip,
      isSlipOpen,
      setIsSlipOpen,
      stake,
      setStake,
      totalOdds,
      potentialReturn
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
