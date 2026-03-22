export const runtimeAvailability = {
  cardanoNetworkLabel: "Cardano Preprod",
  cardanoNetworkId: "preprod",
  mainnetAvailable: false,
  walletConnectAvailable: true,
  policyEditorAvailable: true,
  vaultBootstrapAvailable: true,
  warningTitle: "Preprod only",
  warningBody:
    "Guards is currently running against Cardano preprod. Mainnet is disabled while the deployable PolicyVault, hot-bucket execution flow, and create-vault transaction finish validation.",
} as const;
