'use client';

/**
 * Settings - Integrations Page
 * 
 * Manage external integrations including Shopify store connections.
 */

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Trash2, RefreshCw, DownloadCloud, UploadCloud, Save, Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useBusinessCentralConfigStore } from '@/lib/business-central-config-store';
import { useProductStore } from '@/lib/product-store';
import { ShopifyOAuthButton } from '@/components/settings/ShopifyOAuthButton';
import {
    useShopifyStores,
    useCompleteStoreConnection,
    useDisconnectStore,
    useVerifyStoreConnection,
    ShopifyStoreInfo
} from '@/hooks/use-shopify-stores';
import { format, parseISO } from 'date-fns';

// Wrapper component to handle Suspense for useSearchParams
export default function IntegrationsPage() {
    return (
        <Suspense fallback={<div className="flex justify-center py-8">Loading...</div>}>
            <IntegrationsContent />
        </Suspense>
    );
}

function IntegrationsContent() {
    const searchParams = useSearchParams();
    const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const { data: storesData, isLoading, refetch } = useShopifyStores();
    const completeConnection = useCompleteStoreConnection();
    const disconnectStore = useDisconnectStore();
    const verifyConnection = useVerifyStoreConnection();

    const stores = storesData?.stores || [];

    // Handle OAuth callback
    useEffect(() => {
        const shopifyConnected = searchParams.get('shopify_connected');
        const shopifyError = searchParams.get('shopify_error');

        if (shopifyConnected === 'true') {
            // Complete the store connection
            completeConnection.mutate(undefined, {
                onSuccess: () => {
                    setNotification({ type: 'success', message: 'Shopify store connected successfully!' });
                    refetch();
                    // Clear URL params
                    window.history.replaceState({}, '', '/settings/integrations');
                },
                onError: (error) => {
                    setNotification({ type: 'error', message: error.message || 'Failed to complete connection' });
                },
            });
        } else if (shopifyError) {
            setNotification({ type: 'error', message: shopifyError });
            window.history.replaceState({}, '', '/settings/integrations');
        }
    }, [searchParams, completeConnection, refetch]);

    const handleDisconnect = async (storeId: string, storeName: string) => {
        if (!confirm(`Are you sure you want to disconnect "${storeName}"?`)) {
            return;
        }

        disconnectStore.mutate(storeId, {
            onSuccess: () => {
                setNotification({ type: 'success', message: `${storeName} disconnected` });
                refetch();
            },
            onError: (error) => {
                setNotification({ type: 'error', message: error.message });
            },
        });
    };

    const handleVerify = async (storeId: string) => {
        verifyConnection.mutate(storeId, {
            onSuccess: (data) => {
                if (data.connected) {
                    setNotification({ type: 'success', message: 'Connection verified!' });
                } else {
                    setNotification({ type: 'error', message: 'Connection failed - please reconnect' });
                }
                refetch();
            },
            onError: (error) => {
                setNotification({ type: 'error', message: error.message });
            },
        });
    };

    return (
        <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-primary">Integrations</h1>
                <p className="text-muted-foreground mt-2">
                    Connect external platforms to sync your product data.
                </p>
            </div>

            {/* Notification Banner */}
            {notification && (
                <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${notification.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                    }`}>
                    {notification.type === 'success' ? (
                        <CheckCircle className="h-5 w-5" />
                    ) : (
                        <AlertCircle className="h-5 w-5" />
                    )}
                    <span>{notification.message}</span>
                    <button
                        onClick={() => setNotification(null)}
                        className="ml-auto text-current hover:opacity-70"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Shopify Integration */}
            <Card className="shadow-lg">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {/* Shopify Logo */}
                            <div className="h-10 w-10 rounded-lg bg-[#95BF47] flex items-center justify-center">
                                <svg className="h-6 w-6 text-white" viewBox="0 0 109.5 124.5" fill="currentColor">
                                    <path d="M74.7 14.8s-1.4.4-3.7 1.1c-.4-1.3-1-2.8-1.8-4.4-2.6-5-6.5-7.7-11.1-7.7-.3 0-.6 0-1 .1-.1-.2-.3-.3-.4-.5-2-2.2-4.6-3.3-7.7-3.2-6 .2-12 4.5-16.8 12.2-3.4 5.4-6 12.2-6.7 17.5-6.9 2.1-11.7 3.6-11.8 3.7-3.5 1.1-3.6 1.2-4 4.5C9.4 40.1 0 109.6 0 109.6l79.7 13.8V14.5c-.3 0-.6.1-1 .1-.6 0-2.7.2-4 .2z" />
                                </svg>
                            </div>
                            <div>
                                <CardTitle>Shopify</CardTitle>
                                <CardDescription>
                                    Push products to your Shopify stores
                                </CardDescription>
                            </div>
                        </div>
                        <ShopifyOAuthButton variant="outline" size="sm" />
                    </div>
                </CardHeader>

                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                        </div>
                    ) : stores.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <p className="mb-4">No Shopify stores connected yet.</p>
                            <p className="text-sm">Click "Connect Shopify Store" to get started.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                                Connected Stores ({stores.length})
                            </h3>

                            {stores.map((store) => (
                                <StoreCard
                                    key={store.id}
                                    store={store}
                                    onDisconnect={() => handleDisconnect(store.id, store.shopName)}
                                    onVerify={() => handleVerify(store.id)}
                                    isVerifying={verifyConnection.isPending}
                                    isDisconnecting={disconnectStore.isPending}
                                />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Business Central Integration */}
            <BusinessCentralIntegration />
        </div>
    );
}

/**
 * Individual Store Card Component
 */
function StoreCard({
    store,
    onDisconnect,
    onVerify,
    isVerifying,
    isDisconnecting
}: {
    store: ShopifyStoreInfo;
    onDisconnect: () => void;
    onVerify: () => void;
    isVerifying: boolean;
    isDisconnecting: boolean;
}) {
    const statusColors = {
        connected: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        disconnected: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
        error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };

    return (
        <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                    <span className="text-lg font-bold text-muted-foreground">
                        {store.shopName.charAt(0).toUpperCase()}
                    </span>
                </div>

                <div>
                    <div className="flex items-center gap-2">
                        <h4 className="font-medium">{store.shopName}</h4>
                        <Badge className={`text-xs ${statusColors[store.status]}`}>
                            {store.status}
                        </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{store.shop}</p>
                    <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                        <span>Connected: {format(parseISO(store.connectedAt), 'MMM d, yyyy')}</span>
                        {store.lastSyncedAt && (
                            <span>Last sync: {format(parseISO(store.lastSyncedAt), 'MMM d, yyyy h:mm a')}</span>
                        )}
                    </div>
                    {store.errorMessage && (
                        <p className="text-xs text-red-500 mt-1">{store.errorMessage}</p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onVerify}
                    disabled={isVerifying}
                >
                    <RefreshCw className={`h-4 w-4 ${isVerifying ? 'animate-spin' : ''}`} />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDisconnect}
                    disabled={isDisconnecting}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

/**
 * Business Central Integration Component
 */
function BusinessCentralIntegration() {
    const { toast } = useToast();
    const { products, importProducts } = useProductStore();
    const {
        tenantId,
        environment,
        clientId,
        clientSecret,
        companyId,
        setTenantId,
        setEnvironment,
        setClientId,
        setClientSecret,
        setCompanyId,
        isConfigured
    } = useBusinessCentralConfigStore();

    const [localTenantId, setLocalTenantId] = useState(tenantId);
    const [localEnvironment, setLocalEnvironment] = useState(environment);
    const [localClientId, setLocalClientId] = useState(clientId);
    const [localClientSecret, setLocalClientSecret] = useState(clientSecret);
    const [localCompanyId, setLocalCompanyId] = useState(companyId);
    const [isImporting, setIsImporting] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const clientReady = isConfigured();

    const handleSaveConfig = () => {
        setTenantId(localTenantId);
        setEnvironment(localEnvironment);
        setClientId(localClientId);
        setClientSecret(localClientSecret);
        setCompanyId(localCompanyId);
        toast({ title: 'Configuration Saved', description: 'Business Central credentials saved.' });
    };

    const handleImport = async () => {
        if (!clientReady) return;
        setIsImporting(true);
        try {
            const response = await fetch('/api/business-central/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenantId, environment, clientId, clientSecret, companyId }),
            });
            if (!response.ok) throw new Error('Import failed');
            const data = await response.json();
            importProducts(data.products);
            toast({ title: 'Import Successful', description: data.message });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'An error occurred';
            toast({ title: 'Import Failed', description: message, variant: 'destructive' });
        } finally {
            setIsImporting(false);
        }
    };

    const handleExport = async () => {
        if (!clientReady || products.length === 0) return;
        setIsExporting(true);
        try {
            const response = await fetch('/api/business-central/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenantId, environment, clientId, clientSecret, companyId, productsToExport: products }),
            });
            if (!response.ok) throw new Error('Export failed');
            const data = await response.json();
            toast({ title: 'Export Successful', description: data.message });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'An error occurred';
            toast({ title: 'Export Failed', description: message, variant: 'destructive' });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Card className="mt-6 shadow-lg">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold">
                        BC
                    </div>
                    <div>
                        <CardTitle>Microsoft Business Central</CardTitle>
                        <CardDescription>
                            Sync products with Dynamics 365 Business Central
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Configuration */}
                <div className="space-y-4 p-4 border rounded-md bg-muted/20">
                    <h3 className="font-medium flex items-center gap-2">
                        <Settings className="h-5 w-5" /> Connection Configuration
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="bc-tenant-id">Tenant ID</Label>
                            <Input
                                id="bc-tenant-id"
                                placeholder="00000000-0000-0000-0000-000000000000"
                                value={localTenantId}
                                onChange={(e) => setLocalTenantId(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="bc-environment">Environment</Label>
                            <Input
                                id="bc-environment"
                                placeholder="Production"
                                value={localEnvironment}
                                onChange={(e) => setLocalEnvironment(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="bc-client-id">Client ID</Label>
                            <Input
                                id="bc-client-id"
                                placeholder="Azure AD App Client ID"
                                value={localClientId}
                                onChange={(e) => setLocalClientId(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                        <div>
                            <Label htmlFor="bc-client-secret">Client Secret</Label>
                            <Input
                                id="bc-client-secret"
                                type="password"
                                placeholder="Azure AD App Client Secret"
                                value={localClientSecret}
                                onChange={(e) => setLocalClientSecret(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <Label htmlFor="bc-company-id">Company ID</Label>
                            <Input
                                id="bc-company-id"
                                placeholder="Company name or ID"
                                value={localCompanyId}
                                onChange={(e) => setLocalCompanyId(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                    </div>
                    <Button onClick={handleSaveConfig}>
                        <Save className="mr-2 h-4 w-4" /> Save Configuration
                    </Button>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
                    <Button
                        variant="outline"
                        onClick={handleImport}
                        disabled={!clientReady || isImporting || isExporting}
                    >
                        {isImporting ? (
                            <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                            <DownloadCloud className="mr-2 h-5 w-5" />
                        )}
                        {isImporting ? 'Importing...' : 'Import from BC'}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleExport}
                        disabled={!clientReady || isImporting || isExporting || products.length === 0}
                    >
                        {isExporting ? (
                            <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                            <UploadCloud className="mr-2 h-5 w-5" />
                        )}
                        {isExporting ? 'Exporting...' : 'Export to BC'}
                    </Button>
                </div>

                {!clientReady && (
                    <Alert variant="default">
                        <Settings className="h-4 w-4" />
                        <AlertTitle>Configuration Required</AlertTitle>
                        <AlertDescription>
                            Enter and save your Business Central credentials to enable integration.
                        </AlertDescription>
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}
