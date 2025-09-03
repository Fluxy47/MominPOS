import React, { useState, useRef, useEffect } from 'react'
import { useReactToPrint } from 'react-to-print'
import { db } from '../../firebaseConfig'
import {
  collection,
  addDoc,
  setDoc,
  query,
  where,
  doc,
  getDocs,
  updateDoc,
  serverTimestamp,
  getDoc,
  writeBatch
} from 'firebase/firestore'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import Search from './Search'
import SearchCredits from './Search'
import { useLocation, useSearchParams } from 'react-router-dom'

function Cart({
  cartItems,
  handleInputChange,
  removeItem,
  clearCart,
  filteredItems,
  setFilteredItems,
  editingSale,
  setEditingSale
}) {
  const [selectedItem, setSelectedItem] = useState(null) // Stores the selected item
  // const [selectedItem, setSelectedItem] = useState(
  //   editingSale && editingSale.customer ? editingSale.customer : null
  // )
  console.log('in cart', editingSale)
  console.log('selectedItem', selectedItem)
  const [allItems, setAllItems] = useState([]) // Stores all items from Firestore
  const [inputDrafts, setInputDrafts] = useState({})
  const [editingSaleId, setEditingSaleId] = useState(null)
  console.log('editing', editingSaleId)
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const saleId = searchParams.get('saleId') // "123" or null

  console.log('sael', saleId)

  // Detect if editing and prefill cart
  useEffect(() => {
    if (!saleId) return // new sale mode

    setEditingSaleId(saleId)

    const fetchSaleData = async () => {
      try {
        const docRef = doc(db, 'sales', saleId)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const saleData = docSnap.data()

          console.log('data', saleData)

          // Reshape data to match filteredItems structure
          const reshapedItems = (saleData.items || []).map((item) => ({
            ...item,
            inCart: [
              {
                cartons: item.cartons || 0,
                pieces: item.pieces || 0
              }
            ]
          }))

          console.log('reshape', reshapedItems)

          // Now you can set filteredItems instead of raw saleData.items
          setFilteredItems(reshapedItems)
        }
      } catch (error) {
        console.error('Error fetching sale data:', error)
      }
    }

    fetchSaleData()
  }, [saleId])

  console.log('iasdasdas', filteredItems)

  const printRef = useRef()
  console.log('printref', printRef.current)

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Cart Invoice',
    removeAfterPrint: true
  })

  const calculateItemTotal = (item) => {
    const totalWithoutDiscount =
      item.sellingPrice * (item.cartons * item.unitsPerCarton + item.pieces)
    const discountAmount = (totalWithoutDiscount * item.discount) / 100
    return totalWithoutDiscount - discountAmount
  }

  // Calculate total profit for each item
  const calculateItemProfit = (item) => {
    const totalPieces = item.pieces
    const totalRevenue = item.sellingPrice * totalPieces
    const totalCost = item.actualPrice * totalPieces
    const discountAmount = (totalRevenue * item.discount) / 100
    return totalRevenue - totalCost - discountAmount
  }

  // Calculate overall totals
  const calculateTotal = () =>
    filteredItems.reduce((sum, item) => {
      // Sum up totals for each cartItem in item.inCart array
      const itemTotal = item.inCart.reduce((cartSum, cartItem) => {
        return cartSum + calculateItemTotal(cartItem)
      }, 0)
      return sum + itemTotal
    }, 0)

  const calculateTotalProfit = () =>
    filteredItems.reduce((sum, item) => {
      // Sum up totals for each cartItem in item.inCart array
      const itemTotal = item.inCart.reduce((cartSum, cartItem) => {
        return cartSum + calculateItemProfit(cartItem)
      }, 0)
      return sum + itemTotal
    }, 0)

  // Helper Functions
  const calculateTotals = () => ({
    total: calculateTotal(),
    profit: calculateTotalProfit()
  })

  const handleCreditDeduction = async (selectedItem, total) => {
    if (!selectedItem) return null

    const { credit, name, id } = selectedItem

    if (credit < total) {
      alert('Not enough credits to complete this transaction.')
      throw new Error('Insufficient credits')
    }

    const updatedCredits = credit - total
    const creditDocRef = doc(collection(db, 'Credits'), id)
    await setDoc(creditDocRef, { credit: updatedCredits }, { merge: true })

    return name
  }

  const generateSaleId = async (salesRef) => {
    const salesSnapshot = await getDocs(salesRef)
    return `Sale-${salesSnapshot.size + 1}`
  }

  const formatCartItems = (filteredItems) => {
    return filteredItems.flatMap((item) =>
      item.inCart
        .filter((cartItem) => cartItem.cartons > 0 || cartItem.pieces > 0)
        .map((cartItem) => ({
          Name: item.name,
          category: item.category,
          price: cartItem.sellingPrice || 0,
          cartons: cartItem.cartons || 0,
          pcsPrCtn: item.piecesPerCarton || 0,
          totalPieces: cartItem.pieces || 0,
          individualPieces: cartItem.individualPieces || 0,
          brokenCartons: cartItem.brokenCartons || 0,
          remainingExtra: cartItem.remainingExtra || 0,
          discount: cartItem.discount || 0,
          total: cartItem.total.toFixed(2)
        }))
    )
  }

  const processInventoryUpdates = async (filteredItems, itemsRef) => {
    const batch = writeBatch(db)

    // Parallel fetch of inventory documents
    const inventoryPromises = filteredItems.map(async (item) => {
      const itemDocRef = doc(itemsRef, item.id)
      const docSnap = await getDoc(itemDocRef)
      return { item, doc: docSnap }
    })

    const inventoryResults = await Promise.all(inventoryPromises)

    inventoryResults.forEach(({ item, docSnap }) => {
      if (!docSnap || !docSnap.exists()) {
        console.error(`Item ${item.name} not found in inventory (ID: ${item.id})`)
        return
      }

      const inventoryData = docSnap.data()
      item.inCart.forEach((cartItem) => {
        const updatedValues = calculateInventoryUpdates(cartItem, inventoryData)
        if (updatedValues) {
          const itemDocRef = doc(itemsRef, item.id)
          batch.update(itemDocRef, updatedValues)
        }
      })
    })

    return batch
  }

  const calculateInventoryUpdates = (cartItem, inventoryData) => {
    const {
      cartons: currentCartons,
      pieces: currentPieces,
      totalPieces: currentTotal,
      piecesPerCarton
    } = inventoryData

    let updatedCartons = currentCartons
    let updatedPieces = currentPieces
    let updatedTotal = currentTotal

    // Process carton sales
    if (cartItem.cartons) {
      const piecesFromCartons = cartItem.cartons * piecesPerCarton
      updatedCartons -= cartItem.cartons
      updatedTotal -= piecesFromCartons
    }

    // Process individual pieces
    const individualPieces = cartItem.pieces - (cartItem.cartons * piecesPerCarton || 0)
    if (individualPieces > 0) {
      updatedPieces -= individualPieces
      updatedTotal -= individualPieces
    }

    // Validate inventory levels
    if ([updatedCartons, updatedPieces, updatedTotal].some((v) => v < 0)) {
      console.error(`Insufficient inventory for item ${cartItem.name}`)
      return null
    }

    return {
      cartons: updatedCartons,
      pieces: updatedPieces,
      totalPieces: updatedTotal
    }
  }

  const saveSaleDocument = async (salesRef, saleData) => {
    const docRef = doc(salesRef, saleData.saleId)
    await setDoc(docRef, saleData)
  }

  // Main Checkout Function
  const checkout = async () => {
    try {
      const salesRef = collection(db, 'Sales')
      const itemsRef = collection(db, 'Items')

      // Calculate totals first as they're needed in multiple places
      const { total, profit } = calculateTotals()

      // Process customer credit if applicable
      const customerName = await handleCreditDeduction(selectedItem, total)

      // Generate sale data concurrently where possible
      const [saleId, formattedItems] = await Promise.all([
        generateSaleId(salesRef),
        formatCartItems(filteredItems)
      ])

      // Process inventory updates in a single batch
      const inventoryBatch = await processInventoryUpdates(filteredItems, itemsRef)
      await inventoryBatch.commit()

      // Prepare and save sale document
      const saleData = {
        saleId,
        timestamp: serverTimestamp(),
        items: formattedItems,
        total,
        profit,
        ...(customerName && { customer: customerName })
      }

      await saveSaleDocument(salesRef, saleData)

      // Clear cart state
      clearCart()
      setSelectedItem(null)

      console.log('Sale successfully recorded:', saleId)
    } catch (error) {
      console.error('Error during checkout:', error)
      // Consider re-throwing error or handling specific error cases
    }
  }

  const updateDiscount = (itemId, cartIndex, newDiscount) => {
    setFilteredItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              inCart: item.inCart.map((cartItem, index) =>
                index === cartIndex ? { ...cartItem, discount: newDiscount } : cartItem
              )
            }
          : item
      )
    )
  }

  //code to reset the state of unfiltereditems
  const resetNonFilteredItems = () => {
    setFilteredItems((prevItems) =>
      prevItems.map((item) => {
        const cartItem = item.inCart[0]
        // If the item does not satisfy the filter condition, reset its inCart values

        if (cartItem && cartItem.cartons === 0 && cartItem.pieces === 0) {
          return {
            ...item,
            inCart: item.inCart.map((cartItem) => ({
              ...cartItem,
              cartons: 0,
              pieces: 0,
              discount: 0
            }))
          }
        }
        return item // Keep the item unchanged if it passes the filter
      })
    )
  }

  const cancelEditing = () => {
    clearCart()
    setEditingSale(null)
    setSelectedItem(null)
  }

  return (
    <div className="lg:w-[40%] w-full bg-white shadow-md lg:h-screen flex flex-col">
      {editingSale && (
        <div className="p-4 bg-yellow-100 border-b border-yellow-300 flex flex-col sm:flex-row items-center justify-between">
          <span className="text-gray-800 font-semibold mb-2 sm:mb-0">
            You are currently <strong>editing a sale</strong>.
          </span>
          <button
            onClick={cancelEditing}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Cancel Editing
          </button>
        </div>
      )}

      <SearchCredits
        editingSale={editingSale}
        allItems={allItems}
        setAllItems={setAllItems}
        selectedItem={selectedItem}
        setSelectedItem={setSelectedItem}
      />

      {/* Cart Items Section (Expandable) */}
      <div ref={printRef} className="p-8 bg-white shadow-lg max-w-4xl mx-auto">
        {/* Invoice Header */}
        <header className="mb-8 border-b pb-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold mb-1">INVOICE</h1>
              <p className="text-xl font-semibold">Your Company Name</p>
              <p className="text-sm text-gray-600">
                1234 Street Address
                <br />
                City, State, ZIP
              </p>
              <p className="text-sm text-gray-600">
                Email: info@company.com
                <br />
                Phone: (555) 555-5555
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm">
                <span className="font-semibold">Date:</span> {new Date().toLocaleDateString()}
              </p>
              <p className="text-sm">
                <span className="font-semibold">Invoice #:</span> 000123
              </p>
              <p className="text-sm">
                <span className="font-semibold">Due Date:</span>{' '}
                {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}
              </p>
            </div>
          </div>
        </header>

        {/* Invoice Items Table */}
        <main className="mb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2">Name</th>
                  <th className="border border-gray-300 px-4 py-2">Price</th>
                  <th className="border border-gray-300 px-4 py-2">Ctn</th>
                  <th className="border border-gray-300 px-4 py-2">Pieces</th>
                  <th className="border border-gray-300 px-4 py-2">Discount</th>
                  <th className="border border-gray-300 px-4 py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems
                  .filter((item) => {
                    const cartItem = item.inCart[0]
                    return cartItem && (cartItem.cartons > 0 || cartItem.pieces > 0)
                  })
                  .map((item) =>
                    item.inCart.map((cartItem, cartIndex) => (
                      <tr key={`${item.id}-${cartIndex}`}>
                        <td className="border border-gray-300 px-4 py-2 relative">
                          {item.name}
                          <button
                            onClick={() => removeItem(item.id, cartIndex)}
                            className="absolute top-[-10px] left-0 text-red-500 hover:text-red-700 font-bold text-xl"
                          >
                            &times;
                          </button>
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          ${item.sellingPrice.toFixed(2)}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <input
                            type="number"
                            min="0"
                            max={cartItem.totalcartons - cartItem.brokenCartons}
                            value={inputDrafts[item.id]?.cartons ?? item.inCart[0].cartons}
                            onChange={(e) => {
                              const newCartons = parseInt(e.target.value, 10) || 0
                              const current =
                                inputDrafts[item.id]?.individualPieces ??
                                item.inCart[0].individualPieces
                              handleInputChange(item.id, newCartons, current)
                              setInputDrafts((prev) => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], cartons: newCartons }
                              }))
                            }}
                            className="border border-gray-300 rounded px-2 py-1 w-full"
                          />
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <input
                            type="number"
                            min={cartItem.cartons ? cartItem.cartons * item.piecesPerCarton : 0}
                            max={cartItem.totalPieces}
                            value={
                              inputDrafts[item.id]?.individualPieces ??
                              item.inCart[0].individualPieces
                            }
                            onChange={(e) => {
                              const newPieces = parseInt(e.target.value, 10) || 0
                              const current =
                                inputDrafts[item.id]?.cartons ?? item.inCart[0].cartons
                              handleInputChange(item.id, current, newPieces)
                              setInputDrafts((prev) => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], individualPieces: newPieces }
                              }))
                            }}
                            className="border border-gray-300 rounded px-2 py-1 w-full"
                          />
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={cartItem.discount || 0}
                            onChange={(e) => {
                              const newDiscount = parseFloat(e.target.value) || 0
                              updateDiscount(item.id, cartIndex, newDiscount)
                            }}
                            className="w-16 border p-1"
                          />
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          ${calculateItemTotal(cartItem).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
              </tbody>
            </table>
          </div>
        </main>

        {/* Invoice Footer */}
        <footer className="border-t pt-4">
          <div className="flex justify-end">
            <div className="text-2xl font-bold">Total: ${calculateTotal().toFixed(2)}</div>
          </div>
          <p className="mt-4 text-center text-sm text-gray-600">Thank you for your business!</p>
        </footer>
      </div>

      {/* Buttons (Always at Bottom) */}
      <div className="p-4 border-t border-gray-300 mt-auto">
        <div className="flex justify-between">
          <button
            onClick={clearCart}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Clear Cart
          </button>
          <button
            onClick={checkout}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Checkout
          </button>
          <button
            onClick={() => handlePrint()}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Print Invoice
          </button>
        </div>
      </div>
    </div>
  )
}

export default Cart

// const checkout = async () => {
//   try {
//     // Calculate totals before starting any Firestore operations.
//     const total = calculateTotal()
//     const profit = calculateTotalProfit()

//     // -------------------------
//     // 1. Transaction for Credit and Sale Record
//     // -------------------------
//     await runTransaction(db, async (transaction) => {
//       const creditsRef = collection(db, 'Credits')
//       const salesRef = collection(db, 'Sales')

//       let customerName = null
//       let creditDocRef, creditSnap

//       if (selectedItem) {
//         creditDocRef = doc(creditsRef, selectedItem.id)
//         creditSnap = await transaction.get(creditDocRef)
//         if (!creditSnap.exists()) {
//           throw new Error('Credit information not found!')
//         }
//         const { credit, name } = creditSnap.data()
//         if (credit < total) {
//           throw new Error('Not enough credits to complete this transaction.')
//         }
//         // Deduct credits.
//         transaction.update(creditDocRef, { credit: credit - total })
//         customerName = name
//       }

//       // Generate a new sale document with an auto-generated ID.
//       const saleDocRef = doc(salesRef)
//       const saleId = saleDocRef.id

//       // Format the sale items from your cart.
//       const formattedItems = filteredItems.flatMap((item) =>
//         item.inCart
//           .filter((cartItem) => cartItem.cartons > 0 || cartItem.pieces > 0)
//           .map((cartItem) => ({
//             Name: item.name,
//             category: item.category,
//             price: cartItem.sellingPrice || 0,
//             cartons: cartItem.cartons || 0,
//             pcsPrCtn: item.piecesPerCarton || 0,
//             totalPieces: cartItem.pieces || 0,
//             individualPieces: cartItem.individualPieces || 0,
//             brokenCartons: cartItem.brokenCartons || 0,
//             remainingExtra: cartItem.remainingExtra || 0,
//             discount: cartItem.discount || 0,
//             total: cartItem.total.toFixed(2)
//           }))
//       )

//       // Create the sale record.
//       const saleData = {
//         saleId,
//         timestamp: serverTimestamp(),
//         items: formattedItems,
//         total,
//         profit,
//         ...(customerName && { customer: customerName })
//       }

//       transaction.set(saleDocRef, saleData)
//     })

//     // -------------------------
//     // 2. Update Inventory with a Write Batch (Non-transactional)
//     // -------------------------
//     const itemsRef = collection(db, 'Items')
//     const batch = writeBatch(db)

//     // For each inventory item, update based on the cart.
//     for (const item of filteredItems) {
//       if (!item.id) {
//         throw new Error(`Item is missing an id: ${item.name}`)
//       }
//       const itemDocRef = doc(itemsRef, item.id)
//       // Get the latest snapshot of the document.
//       const itemDocSnap = await getDoc(itemDocRef)
//       if (!itemDocSnap.exists()) {
//         throw new Error(`Item ${item.name} not found in inventory`)
//       }

//       const inventoryData = itemDocSnap.data()
//       let { cartons, pieces, totalPieces, piecesPerCarton } = inventoryData

//       for (const cartItem of item.inCart) {
//         const piecesFromCartons = cartItem.cartons * piecesPerCarton
//         if (cartItem.cartons) {
//           cartons -= cartItem.cartons
//           totalPieces -= piecesFromCartons
//         }
//         const individualPieces = cartItem.pieces - (cartItem.cartons ? piecesFromCartons : 0)
//         if (individualPieces > 0) {
//           pieces -= individualPieces
//           totalPieces -= individualPieces
//         }
//         if (cartons < 0 || pieces < 0 || totalPieces < 0) {
//           throw new Error(`Insufficient inventory for item ${item.name}`)
//         }
//       }
//       batch.update(itemDocRef, { cartons, pieces, totalPieces })
//     }

//     await batch.commit()

//     console.log('Checkout successfully processed!')
//     clearCart()
//   } catch (error) {
//     console.error('Checkout failed:', error)
//     alert(error.message)
//   }
// }

// const checkout = async () => {
//   try {
//     const salesRef = collection(db, 'Sales')
//     const itemsRef = collection(db, 'Items')

//     // Calculate total and profit
//     const total = calculateTotal()
//     const profit = calculateTotalProfit()

//     // Prepare customer information if selectedItem exists
//     let customerName = null

//     if (selectedItem) {
//       const { credit, name } = selectedItem

//       console.log('Available credit:', credit)

//       if (credit < total) {
//         alert('Not enough credits to complete this transaction.')
//         return // Abort transaction
//       }

//       // Deduct credits
//       const updatedCredits = credit - total

//       // Update credit value in Firestore
//       const selectedItemDocRef = doc(collection(db, 'Credits'), selectedItem.id)
//       await setDoc(selectedItemDocRef, { credit: updatedCredits }, { merge: true })

//       console.log(`Credits updated for ${name}. Remaining credits: ${updatedCredits}`)

//       customerName = name // Store the customer name
//     }

//     // Proceed with sale if no selectedItem or if credits are sufficient
//     // Fetch existing sales to determine the next sale number
//     const salesSnapshot = await getDocs(salesRef)
//     const saleCount = salesSnapshot.size + 1
//     const saleId = `Sale-${saleCount}`

//     // Format cart items to include only the necessary fields
//     const formattedItems = filteredItems.flatMap((item) =>
//       item.inCart
//         .filter((cartItem) => cartItem.cartons > 0 || cartItem.pieces > 0)
//         .map((cartItem) => ({
//           Name: item.name,
//           category: item.category,
//           price: cartItem.sellingPrice || 0,
//           cartons: cartItem.cartons || 0,
//           pcsPrCtn: item.piecesPerCarton || 0,
//           totalPieces: cartItem.pieces || 0,
//           individualPieces: cartItem.individualPieces || 0,
//           brokenCartons: cartItem.brokenCartons || 0,
//           remainingExtra: cartItem.remainingExtra || 0,
//           discount: cartItem.discount || 0,
//           total: cartItem.total.toFixed(2)
//         }))
//     )

//     // Initialize batch for atomic updates
//     const batch = writeBatch(db)

//     // --- Concurrently fetch inventory documents for each item ---
//     const itemDocsPromises = filteredItems.map(async (item) => {
//       const itemDocRef = doc(itemsRef, item.id)
//       const docSnap = await getDoc(itemDocRef)
//       return { item, docSnap }
//     })
//     const itemDocs = await Promise.all(itemDocsPromises)

//     // Iterate over each fetched document to update inventory for each cart item
//     for (const { item, docSnap } of itemDocs) {
//       if (!docSnap.exists()) {
//         console.error(`Item ${item.name} not found in inventory`)
//         continue
//       }

//       const inventoryData = docSnap.data()
//       console.log('inventory data', inventoryData)
//       const { cartons, pieces, totalPieces, piecesPerCarton } = inventoryData

//       // Process each cart item for the current item
//       for (const cartItem of item.inCart) {
//         let updatedCartons = cartons
//         let updatedPieces = pieces
//         let updatedTotal = totalPieces
//         const piecesFromCartons = cartItem.cartons * piecesPerCarton

//         // If cartons are sold, update inventory accordingly
//         if (cartItem.cartons) {
//           updatedCartons -= cartItem.cartons
//           updatedTotal -= piecesFromCartons
//         }

//         // For pieces sold individually (not derived from cartons)
//         const individualPieces = cartItem.pieces - (cartItem.cartons ? piecesFromCartons : 0)
//         if (individualPieces > 0) {
//           updatedPieces -= individualPieces
//           updatedTotal -= individualPieces
//         }

//         // Prevent negative inventory values
//         if (updatedCartons < 0 || updatedPieces < 0 || updatedTotal < 0) {
//           console.error(`Insufficient inventory for item ${cartItem.name}`)
//           continue
//         }

//         // Queue the inventory update in the batch
//         const itemDocRef = doc(itemsRef, item.id)
//         batch.update(itemDocRef, {
//           cartons: updatedCartons,
//           pieces: updatedPieces,
//           totalPieces: updatedTotal
//         })
//       }
//     }

//     // Commit batch updates
//     await batch.commit()

//     // Save the sale data
//     const docRef = doc(salesRef, saleId)
//     const saleData = {
//       saleId,
//       timestamp: serverTimestamp(),
//       items: formattedItems,
//       total,
//       profit
//     }

//     // Include customer field if available
//     if (customerName) {
//       saleData.customer = customerName
//     }

//     await setDoc(docRef, saleData)

//     console.log('Sale successfully recorded:', saleId)

//     // Clear the cart after checkout
//     clearCart()
//     setSelectedItem(null)
//   } catch (error) {
//     console.error('Error during checkout:', error)
//   }
// }
