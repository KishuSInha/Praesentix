export interface OfflineAttendance {
    studentId: string;
    name: string;
    date: string;
    period: string;
    emotion: string;
    livenessConfidence: number;
    recognitionConfidence: number;
    timestamp: string;
}

class OfflineStorage {
    private STORAGE_KEY = 'praesentix_pending_sync';

    saveAttendance(record: OfflineAttendance) {
        const pending = this.getPending();
        pending.push(record);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(pending));
    }

    getPending(): OfflineAttendance[] {
        const data = localStorage.getItem(this.STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    }

    clearPending() {
        localStorage.removeItem(this.STORAGE_KEY);
    }

    async sync(apiCall: (records: OfflineAttendance[]) => Promise<any>) {
        const pending = this.getPending();
        if (pending.length === 0) return { success: true, count: 0 };

        try {
            const response = await apiCall(pending);
            if (response.success) {
                this.clearPending();
                return { success: true, count: pending.length };
            }
            return { success: false, message: 'Server rejected sync' };
        } catch (error) {
            console.error('Sync failed:', error);
            return { success: false, message: 'Network error during sync' };
        }
    }
}

export const offlineStorage = new OfflineStorage();
