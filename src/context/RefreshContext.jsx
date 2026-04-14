import { createContext, useContext, useEffect, useState } from 'react'

const RefreshContext = createContext(0)

export function RefreshProvider({ children }) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 15000)
    return () => clearInterval(id)
  }, [])

  return (
    <RefreshContext.Provider value={tick}>
      {children}
    </RefreshContext.Provider>
  )
}

// Hook used in every page/tab to trigger re-fetch
export const useRefreshTick = () => useContext(RefreshContext)
