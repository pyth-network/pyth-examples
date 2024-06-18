use starknet::ContractAddress;
use pyth::ByteBuffer;

#[starknet::interface]
pub trait ISendUsd<T> {
    /// Sends ETH from the caller to the destination. The amount of ETH will be equivalent
    /// to the specified amount of USD, converted using the last available ETH/USD price from Pyth.
    /// `price_update` should be the latest available price update for the ETH/USD price feed.
    /// The caller needs to set up sufficient allowance for this contract.
    fn send_usd(
        ref self: T, destination: ContractAddress, amount_in_usd: u256, price_update: ByteBuffer
    );
}

#[starknet::contract]
mod send_usd {
    use core::panic_with_felt252;
    use starknet::{ContractAddress, get_caller_address, get_contract_address};
    use pyth::{ByteBuffer, IPythDispatcher, IPythDispatcherTrait, exp10, UnwrapWithFelt252};
    use openzeppelin::token::erc20::interface::{IERC20CamelDispatcherTrait, IERC20CamelDispatcher};

    const MAX_PRICE_AGE: u64 = 3600; // 1 hour
    const WEI_PER_ETH: u256 = 1000000000000000000;

    #[storage]
    struct Storage {
        pyth_address: ContractAddress,
        eth_erc20_address: ContractAddress,
        eth_usd_price_id: u256,
    }

    /// Initializes the contract.
    /// `pyth_address` is the address of the deployed Pyth account.
    /// `eth_erc20_address` is the address of the ERC20 token account for the ETH token.
    /// `eth_usd_price_id` is the ID of Pyth's price feed for ETH/USD.
    #[constructor]
    fn constructor(
        ref self: ContractState,
        pyth_address: ContractAddress,
        eth_erc20_address: ContractAddress,
        eth_usd_price_id: u256,
    ) {
        self.pyth_address.write(pyth_address);
        self.eth_erc20_address.write(eth_erc20_address);
        self.eth_usd_price_id.write(eth_usd_price_id);
    }

    #[abi(embed_v0)]
    impl SendUsd of super::ISendUsd<ContractState> {
        fn send_usd(
            ref self: ContractState,
            destination: ContractAddress,
            amount_in_usd: u256,
            price_update: ByteBuffer
        ) {
            let pyth = IPythDispatcher { contract_address: self.pyth_address.read() };
            let eth_erc20 = IERC20CamelDispatcher {
                contract_address: self.eth_erc20_address.read()
            };
            let caller = get_caller_address();
            let contract = get_contract_address();

            let pyth_fee = pyth.get_update_fee(price_update.clone(), eth_erc20.contract_address);
            if !eth_erc20.transferFrom(caller, contract, pyth_fee) {
                panic_with_felt252('insufficient allowance for fee');
            }
            if !eth_erc20.approve(pyth.contract_address, pyth_fee) {
                panic_with_felt252('approve failed');
            }

            pyth.update_price_feeds(price_update);

            let price = pyth
                .get_price_no_older_than(self.eth_usd_price_id.read(), MAX_PRICE_AGE)
                .unwrap_with_felt252();

            let price_u64: u64 = price.price.try_into().unwrap();
            let amount_in_wei = WEI_PER_ETH
                * exp10((-price.expo).try_into().unwrap())
                * amount_in_usd
                / price_u64.into();

            let transfer_ok = eth_erc20
                .transferFrom(caller, destination, amount_in_wei);
            if !transfer_ok {
                panic_with_felt252('insufficient allowance');
            }
        }
    }
}
