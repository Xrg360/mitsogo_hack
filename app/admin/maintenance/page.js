"use client"

import { Label } from "@/components/ui/label"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Search, MoreHorizontal, CheckCircle, AlertTriangle, PenToolIcon as Tool, Plus } from "lucide-react"

// Mock data for maintenance logs
const initialMaintenanceLogs = [
  {
    id: "maint-1",
    assetName: "HP Projector P3000",
    assetType: "Projector",
    reportedBy: "Sarah Johnson",
    reportDate: "2023-03-10",
    status: "Pending",
    issue: "No display output",
    priority: "High",
    assignedTo: "IT Support",
    notes: "Device powers on but no display output. Checked cables and power source.",
  },
  {
    id: "maint-2",
    assetName: "Dell XPS 15",
    assetType: "Laptop",
    reportedBy: "Michael Chen",
    reportDate: "2023-03-08",
    status: "In Progress",
    issue: "Battery not charging",
    priority: "Medium",
    assignedTo: "John Smith",
    notes: "Battery indicator shows plugged in but not charging. Tried different power adapters.",
  },
  {
    id: "maint-3",
    assetName: "Conference Room A A/C",
    assetType: "HVAC",
    reportedBy: "Emily Rodriguez",
    reportDate: "2023-03-05",
    status: "Resolved",
    issue: "Air conditioning not working",
    priority: "High",
    assignedTo: "Facilities Team",
    resolution: "Replaced faulty thermostat and reset system",
    resolvedDate: "2023-03-07",
    notes: "Room temperature reaching uncomfortable levels during meetings.",
  },
  {
    id: "maint-4",
    assetName: "iPad Pro 12.9",
    assetType: "Tablet",
    reportedBy: "David Kim",
    reportDate: "2023-03-12",
    status: "Pending",
    issue: "Cracked screen",
    priority: "Low",
    assignedTo: null,
    notes: "Device still functional but screen has a crack in the bottom right corner.",
  },
]

export default function MaintenancePage() {
  const [maintenanceLogs, setMaintenanceLogs] = useState(initialMaintenanceLogs)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false)
  const [currentLog, setCurrentLog] = useState(null)
  const [newLog, setNewLog] = useState({
    assetName: "",
    assetType: "",
    reportedBy: "",
    issue: "",
    priority: "Medium",
    assignedTo: "",
    notes: "",
  })
  const [resolution, setResolution] = useState("")

  const filteredLogs = maintenanceLogs.filter(
    (log) =>
      log.assetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.assetType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.reportedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.issue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.assignedTo && log.assignedTo.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  const handleAddLog = () => {
    const id = `maint-${Date.now()}`
    const reportDate = new Date().toISOString().split("T")[0]
    setMaintenanceLogs([
      ...maintenanceLogs,
      {
        id,
        ...newLog,
        reportDate,
        status: "Pending",
      },
    ])
    setNewLog({
      assetName: "",
      assetType: "",
      reportedBy: "",
      issue: "",
      priority: "Medium",
      assignedTo: "",
      notes: "",
    })
    setIsAddDialogOpen(false)
  }

  const handleResolveIssue = () => {
    const resolvedDate = new Date().toISOString().split("T")[0]
    setMaintenanceLogs(
      maintenanceLogs.map((log) =>
        log.id === currentLog.id ? { ...log, status: "Resolved", resolution, resolvedDate } : log,
      ),
    )
    setResolution("")
    setIsResolveDialogOpen(false)
  }

  const handleStartMaintenance = (id) => {
    setMaintenanceLogs(maintenanceLogs.map((log) => (log.id === id ? { ...log, status: "In Progress" } : log)))
  }

  const openResolveDialog = (log) => {
    setCurrentLog(log)
    setIsResolveDialogOpen(true)
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case "Pending":
        return <Badge className="bg-amber-500">Pending</Badge>
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Maintenance & Issues</h1>
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
                <Label htmlFor="assetName" className="text-right">
                  Asset Name
                </Label>
                <Input
                  id="assetName"
                  value={newLog.assetName}
                  onChange={(e) => setNewLog({ ...newLog, assetName: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="assetType" className="text-right">
                  Asset Type
                </Label>
                <Input
                  id="assetType"
                  value={newLog.assetType}
                  onChange={(e) => setNewLog({ ...newLog, assetType: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="reportedBy" className="text-right">
                  Reported By
                </Label>
                <Input
                  id="reportedBy"
                  value={newLog.reportedBy}
                  onChange={(e) => setNewLog({ ...newLog, reportedBy: e.target.value })}
                  className="col-span-3"
                />
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
                <Input
                  id="assignedTo"
                  value={newLog.assignedTo}
                  onChange={(e) => setNewLog({ ...newLog, assignedTo: e.target.value })}
                  className="col-span-3"
                />
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
              <Button onClick={handleAddLog}>Submit</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
            {filteredLogs.length === 0 ? (
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
                  <TableCell>{log.reportedBy}</TableCell>
                  <TableCell>{getStatusBadge(log.status)}</TableCell>
                  <TableCell>{getPriorityBadge(log.priority)}</TableCell>
                  <TableCell>{log.assignedTo || "-"}</TableCell>
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
                            alert(`Notes: ${log.notes}${log.resolution ? `\nResolution: ${log.resolution}` : ""}`)
                          }
                        >
                          <AlertTriangle className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {log.status === "Pending" && (
                          <DropdownMenuItem onClick={() => handleStartMaintenance(log.id)}>
                            <Tool className="mr-2 h-4 w-4" />
                            Start Maintenance
                          </DropdownMenuItem>
                        )}
                        {(log.status === "Pending" || log.status === "In Progress") && (
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
            <Button onClick={handleResolveIssue}>Mark as Resolved</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

