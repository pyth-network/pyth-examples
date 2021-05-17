import numeral from "numeral";

const sigFigs = (n: number) =>
  n < 0.1
    ? numeral(n).format("0.00000000").toUpperCase()
    : n < 1
    ? numeral(n).format("0.000000").toUpperCase()
    : n < 10
    ? numeral(n).format("0.00000").toUpperCase()
    : n < 100
    ? numeral(n).format("00.0000").toUpperCase()
    : n < 1000
    ? numeral(n).format("000.000").toUpperCase()
    : numeral(n).format("0,0.00").toUpperCase();

export default sigFigs;
