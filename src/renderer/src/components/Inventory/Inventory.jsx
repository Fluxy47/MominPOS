// Inventory.jsx
import React, { useState, useEffect } from 'react'
import { db } from '../../firebaseConfig'
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc } from 'firebase/firestore'
import Modal from './Modal'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { AnimatePresence, motion } from 'motion/react'

const Inventory = ({ itemId, setItemId }) => {
  const [inventory, setInventory] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [ModalStatus, setModalStatus] = useState('')
  const [newItem, setNewItem] = useState({
    id: '',
    name: '',
    category: '',
    actualPrice: '',
    sellingPrice: '',
    pieces: '',
    piecesPerCarton: '',
    cartons: '',
    totalPieces: '',
    dangerLevel: ''
  })
  const [loading, setLoading] = useState(true)

  const itemsCollection = collection(db, 'Items')

  // Fetch items from Firebase (run on mount)
  const fetchInventory = async () => {
    setLoading(true)
    try {
      const querySnapshot = await getDocs(itemsCollection)
      const items = querySnapshot.docs.map((d) => ({
        id: d.id,
        ...d.data()
      }))
      setInventory(items)
    } catch (error) {
      console.error('Error fetching inventory:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInventory()
  }, [])

  // Fetch a single item when itemId changes (for edit flow)
  useEffect(() => {
    const fetchItem = async () => {
      if (!itemId) return

      try {
        const itemRef = doc(db, 'Items', itemId)
        const itemSnapshot = await getDoc(itemRef)
        if (itemSnapshot.exists()) {
          const data = itemSnapshot.data()
          setNewItem({
            id: itemSnapshot.id,
            name: data.name ?? '',
            category: data.category ?? '',
            actualPrice: parseFloat(data.actualPrice) || 0,
            sellingPrice: parseFloat(data.sellingPrice) || 0,
            pieces: parseInt(data.pieces, 10) || 0,
            piecesPerCarton: parseInt(data.piecesPerCarton, 10) || 0,
            cartons: parseInt(data.cartons, 10) || 0,
            totalPieces: parseInt(data.totalPieces, 10) || 0,
            dangerLevel: parseInt(data.dangerLevel, 10) || 0
          })

          setModalStatus('Edit')
          setIsAddModalOpen(true)
        } else {
          console.error('No such document!')
        }
      } catch (error) {
        console.error('Error fetching item:', error)
      }
    }

    fetchItem()
    // we intentionally do NOT call fetchInventory here on every item change,
    // because updating inventory should be done after add/edit/delete explicitly.
  }, [itemId])

  const resetNewItemState = () => {
    setNewItem({
      id: '',
      name: '',
      category: '',
      actualPrice: '',
      sellingPrice: '',
      pieces: '',
      piecesPerCarton: '',
      cartons: '',
      totalPieces: '',
      dangerLevel: ''
    })
  }

  // Validation Function (unchanged)
  const validateItem = () => {
    const {
      name,
      category,
      actualPrice,
      sellingPrice,
      pieces,
      cartons,
      piecesPerCarton,
      dangerLevel
    } = newItem

    if (!name || !category || !actualPrice || !sellingPrice || !dangerLevel) {
      alert('Please fill all required fields.')
      return false
    }

    if (
      actualPrice < 0 ||
      sellingPrice < 0 ||
      (pieces && pieces < 0) ||
      (cartons && cartons < 0) ||
      (piecesPerCarton && piecesPerCarton < 0) ||
      dangerLevel < 0
    ) {
      alert('Numeric fields cannot have values below 0.')
      return false
    }

    const isCartonsFilled = cartons && cartons > 0
    const isPiecesFilled = pieces && pieces > 0

    if (!(isCartonsFilled || isPiecesFilled)) {
      alert('Please fill either Cartons or Individual Pieces.')
      return false
    }

    if (isCartonsFilled && (!piecesPerCarton || piecesPerCarton <= 0)) {
      alert('Please fill Pieces Per Carton if Cartons are specified.')
      return false
    }

    return true
  }

  // Add new item to Firebase
  const handleAddItem = async () => {
    if (!validateItem()) return
    const {
      name,
      category,
      actualPrice,
      sellingPrice,
      pieces,
      piecesPerCarton,
      cartons,
      totalPieces,
      dangerLevel
    } = newItem

    await addDoc(itemsCollection, {
      name,
      category,
      actualPrice: parseFloat(actualPrice) || 0,
      sellingPrice: parseFloat(sellingPrice) || 0,
      pieces: parseInt(pieces, 10) || 0,
      piecesPerCarton: parseInt(piecesPerCarton, 10) || 0,
      cartons: parseInt(cartons, 10) || 0,
      totalPieces: parseInt(totalPieces, 10) || 0,
      dangerLevel: parseInt(dangerLevel, 10) || 0,
      createdAt: new Date()
    })

    await fetchInventory()
    resetNewItemState()
    setIsAddModalOpen(false)
    if (setItemId) setItemId(null)
  }

  // Edit item in Firebase
  const handleEditItem = async () => {
    if (!validateItem()) return
    const itemRef = doc(db, 'Items', newItem.id)
    const {
      name,
      category,
      actualPrice,
      sellingPrice,
      pieces,
      piecesPerCarton,
      cartons,
      totalPieces,
      dangerLevel
    } = newItem

    await updateDoc(itemRef, {
      name,
      category,
      actualPrice: parseFloat(actualPrice) || 0,
      sellingPrice: parseFloat(sellingPrice) || 0,
      pieces: parseInt(pieces, 10) || 0,
      piecesPerCarton: parseInt(piecesPerCarton, 10) || 0,
      cartons: parseInt(cartons, 10) || 0,
      totalPieces: parseInt(totalPieces, 10) || 0,
      dangerLevel: parseInt(dangerLevel, 10) || 0,
      updatedAt: new Date()
    })

    await fetchInventory()
    resetNewItemState()
    setIsAddModalOpen(false)

    // IMPORTANT: clear the passed-in itemId so the modal doesn't reopen automatically
    if (setItemId) setItemId(null)
  }

  // Delete item from Firebase
  const handleDeleteItem = async (id) => {
    const itemRef = doc(db, 'Items', id)
    await deleteDoc(itemRef)
    fetchInventory()
    // if the deleted item was selected for edit, clear the prop
    if (setItemId && id === itemId) setItemId(null)
  }

  const isLowStock = (item) => {
    if (!item.dangerLevel || item.totalPieces === undefined) {
      return false
    }
    return item.totalPieces < item.dangerLevel
  }

  const sortedAndFilteredInventory = inventory
    .filter(
      (item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const isLowStockA = isLowStock(a)
      const isLowStockB = isLowStock(b)

      if (isLowStockA && !isLowStockB) return -1
      if (!isLowStockA && isLowStockB) return 1
      return 0
    })

  const HandleEditClick = (item) => {
    setModalStatus('Edit')
    setNewItem({
      id: item.id,
      name: item.name,
      category: item.category,
      actualPrice: item.actualPrice,
      sellingPrice: item.sellingPrice,
      pieces: item.pieces,
      piecesPerCarton: item.piecesPerCarton,
      cartons: item.cartons,
      totalPieces: item.totalPieces,
      dangerLevel: item.dangerLevel
    })
    setIsAddModalOpen(true)
  }

  const HandleAddClick = () => {
    setModalStatus('Add')
    setIsAddModalOpen(true)
  }

  const CancelFunc = () => {
    setIsAddModalOpen(false)
    resetNewItemState()
    if (setItemId) setItemId(null)
  }

  // Keep totalPieces calculated via Modal's effect (your Modal already does this)
  return (
    <div className="p-6 bg-black min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Inventory Management</h1>
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={HandleAddClick}
        >
          Add New Item
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search inventory..."
          className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="p-10 bg-white rounded shadow-md border">
              <Skeleton height={20} width="70%" className="mb-4" />
              <Skeleton height={15} width="50%" className="mb-2" />
              <Skeleton height={15} width="60%" />
            </div>
          ))
        ) : sortedAndFilteredInventory.length === 0 ? (
          <div className="col-span-full text-center text-gray-500 text-lg font-semibold py-10">
            No items found in inventory.
          </div>
        ) : (
          sortedAndFilteredInventory.map((item) => {
            const lowStock = isLowStock(item)

            return (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                key={item.id}
                className={`p-4 bg-white rounded shadow-md hover:shadow-lg transition-shadow border-2 ${
                  lowStock ? 'border-red-500' : 'border-gray-200'
                }`}
              >
                <h2 className="text-lg font-bold text-gray-800">{item.name}</h2>
                <p className="text-sm text-gray-600">Category: {item.category}</p>
                <p className="text-sm text-gray-600">
                  Actual Price: Rs. {item.actualPrice?.toFixed(2)}
                </p>
                <p className="text-sm text-gray-600">
                  Selling Price: Rs. {item.sellingPrice?.toFixed(2)}
                </p>
                <p className="text-sm text-gray-600">Individual Pieces: {item.pieces}</p>
                <p className="text-sm text-gray-600">Pieces Per Carton: {item.piecesPerCarton}</p>
                <p className="text-sm text-gray-600">Cartons: {item.cartons}</p>
                <p className="text-sm text-gray-600">dangerlevel: {item.dangerLevel}</p>
                <p className="text-sm text-gray-600">Total Pieces: {item.totalPieces}</p>
                <div className="flex mt-4 space-x-2">
                  <button
                    className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                    onClick={() => HandleEditClick(item)}
                  >
                    Edit
                  </button>
                  <button
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    onClick={() => handleDeleteItem(item.id)}
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      {/* Add/Edit Item Modal */}
      <AnimatePresence mode="wait">
        {isAddModalOpen && (
          <Modal
            newItem={newItem}
            setNewItem={setNewItem}
            handleAddItem={handleAddItem}
            handleEditItem={handleEditItem}
            CancelFunc={CancelFunc}
            ModalStatus={ModalStatus}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default Inventory
