package pythacoin.onchain

import scalus.cardano.onchain.plutus.prelude.PairList.{PairCons, PairNil}
import scalus.cardano.onchain.plutus.prelude.{List, PairList, SortedMap, fail}
import scalus.cardano.onchain.plutus.v3.*
import scalus.compiler.Compile
import scalus.uplc.builtin.ByteString

import scala.annotation.tailrec

/** On-chain utility extensions for strict (fail-fast) lookups on Plutus data structures.
  * These are used by CdpValidator to assert expectations rather than returning Option,
  * which keeps the on-chain code simpler and produces clear error messages on failure.
  */
@Compile
object StrictLookups {

    extension [A](self: List[A]) {
        /** Find first element matching predicate, or fail the script. */
        @tailrec
        def findOrFail(predicate: A => Boolean): A = self match
            case List.Nil => fail("element not found")
            case List.Cons(head, tail) =>
                if predicate(head) then head else tail.findOrFail(predicate)

        /** Assert the list has exactly one element and return it, or fail with the given message. */
        def oneOrFail(message: String): A = self match
            case List.Cons(head, List.Nil) => head
            case _                         => fail(message)
    }

    extension [V](self: Value) {
        /** Look up a token quantity, failing if the policy or token name is absent.
          * Unlike `quantityOf` which returns 0 for missing entries, this asserts existence.
          */
        def existingQuantityOf(policyId: PolicyId, tokenName: TokenName): BigInt = {
            self.toSortedMap.lookupOrFail(policyId).lookupOrFail(tokenName)
        }
    }

    extension [V](self: SortedMap[ByteString, V]) {
        /** Look up a key in a sorted map, failing if not found.
          * Exploits the sorted order to short-circuit early when key < current entry.
          */
        def lookupOrFail(key: ByteString): V = {
            @tailrec
            def go(lst: PairList[ByteString, V]): V = lst match
                case PairNil => fail("key not found")
                case PairCons((k, v), tail) =>
                    if key == k then v
                    else if key < k then fail("key not found")
                    else go(tail)

            go(self.toPairList)
        }
    }
}
