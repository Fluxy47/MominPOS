import React, { useState, useEffect } from 'react'
import { db } from '../../firebaseConfig'
import { collection, getDocs } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'

function InventoryAlert({ setItemId }) {
  const [inventoryAlerts, setInventoryAlerts] = useState([])
  const navigate = useNavigate()

  // Function to determine if an item has low stock
  const isLowStock = (item) => {
    return (item.totalPieces || 0) < (item.dangerLevel || 0)
  }

  const getStockMessage = (item) => {
    if ((item.totalPieces || 0) <= 0) {
      return 'Out of stock'
    }

    return `${item.totalPieces} available (Cartons: ${item.cartons || 0}, Pieces: ${
      item.pieces || 0
    })`
  }

  // Fetch data from Firestore
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'Items'))
        const inventory = []
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          inventory.push({ id: doc.id, ...data })
        })
        // Filter low-stock items
        const lowStockItems = inventory.filter(isLowStock)
        setInventoryAlerts(lowStockItems)
      } catch (error) {
        console.error('Error fetching inventory: ', error)
      }
    }

    fetchInventory()
  }, [])

  const handleNavigateToInventory = (id) => {
    setItemId(id) // Store the item ID in the parent state
    navigate('/Inventory') // Navigate to the /Inventory route
  }

  return (
    <div className=" p-6 border-2 border-[#2E2E2E] rounded-lg shadow-lg h-screen">
      <h2 className="text-xl font-semibold mb-4 text-[#f5f5f4]">Inventory Alerts</h2>
      <ul className="space-y-3 h-full">
        {inventoryAlerts.length > 0 ? (
          inventoryAlerts.map((item) => (
            <li
              key={item.id}
              className="flex justify-between items-center p-3 bg-[#948979] rounded-lg border-l-4 border-[#FF9F66]"
            >
              <span className="text-[#f5f5f4] font-medium">{item.name}</span>
              <div className="flex items-center gap-4">
                <span className="text-[red] font-semibold">{getStockMessage(item)}</span>
                <button
                  onClick={() => handleNavigateToInventory(item.id)}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#2563eb] rounded-lg hover:bg-[#1d4ed8]"
                >
                  Update Stocks
                </button>
              </div>
            </li>
          ))
        ) : (
          <p className="text-[#e0e0dc] text-center">No low-stock items</p>
        )}
      </ul>
    </div>
  )
}

export default InventoryAlert
