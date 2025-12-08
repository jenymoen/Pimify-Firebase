'use client';

/**
 * Shopify OAuth Button Component
 * 
 * Initiates the OAuth flow to connect a Shopify store.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, ExternalLink } from 'lucide-react';

interface ShopifyOAuthButtonProps {
    variant?: 'default' | 'outline' | 'secondary';
    size?: 'default' | 'sm' | 'lg';
    className?: string;
}

export function ShopifyOAuthButton({
    variant = 'default',
    size = 'default',
    className = '',
}: ShopifyOAuthButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [shopUrl, setShopUrl] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    /**
     * Validate and normalize shop URL
     */
    const normalizeShopUrl = (url: string): string | null => {
        // Remove https:// or http:// if present
        let normalized = url.toLowerCase().trim();
        normalized = normalized.replace(/^https?:\/\//, '');

        // Remove trailing slashes
        normalized = normalized.replace(/\/+$/, '');

        // Remove /admin or other paths
        normalized = normalized.split('/')[0];

        // Add .myshopify.com if not present
        if (!normalized.includes('.myshopify.com')) {
            normalized = `${normalized}.myshopify.com`;
        }

        // Validate format
        const shopRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;
        if (!shopRegex.test(normalized)) {
            return null;
        }

        return normalized;
    };

    const handleConnect = async () => {
        setError(null);

        const normalizedShop = normalizeShopUrl(shopUrl);
        if (!normalizedShop) {
            setError('Please enter a valid Shopify store URL (e.g., mystore or mystore.myshopify.com)');
            return;
        }

        setIsLoading(true);

        try {
            // Redirect to OAuth endpoint
            window.location.href = `/api/shopify/oauth?shop=${encodeURIComponent(normalizedShop)}`;
        } catch (err) {
            setError('Failed to initiate connection. Please try again.');
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleConnect();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant={variant} size={size} className={className}>
                    <Plus className="h-4 w-4 mr-2" />
                    Connect Shopify Store
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <svg className="h-5 w-5" viewBox="0 0 109.5 124.5" fill="currentColor">
                            <path d="M74.7 14.8s-1.4.4-3.7 1.1c-.4-1.3-1-2.8-1.8-4.4-2.6-5-6.5-7.7-11.1-7.7-.3 0-.6 0-1 .1-.1-.2-.3-.3-.4-.5-2-2.2-4.6-3.3-7.7-3.2-6 .2-12 4.5-16.8 12.2-3.4 5.4-6 12.2-6.7 17.5-6.9 2.1-11.7 3.6-11.8 3.7-3.5 1.1-3.6 1.2-4 4.5C9.4 40.1 0 109.6 0 109.6l79.7 13.8V14.5c-.3 0-.6.1-1 .1-.6 0-2.7.2-4 .2zm-9.3 2.8" />
                        </svg>
                        Connect Shopify Store
                    </DialogTitle>
                    <DialogDescription>
                        Enter your Shopify store URL to connect it with Pimify.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="shop-url">Store URL</Label>
                        <Input
                            id="shop-url"
                            type="text"
                            placeholder="mystore.myshopify.com"
                            value={shopUrl}
                            onChange={(e) => {
                                setShopUrl(e.target.value);
                                setError(null);
                            }}
                            onKeyDown={handleKeyDown}
                            disabled={isLoading}
                        />
                        <p className="text-xs text-muted-foreground">
                            Enter your store name (e.g., "mystore") or full URL
                        </p>
                    </div>

                    {error && (
                        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button onClick={handleConnect} disabled={isLoading || !shopUrl.trim()}>
                        {isLoading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                Connecting...
                            </>
                        ) : (
                            <>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Connect Store
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default ShopifyOAuthButton;
