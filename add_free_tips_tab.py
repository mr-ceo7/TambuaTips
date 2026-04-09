import sys

with open("src/pages/TipsPage.tsx", "r") as f:
    content = f.read()

free_tab_code = """
      {/* Free Tips Tab */}
      {activeTab === 'free' && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="mb-6 flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
            <div>
              <h2 className="text-emerald-400 font-bold font-display text-lg flex items-center gap-2">
                <Gift className="w-5 h-5" />
                TambuaTips Free Picks
              </h2>
              <p className="text-xs text-zinc-400 mt-1">100% unlocked predictions for our community</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            {loadingTips ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
              </div>
            ) : (() => {
              const freeTipsByCat = freeTips.reduce((acc, tip) => {
                const c = tip.category || '2+';
                if (!acc[c]) acc[c] = [];
                acc[c].push(tip);
                return acc;
              }, {} as Record<string, import('../services/tipsService').Tip[]>);

              const availableCategories = Object.keys(freeTipsByCat).sort();

              if (availableCategories.length === 0) {
                return (
                   <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-12 text-center">
                     <Gift className="w-12 h-12 text-emerald-500/20 mx-auto mb-4" />
                     <p className="text-zinc-500 font-bold">No free tips available today. Check out our Daily Tips!</p>
                   </div>
                );
              }

              return availableCategories.map(cat => {
                const tips = freeTipsByCat[cat];
                const catInfo = CATEGORY_LABELS[cat as TipCategory] || { label: cat.toUpperCase(), desc: 'Free Tips', minTier: 'free' };
                const Icon = CATEGORY_ICONS[cat as TipCategory] || Gift;
                const isExpanded = expandedCategories[`free-${cat}`];
                
                if (tips.length === 0) return null;

                const pendingTips = tips.filter(t => t.result === 'pending');
                const historyTips = tips.filter(t => t.result !== 'pending');
                const displayedHistory = isExpanded ? historyTips : historyTips.slice(0, 2);
                const displayedTips = [...pendingTips, ...displayedHistory];

                return (
                  <div key={`free-${cat}`} className="bg-zinc-900/60 border border-emerald-500/30 rounded-2xl overflow-hidden transition-all shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                            <Icon className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="text-base font-bold text-white uppercase tracking-wide flex items-center gap-2">
                              {catInfo.label.toUpperCase().includes('TIPS') ? catInfo.label.toUpperCase() : `${catInfo.label.toUpperCase()} TIPS`}
                              <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-[10px] uppercase font-black">FREE</span>
                            </h4>
                            <p className="text-xs text-zinc-400 font-medium mt-0.5">
                              {tips.length} Prediction{tips.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-zinc-950/50 border-t border-emerald-500/20 overflow-hidden">
                      <div className="max-h-[32rem] overflow-auto">
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-zinc-900 z-10">
                            <tr className="border-b border-zinc-800">
                              <th className="px-2.5 py-2 text-left text-zinc-500 font-bold uppercase tracking-wider w-7">#</th>
                              <th className="px-2.5 py-2 text-left text-zinc-500 font-bold uppercase tracking-wider">Match</th>
                              <th className="px-2 py-2 text-center text-emerald-400 font-bold uppercase tracking-wider w-24">Tip</th>
                              <th className="px-2 py-2 text-center text-zinc-500 font-bold uppercase tracking-wider w-16">Result</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const labelsOrder: string[] = [];
                              const groupedTips = displayedTips.reduce((acc, tip) => {
                                const dateObj = new Date(tip.matchDate);
                                let label = format(dateObj, 'MMM d, yyyy');
                                if (isToday(dateObj)) label = 'Today';
                                else if (isTomorrow(dateObj)) label = 'Tomorrow';
                                else if (isYesterday(dateObj)) label = 'Yesterday';
                                
                                if (!acc[label]) {
                                  acc[label] = [];
                                  labelsOrder.push(label);
                                }
                                acc[label].push(tip);
                                return acc;
                              }, {} as Record<string, import('../services/tipsService').Tip[]>);

                              let globalIdx = 0;
                              return labelsOrder.map(dateLabel => {
                                const groupTips = groupedTips[dateLabel];
                                return (
                                  <React.Fragment key={dateLabel}>
                                    <tr className="bg-zinc-800/40 border-b border-zinc-800">
                                      <td colSpan={4} className="px-2.5 py-1 w-full text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">
                                        —— {dateLabel} ——
                                      </td>
                                    </tr>
                                    {groupTips.map((tip) => {
                                      const idx = globalIdx++;
                                      return (
                                        <tr key={tip.id} className={`border-b border-zinc-800/50 last:border-0 ${
                                          tip.result === 'won' ? 'bg-emerald-500/5' : tip.result === 'lost' ? 'bg-red-500/5' : ''
                                        }`}>
                                          <td className="px-2.5 py-1.5 text-zinc-500 font-mono">{idx + 1}</td>
                                          <td className="px-2.5 py-1.5">
                                            <div className="flex flex-col gap-0.5">
                                              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1">
                                                {tip.league && <LeagueLogo leagueName={tip.league} size={12} />}
                                                {tip.league && <span>{tip.league}</span>}
                                                {tip.league && tip.matchDate && <span className="mx-0.5 opacity-50">•</span>}
                                                {tip.matchDate && (
                                                  <span className="text-zinc-400 font-mono flex items-center gap-0.5" title="Kickoff Time">
                                                    <Clock className="w-2.5 h-2.5" />
                                                    {new Date(tip.matchDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                  </span>
                                                )}
                                              </span>
                                              <Link to={`/match/${tip.fixtureId}`} className="text-zinc-300 inline-flex items-center gap-1 flex-wrap hover:text-emerald-400 transition-colors">
                                                <TeamWithLogo teamName={tip.homeTeam} size={14} textClassName="text-xs" />
                                                <span className="text-zinc-600 mx-0.5">vs</span>
                                                <TeamWithLogo teamName={tip.awayTeam} size={14} textClassName="text-xs" />
                                              </Link>
                                            </div>
                                          </td>
                                          <td className="px-2 py-1.5 text-center">
                                            <div className="flex flex-col items-center justify-center h-full py-1">
                                              <span className="font-bold text-emerald-400 text-sm leading-none block mb-0.5 whitespace-nowrap">{tip.prediction}</span>
                                              <span className="text-[9px] text-zinc-500 font-bold uppercase leading-none">{tip.odds && `@${tip.odds}`}</span>
                                            </div>
                                          </td>
                                          <td className="px-2 py-1.5 text-center align-middle">
                                            {tip.result === 'won' ? (
                                              <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase border border-emerald-500/20 mx-auto block w-fit">WON</span>
                                            ) : tip.result === 'lost' ? (
                                              <span className="text-[10px] font-black text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full uppercase mx-auto block w-fit">LOST</span>
                                            ) : tip.result === 'void' ? (
                                              <span className="text-[10px] font-black text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full uppercase mx-auto block w-fit">VOID</span>
                                            ) : tip.result === 'postponed' ? (
                                              <span className="text-[10px] font-black text-orange-400 bg-orange-500/15 px-2 py-0.5 rounded-full uppercase mx-auto block w-fit">PPD</span>
                                            ) : (
                                              <span className="text-[10px] text-zinc-600 mx-auto block w-fit">—</span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </React.Fragment>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    {historyTips.length > 2 && (
                      <div className="bg-zinc-900 border-t border-zinc-800 p-2">
                        <button
                          onClick={() => setExpandedCategories(prev => ({ ...prev, [`free-${cat}`]: !prev[`free-${cat}`] }))}
                          className="w-full py-2 flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-colors"
                        >
                          {isExpanded ? (
                            <>Collapse History</>
                          ) : (
                            <>View All History ({historyTips.length}) <ChevronRight className="w-3.5 h-3.5" /></>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}
"""

target = "{/* Daily Tips Tab */}"
if target in content and "{/* Free Tips Tab */}" not in content:
    content = content.replace(target, free_tab_code + "\n      " + target)
    with open("src/pages/TipsPage.tsx", "w") as f:
        f.write(content)
    print("Injected Free Tips Tab JSX!")
else:
    print("Could not find Daily Tips Tab target or already injected.")
