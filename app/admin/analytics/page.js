"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { format, subMonths, parseISO, eachMonthOfInterval } from "date-fns"

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("6months")
  const [isLoading, setIsLoading] = useState(true)
  const [assets, setAssets] = useState([])
  const [users, setUsers] = useState([])
  const [maintenanceLogs, setMaintenanceLogs] = useState([])
  const [bookings, setBookings] = useState([])
  const [analyticsData, setAnalyticsData] = useState({})

  // Colors for charts
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658", "#8dd1e1"]

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch assets
        const assetsSnapshot = await getDocs(collection(db, "assets"))
        const assetsData = assetsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          purchaseDate: doc.data().purchaseDate || doc.data().createdAt || new Date().toISOString(),
        }))
        setAssets(assetsData)

        // Fetch users
        const usersSnapshot = await getDocs(collection(db, "users"))
        const usersData = usersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          joinedDate: doc.data().joinedDate || doc.data().createdAt || new Date().toISOString(),
        }))
        setUsers(usersData)

        // Fetch maintenance logs
        const maintenanceSnapshot = await getDocs(collection(db, "maintenance"))
        const maintenanceData = maintenanceSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setMaintenanceLogs(maintenanceData)

        // Fetch bookings
        const bookingsSnapshot = await getDocs(collection(db, "bookings"))
        const bookingsData = bookingsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setBookings(bookingsData)

        setIsLoading(false)
      } catch (error) {
        console.error("Error fetching data:", error)
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    if (isLoading) return
    processAnalyticsData()
  }, [timeRange, assets, users, maintenanceLogs, bookings, isLoading])

  const processAnalyticsData = () => {
    // Get date range based on selected time range
    const now = new Date()
    let startDate

    switch (timeRange) {
      case "3months":
        startDate = subMonths(now, 3)
        break
      case "6months":
        startDate = subMonths(now, 6)
        break
      case "1year":
        startDate = subMonths(now, 12)
        break
      default:
        startDate = subMonths(now, 6) // Default to 6 months
    }

    // Generate array of months in the selected range
    const monthsInRange = eachMonthOfInterval({
      start: startDate,
      end: now,
    }).map((date) => format(date, "MMM yyyy"))

    // Initialize data for each month
    const monthlyData = {}
    monthsInRange.forEach((month) => {
      monthlyData[month] = {
        month,
        assetCount: 0,
        maintenanceCount: 0,
        bookingCount: 0,
        userCount: 0,
        assetValue: 0,
        maintenanceCost: 0,
      }
    })

    // Process assets data
    const assetsByType = {}
    const assetsByStatus = {}
    const assetsByMonth = { ...monthlyData }
    let totalAssetValue = 0
    let availableAssets = 0
    let inUseAssets = 0
    let maintenanceAssets = 0

    assets.forEach((asset) => {
      // Count by type
      if (!assetsByType[asset.type]) {
        assetsByType[asset.type] = {
          type: asset.type,
          count: 0,
          value: 0,
        }
      }
      assetsByType[asset.type].count++

      // Assume purchase price if not available
      const purchasePrice = asset.purchasePrice || 1000
      assetsByType[asset.type].value += purchasePrice
      totalAssetValue += purchasePrice

      // Count by status
      if (!assetsByStatus[asset.status]) {
        assetsByStatus[asset.status] = {
          status: asset.status,
          count: 0,
        }
      }
      assetsByStatus[asset.status].count++

      // Track status counts
      if (asset.status === "Available") availableAssets++
      else if (asset.status === "In Use") inUseAssets++
      else if (asset.status === "Maintenance") maintenanceAssets++

      // Count by month (when purchased)
      if (asset.purchaseDate) {
        const month = format(parseISO(asset.purchaseDate), "MMM yyyy")
        if (assetsByMonth[month]) {
          assetsByMonth[month].assetCount++
          assetsByMonth[month].assetValue += purchasePrice
        }
      }
    })

    // Process maintenance data
    const maintenanceByStatus = {}
    const maintenanceByPriority = {}
    const maintenanceByMonth = { ...monthlyData }
    let pendingMaintenance = 0
    let inProgressMaintenance = 0
    let resolvedMaintenance = 0
    let estimatedMaintenanceCost = 0

    maintenanceLogs.forEach((log) => {
      // Count by status
      if (!maintenanceByStatus[log.status]) {
        maintenanceByStatus[log.status] = {
          status: log.status,
          count: 0,
        }
      }
      maintenanceByStatus[log.status].count++

      // Track status counts
      if (log.status === "Pending") pendingMaintenance++
      else if (log.status === "In Progress" || log.status === "Assigned") inProgressMaintenance++
      else if (log.status === "Resolved") resolvedMaintenance++

      // Count by priority
      if (!maintenanceByPriority[log.priority]) {
        maintenanceByPriority[log.priority] = {
          priority: log.priority,
          count: 0,
        }
      }
      maintenanceByPriority[log.priority].count++

      // Count by month
      if (log.reportDate) {
        const month = format(parseISO(log.reportDate), "MMM yyyy")
        if (maintenanceByMonth[month]) {
          maintenanceByMonth[month].maintenanceCount++

          // Estimate maintenance cost based on priority
          let cost = 0
          if (log.priority === "High") cost = 500
          else if (log.priority === "Medium") cost = 250
          else cost = 100

          maintenanceByMonth[month].maintenanceCost += cost
          estimatedMaintenanceCost += cost
        }
      }
    })

    // Process bookings data
    const bookingsByStatus = {}
    const bookingsByMonth = { ...monthlyData }
    let pendingBookings = 0
    let approvedBookings = 0
    let rejectedBookings = 0

    bookings.forEach((booking) => {
      // Count by status
      if (!bookingsByStatus[booking.status]) {
        bookingsByStatus[booking.status] = {
          status: booking.status,
          count: 0,
        }
      }
      bookingsByStatus[booking.status].count++

      // Track status counts
      if (booking.status === "Pending") pendingBookings++
      else if (booking.status === "Approved") approvedBookings++
      else if (booking.status === "Rejected") rejectedBookings++

      // Count by month
      if (booking.requestDate) {
        const month = format(parseISO(booking.requestDate), "MMM yyyy")
        if (bookingsByMonth[month]) {
          bookingsByMonth[month].bookingCount++
        }
      }
    })

    // Process users data
    const usersByRole = {}
    const usersByDepartment = {}
    const usersByMonth = { ...monthlyData }
    let activeUsers = 0
    let inactiveUsers = 0

    users.forEach((user) => {
      // Count by role
      if (!usersByRole[user.role]) {
        usersByRole[user.role] = {
          role: user.role,
          count: 0,
        }
      }
      usersByRole[user.role].count++

      // Count by department
      if (user.department && !usersByDepartment[user.department]) {
        usersByDepartment[user.department] = {
          department: user.department,
          count: 0,
        }
      }
      if (user.department) {
        usersByDepartment[user.department].count++
      }

      // Track status counts
      if (user.status === "Active") activeUsers++
      else inactiveUsers++

      // Count by month
      if (user.joinedDate) {
        const month = format(parseISO(user.joinedDate), "MMM yyyy")
        if (usersByMonth[month]) {
          usersByMonth[month].userCount++
        }
      }
    })

    // Calculate asset utilization rate
    const utilizationRate = assets.length > 0 ? (inUseAssets / assets.length) * 100 : 0

    // Calculate maintenance resolution rate
    const resolutionRate = maintenanceLogs.length > 0 ? (resolvedMaintenance / maintenanceLogs.length) * 100 : 0

    // Calculate booking approval rate
    const approvalRate =
      pendingBookings + approvedBookings + rejectedBookings > 0
        ? (approvedBookings / (pendingBookings + approvedBookings + rejectedBookings)) * 100
        : 0

    // Combine monthly data for trends
    const monthlyTrends = Object.values(monthlyData).sort((a, b) => {
      return new Date(a.month) - new Date(b.month)
    })

    // Calculate KPIs
    const kpis = {
      totalAssets: assets.length,
      totalUsers: users.length,
      totalMaintenanceRequests: maintenanceLogs.length,
      totalBookings: bookings.length,
      utilizationRate: Math.round(utilizationRate),
      resolutionRate: Math.round(resolutionRate),
      approvalRate: Math.round(approvalRate),
      totalAssetValue,
      estimatedMaintenanceCost,
      availableAssets,
      inUseAssets,
      maintenanceAssets,
      pendingMaintenance,
      inProgressMaintenance,
      resolvedMaintenance,
      pendingBookings,
      approvedBookings,
      rejectedBookings,
      activeUsers,
      inactiveUsers,
    }

    // Prepare radar chart data for asset health
    const assetHealthData = [
      { subject: "Utilization", A: utilizationRate, fullMark: 100 },
      { subject: "Maintenance", A: 100 - resolutionRate, fullMark: 100 },
      { subject: "Availability", A: (availableAssets / assets.length) * 100, fullMark: 100 },
      { subject: "Booking Rate", A: approvalRate, fullMark: 100 },
      { subject: "Value Retention", A: 70, fullMark: 100 }, // Placeholder value
    ]

    setAnalyticsData({
      kpis,
      assetsByType: Object.values(assetsByType),
      assetsByStatus: Object.values(assetsByStatus),
      maintenanceByStatus: Object.values(maintenanceByStatus),
      maintenanceByPriority: Object.values(maintenanceByPriority),
      bookingsByStatus: Object.values(bookingsByStatus),
      usersByRole: Object.values(usersByRole),
      usersByDepartment: Object.values(usersByDepartment),
      monthlyTrends,
      assetHealthData,
    })
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h1>
        <div className="flex items-center gap-2">
          <Label htmlFor="time-range" className="text-sm">
            Time Range:
          </Label>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="1year">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <p>Loading analytics data...</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Asset Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(analyticsData.kpis?.totalAssetValue || 0)}</div>
                <p className="text-xs text-muted-foreground">
                  {analyticsData.kpis?.totalAssets || 0} assets in inventory
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Asset Utilization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.kpis?.utilizationRate || 0}%</div>
                <p className="text-xs text-muted-foreground">
                  {analyticsData.kpis?.inUseAssets || 0} assets currently in use
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Maintenance Cost</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(analyticsData.kpis?.estimatedMaintenanceCost || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {analyticsData.kpis?.totalMaintenanceRequests || 0} maintenance requests
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Booking Approval Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.kpis?.approvalRate || 0}%</div>
                <p className="text-xs text-muted-foreground">
                  {analyticsData.kpis?.approvedBookings || 0} of {analyticsData.kpis?.totalBookings || 0} bookings
                  approved
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="assets">Assets</TabsTrigger>
              <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Trends</CardTitle>
                    <CardDescription>Asset, maintenance, and booking activity over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={analyticsData.monthlyTrends}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="assetCount"
                            name="New Assets"
                            stroke="#8884d8"
                            activeDot={{ r: 8 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="maintenanceCount"
                            name="Maintenance Requests"
                            stroke="#ff8042"
                          />
                          <Line type="monotone" dataKey="bookingCount" name="Bookings" stroke="#82ca9d" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Asset Health Overview</CardTitle>
                    <CardDescription>Key performance indicators for asset management</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart outerRadius={90} data={analyticsData.assetHealthData}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="subject" />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} />
                          <Radar name="Asset Health" dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                          <Legend />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Monthly Cost Analysis</CardTitle>
                  <CardDescription>Asset acquisition and maintenance costs over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={analyticsData.monthlyTrends}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`$${value.toFixed(0)}`, "Value"]} />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="assetValue"
                          name="Asset Value"
                          stroke="#8884d8"
                          fill="#8884d8"
                          fillOpacity={0.3}
                        />
                        <Area
                          type="monotone"
                          dataKey="maintenanceCost"
                          name="Maintenance Cost"
                          stroke="#ff8042"
                          fill="#ff8042"
                          fillOpacity={0.3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="assets" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Assets by Type</CardTitle>
                    <CardDescription>Distribution of assets by type</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analyticsData.assetsByType || []}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="count"
                            nameKey="type"
                          >
                            {(analyticsData.assetsByType || []).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`Count: ${value}`, "Assets"]} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Asset Status</CardTitle>
                    <CardDescription>Current status of all assets</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={analyticsData.assetsByStatus}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="status" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`${value}`, "Assets"]} />
                          <Legend />
                          <Bar dataKey="count" name="Number of Assets" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Asset Value by Type</CardTitle>
                  <CardDescription>Total value of assets by type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData.assetsByType} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="type" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`$${value.toFixed(0)}`, "Value"]} />
                        <Legend />
                        <Bar dataKey="value" name="Total Value" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="maintenance" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Maintenance by Status</CardTitle>
                    <CardDescription>Distribution of maintenance requests by status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analyticsData.maintenanceByStatus || []}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="count"
                            nameKey="status"
                          >
                            {(analyticsData.maintenanceByStatus || []).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`Count: ${value}`, "Requests"]} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Maintenance by Priority</CardTitle>
                    <CardDescription>Distribution of maintenance requests by priority</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={analyticsData.maintenanceByPriority}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="priority" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`${value}`, "Requests"]} />
                          <Legend />
                          <Bar dataKey="count" name="Number of Requests" fill="#ff8042" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Maintenance Trends</CardTitle>
                  <CardDescription>Monthly maintenance request trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={analyticsData.monthlyTrends}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`${value}`, "Requests"]} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="maintenanceCount"
                          name="Maintenance Requests"
                          stroke="#ff8042"
                          activeDot={{ r: 8 }}
                        />
                        <Line type="monotone" dataKey="maintenanceCost" name="Estimated Cost ($)" stroke="#8884d8" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bookings" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Bookings by Status</CardTitle>
                    <CardDescription>Distribution of booking requests by status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analyticsData.bookingsByStatus}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="count"
                            nameKey="status"
                          >
                            {analyticsData.bookingsByStatus?.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [`Count: ${value}`, "Bookings"]} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Booking Trends</CardTitle>
                    <CardDescription>Monthly booking request trends</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={analyticsData.monthlyTrends}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`${value}`, "Bookings"]} />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="bookingCount"
                            name="Booking Requests"
                            stroke="#82ca9d"
                            activeDot={{ r: 8 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Booking Approval Analysis</CardTitle>
                  <CardDescription>Approval rates and trends over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: "Pending", value: analyticsData.kpis?.pendingBookings || 0 },
                          { name: "Approved", value: analyticsData.kpis?.approvedBookings || 0 },
                          { name: "Rejected", value: analyticsData.kpis?.rejectedBookings || 0 },
                        ]}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`${value}`, "Bookings"]} />
                        <Legend />
                        <Bar dataKey="value" name="Number of Bookings" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}

