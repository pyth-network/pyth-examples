export interface SessionUser {
  id: string;
  walletName: string;
  walletAddress: string;
}

export interface SessionState {
  isAuthenticated: boolean;
  user: SessionUser | null;
}
