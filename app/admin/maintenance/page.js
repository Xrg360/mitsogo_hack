"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, MoreHorizontal, CheckCircle, AlertTriangle, PenToolIcon as Tool, Plus, UserPlus } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { collection, query, getDocs, doc, updateDoc, addDoc, orderBy, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import Link from "next/link"

export default function MaintenancePage() {
  const { user } = useAuth()
  const [maintenanceLogs, setMaintenanceLogs] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [currentLog, setCurrentLog] = useState(null)
  const [resolution, setResolution] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [assets, setAssets] = useState([])
  const [users, setUsers] = useState({})
  const [technicians, setTechnicians] = useState([])
  const [selectedTechnician, setSelectedTechnician] = useState("")
  const [newLog, setNewLog] = useState({
    assetId: "",
    assetName: "",
    assetType: "",
    reportedBy: "",
    issue: "",
    priority: "Medium",
    assignedTo: "",
    notes: "",
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch maintenance logs
        const maintenanceQuery = query(collection(db, "maintenance"), orderBy("reportDate", "desc"))
        const maintenanceSnapshot = await getDocs(maintenanceQuery)
        const maintenanceData = maintenanceSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setMaintenanceLogs(maintenanceData)

        // Fetch assets for the add maintenance form
        const assetsQuery = query(collection(db, "assets"))
        const assetsSnapshot = await getDocs(assetsQuery)
        const assetsData = assetsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setAssets(assetsData)

        // Fetch users for displaying names
        const usersSnapshot = await getDocs(collection(db, "users"))
        const usersData = {}
        usersSnapshot.docs.forEach((doc) => {
          usersData[doc.id] = doc.data()
        })
        setUsers(usersData)

        // Fetch technicians (users with isTechnician flag or role = Technician)
        const techniciansQuery = query(collection(db, "users"), where("role", "==", "Technician"))
        const techniciansSnapshot = await getDocs(techniciansQuery)
        const techniciansData = techniciansSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setTechnicians(techniciansData)
      } catch (error) {
        console.error("Error fetching maintenance data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const filteredLogs = maintenanceLogs.filter(
    (log) =>
      log.assetName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.assetType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getUserName(log.reportedBy)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.issue?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.assignedTo && getUserName(log.assignedTo)?.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  const handleAssetChange = (assetId) => {
    const selectedAsset = assets.find((asset) => asset.id === assetId)
    if (selectedAsset) {
      setNewLog({
        ...newLog,
        assetId,
        assetName: selectedAsset.name,
        assetType: selectedAsset.type,
      })
    }
  }

  const handleAddLog = async () => {
    try {
      // Create maintenance record
      const docRef = await addDoc(collection(db, "maintenance"), {
        ...newLog,
        reportDate: new Date().toISOString(),
        status: "Pending",
        createdBy: user.id,
      })

      // If the asset exists, update its status
      if (newLog.assetId) {
        await updateDoc(doc(db, "assets", newLog.assetId), {
          status: "Maintenance",
          condition: "Needs Repair",
        })
      }

      const newLogData = {
        id: docRef.id,
        ...newLog,
        reportDate: new Date().toISOString(),
        status: "Pending",
        createdBy: user.id,
      }

      setMaintenanceLogs([newLogData, ...maintenanceLogs])

      setNewLog({
        assetId: "",
        assetName: "",
        assetType: "",
        reportedBy: "",
        issue: "",
        priority: "Medium",
        assignedTo: "",
        notes: "",
      })

      setIsAddDialogOpen(false)
    } catch (error) {
      console.error("Error adding maintenance log:", error)
      alert("Failed to add maintenance log. Please try again.")
    }
  }

  const handleStartMaintenance = async (id) => {
    try {
      await updateDoc(doc(db, "maintenance", id), {
        status: "In Progress",
        startedAt: new Date().toISOString(),
        startedBy: user.id,
      })

      setMaintenanceLogs(maintenanceLogs.map((log) => (log.id === id ? { ...log, status: "In Progress" } : log)))
    } catch (error) {
      console.error("Error starting maintenance:", error)
      alert("Failed to start maintenance. Please try again.")
    }
  }

  const openResolveDialog = (log) => {
    setCurrentLog(log)
    setResolution("")
    setIsResolveDialogOpen(true)
  }

  const openAssignDialog = (log) => {
    setCurrentLog(log)
    setSelectedTechnician(log.assignedTo || "")
    setIsAssignDialogOpen(true)
  }

  const handleAssignTechnician = async () => {
    if (!currentLog) return

    try {
      await updateDoc(doc(db, "maintenance", currentLog.id), {
        assignedTo: selectedTechnician,
        assignedAt: new Date().toISOString(),
        assignedBy: user.id,
        status: currentLog.status === "Pending" ? "Assigned" : currentLog.status,
      })

      // Update local state
      setMaintenanceLogs(
        maintenanceLogs.map((log) =>
          log.id === currentLog.id
            ? {
                ...log,
                assignedTo: selectedTechnician,
                assignedAt: new Date().toISOString(),
                assignedBy: user.id,
                status: log.status === "Pending" ? "Assigned" : log.status,
              }
            : log,
        ),
      )

      setIsAssignDialogOpen(false)
    } catch (error) {
      console.error("Error assigning technician:", error)
      alert("Failed to assign technician. Please try again.")
    }
  }

  const handleResolveIssue = async () => {
    if (!currentLog || !resolution) return

    try {
      // Update maintenance record
      await updateDoc(doc(db, "maintenance", currentLog.id), {
        status: "Resolved",
        resolution,
        resolvedDate: new Date().toISOString(),
        resolvedBy: user.id,
      })

      // If the asset exists, update its status
      if (currentLog.assetId) {
        await updateDoc(doc(db, "assets", currentLog.assetId), {
          status: "Available",
          condition: "Good",
        })
      }

      // Update local state
      setMaintenanceLogs(
        maintenanceLogs.map((log) =>
          log.id === currentLog.id
            ? {
                ...log,
                status: "Resolved",
                resolution,
                resolvedDate: new Date().toISOString(),
                resolvedBy: user.id,
              }
            : log,
        ),
      )

      setResolution("")
      setIsResolveDialogOpen(false)
    } catch (error) {
      console.error("Error resolving issue:", error)
      alert("Failed to resolve issue. Please try again.")
    }
  }

  const getUserName = (userId) => {
    if (!userId) return "Unknown User"
    return users[userId]?.name || "Unknown User"
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case "Pending":
        return <Badge className="bg-amber-500">Pending</Badge>
      case "Assigned":
        return <Badge className="bg-purple-500">Assigned</Badge>
      case "In Progress":
        return <Badge className="bg-blue-500">In Progress</Badge>
      case "Resolved":
        return <Badge className="bg-green-500">Resolved</Badge>
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

  const getTechnicianSpecializations = (technicianId) => {
    const technician = technicians.find((tech) => tech.id === technicianId)
    if (!technician || !technician.specializations) return []
    return technician.specializations
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Maintenance & Issues</h1>
        <div className="flex gap-2">
          <Link href="/admin/register-technician">
            <Button variant="outline">
              <UserPlus className="mr-2 h-4 w-4" />
              Register Technician
            </Button>
          </Link>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Report Issue
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Report Maintenance Issue</DialogTitle>
                <DialogDescription>Enter the details of the maintenance issue below.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="assetId" className="text-right">
                    Asset
                  </Label>
                  <Select value={newLog.assetId} onValueChange={handleAssetChange}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select an asset" />
                    </SelectTrigger>
                    <SelectContent>
                      {assets.map((asset) => (
                        <SelectItem key={asset.id} value={asset.id}>
                          {asset.name} ({asset.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="reportedBy" className="text-right">
                    Reported By
                  </Label>
                  <Select
                    value={newLog.reportedBy}
                    onValueChange={(value) => setNewLog({ ...newLog, reportedBy: value })}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(users).map(([id, userData]) => (
                        <SelectItem key={id} value={id}>
                          {userData.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="issue" className="text-right">
                    Issue
                  </Label>
                  <Input
                    id="issue"
                    value={newLog.issue}
                    onChange={(e) => setNewLog({ ...newLog, issue: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="priority" className="text-right">
                    Priority
                  </Label>
                  <Select value={newLog.priority} onValueChange={(value) => setNewLog({ ...newLog, priority: value })}>
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
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="assignedTo" className="text-right">
                    Assign To
                  </Label>
                  <Select
                    value={newLog.assignedTo}
                    onValueChange={(value) => setNewLog({ ...newLog, assignedTo: value })}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select technician" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {technicians.map((tech) => (
                        <SelectItem key={tech.id} value={tech.id}>
                          {tech.name} ({tech.specializations?.join(", ") || "No specialization"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="notes" className="text-right">
                    Notes
                  </Label>
                  <Textarea
                    id="notes"
                    value={newLog.notes}
                    onChange={(e) => setNewLog({ ...newLog, notes: e.target.value })}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddLog} disabled={!newLog.assetId || !newLog.issue || !newLog.reportedBy}>
                  Submit
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search maintenance logs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead>Issue</TableHead>
              <TableHead>Reported By</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Loading maintenance logs...
                </TableCell>
              </TableRow>
            ) : filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  No maintenance logs found.
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div className="font-medium">{log.assetName}</div>
                    <div className="text-sm text-muted-foreground">{log.assetType}</div>
                  </TableCell>
                  <TableCell>{log.issue}</TableCell>
                  <TableCell>{getUserName(log.reportedBy)}</TableCell>
                  <TableCell>{getStatusBadge(log.status)}</TableCell>
                  <TableCell>{getPriorityBadge(log.priority)}</TableCell>
                  <TableCell>
                    {log.assignedTo ? (
                      <div>
                        <div>{getUserName(log.assignedTo)}</div>
                        <div className="text-xs text-muted-foreground">
                          {getTechnicianSpecializations(log.assignedTo).join(", ")}
                        </div>
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
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
                              `Notes: ${log.notes || "No notes"}${
                                log.resolution
                                  ? `
Resolution: ${log.resolution}`
                                  : ""
                              }`,
                            )
                          }
                        >
                          <AlertTriangle className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openAssignDialog(log)}>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Assign Technician
                        </DropdownMenuItem>
                        {log.status === "Pending" && (
                          <DropdownMenuItem onClick={() => handleStartMaintenance(log.id)}>
                            <Tool className="mr-2 h-4 w-4" />
                            Start Maintenance
                          </DropdownMenuItem>
                        )}
                        {(log.status === "Pending" || log.status === "In Progress" || log.status === "Assigned") && (
                          <DropdownMenuItem onClick={() => openResolveDialog(log)}>
                            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                            Mark as Resolved
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

      {/* Assign Technician Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Technician</DialogTitle>
            <DialogDescription>Select a technician to assign to this maintenance task.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {currentLog && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right font-medium">Asset:</Label>
                  <div className="col-span-3">{currentLog.assetName}</div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right font-medium">Issue:</Label>
                  <div className="col-span-3">{currentLog.issue}</div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="technician" className="text-right">
                    Technician
                  </Label>
                  <Select value={selectedTechnician} onValueChange={setSelectedTechnician}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a technician" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
                      {technicians.map((tech) => (
                        <SelectItem key={tech.id} value={tech.id}>
                          {tech.name} - {tech.specializations?.join(", ") || "No specialization"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignTechnician}>Assign Technician</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Issue Dialog */}
      <Dialog open={isResolveDialogOpen} onOpenChange={setIsResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Maintenance Issue</DialogTitle>
            <DialogDescription>Enter the resolution details below.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {currentLog && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right font-medium">Asset:</Label>
                  <div className="col-span-3">{currentLog.assetName}</div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right font-medium">Issue:</Label>
                  <div className="col-span-3">{currentLog.issue}</div>
                </div>
              </>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="resolution" className="text-right">
                Resolution
              </Label>
              <Textarea
                id="resolution"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="col-span-3"
                placeholder="Describe how the issue was resolved..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResolveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleResolveIssue} disabled={!resolution}>
              Mark as Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

