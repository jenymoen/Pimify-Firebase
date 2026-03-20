"use client";

import { type ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, PackagePlus, Package, UploadCloud, Settings, Menu, LogOut, TrendingUp, PanelLeft, Users, Mail, ListChecks, UserCheck, Shield, Key, Network, ChevronDown } from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/context/auth-context';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  action?: () => void;
}

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useIsMobile();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Auto-open settings section if user is on a settings/admin page
  useEffect(() => {
    const settingsPaths = ['/users', '/reviewers', '/settings'];
    if (settingsPaths.some(p => pathname.startsWith(p))) {
      setSettingsOpen(true);
    }
  }, [pathname]);

  // Show loading state authentication or determining mobile state
  if (isLoading || isMobile === undefined) {
    return <div className="flex h-screen items-center justify-center"><p>Loading...</p></div>;
  }

  if (!isAuthenticated) {
    return null; // prevent flash of content before redirect
  }

  const handleLogout = () => {
    // In a real app, you'd clear auth tokens, etc. here
    router.push('/');
  };

  const role = user?.role?.toLowerCase() || 'viewer';
  const isAdmin = role === 'admin';
  const isEditorOrAbove = isAdmin || role === 'editor';

  // Main navigation items (visible to all roles)
  const mainNavItems: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/products', label: 'Products', icon: Package },
    { href: '/products/new', label: 'Add Product', icon: PackagePlus },
    { href: '/quality', label: 'Quality Dashboard', icon: TrendingUp },
    { href: '/import-export', label: 'Import/Export', icon: UploadCloud },
  ];

  // Settings sub-items (admin-only)
  const settingsNavItems: NavItem[] = [];
  if (isEditorOrAbove) {
    settingsNavItems.push({ href: '/users', label: 'Users', icon: Users });
    settingsNavItems.push({ href: '/reviewers', label: 'Reviewers', icon: UserCheck });
  }
  if (isAdmin) {
    settingsNavItems.push({ href: '/users/invitations', label: 'Invitations', icon: Mail });
    settingsNavItems.push({ href: '/users/registration-requests', label: 'Registrations', icon: ListChecks });
    settingsNavItems.push({ href: '/settings/security', label: 'Security', icon: Shield });
    settingsNavItems.push({ href: '/settings/sso', label: 'SSO Configuration', icon: Key });
    settingsNavItems.push({ href: '/settings/ldap', label: 'LDAP Configuration', icon: Network });
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    if (href === '/quality') return pathname === '/quality';
    if (href === '/products') return pathname === '/products';
    return pathname === href || pathname.startsWith(href + '/');
  };

  const sidebarContent = (
    <>
      <SidebarHeader className="p-4">
        <Link href="/dashboard" className="flex items-center gap-2 overflow-hidden">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 text-primary shrink-0">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
          </svg>
          <h1 className="text-2xl font-semibold text-foreground group-data-[collapsible=icon]:hidden">Pimify</h1>
        </Link>
      </SidebarHeader>
      <SidebarContent className="flex-grow">
        <SidebarMenu>
          {mainNavItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton
                isActive={isActive(item.href)}
                asChild
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2 border-t border-sidebar-border mt-auto flex flex-col gap-2">
        {/* Settings section — admin only */}
        {settingsNavItems.length > 0 && (
          <>
            <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
              <SidebarMenu>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip="Settings"
                      isActive={settingsNavItems.some(item => isActive(item.href))}
                    >
                      <Settings />
                      <span className="flex-1">Settings</span>
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${settingsOpen ? 'rotate-180' : ''}`} />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                </SidebarMenuItem>
              </SidebarMenu>
              <CollapsibleContent>
                <SidebarMenu className="ml-4 border-l border-sidebar-border pl-2 mt-1 mb-1">
                  {settingsNavItems.map((item) => (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        isActive={isActive(item.href)}
                        asChild
                        tooltip={item.label}
                      >
                        <Link href={item.href}>
                          <item.icon className="h-4 w-4" />
                          <span className="text-sm">{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </CollapsibleContent>
            </Collapsible>
            <div className="h-px bg-sidebar-border w-full opacity-50 my-1" />
          </>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              asChild={false}
              tooltip="Logout"
              className="w-full"
            >
              <LogOut />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      {isMobile ? (
        <div className="flex flex-col min-h-screen">
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-card px-4">
            <Link href="/dashboard" className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7 text-primary">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
              </svg>
              <span className="text-xl font-semibold text-foreground">Pimify</span>
            </Link>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0 flex flex-col"> {/* Added flex flex-col */}
                {sidebarContent}
              </SheetContent>
            </Sheet>
          </header>
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      ) : (
        <div className="flex min-h-screen">
          <Sidebar collapsible="icon" variant="sidebar" side="left" className="flex flex-col">
            {sidebarContent}
          </Sidebar>
          <SidebarInset className="flex-1">
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger className="-ml-1" />
            </header>
            <div className="p-6">{children}</div>
          </SidebarInset>
        </div>
      )}
    </SidebarProvider>
  );
}
