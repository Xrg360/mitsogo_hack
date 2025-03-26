"use client"

import { useState, useEffect } from "react"
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
import { useAuth } from "@/context/auth-context"
import { collection, query, getDocs, doc, updateDoc, getDoc, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

export default function BookingsPage() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [currentBooking, setCurrentBooking] = useState(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [users, setUsers] = useState({})
  const [teams, setTeams] = useState({})

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all bookings
        const bookingsQuery = query(collection(db, "bookings"), orderBy("requestDate", "desc"))
        const bookingsSnapshot = await getDocs(bookingsQuery)
        const bookingsData = bookingsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setBookings(bookingsData)

        // Fetch users for displaying names
        const usersSnapshot = await getDocs(collection(db, "users"))
        const usersData = {}
        usersSnapshot.docs.forEach((doc) => {
          usersData[doc.id] = doc.data()
        })
        setUsers(usersData)

        // Fetch teams for displaying names
        const teamsSnapshot = await getDocs(collection(db, "teams"))
        const teamsData = {}
        teamsSnapshot.docs.forEach((doc) => {
          teamsData[doc.id] = doc.data()
        })
        setTeams(teamsData)
      } catch (error) {
        console.error("Error fetching bookings:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const filteredBookings = bookings.filter((booking) => {
    // Filter by search query
    const matchesSearch =
      booking.assetName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getUserName(booking.requestedBy)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getTeamName(booking.requestedByTeam)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.purpose?.toLowerCase().includes(searchQuery.toLowerCase())

    // Filter by tab
    if (activeTab === "all") return matchesSearch
    return matchesSearch && booking.status.toLowerCase() === activeTab.toLowerCase()
  })

  const handleApproveBooking = async (id) => {
    try {
      const bookingRef = doc(db, "bookings", id)

      // Get the booking details
      const bookingDoc = await getDoc(bookingRef)
      if (!bookingDoc.exists()) {
        throw new Error("Booking not found")
      }

      const bookingData = bookingDoc.data()

      // Update the booking status
      await updateDoc(bookingRef, {
        status: "Approved",
        updatedAt: new Date().toISOString(),
        approvedBy: user.id,
        approvedAt: new Date().toISOString(),
      })

      // Update the asset status if it exists
      if (bookingData.assetId) {
        const assetRef = doc(db, "assets", bookingData.assetId)
        const assetDoc = await getDoc(assetRef)

        if (assetDoc.exists()) {
          // Only update if the asset is available
          if (assetDoc.data().status === "Available") {
            await updateDoc(assetRef, {
              status: "In Use",
              assignedTo: bookingData.requestedBy,
              assignedToTeam: bookingData.requestedByTeam || null,
              assignedDate: new Date().toISOString(),
              dueDate: bookingData.endDate,
            })
          }
        }
      }

      // Update local state
      setBookings(bookings.map((booking) => (booking.id === id ? { ...booking, status: "Approved" } : booking)))
    } catch (error) {
      console.error("Error approving booking:", error)
      alert("Failed to approve booking. Please try again.")
    }
  }

  const openRejectDialog = (booking) => {
    setCurrentBooking(booking)
    setRejectionReason("")
    setIsRejectDialogOpen(true)
  }

  const handleRejectBooking = async () => {
    if (!currentBooking) return

    try {
      await updateDoc(doc(db, "bookings", currentBooking.id), {
        status: "Rejected",
        rejectionReason,
        updatedAt: new Date().toISOString(),
        rejectedBy: user.id,
        rejectedAt: new Date().toISOString(),
      })

      // Update local state
      setBookings(
        bookings.map((booking) =>
          booking.id === currentBooking.id ? { ...booking, status: "Rejected", rejectionReason } : booking,
        ),
      )

      setIsRejectDialogOpen(false)
      setCurrentBooking(null)
      setRejectionReason("")
    } catch (error) {
      console.error("Error rejecting booking:", error)
      alert("Failed to reject booking. Please try again.")
    }
  }

  const getUserName = (userId) => {
    if (!userId) return "Unknown User"
    return users[userId]?.name || "Unknown User"
  }

  const getTeamName = (teamId) => {
    if (!teamId) return null
    return teams[teamId]?.name || "Unknown Team"
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
                  <TableHead>Date Range</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      Loading booking requests...
                    </TableCell>
                  </TableRow>
                ) : filteredBookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
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
                      <TableCell>
                        <div>{getUserName(booking.requestedBy)}</div>
                        {booking.requestedByTeam && (
                          <div className="text-sm text-muted-foreground">
                            Team: {getTeamName(booking.requestedByTeam)}
                          </div>
                        )}
                      </TableCell>
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
                                <DropdownMenuItem onClick={() => openRejectDialog(booking)}>
                                  <XCircle className="mr-2 h-4 w-4 text-red-500" />
                                  Reject
                                </DropdownMenuItem>
                              </>
                            )}
                            {booking.status === "Approved" && (
                              <DropdownMenuItem onClick={() => openRejectDialog(booking)}>
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

      {/* Reject Booking Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {currentBooking?.status === "Approved" ? "Cancel Booking" : "Reject Booking Request"}
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for {currentBooking?.status === "Approved" ? "cancellation" : "rejection"}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {currentBooking && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="text-right font-medium">Asset:</div>
                  <div className="col-span-3">
                    {currentBooking.assetName} ({currentBooking.assetType})
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="text-right font-medium">Requested By:</div>
                  <div className="col-span-3">
                    {getUserName(currentBooking.requestedBy)}
                    {currentBooking.requestedByTeam && ` (Team: ${getTeamName(currentBooking.requestedByTeam)})`}
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="text-right font-medium">Reason:</div>
                  <Textarea
                    className="col-span-3"
                    placeholder="Provide a reason for rejection..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectBooking} disabled={!rejectionReason}>
              {currentBooking?.status === "Approved" ? "Cancel Booking" : "Reject Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

