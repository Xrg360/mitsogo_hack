"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Package, Users, Calendar, AlertTriangle, CheckCircle } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function AdminDashboard() {
  const { user } = useAuth()
  const [dashboardData, setDashboardData] = useState({
    totalAssets: 0,
    activeUsers: 0,
    pendingBookings: 0,
    maintenanceAlerts: 0,
    recentActivity: [],
    assetUtilization: [],
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Get total assets count
        const assetsSnapshot = await getDocs(collection(db, "assets"))
        const totalAssets = assetsSnapshot.size

        // Get active users count
        const usersQuery = query(collection(db, "users"), where("status", "==", "Active"))
        const usersSnapshot = await getDocs(usersQuery)
        const activeUsers = usersSnapshot.size

        // Get pending bookings count
        const pendingBookingsQuery = query(collection(db, "bookings"), where("status", "==", "Pending"))
        const pendingBookingsSnapshot = await getDocs(pendingBookingsQuery)
        const pendingBookings = pendingBookingsSnapshot.size

        // Get maintenance alerts count
        const maintenanceQuery = query(collection(db, "maintenance"), where("status", "in", ["Pending", "In Progress"]))
        const maintenanceSnapshot = await getDocs(maintenanceQuery)
        const maintenanceAlerts = maintenanceSnapshot.size

        // Get recent activity
        const recentActivityQuery = query(collection(db, "bookings"), orderBy("requestDate", "desc"), limit(4))
        const recentActivitySnapshot = await getDocs(recentActivityQuery)
        const recentActivity = recentActivitySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          type: "booking",
        }))

        // Get maintenance activity
        const maintenanceActivityQuery = query(collection(db, "maintenance"), orderBy("reportDate", "desc"), limit(2))
        const maintenanceActivitySnapshot = await getDocs(maintenanceActivityQuery)
        const maintenanceActivity = maintenanceActivitySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          type: "maintenance",
        }))

        // Combine and sort activities
        const allActivities = [...recentActivity, ...maintenanceActivity]
          .sort((a, b) => {
            const dateA = a.type === "booking" ? new Date(a.requestDate) : new Date(a.reportDate)
            const dateB = b.type === "booking" ? new Date(b.requestDate) : new Date(b.reportDate)
            return dateB - dateA
          })
          .slice(0, 4)

        // Calculate asset utilization
        const assetTypes = {}
        assetsSnapshot.docs.forEach((doc) => {
          const data = doc.data()
          if (data.type) {
            if (!assetTypes[data.type]) {
              assetTypes[data.type] = { total: 0, inUse: 0 }
            }
            assetTypes[data.type].total++
            if (data.status === "In Use") {
              assetTypes[data.type].inUse++
            }
          }
        })

        const assetUtilization = Object.entries(assetTypes)
          .map(([type, data]) => ({
            type,
            percentage: data.total > 0 ? Math.round((data.inUse / data.total) * 100) : 0,
          }))
          .sort((a, b) => b.percentage - a.percentage)
          .slice(0, 3)

        setDashboardData({
          totalAssets,
          activeUsers,
          pendingBookings,
          maintenanceAlerts,
          recentActivity: allActivities,
          assetUtilization,
        })
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const formatActivityDate = (activity) => {
    const date = activity.type === "booking" ? new Date(activity.requestDate) : new Date(activity.reportDate)

    // Check if date is today
    const today = new Date()
    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    }

    // Check if date is yesterday
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    }

    // Otherwise return full date
    return (
      date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) +
      ` at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
      <p className="text-muted-foreground">
        Welcome back, {user?.name || "Admin"}! Here's an overview of your asset management system.
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <p>Loading dashboard data...</p>
        </div>
      ) : (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardData.totalAssets}</div>
                  <p className="text-xs text-muted-foreground">Managed in the system</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardData.activeUsers}</div>
                  <p className="text-xs text-muted-foreground">Using the system</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Bookings</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardData.pendingBookings}</div>
                  <p className="text-xs text-muted-foreground">Requires your approval</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Maintenance Alerts</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardData.maintenanceAlerts}</div>
                  <p className="text-xs text-muted-foreground">Requires attention</p>
                </CardContent>
              </Card>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Recent asset bookings and status changes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dashboardData.recentActivity.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No recent activity</p>
                    ) : (
                      dashboardData.recentActivity.map((activity) => (
                        <div key={activity.id} className="flex items-center gap-4">
                          {activity.type === "booking" ? (
                            <>
                              {activity.status === "Approved" ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : activity.status === "Rejected" ? (
                                <AlertTriangle className="h-5 w-5 text-red-500" />
                              ) : (
                                <Calendar className="h-5 w-5 text-amber-500" />
                              )}
                              <div className="flex-1 space-y-1">
                                <p className="text-sm font-medium leading-none">
                                  {activity.assetName} booked by {activity.requestedByName || "User"}
                                </p>
                                <p className="text-sm text-muted-foreground">{formatActivityDate(activity)}</p>
                              </div>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-5 w-5 text-amber-500" />
                              <div className="flex-1 space-y-1">
                                <p className="text-sm font-medium leading-none">
                                  {activity.assetName} reported {activity.issue}
                                </p>
                                <p className="text-sm text-muted-foreground">{formatActivityDate(activity)}</p>
                              </div>
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>Asset Utilization</CardTitle>
                  <CardDescription>Most frequently used assets this month</CardDescription>
                </CardHeader>
                <CardContent>
                  {dashboardData.assetUtilization.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No utilization data available</p>
                  ) : (
                    <div className="space-y-4">
                      {dashboardData.assetUtilization.map((item) => (
                        <div key={item.type} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <p className="text-sm font-medium leading-none">{item.type}</p>
                            </div>
                            <div className="font-medium">{item.percentage}%</div>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted">
                            <div className="h-2 rounded-full bg-primary" style={{ width: `${item.percentage}%` }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Analytics Overview</CardTitle>
                <CardDescription>Detailed analytics about your asset management system</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Analytics content would be displayed here with charts and graphs showing asset usage trends, booking
                  patterns, and maintenance history.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Reports</CardTitle>
                <CardDescription>Generate and view reports about your assets and users</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Reports content would be displayed here with options to generate various reports such as asset
                  utilization, maintenance history, and user activity.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

