// SPDX-License-Identifier: Apache 2
pragma solidity ^0.8.0;

// Import the entropy SDK in order to interact with the entropy contracts
import "@pythnetwork/entropy-sdk-solidity/IEntropyV2.sol";
import "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";
// Import the EntropyStructsV2 contract to get the ProviderInfo struct
import "@pythnetwork/entropy-sdk-solidity/EntropyStructsV2.sol";

library CoinFlipErrors {
    error IncorrectSender();

    error InsufficientFee();
}

/// Example contract using Pyth Entropy to allow a user to flip a secure fair coin.
/// Users interact with the contract by requesting a random number from the entropy provider.
/// The entropy provider will then fulfill the request by revealing their random number.
/// Once the provider has fulfilled their request the entropy contract will call back
/// the requesting contract with the generated random number.
///
/// The CoinFlip contract implements the IEntropyConsumer interface imported from the Solidity SDK.
/// The interface helps in integrating with Entropy correctly.
contract CoinFlip is IEntropyConsumer {
    // Event emitted when a coin flip is requested. The sequence number can be used to identify a request
    event FlipRequest(uint64 sequenceNumber);

    // Event emitted when the result of the coin flip is known.
    event FlipResult(uint64 sequenceNumber, bool isHeads);

    // Contracts using Pyth Entropy should import the solidity SDK and then store both the Entropy contract
    // and a specific entropy provider to use for requests. Each provider commits to a sequence of random numbers.
    // Providers are then responsible for fulfilling a request on chain by revealing their random number.
    // Users should choose a reliable provider who they trust to uphold these commitments.
    IEntropyV2 private entropy;
    address private entropyProvider;

    constructor(address _entropy, address _entropyProvider) {
        entropy = IEntropyV2(_entropy);
        entropyProvider = _entropyProvider;
    }

    // Request to flip a coin.
    function requestFlip() external payable {
        // The entropy protocol requires the caller to pay a fee (in native gas tokens) per requested random number.
        // This fee can either be paid by the contract itself or passed on to the end user.
        // This implementation of the requestFlip method passes on the fee to the end user.
        uint256 fee = entropy.getFeeV2();
        if (msg.value < fee) {
            revert CoinFlipErrors.InsufficientFee();
        }

        // Request the random number from the Entropy protocol. The call returns a sequence number that uniquely
        // identifies the generated random number. Callers can use this sequence number to match which request
        // is being revealed in the next stage of the protocol.
        // This requestV2 function will trust the provider to draw a random number. 
        uint64 sequenceNumber = entropy.requestV2{value: fee}();

        emit FlipRequest(sequenceNumber);
    }

    // Request to flip a coin with a custom gas limit.
    function requestFlipWithCustomGasLimit(uint32 gasLimit) external payable {
        uint256 fee = entropy.getFeeV2(gasLimit);
        if (msg.value < fee) {
            revert CoinFlipErrors.InsufficientFee();
        }

        uint64 sequenceNumber = entropy.requestV2{value: fee}(gasLimit);

        emit FlipRequest(sequenceNumber);
    }

    // Request to flip a coin with a custom provider and custom gas limit.
    function requestFlipWithCustomProviderAndGasLimit(address provider, uint32 gasLimit) external payable {
        uint256 fee = entropy.getFeeV2(provider, gasLimit);
        if (msg.value < fee) {
            revert CoinFlipErrors.InsufficientFee();
        }

        uint64 sequenceNumber = entropy.requestV2{value: fee}(provider, gasLimit);

        emit FlipRequest(sequenceNumber);
    }

    // Request to flip a coin with a custom provider and custom gas limit and userContribution / Random Number.
    function requestFlipWithCustomProviderAndGasLimitAndUserContribution(address provider, uint32 gasLimit, bytes32 userContribution) external payable {
        uint256 fee = entropy.getFeeV2(provider, gasLimit);
        if (msg.value < fee) {
            revert CoinFlipErrors.InsufficientFee();
        }

        uint64 sequenceNumber = entropy.requestV2{value: fee}(provider, userContribution, gasLimit);

        emit FlipRequest(sequenceNumber);
    }

    // Get the default gas limit for the default provider.
    function getDefaultProviderGasLimit() public view returns (uint32) {
        EntropyStructsV2.ProviderInfo memory providerInfo = entropy.getProviderInfoV2(entropy.getDefaultProvider());
        return providerInfo.defaultGasLimit;
    }

    // This method is required by the IEntropyConsumer interface.
    // It is called by the entropy contract when a random number is generated.
    function entropyCallback(
        uint64 sequenceNumber,
        // If your app uses multiple providers, you can use this argument
        // to distinguish which one is calling the app back. This app only
        // uses one provider so this argument is not used.
        address,
        bytes32 randomNumber
    ) internal override {
        emit FlipResult(sequenceNumber, uint256(randomNumber) % 2 == 0);
    }

    // This method is required by the IEntropyConsumer interface.
    // It returns the address of the entropy contract which will call the callback.
    function getEntropy() internal view override returns (address) {
        return address(entropy);
    }

    receive() external payable {}
}
