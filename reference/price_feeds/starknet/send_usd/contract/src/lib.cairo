use starknet::ContractAddress;
use pyth::ByteBuffer;

#[starknet::interface]
pub trait ISendUsd<T> {
    /// Sends STRK from the caller to the destination. The amount of STRK will be equivalent
    /// to the specified amount of USD, converted using the last available STRK/USD price from Pyth.
    /// `price_update` should be the latest available price update for the STRK/USD price feed.
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
    const TOKENS_PER_STRK: u256 = 1000000000000000000;

    #[storage]
    struct Storage {
        pyth_address: ContractAddress,
        strk_erc20_address: ContractAddress,
    }

    /// Initializes the contract.
    /// `pyth_address` is the address of the deployed Pyth account.
    /// `strk_erc20_address` is the address of the ERC20 token account for the STRK token.
    #[constructor]
    fn constructor(
        ref self: ContractState, pyth_address: ContractAddress, strk_erc20_address: ContractAddress,
    ) {
        self.pyth_address.write(pyth_address);
        self.strk_erc20_address.write(strk_erc20_address);
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
            let strk_erc20 = IERC20CamelDispatcher {
                contract_address: self.strk_erc20_address.read()
            };
            let caller = get_caller_address();
            let contract = get_contract_address();

            let pyth_fee = pyth.get_update_fee(price_update.clone(), strk_erc20.contract_address);
            if !strk_erc20.transferFrom(caller, contract, pyth_fee) {
                panic_with_felt252('insufficient allowance for fee');
            }
            if !strk_erc20.approve(pyth.contract_address, pyth_fee) {
                panic_with_felt252('approve failed');
            }

            pyth.update_price_feeds(price_update);

            /// `strk_usd_price_id` is the ID of Pyth's price feed for STRK/USD.
            let strk_usd_price_id =
                0x6a182399ff70ccf3e06024898942028204125a819e519a335ffa4579e66cd870;
            let price = pyth
                .get_price_no_older_than(strk_usd_price_id, MAX_PRICE_AGE)
                .unwrap_with_felt252();

            let price_u64: u64 = price.price.try_into().unwrap();
            let amount_in_strk = TOKENS_PER_STRK
                * exp10((-price.expo).try_into().unwrap())
                * amount_in_usd
                / price_u64.into();

            let transfer_ok = strk_erc20.transferFrom(caller, destination, amount_in_strk);
            if !transfer_ok {
                panic_with_felt252('insufficient allowance');
            }
        }
    }
}
