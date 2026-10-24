/**
 * src/index.ts
 *
 * Public barrel export for the IntegralPayments off-chain backend.
 *
 * ERP/CRM modules should import only from this file to avoid coupling
 * to internal module paths that may change between versions.
 *
 * Usage:
 *   import { PaymentService, loadConfig, FEED_IDS } from '@venehsoftw/integral-payments';
 */

// Configuration
export { loadConfig, FEED_IDS, FEED_NAMES } from "./config.js";

// Core service (main entry point for ERP modules)
export {
  PaymentService,
  PaymentServiceError,
  type PaymentServiceErrorCode,
} from "./gateway/paymentService.js";

// Oracle client (exposed for advanced use cases, e.g. price display widgets)
export {
  PythClient,
  PythClientError,
  type PythClientErrorCode,
} from "./oracle/pythClient.js";

// Types (re-exported so consumers don't need to import from sub-paths)
export type {
  CardanoNetwork,
  CollectResult,
  GatewayConfig,
  LockResult,
  PaymentDatum,
  PaymentRedeemer,
  PaymentRequest,
  PaymentStatus,
  PriceProof,
  ResolvedPrice,
  SupportedFeed,
  TxResult,
} from "./types.js";
