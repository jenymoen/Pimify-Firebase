
"use client";

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, PackagePlus, Package, UploadCloud, Settings, Menu, LogOut, UserCircle } from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar'; 
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuthStore } from '@/lib/auth-store'; 

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useIsMobile();
  const { logout: authLogout, user } = useAuthStore(); 

  const handleLogout = async () => {
    await authLogout();
    router.push('/'); 
  };

  const navItems: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/products', label: 'Products', icon: Package },
    { href: '/products/new', label: 'Add Product', icon: PackagePlus },
    { href: '/import-export', label: 'Import/Export', icon: UploadCloud },
  ];

  const sidebarContent = (
    <>
      <SidebarHeader className="p-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 text-primary">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
          </svg>
          <h1 className="text-2xl font-semibold text-foreground">Pimify</h1>
        </Link>
      </SidebarHeader>
      <SidebarContent className="flex-grow">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <Link href={item.href} passHref legacyBehavior>
                <SidebarMenuButton
                  isActive={pathname === item.href || (item.href !== '/products' && item.href !== '/dashboard' && pathname.startsWith(item.href)) || (item.href === '/dashboard' && pathname === '/dashboard') || (item.href === '/profile' && pathname === '/profile') }
                  asChild={false} 
                  tooltip={item.label}
                >
                  <item.icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2 border-t border-sidebar-border mt-auto">
        <SidebarMenu>
          <SidebarMenuItem>
             <Link href="/profile" passHref legacyBehavior>
                <SidebarMenuButton
                  isActive={pathname === '/profile'}
                  asChild={false}
                  tooltip="User Profile"
                  className="w-full"
                >
                  <UserCircle />
                  <span>User Profile</span>
                </SidebarMenuButton>
              </Link>
          </SidebarMenuItem>
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

  if (isMobile === undefined) { 
    return <div className="flex h-screen items-center justify-center"><p>Loading UI...</p></div>; 
  }

  if (!user) { 
      return <div className="flex h-screen items-center justify-center"><p>Authenticating...</p></div>;
  }

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
              <SheetContent side="left" className="w-[280px] p-0 flex flex-col">
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
          <div className="flex-1 bg-background"> 
            <div className="p-6">{children}</div>
          </div>
        </div>
      )}
    </SidebarProvider>
  );
}
