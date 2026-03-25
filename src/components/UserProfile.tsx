import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import { X, User, Bell, Star, History, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfile({ isOpen, onClose }: UserProfileProps) {
  const { favoriteTeams, toggleFavoriteTeam, notifiedMatches, toggleMatchNotification, notifiedLeagues, toggleLeagueNotification, bettingHistory, addBet } = useUser();
  const [activeTab, setActiveTab] = useState<'history' | 'favorites' | 'notifications'>('history');

  const [newBet, setNewBet] = useState({
    match: '',
    prediction: '',
    odds: '',
    stake: '',
    result: 'pending' as const
  });

  const handleAddBet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBet.match || !newBet.prediction || !newBet.odds || !newBet.stake) return;

    addBet({
      id: Date.now().toString(),
      date: new Date().toISOString(),
      match: newBet.match,
      prediction: newBet.prediction,
      odds: parseFloat(newBet.odds),
      stake: parseFloat(newBet.stake),
      result: newBet.result
    });

    setNewBet({ match: '', prediction: '', odds: '', stake: '', result: 'pending' });
  };

  const winRate = bettingHistory.length > 0 
    ? (bettingHistory.filter(b => b.result === 'won').length / bettingHistory.filter(b => b.result !== 'pending').length) * 100 
    : 0;

  const totalProfit = bettingHistory.reduce((acc, bet) => {
    if (bet.result === 'won') return acc + (bet.stake * bet.odds - bet.stake);
    if (bet.result === 'lost') return acc - bet.stake;
    return acc;
  }, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] overflow-hidden bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-display font-bold text-white">My Profile</h2>
                  <p className="text-xs text-zinc-400">Manage your betting journey</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white transition-all rounded-lg hover:bg-zinc-900 hover:scale-110 active:scale-95">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-zinc-800 overflow-x-auto hide-scrollbar">
              <button 
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-bold whitespace-nowrap transition-all active:scale-95 border-b-2 ${activeTab === 'history' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'}`}
              >
                <History className="w-4 h-4" /> Betting History
              </button>
              <button 
                onClick={() => setActiveTab('favorites')}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-bold whitespace-nowrap transition-all active:scale-95 border-b-2 ${activeTab === 'favorites' ? 'border-gold-500 text-gold-400' : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'}`}
              >
                <Star className="w-4 h-4" /> Favorite Teams
              </button>
              <button 
                onClick={() => setActiveTab('notifications')}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-bold whitespace-nowrap transition-all active:scale-95 border-b-2 ${activeTab === 'notifications' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'}`}
              >
                <Bell className="w-4 h-4" /> Notifications
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {activeTab === 'history' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                      <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">Total Bets</p>
                      <p className="text-2xl font-display font-bold text-white">{bettingHistory.length}</p>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
                      <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">Win Rate</p>
                      <p className="text-2xl font-display font-bold text-emerald-400">{isNaN(winRate) ? '0' : winRate.toFixed(1)}%</p>
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center sm:col-span-2">
                      <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">Net Profit</p>
                      <p className={`text-2xl font-display font-bold ${totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:p-5">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Add Manual Bet</h3>
                    <form onSubmit={handleAddBet} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <input 
                        type="text" 
                        placeholder="Match (e.g., Arsenal vs Chelsea)" 
                        value={newBet.match}
                        onChange={e => setNewBet({...newBet, match: e.target.value})}
                        className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                      />
                      <input 
                        type="text" 
                        placeholder="Prediction (e.g., Home Win)" 
                        value={newBet.prediction}
                        onChange={e => setNewBet({...newBet, prediction: e.target.value})}
                        className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <input 
                          type="number" 
                          step="0.01"
                          placeholder="Odds" 
                          value={newBet.odds}
                          onChange={e => setNewBet({...newBet, odds: e.target.value})}
                          className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                        />
                        <input 
                          type="number" 
                          step="0.01"
                          placeholder="Stake" 
                          value={newBet.stake}
                          onChange={e => setNewBet({...newBet, stake: e.target.value})}
                          className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="flex gap-2">
                        <select 
                          value={newBet.result}
                          onChange={e => setNewBet({...newBet, result: e.target.value as any})}
                          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                        >
                          <option value="pending">Pending</option>
                          <option value="won">Won</option>
                          <option value="lost">Lost</option>
                        </select>
                        <button type="submit" className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold px-4 py-2 rounded-lg transition-all hover:scale-105 active:scale-95 text-sm">
                          Add
                        </button>
                      </div>
                    </form>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">Recent Bets</h3>
                    {bettingHistory.length === 0 ? (
                      <p className="text-sm text-zinc-500 text-center py-4">No bets recorded yet.</p>
                    ) : (
                      bettingHistory.slice().reverse().map(bet => (
                        <div key={bet.id} className="flex items-center justify-between bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
                          <div>
                            <p className="text-sm font-bold text-white">{bet.match}</p>
                            <p className="text-xs text-zinc-400">{bet.prediction} @ {bet.odds} • Stake: {bet.stake}</p>
                            <p className="text-[10px] text-zinc-500 mt-1">{format(new Date(bet.date), 'MMM d, yyyy')}</p>
                          </div>
                          <div>
                            {bet.result === 'won' && <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded"><CheckCircle2 className="w-3 h-3" /> WON</span>}
                            {bet.result === 'lost' && <span className="flex items-center gap-1 text-xs font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded"><XCircle className="w-3 h-3" /> LOST</span>}
                            {bet.result === 'pending' && <span className="text-xs font-bold text-zinc-400 bg-zinc-800 px-2 py-1 rounded">PENDING</span>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'favorites' && (
                <div className="space-y-4">
                  <p className="text-sm text-zinc-400 mb-4">Teams you mark as favorites will appear here and be highlighted in the tips list.</p>
                  {favoriteTeams.length === 0 ? (
                    <div className="text-center py-12 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                      <Star className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                      <p className="text-sm text-zinc-500">You haven't added any favorite teams yet.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {favoriteTeams.map(team => (
                        <div key={team} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                          <span className="text-sm font-bold text-white truncate pr-2">{team}</span>
                          <button 
                            onClick={() => toggleFavoriteTeam(team)}
                            className="text-zinc-500 hover:text-red-400 transition-all p-1 hover:scale-110 active:scale-95"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <p className="text-sm text-zinc-400">Manage your push notification preferences for matches and leagues.</p>
                  
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Bell className="w-4 h-4 text-emerald-500" /> Match Notifications
                    </h3>
                    {notifiedMatches.length === 0 ? (
                      <p className="text-sm text-zinc-500 bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">No match notifications set.</p>
                    ) : (
                      <div className="space-y-2">
                        {notifiedMatches.map(matchId => (
                          <div key={matchId} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                            <span className="text-sm text-zinc-300">Match ID: {matchId}</span>
                            <button 
                              onClick={() => toggleMatchNotification(matchId)}
                              className="text-zinc-500 hover:text-red-400 transition-all p-1 hover:scale-110 active:scale-95"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Bell className="w-4 h-4 text-emerald-500" /> League Notifications
                    </h3>
                    {notifiedLeagues.length === 0 ? (
                      <p className="text-sm text-zinc-500 bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">No league notifications set.</p>
                    ) : (
                      <div className="space-y-2">
                        {notifiedLeagues.map(league => (
                          <div key={league} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                            <span className="text-sm font-bold text-white">{league}</span>
                            <button 
                              onClick={() => toggleLeagueNotification(league)}
                              className="text-zinc-500 hover:text-red-400 transition-all p-1 hover:scale-110 active:scale-95"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
