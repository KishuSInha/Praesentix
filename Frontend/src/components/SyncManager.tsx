import React, { useEffect, useState } from 'react';
import { offlineStorage } from '../lib/offline-storage';
import apiService from '../utils/api';
import { useToast } from '../hooks/useToast';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Cloud, CloudOff, Zap, CheckCircle2 } from 'lucide-react';

export const SyncManager: React.FC = () => {
    const { showToast } = useToast();
    const [isSyncing, setIsSyncing] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            attemptSync();
        };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Initial check
        updatePendingCount();

        // Periodic check every 30 seconds
        const interval = setInterval(() => {
            if (navigator.onLine) attemptSync();
            else updatePendingCount();
        }, 30000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, []);

    const updatePendingCount = () => {
        const pending = offlineStorage.getPending();
        setPendingCount(pending.length);
    };

    const attemptSync = async () => {
        const pending = offlineStorage.getPending();
        if (pending.length === 0) {
            setPendingCount(0);
            return;
        }

        setIsSyncing(true);
        try {
            await offlineStorage.sync(async (records) => {
                return await apiService.syncOfflineAttendance(records);
            });
            showToast('success', 'Sync Complete', `${pending.length} records synchronized.`);
            setPendingCount(0);
        } catch (error) {
            console.error('Sync failed:', error);
            updatePendingCount();
        } finally {
            setIsSyncing(false);
        }
    };

    if (pendingCount === 0 && !isSyncing && isOnline) return null;

    return (
        <div className="fixed bottom-10 right-10 z-[100]">
            <AnimatePresence>
                {(pendingCount > 0 || !isOnline || isSyncing) && (
                    <motion.div
                        initial={{ opacity: 0, y: 30, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 30, scale: 0.9 }}
                        className="bg-slate-950 text-white p-2 rounded-full shadow-2xl flex items-center gap-4 pr-6 min-w-[200px]"
                    >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${!isOnline ? 'bg-amber-500' : isSyncing ? 'bg-[#C4F582]' : 'bg-slate-800'}`}>
                            {!isOnline ? (
                                <CloudOff className="w-5 h-5 text-slate-950" />
                            ) : isSyncing ? (
                                <RefreshCw className="w-5 h-5 animate-spin text-slate-950" />
                            ) : (
                                <Cloud className="w-5 h-5 text-white" />
                            )}
                        </div>
                        <div className="flex-1">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">
                                {!isOnline ? 'Disconnected' : isSyncing ? 'Updating' : 'Offline Mode'}
                            </p>
                            <p className="text-[11px] font-black uppercase tracking-widest text-white">
                                {!isOnline ? 'Sync Paused' : isSyncing ? 'Syncing...' : `${pendingCount} Records`}
                            </p>
                        </div>
                        {isSyncing && <Zap className="w-3.5 h-3.5 text-[#C4F582] fill-[#C4F582] animate-pulse" />}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
