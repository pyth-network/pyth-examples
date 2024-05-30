contract;

mod price;

use ::price::*;

use pyth_interface::PythCore;

abi UpdatePrice {
    #[storage(read)]
    fn get_price() -> Price;
}

storage {
    price: Price = Price::new(0, 0, 0, 0),
}

const PYTH_CONTRACT_ID = 0x40d3edfe7c67fd1459ccc53b1dfa922bce6957d6fe57cbdd85a85d609e753451; // Testnet Contract
const PRICE_FEED_ID = 0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43; // BTC/USD

impl UpdatePrice for Contract {
    #[storage(read)]
    fn get_price() -> Price {
        let x = abi(PythCore, PYTH_CONTRACT_ID);
        let price = x.price(PRICE_FEED_ID);
        storage.price.read()
    }
}
