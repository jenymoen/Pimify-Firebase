'use client';

/**
 * Settings Index Page
 * 
 * Shows all available settings categories for Admin users.
 */

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plug, Shield, Key, Network } from 'lucide-react';

const settingsItems = [
    {
        href: '/settings/integrations',
        label: 'Integrations',
        description: 'Connect external platforms like Shopify',
        icon: Plug,
        color: 'text-emerald-500',
    },
    {
        href: '/settings/security',
        label: 'Security',
        description: 'Password policies and session settings',
        icon: Shield,
        color: 'text-blue-500',
    },
    {
        href: '/settings/sso',
        label: 'SSO Configuration',
        description: 'Single Sign-On settings',
        icon: Key,
        color: 'text-purple-500',
    },
    {
        href: '/settings/ldap',
        label: 'LDAP Configuration',
        description: 'Directory service integration',
        icon: Network,
        color: 'text-orange-500',
    },
];

export default function SettingsPage() {
    return (
        <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-primary">Settings</h1>
                <p className="text-muted-foreground mt-2">
                    Manage system configuration and integrations.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {settingsItems.map((item) => (
                    <Link key={item.href} href={item.href}>
                        <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
                            <CardHeader className="flex flex-row items-center gap-4 pb-2">
                                <div className={`h-10 w-10 rounded-lg bg-muted flex items-center justify-center ${item.color}`}>
                                    <item.icon className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">{item.label}</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <CardDescription>{item.description}</CardDescription>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
