import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface BusinessCentralConfigState {
    tenantId: string;
    environment: string;
    clientId: string;
    clientSecret: string;
    companyId: string;
    setTenantId: (id: string) => void;
    setEnvironment: (env: string) => void;
    setClientId: (id: string) => void;
    setClientSecret: (secret: string) => void;
    setCompanyId: (id: string) => void;
    isConfigured: () => boolean;
}

export const useBusinessCentralConfigStore = create<BusinessCentralConfigState>()(
    persist(
        (set, get) => ({
            tenantId: '',
            environment: '',
            clientId: '',
            clientSecret: '',
            companyId: '',
            setTenantId: (tenantId) => set({ tenantId }),
            setEnvironment: (environment) => set({ environment }),
            setClientId: (clientId) => set({ clientId }),
            setClientSecret: (clientSecret) => set({ clientSecret }),
            setCompanyId: (companyId) => set({ companyId }),
            isConfigured: () => {
                const { tenantId, environment, clientId, clientSecret, companyId } = get();
                return !!(tenantId && environment && clientId && clientSecret && companyId);
            },
        }),
        {
            name: 'business-central-config',
        }
    )
);
