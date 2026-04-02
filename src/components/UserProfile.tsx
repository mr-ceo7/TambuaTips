import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import { X, User, Bell, Star, Trash2, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfile({ isOpen, onClose }: UserProfileProps) {
  const { user, favoriteTeams, toggleFavoriteTeam, notifiedMatches, toggleMatchNotification, notifiedLeagues, toggleLeagueNotification } = useUser();
  const [activeTab, setActiveTab] = useState<'favorites' | 'notifications'>('favorites');

  /* Detached: Add Bet logic and Stats */

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
                {user?.profile_picture ? (
                  <img src={user.profile_picture} alt={user.username} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                    <User className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <h2 className="text-lg sm:text-xl font-display font-bold text-white">My Profile</h2>
                  <p className="text-xs text-zinc-400">Manage your betting journey</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {user?.is_admin && (
                  <Link 
                    to="/admin" 
                    onClick={onClose}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-all text-xs font-bold"
                  >
                    <Shield className="w-3.5 h-3.5" /> Admin Panel
                  </Link>
                )}
                <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white transition-all rounded-lg hover:bg-zinc-900 hover:scale-110 active:scale-95">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex border-b border-zinc-800 overflow-x-auto hide-scrollbar">
              {/* Detached: Betting History Tab Button */}
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
              {/* Detached: History Tab Content */}

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
