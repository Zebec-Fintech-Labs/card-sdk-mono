import aggregatorRouterV6 from "./aggregatorRouterV6.json";
import token from "./token.json";
import weth from "./weth.json";
import zebecCard from "./zebecCard.json";

const AGGREGATOR_ROUTER_V6_ABI = aggregatorRouterV6;
const WETH_ABI = weth;
const ERC20_TOKEN_ABI = token.abi;
const ZEBEC_CARD_ABI = zebecCard.abi;

export { AGGREGATOR_ROUTER_V6_ABI, ERC20_TOKEN_ABI, WETH_ABI, ZEBEC_CARD_ABI };
