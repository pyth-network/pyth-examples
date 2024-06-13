contract;

use pyth_interface::{data_structures::price::{Price, PriceFeedId}, PythCore};

use std::{bytes::Bytes};

abi UpdatePrice {
    fn get_price(price_feed_id: PriceFeedId) -> Price;

    fn update_fee(update_data: Vec<Bytes>) -> u64;

    #[payable]
    fn update_price_feeds(update_fee: u64, update_data: Vec<Bytes>);
}

const PYTH_CONTRACT_ID = 0xcda57a8ab59090ab2b75d10e093af41a2ad9b7951a2805ab39100995c69f9b2a; // Testnet Contract
const FUEL_ETH_BASE_ASSET_ID = 0xf8f8b6283d7fa5b672b530cbb84fcccb4ff8dc40f8176ef4544ddb1f1952ad07;

impl UpdatePrice for Contract {
    fn get_price(price_feed_id: PriceFeedId) -> Price {
        let x = abi(PythCore, PYTH_CONTRACT_ID);
        let price = x.price(price_feed_id);
        price
    }

    fn update_fee(update_data: Vec<Bytes>) -> u64 {
        let x = abi(PythCore, PYTH_CONTRACT_ID);
        let fee = x.update_fee(update_data);
        fee
    }

    #[payable]
    fn update_price_feeds(update_fee: u64,update_data: Vec<Bytes>) {
        let x = abi(PythCore, PYTH_CONTRACT_ID);
        x.update_price_feeds {
            asset_id: FUEL_ETH_BASE_ASSET_ID, coins: update_fee
        }
        (update_data);
    }
}
