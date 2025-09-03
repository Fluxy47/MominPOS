import React, { useEffect } from 'react'
import { motion } from 'motion/react'

function Modal({ newItem, setNewItem, handleAddItem, handleEditItem, CancelFunc, ModalStatus }) {
  // Prevent number input scrolling
  useEffect(() => {
    const handleWheel = (e) => {
      if (document.activeElement.type === 'number') {
        e.preventDefault()
      }
    }

    window.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      window.removeEventListener('wheel', handleWheel)
    }
  }, [])

  // useEffect(() => {
  //   document.body.style.overflow = 'hidden'
  //   return () => {
  //     document.body.style.overflow = 'auto'
  //   }
  // }, [])
  // Handle body overflow and scrollbar adjustment
  useEffect(() => {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    document.body.style.overflow = 'hidden'
    document.body.style.paddingRight = `${scrollbarWidth}px`

    return () => {
      document.body.style.overflow = 'auto'
      document.body.style.paddingRight = '0px'
    }
  }, [])

  // Calculate total pieces dynamically
  useEffect(() => {
    const individualPieces = parseInt(newItem.pieces || 0, 10)
    const cartons = parseInt(newItem.cartons || 0, 10)
    const piecesPerCarton = parseInt(newItem.piecesPerCarton || 0, 10)

    let totalPieces = 0

    if (piecesPerCarton > 0) {
      totalPieces = cartons * piecesPerCarton + individualPieces
    } else {
      totalPieces = individualPieces // Only individual pieces provided
    }

    setNewItem((prev) => ({
      ...prev,
      totalPieces
    }))
  }, [newItem.pieces, newItem.cartons, newItem.piecesPerCarton, setNewItem])

  const handleClose = () => {
    setTimeout(CancelFunc, 300) // Match the animation duration
  }

  return (
    <motion.div
      className="fixed  inset-0  bg-black bg-opacity-50 overflow-y-auto z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleClose}
    >
      <motion.div
        className="bg-white p-4 md:p-6 rounded-lg shadow-lg w-full max-w-md md:max-w-lg mx-auto absolute top-[10%] "
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg md:text-xl font-semibold mb-4 text-center">
          {ModalStatus === 'Add' ? 'Add New Item' : 'Edit Item'}
        </h2>

        <form className="space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium">
              Name
            </label>
            <input
              id="name"
              type="text"
              placeholder="Name"
              className="w-full px-3 py-2 border rounded"
              value={newItem.name || ''}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
            />
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium">
              Category
            </label>
            <input
              id="category"
              type="text"
              placeholder="Category"
              className="w-full px-3 py-2 border rounded"
              value={newItem.category || ''}
              onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
            />
          </div>

          {/* Actual Price */}
          <div>
            <label htmlFor="actualPrice" className="block text-sm font-medium">
              Actual Price (Per Piece)
            </label>
            <input
              id="actualPrice"
              type="number"
              min="0"
              placeholder="Actual Price"
              className="w-full px-3 py-2 border rounded"
              value={newItem.actualPrice || ''}
              onChange={(e) => setNewItem({ ...newItem, actualPrice: e.target.value })}
            />
          </div>

          {/* Selling Price */}
          <div>
            <label htmlFor="sellingPrice" className="block text-sm font-medium">
              Selling Price (Per Piece)
            </label>
            <input
              id="sellingPrice"
              type="number"
              min="0"
              placeholder="Selling Price"
              className="w-full px-3 py-2 border rounded"
              value={newItem.sellingPrice || ''}
              onChange={(e) => setNewItem({ ...newItem, sellingPrice: e.target.value })}
            />
          </div>

          {/* Individual Pieces */}
          <div>
            <label htmlFor="pieces" className="block text-sm font-medium">
              Individual Pieces
            </label>
            <input
              id="pieces"
              type="number"
              min="0"
              placeholder="Number of Individual Pieces"
              className="w-full px-3 py-2 border rounded"
              value={newItem.pieces || ''}
              onChange={(e) => setNewItem({ ...newItem, pieces: e.target.value })}
            />
          </div>

          {/* Cartons */}
          <div>
            <label htmlFor="cartons" className="block text-sm font-medium">
              Cartons
            </label>
            <input
              id="cartons"
              type="number"
              min="0"
              placeholder="Number of Cartons"
              className="w-full px-3 py-2 border rounded"
              value={newItem.cartons || ''}
              onChange={(e) => setNewItem({ ...newItem, cartons: e.target.value })}
            />
          </div>

          {/* Pieces Per Carton */}
          <div>
            <label htmlFor="piecesPerCarton" className="block text-sm font-medium">
              Pieces Per Carton
            </label>
            <input
              id="piecesPerCarton"
              type="number"
              min="0"
              placeholder="Pieces Per Carton"
              className="w-full px-3 py-2 border rounded"
              value={newItem.piecesPerCarton || ''}
              onChange={(e) => setNewItem({ ...newItem, piecesPerCarton: e.target.value })}
            />
          </div>

          {/* Danger Level */}
          <div>
            <label htmlFor="dangerLevel" className="block text-sm font-medium">
              Danger Level (By Pieces)
            </label>
            <input
              id="dangerLevel"
              type="number"
              min="0"
              placeholder="Danger Level"
              className="w-full px-3 py-2 border rounded"
              value={newItem.dangerLevel || ''}
              onChange={(e) => setNewItem({ ...newItem, dangerLevel: e.target.value })}
            />
          </div>

          {/* Total Pieces */}
          <div>
            <label htmlFor="totalPieces" className="block text-sm font-medium">
              Total Pieces
            </label>
            <input
              id="totalPieces"
              type="text"
              min="0"
              readOnly
              className="w-full px-3 py-2 border rounded bg-gray-100"
              value={newItem.totalPieces || ''}
            />
          </div>
        </form>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 mt-6">
          <button
            className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
            onClick={handleClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={ModalStatus === 'Add' ? handleAddItem : handleEditItem}
          >
            {ModalStatus === 'Add' ? 'Add Item' : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default Modal
