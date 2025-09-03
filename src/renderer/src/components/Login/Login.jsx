// example path: src/pages/Login.jsx
import React, { useState } from 'react'
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserSessionPersistence
} from 'firebase/auth'
import { auth } from '../../firebaseConfig'
import { useNavigate, useLocation } from 'react-router-dom'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  const handleLogin = async (e) => {
    e.preventDefault()
    try {
      await setPersistence(auth, browserSessionPersistence)
      await signInWithEmailAndPassword(auth, email, password)
      navigate(from, { replace: true })
    } catch (err) {
      console.error('login error:', err)
      setError(err?.message || 'Invalid email or password. Please try again.')
    }
  }

  return (
    <div className="flex justify-center items-center w-full h-screen ">
      <div className="w-full max-w-sm min-h-[400px] p-8 bg-white rounded-lg shadow-lg flex flex-col justify-center">
        <h2 className="text-3xl font-semibold mb-6 text-center text-gray-800">Login</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition duration-200"
          >
            Login
          </button>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        </form>
      </div>
    </div>
  )
}

export default Login
