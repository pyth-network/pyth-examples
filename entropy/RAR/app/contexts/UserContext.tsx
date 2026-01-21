'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { User } from '@/types/user'
import { userService } from '@/services/userService'

interface UserContextType {
  user: User | null
  isLoading: boolean
  refreshUser: () => void
}

const UserContext = createContext<UserContextType>({
  user: null,
  isLoading: false,
  refreshUser: () => {}
})

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { address, isConnected } = useAccount()

  const loadUser = async () => {
    if (!address || !isConnected) {
      setUser(null)
      return
    }

    setIsLoading(true)
    try {
      const userData = await userService.getOrCreateUser(address)
      setUser(userData)
    } catch (error) {
      console.error('Error loading user:', error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadUser()
  }, [address, isConnected])

  const refreshUser = () => {
    loadUser()
  }

  return (
    <UserContext.Provider value={{ user, isLoading, refreshUser }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)