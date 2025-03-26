import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { db, storage } from "./firebase"

// Users
export const getUsers = async () => {
  const usersRef = collection(db, "users")
  const snapshot = await getDocs(usersRef)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))
}

export const getUserById = async (userId) => {
  const userDoc = await getDoc(doc(db, "users", userId))
  if (!userDoc.exists()) {
    throw new Error("User not found")
  }
  return {
    id: userDoc.id,
    ...userDoc.data(),
  }
}

export const updateUser = async (userId, userData) => {
  await updateDoc(doc(db, "users", userId), userData)
  return {
    id: userId,
    ...userData,
  }
}

export const deleteUser = async (userId) => {
  await deleteDoc(doc(db, "users", userId))
  return userId
}

// Teams
export const getTeams = async () => {
  const teamsRef = collection(db, "teams")
  const snapshot = await getDocs(teamsRef)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))
}

export const getTeamById = async (teamId) => {
  const teamDoc = await getDoc(doc(db, "teams", teamId))
  if (!teamDoc.exists()) {
    throw new Error("Team not found")
  }
  return {
    id: teamDoc.id,
    ...teamDoc.data(),
  }
}

export const createTeam = async (teamData) => {
  const docRef = await addDoc(collection(db, "teams"), {
    ...teamData,
    createdAt: new Date().toISOString(),
  })
  return {
    id: docRef.id,
    ...teamData,
  }
}

export const updateTeam = async (teamId, teamData) => {
  await updateDoc(doc(db, "teams", teamId), teamData)
  return {
    id: teamId,
    ...teamData,
  }
}

export const deleteTeam = async (teamId) => {
  await deleteDoc(doc(db, "teams", teamId))
  return teamId
}

export const addUserToTeam = async (teamId, userId) => {
  // Get team and user
  const teamDoc = await getDoc(doc(db, "teams", teamId))
  const userDoc = await getDoc(doc(db, "users", userId))

  if (!teamDoc.exists() || !userDoc.exists()) {
    throw new Error("Team or user not found")
  }

  // Update team members
  const teamData = teamDoc.data()
  const members = teamData.members || []
  if (!members.includes(userId)) {
    members.push(userId)
    await updateDoc(doc(db, "teams", teamId), { members })
  }

  // Update user teams
  const userData = userDoc.data()
  const teams = userData.teams || []
  if (!teams.includes(teamId)) {
    teams.push(teamId)
    await updateDoc(doc(db, "users", userId), { teams })
  }

  return {
    teamId,
    userId,
  }
}

export const removeUserFromTeam = async (teamId, userId) => {
  // Get team and user
  const teamDoc = await getDoc(doc(db, "teams", teamId))
  const userDoc = await getDoc(doc(db, "users", userId))

  if (!teamDoc.exists() || !userDoc.exists()) {
    throw new Error("Team or user not found")
  }

  // Update team members
  const teamData = teamDoc.data()
  const members = teamData.members || []
  const updatedMembers = members.filter((id) => id !== userId)
  await updateDoc(doc(db, "teams", teamId), { members: updatedMembers })

  // Update user teams
  const userData = userDoc.data()
  const teams = userData.teams || []
  const updatedTeams = teams.filter((id) => id !== teamId)
  await updateDoc(doc(db, "users", userId), { teams: updatedTeams })

  return {
    teamId,
    userId,
  }
}

// Assets
export const getAssets = async () => {
  const assetsRef = collection(db, "assets")
  const snapshot = await getDocs(assetsRef)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))
}

export const getAssetById = async (assetId) => {
  const assetDoc = await getDoc(doc(db, "assets", assetId))
  if (!assetDoc.exists()) {
    throw new Error("Asset not found")
  }
  return {
    id: assetDoc.id,
    ...assetDoc.data(),
  }
}

export const createAsset = async (assetData, imageFile = null) => {
  let imageUrl = null

  // Upload image if provided
  if (imageFile) {
    const storageRef = ref(storage, `assets/${Date.now()}_${imageFile.name}`)
    await uploadBytes(storageRef, imageFile)
    imageUrl = await getDownloadURL(storageRef)
  }

  const docRef = await addDoc(collection(db, "assets"), {
    ...assetData,
    imageUrl,
    createdAt: new Date().toISOString(),
  })

  return {
    id: docRef.id,
    ...assetData,
    imageUrl,
  }
}

export const updateAsset = async (assetId, assetData, imageFile = null) => {
  const assetDoc = await getDoc(doc(db, "assets", assetId))
  if (!assetDoc.exists()) {
    throw new Error("Asset not found")
  }

  let imageUrl = assetDoc.data().imageUrl

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

  await updateDoc(doc(db, "assets", assetId), {
    ...assetData,
    imageUrl,
    updatedAt: new Date().toISOString(),
  })

  return {
    id: assetId,
    ...assetData,
    imageUrl,
  }
}

export const deleteAsset = async (assetId) => {
  const assetDoc = await getDoc(doc(db, "assets", assetId))
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

  await deleteDoc(doc(db, "assets", assetId))
  return assetId
}

export const assignAssetToUser = async (assetId, userId, dueDate) => {
  const assetDoc = await getDoc(doc(db, "assets", assetId))
  if (!assetDoc.exists()) {
    throw new Error("Asset not found")
  }

  await updateDoc(doc(db, "assets", assetId), {
    assignedTo: userId,
    assignedDate: new Date().toISOString(),
    dueDate,
    status: "In Use",
  })

  return {
    id: assetId,
    assignedTo: userId,
    dueDate,
  }
}

export const assignAssetToTeam = async (assetId, teamId, dueDate) => {
  const assetDoc = await getDoc(doc(db, "assets", assetId))
  if (!assetDoc.exists()) {
    throw new Error("Asset not found")
  }

  await updateDoc(doc(db, "assets", assetId), {
    assignedToTeam: teamId,
    assignedDate: new Date().toISOString(),
    dueDate,
    status: "In Use",
  })

  return {
    id: assetId,
    assignedToTeam: teamId,
    dueDate,
  }
}

export const unassignAsset = async (assetId) => {
  const assetDoc = await getDoc(doc(db, "assets", assetId))
  if (!assetDoc.exists()) {
    throw new Error("Asset not found")
  }

  await updateDoc(doc(db, "assets", assetId), {
    assignedTo: null,
    assignedToTeam: null,
    assignedDate: null,
    dueDate: null,
    status: "Available",
  })

  return {
    id: assetId,
  }
}

// Bookings
export const getBookings = async () => {
  const bookingsRef = collection(db, "bookings")
  const snapshot = await getDocs(bookingsRef)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))
}

export const getUserBookings = async (userId) => {
  const bookingsRef = collection(db, "bookings")
  const q = query(bookingsRef, where("requestedBy", "==", userId))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))
}

export const getTeamBookings = async (teamId) => {
  const bookingsRef = collection(db, "bookings")
  const q = query(bookingsRef, where("requestedByTeam", "==", teamId))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))
}

export const createBooking = async (bookingData) => {
  const docRef = await addDoc(collection(db, "bookings"), {
    ...bookingData,
    status: "Pending",
    requestDate: new Date().toISOString(),
  })
  return {
    id: docRef.id,
    ...bookingData,
    status: "Pending",
    requestDate: new Date().toISOString(),
  }
}

export const updateBookingStatus = async (bookingId, status, rejectionReason = null) => {
  const bookingDoc = await getDoc(doc(db, "bookings", bookingId))
  if (!bookingDoc.exists()) {
    throw new Error("Booking not found")
  }

  const updateData = {
    status,
    updatedAt: new Date().toISOString(),
  }

  if (status === "Rejected" && rejectionReason) {
    updateData.rejectionReason = rejectionReason
  }

  await updateDoc(doc(db, "bookings", bookingId), updateData)

  return {
    id: bookingId,
    ...updateData,
  }
}

export const deleteBooking = async (bookingId) => {
  await deleteDoc(doc(db, "bookings", bookingId))
  return bookingId
}

// Maintenance
export const getMaintenanceLogs = async () => {
  const maintenanceRef = collection(db, "maintenance")
  const snapshot = await getDocs(maintenanceRef)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))
}

export const createMaintenanceLog = async (maintenanceData) => {
  const docRef = await addDoc(collection(db, "maintenance"), {
    ...maintenanceData,
    status: "Pending",
    reportDate: new Date().toISOString(),
  })
  return {
    id: docRef.id,
    ...maintenanceData,
    status: "Pending",
    reportDate: new Date().toISOString(),
  }
}

export const updateMaintenanceStatus = async (maintenanceId, status, resolution = null) => {
  const maintenanceDoc = await getDoc(doc(db, "maintenance", maintenanceId))
  if (!maintenanceDoc.exists()) {
    throw new Error("Maintenance log not found")
  }

  const updateData = {
    status,
    updatedAt: new Date().toISOString(),
  }

  if (status === "Resolved" && resolution) {
    updateData.resolution = resolution
    updateData.resolvedDate = new Date().toISOString()
  }

  await updateDoc(doc(db, "maintenance", maintenanceId), updateData)

  return {
    id: maintenanceId,
    ...updateData,
  }
}

// Feedback
export const createFeedback = async (feedbackData) => {
  const docRef = await addDoc(collection(db, "feedback"), {
    ...feedbackData,
    createdAt: new Date().toISOString(),
  })
  return {
    id: docRef.id,
    ...feedbackData,
    createdAt: new Date().toISOString(),
  }
}

// Verification
export const createVerificationRequest = async (assetId, userId, verificationCode) => {
  const docRef = await addDoc(collection(db, "verifications"), {
    assetId,
    userId,
    verificationCode,
    status: "Pending",
    createdAt: new Date().toISOString(),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
  })
  return {
    id: docRef.id,
    assetId,
    userId,
    verificationCode,
    status: "Pending",
    createdAt: new Date().toISOString(),
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  }
}

export const completeVerification = async (verificationId) => {
  const verificationDoc = await getDoc(doc(db, "verifications", verificationId))
  if (!verificationDoc.exists()) {
    throw new Error("Verification request not found")
  }

  await updateDoc(doc(db, "verifications", verificationId), {
    status: "Completed",
    completedAt: new Date().toISOString(),
  })

  return {
    id: verificationId,
    status: "Completed",
    completedAt: new Date().toISOString(),
  }
}

export const getUserPendingVerifications = async (userId) => {
  const verificationsRef = collection(db, "verifications")
  const q = query(verificationsRef, where("userId", "==", userId), where("status", "==", "Pending"))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))
}

