import { grobaxDataService } from './dataAccess';
import {
  AirtimeDataSettings,
  AirtimeDataTransaction,
  DEFAULT_AIRTIME_DATA_SETTINGS,
} from './vtuTypes';

const SETTINGS_DOC_ID = 'global_vtu_config';

/**
 * Fetch VTU settings from Firestore with default fallback via Grobaax Master Data Access
 */
export async function fetchVtuSettingsFromFirestore(): Promise<AirtimeDataSettings> {
  try {
    const data = await grobaxDataService.get<AirtimeDataSettings>('airtimeDataSettings', SETTINGS_DOC_ID, {
      useCache: true,
      ttlMs: 60000,
    });
    if (data) {
      return { ...DEFAULT_AIRTIME_DATA_SETTINGS, ...data };
    }
    // Seed default settings if doc does not exist yet
    await grobaxDataService.create('airtimeDataSettings', DEFAULT_AIRTIME_DATA_SETTINGS, SETTINGS_DOC_ID);
    return DEFAULT_AIRTIME_DATA_SETTINGS;
  } catch (err) {
    console.warn('Notice: Error fetching VTU settings from Firestore, using default:', err);
    return DEFAULT_AIRTIME_DATA_SETTINGS;
  }
}

/**
 * Save updated VTU settings to Firestore
 */
export async function saveVtuSettingsToFirestore(
  settings: Partial<AirtimeDataSettings>,
  updatedBy: string = 'Super Admin'
): Promise<boolean> {
  try {
    await grobaxDataService.create(
      'airtimeDataSettings',
      {
        ...settings,
        updatedBy,
      },
      SETTINGS_DOC_ID
    );
    return true;
  } catch (err) {
    console.error('Error saving VTU settings to Firestore:', err);
    return false;
  }
}

/**
 * Real-time listener for current user's airtime & mobile data transactions
 */
export function subscribeToUserVtuTransactions(
  userId: string,
  onUpdate: (txs: AirtimeDataTransaction[]) => void
): () => void {
  if (!userId) return () => {};

  return grobaxDataService.subscribe<AirtimeDataTransaction>(
    'airtimeDataTransactions',
    {
      where: [['userId', '==', userId]],
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit: 50,
    },
    (txs) => onUpdate(txs),
    (err) => console.warn('Notice: subscribeToUserVtuTransactions snapshot listener notice:', err)
  );
}

/**
 * Real-time listener for all VTU transactions (Admin)
 */
export function subscribeToAllVtuTransactions(
  onUpdate: (txs: AirtimeDataTransaction[]) => void,
  maxLimit = 100
): () => void {
  return grobaxDataService.subscribe<AirtimeDataTransaction>(
    'airtimeDataTransactions',
    {
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit: maxLimit,
    },
    (txs) => onUpdate(txs),
    (err) => console.warn('Notice: subscribeToAllVtuTransactions snapshot listener notice:', err)
  );
}

/**
 * Save a VTU transaction to Firestore
 */
export async function saveVtuTransactionToFirestore(tx: AirtimeDataTransaction): Promise<boolean> {
  try {
    const txId = tx.id || tx.transactionId;
    await grobaxDataService.create('airtimeDataTransactions', tx, txId);
    return true;
  } catch (err) {
    console.warn('Notice: saveVtuTransactionToFirestore error:', err);
    return false;
  }
}

/**
 * Update an existing VTU transaction in Firestore
 */
export async function updateVtuTransactionInFirestore(
  txId: string,
  updates: Partial<AirtimeDataTransaction>
): Promise<boolean> {
  try {
    await grobaxDataService.update('airtimeDataTransactions', txId, updates);
    return true;
  } catch (err) {
    console.warn('Notice: updateVtuTransactionInFirestore error:', err);
    return false;
  }
}

const PROVIDER_STATUS_DOC_ID = 'pairgate_live_sync';

export interface VtuProviderSyncRecord {
  provider: string;
  environment: 'sandbox' | 'live';
  providerBalanceNGN: number;
  lastSyncedAt: string;
  providerConnected: boolean;
  syncedBy?: string;
  raw?: any;
}

/**
 * Save VTU Provider sync balance & state to Firestore
 */
export async function saveVtuProviderStatusToFirestore(
  status: Partial<VtuProviderSyncRecord>
): Promise<boolean> {
  try {
    await grobaxDataService.create(
      'vtuProviderStatus',
      {
        provider: 'Pairgate VTU Gateway',
        environment: 'live',
        providerBalanceNGN: 17.00,
        providerConnected: true,
        lastSyncedAt: new Date().toISOString(),
        ...status,
      },
      PROVIDER_STATUS_DOC_ID
    );
    return true;
  } catch (err) {
    console.warn('Notice: saveVtuProviderStatusToFirestore error:', err);
    return false;
  }
}

/**
 * Fetch last synchronized VTU provider state from Firestore
 */
export async function fetchVtuProviderStatusFromFirestore(): Promise<VtuProviderSyncRecord | null> {
  try {
    const data = await grobaxDataService.get<VtuProviderSyncRecord>(
      'vtuProviderStatus',
      PROVIDER_STATUS_DOC_ID,
      { useCache: true, ttlMs: 30000 }
    );
    return data || null;
  } catch (err) {
    console.warn('Notice: fetchVtuProviderStatusFromFirestore error:', err);
    return null;
  }
}

