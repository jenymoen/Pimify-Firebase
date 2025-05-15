
"use client";

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PackagePlus, Package, UploadCloud, DownloadCloud, Settings, Menu } from 'lucide-react';
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

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { href: '/products', label: 'Products', icon: Package },
  { href: '/products/new', label: 'Add Product', icon: PackagePlus },
  { href: '/import-export', label: 'Import/Export', icon: UploadCloud },
  // { href: '/settings', label: 'Settings', icon: Settings }, // Example for future use
];

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isMobile = useIsMobile();

  const sidebarContent = (
    <>
      <SidebarHeader className="p-4">
        <Link href="/products" className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 text-primary">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
          </svg>
          <h1 className="text-2xl font-semibold text-foreground">ProduktHjelp</h1>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <Link href={item.href} passHref legacyBehavior>
                <SidebarMenuButton
                  isActive={pathname === item.href || (item.href !== '/products' && pathname.startsWith(item.href))}
                  asChild={false} // Important: ensure it's a button for proper styling from sidebar component
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
      <SidebarFooter className="p-4">
        {/* Footer content if any */}
      </SidebarFooter>
    </>
  );

  if (isMobile === undefined) { // Still determining mobile status
    return <div className="flex h-screen items-center justify-center"><p>Loading...</p></div>; 
  }

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      {isMobile ? (
        <div className="flex flex-col min-h-screen">
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-card px-4">
            <Link href="/products" className="flex items-center gap-2">
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7 text-primary">
                 <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
               </svg>
              <span className="text-xl font-semibold text-foreground">ProduktHjelp</span>
            </Link>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0">
                {sidebarContent}
              </SheetContent>
            </Sheet>
          </header>
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      ) : (
        <div className="flex min-h-screen">
          <Sidebar collapsible="icon" variant="sidebar" side="left">
            {sidebarContent}
          </Sidebar>
          <SidebarInset className="flex-1"> {/* Use SidebarInset for main content area */}
            <div className="p-6">{children}</div>
          </SidebarInset>
        </div>
      )}
    </SidebarProvider>
  );
}
