import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
const Navbar = () => {
  const navigate = useNavigate()

  const NavFunc = (route) => {
    navigate(route)
  }

  return (
    <div className="fixed h-[65px] top-0 w-full flex items-center justify-between px-4 py-3 bg-[#8E1616] text-white z-[9999]">
      <button
        onClick={() => navigate('/')}
        className="p-2 rounded-md hover:bg-blue-500"
        aria-label="Toggle Sidebar"
      >
        <motion.svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className="w-6 h-6"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
        </motion.svg>
      </button>
      <section className="flex gap-[2em]">
        <h1 onClick={() => navigate('/Inventory')} className="text-lg font-semibold cursor-pointer">
          Inventory
        </h1>
        <h1 onClick={() => navigate('/Checkout')} className="text-lg font-semibold cursor-pointer">
          Checkout
        </h1>
        <h1 onClick={() => navigate('/Sales')} className="text-lg font-semibold cursor-pointer">
          Sales
        </h1>
        <h1 onClick={() => navigate('/Credit')} className="text-lg font-semibold cursor-pointer">
          Credit
        </h1>
      </section>
    </div>
  )
}

export default Navbar
