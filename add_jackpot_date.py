import sys

with open("src/pages/TipsPage.tsx", "r") as f:
    content = f.read()

target = """                  {jackpot.matches.map((m, idx) => (
                    <tr key={idx} className={`border-b border-zinc-800/50 last:border-0 ${
                      m.result === 'won' ? 'bg-emerald-500/5' : m.result === 'lost' ? 'bg-red-500/5' : m.result === 'postponed' ? 'bg-orange-500/5' : ''
                    }`}>
                      <td className="px-2.5 py-1.5 text-zinc-500 font-mono">{idx + 1}</td>
                      <td className="px-2.5 py-1.5">
                        <div className="flex flex-col gap-0.5">
                          {(m.country || m.matchDate) && (
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1">
                              {m.country && m.countryFlag && (
                                m.countryFlag.startsWith('http') 
                                  ? <img src={m.countryFlag} alt={m.country} className="w-3.5 h-2.5 object-cover rounded-[2px]" />
                                  : <span className="text-xs">{m.countryFlag}</span>
                              )}
                              {m.country && <span>{m.country}</span>}
                              {m.country && m.matchDate && <span className="mx-0.5 opacity-50">•</span>}
                              {m.matchDate && (
                                <span className="text-zinc-400 font-mono flex items-center gap-0.5" title="Kickoff Time">
                                  <Clock className="w-2.5 h-2.5" />
                                  {(() => {
                                    try {
                                      return format(parseISO(m.matchDate), 'HH:mm');
                                    } catch {
                                      return String(m.matchDate).split('T')[1]?.substring(0,5) || String(m.matchDate);
                                    }
                                  })()}
                                </span>
                              )}
                            </span>
                          )}
                          <span className="text-zinc-300 inline-flex items-center gap-1 flex-wrap">
                            <TeamWithLogo teamName={m.homeTeam} size={14} textClassName="text-xs" />
                            <span className="text-zinc-600 mx-0.5">vs</span>
                            <TeamWithLogo teamName={m.awayTeam} size={14} textClassName="text-xs" />
                          </span>
                        </div>
                      </td>
                      {jackpot.variations.map((v, vi) => (
                        <td key={vi} className="px-2 py-1.5 text-center">
                          <span className="font-mono font-bold text-emerald-400 text-sm">{v[idx] || '-'}</span>
                        </td>
                      ))}
                      <td className="px-2 py-1.5 text-center">
                        {m.result === 'won' ? (
                          <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full uppercase">Won</span>
                        ) : m.result === 'lost' ? (
                          <span className="text-[10px] font-black text-red-400 bg-red-500/15 px-2 py-0.5 rounded-full uppercase">Lost</span>
                        ) : m.result === 'postponed' ? (
                          <span className="text-[10px] font-black text-orange-400 bg-orange-500/15 px-2 py-0.5 rounded-full uppercase">PPD</span>
                        ) : (
                          <span className="text-[10px] text-zinc-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))}"""

replacement = """                  {(() => {
                    const labelsOrder: string[] = [];
                    const groupedMatches = jackpot.matches.reduce((acc, m, idx) => {
                      let dateLabel = 'TBA';
                      if (m.matchDate) {
                        try {
                          const dateObj = new Date(m.matchDate);
                          if (!isNaN(dateObj.getTime())) {
                            dateLabel = format(dateObj, 'MMM d, yyyy');
                            if (isToday(dateObj)) dateLabel = 'Today';
                            else if (isTomorrow(dateObj)) dateLabel = 'Tomorrow';
                            else if (isYesterday(dateObj)) dateLabel = 'Yesterday';
                          }
                        } catch {}
                      }

                      if (!acc[dateLabel]) {
                        acc[dateLabel] = [];
                        labelsOrder.push(dateLabel);
                      }
                      acc[dateLabel].push({ ...m, _idx: idx });
                      return acc;
                    }, {} as Record<string, any[]>);

                    let displayIdx = 0;
                    return labelsOrder.map(dateLabel => {
                      const group = groupedMatches[dateLabel];
                      return (
                        <React.Fragment key={dateLabel}>
                          <tr className="bg-zinc-800/40 border-b border-zinc-800">
                            <td colSpan={3 + (jackpot.variations?.length || 0)} className="px-2.5 py-1 w-full text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">
                              —— {dateLabel} ——
                            </td>
                          </tr>
                          {group.map((m) => {
                            const originalIdx = m._idx;
                            const idx = displayIdx++;
                            return (
                              <tr key={originalIdx} className={`border-b border-zinc-800/50 last:border-0 ${
                                m.result === 'won' ? 'bg-emerald-500/5' : m.result === 'lost' ? 'bg-red-500/5' : m.result === 'postponed' ? 'bg-orange-500/5' : ''
                              }`}>
                                <td className="px-2.5 py-1.5 text-zinc-500 font-mono">{idx + 1}</td>
                                <td className="px-2.5 py-1.5">
                                  <div className="flex flex-col gap-0.5">
                                    {(m.country || m.matchDate) && (
                                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1">
                                        {m.country && m.countryFlag && (
                                          m.countryFlag.startsWith('http') 
                                            ? <img src={m.countryFlag} alt={m.country} className="w-3.5 h-2.5 object-cover rounded-[2px]" />
                                            : <span className="text-xs">{m.countryFlag}</span>
                                        )}
                                        {m.country && <span>{m.country}</span>}
                                        {m.country && m.matchDate && <span className="mx-0.5 opacity-50">•</span>}
                                        {m.matchDate && (
                                          <span className="text-zinc-400 font-mono flex items-center gap-0.5" title="Kickoff Time">
                                            <Clock className="w-2.5 h-2.5" />
                                            {(() => {
                                              try {
                                                return format(parseISO(m.matchDate), 'HH:mm');
                                              } catch {
                                                return String(m.matchDate).split('T')[1]?.substring(0,5) || String(m.matchDate);
                                              }
                                            })()}
                                          </span>
                                        )}
                                      </span>
                                    )}
                                    <span className="text-zinc-300 inline-flex items-center gap-1 flex-wrap">
                                      <TeamWithLogo teamName={m.homeTeam} size={14} textClassName="text-xs" />
                                      <span className="text-zinc-600 mx-0.5">vs</span>
                                      <TeamWithLogo teamName={m.awayTeam} size={14} textClassName="text-xs" />
                                    </span>
                                  </div>
                                </td>
                                {jackpot.variations.map((v, vi) => (
                                  <td key={vi} className="px-2 py-1.5 text-center">
                                    <span className="font-mono font-bold text-emerald-400 text-sm">{v[originalIdx] || '-'}</span>
                                  </td>
                                ))}
                                <td className="px-2 py-1.5 text-center">
                                  {m.result === 'won' ? (
                                    <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full uppercase">Won</span>
                                  ) : m.result === 'lost' ? (
                                    <span className="text-[10px] font-black text-red-400 bg-red-500/15 px-2 py-0.5 rounded-full uppercase">Lost</span>
                                  ) : m.result === 'postponed' ? (
                                    <span className="text-[10px] font-black text-orange-400 bg-orange-500/15 px-2 py-0.5 rounded-full uppercase">PPD</span>
                                  ) : (
                                    <span className="text-[10px] text-zinc-600">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    });
                  })()}"""

if target in content:
    with open("src/pages/TipsPage.tsx", "w") as f:
        f.write(content.replace(target, replacement))
    print("Replace success")
else:
    print("Target not found")
