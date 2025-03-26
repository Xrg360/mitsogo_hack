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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { Plus, MoreHorizontal, Search, FileEdit, Trash2, AlertTriangle, Users } from "lucide-react"
import {
  getAssets,
  createAsset,
  updateAsset,
  deleteAsset,
  getUsers,
  getTeams,
  assignAssetToUser,
  assignAssetToTeam,
  unassignAsset,
} from "@/lib/firebase-admin"

export default function AssetsPage() {
  const [assets, setAssets] = useState([])
  const [users, setUsers] = useState([])
  const [teams, setTeams] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [currentAsset, setCurrentAsset] = useState(null)
  const [assignType, setAssignType] = useState("user")
  const [selectedUser, setSelectedUser] = useState("")
  const [selectedTeam, setSelectedTeam] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [imageFile, setImageFile] = useState(null)
  const [newAsset, setNewAsset] = useState({
    name: "",
    type: "",
    status: "Available",
    location: "",
    serialNumber: "",
    purchaseDate: "",
    condition: "Good",
    notes: "",
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const assetsData = await getAssets()
        setAssets(assetsData)

        const usersData = await getUsers()
        setUsers(usersData)

        const teamsData = await getTeams()
        setTeams(teamsData)
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const filteredAssets = assets.filter(
    (asset) =>
      asset.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.status?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleAddAsset = async () => {
    try {
      const newAssetData = await createAsset(newAsset, imageFile)

      setAssets([...assets, newAssetData])
      setNewAsset({
        name: "",
        type: "",
        status: "Available",
        location: "",
        serialNumber: "",
        purchaseDate: "",
        condition: "Good",
        notes: "",
      })
      setImageFile(null)
      setIsAddDialogOpen(false)
    } catch (error) {
      console.error("Error adding asset:", error)
    }
  }

  const handleEditAsset = async () => {
    try {
      const updatedAsset = await updateAsset(
        currentAsset.id,
        {
          name: currentAsset.name,
          type: currentAsset.type,
          status: currentAsset.status,
          location: currentAsset.location,
          serialNumber: currentAsset.serialNumber,
          purchaseDate: currentAsset.purchaseDate,
          condition: currentAsset.condition,
          notes: currentAsset.notes,
        },
        imageFile,
      )

      setAssets(assets.map((asset) => (asset.id === currentAsset.id ? { ...asset, ...updatedAsset } : asset)))
      setImageFile(null)
      setIsEditDialogOpen(false)
    } catch (error) {
      console.error("Error updating asset:", error)
    }
  }

  const handleDeleteAsset = async (id) => {
    try {
      await deleteAsset(id)
      setAssets(assets.filter((asset) => asset.id !== id))
    } catch (error) {
      console.error("Error deleting asset:", error)
    }
  }

  const handleAssignAsset = async () => {
    if (!currentAsset) return

    try {
      if (assignType === "user" && selectedUser) {
        await assignAssetToUser(currentAsset.id, selectedUser, dueDate)

        setAssets(
          assets.map((asset) =>
            asset.id === currentAsset.id
              ? {
                  ...asset,
                  assignedTo: selectedUser,
                  assignedToTeam: null,
                  assignedDate: new Date().toISOString(),
                  dueDate,
                  status: "In Use",
                }
              : asset,
          ),
        )
      } else if (assignType === "team" && selectedTeam) {
        await assignAssetToTeam(currentAsset.id, selectedTeam, dueDate)

        setAssets(
          assets.map((asset) =>
            asset.id === currentAsset.id
              ? {
                  ...asset,
                  assignedTo: null,
                  assignedToTeam: selectedTeam,
                  assignedDate: new Date().toISOString(),
                  dueDate,
                  status: "In Use",
                }
              : asset,
          ),
        )
      }

      setSelectedUser("")
      setSelectedTeam("")
      setDueDate("")
      setIsAssignDialogOpen(false)
    } catch (error) {
      console.error("Error assigning asset:", error)
    }
  }

  const handleUnassignAsset = async (id) => {
    try {
      await unassignAsset(id)

      setAssets(
        assets.map((asset) =>
          asset.id === id
            ? {
                ...asset,
                assignedTo: null,
                assignedToTeam: null,
                assignedDate: null,
                dueDate: null,
                status: "Available",
              }
            : asset,
        ),
      )
    } catch (error) {
      console.error("Error unassigning asset:", error)
    }
  }

  const handleReportIssue = async (id) => {
    try {
      const updatedAsset = await updateAsset(id, {
        condition: "Needs Repair",
        status: "Maintenance",
      })

      setAssets(assets.map((asset) => (asset.id === id ? { ...asset, ...updatedAsset } : asset)))
    } catch (error) {
      console.error("Error reporting issue:", error)
    }
  }

  const openEditDialog = (asset) => {
    setCurrentAsset(asset)
    setIsEditDialogOpen(true)
  }

  const openAssignDialog = (asset) => {
    setCurrentAsset(asset)
    setAssignType("user")
    setSelectedUser("")
    setSelectedTeam("")
    setDueDate("")
    setIsAssignDialogOpen(true)
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case "Available":
        return <Badge className="bg-green-500">Available</Badge>
      case "In Use":
        return <Badge className="bg-blue-500">In Use</Badge>
      case "Maintenance":
        return <Badge className="bg-amber-500">Maintenance</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getConditionBadge = (condition) => {
    switch (condition) {
      case "Good":
        return (
          <Badge variant="outline" className="border-green-500 text-green-500">
            Good
          </Badge>
        )
      case "Fair":
        return (
          <Badge variant="outline" className="border-amber-500 text-amber-500">
            Fair
          </Badge>
        )
      case "Needs Repair":
        return (
          <Badge variant="outline" className="border-red-500 text-red-500">
            Needs Repair
          </Badge>
        )
      default:
        return <Badge variant="outline">{condition}</Badge>
    }
  }

  const getUserName = (userId) => {
    const user = users.find((user) => user.id === userId)
    return user ? user.name : "Unknown User"
  }

  const getTeamName = (teamId) => {
    const team = teams.find((team) => team.id === teamId)
    return team ? team.name : "Unknown Team"
  }

  const getAssignedTo = (asset) => {
    if (asset.assignedTo) {
      return getUserName(asset.assignedTo)
    } else if (asset.assignedToTeam) {
      return (
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3" /> {getTeamName(asset.assignedToTeam)}
        </div>
      )
    } else {
      return "-"
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Assets Management</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Asset
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Asset</DialogTitle>
              <DialogDescription>Enter the details of the new asset below.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={newAsset.name}
                  onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">
                  Type
                </Label>
                <Input
                  id="type"
                  value={newAsset.type}
                  onChange={(e) => setNewAsset({ ...newAsset, type: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">
                  Status
                </Label>
                <Select value={newAsset.status} onValueChange={(value) => setNewAsset({ ...newAsset, status: value })}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Available">Available</SelectItem>
                    <SelectItem value="In Use">In Use</SelectItem>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="location" className="text-right">
                  Location
                </Label>
                <Input
                  id="location"
                  value={newAsset.location}
                  onChange={(e) => setNewAsset({ ...newAsset, location: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="serialNumber" className="text-right">
                  Serial Number
                </Label>
                <Input
                  id="serialNumber"
                  value={newAsset.serialNumber}
                  onChange={(e) => setNewAsset({ ...newAsset, serialNumber: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="purchaseDate" className="text-right">
                  Purchase Date
                </Label>
                <Input
                  id="purchaseDate"
                  type="date"
                  value={newAsset.purchaseDate}
                  onChange={(e) => setNewAsset({ ...newAsset, purchaseDate: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="condition" className="text-right">
                  Condition
                </Label>
                <Select
                  value={newAsset.condition}
                  onValueChange={(value) => setNewAsset({ ...newAsset, condition: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Good">Good</SelectItem>
                    <SelectItem value="Fair">Fair</SelectItem>
                    <SelectItem value="Needs Repair">Needs Repair</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="notes" className="text-right">
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  value={newAsset.notes}
                  onChange={(e) => setNewAsset({ ...newAsset, notes: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="image" className="text-right">
                  Image
                </Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files[0])}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddAsset}>Add Asset</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search assets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Loading assets...
                </TableCell>
              </TableRow>
            ) : filteredAssets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  No assets found.
                </TableCell>
              </TableRow>
            ) : (
              filteredAssets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell className="font-medium">{asset.name}</TableCell>
                  <TableCell>{asset.type}</TableCell>
                  <TableCell>{getStatusBadge(asset.status)}</TableCell>
                  <TableCell>{asset.location}</TableCell>
                  <TableCell>{getAssignedTo(asset)}</TableCell>
                  <TableCell>{getConditionBadge(asset.condition)}</TableCell>
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
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openEditDialog(asset)}>
                          <FileEdit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteAsset(asset.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                        {asset.status === "Available" && (
                          <DropdownMenuItem onClick={() => openAssignDialog(asset)}>
                            <Users className="mr-2 h-4 w-4" />
                            Assign
                          </DropdownMenuItem>
                        )}
                        {asset.status === "In Use" && (
                          <DropdownMenuItem onClick={() => handleUnassignAsset(asset.id)}>
                            <Users className="mr-2 h-4 w-4" />
                            Unassign
                          </DropdownMenuItem>
                        )}
                        {asset.condition !== "Needs Repair" && (
                          <DropdownMenuItem onClick={() => handleReportIssue(asset.id)}>
                            <AlertTriangle className="mr-2 h-4 w-4" />
                            Report Issue
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

      {/* Edit Asset Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Asset</DialogTitle>
            <DialogDescription>Update the details of the asset below.</DialogDescription>
          </DialogHeader>
          {currentAsset && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="edit-name"
                  value={currentAsset.name}
                  onChange={(e) => setCurrentAsset({ ...currentAsset, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-type" className="text-right">
                  Type
                </Label>
                <Input
                  id="edit-type"
                  value={currentAsset.type}
                  onChange={(e) => setCurrentAsset({ ...currentAsset, type: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-status" className="text-right">
                  Status
                </Label>
                <Select
                  value={currentAsset.status}
                  onValueChange={(value) => setCurrentAsset({ ...currentAsset, status: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Available">Available</SelectItem>
                    <SelectItem value="In Use">In Use</SelectItem>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-location" className="text-right">
                  Location
                </Label>
                <Input
                  id="edit-location"
                  value={currentAsset.location}
                  onChange={(e) => setCurrentAsset({ ...currentAsset, location: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-serialNumber" className="text-right">
                  Serial Number
                </Label>
                <Input
                  id="edit-serialNumber"
                  value={currentAsset.serialNumber}
                  onChange={(e) => setCurrentAsset({ ...currentAsset, serialNumber: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-condition" className="text-right">
                  Condition
                </Label>
                <Select
                  value={currentAsset.condition}
                  onValueChange={(value) => setCurrentAsset({ ...currentAsset, condition: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Good">Good</SelectItem>
                    <SelectItem value="Fair">Fair</SelectItem>
                    <SelectItem value="Needs Repair">Needs Repair</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-notes" className="text-right">
                  Notes
                </Label>
                <Textarea
                  id="edit-notes"
                  value={currentAsset.notes}
                  onChange={(e) => setCurrentAsset({ ...currentAsset, notes: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-image" className="text-right">
                  Update Image
                </Label>
                <Input
                  id="edit-image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files[0])}
                  className="col-span-3"
                />
              </div>
              {currentAsset.imageUrl && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="text-right">Current Image:</div>
                  <div className="col-span-3">
                    <img
                      src={currentAsset.imageUrl || "/placeholder.svg"}
                      alt={currentAsset.name}
                      className="max-h-32 rounded-md border"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditAsset}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Asset Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Asset</DialogTitle>
            <DialogDescription>Assign this asset to a user or team.</DialogDescription>
          </DialogHeader>
          {currentAsset && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Asset:</Label>
                <div className="col-span-3">{currentAsset.name}</div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="assign-type" className="text-right">
                  Assign To
                </Label>
                <Select value={assignType} onValueChange={setAssignType}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {assignType === "user" ? (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="select-user" className="text-right">
                    Select User
                  </Label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="select-team" className="text-right">
                    Select Team
                  </Label>
                  <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="due-date" className="text-right">
                  Due Date
                </Label>
                <Input
                  id="due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignAsset}
              disabled={
                (assignType === "user" && !selectedUser) || (assignType === "team" && !selectedTeam) || !dueDate
              }
            >
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

