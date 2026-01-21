export interface User {
  id: string
  wallet_address: string
  username: string
  created_at: string
  updated_at: string
}

export interface CreateUserData {
  wallet_address: string
  username: string
}