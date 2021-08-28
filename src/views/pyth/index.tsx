import { PriceStatus } from "@pythnetwork/client";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  Keypair,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import { Button, Col, Row, Table } from "antd";
import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { sendTransaction, useConnection } from "../../contexts/connection";
import usePyth from "../../hooks/usePyth";
import { PYTH_HELLO_WORLD } from "../../utils/ids";
import { notify } from "../../utils/notifications";
import sigFigs from "../../utils/sigFigs";

const columns = [
  { title: "Symbol", dataIndex: ["product", "symbol"] },
  { title: "Asset Type", dataIndex: ["product", "asset_type"] },
  {
    title: "Status",
    dataIndex: ["price", "status"],
    render: (value: number) => PriceStatus[value],
  },
  {
    title: "Valid Slot",
    dataIndex: ["price", "validSlot"],
    render: (value: BigInt) => value.toString(),
  },
  {
    title: "Price",
    dataIndex: ["price", "price"],
    align: "right" as "right",
    render: (value: number) => `$${sigFigs(value)}`,
  },
  {
    title: "Confidence",
    dataIndex: ["price", "confidence"],
    align: "right" as "right",
    render: (value: number) => `\xB1$${sigFigs(value)}`,
  },
];

export const PythView = () => {
  const { symbolMap } = usePyth();
  const { wallet, connected, connect } = useWallet();
  const connection = useConnection();

  const executeTest = () => {
    if (!wallet) {
      return;
    }

    const instructions: TransactionInstruction[] = [];
    const signers: Keypair[] = [];
    instructions.push(
      new TransactionInstruction({
        keys: [
          {
            // GOOG - product
            pubkey: new PublicKey(
              "CpPmHbFqkfejPcF8cvxyDogm32Sqo3YGMFBgv3kR1UtG"
            ),
            isSigner: false,
            isWritable: false,
          },
          {
            // GOOG - price
            pubkey: new PublicKey(
              "CZDpZ7KeMansnszdEGZ55C4HjGsMSQBzxPu6jqRm6ZrU"
            ),
            isSigner: false,
            isWritable: false,
          },
        ],
        programId: PYTH_HELLO_WORLD,
      })
    );

    sendTransaction(connection, wallet.adapter(), instructions, signers).then(
      (txid) => {
        notify({
          message: "Transaction executed on Solana",
          description: (
            <a
              href={`https://explorer.solana.com/tx/${txid}?cluster=devnet`}
              // eslint-disable-next-line react/jsx-no-target-blank
              target="_blank"
            >
              Explorer Link
            </a>
          ),
          type: "success",
        });
      }
    );
  };

  const products: object[] = useMemo(
    () =>
      Object.keys(symbolMap)
        .sort()
        .map((s) => symbolMap[s]),
    [symbolMap]
  );
  return (
    <Row gutter={[16, 16]} align="middle">
      <Col span={24}>
        <Table dataSource={products} columns={columns} />
      </Col>
      <Col span={24}>
        <Button onClick={connected ? executeTest : connect}>
          {connected ? "Execute Test Transaction" : "Connect Wallet"}
        </Button>
      </Col>
      <Col span={24}>
        <Link to="/">
          <Button>Back</Button>
        </Link>
      </Col>
      <Col span={24}>
        <div className="builton" />
      </Col>
    </Row>
  );
};
