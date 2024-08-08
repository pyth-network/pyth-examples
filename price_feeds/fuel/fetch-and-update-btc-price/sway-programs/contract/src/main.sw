contract;

use pyth_interface::{data_structures::price::{Price, PriceFeedId}, PythCore};

use std::bytes::Bytes;

abi UpdatePrice {
    fn valid_time_period() -> u64;
    fn get_price(price_feed_id: PriceFeedId) -> Price;
    fn get_price_unsafe(price_feed_id: PriceFeedId) -> Price;
    fn update_fee(update_data: Vec<Bytes>) -> u64;
    #[payable]
    fn update_price_feeds(update_fee: u64, update_data: Vec<Bytes>);
}

const PYTH_CONTRACT_ID = 0x73591bf32f010ce4e83d86005c24e7833b397be38014ab670a73f6fde59ad607; // Testnet Contract
const FUEL_ETH_BASE_ASSET_ID = 0xf8f8b6283d7fa5b672b530cbb84fcccb4ff8dc40f8176ef4544ddb1f1952ad07;

impl UpdatePrice for Contract {
    fn valid_time_period() -> u64 {
        let pyth_contract = abi(PythCore, PYTH_CONTRACT_ID);
        let period = pyth_contract.valid_time_period();
        period
    }
    fn get_price(price_feed_id: PriceFeedId) -> Price {
        let pyth_contract = abi(PythCore, PYTH_CONTRACT_ID);
        let price = pyth_contract.price(price_feed_id);
        price
    }
    fn get_price_unsafe(price_feed_id: PriceFeedId) -> Price {
        let pyth_contract = abi(PythCore, PYTH_CONTRACT_ID);
        let price = pyth_contract.price_unsafe(price_feed_id);
        price
    }
    fn update_fee(update_data: Vec<Bytes>) -> u64 {
        let pyth_contract = abi(PythCore, PYTH_CONTRACT_ID);
        let fee = pyth_contract.update_fee(update_data);
        fee
    }
    #[payable]
    fn update_price_feeds(update_fee: u64, update_data: Vec<Bytes>) {
        let pyth_contract = abi(PythCore, PYTH_CONTRACT_ID);
        pyth_contract
            .update_price_feeds {
                asset_id: FUEL_ETH_BASE_ASSET_ID,
                coins: update_fee,
            }(update_data);
    }
}
