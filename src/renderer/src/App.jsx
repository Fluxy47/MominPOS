import { Route, Routes } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAutoUpdate } from './useAutoUpdate'
import { Modal, Button, Spinner, Toast } from 'flowbite-react'
import Navbar from './components/Navbar'
import { motion } from 'framer-motion'
import Sales from './components/Checkout/Sales'
import CreditSystem from './components/Credit/CreditSystem'
import Inventory from './components/Inventory/Inventory'
import Login from './components/Login/Login'
import ProtectedRoute from './components/Login/ProtectedRoute'
import OverviewPage from './components/Overview/Overview'
import SalesHistory from './components/Sales/SalesHistory'

function App() {
  const [selectedItemId, setSelectedItemId] = useState(null)
  const { updateAvailable, downloaded, progress, installUpdate } = useAutoUpdate()
  const [showModal, setShowModal] = useState(false)

  // Show modal when downloaded
  useEffect(() => {
    if (downloaded) setShowModal(true)
  }, [downloaded])

  return (
    <>
      {/* Toast Notification for Available Update */}
      {updateAvailable && !downloaded && (
        <Toast className="fixed top-4 right-4 z-50">
          <div className="inline-flex items-center">
            <Spinner size="sm" aria-label="Loading spinner" />
            <span className="ml-2">Downloading update...</span>
          </div>
        </Toast>
      )}

      {/* Confirmation Modal After Download */}
      <Modal show={showModal} onClose={() => {}} size="md" popup>
        <Modal.Header />
        <Modal.Body>
          <div className="text-center">
            <h3 className="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
              Update ready to install
            </h3>
            <div className="flex justify-center gap-4">
              <Button
                onClick={() => {
                  installUpdate()
                  setShowModal(false)
                }}
              >
                Restart and Install
              </Button>
              <Button color="alternative" onClick={() => setShowModal(false)}>
                Later
              </Button>
            </div>
          </div>
        </Modal.Body>
      </Modal>

      <Navbar />
      <motion.main
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="ml-0 mt-[65px] h-screen"
      >
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <OverviewPage setItemId={setSelectedItemId} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/Inventory"
            element={
              <ProtectedRoute>
                <Inventory itemId={selectedItemId} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/Checkout"
            element={
              <ProtectedRoute>
                <Sales />
              </ProtectedRoute>
            }
          />
          <Route
            path="/Sales"
            element={
              <ProtectedRoute>
                <SalesHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/Credit"
            element={
              <ProtectedRoute>
                <CreditSystem />
              </ProtectedRoute>
            }
          />
        </Routes>
      </motion.main>
    </>
  )
}

export default App
