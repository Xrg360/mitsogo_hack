"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
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
} from "recharts"
import { Download } from "lucide-react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { format, subMonths, isAfter, parseISO } from "date-fns"

export default function ReportsPage() {
  const [reportType, setReportType] = useState("assets")
  const [timeRange, setTimeRange] = useState("all")
  const [assetType, setAssetType] = useState("all")
  const [department, setDepartment] = useState("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [assets, setAssets] = useState([])
  const [users, setUsers] = useState([])
  const [maintenanceLogs, setMaintenanceLogs] = useState([])
  const [bookings, setBookings] = useState([])
  const [assetTypes, setAssetTypes] = useState([])
  const [departments, setDepartments] = useState([])
  const [reportData, setReportData] = useState([])

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

        // Extract unique asset types
        const types = [...new Set(assetsData.map((asset) => asset.type).filter(Boolean))]
        setAssetTypes(types)

        // Fetch users
        const usersSnapshot = await getDocs(collection(db, "users"))
        const usersData = usersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setUsers(usersData)

        // Extract unique departments
        const depts = [...new Set(usersData.map((user) => user.department).filter(Boolean))]
        setDepartments(depts)

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
    generateReport()
  }, [reportType, timeRange, assetType, department, startDate, endDate, assets, users, maintenanceLogs, bookings])

  const generateReport = () => {
    if (isLoading) return

    let filteredData = []
    let processedData = []

    // Apply time range filter
    const applyTimeFilter = (data, dateField) => {
      if (timeRange === "all") return data

      const now = new Date()
      let compareDate

      switch (timeRange) {
        case "30days":
          compareDate = subMonths(now, 1)
          break
        case "90days":
          compareDate = subMonths(now, 3)
          break
        case "6months":
          compareDate = subMonths(now, 6)
          break
        case "1year":
          compareDate = subMonths(now, 12)
          break
        case "custom":
          return data.filter((item) => {
            const itemDate = parseISO(item[dateField])
            return (
              (!startDate || isAfter(itemDate, new Date(startDate))) &&
              (!endDate || isAfter(new Date(endDate), itemDate))
            )
          })
        default:
          return data
      }

      return data.filter((item) => {
        const itemDate = parseISO(item[dateField])
        return isAfter(itemDate, compareDate)
      })
    }

    // Generate different reports based on type
    switch (reportType) {
      case "assets":
        filteredData = assets

        // Apply asset type filter
        if (assetType !== "all") {
          filteredData = filteredData.filter((asset) => asset.type === assetType)
        }

        // Apply time filter based on purchase date
        filteredData = applyTimeFilter(filteredData, "purchaseDate")

        // Calculate depreciation for each asset
        filteredData = filteredData.map((asset) => {
          const purchaseDate = new Date(asset.purchaseDate)
          const ageInYears = (new Date() - purchaseDate) / (365 * 24 * 60 * 60 * 1000)

          // Assume different depreciation rates based on asset type
          let depreciationRate = 0.2 // Default 20% per year (5 year lifespan)

          if (asset.type === "Laptop" || asset.type === "Desktop" || asset.type === "Phone") {
            depreciationRate = 0.25 // 25% per year (4 year lifespan)
          } else if (asset.type === "Furniture") {
            depreciationRate = 0.1 // 10% per year (10 year lifespan)
          } else if (asset.type === "Printer" || asset.type === "Projector") {
            depreciationRate = 0.15 // 15% per year (6-7 year lifespan)
          }

          // Assume purchase price if not available
          const purchasePrice = asset.purchasePrice || 1000

          // Calculate current value using straight-line depreciation
          let currentValue = purchasePrice * Math.max(0, 1 - depreciationRate * ageInYears)

          // Round to 2 decimal places
          currentValue = Math.round(currentValue * 100) / 100

          return {
            ...asset,
            purchasePrice,
            ageInYears: Math.round(ageInYears * 10) / 10,
            depreciationRate: depreciationRate * 100,
            currentValue,
            depreciationAmount: purchasePrice - currentValue,
          }
        })

        // For chart data, group by type
        const assetsByType = {}
        filteredData.forEach((asset) => {
          if (!assetsByType[asset.type]) {
            assetsByType[asset.type] = {
              type: asset.type,
              count: 0,
              totalValue: 0,
              currentValue: 0,
            }
          }
          assetsByType[asset.type].count++
          assetsByType[asset.type].totalValue += asset.purchasePrice || 0
          assetsByType[asset.type].currentValue += asset.currentValue || 0
        })

        processedData = Object.values(assetsByType)
        break

      case "maintenance":
        filteredData = maintenanceLogs

        // Apply asset type filter
        if (assetType !== "all") {
          filteredData = filteredData.filter((log) => log.assetType === assetType)
        }

        // Apply time filter based on report date
        filteredData = applyTimeFilter(filteredData, "reportDate")

        // For chart data, group by status and priority
        const maintenanceByStatus = {}
        const maintenanceByPriority = {}
        const maintenanceByMonth = {}

        filteredData.forEach((log) => {
          // Group by status (with null check)
          if (log.status) {
            if (!maintenanceByStatus[log.status]) {
              maintenanceByStatus[log.status] = {
                status: log.status,
                count: 0,
              }
            }
            maintenanceByStatus[log.status].count++
          }

          // Group by priority (with null check)
          if (log.priority) {
            if (!maintenanceByPriority[log.priority]) {
              maintenanceByPriority[log.priority] = {
                priority: log.priority,
                count: 0,
              }
            }
            maintenanceByPriority[log.priority].count++
          }

          // Group by month (with null check)
          if (log.reportDate) {
            const month = format(parseISO(log.reportDate), "MMM yyyy")
            if (!maintenanceByMonth[month]) {
              maintenanceByMonth[month] = {
                month,
                count: 0,
              }
            }
            maintenanceByMonth[month].count++
          }
        })

        processedData = {
          byStatus: Object.values(maintenanceByStatus),
          byPriority: Object.values(maintenanceByPriority),
          byMonth: Object.values(maintenanceByMonth).sort((a, b) => {
            return new Date(a.month) - new Date(b.month)
          }),
        }
        break

      case "bookings":
        filteredData = bookings

        // Apply time filter based on request date
        filteredData = applyTimeFilter(filteredData, "requestDate")

        // For chart data, group by status and month
        const bookingsByStatus = {}
        const bookingsByMonth = {}
        const bookingsByAssetType = {}

        filteredData.forEach((booking) => {
          // Group by status
          if (!bookingsByStatus[booking.status]) {
            bookingsByStatus[booking.status] = {
              status: booking.status,
              count: 0,
            }
          }
          bookingsByStatus[booking.status].count++

          // Group by month
          const month = format(parseISO(booking.requestDate), "MMM yyyy")
          if (!bookingsByMonth[month]) {
            bookingsByMonth[month] = {
              month,
              count: 0,
            }
          }
          bookingsByMonth[month].count++

          // Group by asset type
          if (booking.assetType && !bookingsByAssetType[booking.assetType]) {
            bookingsByAssetType[booking.assetType] = {
              type: booking.assetType,
              count: 0,
            }
          }
          if (booking.assetType) {
            bookingsByAssetType[booking.assetType].count++
          }
        })

        processedData = {
          byStatus: Object.values(bookingsByStatus),
          byMonth: Object.values(bookingsByMonth).sort((a, b) => {
            return new Date(a.month) - new Date(b.month)
          }),
          byAssetType: Object.values(bookingsByAssetType),
        }
        break

      case "users":
        filteredData = users

        // Apply department filter
        if (department !== "all") {
          filteredData = filteredData.filter((user) => user.department === department)
        }

        // Apply time filter based on joined date
        filteredData = applyTimeFilter(filteredData, "joinedDate")

        // For chart data, group by role and department
        const usersByRole = {}
        const usersByDepartment = {}

        filteredData.forEach((user) => {
          // Group by role
          if (!usersByRole[user.role]) {
            usersByRole[user.role] = {
              role: user.role,
              count: 0,
            }
          }
          usersByRole[user.role].count++

          // Group by department
          if (user.department && !usersByDepartment[user.department]) {
            usersByDepartment[user.department] = {
              department: user.department,
              count: 0,
            }
          }
          if (user.department) {
            usersByDepartment[user.department].count++
          }
        })

        processedData = {
          byRole: Object.values(usersByRole),
          byDepartment: Object.values(usersByDepartment),
        }
        break

      default:
        break
    }

    setReportData({ filteredData, processedData })
  }

  const exportToCSV = () => {
    if (!reportData || !reportData.filteredData) return

    const { filteredData } = reportData
    let csvContent = ""

    // Create headers based on report type
    switch (reportType) {
      case "assets":
        csvContent =
          "Name,Type,Model,Serial Number,Purchase Date,Purchase Price,Age (Years),Depreciation Rate,Current Value,Depreciation Amount,Status,Condition\n"
        filteredData.forEach((asset) => {
          csvContent += `"${asset.name}","${asset.type || ""}","${asset.model || ""}","${asset.serialNumber || ""}","${asset.purchaseDate || ""}","${asset.purchasePrice || ""}","${asset.ageInYears || ""}","${asset.depreciationRate || ""}%","${asset.currentValue || ""}","${asset.depreciationAmount || ""}","${asset.status || ""}","${asset.condition || ""}"\n`
        })
        break

      case "maintenance":
        csvContent = "Asset Name,Asset Type,Issue,Status,Priority,Reported Date,Reported By,Assigned To,Resolution\n"
        filteredData.forEach((log) => {
          csvContent += `"${log.assetName || ""}","${log.assetType || ""}","${log.issue || ""}","${log.status || ""}","${log.priority || ""}","${log.reportDate || ""}","${log.reportedBy || ""}","${log.assignedTo || ""}","${log.resolution || ""}"\n`
        })
        break

      case "bookings":
        csvContent = "Asset Name,Asset Type,Requested By,Status,Start Date,End Date,Purpose,Priority\n"
        filteredData.forEach((booking) => {
          csvContent += `"${booking.assetName || ""}","${booking.assetType || ""}","${booking.requestedBy || ""}","${booking.status || ""}","${booking.startDate || ""}","${booking.endDate || ""}","${booking.purpose || ""}","${booking.priority || ""}"\n`
        })
        break

      case "users":
        csvContent = "Name,Email,Role,Department,Status,Joined Date\n"
        filteredData.forEach((user) => {
          csvContent += `"${user.name || ""}","${user.email || ""}","${user.role || ""}","${user.department || ""}","${user.status || ""}","${user.joinedDate || ""}"\n`
        })
        break

      default:
        break
    }

    // Create and download the CSV file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `${reportType}_report_${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const renderAssetReport = () => {
    if (!reportData || !reportData.filteredData) return null

    const { filteredData, processedData } = reportData

    return (
      <div className="space-y-6">
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
                      data={processedData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="type"
                    >
                      {processedData.map((entry, index) => (
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
              <CardTitle>Asset Value by Type</CardTitle>
              <CardDescription>Current value vs. original purchase price</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, "Value"]} />
                    <Legend />
                    <Bar dataKey="totalValue" name="Original Value" fill="#8884d8" />
                    <Bar dataKey="currentValue" name="Current Value" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Asset Depreciation Report</CardTitle>
            <CardDescription>Detailed asset information with depreciation calculations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Type/Model</TableHead>
                    <TableHead>Purchase Date</TableHead>
                    <TableHead>Purchase Price</TableHead>
                    <TableHead>Age (Years)</TableHead>
                    <TableHead>Depreciation Rate</TableHead>
                    <TableHead>Current Value</TableHead>
                    <TableHead>Depreciation</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center">
                        No assets found matching the criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell className="font-medium">{asset.name}</TableCell>
                        <TableCell>
                          {asset.type}
                          {asset.model && <div className="text-sm text-muted-foreground">{asset.model}</div>}
                        </TableCell>
                        <TableCell>
                          {asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : "N/A"}
                        </TableCell>
                        <TableCell>${asset.purchasePrice?.toFixed(2) || "N/A"}</TableCell>
                        <TableCell>{asset.ageInYears?.toFixed(1) || "N/A"}</TableCell>
                        <TableCell>{asset.depreciationRate?.toFixed(0)}%</TableCell>
                        <TableCell className="font-medium">${asset.currentValue?.toFixed(2) || "N/A"}</TableCell>
                        <TableCell>${asset.depreciationAmount?.toFixed(2) || "N/A"}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              asset.status === "Available"
                                ? "bg-green-500"
                                : asset.status === "In Use"
                                  ? "bg-blue-500"
                                  : "bg-amber-500"
                            }
                          >
                            {asset.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderMaintenanceReport = () => {
    if (!reportData || !reportData.processedData) return null

    const { filteredData, processedData } = reportData

    return (
      <div className="space-y-6">
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
                      data={processedData.byStatus || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="status"
                    >
                      {(processedData.byStatus || []).map((entry, index) => (
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
                  <BarChart data={processedData.byPriority || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="priority" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value}`, "Requests"]} />
                    <Legend />
                    <Bar dataKey="count" name="Number of Requests" fill="#8884d8" />
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
                <LineChart data={processedData.byMonth || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value}`, "Requests"]} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Maintenance Requests"
                    stroke="#8884d8"
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Maintenance Details</CardTitle>
            <CardDescription>Detailed maintenance request information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Issue</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Reported Date</TableHead>
                    <TableHead>Reported By</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Resolution</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center">
                        No maintenance requests found matching the criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">
                          {log.assetName}
                          {log.assetType && <div className="text-sm text-muted-foreground">{log.assetType}</div>}
                        </TableCell>
                        <TableCell>{log.issue}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              log.status === "Resolved"
                                ? "bg-green-500"
                                : log.status === "In Progress"
                                  ? "bg-blue-500"
                                  : log.status === "Assigned"
                                    ? "bg-purple-500"
                                    : "bg-amber-500"
                            }
                          >
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              log.priority === "High"
                                ? "border-red-500 text-red-500"
                                : log.priority === "Medium"
                                  ? "border-amber-500 text-amber-500"
                                  : "border-green-500 text-green-500"
                            }
                          >
                            {log.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>{log.reportDate ? new Date(log.reportDate).toLocaleDateString() : "N/A"}</TableCell>
                        <TableCell>{log.reportedByName || "Unknown"}</TableCell>
                        <TableCell>
                          {log.assignedTo
                            ? users.find((u) => u.id === log.assignedTo)?.name || "Unknown"
                            : "Unassigned"}
                        </TableCell>
                        <TableCell>{log.resolution || "N/A"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderBookingsReport = () => {
    if (!reportData || !reportData.processedData) return null

    const { filteredData, processedData } = reportData

    return (
      <div className="space-y-6">
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
                      data={processedData.byStatus || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="status"
                    >
                      {(processedData.byStatus || []).map((entry, index) => (
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
              <CardTitle>Bookings by Asset Type</CardTitle>
              <CardDescription>Distribution of bookings by asset type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={processedData.byAssetType || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value}`, "Bookings"]} />
                    <Legend />
                    <Bar dataKey="count" name="Number of Bookings" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Booking Trends</CardTitle>
            <CardDescription>Monthly booking request trends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={processedData.byMonth || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value}`, "Bookings"]} />
                  <Legend />
                  <Line type="monotone" dataKey="count" name="Booking Requests" stroke="#8884d8" activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Booking Details</CardTitle>
            <CardDescription>Detailed booking request information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Requested By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date Range</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Priority</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        No bookings found matching the criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">
                          {booking.assetName}
                          {booking.assetType && (
                            <div className="text-sm text-muted-foreground">{booking.assetType}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          {booking.requestedByName ||
                            users.find((u) => u.id === booking.requestedBy)?.name ||
                            "Unknown"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              booking.status === "Approved"
                                ? "bg-green-500"
                                : booking.status === "Pending"
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                            }
                          >
                            {booking.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {booking.startDate ? new Date(booking.startDate).toLocaleDateString() : "N/A"}
                          {booking.endDate &&
                            booking.startDate !== booking.endDate &&
                            ` - ${new Date(booking.endDate).toLocaleDateString()}`}
                        </TableCell>
                        <TableCell>{booking.purpose || "N/A"}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              booking.priority === "High"
                                ? "border-red-500 text-red-500"
                                : booking.priority === "Medium"
                                  ? "border-amber-500 text-amber-500"
                                  : "border-green-500 text-green-500"
                            }
                          >
                            {booking.priority}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderUsersReport = () => {
    if (!reportData || !reportData.processedData) return null

    const { filteredData, processedData } = reportData

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Users by Role</CardTitle>
              <CardDescription>Distribution of users by role</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={processedData.byRole || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="role"
                    >
                      {(processedData.byRole || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`Count: ${value}`, "Users"]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Users by Department</CardTitle>
              <CardDescription>Distribution of users by department</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={processedData.byDepartment || []}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="department" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value}`, "Users"]} />
                    <Legend />
                    <Bar dataKey="count" name="Number of Users" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>User Details</CardTitle>
            <CardDescription>Detailed user information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        No users found matching the criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.role}</TableCell>
                        <TableCell>{user.department || "N/A"}</TableCell>
                        <TableCell>
                          <Badge className={user.status === "Active" ? "bg-green-500" : "bg-secondary"}>
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.joinedDate ? new Date(user.joinedDate).toLocaleDateString() : "N/A"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Reports & Analytics</h1>
        <Button onClick={exportToCSV} disabled={!reportData || !reportData.filteredData}>
          <Download className="mr-2 h-4 w-4" />
          Export to CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
          <CardDescription>Select the type of report and filters to apply</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="report-type">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assets">Asset Report</SelectItem>
                  <SelectItem value="maintenance">Maintenance Report</SelectItem>
                  <SelectItem value="bookings">Booking Report</SelectItem>
                  <SelectItem value="users">User Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time-range">Time Range</Label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="90days">Last 90 Days</SelectItem>
                  <SelectItem value="6months">Last 6 Months</SelectItem>
                  <SelectItem value="1year">Last Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {timeRange === "custom" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-date">End Date</Label>
                  <Input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </>
            )}

            {(reportType === "assets" || reportType === "maintenance") && (
              <div className="space-y-2">
                <Label htmlFor="asset-type">Asset Type</Label>
                <Select value={assetType} onValueChange={setAssetType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select asset type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {assetTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {reportType === "users" && (
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <p>Loading report data...</p>
        </div>
      ) : (
        <>
          {reportType === "assets" && renderAssetReport()}
          {reportType === "maintenance" && renderMaintenanceReport()}
          {reportType === "bookings" && renderBookingsReport()}
          {reportType === "users" && renderUsersReport()}
        </>
      )}
    </div>
  )
}

