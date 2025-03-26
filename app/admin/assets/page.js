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
import { Plus, MoreHorizontal, Search, FileEdit, Trash2, AlertTriangle, Users, Filter, UserPlus } from "lucide-react"
import { collection, addDoc, doc, updateDoc, deleteDoc, getDocs, getDoc } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { db, storage } from "@/lib/firebase"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"

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
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    types: [],
    statuses: [],
    conditions: [],
    models: [],
    specifications: [],
  })
  const [availableFilters, setAvailableFilters] = useState({
    types: [],
    statuses: ["Available", "In Use", "Maintenance"],
    conditions: ["Good", "Fair", "Needs Repair"],
    models: [],
    specifications: [],
  })
  const [newAsset, setNewAsset] = useState({
    name: "",
    type: "",
    model: "",
    specifications: {},
    status: "Available",
    location: "",
    serialNumber: "",
    purchaseDate: "",
    condition: "Good",
    notes: "",
  })

  // Add a new state for specifications input
  const [specificationKey, setSpecificationKey] = useState("")
  const [specificationValue, setSpecificationValue] = useState("")

  const [assetCategories, setAssetCategories] = useState([
    "Laptop",
    "Desktop",
    "Monitor",
    "Tablet",
    "Phone",
    "Printer",
    "Projector",
    "Camera",
    "Other",
  ])
  const [assetModels, setAssetModels] = useState({
    Laptop: ["MacBook Pro", "MacBook Air", "Dell XPS", "ThinkPad", "HP Spectre", "Surface Laptop", "Other"],
    Desktop: ["Mac Mini", "iMac", "Dell OptiPlex", "HP Pavilion", "Custom Build", "Other"],
    Monitor: ["Dell UltraSharp", "LG UltraWide", "Samsung", "ASUS ProArt", "BenQ", "Other"],
    Tablet: ["iPad Pro", "iPad Air", "Surface Pro", "Galaxy Tab", "Other"],
    Phone: ["iPhone", "Samsung Galaxy", "Google Pixel", "Other"],
    Printer: ["HP LaserJet", "Epson", "Canon", "Brother", "Other"],
    Projector: ["Epson", "BenQ", "ViewSonic", "Sony", "Other"],
    Camera: ["Canon", "Nikon", "Sony", "Fujifilm", "Other"],
    Other: ["Other"],
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch assets
        const assetsSnapshot = await getDocs(collection(db, "assets"))
        const assetsData = assetsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setAssets(assetsData)

        // Extract unique values for filters
        const types = [...new Set(assetsData.map((asset) => asset.type).filter(Boolean))]
        const models = [...new Set(assetsData.map((asset) => asset.model).filter(Boolean))]

        // Extract all specification keys across all assets
        const allSpecs = new Set()
        assetsData.forEach((asset) => {
          if (asset.specifications) {
            Object.keys(asset.specifications).forEach((key) => allSpecs.add(key))
          }
        })

        setAvailableFilters((prev) => ({
          ...prev,
          types,
          models,
          specifications: [...allSpecs],
        }))

        // Fetch users
        const usersSnapshot = await getDocs(collection(db, "users"))
        const usersData = usersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setUsers(usersData)

        // Fetch teams
        const teamsSnapshot = await getDocs(collection(db, "teams"))
        const teamsData = teamsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setTeams(teamsData)
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const addSpecification = () => {
    if (specificationKey && specificationValue) {
      setNewAsset({
        ...newAsset,
        specifications: {
          ...newAsset.specifications,
          [specificationKey]: specificationValue,
        },
      })
      setSpecificationKey("")
      setSpecificationValue("")
    }
  }

  const removeSpecification = (key) => {
    const updatedSpecs = { ...newAsset.specifications }
    delete updatedSpecs[key]
    setNewAsset({
      ...newAsset,
      specifications: updatedSpecs,
    })
  }

  const editSpecification = (key, value) => {
    if (currentAsset) {
      const updatedSpecs = { ...(currentAsset.specifications || {}) }
      updatedSpecs[key] = value
      setCurrentAsset({
        ...currentAsset,
        specifications: updatedSpecs,
      })
    }
  }

  const removeEditSpecification = (key) => {
    if (currentAsset) {
      const updatedSpecs = { ...currentAsset.specifications }
      delete updatedSpecs[key]
      setCurrentAsset({
        ...currentAsset,
        specifications: updatedSpecs,
      })
    }
  }

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

  const filteredAssets = assets.filter((asset) => {
    // Search query filter
    const matchesSearch =
      asset.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.status?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase())

    if (!matchesSearch) return false

    // Apply category filters
    if (filters.types.length > 0 && !filters.types.includes(asset.type)) return false
    if (filters.statuses.length > 0 && !filters.statuses.includes(asset.status)) return false
    if (filters.conditions.length > 0 && !filters.conditions.includes(asset.condition)) return false
    if (filters.models.length > 0 && !filters.models.includes(asset.model)) return false

    // Specification filters
    if (filters.specifications.length > 0) {
      // Check if asset has any of the filtered specifications
      const assetSpecs = asset.specifications || {}
      const hasMatchingSpec = filters.specifications.some((spec) => {
        const [key, value] = spec.split(":")
        return assetSpecs[key] === value
      })
      if (!hasMatchingSpec) return false
    }

    return true
  })

  const handleAddAsset = async () => {
    try {
      let imageUrl = null

      // Upload image if provided
      if (imageFile) {
        const storageRef = ref(storage, `assets/${Date.now()}_${imageFile.name}`)
        await uploadBytes(storageRef, imageFile)
        imageUrl = await getDownloadURL(storageRef)
      }

      // Add asset to Firestore
      const docRef = await addDoc(collection(db, "assets"), {
        ...newAsset,
        imageUrl,
        createdAt: new Date().toISOString(),
      })

      const newAssetData = {
        id: docRef.id,
        ...newAsset,
        imageUrl,
        createdAt: new Date().toISOString(),
      }

      setAssets([...assets, newAssetData])

      // Update available filters
      if (newAsset.type && !availableFilters.types.includes(newAsset.type)) {
        setAvailableFilters((prev) => ({
          ...prev,
          types: [...prev.types, newAsset.type],
        }))
      }

      if (newAsset.model && !availableFilters.models.includes(newAsset.model)) {
        setAvailableFilters((prev) => ({
          ...prev,
          models: [...prev.models, newAsset.model],
        }))
      }

      // Reset form
      setNewAsset({
        name: "",
        type: "",
        model: "",
        specifications: {},
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
      let imageUrl = currentAsset.imageUrl

      // Upload new image if provided
      if (imageFile) {
        // Delete old image if exists
        if (imageUrl) {
          try {
            const oldImageRef = ref(storage, imageUrl)
            await deleteObject(oldImageRef)
          } catch (error) {
            console.error("Error deleting old image:", error)
          }
        }

        // Upload new image
        const storageRef = ref(storage, `assets/${Date.now()}_${imageFile.name}`)
        await uploadBytes(storageRef, imageFile)
        imageUrl = await getDownloadURL(storageRef)
      }

      // Update asset in Firestore
      await updateDoc(doc(db, "assets", currentAsset.id), {
        name: currentAsset.name,
        type: currentAsset.type,
        model: currentAsset.model,
        specifications: currentAsset.specifications || {},
        status: currentAsset.status,
        location: currentAsset.location,
        serialNumber: currentAsset.serialNumber,
        purchaseDate: currentAsset.purchaseDate,
        condition: currentAsset.condition,
        notes: currentAsset.notes,
        imageUrl,
        updatedAt: new Date().toISOString(),
      })

      setAssets(assets.map((asset) => (asset.id === currentAsset.id ? { ...currentAsset, imageUrl } : asset)))

      // Update available filters
      if (currentAsset.type && !availableFilters.types.includes(currentAsset.type)) {
        setAvailableFilters((prev) => ({
          ...prev,
          types: [...prev.types, currentAsset.type],
        }))
      }

      if (currentAsset.model && !availableFilters.models.includes(currentAsset.model)) {
        setAvailableFilters((prev) => ({
          ...prev,
          models: [...prev.models, currentAsset.model],
        }))
      }

      setImageFile(null)
      setIsEditDialogOpen(false)
    } catch (error) {
      console.error("Error updating asset:", error)
    }
  }

  const handleDeleteAsset = async (id) => {
    try {
      const assetDoc = await getDoc(doc(db, "assets", id))
      if (!assetDoc.exists()) {
        throw new Error("Asset not found")
      }

      // Delete image if exists
      const imageUrl = assetDoc.data().imageUrl
      if (imageUrl) {
        try {
          const imageRef = ref(storage, imageUrl)
          await deleteObject(imageRef)
        } catch (error) {
          console.error("Error deleting image:", error)
        }
      }

      // Delete asset from Firestore
      await deleteDoc(doc(db, "assets", id))
      setAssets(assets.filter((asset) => asset.id !== id))
    } catch (error) {
      console.error("Error deleting asset:", error)
    }
  }

  const handleAssignAsset = async () => {
    if (!currentAsset) return

    try {
      const assetRef = doc(db, "assets", currentAsset.id)

      if (assignType === "user" && selectedUser) {
        await updateDoc(assetRef, {
          assignedTo: selectedUser,
          assignedToTeam: null,
          assignedDate: new Date().toISOString(),
          dueDate,
          status: "In Use",
        })

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
        await updateDoc(assetRef, {
          assignedTo: null,
          assignedToTeam: selectedTeam,
          assignedDate: new Date().toISOString(),
          dueDate,
          status: "In Use",
        })

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
      await updateDoc(doc(db, "assets", id), {
        assignedTo: null,
        assignedToTeam: null,
        assignedDate: null,
        dueDate: null,
        status: "Available",
      })

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
      await updateDoc(doc(db, "assets", id), {
        condition: "Needs Repair",
        status: "Maintenance",
      })

      setAssets(
        assets.map((asset) =>
          asset.id === id ? { ...asset, condition: "Needs Repair", status: "Maintenance" } : asset,
        ),
      )
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

  // Extract all specification values for filtering
  const getSpecificationValues = () => {
    const specValues = []
    assets.forEach((asset) => {
      if (asset.specifications) {
        Object.entries(asset.specifications).forEach(([key, value]) => {
          const specOption = `${key}:${value}`
          if (!specValues.includes(specOption)) {
            specValues.push(specOption)
          }
        })
      }
    })
    return specValues
  }

  // Add a link to register team in the UI
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Assets Management</h1>
        <div className="flex gap-2">
          <Link href="/admin/register-team">
            <Button variant="outline">
              <UserPlus className="mr-2 h-4 w-4" />
              Register Team
            </Button>
          </Link>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Asset
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Add New Asset</DialogTitle>
                <DialogDescription>Enter the details of the new asset below.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={newAsset.name}
                      onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select
                      value={newAsset.type}
                      onValueChange={(value) => {
                        setNewAsset({
                          ...newAsset,
                          type: value,
                          model: "", // Reset model when type changes
                        })
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select asset type" />
                      </SelectTrigger>
                      <SelectContent>
                        {assetCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Select
                      value={newAsset.model}
                      onValueChange={(value) => setNewAsset({ ...newAsset, model: value })}
                      disabled={!newAsset.type}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={newAsset.type ? "Select model" : "Select type first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {newAsset.type &&
                          assetModels[newAsset.type]?.map((model) => (
                            <SelectItem key={model} value={model}>
                              {model}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={newAsset.status}
                      onValueChange={(value) => setNewAsset({ ...newAsset, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Available">Available</SelectItem>
                        <SelectItem value="In Use">In Use</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={newAsset.location}
                      onChange={(e) => setNewAsset({ ...newAsset, location: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="serialNumber">Serial Number</Label>
                    <Input
                      id="serialNumber"
                      value={newAsset.serialNumber}
                      onChange={(e) => setNewAsset({ ...newAsset, serialNumber: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="purchaseDate">Purchase Date</Label>
                    <Input
                      id="purchaseDate"
                      type="date"
                      value={newAsset.purchaseDate}
                      onChange={(e) => setNewAsset({ ...newAsset, purchaseDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="condition">Condition</Label>
                    <Select
                      value={newAsset.condition}
                      onValueChange={(value) => setNewAsset({ ...newAsset, condition: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Good">Good</SelectItem>
                        <SelectItem value="Fair">Fair</SelectItem>
                        <SelectItem value="Needs Repair">Needs Repair</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Specifications</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Key (e.g. Processor, RAM)"
                      value={specificationKey}
                      onChange={(e) => setSpecificationKey(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Input
                        placeholder="Value (e.g. M2, 16GB)"
                        value={specificationValue}
                        onChange={(e) => setSpecificationValue(e.target.value)}
                      />
                      <Button type="button" size="sm" onClick={addSpecification}>
                        Add
                      </Button>
                    </div>
                  </div>

                  {Object.keys(newAsset.specifications).length > 0 && (
                    <div className="mt-2 space-y-2">
                      <Label>Added Specifications:</Label>
                      <div className="rounded-md border p-2">
                        {Object.entries(newAsset.specifications).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between py-1">
                            <div>
                              <span className="font-medium">{key}:</span> {value}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSpecification(key)}
                              className="h-6 w-6 p-0"
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={newAsset.notes}
                    onChange={(e) => setNewAsset({ ...newAsset, notes: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image">Image</Label>
                  <Input id="image" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} />
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
      </div>

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

                {/* Model filter */}
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

                {/* Status filter */}
                <div className="space-y-2">
                  <h5 className="text-sm font-medium">Status</h5>
                  <div className="grid grid-cols-2 gap-2">
                    {availableFilters.statuses.map((status) => (
                      <div key={status} className="flex items-center space-x-2">
                        <Checkbox
                          id={`status-${status}`}
                          checked={filters.statuses.includes(status)}
                          onCheckedChange={() => toggleFilter("statuses", status)}
                        />
                        <label htmlFor={`status-${status}`} className="text-sm">
                          {status}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Condition filter */}
                <div className="space-y-2">
                  <h5 className="text-sm font-medium">Condition</h5>
                  <div className="grid grid-cols-2 gap-2">
                    {availableFilters.conditions.map((condition) => (
                      <div key={condition} className="flex items-center space-x-2">
                        <Checkbox
                          id={`condition-${condition}`}
                          checked={filters.conditions.includes(condition)}
                          onCheckedChange={() => toggleFilter("conditions", condition)}
                        />
                        <label htmlFor={`condition-${condition}`} className="text-sm">
                          {condition}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Specifications filter */}
                <div className="space-y-2">
                  <h5 className="text-sm font-medium">Specifications</h5>
                  <div className="grid grid-cols-1 gap-2">
                    {getSpecificationValues().map((spec) => {
                      const [key, value] = spec.split(":")
                      return (
                        <div key={spec} className="flex items-center space-x-2">
                          <Checkbox
                            id={`spec-${spec}`}
                            checked={filters.specifications.includes(spec)}
                            onCheckedChange={() => toggleFilter("specifications", spec)}
                          />
                          <label htmlFor={`spec-${spec}`} className="text-sm">
                            {key}: {value}
                          </label>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {Object.values(filters).flat().length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setFilters({
                        types: [],
                        statuses: [],
                        conditions: [],
                        models: [],
                        specifications: [],
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

            {filters.statuses.map((status) => (
              <Badge key={`badge-status-${status}`} variant="outline" className="flex items-center gap-1">
                Status: {status}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleFilter("statuses", status)}
                  className="h-4 w-4 p-0 ml-1"
                >
                  ×
                </Button>
              </Badge>
            ))}

            {filters.conditions.map((condition) => (
              <Badge key={`badge-condition-${condition}`} variant="outline" className="flex items-center gap-1">
                Condition: {condition}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleFilter("conditions", condition)}
                  className="h-4 w-4 p-0 ml-1"
                >
                  ×
                </Button>
              </Badge>
            ))}

            {filters.specifications.map((spec) => {
              const [key, value] = spec.split(":")
              return (
                <Badge key={`badge-spec-${spec}`} variant="outline" className="flex items-center gap-1">
                  {key}: {value}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleFilter("specifications", spec)}
                    className="h-4 w-4 p-0 ml-1"
                  >
                    ×
                  </Button>
                </Badge>
              )
            })}
          </div>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type/Model</TableHead>
              <TableHead>Specifications</TableHead>
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
                <TableCell colSpan={8} className="text-center">
                  Loading assets...
                </TableCell>
              </TableRow>
            ) : filteredAssets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
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
                  <TableCell>{getStatusBadge(asset.status)}</TableCell>
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
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Asset</DialogTitle>
            <DialogDescription>Update the details of the asset below.</DialogDescription>
          </DialogHeader>
          {currentAsset && (
            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    value={currentAsset.name}
                    onChange={(e) => setCurrentAsset({ ...currentAsset, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-type">Type</Label>
                  <Select
                    value={currentAsset.type}
                    onValueChange={(value) => {
                      // If changing to a different type, reset the model
                      if (value !== currentAsset.type) {
                        setCurrentAsset({
                          ...currentAsset,
                          type: value,
                          model: "",
                        })
                      } else {
                        setCurrentAsset({ ...currentAsset, type: value })
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select asset type" />
                    </SelectTrigger>
                    <SelectContent>
                      {assetCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-model">Model</Label>
                  <Select
                    value={currentAsset.model || ""}
                    onValueChange={(value) => setCurrentAsset({ ...currentAsset, model: value })}
                    disabled={!currentAsset.type}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={currentAsset.type ? "Select model" : "Select type first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {currentAsset.type &&
                        assetModels[currentAsset.type]?.map((model) => (
                          <SelectItem key={model} value={model}>
                            {model}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select
                    value={currentAsset.status}
                    onChange={(value) => setCurrentAsset({ ...currentAsset, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Available">Available</SelectItem>
                      <SelectItem value="In Use">In Use</SelectItem>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-location">Location</Label>
                  <Input
                    id="edit-location"
                    value={currentAsset.location}
                    onChange={(e) => setCurrentAsset({ ...currentAsset, location: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-serialNumber">Serial Number</Label>
                  <Input
                    id="edit-serialNumber"
                    value={currentAsset.serialNumber}
                    onChange={(e) => setCurrentAsset({ ...currentAsset, serialNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Specifications</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Key (e.g. Processor, RAM)"
                    value={specificationKey}
                    onChange={(e) => setSpecificationKey(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Input
                      placeholder="Value (e.g. M2, 16GB)"
                      value={specificationValue}
                      onChange={(e) => setSpecificationValue(e.target.value)}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        if (specificationKey && specificationValue) {
                          editSpecification(specificationKey, specificationValue)
                          setSpecificationKey("")
                          setSpecificationValue("")
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </div>

                {currentAsset.specifications && Object.keys(currentAsset.specifications).length > 0 && (
                  <div className="mt-2 space-y-2">
                    <Label>Current Specifications:</Label>
                    <div className="rounded-md border p-2">
                      {Object.entries(currentAsset.specifications).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between py-1">
                          <div>
                            <span className="font-medium">{key}:</span> {value}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeEditSpecification(key)}
                            className="h-6 w-6 p-0"
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-purchaseDate">Purchase Date</Label>
                  <Input
                    id="edit-purchaseDate"
                    type="date"
                    value={currentAsset.purchaseDate || ""}
                    onChange={(e) => setCurrentAsset({ ...currentAsset, purchaseDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-condition">Condition</Label>
                  <Select
                    value={currentAsset.condition}
                    onChange={(value) => setCurrentAsset({ ...currentAsset, condition: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Good">Good</SelectItem>
                      <SelectItem value="Fair">Fair</SelectItem>
                      <SelectItem value="Needs Repair">Needs Repair</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={currentAsset.notes || ""}
                  onChange={(e) => setCurrentAsset({ ...currentAsset, notes: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-image">Update Image</Label>
                <Input id="edit-image" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} />
              </div>

              {currentAsset.imageUrl && (
                <div className="space-y-2">
                  <Label>Current Image:</Label>
                  <div className="rounded-md border p-2 flex justify-center">
                    <img
                      src={currentAsset.imageUrl || "/placeholder.svg"}
                      alt={currentAsset.name}
                      className="max-h-32 rounded-md"
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
                <Select value={assignType} onChange={setAssignType}>
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
                  <Select value={selectedUser} onChange={setSelectedUser}>
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
                  <Select value={selectedTeam} onChange={setSelectedTeam}>
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

