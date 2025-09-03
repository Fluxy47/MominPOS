import React, { useEffect, useState } from 'react'
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '../../firebaseConfig'
import InventoryAlert from './InventoryAlert'

const OverviewPage = ({ setItemId }) => {
  const [salesToday, setSalesToday] = useState(0)
  const [profitToday, setProfitToday] = useState(0)
  const [profitMonth, setProfitMonth] = useState(0)

  async function getTodaysProfit() {
    try {
      const now = new Date()

      // Calculate start and end of day in UTC
      const startOfDay = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0)
      )
      const endOfDay = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)
      )

      const startTimestamp = Timestamp.fromDate(startOfDay)
      const endTimestamp = Timestamp.fromDate(endOfDay)

      const salesRef = collection(db, 'Sales')
      const salesQuery = query(
        salesRef,
        where('timestamp', '>=', startTimestamp),
        where('timestamp', '<', endTimestamp)
      )

      const snapshot = await getDocs(salesQuery)

      // Sum profit for today
      let totalProfit = 0
      snapshot.forEach((doc) => {
        totalProfit += doc.data().profit || 0
      })

      setProfitToday(totalProfit)
    } catch (error) {
      console.error("Error fetching today's profit:", error)
    }
  }

  async function getMonthlyProfit() {
    try {
      const now = new Date()

      // Calculate start and end of the month in UTC
      const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0))
      const endOfMonth = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth() + 1, // Next month
          0, // Last day of the current month
          23,
          59,
          59,
          999
        )
      )

      const startTimestamp = Timestamp.fromDate(startOfMonth)
      const endTimestamp = Timestamp.fromDate(endOfMonth)

      const salesRef = collection(db, 'Sales')
      const salesQuery = query(
        salesRef,
        where('timestamp', '>=', startTimestamp),
        where('timestamp', '<=', endTimestamp)
      )

      const snapshot = await getDocs(salesQuery)

      // Sum profit for the month
      let totalProfit = 0
      snapshot.forEach((doc) => {
        totalProfit += doc.data().profit || 0
      })

      setProfitMonth(totalProfit)
    } catch (error) {
      console.error('Error fetching monthly profit:', error)
    }
  }

  async function getTodaysSales() {
    try {
      const now = new Date()

      const startOfDay = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0)
      )
      const endOfDay = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)
      )

      const startTimestamp = Timestamp.fromDate(startOfDay)
      const endTimestamp = Timestamp.fromDate(endOfDay)

      const salesRef = collection(db, 'Sales')
      const salesQuery = query(
        salesRef,
        where('timestamp', '>=', startTimestamp),
        where('timestamp', '<', endTimestamp)
      )

      const snapshot = await getDocs(salesQuery)

      const totalSales = snapshot.size
      setSalesToday(totalSales)
    } catch (error) {
      console.error("Error fetching today's sales:", error)
    }
  }

  useEffect(() => {
    getTodaysSales()
    getTodaysProfit()
    getMonthlyProfit()
  }, [])

  return (
    <div className="p-8 min-h-screen">
      <h1 className="text-4xl font-bold mb-6 text-[#f5f5f4]">Dashboard Overview</h1>

      <div className="grid lg:grid-cols-3 sm:grid-cols-1 gap-6 mb-8">
        <div className="bg-[#E8C999] text-white p-6 rounded-lg shadow-lg flex flex-col justify-between">
          <h2 className="text-xl font-semibold">Sales Today</h2>
          <p className="text-4xl font-bold mt-2">{salesToday}</p>
        </div>
        <div className="bg-[#8E1616] text-white p-6 rounded-lg shadow-lg flex flex-col justify-between">
          <h2 className="text-xl font-semibold">Profit Today</h2>
          <p className="text-4xl font-bold mt-2">${profitToday.toFixed(2)}</p>
        </div>
        <div className="bg-[#E8C999] text-white p-6 rounded-lg shadow-lg flex flex-col justify-between">
          <h2 className="text-xl font-semibold">Profit This Month</h2>
          <p className="text-4xl font-bold mt-2">${profitMonth.toFixed(2)}</p>
        </div>
      </div>
      <InventoryAlert setItemId={setItemId} />
    </div>
  )
}

export default OverviewPage
