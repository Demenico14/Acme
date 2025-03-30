"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BarChart3, Users, Package, ShoppingCart, Settings, LogOut, Home, } from 'lucide-react'

import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem} from "@/components/ui/sidebar"

const routes = [
  {
    title: "Dashboard",
    icon: Home,
    href: "/dashboard",
    variant: "default"
  },
  {
    title: "Stock",
    icon: Package,
    href: "/dashboard/stock",
    variant: "default"
  },
  {
    title: "Equipment",
    icon: Package,
    href: "/dashboard/stock-attachments",
    variant: "default"
  },
  {
    title: "Transactions",
    icon: ShoppingCart,
    href: "/dashboard/transactions",
    variant: "default"
  },
  {
    title: "Users",
    icon: Users,
    href: "/dashboard/users",
    variant: "default"
  },
  {
    title: "Analytics",
    icon: BarChart3,
    href: "/dashboard/analytics",
    variant: "default"
  },
  {
    title: "Settings",
    icon: Settings,
    href: "/dashboard/settings",
    variant: "default"
  }
]

export function DashboardSidebar() {
  const pathname = usePathname()
  const { signOut } = useAuth()

  return (
    <Sidebar>
      <SidebarHeader className="border-b py-4">
        <div className="flex items-center px-2">
          <Package className="mr-2 h-6 w-6" />
          <span className="text-lg font-bold">Acme Management</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {routes.map((route) => (
            <SidebarMenuItem key={route.href}>
              <SidebarMenuButton 
                asChild 
                isActive={pathname === route.href}
                tooltip={route.title}
              >
                <Link href={route.href}>
                  <route.icon className="h-5 w-5" />
                  <span>{route.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <Button 
          variant="outline" 
          className="w-full justify-start" 
          onClick={signOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}
