use pyth_client::{CorpAction, PriceStatus, PriceType};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
};

solana_program::declare_id!("BpfProgram1111111111111111111111111111111111");

entrypoint!(process_instruction);
fn process_instruction(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    _instruction_data: &[u8],
) -> ProgramResult {
    let account_info_iter = &mut accounts.iter().peekable();
    let pyth_product_info = next_account_info(account_info_iter)?;
    let pyth_price_info = next_account_info(account_info_iter)?;

    let pyth_product_data = &pyth_product_info.try_borrow_data()?;
    let pyth_product = pyth_client::cast::<pyth_client::Product>(pyth_product_data);

    if pyth_product.magic != pyth_client::MAGIC {
        msg!("Pyth product account provided is not a valid Pyth account");
        return Err(ProgramError::InvalidArgument.into());
    }
    if pyth_product.atype != pyth_client::AccountType::Product as u32 {
        msg!("Pyth product account provided is not a valid Pyth product account");
        return Err(ProgramError::InvalidArgument.into());
    }
    if pyth_product.ver != pyth_client::VERSION_2 {
        msg!("Pyth product account provided has a different version than the Pyth client");
        return Err(ProgramError::InvalidArgument.into());
    }
    if !pyth_product.px_acc.is_valid() {
        msg!("Pyth product price account is invalid");
        return Err(ProgramError::InvalidArgument.into());
    }

    let pyth_price_pubkey = Pubkey::new(&pyth_product.px_acc.val);
    if &pyth_price_pubkey != pyth_price_info.key {
        msg!("Pyth product price account does not match the Pyth price provided");
        return Err(ProgramError::InvalidArgument.into());
    }

    let pyth_price_data = &pyth_price_info.try_borrow_data()?;
    let pyth_price = pyth_client::cast::<pyth_client::Price>(pyth_price_data);

    msg!("  price_account .. {:?}", pyth_price_info.key);
    msg!("    price_type ... {}", get_price_type(&pyth_price.ptype));
    msg!("    exponent ..... {}", pyth_price.expo);
    msg!("    status ....... {}", get_status(&pyth_price.agg.status));
    msg!(
        "    corp_act ..... {}",
        get_corp_act(&pyth_price.agg.corp_act)
    );
    msg!("    price ........ {}", pyth_price.agg.price);
    msg!("    conf ......... {}", pyth_price.agg.conf);
    msg!("    valid_slot ... {}", pyth_price.valid_slot);
    msg!("    publish_slot . {}", pyth_price.agg.pub_slot);

    Ok(())
}

fn get_price_type(ptype: &PriceType) -> &'static str {
    match ptype {
        PriceType::Unknown => "unknown",
        PriceType::Price => "price",
    }
}

fn get_status(st: &PriceStatus) -> &'static str {
    match st {
        PriceStatus::Unknown => "unknown",
        PriceStatus::Trading => "trading",
        PriceStatus::Halted => "halted",
        PriceStatus::Auction => "auction",
    }
}

fn get_corp_act(cact: &CorpAction) -> &'static str {
    match cact {
        CorpAction::NoCorpAct => "nocorpact",
    }
}

#[cfg(test)]
mod test {
    use {
        super::*,
        assert_matches::*,
        solana_program::instruction::{AccountMeta, Instruction},
        solana_program_test::*,
        solana_sdk::{signature::Signer, transaction::Transaction},
    };

    #[tokio::test]
    async fn test_transaction() {
        let program_id = Pubkey::new_unique();

        let (mut banks_client, payer, recent_blockhash) = ProgramTest::new(
            "bpf_program_template",
            program_id,
            processor!(process_instruction),
        )
        .start()
        .await;

        let mut transaction = Transaction::new_with_payer(
            &[Instruction {
                program_id,
                accounts: vec![AccountMeta::new(payer.pubkey(), false)],
                data: vec![1, 2, 3],
            }],
            Some(&payer.pubkey()),
        );
        transaction.sign(&[&payer], recent_blockhash);

        assert_matches!(banks_client.process_transaction(transaction).await, Ok(()));
    }
}
