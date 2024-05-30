contract;

use pyth_interface::{data_structures::price::Price, PythCore};

use std::{bytes::Bytes};

abi UpdatePrice {
    fn get_price() -> Price;

    fn update_price_feeds(update_data: Vec<Bytes>);
}

const PYTH_CONTRACT_ID = 0x40d3edfe7c67fd1459ccc53b1dfa922bce6957d6fe57cbdd85a85d609e753451; // Testnet Contract
const PRICE_FEED_ID = 0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43; // BTC/USD

impl UpdatePrice for Contract {
    fn get_price() -> Price {
        let x = abi(PythCore, PYTH_CONTRACT_ID);
        let price = x.price(PRICE_FEED_ID);
        price
    }

    fn update_price_feeds(update_data: Vec<Bytes>) {
        let x = abi(PythCore, PYTH_CONTRACT_ID);
        x.update_price_feeds(update_data);
    }
}
