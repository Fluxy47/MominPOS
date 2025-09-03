import React, { useState, useEffect } from 'react'
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  query,
  orderBy
} from 'firebase/firestore'
import { db } from '../../firebaseConfig'

const CreditSystem = () => {
  const [customers, setCustomers] = useState([])
  const [name, setName] = useState('')
  const [credit, setCredit] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch customers from Firestore
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const creditCollection = query(collection(db, 'Credits'), orderBy('timestamp', 'desc'))
        const creditSnapshot = await getDocs(creditCollection)
        const creditData = creditSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }))
        setCustomers(creditData)
        setLoading(false)
      } catch (error) {
        console.error('Error fetching credits:', error)
      }
    }

    fetchCustomers()
  }, [])

  // Add or update customer
  const handleAddOrUpdateCustomer = async () => {
    if (!name || !credit) {
      alert('Please fill in both name and credit.')
      return
    }

    try {
      if (editingId) {
        // Update existing customer
        const docRef = doc(db, 'Credits', editingId)
        await updateDoc(docRef, {
          name,
          credit: parseFloat(credit)
        })
        setCustomers((prev) =>
          prev.map((customer) =>
            customer.id === editingId ? { ...customer, name, credit: parseFloat(credit) } : customer
          )
        )
        setEditingId(null)
      } else {
        // Add new customer
        const newCredit = {
          name,
          credit: parseFloat(credit),
          timestamp: Timestamp.now()
        }
        const docRef = await addDoc(collection(db, 'Credits'), newCredit)
        setCustomers([{ id: docRef.id, ...newCredit }, ...customers])
      }
      setName('')
      setCredit('')
    } catch (error) {
      console.error('Error adding/updating customer:', error)
    }
  }

  // Delete customer
  const handleDeleteCustomer = async (id) => {
    try {
      await deleteDoc(doc(db, 'Credits', id))
      setCustomers((prev) => prev.filter((customer) => customer.id !== id))
    } catch (error) {
      console.error('Error deleting customer:', error)
    }
  }

  // Start editing customer
  const handleEditCustomer = (customer) => {
    setName(customer.name)
    setCredit(customer.credit.toString())
    setEditingId(customer.id)
  }

  return (
    <div className="p-6 text-white">
      <h1 className="text-3xl font-semibold mb-6">Credit System</h1>

      {/* Form to Add or Edit Customer */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <input
          type="text"
          placeholder="Customer Name"
          className="border border-gray-300 rounded-md p-2 w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          type="number"
          placeholder="Credit Amount"
          className="border border-gray-300 rounded-md p-2 w-full"
          value={credit}
          onChange={(e) => setCredit(e.target.value)}
        />
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          onClick={handleAddOrUpdateCustomer}
        >
          {editingId ? 'Update Credit' : 'Add Credit'}
        </button>
      </div>

      {loading ? (
        <p className="text-center text-gray-500">Loading credits...</p>
      ) : customers.length === 0 ? (
        <p className="text-center text-gray-500">No customers found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {customers.map((customer) => (
            <div
              key={customer.id}
              className="bg-white shadow rounded-lg p-4 border border-gray-200"
            >
              <h2 className="text-lg font-semibold text-gray-700">{customer.name}</h2>
              <p className="text-sm text-gray-500">Credit: Rs.{customer.credit.toFixed(2)}</p>
              <p className="text-xs text-gray-400 mt-2">
                Added on:{' '}
                {customer.timestamp instanceof Timestamp
                  ? customer.timestamp.toDate().toLocaleString()
                  : new Date(customer.timestamp).toLocaleString()}
              </p>
              <div className="mt-4 flex justify-between">
                <button
                  className="text-blue-500 hover:underline"
                  onClick={() => handleEditCustomer(customer)}
                >
                  Edit
                </button>
                <button
                  className="text-red-500 hover:underline"
                  onClick={() => handleDeleteCustomer(customer.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default CreditSystem
