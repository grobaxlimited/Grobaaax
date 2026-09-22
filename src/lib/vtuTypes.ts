export type VtuNetwork = 'MTN' | 'AIRTEL' | 'GLO' | '9MOBILE';
export type VtuServiceType = 'airtime' | 'data';
export type VtuTransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
export type VtuRefundStatus = 'NONE' | 'REFUNDED' | 'FAILED';

export interface AirtimeDataProduct {
  id: string;
  network: VtuNetwork;
  serviceType: VtuServiceType;
  productCode: string;
  productName: string;
  amountNGN: number;
  dataVolume?: string; // e.g. "1GB", "2.5GB", "10GB"
  validity?: string; // e.g. "30 Days", "7 Days", "1 Day"
  category?: string;
  planType?: string;
  active: boolean;
}

export interface AirtimeDataSettings {
  airtimeEnabled: boolean;
  dataEnabled: boolean;
  mtnEnabled: boolean;
  airtelEnabled: boolean;
  gloEnabled: boolean;
  nineMobileEnabled: boolean;
  gpToNgnRate: number; // e.g. 1.0 (1 GP = 1 NGN)
  minAirtimeNGN: number; // default: 50
  maxAirtimeNGN: number; // default: 50000
  minDataNGN: number; // default: 100
  maxDataNGN: number; // default: 50000
  providerEnvironment: 'sandbox' | 'live';
  updatedAt?: any;
  updatedBy?: string;
}

export const DEFAULT_AIRTIME_DATA_SETTINGS: AirtimeDataSettings = {
  airtimeEnabled: true,
  dataEnabled: true,
  mtnEnabled: true,
  airtelEnabled: true,
  gloEnabled: true,
  nineMobileEnabled: true,
  gpToNgnRate: 1.0, // 1 GP = 1 NGN
  minAirtimeNGN: 50,
  maxAirtimeNGN: 50000,
  minDataNGN: 100,
  maxDataNGN: 50000,
  providerEnvironment: 'live',
};

export interface AirtimeDataTransaction {
  id: string;
  transactionId: string; // Grobaax Reference (e.g. GBX_VTU_174000...)
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  serviceType: VtuServiceType;
  phoneNumber: string;
  network: VtuNetwork;
  productCode?: string;
  productName?: string;
  amountNGN: number;
  gpAmount: number;
  status: VtuTransactionStatus;
  provider: string; // 'pairgate'
  providerTransactionId?: string;
  idempotencyKey: string;
  failureReason?: string;
  refundStatus: VtuRefundStatus;
  refundTransactionId?: string;
  createdAt: any;
  updatedAt: any;
  completedAt?: any;
}

export interface AirtimeDataAuditLog {
  id: string;
  transactionId?: string;
  userId?: string;
  userName?: string;
  action:
    | 'PURCHASE_INITIATED'
    | 'GP_RESERVED'
    | 'PROVIDER_REQUEST_SENT'
    | 'PROVIDER_RESPONSE_RECEIVED'
    | 'TRANSACTION_SUCCESS'
    | 'TRANSACTION_FAILED'
    | 'GP_REFUNDED'
    | 'ADMIN_SETTINGS_CHANGED'
    | 'TRANSACTION_RECONCILED'
    | 'PROVIDER_REQUERY';
  details: Record<string, any>;
  timestamp: any;
  status?: string;
}

export interface VtuProviderOverviewStats {
  provider: string;
  environment: 'sandbox' | 'live';
  providerConnected: boolean;
  providerBalanceNGN: number;
  totalTransactions: number;
  successfulTransactions: number;
  pendingTransactions: number;
  failedTransactions: number;
  totalNgnProcessed: number;
  totalGpRedeemed: number;
  todayTransactionsCount: number;
  todayNgnProcessed: number;
  todayGpRedeemed: number;
}

export const NETWORK_METADATA: Record<
  VtuNetwork,
  {
    name: string;
    brandColor: string;
    bgColor: string;
    borderColor: string;
    textColor: string;
    prefixes: string[];
    logoBadge: string;
  }
> = {
  MTN: {
    name: 'MTN Nigeria',
    brandColor: '#FFCC00',
    bgColor: 'bg-amber-400/10 dark:bg-amber-400/20',
    borderColor: 'border-amber-400',
    textColor: 'text-amber-600 dark:text-amber-400',
    prefixes: ['0803', '0806', '0703', '0706', '0813', '0816', '0810', '0814', '0903', '0906', '0913', '0916'],
    logoBadge: '🟡 MTN',
  },
  AIRTEL: {
    name: 'Airtel Nigeria',
    brandColor: '#FF0000',
    bgColor: 'bg-red-500/10 dark:bg-red-500/20',
    borderColor: 'border-red-500',
    textColor: 'text-red-600 dark:text-red-400',
    prefixes: ['0802', '0808', '0708', '0812', '0701', '0902', '0901', '0904', '0907', '0912', '0911'],
    logoBadge: '🔴 Airtel',
  },
  GLO: {
    name: 'Glo Nigeria',
    brandColor: '#008751',
    bgColor: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    borderColor: 'border-emerald-500',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    prefixes: ['0805', '0807', '0705', '0815', '0811', '0905', '0915'],
    logoBadge: '🟢 Glo',
  },
  '9MOBILE': {
    name: '9mobile',
    brandColor: '#005D30',
    bgColor: 'bg-teal-500/10 dark:bg-teal-500/20',
    borderColor: 'border-teal-500',
    textColor: 'text-teal-600 dark:text-teal-400',
    prefixes: ['0809', '0818', '0817', '0909', '0908'],
    logoBadge: '🟢 9mobile',
  },
};

/**
 * Validates Nigerian phone numbers and detects likely network
 */
export function validateNigerianPhone(rawNumber: string): {
  isValid: boolean;
  formattedNumber: string;
  detectedNetwork?: VtuNetwork;
  error?: string;
} {
  if (!rawNumber) {
    return { isValid: false, formattedNumber: '', error: 'Phone number is required' };
  }

  // Strip spaces, dashes, +234 or 234 prefix
  let cleaned = rawNumber.replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('+234')) {
    cleaned = '0' + cleaned.slice(4);
  } else if (cleaned.startsWith('234')) {
    cleaned = '0' + cleaned.slice(3);
  }

  // Must be 11 digits starting with 0
  if (!/^0[789][01]\d{8}$/.test(cleaned)) {
    return {
      isValid: false,
      formattedNumber: cleaned,
      error: 'Enter a valid 11-digit Nigerian phone number (e.g. 08012345678)',
    };
  }

  const prefix = cleaned.slice(0, 4);
  let detectedNetwork: VtuNetwork | undefined;

  for (const [net, meta] of Object.entries(NETWORK_METADATA)) {
    if (meta.prefixes.includes(prefix)) {
      detectedNetwork = net as VtuNetwork;
      break;
    }
  }

  return {
    isValid: true,
    formattedNumber: cleaned,
    detectedNetwork,
  };
}

/**
 * Standard default data bundles catalog for MTN, Airtel, Glo, 9mobile
 */
export const DEFAULT_NIGERIAN_DATA_BUNDLES: AirtimeDataProduct[] = [
  {
    "id": "mtn_303_cg",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "303",
    "productName": "1GB (AWOOF) MTN Special",
    "amountNGN": 270,
    "dataVolume": "1GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "mtn_14_cg",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "14",
    "productName": "500MB (CG)",
    "amountNGN": 320,
    "dataVolume": "500MB",
    "validity": "7 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "mtn_15_cg",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "15",
    "productName": "1GB (CG)",
    "amountNGN": 425,
    "dataVolume": "1GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "mtn_16_cg",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "16",
    "productName": "2GB (CG)",
    "amountNGN": 850,
    "dataVolume": "2GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "mtn_17_cg",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "17",
    "productName": "3GB (CG)",
    "amountNGN": 1275,
    "dataVolume": "3GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "mtn_18_cg",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "18",
    "productName": "5GB (CG)",
    "amountNGN": 1950,
    "dataVolume": "5GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "mtn_19_sme",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "19",
    "productName": "500MB (SME)",
    "amountNGN": 500,
    "dataVolume": "500MB",
    "validity": "30 Days",
    "category": "SME",
    "planType": "SME",
    "active": true
  },
  {
    "id": "mtn_20_sme",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "20",
    "productName": "1GB (SME)",
    "amountNGN": 840,
    "dataVolume": "1GB",
    "validity": "30 Days",
    "category": "SME",
    "planType": "SME",
    "active": true
  },
  {
    "id": "mtn_21_sme",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "21",
    "productName": "1.5GB (SME)",
    "amountNGN": 1000,
    "dataVolume": "1.5GB",
    "validity": "30 Days",
    "category": "SME",
    "planType": "SME",
    "active": true
  },
  {
    "id": "mtn_22_sme",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "22",
    "productName": "2GB (SME)",
    "amountNGN": 1500,
    "dataVolume": "2GB",
    "validity": "30 Days",
    "category": "SME",
    "planType": "SME",
    "active": true
  },
  {
    "id": "mtn_23_sme",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "23",
    "productName": "3.5GB (SME)",
    "amountNGN": 2500,
    "dataVolume": "3.5GB",
    "validity": "30 Days",
    "category": "SME",
    "planType": "SME",
    "active": true
  },
  {
    "id": "mtn_24_sme",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "24",
    "productName": "6GB (SME)",
    "amountNGN": 2500,
    "dataVolume": "6GB",
    "validity": "30 Days",
    "category": "SME",
    "planType": "SME",
    "active": true
  },
  {
    "id": "mtn_25_sme",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "25",
    "productName": "7GB (SME)",
    "amountNGN": 3500,
    "dataVolume": "7GB",
    "validity": "30 Days",
    "category": "SME",
    "planType": "SME",
    "active": true
  },
  {
    "id": "mtn_26_sme",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "26",
    "productName": "10GB (SME)",
    "amountNGN": 4500,
    "dataVolume": "10GB",
    "validity": "30 Days",
    "category": "SME",
    "planType": "SME",
    "active": true
  },
  {
    "id": "mtn_54_awoof",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "54",
    "productName": "1GB (AWOOF Special)",
    "amountNGN": 270,
    "dataVolume": "1GB",
    "validity": "30 Days",
    "category": "AWOOF",
    "planType": "AWOOF",
    "active": true
  },
  {
    "id": "mtn_308_awoof",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "308",
    "productName": "1GB (AWOOF)",
    "amountNGN": 500,
    "dataVolume": "1GB",
    "validity": "30 Days",
    "category": "AWOOF",
    "planType": "AWOOF",
    "active": true
  },
  {
    "id": "mtn_57_awoof",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "57",
    "productName": "3.2GB (AWOOF)",
    "amountNGN": 1050,
    "dataVolume": "3.2GB",
    "validity": "30 Days",
    "category": "AWOOF",
    "planType": "AWOOF",
    "active": true
  },
  {
    "id": "mtn_312_awoof",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "312",
    "productName": "5.5GB (AWOOF)",
    "amountNGN": 1500,
    "dataVolume": "5.5GB",
    "validity": "30 Days",
    "category": "AWOOF",
    "planType": "AWOOF",
    "active": true
  },
  {
    "id": "mtn_313_awoof",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "313",
    "productName": "7GB (AWOOF)",
    "amountNGN": 1850,
    "dataVolume": "7GB",
    "validity": "30 Days",
    "category": "AWOOF",
    "planType": "AWOOF",
    "active": true
  },
  {
    "id": "mtn_58_awoof",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "58",
    "productName": "11GB (AWOOF)",
    "amountNGN": 3500,
    "dataVolume": "11GB",
    "validity": "30 Days",
    "category": "AWOOF",
    "planType": "AWOOF",
    "active": true
  },
  {
    "id": "mtn_314_awoof",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "314",
    "productName": "20GB (AWOOF)",
    "amountNGN": 5000,
    "dataVolume": "20GB",
    "validity": "30 Days",
    "category": "AWOOF",
    "planType": "AWOOF",
    "active": true
  },
  {
    "id": "mtn_364_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "364",
    "productName": "75MB (GIFTING)",
    "amountNGN": 80,
    "dataVolume": "75MB",
    "validity": "1 Day",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_302_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "302",
    "productName": "110MB",
    "amountNGN": 100,
    "dataVolume": "110MB",
    "validity": "1 Day",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_332_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "332",
    "productName": "230MB",
    "amountNGN": 200,
    "dataVolume": "230MB",
    "validity": "2 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_301_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "301",
    "productName": "500MB",
    "amountNGN": 350,
    "dataVolume": "500MB",
    "validity": "7 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_333_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "333",
    "productName": "600MB + 2 Mins",
    "amountNGN": 500,
    "dataVolume": "600MB",
    "validity": "2 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_300_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "300",
    "productName": "1GB Daily + 1.5 Mins",
    "amountNGN": 500,
    "dataVolume": "1GB",
    "validity": "1 Day",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_285_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "285",
    "productName": "1.5GB",
    "amountNGN": 600,
    "dataVolume": "1.5GB",
    "validity": "2 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_274_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "274",
    "productName": "2.5GB",
    "amountNGN": 750,
    "dataVolume": "2.5GB",
    "validity": "2 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_297_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "297",
    "productName": "2GB",
    "amountNGN": 750,
    "dataVolume": "2GB",
    "validity": "2 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_283_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "283",
    "productName": "3.2GB",
    "amountNGN": 1000,
    "dataVolume": "3.2GB",
    "validity": "2 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_281_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "281",
    "productName": "1.5GB Monthly",
    "amountNGN": 1000,
    "dataVolume": "1.5GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_315_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "315",
    "productName": "1GB Monthly",
    "amountNGN": 1000,
    "dataVolume": "1GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_271_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "271",
    "productName": "4GB",
    "amountNGN": 1200,
    "dataVolume": "4GB",
    "validity": "7 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_270_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "270",
    "productName": "5.5GB",
    "amountNGN": 1500,
    "dataVolume": "5.5GB",
    "validity": "7 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_323_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "323",
    "productName": "7GB",
    "amountNGN": 1800,
    "dataVolume": "7GB",
    "validity": "7 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_329_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "329",
    "productName": "3GB Monthly",
    "amountNGN": 2000,
    "dataVolume": "3GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_319_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "319",
    "productName": "5GB Monthly",
    "amountNGN": 2500,
    "dataVolume": "5GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_320_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "320",
    "productName": "6GB Monthly",
    "amountNGN": 2500,
    "dataVolume": "6GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_286_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "286",
    "productName": "7GB Monthly",
    "amountNGN": 3500,
    "dataVolume": "7GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_290_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "290",
    "productName": "11GB Monthly",
    "amountNGN": 3500,
    "dataVolume": "11GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_327_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "327",
    "productName": "15GB Monthly",
    "amountNGN": 4000,
    "dataVolume": "15GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_273_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "273",
    "productName": "20GB Monthly",
    "amountNGN": 5000,
    "dataVolume": "20GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_325_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "325",
    "productName": "18GB Monthly",
    "amountNGN": 6000,
    "dataVolume": "18GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_328_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "328",
    "productName": "28GB Monthly",
    "amountNGN": 8000,
    "dataVolume": "28GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "mtn_324_gifting",
    "network": "MTN",
    "serviceType": "data",
    "productCode": "324",
    "productName": "40GB Monthly",
    "amountNGN": 10000,
    "dataVolume": "40GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_89_cg",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "89",
    "productName": "500MB (CG)",
    "amountNGN": 500,
    "dataVolume": "500MB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "airtel_90_cg",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "90",
    "productName": "1GB (CG)",
    "amountNGN": 830,
    "dataVolume": "1GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "airtel_91_cg",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "91",
    "productName": "1.5GB (CG)",
    "amountNGN": 1000,
    "dataVolume": "1.5GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "airtel_92_cg",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "92",
    "productName": "2GB (CG)",
    "amountNGN": 1500,
    "dataVolume": "2GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "airtel_94_cg",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "94",
    "productName": "3.5GB (CG)",
    "amountNGN": 1500,
    "dataVolume": "3.5GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "airtel_93_cg",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "93",
    "productName": "3GB (CG)",
    "amountNGN": 2000,
    "dataVolume": "3GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "airtel_95_cg",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "95",
    "productName": "4GB (CG)",
    "amountNGN": 2500,
    "dataVolume": "4GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "airtel_96_cg",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "96",
    "productName": "6GB (CG)",
    "amountNGN": 2500,
    "dataVolume": "6GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "airtel_97_cg",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "97",
    "productName": "8GB (CG)",
    "amountNGN": 3000,
    "dataVolume": "8GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "airtel_98_cg",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "98",
    "productName": "10GB (CG)",
    "amountNGN": 3000,
    "dataVolume": "10GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "airtel_99_cg",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "99",
    "productName": "10GB (CG - Extended)",
    "amountNGN": 4000,
    "dataVolume": "10GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "airtel_100_cg",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "100",
    "productName": "13GB (CG)",
    "amountNGN": 5000,
    "dataVolume": "13GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "airtel_101_cg",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "101",
    "productName": "18GB (CG)",
    "amountNGN": 5000,
    "dataVolume": "18GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "airtel_103_cg",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "103",
    "productName": "25GB (CG)",
    "amountNGN": 8000,
    "dataVolume": "25GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "airtel_121_awoof",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "121",
    "productName": "150MB (AWOOF)",
    "amountNGN": 67,
    "dataVolume": "150MB",
    "validity": "1 Day",
    "category": "AWOOF",
    "planType": "AWOOF",
    "active": true
  },
  {
    "id": "airtel_122_awoof",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "122",
    "productName": "300MB (AWOOF)",
    "amountNGN": 125,
    "dataVolume": "300MB",
    "validity": "1 Day",
    "category": "AWOOF",
    "planType": "AWOOF",
    "active": true
  },
  {
    "id": "airtel_123_awoof",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "123",
    "productName": "600MB (AWOOF)",
    "amountNGN": 230,
    "dataVolume": "600MB",
    "validity": "2 Days",
    "category": "AWOOF",
    "planType": "AWOOF",
    "active": true
  },
  {
    "id": "airtel_124_awoof",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "124",
    "productName": "1.5GB (AWOOF)",
    "amountNGN": 440,
    "dataVolume": "1.5GB",
    "validity": "7 Days",
    "category": "AWOOF",
    "planType": "AWOOF",
    "active": true
  },
  {
    "id": "airtel_125_awoof",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "125",
    "productName": "2GB (AWOOF)",
    "amountNGN": 550,
    "dataVolume": "2GB",
    "validity": "7 Days",
    "category": "AWOOF",
    "planType": "AWOOF",
    "active": true
  },
  {
    "id": "airtel_126_awoof",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "126",
    "productName": "3GB (AWOOF)",
    "amountNGN": 810,
    "dataVolume": "3GB",
    "validity": "30 Days",
    "category": "AWOOF",
    "planType": "AWOOF",
    "active": true
  },
  {
    "id": "airtel_127_awoof",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "127",
    "productName": "10GB (AWOOF)",
    "amountNGN": 3120,
    "dataVolume": "10GB",
    "validity": "30 Days",
    "category": "AWOOF",
    "planType": "AWOOF",
    "active": true
  },
  {
    "id": "airtel_212_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "212",
    "productName": "250MB Night Plan (12 - 5 AM)",
    "amountNGN": 50,
    "dataVolume": "250MB",
    "validity": "1 Night",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_198_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "198",
    "productName": "75MB Daily Plan",
    "amountNGN": 75,
    "dataVolume": "75MB",
    "validity": "1 Day",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_189_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "189",
    "productName": "110MB Plan",
    "amountNGN": 100,
    "dataVolume": "110MB",
    "validity": "1 Day",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_211_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "211",
    "productName": "200MB Social Plan",
    "amountNGN": 100,
    "dataVolume": "200MB",
    "validity": "2 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_210_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "210",
    "productName": "1GB Social Plan",
    "amountNGN": 300,
    "dataVolume": "1GB",
    "validity": "3 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_362_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "362",
    "productName": "1GB Binge Plan",
    "amountNGN": 500,
    "dataVolume": "1GB",
    "validity": "1 Day",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_215_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "215",
    "productName": "2GB Binge Plan + Youtube",
    "amountNGN": 600,
    "dataVolume": "2GB",
    "validity": "2 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_197_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "197",
    "productName": "3GB Binge Plan + Youtube",
    "amountNGN": 750,
    "dataVolume": "3GB",
    "validity": "2 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_209_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "209",
    "productName": "1GB Plan (7 Days)",
    "amountNGN": 800,
    "dataVolume": "1GB",
    "validity": "7 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_196_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "196",
    "productName": "1.5GB Weekly Plan",
    "amountNGN": 1000,
    "dataVolume": "1.5GB",
    "validity": "7 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_204_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "204",
    "productName": "4GB Binge Plan",
    "amountNGN": 1000,
    "dataVolume": "4GB",
    "validity": "2 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_216_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "216",
    "productName": "6GB Binge Plan",
    "amountNGN": 1500,
    "dataVolume": "6GB",
    "validity": "2 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_195_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "195",
    "productName": "2GB Plan (30 Days)",
    "amountNGN": 1500,
    "dataVolume": "2GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_207_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "207",
    "productName": "3GB Monthly Plan",
    "amountNGN": 2000,
    "dataVolume": "3GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_194_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "194",
    "productName": "4GB Monthly Plan",
    "amountNGN": 2500,
    "dataVolume": "4GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_192_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "192",
    "productName": "8GB Monthly Plan",
    "amountNGN": 3000,
    "dataVolume": "8GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_214_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "214",
    "productName": "10GB Monthly Plan",
    "amountNGN": 4000,
    "dataVolume": "10GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_191_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "191",
    "productName": "13GB Monthly Plan",
    "amountNGN": 5000,
    "dataVolume": "13GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_205_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "205",
    "productName": "18GB Monthly Plan",
    "amountNGN": 6000,
    "dataVolume": "18GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_199_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "199",
    "productName": "25GB Monthly Plan",
    "amountNGN": 8000,
    "dataVolume": "25GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_203_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "203",
    "productName": "35GB Monthly Plan",
    "amountNGN": 10000,
    "dataVolume": "35GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_202_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "202",
    "productName": "60GB Monthly Plan",
    "amountNGN": 15000,
    "dataVolume": "60GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "airtel_201_gifting",
    "network": "AIRTEL",
    "serviceType": "data",
    "productCode": "201",
    "productName": "100GB Monthly Plan",
    "amountNGN": 20000,
    "dataVolume": "100GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "glo_59_cg",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "59",
    "productName": "200MB (CG)",
    "amountNGN": 92,
    "dataVolume": "200MB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "glo_60_cg",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "60",
    "productName": "500MB (CG)",
    "amountNGN": 215,
    "dataVolume": "500MB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "glo_61_cg",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "61",
    "productName": "1GB (CG)",
    "amountNGN": 380,
    "dataVolume": "1GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "glo_64_cg",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "64",
    "productName": "2GB (CG)",
    "amountNGN": 900,
    "dataVolume": "2GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "glo_65_cg",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "65",
    "productName": "3GB (CG)",
    "amountNGN": 1150,
    "dataVolume": "3GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "glo_68_cg",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "68",
    "productName": "5GB (CG)",
    "amountNGN": 1920,
    "dataVolume": "5GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "glo_71_cg",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "71",
    "productName": "10GB (CG)",
    "amountNGN": 4500,
    "dataVolume": "10GB",
    "validity": "30 Days",
    "category": "CG",
    "planType": "CG",
    "active": true
  },
  {
    "id": "glo_85_awoof",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "85",
    "productName": "750MB (AWOOF)",
    "amountNGN": 210,
    "dataVolume": "750MB",
    "validity": "1 Day",
    "category": "AWOOF",
    "planType": "AWOOF",
    "active": true
  },
  {
    "id": "glo_86_awoof",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "86",
    "productName": "1.5GB (AWOOF)",
    "amountNGN": 330,
    "dataVolume": "1.5GB",
    "validity": "2 Days",
    "category": "AWOOF",
    "planType": "AWOOF",
    "active": true
  },
  {
    "id": "glo_87_awoof",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "87",
    "productName": "2.5GB (AWOOF)",
    "amountNGN": 535,
    "dataVolume": "2.5GB",
    "validity": "7 Days",
    "category": "AWOOF",
    "planType": "AWOOF",
    "active": true
  },
  {
    "id": "glo_88_awoof",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "88",
    "productName": "10GB (AWOOF)",
    "amountNGN": 1980,
    "dataVolume": "10GB",
    "validity": "30 Days",
    "category": "AWOOF",
    "planType": "AWOOF",
    "active": true
  },
  {
    "id": "glo_220_gifting",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "220",
    "productName": "135MB Social Bundle",
    "amountNGN": 50,
    "dataVolume": "135MB",
    "validity": "1 Day",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "glo_222_gifting",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "222",
    "productName": "350MB Night Plan",
    "amountNGN": 60,
    "dataVolume": "350MB",
    "validity": "1 Night",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "glo_219_gifting",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "219",
    "productName": "335MB Social Bundle",
    "amountNGN": 100,
    "dataVolume": "335MB",
    "validity": "2 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "glo_268_gifting",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "268",
    "productName": "125MB (1 Day)",
    "amountNGN": 100,
    "dataVolume": "125MB",
    "validity": "1 Day",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "glo_221_gifting",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "221",
    "productName": "750MB Night Plan",
    "amountNGN": 120,
    "dataVolume": "750MB",
    "validity": "1 Night",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "glo_267_gifting",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "267",
    "productName": "275MB",
    "amountNGN": 200,
    "dataVolume": "275MB",
    "validity": "2 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "glo_243_gifting",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "243",
    "productName": "2.5GB",
    "amountNGN": 500,
    "dataVolume": "2.5GB",
    "validity": "2 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "glo_244_gifting",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "244",
    "productName": "2GB Special",
    "amountNGN": 500,
    "dataVolume": "2GB",
    "validity": "2 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "glo_238_gifting",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "238",
    "productName": "3.55GB Special Plan",
    "amountNGN": 600,
    "dataVolume": "3.55GB",
    "validity": "2 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "glo_245_gifting",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "245",
    "productName": "1.1GB",
    "amountNGN": 750,
    "dataVolume": "1.1GB",
    "validity": "7 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "glo_237_gifting",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "237",
    "productName": "5.1GB Special Plan",
    "amountNGN": 1000,
    "dataVolume": "5.1GB",
    "validity": "7 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "glo_265_gifting",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "265",
    "productName": "2.6GB",
    "amountNGN": 1000,
    "dataVolume": "2.6GB",
    "validity": "14 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "glo_248_gifting",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "248",
    "productName": "5.2GB",
    "amountNGN": 1500,
    "dataVolume": "5.2GB",
    "validity": "14 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "glo_250_gifting",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "250",
    "productName": "6GB Special",
    "amountNGN": 1500,
    "dataVolume": "6GB",
    "validity": "14 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "glo_247_gifting",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "247",
    "productName": "9GB",
    "amountNGN": 2000,
    "dataVolume": "9GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "glo_264_gifting",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "264",
    "productName": "6.25GB",
    "amountNGN": 2000,
    "dataVolume": "6.25GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "glo_262_gifting",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "262",
    "productName": "10.5GB",
    "amountNGN": 3000,
    "dataVolume": "10.5GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "glo_261_gifting",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "261",
    "productName": "12.5GB",
    "amountNGN": 4000,
    "dataVolume": "12.5GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "glo_260_gifting",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "260",
    "productName": "17GB",
    "amountNGN": 5000,
    "dataVolume": "17GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "glo_259_gifting",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "259",
    "productName": "28GB",
    "amountNGN": 8000,
    "dataVolume": "28GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "glo_258_gifting",
    "network": "GLO",
    "serviceType": "data",
    "productCode": "258",
    "productName": "42GB",
    "amountNGN": 10000,
    "dataVolume": "42GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "9mobile_128_sme",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "128",
    "productName": "500MB (SME)",
    "amountNGN": 260,
    "dataVolume": "500MB",
    "validity": "30 Days",
    "category": "SME",
    "planType": "SME",
    "active": true
  },
  {
    "id": "9mobile_129_sme",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "129",
    "productName": "1GB (SME)",
    "amountNGN": 515,
    "dataVolume": "1GB",
    "validity": "30 Days",
    "category": "SME",
    "planType": "SME",
    "active": true
  },
  {
    "id": "9mobile_130_sme",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "130",
    "productName": "1.5GB (SME)",
    "amountNGN": 750,
    "dataVolume": "1.5GB",
    "validity": "30 Days",
    "category": "SME",
    "planType": "SME",
    "active": true
  },
  {
    "id": "9mobile_131_sme",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "131",
    "productName": "2GB (SME)",
    "amountNGN": 1030,
    "dataVolume": "2GB",
    "validity": "30 Days",
    "category": "SME",
    "planType": "SME",
    "active": true
  },
  {
    "id": "9mobile_132_sme",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "132",
    "productName": "3GB (SME)",
    "amountNGN": 1545,
    "dataVolume": "3GB",
    "validity": "30 Days",
    "category": "SME",
    "planType": "SME",
    "active": true
  },
  {
    "id": "9mobile_133_sme",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "133",
    "productName": "4GB (SME)",
    "amountNGN": 2060,
    "dataVolume": "4GB",
    "validity": "30 Days",
    "category": "SME",
    "planType": "SME",
    "active": true
  },
  {
    "id": "9mobile_134_sme",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "134",
    "productName": "4.5GB (SME)",
    "amountNGN": 2180,
    "dataVolume": "4.5GB",
    "validity": "30 Days",
    "category": "SME",
    "planType": "SME",
    "active": true
  },
  {
    "id": "9mobile_135_sme",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "135",
    "productName": "5GB (SME)",
    "amountNGN": 2575,
    "dataVolume": "5GB",
    "validity": "30 Days",
    "category": "SME",
    "planType": "SME",
    "active": true
  },
  {
    "id": "9mobile_136_sme",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "136",
    "productName": "7.5GB (SME)",
    "amountNGN": 3700,
    "dataVolume": "7.5GB",
    "validity": "30 Days",
    "category": "SME",
    "planType": "SME",
    "active": true
  },
  {
    "id": "9mobile_137_sme",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "137",
    "productName": "10GB (SME)",
    "amountNGN": 5150,
    "dataVolume": "10GB",
    "validity": "30 Days",
    "category": "SME",
    "planType": "SME",
    "active": true
  },
  {
    "id": "9mobile_138_sme",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "138",
    "productName": "11GB (SME)",
    "amountNGN": 5665,
    "dataVolume": "11GB",
    "validity": "30 Days",
    "category": "SME",
    "planType": "SME",
    "active": true
  },
  {
    "id": "9mobile_139_sme",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "139",
    "productName": "15GB (SME)",
    "amountNGN": 7725,
    "dataVolume": "15GB",
    "validity": "30 Days",
    "category": "SME",
    "planType": "SME",
    "active": true
  },
  {
    "id": "9mobile_140_sme",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "140",
    "productName": "20GB (SME)",
    "amountNGN": 10300,
    "dataVolume": "20GB",
    "validity": "30 Days",
    "category": "SME",
    "planType": "SME",
    "active": true
  },
  {
    "id": "9mobile_188_gifting",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "188",
    "productName": "40MB (24 Hours)",
    "amountNGN": 50,
    "dataVolume": "40MB",
    "validity": "1 Day",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "9mobile_187_gifting",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "187",
    "productName": "83MB (1 Day)",
    "amountNGN": 100,
    "dataVolume": "83MB",
    "validity": "1 Day",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "9mobile_178_gifting",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "178",
    "productName": "150MB + 100MB Night",
    "amountNGN": 150,
    "dataVolume": "250MB",
    "validity": "1 Day",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "9mobile_177_gifting",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "177",
    "productName": "200MB Social Plan",
    "amountNGN": 200,
    "dataVolume": "200MB",
    "validity": "7 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "9mobile_186_gifting",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "186",
    "productName": "650MB (7 Days)",
    "amountNGN": 500,
    "dataVolume": "650MB",
    "validity": "7 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "9mobile_185_gifting",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "185",
    "productName": "2GB Anytime (30 Days)",
    "amountNGN": 1000,
    "dataVolume": "2GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "9mobile_181_gifting",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "181",
    "productName": "2.3GB Anytime (30 Days)",
    "amountNGN": 1200,
    "dataVolume": "2.3GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "9mobile_180_gifting",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "180",
    "productName": "4.5GB Anytime (30 Days)",
    "amountNGN": 2000,
    "dataVolume": "4.5GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "9mobile_179_gifting",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "179",
    "productName": "5.2GB Anytime (30 Days)",
    "amountNGN": 2500,
    "dataVolume": "5.2GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "9mobile_184_gifting",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "184",
    "productName": "6.2GB Anytime (30 Days)",
    "amountNGN": 3000,
    "dataVolume": "6.2GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "9mobile_183_gifting",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "183",
    "productName": "8.4GB Anytime (30 Days)",
    "amountNGN": 4000,
    "dataVolume": "8.4GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  },
  {
    "id": "9mobile_182_gifting",
    "network": "9MOBILE",
    "serviceType": "data",
    "productCode": "182",
    "productName": "11.4GB Anytime (30 Days)",
    "amountNGN": 5000,
    "dataVolume": "11.4GB",
    "validity": "30 Days",
    "category": "GIFTING",
    "planType": "GIFTING",
    "active": true
  }
];

// =========================================================================
// STATIC REDEMPTION SCHEDULE (FREE USERS ONLY)
// Fixed 1-hour interval with 15-minute redemption window (:00 to :15) of every hour.
// Premium and VIP users are completely exempt and can redeem anytime.
// =========================================================================
export interface RedemptionWindowStatus {
  isOpen: boolean;
  minutesIntoHour: number;
  secondsIntoHour: number;
  minutesRemainingInWindow: number;
  secondsRemainingInWindow: number;
  minutesUntilNextWindow: number;
  secondsUntilNextWindow: number;
  formattedCurrentTime: string;
  formattedNextWindowTime: string;
  scheduleDescription: string;
}

export function getAirtimeRedemptionWindowStatus(date: Date = new Date()): RedemptionWindowStatus {
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const totalSecondsInHour = minutes * 60 + seconds;
  const windowLimitSeconds = 15 * 60; // 15 minutes = 900 seconds
  const isOpen = totalSecondsInHour < windowLimitSeconds;

  const secondsRemainingInWindow = isOpen ? (windowLimitSeconds - totalSecondsInHour) : 0;
  const minutesRemainingInWindow = Math.ceil(secondsRemainingInWindow / 60);

  const secondsUntilNextWindow = isOpen ? 0 : (3600 - totalSecondsInHour);
  const minutesUntilNextWindow = Math.ceil(secondsUntilNextWindow / 60);

  // Next window calculation: start of the next hour
  const nextHourDate = new Date(date.getTime() + (secondsUntilNextWindow * 1000));
  const formatTime = (d: Date) => {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  return {
    isOpen,
    minutesIntoHour: minutes,
    secondsIntoHour: seconds,
    minutesRemainingInWindow,
    secondsRemainingInWindow,
    minutesUntilNextWindow,
    secondsUntilNextWindow,
    formattedCurrentTime: formatTime(date),
    formattedNextWindowTime: formatTime(nextHourDate),
    scheduleDescription: 'Free users can redeem only during the first 15 minutes of each hour (:00 - :15).',
  };
}

