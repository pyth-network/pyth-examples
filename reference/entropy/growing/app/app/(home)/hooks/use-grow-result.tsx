import { NFTGrowtthAddress } from "@/contracts/addresses"
import { useWatchNftGrowthEvent } from "@/contracts/generated"
import { useCallback, useReducer } from "react"

type Result = "Success" | "Failure" | "Death"

export interface GrowResult {
  tokenId: string
  growResult: Result
}

type State = {
  growResult?: GrowResult
}

type Action =
  | { type: "SET_NFT_RESULT"; payload: GrowResult }
  | { type: "RESET" }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_NFT_RESULT":
      return { ...state, growResult: action.payload }
    case "RESET":
      return {}
    default:
      return state
  }
}

export const useGrowResult = (currentTokenId: string) => {
  const [state, dispatch] = useReducer(reducer, {})

  const handleGrowEvent = useCallback(
    (event: any) => {
      const { tokenId, result } = event[0].args
      if (
        tokenId &&
        tokenId.toString() === currentTokenId &&
        result !== undefined
      ) {
        dispatch({
          type: "SET_NFT_RESULT",
          payload: {
            tokenId: tokenId.toString(),
            growResult: getNFTResult(result),
          },
        })
      }
    },
    [currentTokenId]
  )

  useWatchNftGrowthEvent({
    address: NFTGrowtthAddress,
    onLogs: handleGrowEvent,
  })

  const resetResult = useCallback(() => dispatch({ type: "RESET" }), [])

  return { ...state, resetResult }
}

export const getNFTResult = (result: number): Result => {
  switch (result) {
    case 0:
      return "Success"
    case 1:
      return "Failure"
    default:
      return "Death"
  }
}
