"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useAuth } from "@/context/auth-context"
import { Menu, LayoutDashboard, Users, Package, FileText, Bell, Settings, LogOut } from "lucide-react"

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  const routes = [
    {
      href: "/admin/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/admin/users",
      label: "Users",
      icon: Users,
    },
    {
      href: "/admin/assets",
      label: "Assets",
      icon: Package,
    },
    {
      href: "/admin/bookings",
      label: "Bookings",
      icon: FileText,
    },
    {
      href: "/admin/maintenance",
      label: "Maintenance",
      icon: Bell,
    },
    {
      href: "/admin/settings",
      label: "Settings",
      icon: Settings,
    },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6 lg:px-8">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 sm:max-w-xs">
            <nav className="grid gap-6 text-lg font-medium">
              <Link
                href="/admin/dashboard"
                className="flex items-center gap-2 text-lg font-semibold"
                onClick={() => setOpen(false)}
              >
                <Package className="h-6 w-6" />
                <span>Asset Management</span>
              </Link>
              <div className="grid gap-1">
                {routes.map((route) => (
                  <Link
                    key={route.href}
                    href={route.href}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
                      pathname === route.href ? "bg-muted text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setOpen(false)}
                  >
                    <route.icon className="h-5 w-5" />
                    {route.label}
                  </Link>
                ))}
              </div>
              <div className="grid gap-1">
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground justify-start"
                  onClick={() => {
                    logout()
                    setOpen(false)
                  }}
                >
                  <LogOut className="h-5 w-5" />
                  Logout
                </Button>
              </div>
            </nav>
          </SheetContent>
        </Sheet>
        <Link href="/admin/dashboard" className="flex items-center gap-2 font-semibold">
          <Package className="h-6 w-6" />
          <span className="hidden md:inline-block">Asset Management</span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <div className="hidden md:flex md:items-center md:gap-4">
            <p className="text-sm font-medium">Welcome, {user?.name || "Admin"}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} className="text-muted-foreground hover:text-foreground">
            <LogOut className="h-5 w-5" />
            <span className="sr-only">Logout</span>
          </Button>
        </div>
      </header>
      <div className="flex flex-1">
        <aside className="hidden w-64 border-r bg-muted/40 lg:block">
          <nav className="grid gap-2 p-4 text-sm">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
                  pathname === route.href ? "bg-muted text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <route.icon className="h-5 w-5" />
                {route.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}

