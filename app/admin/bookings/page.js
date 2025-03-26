"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, MoreHorizontal, CheckCircle, XCircle, AlertCircle } from "lucide-react"

// Mock data for bookings
const initialBookings = [
  {
    id: "booking-1",
    assetName: "Dell XPS 15",
    assetType: "Laptop",
    requestedBy: "Sarah Johnson",
    department: "Marketing",
    requestDate: "2023-03-15",
    startDate: "2023-03-20",
    endDate: "2023-04-20",
    status: "Pending",
    priority: "High",
    purpose: "Marketing campaign project",
  },
  {
    id: "booking-2",
    assetName: "Conference Room A",
    assetType: "Room",
    requestedBy: "Michael Chen",
    department: "Finance",
    requestDate: "2023-03-14",
    startDate: "2023-03-16",
    endDate: "2023-03-16",
    status: "Approved",
    priority: "Medium",
    purpose: "Quarterly budget meeting",
  },
  {
    id: "booking-3",
    assetName: "Projector P3000",
    assetType: "Projector",
    requestedBy: "Emily Rodriguez",
    department: "HR",
    requestDate: "2023-03-10",
    startDate: "2023-03-25",
    endDate: "2023-03-25",
    status: "Rejected",
    priority: "Low",
    purpose: "Training session",
    rejectionReason: "Asset under maintenance",
  },
  {
    id: "booking-4",
    assetName: "iPad Pro 12.9",
    assetType: "Tablet",
    requestedBy: "David Kim",
    department: "Sales",
    requestDate: "2023-03-12",
    startDate: "2023-03-18",
    endDate: "2023-04-18",
    status: "Approved",
    priority: "High",
    purpose: "Client presentations",
  },
  {
    id: "booking-5",
    assetName: "Conference Room B",
    assetType: "Room",
    requestedBy: "Sarah Johnson",
    department: "Marketing",
    requestDate: "2023-03-13",
    startDate: "2023-03-17",
    endDate: "2023-03-17",
    status: "Pending",
    priority: "Medium",
    purpose: "Team brainstorming session",
  },
]

export default function BookingsPage() {
  const [bookings, setBookings] = useState(initialBookings)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")

  const filteredBookings = bookings.filter((booking) => {
    // Filter by search query
    const matchesSearch =
      booking.assetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.requestedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.purpose.toLowerCase().includes(searchQuery.toLowerCase())

    // Filter by tab
    if (activeTab === "all") return matchesSearch
    return matchesSearch && booking.status.toLowerCase() === activeTab.toLowerCase()
  })

  const handleApproveBooking = (id) => {
    setBookings(bookings.map((booking) => (booking.id === id ? { ...booking, status: "Approved" } : booking)))
  }

  const handleRejectBooking = (id) => {
    setBookings(
      bookings.map((booking) =>
        booking.id === id ? { ...booking, status: "Rejected", rejectionReason: "Request denied by admin" } : booking,
      ),
    )
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case "Approved":
        return <Badge className="bg-green-500">Approved</Badge>
      case "Pending":
        return <Badge className="bg-amber-500">Pending</Badge>
      case "Rejected":
        return <Badge className="bg-red-500">Rejected</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case "High":
        return (
          <Badge variant="outline" className="border-red-500 text-red-500">
            High
          </Badge>
        )
      case "Medium":
        return (
          <Badge variant="outline" className="border-amber-500 text-amber-500">
            Medium
          </Badge>
        )
      case "Low":
        return (
          <Badge variant="outline" className="border-green-500 text-green-500">
            Low
          </Badge>
        )
      default:
        return <Badge variant="outline">{priority}</Badge>
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Booking Requests</h1>
      </div>
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search bookings..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>
      <Tabs defaultValue="all" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Requests</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="mt-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Date Range</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      No booking requests found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell>
                        <div className="font-medium">{booking.assetName}</div>
                        <div className="text-sm text-muted-foreground">{booking.assetType}</div>
                      </TableCell>
                      <TableCell>{booking.requestedBy}</TableCell>
                      <TableCell>{booking.department}</TableCell>
                      <TableCell>
                        <div>{new Date(booking.startDate).toLocaleDateString()}</div>
                        <div className="text-sm text-muted-foreground">
                          to {new Date(booking.endDate).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(booking.status)}</TableCell>
                      <TableCell>{getPriorityBadge(booking.priority)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() =>
                                alert(
                                  `Purpose: ${booking.purpose}${booking.rejectionReason ? `\nRejection Reason: ${booking.rejectionReason}` : ""}`,
                                )
                              }
                            >
                              <AlertCircle className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {booking.status === "Pending" && (
                              <>
                                <DropdownMenuItem onClick={() => handleApproveBooking(booking.id)}>
                                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                  Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleRejectBooking(booking.id)}>
                                  <XCircle className="mr-2 h-4 w-4 text-red-500" />
                                  Reject
                                </DropdownMenuItem>
                              </>
                            )}
                            {booking.status === "Approved" && (
                              <DropdownMenuItem onClick={() => handleRejectBooking(booking.id)}>
                                <XCircle className="mr-2 h-4 w-4 text-red-500" />
                                Cancel Approval
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

