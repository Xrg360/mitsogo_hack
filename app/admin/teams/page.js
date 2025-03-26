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
import { Search, MoreHorizontal, FileEdit, Trash2, UserPlus, Users } from "lucide-react"
import {
  getTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  getUsers,
  addUserToTeam,
  removeUserFromTeam,
} from "@/lib/firebase-admin"

export default function TeamsPage() {
  const [teams, setTeams] = useState([])
  const [users, setUsers] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false)
  const [currentTeam, setCurrentTeam] = useState(null)
  const [selectedUser, setSelectedUser] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [newTeam, setNewTeam] = useState({
    name: "",
    department: "",
    description: "",
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const teamsData = await getTeams()
        setTeams(teamsData)

        const usersData = await getUsers()
        setUsers(usersData)
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const filteredTeams = teams.filter(
    (team) =>
      team.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.department?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleAddTeam = async () => {
    try {
      const newTeamData = await createTeam({
        ...newTeam,
        members: [],
        createdAt: new Date().toISOString(),
      })

      setTeams([...teams, newTeamData])
      setNewTeam({
        name: "",
        department: "",
        description: "",
      })
      setIsAddDialogOpen(false)
    } catch (error) {
      console.error("Error adding team:", error)
    }
  }

  const handleEditTeam = async () => {
    try {
      const updatedTeam = await updateTeam(currentTeam.id, {
        name: currentTeam.name,
        department: currentTeam.department,
        description: currentTeam.description,
      })

      setTeams(teams.map((team) => (team.id === currentTeam.id ? { ...team, ...updatedTeam } : team)))
      setIsEditDialogOpen(false)
    } catch (error) {
      console.error("Error updating team:", error)
    }
  }

  const handleDeleteTeam = async (id) => {
    try {
      await deleteTeam(id)
      setTeams(teams.filter((team) => team.id !== id))
    } catch (error) {
      console.error("Error deleting team:", error)
    }
  }

  const handleAddMember = async () => {
    if (!selectedUser || !currentTeam) return

    try {
      await addUserToTeam(currentTeam.id, selectedUser)

      // Update local state
      const updatedTeams = teams.map((team) => {
        if (team.id === currentTeam.id) {
          const members = team.members || []
          if (!members.includes(selectedUser)) {
            return {
              ...team,
              members: [...members, selectedUser],
            }
          }
        }
        return team
      })

      setTeams(updatedTeams)
      setSelectedUser("")
      setIsAddMemberDialogOpen(false)
    } catch (error) {
      console.error("Error adding member to team:", error)
    }
  }

  const handleRemoveMember = async (teamId, userId) => {
    try {
      await removeUserFromTeam(teamId, userId)

      // Update local state
      const updatedTeams = teams.map((team) => {
        if (team.id === teamId) {
          return {
            ...team,
            members: (team.members || []).filter((id) => id !== userId),
          }
        }
        return team
      })

      setTeams(updatedTeams)
    } catch (error) {
      console.error("Error removing member from team:", error)
    }
  }

  const openEditDialog = (team) => {
    setCurrentTeam(team)
    setIsEditDialogOpen(true)
  }

  const openAddMemberDialog = (team) => {
    setCurrentTeam(team)
    setIsAddMemberDialogOpen(true)
  }

  const getUserName = (userId) => {
    const user = users.find((user) => user.id === userId)
    return user ? user.name : "Unknown User"
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Team Management</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Users className="mr-2 h-4 w-4" />
              Add Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
              <DialogDescription>Enter the details for the new team.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Team Name
                </Label>
                <Input
                  id="name"
                  value={newTeam.name}
                  onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="department" className="text-right">
                  Department
                </Label>
                <Input
                  id="department"
                  value={newTeam.department}
                  onChange={(e) => setNewTeam({ ...newTeam, department: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={newTeam.description}
                  onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddTeam}>Create Team</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search teams..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Team Name</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  Loading teams...
                </TableCell>
              </TableRow>
            ) : filteredTeams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  No teams found.
                </TableCell>
              </TableRow>
            ) : (
              filteredTeams.map((team) => (
                <TableRow key={team.id}>
                  <TableCell className="font-medium">{team.name}</TableCell>
                  <TableCell>{team.department}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {team.members && team.members.length > 0 ? (
                        team.members.map((memberId) => (
                          <Badge key={memberId} variant="outline" className="flex items-center gap-1">
                            {getUserName(memberId)}
                            <button
                              onClick={() => handleRemoveMember(team.id, memberId)}
                              className="ml-1 text-xs text-muted-foreground hover:text-foreground"
                            >
                              ×
                            </button>
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">No members</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{team.description}</TableCell>
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
                        <DropdownMenuItem onClick={() => openEditDialog(team)}>
                          <FileEdit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openAddMemberDialog(team)}>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Add Member
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteTeam(team.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Team Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
            <DialogDescription>Update the team details below.</DialogDescription>
          </DialogHeader>
          {currentTeam && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Team Name
                </Label>
                <Input
                  id="edit-name"
                  value={currentTeam.name}
                  onChange={(e) => setCurrentTeam({ ...currentTeam, name: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-department" className="text-right">
                  Department
                </Label>
                <Input
                  id="edit-department"
                  value={currentTeam.department}
                  onChange={(e) => setCurrentTeam({ ...currentTeam, department: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="edit-description"
                  value={currentTeam.description}
                  onChange={(e) => setCurrentTeam({ ...currentTeam, description: e.target.value })}
                  className="col-span-3"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditTeam}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>Select a user to add to the team.</DialogDescription>
          </DialogHeader>
          {currentTeam && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="team-name" className="text-right font-medium">
                  Team:
                </Label>
                <div className="col-span-3">{currentTeam.name}</div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="select-user" className="text-right">
                  Select User
                </Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users
                      .filter((user) => !(currentTeam.members || []).includes(user.id))
                      .map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddMemberDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMember} disabled={!selectedUser}>
              Add to Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

