#import "report.typ": *

#let tx_create_market = vanilla_transaction(
  "Create Market",
  mint: (
    "Control Token": 1,
  ),
  inputs: (
    (
      reference: true,
      name: "Pyth State",
      value: (
        "Pyth NFT": 1,
      ),
      datum: (
        "Pyth Datum": ("...":"", "withdraw_script":"")
      ),
    ),
    ( name: "Seed UTxO" )
  ),
  outputs: (
    (
      name: "Market",
      address: "market script address",
      value: (
        "Control token": "1",
      ),
      datum: (
        startTimestamp: `time`,
        startValue: "P",
        endTimestamp: `time + 5 minutes`,
        endValue: `None`,
        remainingShares: 0
      ),
    ),
  ),
  withdrawals: ("withdraw_script",),
  // TODO: Think about this
  validRange: (lower: "time", upper: "time + 4.5 minutes"),
  notes: [
    startValue should be provided by the oracle
  ]
)

#tx_create_market

#pagebreak()

#let tx_record_close_price = vanilla_transaction(
  "Record Close Price",
  inputs: (
     (
      reference: true,
      name: "Pyth State",
      value: (
        "Pyth NFT": 1,
      ),
      datum: (
        "Pyth Datum": ("...":"", "withdraw_script":"")
      ),
    ),
    (
      name: "Market",
      address: "market script address",
      value: (
        "Control token": "1",
      ),
      datum: (
        startTimestamp: `time`,
        startValue: "P",
        endTimestamp: `time + 5 minutes`,
        endValue: `None`,
        remainingShares: "X"
      ),
      redeemer: [#h(-1.5em)"RecordClosePrice"]
    ),
  ),
  outputs: (
    (
      name: "Market",
      address: "market script address",
      value: (
        "Control token": "1",
      ),
      datum: (
        startTimestamp: `time`,
        startValue: "P",
        endTimestamp: `time + 5 minutes`,
        endValue: `Some(P')`,
        remainingShares: "X"
      ),
    ),
  ),
  withdrawals: ("withdraw_script",),
  // TODO: Think about this
  validRange: (lower: "endTimestamp"),
  notes: [
    endValue should be provided by the oracle
  ]
)

#tx_record_close_price

#pagebreak()

#let tx_claim_winnings = vanilla_transaction(
  "Claim Winnings",
  inputs: (
    (
      name: "Market",
      address: "market script address",
      value: (
        "Control token": "1",
        "ADA": `M`
      ),
      datum: (
        startTimestamp: `time`,
        startValue: "P",
        endTimestamp: `time + 5 minutes`,
        endValue: `Some(P')`,
        remainingShares: "X"
      ),
      redeemer: [#h(-1.5em)"ClaimWinnings"]
    ),
    (
      name: "User UTxO",
      value: (
        "PositionToken": "C",
      ),
    )
  ),
  outputs: (
    (
      name: "Market",
      address: "market script address",
      value: (
        "Control token": "1",
        "ADA": `M - C`
      ),
      datum: (
        startTimestamp: `time`,
        startValue: "P",
        endTimestamp: `time + 5 minutes`,
        endValue: `Some(P')`,
        remainingShares: "X - C"
      ),
    ),
        (
      name: "User UTxO",
      value: (
        "ADA": "C",
      ),
    )
  ),
  mint: (
    "PositionToken": "-C"
  ),
  notes: [
    if P' >= P { PositionToken = "UP" } \
    else { PositionToken = "DOWN"}
  ]
)

#tx_claim_winnings

#pagebreak()

#let tx_claim_losings = vanilla_transaction(
  "Claim Losing",
  inputs: (
    (
      name: "Market",
      address: "market script address",
      value: (
        "Control token": "1",
        "ADA": `M`
      ),
      datum: (
        startTimestamp: `time`,
        startValue: "P",
        endTimestamp: `time + 5 minutes`,
        endValue: `Some(P')`,
        remainingShares: "X"
      ),
      redeemer: [#h(-1.5em)"ClaimLosings"]
    ),
    (
      name: "User UTxO",
      value: (
        "PositionToken": "C",
      ),
    )
  ),
  outputs: (
    (
      name: "Market",
      address: "market script address",
      value: (
        "Control token": "1",
        "ADA": `M`
      ),
      datum: (
        startTimestamp: `time`,
        startValue: "P",
        endTimestamp: `time + 5 minutes`,
        endValue: `Some(P')`,
        remainingShares: "X - C"
      ),
    ),
  ),
  mint: (
    "PositionToken": "-C"
  ),
  notes: [
    if P' < P { PositionToken = "UP" } \
    else { PositionToken = "DOWN"}
  ]
)

#tx_claim_losings

#pagebreak()

#let tx_close_market = vanilla_transaction(
  "Close Market",
  inputs: (
    (
      name: "Market",
      address: "market script address",
      value: (
        "Control token": "1",
        "ADA": `M`
      ),
      datum: (
        startTimestamp: `time`,
        startValue: "P",
        endTimestamp: `time + 5 minutes`,
        endValue: `Some(P')`,
        remainingShares: "0"
      ),
      redeemer: [Close]
    ),
  ),
  outputs: (
    (
      name: "User UTxO",
      value: (
        "ADA": "M",
      ),
    ),
  ),

)

#tx_close_market

#pagebreak()

#let tx_place_buy_order = vanilla_transaction(
  "Place Buy Order",
  mint: (
    "Order Control Token": 1,
  ),
  inputs: (
  ),
  outputs: (
    (
      name: "Order",
      address: "order book address",
      value: (
        "Order Control token": "1",
        "ADAs": `M`,
      ),
      datum: (
        owner: `pkh`,
        direction: "Up|Down",
        operation: `Buy`,
        price: `N`,
      ),
    ),
  ),
)

#tx_place_buy_order

#let tx_place_sell_order = vanilla_transaction(
  "Place Sell Order",
  mint: (
    "Order Control Token": 1,
  ),
  inputs: (
  ),
  outputs: (
    (
      name: "Order",
      address: "order book address",
      value: (
        "Order Control token": "1",
        "UP/DOWN": `M`,
      ),
      datum: (
        owner: `pkh`,
        direction: "Up|Down",
        operation: `Sell`,
        price: `N`,
      ),
    ),
  ),
)

#tx_place_sell_order


#pagebreak()

#let tx_complete_fill_order = vanilla_transaction(
  "Complete Fill Order",
  mint: (
    "Order Control Token": -1,
  ),
  inputs: (
    (
      name: "Order",
      address: "order book address",
      value: (
        "Order Control token": "1",
        "offered_token": `N`,
      ),
      datum: (
        owner: `pkh`,
        direction: "Up|Down",
        operation: `Sell|Buy`,
        price: `P`,
      ),
      redeemer: ("CompleteFill"),
    ),
    (
      name: "User UTxO",
      value: (
        "asked_token": `M`,
      ),
    ),
  ),
  outputs: (
    (
      name: "Order Fill UTxO",
      address: "owner",
      value: (
        "asked_token": `M`,
      ),
    ),
    (
      name: "User UTxO",
      value: (
        "offered_token": `N`,
      ),
    ),
  ),
  notes: [If operation == Sell { M = P \* N } else { N = P \* M }],
)

#tx_complete_fill_order

#pagebreak()

#let tx_partial_fill_order = vanilla_transaction(
  "Partial Fill Order",
  mint: (
    "Order Control Token": -1,
  ),
  inputs: (
    (
      name: "Order",
      address: "order book address",
      value: (
        "Order Control token": "1",
        "offered_token": `N`,
      ),
      datum: (
        owner: `pkh`,
        direction: "Up|Down",
        operation: `Sell|Down`,
        price: `P`,
      ),
      redeemer: ("PartialFill"),
    ),
    (
      name: "User UTxO",
      value: (
        "asked_token": `M`,
      ),
    ),
  ),
  outputs: (
    (
      name: "Order",
      address: "order book address",
      value: (
        "Order Control token": "1",
        "offered_token": `N - N'`,
      ),
      datum: (
        owner: `pkh`,
        direction: "Up|Down",
        operation: `Sell|Down`,
        price: `P`,
      ),
      redeemer: ("FillOrder"),
    ),
    (
      name: "Order Fill UTxO",
      address: "owner",
      value: (
        "asked_token": `M`,
      ),
    ),
    (
      name: "User UTxO",
      value: (
        "offered_token": `N'`,
      ),
    ),
  ),
  notes: [If operation == Sell { M = P \* N' } else { N' = P \* M }],
)

#tx_partial_fill_order

#pagebreak()

#let tx_match_orders = vanilla_transaction(
  "Match Orders",
  mint: (
    "Order Control Token": "O",
    "UP": "N",
    "DOWN": "N"
  ),
  inputs: (
    (
      name: "Order",
      address: "order book address",
      value: (
        "Order Control token": "1",
        "ADAs": [$N_1$],
      ),
      datum: (
        owner: [$"pkh"_1$],
        direction: "Up",
        operation: `Buy`,
        price: [$P_1$],
      ),
      redeemer: ([$R_1$]),
    ),
    (
      name: "Order",
      address: "order book address",
      value: (
        "Order Control token": "1",
        "ADAs": [$N_2$],
      ),
      datum: (
        owner: [$"pkh"_2$],
        direction: "Down",
        operation: `Buy`,
        price: [$P_2$],
      ),
      redeemer: ([$R_2$]),
    ),
    (
      name: "Market",
      address: "market script address",
      value: (
        "Control token": "1",
        "ADA": "C"
      ),
      datum: (
        endTimestamp: `T`,
        remainingShares: `X`,
        "...": ""
      ),
      redeemer: "Match"
    ),
  ),
  outputs: (
    (
      name: "Order",
      address: "order book address",
      value: (
        "Order Control token": "1",
        "ADAs": [N'],
      ),
      datum: (
        owner: [$"pkh"_n$],
        direction: [$D_n$],
        operation: `Buy`,
        price: [$P_n$],
      ),
      redeemer: ("PartialMatch"),
    ),
    (
      name: "Up UTxO",
      address: [$"pkh"_1$],
      value: (
        "UP": `N`,
      ),
    ),
    (
      name: "Down UTxO",
      address: [$"pkh"_2$],
      value: (
        "DOWN": `N`,
      ),
    ),
    (
      name: "Market",
      address: "market script address",
      value: (
        "Control token": "1",
        "ADA": "C + N"
      ),
      datum: (
        endTimestamp: `T`,
        remainingShares: `X + 2 * N`,
        "...": ""
      ),
    ),
  ),
  notes: [
    $
    N = min(N_1, N_2) \
    $

    If N_1 > N_2 { R1 = PartialMatch; R2 = Match; $"pkh"_n$ = $"pkh"_1$; $D_n$ = Up; $P_n$ = $P_1$; O = -1  } \
    else if N_2 > N_1 { R1 = Match; R2 = PartialMatch; $"pkh"_n$ = $"pkh"_2$; $D_n$ = Down; $P_n$ = $P_2$; O = 1} \
    else { R1 = R2 = Match; O = 2 }
  ],
)

#tx_match_orders

#pagebreak()

#let tx_cancel_order = vanilla_transaction(
  "Cancel Order",
  mint: (
    "Order Control Token": -1,
  ),
  inputs: (
    (
      name: "Order",
      address: "order book address",
      value: (
        "Order Control token": "1",
        "V": ``,
      ),
      datum: (
        owner: "pkh",
        "...":""
      ),
      redeemer: ("Cancel"),
    ),
  ),
  outputs: (
    (
      name: "Owner UTxO",
      address: "pkh",
      value: (
        "V": ``,
      ),
    ),
  ),
  signatures: ("pkh",)
)

#tx_cancel_order