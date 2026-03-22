// Transaction diagrams

#let tx_out_height_estimate(input) = {
  let address = if "address" in input { 1 } else { 0 }
  let value = if "value" in input { input.value.len() } else { 0 }
  let datum = if "datum" in input { input.datum.len() } else { 0 }
  return (address + value + datum) * 8pt
}

#let datum_field(indent, k, val) = [
  #if val == "" [
    #h(indent)\+ #raw(k)
  ] else [
    #h(indent)\+ #raw(k):
    #if type(val) == content { val }
    #if type(val) == str and val != "" { repr(val) }
    #if type(val) == int { repr(val) }
    #if type(val) == array [
      #stack(dir: ttb, spacing: 0.4em, for item in val [
        #datum_field(indent + 1.2em, "", item) \
      ])
    ]
    #if type(val) == dictionary [
      #v(-0.7em)
      #stack(dir: ttb, spacing: 0em, for (k, v) in val.pairs() [
        #datum_field(indent + 1.2em, k, v) \
      ])
    ]
  ]
]

#let tx_out(input, position, inputHeight) = {
  let address = if "address" in input [
    *Address: #h(0.5em) #input.address*
  ] else []
  let value = if "value" in input [
    *Value:* #if ("ada" in input.value) [ *#input.value.ada* ADA ] \
    #v(-1.0em)
    #stack(dir: ttb, spacing: 0.4em, ..input
      .value
      .pairs()
      .map(((k, v)) => [
        #if k != "ada" [
          #h(2.3em) \+
          #if type(v) == content { math.bold(v) }
          #if type(v) == str and v != "" [*#v*]
          #k
        ]
      ]))
  ] else []
  let datum = if "datum" in input [
    *Datum:* \
    #v(-0.8em)
    #stack(dir: ttb, spacing: 0.4em, ..input.datum.pairs().map(((k, val)) => datum_field(1.2em, k, val)))
  ] else []
  let addressHeight = measure(address).height + if "address" in input { 6pt } else { 0pt }
  let valueHeight = measure(value).height + if "value" in input { 6pt } else { 0pt }
  let datumHeight = measure(datum).height + if "datum" in input { 6pt } else { 0pt }
  let thisHeight = 32pt + addressHeight + valueHeight + datumHeight

  if "dots" in input {
    return (
      content: place(dx: position.x, dy: position.y, [
        #place(dx: 4em, dy: -1em)[*.*]
        #place(dx: 4em, dy: 0em)[*.*]
        #place(dx: 4em, dy: 1em)[*.*]
      ]),
      height: thisHeight,
    )
  } else {
    return (
      content: place(dx: position.x, dy: position.y, [
        *#input.name*
        #line(start: (-4em, -1em), end: (10em, -1em), stroke: red)
        #place(dx: 10em, dy: -1.5em)[#circle(radius: 0.5em, fill: white, stroke: red)]
        #if "address" in input { place(dx: 0em, dy: -3pt)[#address] }
        #place(dx: 0em, dy: addressHeight)[#value]
        #if "datum" in input { place(dx: 0em, dy: addressHeight + valueHeight)[#datum] }
      ]),
      height: thisHeight,
    )
  }
}

#let vanilla_transaction(
  name,
  inputs: (),
  outputs: (),
  signatures: (),
  certificates: (),
  withdrawals: (),
  mint: (:),
  validRange: none,
  notes: none,
) = context {
  let inputHeightEstimate = inputs.fold(0pt, (sum, input) => sum + tx_out_height_estimate(input))
  let inputHeight = 0em
  let inputs = [
    #let start = (x: -18em, y: 1em)
    #for input in inputs {
      let tx_out = tx_out(input, start, inputHeight)

      tx_out.content

      // Now connect this output to the transaction
      if not "dots" in input {
        place(dx: start.x + 10.5em, dy: start.y + 0.84em)[
          #let lineStroke = if input.at("reference", default: false) {
            (paint: blue, thickness: 1pt, dash: "dashed")
          } else { blue }
          #line(start: (0em, 0em), end: (7.44em, 0em), stroke: lineStroke)
        ]
        place(dx: start.x + 10.26em, dy: start.y + 0.59em)[#circle(radius: 0.25em, fill: blue)]
      }
      if input.at("redeemer", default: none) != none {
        place(dx: start.x + 12.26em, dy: start.y - 0.2em)[#input.at("redeemer")]
      }

      start = (x: start.x, y: start.y + tx_out.height)
      inputHeight += tx_out.height
    }
  ]

  let outputHeightEstimate = outputs.fold(0pt, (sum, output) => sum + tx_out_height_estimate(output))
  let outputHeight = 0em
  let outputs = [
    #let start = (x: 4em, y: 1em)
    #for output in outputs {
      let tx_out = tx_out(output, start, outputHeight)
      tx_out.content
      start = (x: start.x, y: start.y + tx_out.height)
      outputHeight += tx_out.height
    }
  ]

  // Collapse down the `mint` array
  let display_mint = (:)
  for (k, v) in mint {
    let display = []
    if type(v) == int {
      // the provided value is an integer
      if v == 0 {
        continue
      } else if v > 0 {
        display += [ \+ ]
      } else if v < 0 {
        display += [ \- ]
      }
      display += [#calc.abs(v)]
    } else {
      // the provided value can be a letter or variable name
      if type(v) == str and v.starts-with("-") {
        display += [\- #v.slice(1)]
      } else {
        display += [\+ #v]
      }
    }
    display += [ #raw(k)]
    display_mint.insert(k, display)
  }

  let mints = if display_mint.len() > 0 [
    *Mint:* \
    #for (k, v) in display_mint [
      #v \
    ]
  ] else []
  let sigs = if signatures.len() > 0 [
    *Signatures:* \
    #for signature in signatures [
      - #signature
    ]
  ] else []
  let certs = if certificates.len() > 0 [
    *Certificates:*
    #for certificate in certificates [
      - #certificate
    ]
  ] else []
  let withs = if withdrawals.len() > 0 [
    *Withdrawals:*
    #for withdrawal in withdrawals [
      - #withdrawal
    ]
  ] else []
  let valid_range = if validRange != none [
    *Valid Range:* \
    #if "lower" in validRange [#validRange.lower $<=$ ]
    `slot`
    #if "upper" in validRange [$<=$ #validRange.upper]
  ] else []

  let boxHeight = {
    100pt + 32pt * (mint.len() + certificates.len() + signatures.len()) + 40pt * withdrawals.len()
  }

  let transaction = [
    #set align(center)
    #rect(
      radius: 4pt,
      height: calc.max(boxHeight, inputHeight + 16pt, outputHeight + 16pt),
      [
        #pad(top: 1em, name)
        #v(1em)
        #set align(left)
        #stack(dir: ttb, spacing: 1em, mints, sigs, certs, withs, valid_range)
      ],
    )
  ]

  let diagram = stack(dir: ltr, inputs, transaction, outputs)
  let size = measure(diagram)
  block(width: 100%)[
    #set align(center)
    #diagram
    #set align(left)
    #if notes != none [
      #box(
        width: 100%,
        fill: rgb("f0f0f0"),
        stroke: 0.5pt + black,
        inset: 8pt,
      )[
        #set text(size: 9pt)
        *Notes*: #notes
      ]
    ]
  ]
}
