import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { adminService, type LegacyMpesaQueueItem } from '../../services/adminService';
import { getPricingTiers, type TierConfig } from '../../services/pricingService';

type AssignmentMode = 'subscription' | 'jackpot';
type JackpotGrantType = 'midweek' | 'mega';
type LegacyQueueStatus = 'pending_assignment' | 'ignored' | 'assigned' | 'all';

const JACKPOT_DC_OPTIONS = [3, 4, 5, 6, 7, 10];
const LEGACY_QUEUE_PER_PAGE = 10;

export function LegacyMpesaQueuePage() {
  const today = new Date();
  const todayDate = today.toISOString().slice(0, 10);
  const monthStartDate = `${todayDate.slice(0, 8)}01`;

  const [availableTiers, setAvailableTiers] = useState<TierConfig[]>([]);
  const [legacyQueue, setLegacyQueue] = useState<LegacyMpesaQueueItem[]>([]);
  const [legacyQueuePage, setLegacyQueuePage] = useState(1);
  const [legacyQueueTotal, setLegacyQueueTotal] = useState(0);
  const [legacyQueueTotalPages, setLegacyQueueTotalPages] = useState(1);
  const [legacyQueueStatus, setLegacyQueueStatus] = useState<LegacyQueueStatus>('pending_assignment');
  const [legacyQueueLoading, setLegacyQueueLoading] = useState(false);
  const [legacySyncing, setLegacySyncing] = useState(false);
  const [legacyBackfilling, setLegacyBackfilling] = useState(false);
  const [legacyDateImporting, setLegacyDateImporting] = useState(false);
  const [legacyClearingQueue, setLegacyClearingQueue] = useState(false);
  const [legacyDateFrom, setLegacyDateFrom] = useState(monthStartDate);
  const [legacyDateTo, setLegacyDateTo] = useState(todayDate);
  const [legacyAssigningId, setLegacyAssigningId] = useState<number | null>(null);
  const [legacyDeletingId, setLegacyDeletingId] = useState<number | null>(null);
  const [legacyBulkAssigning, setLegacyBulkAssigning] = useState(false);
  const [selectedLegacyQueueIds, setSelectedLegacyQueueIds] = useState<number[]>([]);
  const [legacyAssignMode, setLegacyAssignMode] = useState<Record<number, AssignmentMode>>({});
  const [legacyAssignTier, setLegacyAssignTier] = useState<Record<number, string>>({});
  const [legacyAssignDays, setLegacyAssignDays] = useState<Record<number, number>>({});
  const [legacyAssignJackpotType, setLegacyAssignJackpotType] = useState<Record<number, JackpotGrantType>>({});
  const [legacyAssignJackpotDcLevel, setLegacyAssignJackpotDcLevel] = useState<Record<number, number>>({});
  const [legacyBulkMode, setLegacyBulkMode] = useState<AssignmentMode>('subscription');
  const [legacyBulkTier, setLegacyBulkTier] = useState('');
  const [legacyBulkDays, setLegacyBulkDays] = useState(30);
  const [legacyBulkJackpotType, setLegacyBulkJackpotType] = useState<JackpotGrantType>('midweek');
  const [legacyBulkJackpotDcLevel, setLegacyBulkJackpotDcLevel] = useState(3);
  const legacyAutoSyncInFlight = useRef(false);

  const subscriptionTiers = useMemo(() => availableTiers, [availableTiers]);
  const paidTiers = useMemo(
    () => availableTiers.filter((tier) => tier.id !== 'free'),
    [availableTiers]
  );

  useEffect(() => {
    getPricingTiers().then((tiers) => {
      setAvailableTiers(tiers);
      const defaultTier = tiers.find((tier) => tier.id !== 'free');
      if (defaultTier) {
        setLegacyBulkTier(defaultTier.id);
      }
    });
  }, []);

  const loadLegacyQueue = (page = legacyQueuePage) => {
    setLegacyQueueLoading(true);
    adminService.getLegacyMpesaQueue(legacyQueueStatus, page, LEGACY_QUEUE_PER_PAGE)
      .then((data) => {
        setLegacyQueue(data.items);
        setLegacyQueueTotal(data.total);
        setLegacyQueueTotalPages(Math.max(data.total_pages, 1));
        setLegacyAssignTier((prev) => {
          const next = { ...prev };
          for (const item of data.items) {
            if (!next[item.id] && paidTiers[0]) {
              next[item.id] = paidTiers[0].id;
            }
          }
          return next;
        });
        setLegacyAssignDays((prev) => {
          const next = { ...prev };
          for (const item of data.items) {
            if (!next[item.id]) {
              next[item.id] = 30;
            }
          }
          return next;
        });
        setLegacyAssignMode((prev) => {
          const next = { ...prev };
          for (const item of data.items) {
            if (!next[item.id]) {
              next[item.id] = 'subscription';
            }
          }
          return next;
        });
        setLegacyAssignJackpotType((prev) => {
          const next = { ...prev };
          for (const item of data.items) {
            if (!next[item.id]) {
              next[item.id] = 'midweek';
            }
          }
          return next;
        });
        setLegacyAssignJackpotDcLevel((prev) => {
          const next = { ...prev };
          for (const item of data.items) {
            if (!next[item.id]) {
              next[item.id] = 3;
            }
          }
          return next;
        });
      })
      .catch((error: any) => {
        const message = error?.response?.data?.detail || 'Failed to load legacy M-Pesa queue';
        toast.error(message);
      })
      .finally(() => setLegacyQueueLoading(false));
  };

  useEffect(() => {
    loadLegacyQueue(legacyQueuePage);
  }, [legacyQueuePage, legacyQueueStatus, paidTiers]);

  useEffect(() => {
    if (paidTiers.length === 0) return undefined;

    const runAutoSync = async () => {
      if (legacyAutoSyncInFlight.current) return;
      legacyAutoSyncInFlight.current = true;
      try {
        const result = await adminService.syncLegacyMpesa();
        if (result.imported > 0 || result.created_payments > 0) {
          loadLegacyQueue(legacyQueuePage);
        }
      } catch (error) {
        console.error('Legacy auto-sync failed', error);
      } finally {
        legacyAutoSyncInFlight.current = false;
      }
    };

    runAutoSync();
    const intervalId = window.setInterval(runAutoSync, 30000);
    return () => window.clearInterval(intervalId);
  }, [paidTiers, legacyQueuePage, legacyQueueStatus]);

  useEffect(() => {
    setSelectedLegacyQueueIds((prev) =>
      prev.filter((id) => {
        const item = legacyQueue.find((queueItem) => queueItem.id === id);
        return item ? item.onboarding_status !== 'assigned' : true;
      })
    );
  }, [legacyQueue]);

  const handleSyncLegacyQueue = async () => {
    setLegacySyncing(true);
    try {
      const result = await adminService.syncLegacyMpesa();
      toast.success(`Legacy sync complete: ${result.imported} imported, ${result.skipped} skipped`);
      setLegacyQueuePage(1);
      loadLegacyQueue(1);
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'Failed to sync legacy M-Pesa payments';
      toast.error(message);
    } finally {
      setLegacySyncing(false);
    }
  };

  const handleBackfillLegacyQueue = async () => {
    setLegacyBackfilling(true);
    try {
      const result = await adminService.backfillLegacyMpesa();
      toast.success(`Legacy backfill complete: ${result.imported} imported, ${result.skipped} skipped`);
      setLegacyQueuePage(1);
      loadLegacyQueue(1);
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'Failed to backfill legacy M-Pesa history';
      toast.error(message);
    } finally {
      setLegacyBackfilling(false);
    }
  };

  const handleImportLegacyDateRange = async () => {
    if (!legacyDateFrom || !legacyDateTo) {
      toast.error('Select both start and end dates');
      return;
    }
    if (legacyDateTo < legacyDateFrom) {
      toast.error('End date must be on or after start date');
      return;
    }

    setLegacyDateImporting(true);
    try {
      const result = await adminService.importLegacyMpesaDateRange(legacyDateFrom, legacyDateTo);
      toast.success(`Date-range import complete: ${result.imported} imported, ${result.skipped} skipped`);
      setLegacyQueuePage(1);
      loadLegacyQueue(1);
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'Failed to import legacy M-Pesa date range';
      toast.error(message);
    } finally {
      setLegacyDateImporting(false);
    }
  };

  const handleClearLegacyQueue = async () => {
    if (!confirm('Ignore all pending legacy queue items? Assigned and previously ignored rows will be kept.')) return;

    setLegacyClearingQueue(true);
    try {
      const result = await adminService.clearLegacyMpesaQueue();
      toast.success(`Ignored ${result.cleared} pending legacy queue item${result.cleared === 1 ? '' : 's'}`);
      setSelectedLegacyQueueIds([]);
      setLegacyQueuePage(1);
      loadLegacyQueue(1);
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'Failed to ignore pending legacy queue items';
      toast.error(message);
    } finally {
      setLegacyClearingQueue(false);
    }
  };

  const handleAssignLegacyQueueItem = async (item: LegacyMpesaQueueItem) => {
    const assignmentMode = legacyAssignMode[item.id] || 'subscription';
    const tier = legacyAssignTier[item.id] || paidTiers[0]?.id;
    const durationDays = legacyAssignDays[item.id] || 30;
    const jackpotType = legacyAssignJackpotType[item.id] || 'midweek';
    const jackpotDcLevel = legacyAssignJackpotDcLevel[item.id] || 3;
    if (assignmentMode === 'subscription') {
      if (!tier) {
        toast.error('Select a package first');
        return;
      }
      if (!Number.isFinite(durationDays) || durationDays < 1) {
        toast.error('Duration must be at least 1 day');
        return;
      }
    }

    setLegacyAssigningId(item.id);
    try {
      await adminService.assignLegacyMpesa(item.id, {
        assignmentMode,
        tier: assignmentMode === 'subscription' ? tier : undefined,
        durationDays: assignmentMode === 'subscription' ? durationDays : undefined,
        jackpotType: assignmentMode === 'jackpot' ? jackpotType : undefined,
        jackpotDcLevel: assignmentMode === 'jackpot' ? jackpotDcLevel : undefined,
      });
      toast.success('Legacy payment assigned successfully');
      loadLegacyQueue(legacyQueuePage);
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'Failed to assign legacy payment';
      toast.error(message);
    } finally {
      setLegacyAssigningId(null);
    }
  };

  const handleDeleteLegacyQueueItem = async (item: LegacyMpesaQueueItem) => {
    if (!confirm(`Ignore pending legacy queue item ${item.source_record_id}?`)) return;

    setLegacyDeletingId(item.id);
    try {
      await adminService.deleteLegacyMpesaQueueItem(item.id);
      toast.success('Legacy queue item ignored');
      setSelectedLegacyQueueIds((prev) => prev.filter((id) => id !== item.id));
      loadLegacyQueue(legacyQueuePage);
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'Failed to ignore legacy queue item';
      toast.error(message);
    } finally {
      setLegacyDeletingId(null);
    }
  };

  const toggleLegacyQueueSelection = (queueId: number, checked: boolean) => {
    setSelectedLegacyQueueIds((prev) => {
      if (checked) {
        return prev.includes(queueId) ? prev : [...prev, queueId];
      }
      return prev.filter((id) => id !== queueId);
    });
  };

  const handleSelectAllVisibleLegacyQueue = () => {
    const visiblePendingIds = legacyQueue
      .filter((item) => item.onboarding_status === 'pending_assignment')
      .map((item) => item.id);
    if (visiblePendingIds.length === 0) {
      return;
    }
    const allSelected = visiblePendingIds.every((id) => selectedLegacyQueueIds.includes(id));
    setSelectedLegacyQueueIds((prev) => {
      if (allSelected) {
        return prev.filter((id) => !visiblePendingIds.includes(id));
      }
      return Array.from(new Set([...prev, ...visiblePendingIds]));
    });
  };

  const handleBulkAssignLegacyQueue = async (applyToAllPending: boolean) => {
    if (legacyBulkMode === 'subscription') {
      if (!legacyBulkTier) {
        toast.error('Select a global package');
        return;
      }
      if (!Number.isFinite(legacyBulkDays) || legacyBulkDays < 1) {
        toast.error('Global duration must be at least 1 day');
        return;
      }
    }
    if (!applyToAllPending && selectedLegacyQueueIds.length === 0) {
      toast.error('Select at least one pending user');
      return;
    }

    setLegacyBulkAssigning(true);
    try {
      const result = await adminService.bulkAssignLegacyMpesa(
        {
          assignmentMode: legacyBulkMode,
          tier: legacyBulkMode === 'subscription' ? legacyBulkTier : undefined,
          durationDays: legacyBulkMode === 'subscription' ? legacyBulkDays : undefined,
          jackpotType: legacyBulkMode === 'jackpot' ? legacyBulkJackpotType : undefined,
          jackpotDcLevel: legacyBulkMode === 'jackpot' ? legacyBulkJackpotDcLevel : undefined,
        },
        selectedLegacyQueueIds,
        applyToAllPending,
      );
      toast.success(`Bulk assign complete: ${result.assigned} assigned, ${result.skipped} skipped`);
      setSelectedLegacyQueueIds((prev) =>
        applyToAllPending ? [] : prev.filter((id) => !result.assigned_queue_ids.includes(id))
      );
      loadLegacyQueue(legacyQueuePage);
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'Failed to bulk assign legacy payments';
      toast.error(message);
    } finally {
      setLegacyBulkAssigning(false);
    }
  };

  return (
    <div className="space-y-5 overflow-hidden">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-white font-display">Legacy M-Pesa Queue</h1>
          {legacyQueueLoading && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/70 px-2.5 py-1 text-[11px] font-bold text-zinc-400">
              <RefreshCw className="h-3 w-3 animate-spin text-emerald-400" />
              Updating
            </span>
          )}
        </div>
        <p className="text-sm text-zinc-500 mt-1">
          Import payments from the old platform, then assign package access here.
        </p>
      </div>

      <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">Queue Controls</h2>
            <p className="text-sm text-zinc-500 mt-1">
              Sync, import, and triage legacy M-Pesa records.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={handleSyncLegacyQueue}
              disabled={legacySyncing || legacyBackfilling || legacyDateImporting || legacyClearingQueue}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${legacySyncing ? 'animate-spin' : ''}`} />
              {legacySyncing ? 'Syncing...' : 'Sync New Payments'}
            </button>
            <button
              type="button"
              onClick={handleBackfillLegacyQueue}
              disabled={legacyBackfilling || legacySyncing || legacyDateImporting || legacyClearingQueue}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${legacyBackfilling ? 'animate-spin' : ''}`} />
              {legacyBackfilling ? 'Backfilling...' : 'Backfill Older History'}
            </button>
            <button
              type="button"
              onClick={handleClearLegacyQueue}
              disabled={legacyClearingQueue || legacySyncing || legacyBackfilling || legacyDateImporting}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-300 disabled:opacity-50"
            >
              {legacyClearingQueue ? 'Ignoring...' : 'Ignore Pending Queue'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3">
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Date From</label>
            <input
              type="date"
              value={legacyDateFrom}
              onChange={(e) => setLegacyDateFrom(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Date To</label>
            <input
              type="date"
              value={legacyDateTo}
              onChange={(e) => setLegacyDateTo(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="md:self-end">
            <button
              type="button"
              onClick={handleImportLegacyDateRange}
              disabled={legacyDateImporting || legacyBackfilling || legacySyncing || legacyClearingQueue}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 text-zinc-950 rounded-xl text-sm font-bold disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${legacyDateImporting ? 'animate-spin' : ''}`} />
              {legacyDateImporting ? 'Importing...' : 'Import Date Range'}
            </button>
          </div>
        </div>
      </div>

      <div className="border border-zinc-800/60 rounded-2xl p-4 bg-zinc-950/40 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-white">Mass Assignment</h3>
            <p className="text-xs text-zinc-500 mt-1">
              Select queue rows or apply the same package and duration to all pending users.
            </p>
          </div>
          <p className="text-xs text-zinc-400">
            {selectedLegacyQueueIds.length} selected
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_140px_auto_auto] gap-3">
          <select
            value={legacyBulkMode}
            onChange={(e) => setLegacyBulkMode(e.target.value as AssignmentMode)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white"
          >
            <option value="subscription">Subscription</option>
            <option value="jackpot">Jackpot</option>
          </select>
          {legacyBulkMode === 'subscription' ? (
            <>
              <select
                value={legacyBulkTier}
                onChange={(e) => setLegacyBulkTier(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white"
              >
                {subscriptionTiers.map((tier) => (
                  <option key={tier.id} value={tier.id}>{tier.name}</option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                value={legacyBulkDays}
                onChange={(e) => setLegacyBulkDays(Number(e.target.value))}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white"
              />
            </>
          ) : (
            <>
              <select
                value={legacyBulkJackpotType}
                onChange={(e) => setLegacyBulkJackpotType(e.target.value as JackpotGrantType)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white"
              >
                <option value="midweek">Midweek</option>
                <option value="mega">Mega</option>
              </select>
              <select
                value={legacyBulkJackpotDcLevel}
                onChange={(e) => setLegacyBulkJackpotDcLevel(Number(e.target.value))}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white"
              >
                {JACKPOT_DC_OPTIONS.map((dc) => (
                  <option key={dc} value={dc}>{dc}DC</option>
                ))}
              </select>
            </>
          )}
          <button
            type="button"
            onClick={handleSelectAllVisibleLegacyQueue}
            disabled={legacyBulkAssigning || legacyQueueLoading || legacyQueue.length === 0}
            className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white disabled:opacity-50"
          >
            Select Visible
          </button>
          <button
            type="button"
            onClick={() => setSelectedLegacyQueueIds([])}
            disabled={legacyBulkAssigning || selectedLegacyQueueIds.length === 0}
            className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white disabled:opacity-50"
          >
            Clear Selection
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => handleBulkAssignLegacyQueue(false)}
            disabled={legacyBulkAssigning || legacyAssigningId !== null || selectedLegacyQueueIds.length === 0}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 text-zinc-950 rounded-xl text-sm font-bold disabled:opacity-50"
          >
            {legacyBulkAssigning ? 'Applying...' : 'Apply To Selected'}
          </button>
          <button
            type="button"
            onClick={() => handleBulkAssignLegacyQueue(true)}
            disabled={legacyBulkAssigning || legacyAssigningId !== null}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-white disabled:opacity-50"
          >
            {legacyBulkAssigning ? 'Applying...' : 'Apply To All Pending'}
          </button>
        </div>
      </div>

      <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex gap-2 overflow-x-auto">
            {[
              { key: 'pending_assignment', label: 'Pending' },
              { key: 'ignored', label: 'Ignored' },
              { key: 'assigned', label: 'Assigned' },
              { key: 'all', label: 'All' },
            ].map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => {
                  setLegacyQueueStatus(filter.key as LegacyQueueStatus);
                  setLegacyQueuePage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                  legacyQueueStatus === filter.key ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-950 text-zinc-400'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-zinc-500">
            Page {legacyQueuePage} of {legacyQueueTotalPages} - {legacyQueueTotal.toLocaleString()} queue items
          </p>
        </div>

        <div className="space-y-3">
          {legacyQueueLoading ? (
            <div className="text-sm text-zinc-500 py-6">Loading legacy queue...</div>
          ) : legacyQueue.length === 0 ? (
            <div className="text-sm text-zinc-500 py-6">No legacy payments in this queue state.</div>
          ) : (
            legacyQueue.map((item) => (
              <div key={item.id} className="border border-zinc-800/60 rounded-2xl p-4 bg-zinc-950/60">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="checkbox"
                        checked={selectedLegacyQueueIds.includes(item.id)}
                        onChange={(e) => toggleLegacyQueueSelection(item.id, e.target.checked)}
                        disabled={item.onboarding_status !== 'pending_assignment' || legacyBulkAssigning}
                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500"
                      />
                      <span className="text-sm font-semibold text-white">
                        {[item.first_name, item.other_name].filter(Boolean).join(' ') || item.phone}
                      </span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                        item.onboarding_status === 'assigned'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : item.onboarding_status === 'ignored'
                            ? 'bg-zinc-800 text-zinc-300'
                            : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {item.onboarding_status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">Phone: {item.phone}</p>
                    <p className="text-xs text-zinc-400">
                      Amount: KES {item.amount.toLocaleString()} - Paid: {item.paid_at ? new Date(item.paid_at).toLocaleString() : '-'}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Source ID: {item.source_record_id} {item.user_name ? `- Linked user: ${item.user_name}` : '- New queue user'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 lg:w-[720px]">
                    <select
                      value={legacyAssignMode[item.id] || 'subscription'}
                      onChange={(e) => setLegacyAssignMode((prev) => ({ ...prev, [item.id]: e.target.value as AssignmentMode }))}
                      disabled={item.onboarding_status !== 'pending_assignment'}
                      className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white"
                    >
                      <option value="subscription">Subscription</option>
                      <option value="jackpot">Jackpot</option>
                    </select>
                    {(legacyAssignMode[item.id] || 'subscription') === 'subscription' ? (
                      <>
                        <select
                          value={legacyAssignTier[item.id] || subscriptionTiers[0]?.id || ''}
                          onChange={(e) => setLegacyAssignTier((prev) => ({ ...prev, [item.id]: e.target.value }))}
                          disabled={item.onboarding_status !== 'pending_assignment'}
                          className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white"
                        >
                          {subscriptionTiers.map((tier) => (
                            <option key={tier.id} value={tier.id}>{tier.name}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min="1"
                          value={legacyAssignDays[item.id] || 30}
                          onChange={(e) => setLegacyAssignDays((prev) => ({ ...prev, [item.id]: Number(e.target.value) }))}
                          disabled={item.onboarding_status !== 'pending_assignment'}
                          className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white"
                        />
                      </>
                    ) : (
                      <>
                        <select
                          value={legacyAssignJackpotType[item.id] || 'midweek'}
                          onChange={(e) => setLegacyAssignJackpotType((prev) => ({ ...prev, [item.id]: e.target.value as JackpotGrantType }))}
                          disabled={item.onboarding_status !== 'pending_assignment'}
                          className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white"
                        >
                          <option value="midweek">Midweek</option>
                          <option value="mega">Mega</option>
                        </select>
                        <select
                          value={legacyAssignJackpotDcLevel[item.id] || 3}
                          onChange={(e) => setLegacyAssignJackpotDcLevel((prev) => ({ ...prev, [item.id]: Number(e.target.value) }))}
                          disabled={item.onboarding_status !== 'pending_assignment'}
                          className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white"
                        >
                          {JACKPOT_DC_OPTIONS.map((dc) => (
                            <option key={dc} value={dc}>{dc}DC</option>
                          ))}
                        </select>
                      </>
                    )}
                    <button
                      type="button"
                      disabled={item.onboarding_status !== 'pending_assignment' || legacyAssigningId === item.id || legacyBulkAssigning || legacyDeletingId === item.id}
                      onClick={() => handleAssignLegacyQueueItem(item)}
                      className="px-3 py-2 rounded-xl bg-emerald-500 text-zinc-950 text-sm font-bold disabled:opacity-50"
                    >
                      {legacyAssigningId === item.id ? 'Assigning...' : item.onboarding_status === 'assigned' ? 'Assigned' : item.onboarding_status === 'ignored' ? 'Ignored' : 'Assign'}
                    </button>
                    {item.onboarding_status === 'pending_assignment' && (
                      <button
                        type="button"
                        disabled={legacyDeletingId === item.id || legacyAssigningId === item.id || legacyBulkAssigning}
                        onClick={() => handleDeleteLegacyQueueItem(item)}
                        className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-bold disabled:opacity-50 inline-flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        {legacyDeletingId === item.id ? 'Ignoring...' : 'Ignore'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-zinc-500">
            Page {legacyQueuePage} of {legacyQueueTotalPages} - {legacyQueueTotal.toLocaleString()} queue items
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={legacyQueuePage <= 1 || legacyQueueLoading}
              onClick={() => setLegacyQueuePage((page) => Math.max(1, page - 1))}
              className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-300 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={legacyQueuePage >= legacyQueueTotalPages || legacyQueueLoading}
              onClick={() => setLegacyQueuePage((page) => Math.min(legacyQueueTotalPages, page + 1))}
              className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-300 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
