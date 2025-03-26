"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/context/auth-context"
import { Calendar, Laptop, Clock, AlertTriangle } from "lucide-react"
import Link from "next/link"

export default function EmployeeDashboard() {
  const { user } = useAuth()

  // Mock data for employee dashboard
  const myAssets = [
    {
      id: "asset-1",
      name: "Dell XPS 15",
      type: "Laptop",
      dueDate: "2023-04-20",
      status: "Active",
    },
    {
      id: "asset-2",
      name: "iPhone 13 Pro",
      type: "Mobile Phone",
      dueDate: "2023-05-15",
      status: "Active",
    },
  ]

  const upcomingBookings = [
    {
      id: "booking-1",
      assetName: "Conference Room A",
      date: "2023-03-17",
      time: "10:00 AM - 11:30 AM",
      status: "Approved",
    },
    {
      id: "booking-2",
      assetName: "Projector P3000",
      date: "2023-03-25",
      time: "2:00 PM - 4:00 PM",
      status: "Pending",
    },
  ]

  const pendingVerifications = [
    {
      id: "verify-1",
      assetName: "Dell XPS 15",
      verificationCode: "XPS-1234",
      dueDate: "2023-03-16",
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight">Employee Dashboard</h1>
      <p className="text-muted-foreground">
        Welcome back, {user?.name || "Employee"}! Here's an overview of your assets and bookings.
      </p>

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
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">No issues reported</p>
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
                        <p>Due: {new Date(asset.dueDate).toLocaleDateString()}</p>
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
                        {booking.date} • {booking.time}
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
                      Verification due by {new Date(verification.dueDate).toLocaleDateString()}
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
    </div>
  )
}

