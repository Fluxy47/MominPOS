import React, { useState, useEffect, useRef, useCallback } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../firebaseConfig'

const SearchCredits = ({
  selectedItem,
  setSelectedItem,
  allItems,
  setAllItems,
  editingSale // editingSale should include a property `customer`
}) => {
  const [searchText, setSearchText] = useState('') // Stores user input
  const filteredItems = useRef([]) // Stores filtered items to avoid frequent re-renders
  console.log('editing sale', editingSale)

  // Fetch all documents on component mount
  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const creditsCollection = collection(db, 'Credits')
        const querySnapshot = await getDocs(creditsCollection)
        const fetchedItems = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }))
        setAllItems(fetchedItems) // Store all items for filtering
      } catch (error) {
        console.error('Error fetching documents:', error)
      }
    }

    fetchCredits()
  }, [setAllItems])

  // Optimized search/filter query when the user types
  useEffect(() => {
    const query = searchText.trim().toLowerCase()

    if (!query) {
      filteredItems.current = []
    } else {
      // Create a regex that matches letters in the sequence
      const regex = new RegExp(query.split('').join('.*'), 'i')
      filteredItems.current = allItems.filter((item) => regex.test(item.name))
    }
  }, [searchText, allItems])

  // Define handleSelectItem with useCallback to avoid re-creation on every render
  const handleSelectItem = useCallback(
    (item) => {
      console.log('Selected item:', item)
      setSelectedItem(item)
      setSearchText('')
    },
    [setSelectedItem]
  )

  // Auto-select the item if editingSale.customer exists and the item is found.
  // We include editingSale in the dependency array in case it changes.

  useEffect(() => {
    // If editingSale or editingSale.customer isn't set, exit early.
    if (!editingSale || !editingSale.customer) return
    if (allItems.length === 0) return

    const customerName = editingSale.customer.trim().toLowerCase()
    const matchedItem = allItems.find(
      (item) => item.name && item.name.trim().toLowerCase() === customerName
    )
    console.log('matchedItem:', matchedItem)
    if (matchedItem) {
      handleSelectItem(matchedItem)
    }
  }, [editingSale, allItems, handleSelectItem])

  return (
    <div className="border-b w-full bg-white flex justify-between">
      <div className="p-4 border-gray-300 flex justify-center items-center">
        <h2 className="text-2xl font-bold">Cart</h2>
      </div>
      <div className="p-4 relative">
        <div className="flex flex-col relative">
          {!selectedItem ? (
            <>
              <input
                type="text"
                placeholder="Search by name"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
              <section className="absolute bg-red-100 border border-gray-300 rounded mt-1 w-full z-10 max-h-60 overflow-y-auto shadow-lg top-10">
                {filteredItems.current.map((item) => (
                  <div
                    key={item.id}
                    className="cursor-pointer hover:bg-red-200 p-2"
                    onClick={() => handleSelectItem(item)}
                  >
                    {item.name}
                  </div>
                ))}
              </section>
            </>
          ) : (
            <div className="flex gap-[5px]">
              <button
                onClick={() => setSelectedItem(null)}
                className="bg-red-500 text-white px-4 py-2 rounded shadow hover:bg-red-600 transition"
              >
                Unselect
              </button>
              <div className="flex gap-[2em] bg-gray-100 p-4 rounded border border-gray-300 ">
                <div className="flex gap-[5px]">
                  <p className="font-bold">Selected:</p>
                  <p>{selectedItem.name}</p>
                </div>
                <div className="flex gap-[5px]">
                  <p className="font-bold">Credit:</p>
                  <p>{selectedItem.credit}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SearchCredits
