import { useEffect, useState } from 'react';
import { getStorageUsage } from '../storage/opfs';
import type { StorageUsage } from '../storage/types';

export interface SettingsPanelProps {
  userLogin: string;
  onLogout: () => void;
  onClearData: () => void;
  onClose: () => void;
}

export function SettingsPanel({
  userLogin,
  onLogout,
  onClearData,
  onClose,
}: SettingsPanelProps) {
  const [storage, setStorage] = useState<StorageUsage | null>(null);

  useEffect(() => {
    getStorageUsage().then(setStorage).catch(() => {});
  }, []);

  const usedMB = storage ? (storage.usedBytes / (1024 * 1024)).toFixed(1) : '...';
  const quotaMB = storage ? (storage.quotaBytes / (1024 * 1024)).toFixed(0) : '...';

  return (
    <div className="pp-settings-panel" role="dialog" aria-label="Settings">
      <div className="pp-settings-header">
        <h2>Settings</h2>
        <button onClick={onClose} aria-label="Close settings">
          &times;
        </button>
      </div>

      <section className="pp-settings-section">
        <h3>Account</h3>
        <p>Signed in as <strong>{userLogin}</strong></p>
        <button onClick={onLogout}>Sign out</button>
      </section>

      <section className="pp-settings-section">
        <h3>Storage</h3>
        <p>
          {usedMB} MB used of {quotaMB} MB
          {storage?.persistent ? ' (persistent)' : ' (temporary)'}
        </p>
        <button onClick={onClearData} className="pp-danger-button">
          Clear all cached data
        </button>
      </section>
    </div>
  );
}
