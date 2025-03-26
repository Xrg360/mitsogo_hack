"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/context/auth-context"
import { Calendar, Laptop, Clock, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function EmployeeDashboard() {
  const { user } = useAuth()
  const [myAssets, setMyAssets] = useState([])
  const [upcomingBookings, setUpcomingBookings] = useState([])
  const [pendingVerifications, setPendingVerifications] = useState([])
  const [reportedIssues, setReportedIssues] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return

      try {
        // Fetch assets assigned to the user
        const assetsQuery = query(
          collection(db, "assets"),
          where("assignedTo", "==", user.id),
          where("status", "==", "In Use"),
        )
        const assetsSnapshot = await getDocs(assetsQuery)
        const assetsData = assetsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setMyAssets(assetsData)

        // Fetch user's bookings
        const bookingsQuery = query(
          collection(db, "bookings"),
          where("requestedBy", "==", user.id),
          orderBy("startDate", "asc"),
          limit(5),
        )
        const bookingsSnapshot = await getDocs(bookingsQuery)
        const bookingsData = bookingsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setUpcomingBookings(bookingsData)

        // Fetch pending verifications
        const verificationsQuery = query(
          collection(db, "verifications"),
          where("userId", "==", user.id),
          where("status", "==", "Pending"),
        )
        const verificationsSnapshot = await getDocs(verificationsQuery)
        const verificationsData = verificationsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setPendingVerifications(verificationsData)

        // Fetch reported issues
        const maintenanceQuery = query(collection(db, "maintenance"), where("reportedBy", "==", user.id))
        const maintenanceSnapshot = await getDocs(maintenanceQuery)
        const maintenanceData = maintenanceSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setReportedIssues(maintenanceData)
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [user])

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">Employee Dashboard</h1>
      <p className="text-muted-foreground">
        Welcome back, {user?.name || "Employee"}! Here's an overview of your assets and bookings.
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <p>Loading your dashboard data...</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">My Assets</CardTitle>
                <Laptop className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{myAssets.length}</div>
                <p className="text-xs text-muted-foreground">Assets currently assigned to you</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Upcoming Bookings</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{upcomingBookings.length}</div>
                <p className="text-xs text-muted-foreground">Scheduled for the next 30 days</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Verifications</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingVerifications.length}</div>
                <p className="text-xs text-muted-foreground">Assets requiring verification</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Reported Issues</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportedIssues.length}</div>
                <p className="text-xs text-muted-foreground">
                  {reportedIssues.length === 0 ? "No issues reported" : "Issues you've reported"}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>My Assets</CardTitle>
                <CardDescription>Assets currently assigned to you</CardDescription>
              </CardHeader>
              <CardContent>
                {myAssets.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No assets currently assigned.</p>
                ) : (
                  <div className="space-y-4">
                    {myAssets.map((asset) => (
                      <div key={asset.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{asset.name}</p>
                          <p className="text-sm text-muted-foreground">{asset.type}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-right">
                            <p>Due: {asset.dueDate ? new Date(asset.dueDate).toLocaleDateString() : "N/A"}</p>
                          </div>
                          <Badge className="bg-green-500">{asset.status}</Badge>
                        </div>
                      </div>
                    ))}
                    <div className="pt-2">
                      <Link href="/employee/my-assets">
                        <Button variant="outline" size="sm" className="w-full">
                          View All Assets
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upcoming Bookings</CardTitle>
                <CardDescription>Your scheduled asset bookings</CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingBookings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No upcoming bookings.</p>
                ) : (
                  <div className="space-y-4">
                    {upcomingBookings.map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{booking.assetName}</p>
                          <p className="text-sm text-muted-foreground">
                            {booking.startDate ? new Date(booking.startDate).toLocaleDateString() : "N/A"}
                            {booking.startDate !== booking.endDate &&
                              booking.endDate &&
                              ` - ${new Date(booking.endDate).toLocaleDateString()}`}
                          </p>
                        </div>
                        <Badge className={booking.status === "Approved" ? "bg-green-500" : "bg-amber-500"}>
                          {booking.status}
                        </Badge>
                      </div>
                    ))}
                    <div className="pt-2">
                      <Link href="/employee/bookings">
                        <Button variant="outline" size="sm" className="w-full">
                          Book an Asset
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {pendingVerifications.length > 0 && (
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-600" />
                  Pending Verification
                </CardTitle>
                <CardDescription>Please verify that you still have these assets</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingVerifications.map((verification) => (
                    <div
                      key={verification.id}
                      className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium">{verification.assetName}</p>
                        <p className="text-sm text-muted-foreground">
                          Verification due by{" "}
                          {verification.dueDate ? new Date(verification.dueDate).toLocaleDateString() : "N/A"}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 sm:items-end">
                        <div className="text-sm font-medium">Code: {verification.verificationCode}</div>
                        <Button size="sm">Verify Possession</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

