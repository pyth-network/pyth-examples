contract;

use pyth_interface::{data_structures::price::{Price, PriceFeedId}, PythCore};

use std::bytes::Bytes;

abi UpdatePrice {
    fn test_fn() -> u64;
    fn valid_time_period() -> u64;
    fn get_price(price_feed_id: PriceFeedId) -> Price;
    fn get_price_unsafe(price_feed_id: PriceFeedId) -> Price;
    fn update_fee(update_data: Vec<Bytes>) -> u64;
    #[payable]
    fn update_price_feeds(update_fee: u64, update_data: Vec<Bytes>);
}

const PYTH_CONTRACT_ID = 0x1ab91bc1402a187055d3e827017ace566a103ce2a4126517da5d656d6a436aea; // Testnet Contract
const FUEL_ETH_BASE_ASSET_ID = 0xf8f8b6283d7fa5b672b530cbb84fcccb4ff8dc40f8176ef4544ddb1f1952ad07;

impl UpdatePrice for Contract {
    fn test_fn() -> u64 {
        1
    }
    fn valid_time_period() -> u64 {
        let x = abi(PythCore, PYTH_CONTRACT_ID);
        let period = x.valid_time_period();
        period
    }
    fn get_price(price_feed_id: PriceFeedId) -> Price {
        let x = abi(PythCore, PYTH_CONTRACT_ID);
        let price = x.price(price_feed_id);
        price
    }
    fn get_price_unsafe(price_feed_id: PriceFeedId) -> Price {
        let x = abi(PythCore, PYTH_CONTRACT_ID);
        let price = x.price_unsafe(price_feed_id);
        price
    }
    fn update_fee(update_data: Vec<Bytes>) -> u64 {
        let x = abi(PythCore, PYTH_CONTRACT_ID);
        let fee = x.update_fee(update_data);
        fee
    }
    #[payable]
    fn update_price_feeds(update_fee: u64, update_data: Vec<Bytes>) {
        let x = abi(PythCore, PYTH_CONTRACT_ID);
        x
            .update_price_feeds {
                asset_id: FUEL_ETH_BASE_ASSET_ID,
                coins: update_fee,
            }(update_data);
    }
}
