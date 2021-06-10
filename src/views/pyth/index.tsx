import { PriceStatus } from "@pythnetwork/client";
import { Account, PublicKey, TransactionInstruction } from "@solana/web3.js";
import { Button, Col, Row, Table } from "antd";
import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { sendTransaction, useConnection } from "../../contexts/connection";
import { useWallet } from "../../contexts/wallet";
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
    const signers: Account[] = [];
    instructions.push(
      new TransactionInstruction({
        keys: [
          {
            // GOOG - product
            pubkey: new PublicKey(
              "6XK34harsnbkgfYqzReZfk2aaaKGdu1cp75Urx8uMqzf"
            ),
            isSigner: false,
            isWritable: false,
          },
          {
            // GOOG - price
            pubkey: new PublicKey(
              "AMGjTwxFPUVRz62E3SG1jUxyugW87jZLJ8AyNnNfcJz5"
            ),
            isSigner: false,
            isWritable: false,
          },
        ],
        programId: PYTH_HELLO_WORLD,
      })
    );

    sendTransaction(connection, wallet, instructions, signers).then((txid) => {
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
    });
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
