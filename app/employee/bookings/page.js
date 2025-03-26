"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon, Plus, Search, XCircle, Users, Filter, UserPlus } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"

export default function BookingsPage() {
  const { user } = useAuth()
  const [myBookings, setMyBookings] = useState([])
  const [availableAssets, setAvailableAssets] = useState([])
  const [teams, setTeams] = useState([])
  const [userTeams, setUserTeams] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isBookDialogOpen, setIsBookDialogOpen] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState(null)
  const [startDate, setStartDate] = useState(null)
  const [endDate, setEndDate] = useState(null)
  const [purpose, setPurpose] = useState("")
  const [priority, setPriority] = useState("Medium")
  const [bookingType, setBookingType] = useState("personal")
  const [selectedTeam, setSelectedTeam] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    types: [],
    models: [],
    statuses: [],
  })
  const [availableFilters, setAvailableFilters] = useState({
    types: [],
    models: [],
    statuses: ["Available", "In Use", "Maintenance"],
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch available assets
        const assetsQuery = query(collection(db, "assets"))
        const assetsSnapshot = await getDocs(assetsQuery)
        const assetsData = assetsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        // Filter for available assets
        const availableAssetsData = assetsData.filter((asset) => asset.status === "Available")
        setAvailableAssets(availableAssetsData)

        // Extract unique values for filters
        const types = [...new Set(availableAssetsData.map((asset) => asset.type).filter(Boolean))]
        const models = [...new Set(availableAssetsData.map((asset) => asset.model).filter(Boolean))]

        setAvailableFilters((prev) => ({
          ...prev,
          types,
          models,
        }))

        // Fetch user's bookings
        const userBookingsQuery = query(
          collection(db, "bookings"),
          where("requestedBy", "==", user.id),
          orderBy("requestDate", "desc"),
        )
        const userBookingsSnapshot = await getDocs(userBookingsQuery)
        const userBookingsData = userBookingsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        // Fetch teams the user belongs to
        const teamsQuery = query(collection(db, "teams"))
        const teamsSnapshot = await getDocs(teamsQuery)
        const teamsData = teamsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setTeams(teamsData)

        const userTeamsData = teamsData.filter((team) => team.members && team.members.includes(user.id))
        setUserTeams(userTeamsData)

        // Fetch team bookings for teams the user belongs to
        let teamBookings = []
        for (const team of userTeamsData) {
          const teamBookingsQuery = query(collection(db, "bookings"), where("requestedByTeam", "==", team.id))
          const teamBookingsSnapshot = await getDocs(teamBookingsQuery)
          const teamBookingsData = teamBookingsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            teamName: team.name,
          }))
          teamBookings = [...teamBookings, ...teamBookingsData]
        }

        // Combine user and team bookings
        setMyBookings([...userBookingsData, ...teamBookings])
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      fetchData()
    }
  }, [user])

  const toggleFilter = (category, value) => {
    setFilters((prev) => {
      const updated = { ...prev }
      if (updated[category].includes(value)) {
        updated[category] = updated[category].filter((item) => item !== value)
      } else {
        updated[category] = [...updated[category], value]
      }
      return updated
    })
  }

  const filteredAssets = availableAssets.filter((asset) => {
    // Search query filter
    const matchesSearch =
      asset.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.location?.toLowerCase().includes(searchQuery.toLowerCase())

    if (!matchesSearch) return false

    // Apply category filters
    if (filters.types.length > 0 && !filters.types.includes(asset.type)) return false
    if (filters.models.length > 0 && !filters.models.includes(asset.model)) return false
    if (filters.statuses.length > 0 && !filters.statuses.includes(asset.status)) return false

    return true
  })

  const handleBookAsset = async () => {
    if (!selectedAsset || !startDate || !endDate || !purpose) {
      alert("Please fill in all required fields")
      return
    }

    try {
      const bookingData = {
        assetId: selectedAsset.id,
        assetName: selectedAsset.name,
        assetType: selectedAsset.type,
        assetModel: selectedAsset.model,
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd"),
        purpose,
        priority,
        status: "Pending",
        requestDate: new Date().toISOString(),
      }

      if (bookingType === "personal") {
        bookingData.requestedBy = user.id
        bookingData.requestedByName = user.name
        bookingData.requestedByDepartment = user.department
      } else if (bookingType === "team" && selectedTeam) {
        const team = teams.find((t) => t.id === selectedTeam)
        bookingData.requestedByTeam = selectedTeam
        bookingData.requestedByTeamName = team?.name
        bookingData.requestedBy = user.id // Still track who made the request
      }

      const docRef = await addDoc(collection(db, "bookings"), bookingData)
      const newBooking = {
        id: docRef.id,
        ...bookingData,
      }

      setMyBookings([newBooking, ...myBookings])

      setSelectedAsset(null)
      setStartDate(null)
      setEndDate(null)
      setPurpose("")
      setPriority("Medium")
      setBookingType("personal")
      setSelectedTeam("")
      setIsBookDialogOpen(false)
    } catch (error) {
      console.error("Error booking asset:", error)
      alert("Failed to book asset. Please try again.")
    }
  }

  const handleCancelBooking = async (id) => {
    try {
      await deleteDoc(doc(db, "bookings", id))
      setMyBookings(myBookings.filter((booking) => booking.id !== id))
    } catch (error) {
      console.error("Error canceling booking:", error)
      alert("Failed to cancel booking. Please try again.")
    }
  }

  const openBookDialog = (asset) => {
    setSelectedAsset(asset)
    setStartDate(null)
    setEndDate(null)
    setPurpose("")
    setPriority("Medium")
    setBookingType("personal")
    setSelectedTeam("")
    setIsBookDialogOpen(true)
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

  const getTeamName = (teamId) => {
    const team = teams.find((team) => team.id === teamId)
    return team ? team.name : "Unknown Team"
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Book Assets</h1>
        <p className="text-muted-foreground">Browse and book available assets for your use</p>
      </div>

      <div className="flex justify-end">
        <Link href="/admin/register-team">
          <Button variant="outline">
            <UserPlus className="mr-2 h-4 w-4" />
            Register Team
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Bookings</CardTitle>
          <CardDescription>View your current and upcoming asset bookings</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading your bookings...</div>
          ) : myBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">You don't have any bookings yet.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Date Range</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Booked For</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myBookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell>
                        <div className="font-medium">{booking.assetName}</div>
                        <div className="text-sm text-muted-foreground">
                          {booking.assetType} {booking.assetModel ? `- ${booking.assetModel}` : ""}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>{new Date(booking.startDate).toLocaleDateString()}</div>
                        {booking.startDate !== booking.endDate && (
                          <div className="text-sm text-muted-foreground">
                            to {new Date(booking.endDate).toLocaleDateString()}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{booking.purpose}</TableCell>
                      <TableCell>
                        {booking.requestedByTeam ? (
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {booking.teamName || getTeamName(booking.requestedByTeam)}
                          </div>
                        ) : (
                          "Personal"
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(booking.status)}</TableCell>
                      <TableCell className="text-right">
                        {booking.status === "Pending" && (
                          <Button variant="ghost" size="icon" onClick={() => handleCancelBooking(booking.id)}>
                            <XCircle className="h-4 w-4 text-red-500" />
                            <span className="sr-only">Cancel booking</span>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available Assets</CardTitle>
          <CardDescription>Browse and book assets for your use</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex-1 flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-sm"
                />
              </div>

              <Popover open={showFilters} onOpenChange={setShowFilters}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filters
                    {Object.values(filters).flat().length > 0 && (
                      <Badge className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                        {Object.values(filters).flat().length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 max-h-[70vh] overflow-y-auto">
                  <div className="space-y-4">
                    <h4 className="font-medium">Filter Assets</h4>

                    {/* Type filter */}
                    {availableFilters.types.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium">Asset Type</h5>
                        <div className="grid grid-cols-2 gap-2">
                          {availableFilters.types.map((type) => (
                            <div key={type} className="flex items-center space-x-2">
                              <Checkbox
                                id={`type-${type}`}
                                checked={filters.types.includes(type)}
                                onCheckedChange={() => toggleFilter("types", type)}
                              />
                              <label htmlFor={`type-${type}`} className="text-sm">
                                {type}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Model filter */}
                    {availableFilters.models.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium">Model</h5>
                        <div className="grid grid-cols-2 gap-2">
                          {availableFilters.models.map((model) => (
                            <div key={model} className="flex items-center space-x-2">
                              <Checkbox
                                id={`model-${model}`}
                                checked={filters.models.includes(model)}
                                onCheckedChange={() => toggleFilter("models", model)}
                              />
                              <label htmlFor={`model-${model}`} className="text-sm">
                                {model}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {Object.values(filters).flat().length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setFilters({
                            types: [],
                            models: [],
                            statuses: [],
                          })
                        }
                        className="w-full"
                      >
                        Clear All Filters
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {Object.values(filters).flat().length > 0 && (
              <div className="flex flex-wrap gap-2">
                {filters.types.map((type) => (
                  <Badge key={`badge-type-${type}`} variant="outline" className="flex items-center gap-1">
                    Type: {type}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleFilter("types", type)}
                      className="h-4 w-4 p-0 ml-1"
                    >
                      ×
                    </Button>
                  </Badge>
                ))}

                {filters.models.map((model) => (
                  <Badge key={`badge-model-${model}`} variant="outline" className="flex items-center gap-1">
                    Model: {model}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleFilter("models", model)}
                      className="h-4 w-4 p-0 ml-1"
                    >
                      ×
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-md border mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Type/Model</TableHead>
                  <TableHead>Specifications</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      Loading assets...
                    </TableCell>
                  </TableRow>
                ) : filteredAssets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      No assets found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssets.map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell className="font-medium">{asset.name}</TableCell>
                      <TableCell>
                        <div>{asset.type}</div>
                        {asset.model && <div className="text-sm text-muted-foreground">{asset.model}</div>}
                      </TableCell>
                      <TableCell>
                        {asset.specifications && Object.keys(asset.specifications).length > 0 ? (
                          <div className="text-xs">
                            {Object.entries(asset.specifications).map(([key, value]) => (
                              <div key={key}>
                                <span className="font-medium">{key}:</span> {value}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No specifications</span>
                        )}
                      </TableCell>
                      <TableCell>{asset.location}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => openBookDialog(asset)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Book
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Book Asset Dialog */}
      <Dialog open={isBookDialogOpen} onOpenChange={setIsBookDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Book Asset</DialogTitle>
            <DialogDescription>Enter the details for your booking request.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {selectedAsset && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Asset:</Label>
                <div className="col-span-3">
                  <div>{selectedAsset.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedAsset.type} {selectedAsset.model ? `- ${selectedAsset.model}` : ""}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="booking-type" className="text-right">
                Booking For
              </Label>
              <Select value={bookingType} onValueChange={setBookingType}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select booking type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal Use</SelectItem>
                  <SelectItem value="team">Team Use</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {bookingType === "team" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="select-team" className="text-right">
                  Select Team
                </Label>
                <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a team" />
                  </SelectTrigger>
                  <SelectContent>
                    {userTeams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="start-date" className="text-right">
                Start Date
              </Label>
              <div className="col-span-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-left font-normal ${!startDate && "text-muted-foreground"}`}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="end-date" className="text-right">
                End Date
              </Label>
              <div className="col-span-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-left font-normal ${!endDate && "text-muted-foreground"}`}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      disabled={(date) => date < (startDate || new Date())}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="purpose" className="text-right">
                Purpose
              </Label>
              <Textarea
                id="purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="col-span-3"
                placeholder="Describe why you need this asset..."
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="priority" className="text-right">
                Priority
              </Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBookDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleBookAsset}
              disabled={
                !selectedAsset || !startDate || !endDate || !purpose || (bookingType === "team" && !selectedTeam)
              }
            >
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

