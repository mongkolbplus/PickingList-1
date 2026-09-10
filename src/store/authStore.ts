import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  erpLogin,
  fetchErpBranches,
  fetchErpCompany,
  fetchErpWarehouses,
  getDefaultErpApiBaseUrl,
  migrateErpApiBaseUrl,
  normalizeErpApiBaseUrl,
  setErpApiBaseUrl,
  setErpHttpMode as applyErpHttpMode,
  type ErpBranch,
  type ErpWarehouse,
  type OrgContext,
} from '@scan-goods/shared';

const AUTH_KEY = 'packing-mobile-auth';
const ORG_KEY = 'packing-mobile-org';
const ERP_URL_KEY = 'packing-mobile-erp-url';
const ERP_HTTP_MODE_KEY = 'packing-mobile-erp-http-mode';

interface AuthState {
  loginGuid: string | null;
  username: string | null;
  org: OrgContext | null;
  erpApiUrl: string;
  erpHttpMode: boolean;
  branches: ErpBranch[];
  warehouses: ErpWarehouse[];
  companyName: string;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  loadOrgLookups: () => Promise<void>;
  setOrg: (org: OrgContext) => Promise<void>;
  setErpUrl: (url: string) => Promise<void>;
  setHttpMode: (enabled: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  loginGuid: null,
  username: null,
  org: null,
  erpApiUrl: getDefaultErpApiBaseUrl(),
  erpHttpMode: true,
  branches: [],
  warehouses: [],
  companyName: '',
  hydrated: false,

  hydrate: async () => {
    const [authRaw, orgRaw, erpUrl, httpModeRaw] = await Promise.all([
      AsyncStorage.getItem(AUTH_KEY),
      AsyncStorage.getItem(ORG_KEY),
      AsyncStorage.getItem(ERP_URL_KEY),
      AsyncStorage.getItem(ERP_HTTP_MODE_KEY),
    ]);
    const erpHttpMode = httpModeRaw !== '0';
    applyErpHttpMode(erpHttpMode);
    set({ erpHttpMode });
    if (erpUrl) {
      const migrated = migrateErpApiBaseUrl(erpUrl);
      setErpApiBaseUrl(migrated);
      set({ erpApiUrl: migrated });
      if (migrated !== erpUrl) {
        await AsyncStorage.setItem(ERP_URL_KEY, migrated);
      }
    }
    if (authRaw) {
      const auth = JSON.parse(authRaw) as { loginGuid: string; username: string };
      set({ loginGuid: auth.loginGuid, username: auth.username });
    }
    if (orgRaw) {
      set({ org: JSON.parse(orgRaw) as OrgContext });
    }
    set({ hydrated: true });
  },

  login: async (username, password) => {
    const result = await erpLogin(username, password);
    await AsyncStorage.setItem(
      AUTH_KEY,
      JSON.stringify({ loginGuid: result.loginGuid, username: result.username }),
    );
    set({ loginGuid: result.loginGuid, username: result.username });
    await get().loadOrgLookups();
  },

  loadOrgLookups: async () => {
    const { loginGuid } = get();
    if (!loginGuid) return;
    const [company, branches, warehouses] = await Promise.all([
      fetchErpCompany(loginGuid),
      fetchErpBranches(loginGuid),
      fetchErpWarehouses(loginGuid),
    ]);
    set({
      companyName: company?.companyName ?? '',
      branches,
      warehouses,
    });
  },

  setOrg: async (org) => {
    await AsyncStorage.setItem(ORG_KEY, JSON.stringify(org));
    set({ org });
  },

  setErpUrl: async (url) => {
    const normalized = normalizeErpApiBaseUrl(url);
    setErpApiBaseUrl(normalized);
    await AsyncStorage.setItem(ERP_URL_KEY, normalized);
    set({ erpApiUrl: normalized });
  },

  setHttpMode: async (enabled) => {
    applyErpHttpMode(enabled);
    await AsyncStorage.setItem(ERP_HTTP_MODE_KEY, enabled ? '1' : '0');
    set({ erpHttpMode: enabled });
  },

  logout: async () => {
    await AsyncStorage.multiRemove([AUTH_KEY, ORG_KEY]);
    set({ loginGuid: null, username: null, org: null });
  },
}));
