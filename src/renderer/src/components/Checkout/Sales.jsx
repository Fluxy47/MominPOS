import React, { useState, useEffect } from 'react'
import { db } from '../../firebaseConfig'
import { collection, getDocs, addDoc } from 'firebase/firestore'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { motion } from 'motion/react'
import Cart from './Cart'
import { useLocation } from 'react-router-dom'

function Sales() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [filteredItems, setFilteredItems] = useState([])
  console.log('filter', filteredItems)
  const [loading, setLoading] = useState(true)
  const location = useLocation()
  // const [editingSale, setEditingSale] = useState(null)

  const [editingSale, setEditingSale] = useState(location.state?.editingSale || null)
  // console.log('editing sale', editingSale)

  useEffect(() => {
    // Clear location state after reading it, so that a refresh doesn't have it
    if (location.state?.editingSale) {
      window.history.replaceState({}, document.title)
    }
  }, [location])

  // Fetch items and categories from Firestore
  // Function to fetch items from Firestore.
  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true)
        const itemsCollection = collection(db, 'Items')
        const itemsSnapshot = await getDocs(itemsCollection)

        // Map and initialize items
        let itemsData = itemsSnapshot.docs.map((doc) => {
          const data = doc.data()

          // Baseline values from Firestore
          const baseCartons = data.cartons || 0
          const basePieces = data.pieces || 0
          const ppc = data.piecesPerCarton || 1 // default to 1 if missing

          return {
            id: doc.id,
            name: data.name || 'Unknown',
            category: data.category || 'Uncategorized',
            actualPrice: data.actualPrice || 0,
            sellingPrice: data.sellingPrice || 0,
            // LIVE inventory (will change in the UI)
            cartons: baseCartons,
            pieces: basePieces,
            // — Immutable originals — always fed into allocateRequest
            originalCartons: baseCartons,
            originalPieces: basePieces,
            piecesPerCarton: ppc,
            totalPieces: data.totalPieces || 0,
            inCart: [
              {
                cartons: 0,
                pieces: 0,
                individualPieces: 0, // number of loose pieces in cart
                brokenCartons: 0,
                sellingPrice: data.sellingPrice || 0,
                actualPrice: data.actualPrice || 0,
                discount: 0,
                total: 0,
                totalPieces: data.totalPieces || 0,
                totalcartons: data.cartons || 0,

                unitsPerCarton: data.unitsPerCarton || 0
                // TotalindividualPieces: data.pieces || 0,
                // remainingExtra: 0,
              }
            ]
          }
        })

        // If editingSales exists, update itemsData _before_ setting state
        if (editingSale) {
          itemsData = itemsData.map((item) => {
            const saleItem = editingSale.items.find(
              (s) => s.Name?.toLowerCase() === item.name?.toLowerCase()
            )
            if (saleItem) {
              return {
                ...item,
                inCart: [
                  {
                    cartons: saleItem.cartons,
                    ...item.inCart[0],
                    // cartons: saleItem.cartons,
                    pieces: saleItem.totalPieces,
                    discount: saleItem.discount || 0
                  }
                ]
              }
            }
            return item
          })
        }

        setItems(itemsData)
        setFilteredItems(itemsData)

        const uniqueCategories = [
          'All',
          ...new Set(itemsData.map((item) => item.category).filter(Boolean))
        ]
        setCategories(uniqueCategories)
      } catch (error) {
        console.error('Error fetching items:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchItems()
  }, [])

  const handleCategoryClick = (category) => {
    setSelectedCategory(category)
    if (category === 'All') {
      setFilteredItems(items)
    } else {
      setFilteredItems(items.filter((item) => item.category === category))
    }
  }

  // Filter items based on search query and selected category
  useEffect(() => {
    let updatedItems = items

    if (selectedCategory !== 'All') {
      updatedItems = updatedItems.filter((item) => item.category === selectedCategory)
    }

    if (searchQuery.trim() !== '') {
      updatedItems = updatedItems.filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredItems(updatedItems)
  }, [searchQuery, selectedCategory, items])

  const [quantity, setQuantities] = useState({}) // State to track input quantities by item id

  const handleQuantityChange = (id, value) => {
    // Allow empty values and update state
    setQuantities((prevQuantity) => ({
      ...prevQuantity,
      [id]: value // Update the value for the specific item
    }))
  }

  /**
   * Given current stock and a request, compute:
   * - how many full cartons to allocate
   * - how many cartons to break (and thus extra loose pieces)
   * - how many loose pieces to allocate
   * - what stock remains (cartons & pieces)
   *
   * All counts are non‐negative integers.
   */
  function allocateRequest({
    stockCartons,
    stockPieces,
    piecesPerCarton,
    requestCartons,
    requestPieces
  }) {
    const neededPieces = requestCartons * piecesPerCarton + requestPieces
    const totalStockPieces = stockCartons * piecesPerCarton + stockPieces

    if (neededPieces > totalStockPieces) {
      return { success: false, error: 'Not enough total stock' }
    }

    // Whole cartons
    const giveWholeCartons = Math.min(requestCartons, stockCartons)

    // Remaining after whole cartons
    let remCartons = stockCartons - giveWholeCartons
    let remPieces = stockPieces
    let piecesNeeded = neededPieces - giveWholeCartons * piecesPerCarton

    // Loose pieces
    const giveLoose = Math.min(piecesNeeded, remPieces)
    remPieces -= giveLoose
    piecesNeeded -= giveLoose

    // Break cartons if needed
    const cartonsToBreak = piecesNeeded > 0 ? Math.ceil(piecesNeeded / piecesPerCarton) : 0

    remCartons -= cartonsToBreak
    const brokenPiecesTotal = cartonsToBreak * piecesPerCarton
    const useFromBroken = piecesNeeded
    const leftoverLooseFromBroken = brokenPiecesTotal - useFromBroken
    remPieces += leftoverLooseFromBroken

    return {
      success: true,
      allocated: {
        cartons: giveWholeCartons,
        pieces: giveLoose + useFromBroken,
        brokenCartons: cartonsToBreak
      },
      remainingStock: {
        cartons: remCartons,
        pieces: remPieces
      }
    }
  }

  /**
   * 2) A helper that, given original stock + old request + new request,
   *    computes exactly what delta to apply so you can update your live state.
   */
  function reconcileRequests(originalStock, oldReq, newReq) {
    const oldRes = allocateRequest({ ...originalStock, ...oldReq })
    const newRes = allocateRequest({ ...originalStock, ...newReq })

    if (!oldRes.success) throw new Error(oldRes.error)
    if (!newRes.success) throw new Error(newRes.error)

    // Compute difference in allocated amounts:
    const delta = {
      cartons: newRes.allocated.cartons - oldRes.allocated.cartons,
      pieces: newRes.allocated.pieces - oldRes.allocated.pieces,
      brokenCartons: newRes.allocated.brokenCartons - oldRes.allocated.brokenCartons
    }

    // Apply that delta to the old remainingStock
    const updatedStock = {
      cartons: newRes.remainingStock.cartons,
      pieces: newRes.remainingStock.pieces
    }

    return {
      oldRes,
      newRes,
      delta,
      updatedStock
    }
  }

  // // --- Now run your exact scenario ---
  // const originalStock = { stockCartons: 5, stockPieces: 4, piecesPerCarton: 3 }
  // const oldReq = { requestCartons: 2, requestPieces: 5 }
  // const newReq = { requestCartons: 2, requestPieces: 3 }

  // console.clear()
  // const { oldRes, newRes, delta, updatedStock } = reconcileRequests(originalStock, oldReq, newReq)

  // // Clear any old output
  // console.clear()

  // // Log each with a clear label
  // console.log('🍀 Initial Allocation:', oldRes)
  // console.log('🎯 New Allocation:', newRes)
  // console.log('🔀 Delta to Apply:', delta)
  // console.log('📦 Stock After Reversal:', updatedStock)

  // // (Optionally, for a quick tabular view of the stock object)
  // console.table(updatedStock)

  function updateItemsState(itemId, allocated, remainingStock, userInput = {}) {
    setFilteredItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item

        const { cartons: cartonsInCart, pieces: allocLoose, brokenCartons } = allocated
        const { cartons: userCartons, individualPieces: userLoose } = userInput

        // Use the user‑entered loose pieces, not allocLoose:
        const loose = userLoose != null ? userLoose : allocLoose
        const cart = userCartons != null ? userCartons : cartonsInCart
        const total = cart * item.piecesPerCarton + loose

        const newCart = {
          ...item.inCart[0],
          cartons: cart,
          individualPieces: loose, // now exactly what user typed
          brokenCartons, // for display
          pieces: total, // totalPieces for display
          totalPrice: total * item.sellingPrice
        }

        return {
          ...item,
          inCart: [newCart],

          // inventory
          cartons: remainingStock.cartons,
          pieces: remainingStock.pieces,

          totalPieces: remainingStock.cartons * item.piecesPerCarton + remainingStock.pieces
        }
      })
    )
  }

  function addToCart(item, rawQty, isCarton) {
    const qty = parseInt(rawQty, 10) || 1
    if (qty < 1) {
      alert('Enter a positive number')
      return
    }

    const prev = item.inCart[0]
    const desiredCartons = prev.cartons + (isCarton ? qty : 0)
    const desiredIndividual = prev.individualPieces + (isCarton ? 0 : qty)

    const result = allocateRequest({
      stockCartons: item.originalCartons,
      stockPieces: item.originalPieces,
      piecesPerCarton: item.piecesPerCarton,
      requestCartons: desiredCartons,
      requestPieces: desiredIndividual
    })

    if (!result.success) {
      alert(result.error)
      return
    }

    // Write both inCart AND inventory back in one go
    updateItemsState(item.id, result.allocated, result.remainingStock)

    clearInputFor(item.id)
  }

  function handleInputChange(itemId, newCartons, newLoose) {
    const item = filteredItems.find((i) => i.id === itemId)
    if (!item) return

    // 1) Call the allocator with originalStock + what the user has cumulatively requested:
    const result = allocateRequest({
      stockCartons: item.originalCartons,
      stockPieces: item.originalPieces,
      piecesPerCarton: item.piecesPerCarton,
      requestCartons: newCartons,
      requestPieces: newLoose
    })

    if (!result.success) {
      alert(result.error)
      return
    }

    // 2) Now update state, passing the raw user inputs along
    updateItemsState(itemId, result.allocated, result.remainingStock, {
      cartons: newCartons,
      individualPieces: newLoose
    })
  }

  const resetCartItem = (cartItem) => ({
    ...cartItem,
    cartons: 0,
    pieces: 0,
    discount: 0,
    brokenCartons: 0,
    total: 0
    // totalPieces and totalCartons are intentionally left untouched
  })

  const clearCart = () => {
    setFilteredItems((prevFilteredItems) =>
      prevFilteredItems.map((item) => {
        const cartItem = item.inCart[0]
        let returnedCartons
        let returnedPieces

        if (cartItem && (cartItem.cartons > 0 || cartItem.pieces > 0)) {
          // Return cartons to `cartons`
          returnedCartons = cartItem.cartons
          const cartonsToPieces = returnedCartons * item.piecesPerCarton

          // Return individual pieces
          returnedPieces = cartItem.pieces - cartonsToPieces

          if (cartItem.brokenCartons > 0) {
            returnedCartons += cartItem.brokenCartons

            const cartonpieces = returnedCartons * item.piecesPerCarton

            returnedPieces = cartItem.pieces - cartonpieces
          }

          // Update the quantities
          return {
            ...item,
            cartons: item.cartons + returnedCartons, // Return cartons
            pieces: item.pieces + returnedPieces, // Return individual pieces (ensure no negative values)
            totalPieces: item.totalPieces + cartItem.pieces, // Update total pieces
            inCart: [resetCartItem(cartItem)] // Reset inCart
          }
        }
        return item // Leave items unchanged if no adjustments needed
      })
    )
  }

  const removeItem = (itemId) => {
    setFilteredItems((prevFilteredItems) =>
      prevFilteredItems.map((item) => {
        if (item.id === itemId) {
          // Access the first `inCart` entry
          const cartItem = item.inCart[0]
          let returnedCartons
          let returnedPieces

          if (cartItem && (cartItem.cartons > 0 || cartItem.pieces > 0)) {
            // Return cartons to `cartons`
            returnedCartons = cartItem.cartons
            const cartonsToPieces = returnedCartons * item.piecesPerCarton

            // Return individual pieces
            returnedPieces = cartItem.pieces - cartonsToPieces

            if (cartItem.brokenCartons > 0) {
              returnedCartons += cartItem.brokenCartons

              const cartonpieces = returnedCartons * item.piecesPerCarton

              returnedPieces = cartItem.pieces - cartonpieces
            }

            // Update the quantities
            return {
              ...item,
              cartons: item.cartons + returnedCartons, // Return cartons
              pieces: item.pieces + returnedPieces, // Return individual pieces (ensure no negative values)
              totalPieces: item.totalPieces + cartItem.pieces, // Update total pieces
              inCart: [resetCartItem(cartItem)] // Reset inCart
            }
          }
        }
        return item // Leave other items unchanged
      })
    )
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-100">
      {/* Left Side: Items */}
      <div className="flex-1 p-6 border-2 border-black overflow-y-auto">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Cart</h1>
          <input
            type="text"
            placeholder="Search items..."
            className="px-4 py-2 border border-gray-300 rounded focus:outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </header>

        {/* Categories Header */}
        <div className="relative w-full mb-8 overflow-hidden">
          <motion.div
            className="flex gap-4"
            drag="x"
            dragConstraints={{ left: -100, right: 0 }}
            dragElastic={0.1}
            style={{ cursor: 'grab' }}
          >
            {loading
              ? Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} width={100} height={40} className="rounded" />
                ))
              : categories.map((category) => (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={category}
                    className={`px-4 py-2 rounded whitespace-nowrap ${
                      selectedCategory === category
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-800'
                    } hover:bg-blue-300`}
                    onClick={() => handleCategoryClick(category)}
                  >
                    {category}
                  </motion.button>
                ))}
          </motion.div>
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="p-4 bg-white rounded shadow-md hover:shadow-lg">
                <Skeleton height={20} width="70%" className="mb-2" />
                <Skeleton height={15} width="50%" className="mb-1" />
                <Skeleton height={15} width="40%" />
                <Skeleton height={35} width="100%" className="mt-3 rounded bg-blue-200" />
              </div>
            ))
          ) : filteredItems.length === 0 ? (
            <div className="col-span-full text-center text-gray-500 text-lg font-semibold py-10">
              No items found in inventory.
            </div>
          ) : (
            filteredItems.map((item) => (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                key={item.id}
                className="p-4 bg-white rounded shadow hover:shadow-lg"
              >
                <h2 className="font-bold text-gray-800">{item.name}</h2>
                <p className="text-gray-600">Price: ${item.sellingPrice.toFixed(2)}</p>
                <p className="text-gray-600">Indiv Pieces: {item.pieces}</p>
                <p className="text-gray-600">Ctn: {item.cartons}</p>
                <p className="text-gray-600">PcsPrCtn: {item.piecesPerCarton}</p>
                <p className="text-gray-600">Total Pieces: {item.totalPieces}</p>
                <div className="flex flex-col gap-2 mt-2">
                  <input
                    type="number"
                    min="1"
                    value={quantity[item.id] || ''}
                    placeholder="Enter quantity"
                    className="border p-1 rounded"
                    onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                  />
                  <div className="flex justify-between">
                    <button
                      className="px-2 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                      onClick={() => addToCart(item, quantity[item.id], true)}
                      disabled={item.cartons <= 0}
                    >
                      Add Ctn
                    </button>
                    <button
                      className="px-2 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                      onClick={() => addToCart(item, quantity[item.id], false)}
                    >
                      Add Pcs
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
      {/* Right Side: Cart */}
      <Cart
        filteredItems={filteredItems}
        setFilteredItems={setFilteredItems}
        handleInputChange={handleInputChange}
        removeItem={removeItem}
        clearCart={clearCart}
        editingSale={editingSale}
        setEditingSale={setEditingSale}
      />
    </div>
  )
}

export default Sales

// const handleInputChange = (id, field, value, cartIndex = 0) => {
//   const updatedValue = parseInt(value, 10) || 0 // Ensure value is a number or default to 0

//   setFilteredItems((prevFilteredItems) =>
//     prevFilteredItems.map((item) => {
//       if (item.id !== id) return item

//       const piecesPerCarton = item.piecesPerCarton
//       let totalCarton
//       let totalPieces
//       let IndividualPieces
//       let updatedIndivPieces
//       let result

//       const updatedInCart = item.inCart.map((cartItem, index) => {
//         if (index !== cartIndex) {
//           return cartItem
//         }
//         totalCarton = cartItem.totalcartons
//         totalPieces = cartItem.totalPieces
//         IndividualPieces = cartItem.TotalindividualPieces
//         const currentCartons = cartItem.cartons || 0
//         const currentIndivPieces = cartItem.individualPieces || 0

//         let updatedCartons = cartItem.cartons || 0
//         updatedIndivPieces = currentIndivPieces
//         let updatedPieces = cartItem.pieces || 0
//         let brokenCartons = cartItem.brokenCartons || 0 // Preserve previous value
//         let remainingExtra = cartItem.remainingExtra

//         if (field === 'cartons') {
//           updatedCartons = updatedValue
//           updatedPieces = updatedCartons * piecesPerCarton + updatedIndivPieces //+ IndivPieces // Update pieces based on cartons
//         } else if (field === 'pieces') {
//           const newTotalPieces = updatedValue
//           console.log('blah', newTotalPieces)
//           const piecesFromCartons = currentCartons * piecesPerCarton
//           updatedIndivPieces = Math.max(newTotalPieces - piecesFromCartons, 0)
//           console.log('new blah', updatedIndivPieces)

//           if (newTotalPieces > IndividualPieces) {
//             // Additional pieces needed after exhausting current individual pieces
//             const additionalPiecesNeeded = updatedIndivPieces - IndividualPieces
//             console.log('kitne chaiye?', additionalPiecesNeeded)

//             // Attempt to break cartons to fulfill the requirement
//             result = breakCartons(totalCarton, additionalPiecesNeeded, piecesPerCarton)

//             if (!result.success) {
//               alert('Not enough stock available!')
//               return cartItem // Return unchanged cartItem if breaking cartons fails
//             }
//             console.log('result ke andr', result.brokenCartons)

//             brokenCartons = result.brokenCartons
//             console.log('vvariable mn', brokenCartons)
//             console.log('result', result.updatedPieces)
//             remainingExtra = result.updatedPieces
//             // extraPiecesAcc = updatedIndivPieces - IndividualPieces
//             console.log('insidebroken', brokenCartons)
//             console.log('insideexta', remainingExtra)
//           }
//           // else {
//           //   // Ensure individual pieces are valid after accounting for cartons
//           //   updatedIndivPieces = Math.max(newTotalPieces - piecesFromCartons, 0)
//           // }

//           // Update total pieces in the cart
//           updatedPieces = newTotalPieces
//         }

//         return {
//           ...cartItem,
//           cartons: updatedCartons,
//           individualPieces: updatedIndivPieces,
//           pieces: updatedPieces,
//           brokenCartons: brokenCartons,
//           remainingExtra: remainingExtra
//         }
//       })

//       // Calculate remaining cartons in the state after deducting those added to cart
//       const totalCartonsInCart = updatedInCart.reduce((sum, cartItem) => sum + cartItem.cartons, 0)

//       const totalPiecesInCart = updatedInCart.reduce((sum, cartItem) => sum + cartItem.pieces, 0)
//       const totalBrokenCartons = updatedInCart.reduce(
//         (sum, cartItem) => sum + (cartItem.brokenCartons || 0),
//         0
//       )
//       console.log('total broken', totalBrokenCartons)
//       const TotalextraPieces = updatedInCart.reduce(
//         (sum, cartItem) => sum + (cartItem.remainingExtra || 0),
//         0
//       )
//       console.log('totalextrapieces', TotalextraPieces)
//       const remainingCartons = Math.max(totalCarton - totalCartonsInCart - totalBrokenCartons, 0)
//       // Ensure no negative values

//       const remainingPieces = Math.max(IndividualPieces - updatedIndivPieces, 0)

//       const remainingTotalPieces = Math.max(totalPieces - totalPiecesInCart, 0)
//       console.log('remaining Pieces', remainingPieces + TotalextraPieces)

//       return {
//         ...item,
//         cartons: remainingCartons,
//         pieces: remainingPieces + TotalextraPieces,
//         totalPieces: remainingTotalPieces,
//         inCart: updatedInCart
//       }
//     })
//   )
// }
