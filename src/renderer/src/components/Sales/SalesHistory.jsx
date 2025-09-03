import React, { useEffect, useState } from 'react'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../../firebaseConfig'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'

const SalesHistory = () => {
  const [sales, setSales] = useState([])
  const [filteredSales, setFilteredSales] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [filterId, setFilterId] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [filterStartTime, setFilterStartTime] = useState('')
  const [filterEndTime, setFilterEndTime] = useState('')

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  useEffect(() => {
    // Fetch sales data from Firestore
    const fetchSales = async () => {
      try {
        const salesCollection = query(collection(db, 'Sales'), orderBy('timestamp', 'desc'))
        const salesSnapshot = await getDocs(salesCollection)
        const salesData = salesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }))
        setSales(salesData)
        setFilteredSales(salesData)
        setLoading(false)
      } catch (error) {
        console.error('Error fetching sales data:', error)
      }
    }

    fetchSales()
  }, [])

  // Apply filters
  useEffect(() => {
    let filtered = sales

    if (filterId) {
      filtered = filtered.filter((sale) =>
        sale.saleId.toLowerCase().includes(filterId.toLowerCase())
      )
    }

    if (filterDate) {
      const selectedDate = new Date(filterDate).toDateString()
      filtered = filtered.filter(
        (sale) => new Date(sale.timestamp?.toDate()).toDateString() === selectedDate
      )
    }

    if (filterStartTime || filterEndTime) {
      filtered = filtered.filter((sale) => {
        const saleTime = new Date(sale.timestamp?.toDate())
        const saleMinutes = saleTime.getHours() * 60 + saleTime.getMinutes()

        const [startHours = 0, startMinutes = 0] = filterStartTime
          ? filterStartTime.split(':').map(Number)
          : []
        const [endHours = 23, endMinutes = 59] = filterEndTime
          ? filterEndTime.split(':').map(Number)
          : []

        const startInMinutes = startHours * 60 + startMinutes
        const endInMinutes = endHours * 60 + endMinutes

        return saleMinutes >= startInMinutes && saleMinutes <= endInMinutes
      })
    }

    setFilteredSales(filtered)
  }, [filterId, filterDate, filterStartTime, filterEndTime, sales])

  const clearFilters = () => {
    setFilterId('')
    setFilterDate('')
    setFilterStartTime('')
    setFilterEndTime('')
  }

  const getQuantityDisplay = (item) => {
    const { cartons, totalPieces, pcsPrCtn } = item

    if (cartons > 0 && totalPieces % pcsPrCtn === 0) {
      return `${cartons} carton(s) (${pcsPrCtn} pieces per carton)`
    } else if (cartons > 0 && totalPieces % pcsPrCtn !== 0) {
      const remainingPieces = totalPieces % pcsPrCtn
      return `${cartons} carton(s) (${pcsPrCtn} pieces per carton) and ${remainingPieces} piece(s)`
    } else {
      return `${totalPieces} piece(s)`
    }
  }

  const navigate = useNavigate()

  // const handleEditSale = (sale) => {
  //   navigate('/Checkout', { state: { editingSale: sale } })
  // }

  const handleEditSale = (saleId) => {
    navigate(`/checkout?saleId=${saleId}`)
  }

  return (
    <div className="p-4 md:p-8  mx-auto">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl md:text-4xl font-bold mb-6 md:mb-10 text-white"
      >
        Sales History
      </motion.h1>

      {/* Filters */}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
      >
        <div className="space-y-1">
          <label className="text-sm font-medium text-white">Sale ID</label>
          <input
            type="text"
            placeholder="Filter by Sale ID"
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            value={filterId}
            onChange={(e) => setFilterId(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-white">Date</label>
          <input
            type="date"
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-white">Start Time</label>
          <input
            type="time"
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            value={filterStartTime}
            onChange={(e) => setFilterStartTime(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-white">End Time</label>
          <input
            type="time"
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            value={filterEndTime}
            onChange={(e) => setFilterEndTime(e.target.value)}
          />
        </div>

        <div className="flex items-end">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-white rounded-lg transition-colors font-medium"
            onClick={clearFilters}
          >
            Clear Filters
          </motion.button>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      ) : filteredSales.length === 0 ? (
        <p className="text-center text-gray-500">No sales found.</p>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5 md:gap-7"
        >
          {filteredSales.map((sale) => (
            <motion.div
              key={sale.id}
              variants={itemVariants}
              whileHover={{
                y: -5,
                transition: { duration: 0.2 }
              }}
              className="group relative bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 p-5 md:p-7 border border-gray-200"
            >
              <div className="flex flex-col gap-4">
                {/* Card Header */}
                <div className="flex justify-between items-start">
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-semibold text-gray-500">Sale ID</h3>
                    <p className="text-base font-medium text-gray-900 break-all">{sale.saleId}</p>
                    <time className="text-sm text-gray-500">
                      {sale.timestamp ? new Date(sale.timestamp.toDate()).toLocaleString() : 'N/A'}
                    </time>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    onClick={() => handleEditSale(sale.id)}
                    className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors shadow-sm"
                  >
                    Edit
                  </motion.button>
                </div>

                {/* Customer Section */}
                {sale.customer && (
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-semibold text-gray-500">Customer</h3>
                    <p className="text-base text-gray-900 truncate">{sale.customer}</p>
                  </div>
                )}

                {/* Items List */}
                <div className="space-y-2.5">
                  <h3 className="text-sm font-semibold text-gray-500">Items</h3>
                  <ul className="space-y-2.5">
                    {sale.items.map((item, index) => (
                      <li
                        key={index}
                        className="flex justify-between items-center text-sm text-gray-900 group-hover:text-gray-700 transition-colors"
                      >
                        <span className="truncate max-w-[65%]">{item.Name}</span>
                        <span className="text-gray-600">
                          {getQuantityDisplay(item)} × Rs.{item.price.toFixed(2)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Total Section */}
                <div className="pt-5 space-y-2.5 border-t border-gray-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Profit</span>
                    <span className="font-medium text-gray-900">Rs.{sale.profit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">Total</span>
                    <span className="font-bold text-green-600 text-lg">
                      Rs.{sale.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}

export default SalesHistory
