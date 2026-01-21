import { supabase } from '@/lib/supabase'
import { User, CreateUserData } from '@/types/user'

export const userService = {

  generateRandomUsername(): string {
   const nouns = ['Dreamer', 'Visionary', 'Harmony', 'Sonata', 'Nocturne', 'Melody', 'Echo', 'Aura', 'Mirage', 'Oasis', 'Nebula', 'Constellation', 'Infinity', 'Eternity', 'Solace', 'Reverie', 'Lullaby', 'Cascade', 'Zephyr', 'Horizon'];
    const numbers = Math.floor(1000 + Math.random() * 9000) // 4-digit random number
    
    const noun = nouns[Math.floor(Math.random() * nouns.length)]
    
    return `${noun}${numbers}`
  },

  // Check if username is available
  async isUsernameAvailable(username: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('users')
      .select('username')
      .eq('username', username)
      .single()

    if (error && error.code === 'PGRST116') {
      // No rows returned, username is available
      return true
    }
    
    return !data
  },

  // Generate a unique username
  async generateUniqueUsername(): Promise<string> {
    let username: string
    let attempts = 0
    const maxAttempts = 10

    do {
      username = this.generateRandomUsername()
      const isAvailable = await this.isUsernameAvailable(username)
      
      if (isAvailable) {
        return username
      }
      
      attempts++
    } while (attempts < maxAttempts)

    // Fallback: use timestamp if all attempts fail
    return `User${Date.now()}`
  },

  // Get user by wallet address
  async getUserByWalletAddress(walletAddress: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single()

    if (error) {
      console.error('Error fetching user:', error)
      return null
    }

    return data
  },

  // Create new user
  async createUser(walletAddress: string): Promise<User | null> {
    try {
      const username = await this.generateUniqueUsername()
      
      const { data, error } = await supabase
        .from('users')
        .insert({
          wallet_address: walletAddress.toLowerCase(),
          username
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating user:', error)
        return null
      }

      console.log('Created new user:', data)
      return data
    } catch (error) {
      console.error('Error in createUser:', error)
      return null
    }
  },

  // Get or create user
  async getOrCreateUser(walletAddress: string): Promise<User | null> {
    // First, try to get existing user
    const existingUser = await this.getUserByWalletAddress(walletAddress)
    
    if (existingUser) {
      return existingUser
    }

    // If no user exists, create a new one
    return await this.createUser(walletAddress)
  },

  // Update username (for future use when users want to change their username)
  async updateUsername(walletAddress: string, newUsername: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .update({ 
        username: newUsername,
        updated_at: new Date().toISOString()
      })
      .eq('wallet_address', walletAddress.toLowerCase())
      .select()
      .single()

    if (error) {
      console.error('Error updating username:', error)
      return null
    }

    return data
  }
}