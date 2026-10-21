
## Flujo de transacciones
---
**TX 1** — Create (Player A)
  Inputs:  wallet UTxO de Player A
  Outputs: script UTxO con bet_amount_lovelace + NFT
  Datum:   status=Waiting, player_b=None, deadline=None
  Mint:    +1 NFT (nft_policy_id, asset_name=duel_id)
  Signers: Player A + Backend (para mintear NFT)

**TX 2** — Join (Player B + Backend)
  Inputs:       script UTxO (Waiting) + wallet UTxO de Player B
  Ref Inputs:   Pyth state UTxO  ← requerido por pyth.get_updates
  Withdrawals:  0 lovelace del Pyth withdraw script,
                redeemer = [signed_update_feed_a, signed_update_feed_b]
  Outputs:      script UTxO (Active) con start_price_a y start_price_b
  Signers:      Player B + Backend


**TX 3** — Resolve (Backend, después del deadline)
  Inputs:       script UTxO (Active)
  Ref Inputs:   Pyth state UTxO
  Withdrawals:  0 lovelace del Pyth withdraw script,
                redeemer = [signed_update_feed_a, signed_update_feed_b]
  Outputs:      winner recibe total (o ambos si draw)
  Burn:         -1 NFT
  Signers:      Backend

