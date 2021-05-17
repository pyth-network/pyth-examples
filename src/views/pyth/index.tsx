import { PriceStatus } from "@pythnetwork/client";
import { Button, Col, Row, Table } from "antd";
import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import usePyth from "../../hooks/usePyth";
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
