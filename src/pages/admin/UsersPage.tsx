import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search, ChevronDown, ChevronUp, Users as UsersIcon, Shield, Ban,
  Crown, Clock, Globe, MoreVertical, Eye, ArrowUpDown, UserX, UserCheck,
  Download, Gift, X, XCircle, MessageSquare, RefreshCw, Trash2
} from 'lucide-react';
import { adminService, type AdminUser, type LegacyMpesaQueueItem, type UserActivityDetail } from '../../services/adminService';
import { getPricingTiers, type TierConfig } from '../../services/pricingService';
import { toast } from 'sonner';

type SortField = 'name' | 'email' | 'subscription_tier' | 'last_seen' | 'total_time_spent' | 'created_at';
type SortDir = 'asc' | 'desc';
type AssignmentMode = 'subscription' | 'jackpot';
type JackpotGrantType = 'midweek' | 'mega';

const JACKPOT_DC_OPTIONS = [3, 4, 5, 6, 7, 10];

const getFlagEmoji = (countryCode: string) => {
  if (!countryCode || countryCode.length !== 2) return '';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

export function UsersPage() {
  const today = new Date();
  const todayDate = today.toISOString().slice(0, 10);
  const monthStartDate = `${todayDate.slice(0, 8)}01`;
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState<
    'grant_subscription' | 'grant_jackpot' | 'revoke_subscription' | 'ban' | 'unban' | 'enable_sms' | 'disable_sms'
  >('grant_subscription');
  const [bulkGrantTier, setBulkGrantTier] = useState<string>('');
  const [bulkGrantDays, setBulkGrantDays] = useState<number>(30);
  const [bulkJackpotType, setBulkJackpotType] = useState<JackpotGrantType>('midweek');
  const [bulkJackpotDcLevel, setBulkJackpotDcLevel] = useState<number>(3);
  const [bulkGranting, setBulkGranting] = useState(false);
  const [sortField, setSortField] = useState<SortField>('last_seen');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);
  const [userDetail, setUserDetail] = useState<UserActivityDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [filterTier, setFilterTier] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [userCounts, setUserCounts] = useState<Record<string, number>>({ all: 0, online: 0 });
  const [legacyQueue, setLegacyQueue] = useState<LegacyMpesaQueueItem[]>([]);
  const [legacyQueuePage, setLegacyQueuePage] = useState(1);
  const [legacyQueueTotal, setLegacyQueueTotal] = useState(0);
  const [legacyQueueTotalPages, setLegacyQueueTotalPages] = useState(1);
  const [legacyQueueStatus, setLegacyQueueStatus] = useState<'pending_assignment' | 'assigned' | 'all'>('pending_assignment');
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
  const [legacyBulkTier, setLegacyBulkTier] = useState<string>('');
  const [legacyBulkDays, setLegacyBulkDays] = useState<number>(30);
  const [legacyBulkJackpotType, setLegacyBulkJackpotType] = useState<JackpotGrantType>('midweek');
  const [legacyBulkJackpotDcLevel, setLegacyBulkJackpotDcLevel] = useState<number>(3);
  const legacyAutoSyncInFlight = useRef(false);

  const [grantModalOpen, setGrantModalOpen] = useState<number | null>(null);
  const [grantTier, setGrantTier] = useState<string>('premium');
  const [grantDays, setGrantDays] = useState<number>(30);
  const [granting, setGranting] = useState(false);
  const [availableTiers, setAvailableTiers] = useState<TierConfig[]>([]);
  const [onboardPhone, setOnboardPhone] = useState('');
  const [onboardAssignmentMode, setOnboardAssignmentMode] = useState<AssignmentMode>('subscription');
  const [onboardTier, setOnboardTier] = useState<string>('basic');
  const [onboardDays, setOnboardDays] = useState<number>(30);
  const [onboardJackpotType, setOnboardJackpotType] = useState<JackpotGrantType>('midweek');
  const [onboardJackpotDcLevel, setOnboardJackpotDcLevel] = useState<number>(3);
  const [onboardAmount, setOnboardAmount] = useState<number>(0);
  const [onboarding, setOnboarding] = useState(false);
  const perPage = 50;
  const legacyQueuePerPage = 10;
  const subscriptionTiers = useMemo(
    () => availableTiers,
    [availableTiers]
  );
  const paidTiers = useMemo(
    () => availableTiers.filter((tier) => tier.id !== 'free'),
    [availableTiers]
  );
  const grantTargetUser = useMemo(
    () => users.find((user) => user.id === grantModalOpen) || null,
    [users, grantModalOpen]
  );

  useEffect(() => {
    getPricingTiers().then((tiers) => {
      setAvailableTiers(tiers);
      const defaultTier = tiers.find((tier) => tier.id !== 'free');
      if (defaultTier) {
        setOnboardTier(defaultTier.id);
        setBulkGrantTier(defaultTier.id);
        setLegacyBulkTier(defaultTier.id);
      }
    });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const loadUsers = (page = currentPage) => {
    setLoading(true);
    adminService.getUsers({
      search: debouncedSearch || undefined,
      tier: filterTier,
      sort_field: sortField,
      sort_dir: sortDir,
      page,
      per_page: perPage,
    })
      .then((data) => {
        setUsers(data.users);
        setTotalUsers(data.total);
        setTotalPages(Math.max(data.total_pages, 1));
        setUserCounts(data.counts);
        if (expandedUserId !== null && !data.users.some((user) => user.id === expandedUserId)) {
          setExpandedUserId(null);
          setUserDetail(null);
        }
      })
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsers(currentPage);
  }, [currentPage, debouncedSearch, filterTier, sortField, sortDir]);

  useEffect(() => {
    setSelectedUserIds((prev) => prev.filter((id) => users.some((user) => user.id === id)));
  }, [users]);

  const loadLegacyQueue = (page = legacyQueuePage) => {
    setLegacyQueueLoading(true);
    adminService.getLegacyMpesaQueue(legacyQueueStatus, page, legacyQueuePerPage)
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
          loadUsers(currentPage);
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
  }, [paidTiers, legacyQueuePage, currentPage, legacyQueueStatus]);

  useEffect(() => {
    setSelectedLegacyQueueIds((prev) =>
      prev.filter((id) => {
        const item = legacyQueue.find((queueItem) => queueItem.id === id);
        return item ? item.onboarding_status !== 'assigned' : true;
      })
    );
  }, [legacyQueue]);

  const handleExpandUser = async (userId: number) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      setUserDetail(null);
      return;
    }
    setExpandedUserId(userId);
    setDetailLoading(true);
    try {
      const detail = await adminService.getUserActivity(userId);
      setUserDetail(detail);
    } catch {
      toast.error('Failed to load user details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
    setCurrentPage(1);
  };

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setDebouncedSearch(searchQuery.trim());
    setCurrentPage(1);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setCurrentPage(1);
  };

  const handleRevoke = async (userId: number) => {
    if (!confirm('Revoke subscription and revert to FREE?')) return;
    try {
      await adminService.revokeSubscription(userId);
      toast.success('Subscription revoked');
      loadUsers();
    } catch {
      toast.error('Failed to revoke subscription');
    }
  };

  const handleGrantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantModalOpen) return;
    setGranting(true);
    try {
      await adminService.grantSubscription(grantModalOpen, {
        assignmentMode: 'subscription',
        tier: grantTier,
        durationDays: grantDays,
      });
      toast.success('Subscription granted successfully');
      setGrantModalOpen(null);
      loadUsers();
    } catch {
      toast.error('Failed to grant subscription');
    } finally {
      setGranting(false);
    }
  };

  const toggleUserSelection = (userId: number, checked: boolean) => {
    setSelectedUserIds((prev) => {
      if (checked) {
        return prev.includes(userId) ? prev : [...prev, userId];
      }
      return prev.filter((id) => id !== userId);
    });
  };

  const handleSelectAllVisibleUsers = () => {
    const visibleUserIds = users.map((user) => user.id);
    if (visibleUserIds.length === 0) {
      return;
    }
    const allSelected = visibleUserIds.every((id) => selectedUserIds.includes(id));
    setSelectedUserIds((prev) => {
      if (allSelected) {
        return prev.filter((id) => !visibleUserIds.includes(id));
      }
      return Array.from(new Set([...prev, ...visibleUserIds]));
    });
  };

  const handleBulkGrantUsers = async (applyToFiltered: boolean) => {
    if (!applyToFiltered && selectedUserIds.length === 0) {
      toast.error('Select at least one user');
      return;
    }
    if (bulkAction === 'grant_subscription') {
      if (!bulkGrantTier) {
        toast.error('Select a global package');
        return;
      }
      if (!Number.isFinite(bulkGrantDays) || bulkGrantDays < 1) {
        toast.error('Global duration must be at least 1 day');
        return;
      }
    }
    if (bulkAction === 'grant_jackpot') {
      if (!bulkJackpotType || !bulkJackpotDcLevel) {
        toast.error('Select jackpot type and DC level');
        return;
      }
    }

    setBulkGranting(true);
    try {
      const result = await adminService.bulkUpdateUsers({
        action: bulkAction,
        userIds: selectedUserIds,
        applyToFiltered,
        filters: {
          search: debouncedSearch || undefined,
          tier: filterTier,
        },
        tier: bulkAction === 'grant_subscription' ? bulkGrantTier : undefined,
        durationDays: bulkAction === 'grant_subscription' ? bulkGrantDays : undefined,
        jackpotType: bulkAction === 'grant_jackpot' ? bulkJackpotType : undefined,
        jackpotDcLevel: bulkAction === 'grant_jackpot' ? bulkJackpotDcLevel : undefined,
      });
      toast.success(`Bulk update complete: ${result.updated} users updated${result.skipped ? `, ${result.skipped} skipped` : ''}`);
      setSelectedUserIds((prev) =>
        applyToFiltered ? [] : prev.filter((id) => !result.updated_user_ids.includes(id))
      );
      setExpandedUserId(null);
      setUserDetail(null);
      setCurrentPage(1);
      loadUsers(1);
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'Failed to update selected users';
      toast.error(message);
    } finally {
      setBulkGranting(false);
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    if (!confirm(user.is_active ? 'Ban this user?' : 'Unban this user?')) return;
    try {
      await adminService.toggleUserActive(user.id);
      toast.success(user.is_active ? 'User banned' : 'User unbanned');
      loadUsers();
    } catch {
      toast.error('Cannot ban yourself');
    }
  };

  const handleMakeAdmin = async (userId: number) => {
    if (!confirm('Grant admin privileges?')) return;
    try {
      await adminService.makeAdmin(userId);
      toast.success('User is now an admin');
      loadUsers();
    } catch {
      toast.error('Failed to make admin');
    }
  };

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardPhone.trim()) {
      toast.error('Enter the subscriber phone number');
      return;
    }
    if (onboardAssignmentMode === 'subscription') {
      if (!onboardTier) {
        toast.error('Select a subscription package');
        return;
      }
      if (!Number.isFinite(onboardDays) || onboardDays < 1) {
        toast.error('Duration must be at least 1 day');
        return;
      }
    }
    if (!Number.isFinite(onboardAmount) || onboardAmount <= 0) {
      toast.error('Amount paid must be greater than zero');
      return;
    }

    setOnboarding(true);
    try {
      const result = await adminService.onboardSmsUser({
        phone: onboardPhone,
        assignmentMode: onboardAssignmentMode,
        tier: onboardAssignmentMode === 'subscription' ? onboardTier : undefined,
        durationDays: onboardAssignmentMode === 'subscription' ? onboardDays : undefined,
        jackpotType: onboardAssignmentMode === 'jackpot' ? onboardJackpotType : undefined,
        jackpotDcLevel: onboardAssignmentMode === 'jackpot' ? onboardJackpotDcLevel : undefined,
        amountPaid: onboardAmount,
      });
      toast.success(result.created ? 'SMS subscriber onboarded' : 'Subscriber updated and renewed');
      setOnboardPhone('');
      setOnboardDays(30);
      setOnboardAmount(0);
      setCurrentPage(1);
      loadUsers(1);
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'Failed to onboard SMS subscriber';
      toast.error(message);
    } finally {
      setOnboarding(false);
    }
  };

  const handleSyncLegacyQueue = async () => {
    setLegacySyncing(true);
    try {
      const result = await adminService.syncLegacyMpesa();
      toast.success(`Legacy sync complete: ${result.imported} imported, ${result.skipped} skipped`);
      setLegacyQueuePage(1);
      loadLegacyQueue(1);
      loadUsers(1);
      setCurrentPage(1);
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
      loadUsers(1);
      setCurrentPage(1);
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
      loadUsers(1);
      setCurrentPage(1);
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'Failed to import legacy M-Pesa date range';
      toast.error(message);
    } finally {
      setLegacyDateImporting(false);
    }
  };

  const handleClearLegacyQueue = async () => {
    if (!confirm('Clear all pending legacy queue items? Assigned rows will be kept.')) return;

    setLegacyClearingQueue(true);
    try {
      const result = await adminService.clearLegacyMpesaQueue();
      toast.success(`Cleared ${result.cleared} pending legacy queue item${result.cleared === 1 ? '' : 's'}`);
      setSelectedLegacyQueueIds([]);
      setLegacyQueuePage(1);
      loadLegacyQueue(1);
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'Failed to clear legacy queue';
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
      loadUsers(1);
      setCurrentPage(1);
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'Failed to assign legacy payment';
      toast.error(message);
    } finally {
      setLegacyAssigningId(null);
    }
  };

  const handleDeleteLegacyQueueItem = async (item: LegacyMpesaQueueItem) => {
    if (!confirm(`Delete pending legacy queue item ${item.source_record_id}?`)) return;

    setLegacyDeletingId(item.id);
    try {
      await adminService.deleteLegacyMpesaQueueItem(item.id);
      toast.success('Legacy queue item deleted');
      setSelectedLegacyQueueIds((prev) => prev.filter((id) => id !== item.id));
      loadLegacyQueue(legacyQueuePage);
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'Failed to delete legacy queue item';
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
      .filter((item) => item.onboarding_status !== 'assigned')
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
      loadUsers(1);
      setCurrentPage(1);
    } catch (error: any) {
      const message = error?.response?.data?.detail || 'Failed to bulk assign legacy payments';
      toast.error(message);
    } finally {
      setLegacyBulkAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-12 bg-zinc-900/60 rounded-xl" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 bg-zinc-900/60 rounded-xl" />
        ))}
      </div>
    );
  }

  const allVisibleUsersSelected = users.length > 0 && users.every((user) => selectedUserIds.includes(user.id));

  return (
    <div className="space-y-5 overflow-hidden">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white font-display">User Management</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {totalUsers.toLocaleString()} users in current result
        </p>
      </div>

      <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4 sm:p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">SMS Subscriber Onboarding</h2>
            <p className="text-sm text-zinc-500 mt-1">
              Create or update a phone-based account, attach a package, and record the payment in one step.
            </p>
          </div>
        </div>

        <form onSubmit={handleOnboardSubmit} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
          <div className="xl:col-span-2">
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Phone Number</label>
            <input
              type="text"
              value={onboardPhone}
              onChange={e => setOnboardPhone(e.target.value)}
              placeholder="+2547..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Grant Type</label>
            <select
              value={onboardAssignmentMode}
              onChange={e => setOnboardAssignmentMode(e.target.value as AssignmentMode)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="subscription">Subscription</option>
              <option value="jackpot">Jackpot</option>
            </select>
          </div>
          {onboardAssignmentMode === 'subscription' ? (
            <>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Package</label>
                <select
                  value={onboardTier}
                  onChange={e => setOnboardTier(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  {subscriptionTiers.map(tier => (
                    <option key={tier.id} value={tier.id}>
                      {tier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Duration (Days)</label>
                <input
                  type="number"
                  min="1"
                  value={onboardDays}
                  onChange={e => setOnboardDays(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Jackpot Type</label>
                <select
                  value={onboardJackpotType}
                  onChange={e => setOnboardJackpotType(e.target.value as JackpotGrantType)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="midweek">Midweek</option>
                  <option value="mega">Mega</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Jackpot DC</label>
                <select
                  value={onboardJackpotDcLevel}
                  onChange={e => setOnboardJackpotDcLevel(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  {JACKPOT_DC_OPTIONS.map((dc) => (
                    <option key={dc} value={dc}>{dc}DC</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Amount Paid</label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={onboardAmount || ''}
              onChange={e => setOnboardAmount(Number(e.target.value))}
              placeholder="0.00"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="md:col-span-2 xl:col-span-5 flex justify-end">
            <button
              type="submit"
              disabled={onboarding || subscriptionTiers.length === 0}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl transition-all disabled:opacity-50"
            >
              <MessageSquare className="w-4 h-4" />
              {onboarding ? 'Onboarding...' : 'Onboard SMS Subscriber'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">Legacy M-Pesa Queue</h2>
            <p className="text-sm text-zinc-500 mt-1">
              Import payments from the old platform, then assign package access here.
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
              {legacyClearingQueue ? 'Clearing...' : 'Clear Pending Queue'}
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

        <div className="flex gap-2 overflow-x-auto">
          {[
            { key: 'pending_assignment', label: 'Pending' },
            { key: 'assigned', label: 'Assigned' },
            { key: 'all', label: 'All' },
          ].map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => {
                setLegacyQueueStatus(filter.key as 'pending_assignment' | 'assigned' | 'all');
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
                        disabled={item.onboarding_status === 'assigned' || legacyBulkAssigning}
                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500"
                      />
                      <span className="text-sm font-semibold text-white">
                        {[item.first_name, item.other_name].filter(Boolean).join(' ') || item.phone}
                      </span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                        item.onboarding_status === 'assigned'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {item.onboarding_status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">Phone: {item.phone}</p>
                    <p className="text-xs text-zinc-400">
                      Amount: KES {item.amount.toLocaleString()} • Paid: {item.paid_at ? new Date(item.paid_at).toLocaleString() : '—'}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Source ID: {item.source_record_id} {item.user_name ? `• Linked user: ${item.user_name}` : '• New queue user'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 lg:w-[720px]">
                    <select
                      value={legacyAssignMode[item.id] || 'subscription'}
                      onChange={(e) => setLegacyAssignMode((prev) => ({ ...prev, [item.id]: e.target.value as AssignmentMode }))}
                      disabled={item.onboarding_status === 'assigned'}
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
                          disabled={item.onboarding_status === 'assigned'}
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
                          disabled={item.onboarding_status === 'assigned'}
                          className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white"
                        />
                      </>
                    ) : (
                      <>
                        <select
                          value={legacyAssignJackpotType[item.id] || 'midweek'}
                          onChange={(e) => setLegacyAssignJackpotType((prev) => ({ ...prev, [item.id]: e.target.value as JackpotGrantType }))}
                          disabled={item.onboarding_status === 'assigned'}
                          className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white"
                        >
                          <option value="midweek">Midweek</option>
                          <option value="mega">Mega</option>
                        </select>
                        <select
                          value={legacyAssignJackpotDcLevel[item.id] || 3}
                          onChange={(e) => setLegacyAssignJackpotDcLevel((prev) => ({ ...prev, [item.id]: Number(e.target.value) }))}
                          disabled={item.onboarding_status === 'assigned'}
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
                      disabled={item.onboarding_status === 'assigned' || legacyAssigningId === item.id || legacyBulkAssigning || legacyDeletingId === item.id}
                      onClick={() => handleAssignLegacyQueueItem(item)}
                      className="px-3 py-2 rounded-xl bg-emerald-500 text-zinc-950 text-sm font-bold disabled:opacity-50"
                    >
                      {legacyAssigningId === item.id ? 'Assigning...' : item.onboarding_status === 'assigned' ? 'Assigned' : 'Assign'}
                    </button>
                    {item.onboarding_status !== 'assigned' && (
                      <button
                        type="button"
                        disabled={legacyDeletingId === item.id || legacyAssigningId === item.id || legacyBulkAssigning}
                        onClick={() => handleDeleteLegacyQueueItem(item)}
                        className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-bold disabled:opacity-50 inline-flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        {legacyDeletingId === item.id ? 'Deleting...' : 'Delete'}
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
            Page {legacyQueuePage} of {legacyQueueTotalPages} • {legacyQueueTotal.toLocaleString()} queue items
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

      {/* ─── Filters Bar ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="search"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by name, email, phone, or country..."
            aria-label="Search users"
            autoComplete="off"
            className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>
        <div className="flex gap-1.5 bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-1 overflow-x-auto">
          {[
            { key: 'all', label: 'All' },
            { key: 'online', label: '🟢 Online' },
            { key: 'free', label: 'Free' },
            ...availableTiers.filter((tier) => tier.id !== 'free').map(t => ({ key: t.id, label: t.name })),
          ].map(f => (
            <button
              key={f.key}
              onClick={() => {
                setFilterTier(f.key);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all ${
                filterTier === f.key
                  ? 'bg-emerald-500 text-zinc-950'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {f.label} {userCounts[f.key] !== undefined ? `(${userCounts[f.key]})` : ''}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-white">User Mass Edit</h2>
            <p className="text-sm text-zinc-500 mt-1">
              Apply a bulk action to selected users or the full filtered result.
            </p>
          </div>
          <p className="text-xs text-zinc-400">
            {selectedUserIds.length} selected • {totalUsers.toLocaleString()} in current result
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_140px_auto_auto] gap-3">
          <select
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value as typeof bulkAction)}
            className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white"
          >
            <option value="grant_subscription">Grant Subscription</option>
            <option value="grant_jackpot">Grant Jackpot</option>
            <option value="revoke_subscription">Revoke Subscription</option>
            <option value="ban">Ban Users</option>
            <option value="unban">Unban Users</option>
            <option value="enable_sms">Enable SMS Tips</option>
            <option value="disable_sms">Disable SMS Tips</option>
          </select>
          {bulkAction === 'grant_subscription' ? (
            <select
              value={bulkGrantTier}
              onChange={(e) => setBulkGrantTier(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white"
            >
              {subscriptionTiers.map((tier) => (
                <option key={tier.id} value={tier.id}>{tier.name}</option>
              ))}
            </select>
          ) : bulkAction === 'grant_jackpot' ? (
            <select
              value={bulkJackpotType}
              onChange={(e) => setBulkJackpotType(e.target.value as JackpotGrantType)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white"
            >
              <option value="midweek">Midweek</option>
              <option value="mega">Mega</option>
            </select>
          ) : (
            <div className="px-3 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-sm text-zinc-500">
              {bulkAction === 'revoke_subscription' && 'Set selected users to Free'}
              {bulkAction === 'ban' && 'Disable account access'}
              {bulkAction === 'unban' && 'Restore account access'}
              {bulkAction === 'enable_sms' && 'Turn on SMS tips'}
              {bulkAction === 'disable_sms' && 'Turn off SMS tips'}
            </div>
          )}
          {bulkAction === 'grant_subscription' ? (
            <input
              type="number"
              min="1"
              value={bulkGrantDays}
              onChange={(e) => setBulkGrantDays(Number(e.target.value))}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white"
            />
          ) : bulkAction === 'grant_jackpot' ? (
            <select
              value={bulkJackpotDcLevel}
              onChange={(e) => setBulkJackpotDcLevel(Number(e.target.value))}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white"
            >
              {JACKPOT_DC_OPTIONS.map((dc) => (
                <option key={dc} value={dc}>{dc}DC</option>
              ))}
            </select>
          ) : (
            <div className="px-3 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 text-sm text-zinc-500">
              No duration needed
            </div>
          )}
          <button
            type="button"
            onClick={handleSelectAllVisibleUsers}
            disabled={bulkGranting || users.length === 0}
            className="px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white disabled:opacity-50"
          >
            {allVisibleUsersSelected ? 'Unselect Visible' : 'Select Visible'}
          </button>
          <button
            type="button"
            onClick={() => setSelectedUserIds([])}
            disabled={bulkGranting || selectedUserIds.length === 0}
            className="px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white disabled:opacity-50"
          >
            Clear Selection
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => handleBulkGrantUsers(false)}
            disabled={bulkGranting || selectedUserIds.length === 0}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 text-zinc-950 rounded-xl text-sm font-bold disabled:opacity-50"
          >
            {bulkGranting ? 'Applying...' : 'Apply To Selected'}
          </button>
          <button
            type="button"
            onClick={() => handleBulkGrantUsers(true)}
            disabled={bulkGranting || totalUsers === 0}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white disabled:opacity-50"
          >
            {bulkGranting ? 'Applying...' : 'Apply To Current Result'}
          </button>
        </div>
      </div>

      {/* ─── Users: Desktop Table + Mobile Cards ───────── */}
      <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-800/60">
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={allVisibleUsersSelected}
                    onChange={() => handleSelectAllVisibleUsers()}
                    disabled={bulkGranting || users.length === 0}
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500"
                    aria-label="Select visible users"
                  />
                </th>
                {([
                  { field: 'name' as SortField, label: 'User' },
                  { field: 'subscription_tier' as SortField, label: 'Tier' },
                  { field: 'last_seen' as SortField, label: 'Status' },
                  { field: 'total_time_spent' as SortField, label: 'Activity' },
                  { field: 'created_at' as SortField, label: 'Joined' },
                ]).map(col => (
                  <th key={col.field} onClick={() => handleSort(col.field)} className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider cursor-pointer hover:text-zinc-300 transition-colors select-none">
                    <div className="flex items-center gap-1">{col.label}<ArrowUpDown className={`w-3 h-3 ${sortField === col.field ? 'text-emerald-400' : ''}`} /></div>
                  </th>
                ))}
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <React.Fragment key={u.id}>
                  <tr className={`border-b border-zinc-800/30 hover:bg-zinc-800/20 transition-colors cursor-pointer ${expandedUserId === u.id ? 'bg-zinc-800/20' : ''}`} onClick={() => handleExpandUser(u.id)}>
                    <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(u.id)}
                        onChange={(e) => toggleUserSelection(u.id, e.target.checked)}
                        disabled={bulkGranting}
                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500"
                        aria-label={`Select ${u.name}`}
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold ${!u.is_active ? 'bg-red-500/10 text-red-400' : u.is_admin ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>{u.name.charAt(0).toUpperCase()}</div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5"><span className="text-sm font-medium text-white truncate">{u.name}</span>{u.is_admin && <Shield className="w-3 h-3 text-emerald-400" />}{!u.is_active && <Ban className="w-3 h-3 text-red-400" />}</div>
                          <p className="text-[11px] text-zinc-500 truncate">{u.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {u.phone && <p className="text-[11px] text-zinc-500 truncate">{u.phone}</p>}
                            {u.sms_tips_enabled && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase">
                                <MessageSquare className="w-3 h-3" />
                                SMS
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5"><TierBadge tier={u.subscription_tier} expiresAt={u.subscription_expires_at} entitlements={u.subscription_entitlements} /></td>
                    <td className="px-4 py-3.5">
                      {u.is_online ? (<span className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[11px] font-bold rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Online</span>) : (<div><span className="text-[11px] text-zinc-500">Offline</span>{u.last_seen && <p className="text-[10px] text-zinc-600">{new Date(u.last_seen).toLocaleDateString()}</p>}</div>)}
                    </td>
                    <td className="px-4 py-3.5"><div className="text-[11px] text-zinc-400"><p>{u.most_visited_page || '\u2014'}</p><p className="text-zinc-600">{Math.floor(u.total_time_spent / 60)}m total</p></div></td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">{u.country && <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded inline-flex items-center gap-1"><span className="text-[11px] leading-none">{getFlagEmoji(u.country)}</span>{u.country}</span>}<span className="text-[11px] text-zinc-500">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '\u2014'}</span></div>
                    </td>
                    <td className="px-4 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5 justify-end">
                        <button onClick={() => handleExpandUser(u.id)} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all" title="View Details"><Eye className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setGrantModalOpen(u.id)} className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all" title="Grant Subscription"><Gift className="w-3.5 h-3.5" /></button>
                        {u.subscription_tier !== 'free' && <button onClick={() => handleRevoke(u.id)} className="p-1.5 rounded-lg text-zinc-500 hover:text-yellow-400 hover:bg-yellow-500/10 transition-all" title="Revoke All Subscriptions"><XCircle className="w-3.5 h-3.5" /></button>}
                        <button onClick={() => handleToggleActive(u)} className={`p-1.5 rounded-lg transition-all ${u.is_active ? 'text-zinc-500 hover:text-red-400 hover:bg-red-500/10' : 'text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10'}`}>{u.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}</button>
                        {!u.is_admin && <button onClick={() => handleMakeAdmin(u.id)} className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"><Shield className="w-3.5 h-3.5" /></button>}
                      </div>
                    </td>
                  </tr>
                  {expandedUserId === u.id && (
                    <tr><td colSpan={7} className="px-4 py-0">
                      <div className="bg-zinc-800/30 rounded-xl p-4 my-2 border border-zinc-800/40">
                        {detailLoading ? (<div className="flex items-center justify-center py-8"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>) : userDetail ? (
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Summary</h4>
                              <div className="space-y-2 text-xs">
                                <p className="text-zinc-300">Total Time: <span className="font-bold text-white">{Math.floor(userDetail.total_time_spent / 60)}m {userDetail.total_time_spent % 60}s</span></p>
                                <p className="text-zinc-300">Total Spent: <span className="font-bold text-emerald-400">KES {userDetail.total_spent.toLocaleString()}</span></p>
                                <p className="text-zinc-300">Jackpot Purchases: <span className="font-bold">{userDetail.jackpot_purchases}</span></p>
                                <div className="text-zinc-300 flex items-center gap-1">Country: <span className="font-bold text-white">{userDetail.user.country ? <span className="inline-flex items-center gap-1"><span className="text-[13px] leading-none">{getFlagEmoji(userDetail.user.country)}</span>{userDetail.user.country}</span> : 'Unknown'}</span></div>
                              </div>
                              <div>
                                <h5 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Active Entitlements</h5>
                                <ActiveEntitlementsList entitlements={userDetail.user.subscription_entitlements} />
                              </div>
                            </div>
                            <div className="space-y-3"><h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Page Activity</h4><div className="space-y-1.5 max-h-40 overflow-y-auto">{userDetail.pages.map(p => (<div key={p.path} className="flex items-center justify-between text-[11px]"><span className="text-zinc-400 truncate mr-2">{p.path}</span><span className="text-zinc-500 shrink-0">{p.visits}x &bull; {Math.floor(p.total_time / 60)}m</span></div>))}{userDetail.pages.length === 0 && <p className="text-xs text-zinc-600">No activity recorded</p>}</div></div>
                            <div className="space-y-3"><h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Payment History</h4><div className="space-y-1.5 max-h-40 overflow-y-auto">{userDetail.payments.map(p => (<div key={p.id} className="flex items-center justify-between text-[11px]"><div className="flex items-center gap-2"><span className={`w-1.5 h-1.5 rounded-full ${p.status === 'completed' ? 'bg-emerald-500' : p.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'}`} /><span className="text-zinc-300">KES {p.amount.toLocaleString()}</span></div><span className="text-zinc-500 capitalize">{p.method}</span></div>))}{userDetail.payments.length === 0 && <p className="text-xs text-zinc-600">No payments</p>}</div></div>
                          </div>
                        ) : null}
                      </div>
                    </td></tr>
                  )}
                </React.Fragment>
              ))}
              {users.length === 0 && (<tr><td colSpan={7} className="px-4 py-12 text-center text-zinc-500 text-sm">No users found matching your criteria</td></tr>)}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="sm:hidden divide-y divide-zinc-800/40">
          {users.map(u => (
            <div key={u.id}>
              <div className={`p-4 active:bg-zinc-800/30 transition-colors ${expandedUserId === u.id ? 'bg-zinc-800/20' : ''}`} onClick={() => handleExpandUser(u.id)}>
                <div className="flex items-center gap-3 mb-2.5">
                  <div onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(u.id)}
                      onChange={(e) => toggleUserSelection(u.id, e.target.checked)}
                      disabled={bulkGranting}
                      className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500"
                      aria-label={`Select ${u.name}`}
                    />
                  </div>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${!u.is_active ? 'bg-red-500/10 text-red-400' : u.is_admin ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>{u.name.charAt(0).toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5"><span className="text-sm font-medium text-white truncate">{u.name}</span>{u.is_admin && <Shield className="w-3 h-3 text-emerald-400 shrink-0" />}{!u.is_active && <Ban className="w-3 h-3 text-red-400 shrink-0" />}</div>
                    <p className="text-[11px] text-zinc-500 truncate">{u.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {u.phone && <p className="text-[11px] text-zinc-500 truncate">{u.phone}</p>}
                      {u.sms_tips_enabled && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase">
                          <MessageSquare className="w-3 h-3" />
                          SMS
                        </span>
                      )}
                    </div>
                  </div>
                  {u.is_online ? (<span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded-full shrink-0"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online</span>) : (<span className="text-[10px] text-zinc-600 shrink-0">{u.last_seen ? new Date(u.last_seen).toLocaleDateString() : ''}</span>)}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TierBadge tier={u.subscription_tier} expiresAt={u.subscription_expires_at} entitlements={u.subscription_entitlements} />
                    {u.country && <span className="text-[9px] text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded inline-flex items-center gap-1"><span className="text-[10px] leading-none">{getFlagEmoji(u.country)}</span>{u.country}</span>}
                    <span className="text-[10px] text-zinc-600">{Math.floor(u.total_time_spent / 60)}m</span>
                  </div>
                  <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setGrantModalOpen(u.id)} className="p-1.5 rounded-lg text-zinc-600 active:text-emerald-400 transition-all"><Gift className="w-3.5 h-3.5" /></button>
                    {u.subscription_tier !== 'free' && (<button onClick={() => handleRevoke(u.id)} className="p-1.5 rounded-lg text-zinc-600 active:text-yellow-400 transition-all"><XCircle className="w-3.5 h-3.5" /></button>)}
                    <button onClick={() => handleToggleActive(u)} className="p-1.5 rounded-lg text-zinc-600 transition-all">{u.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}</button>
                    {!u.is_admin && (<button onClick={() => handleMakeAdmin(u.id)} className="p-1.5 rounded-lg text-zinc-600 transition-all"><Shield className="w-3.5 h-3.5" /></button>)}
                    <ChevronDown className={`w-3.5 h-3.5 text-zinc-600 transition-transform ${expandedUserId === u.id ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </div>
              {expandedUserId === u.id && (
                <div className="px-4 pb-4">
                  <div className="bg-zinc-800/30 rounded-xl p-3.5 border border-zinc-800/40">
                    {detailLoading ? (<div className="flex items-center justify-center py-6"><div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>) : userDetail ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <p className="text-zinc-400">Time: <span className="font-bold text-white">{Math.floor(userDetail.total_time_spent / 60)}m</span></p>
                          <p className="text-zinc-400">Spent: <span className="font-bold text-emerald-400">KES {userDetail.total_spent.toLocaleString()}</span></p>
                          <p className="text-zinc-400">Jackpots: <span className="font-bold text-white">{userDetail.jackpot_purchases}</span></p>
                          <p className="text-zinc-400">Joined: <span className="font-bold text-white">{userDetail.user.created_at ? new Date(userDetail.user.created_at).toLocaleDateString() : '\u2014'}</span></p>
                        </div>
                        <div>
                          <h4 className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Active Entitlements</h4>
                          <ActiveEntitlementsList entitlements={userDetail.user.subscription_entitlements} compact />
                        </div>
                        {userDetail.pages.length > 0 && (<div><h4 className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Top Pages</h4>{userDetail.pages.slice(0, 3).map(p => (<div key={p.path} className="flex justify-between text-[11px]"><span className="text-zinc-400 truncate mr-2">{p.path}</span><span className="text-zinc-500 shrink-0">{p.visits}x</span></div>))}</div>)}
                        {userDetail.payments.length > 0 && (<div><h4 className="text-[10px] font-bold text-zinc-500 uppercase mb-1">Recent Payments</h4>{userDetail.payments.slice(0, 3).map(p => (<div key={p.id} className="flex justify-between text-[11px]"><div className="flex items-center gap-1.5"><span className={`w-1.5 h-1.5 rounded-full ${p.status === 'completed' ? 'bg-emerald-500' : 'bg-yellow-500'}`} /><span className="text-zinc-300">KES {p.amount.toLocaleString()}</span></div><span className="text-zinc-500 capitalize">{p.method}</span></div>))}</div>)}
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          ))}
          {users.length === 0 && (<div className="px-4 py-12 text-center text-zinc-500 text-sm">No users found matching your criteria</div>)}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 px-1">
        <p className="text-xs text-zinc-500">
          Page {currentPage} of {totalPages} • {totalUsers.toLocaleString()} matching users
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentPage <= 1 || loading}
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            className="px-3 py-2 rounded-xl bg-zinc-900/60 border border-zinc-800/60 text-sm text-zinc-300 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={currentPage >= totalPages || loading}
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            className="px-3 py-2 rounded-xl bg-zinc-900/60 border border-zinc-800/60 text-sm text-zinc-300 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      {grantModalOpen !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-zinc-800">
              <h3 className="text-lg font-bold text-white">Grant Subscription</h3>
              {grantTargetUser && (
                <div className="mt-3 rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3">
                  <p className="text-xs font-medium text-white">{grantTargetUser.name}</p>
                  <p className="text-[11px] text-zinc-500">{grantTargetUser.email}</p>
                  <div className="mt-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Current Active Entitlements</p>
                    <ActiveEntitlementsList entitlements={grantTargetUser.subscription_entitlements} compact />
                  </div>
                  <p className="mt-3 text-[11px] text-zinc-500">New grants stack independently. Granting another tier will not remove the existing ones.</p>
                </div>
              )}
            </div>
            <form onSubmit={handleGrantSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Select Tier</label>
                <select 
                  value={grantTier} 
                  onChange={e => setGrantTier(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  {subscriptionTiers.map(tier => (
                    <option key={tier.id} value={tier.id}>{tier.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Duration (Days)</label>
                <input 
                  type="number" 
                  min="1"
                  value={grantDays} 
                  onChange={e => setGrantDays(parseInt(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setGrantModalOpen(null)}
                  className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl transition-all text-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={granting}
                  className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl transition-all text-sm disabled:opacity-50"
                >
                  {granting ? 'Granting...' : 'Grant Access'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
// Palette of unique tier colors — known tiers get a fixed color, unknown ones get a consistent hash-based color
const TIER_COLOR_PALETTE: Record<string, string> = {
  free:      'bg-zinc-800 text-zinc-500',
  basic:     'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  standard:  'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  premium:   'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
};

const DYNAMIC_COLORS = [
  'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
  'bg-rose-500/10 text-rose-400 border border-rose-500/20',
  'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  'bg-teal-500/10 text-teal-400 border border-teal-500/20',
  'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
  'bg-pink-500/10 text-pink-400 border border-pink-500/20',
  'bg-lime-500/10 text-lime-400 border border-lime-500/20',
  'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  'bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20',
  'bg-sky-500/10 text-sky-400 border border-sky-500/20',
  'bg-violet-500/10 text-violet-400 border border-violet-500/20',
  'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
];

function getTierColor(tier: string): string {
  if (TIER_COLOR_PALETTE[tier]) return TIER_COLOR_PALETTE[tier];
  // Consistent hash so same tier always gets the same color
  let hash = 0;
  for (let i = 0; i < tier.length; i++) hash = tier.charCodeAt(i) + ((hash << 5) - hash);
  return DYNAMIC_COLORS[Math.abs(hash) % DYNAMIC_COLORS.length];
}

function ActiveEntitlementsList({
  entitlements,
  compact = false,
}: {
  entitlements: { id: number; tier_id: string; expires_at: string; payment_id: number | null; source: string }[];
  compact?: boolean;
}) {
  if (!entitlements || entitlements.length === 0) {
    return <p className="text-xs text-zinc-600">No active paid entitlements</p>;
  }

  return (
    <div className={`flex flex-wrap gap-2 ${compact ? '' : 'max-w-full'}`}>
      {entitlements
        .slice()
        .sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime())
        .map((entitlement) => (
          <div key={entitlement.id} className="rounded-lg border border-zinc-800 bg-zinc-900/70 px-2.5 py-1.5">
            <div className="flex items-center gap-2">
              <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${getTierColor(entitlement.tier_id)}`}>
                {entitlement.tier_id}
              </span>
              <span className="text-[10px] text-zinc-500">
                Until {new Date(entitlement.expires_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
    </div>
  );
}

function TierBadge({
  tier,
  expiresAt,
  entitlements = [],
}: {
  tier: string;
  expiresAt: string | null;
  entitlements?: { id: number; tier_id: string; expires_at: string; payment_id: number | null; source: string }[];
}) {
  return (
    <div>
      <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${getTierColor(tier)}`}>
        {tier}
      </span>
      {expiresAt && tier !== 'free' && (
        <p className="text-[9px] text-zinc-600 mt-0.5">Until {new Date(expiresAt).toLocaleDateString()}</p>
      )}
      {entitlements.length > 1 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {entitlements.slice(0, 3).map((entitlement) => (
            <span
              key={entitlement.id}
              className={`inline-block px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase ${getTierColor(entitlement.tier_id)}`}
            >
              {entitlement.tier_id}
            </span>
          ))}
          {entitlements.length > 3 && (
            <span className="inline-block px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase bg-zinc-800 text-zinc-400">
              +{entitlements.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
