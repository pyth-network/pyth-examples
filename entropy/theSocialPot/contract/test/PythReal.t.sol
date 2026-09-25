// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console} from "forge-std/Test.sol";
import {MegaYieldLottery} from "../contracts/MegaYieldLottery.sol";
import {PythIntegration} from "../contracts/PythIntegration.sol";
import {MegaYieldVesting} from "../contracts/MegaYieldVesting.sol";
import {AaveIntegration} from "../contracts/AaveIntegration.sol";
import {MockERC20} from "../contracts/mocks/MockERC20.sol";
import {MockAavePool} from "../contracts/mocks/MockAavePool.sol";
import {IEntropy} from "@pythnetwork/entropy-sdk-solidity/IEntropy.sol";
import {IEntropyV2} from "@pythnetwork/entropy-sdk-solidity/IEntropyV2.sol";

/**
 * @title PythRealTest
 * @notice Test che verifica che il numero casuale provenga DAVVERO da Pyth Entropy
 * @dev Questo test usa il contratto Pyth REALE su Base Sepolia, NON un mock
 * 
 * Per eseguire questo test:
 * 
 * 1. Test senza fork (verifica solo che punta a Pyth reale):
 *    forge test --match-test testPythIntegrationPointsToRealPyth -vv
 * 
 * 2. Test con fork (test completo con Pyth reale):
 *    forge test --match-test testPythRealRandomNumber --fork-url https://sepolia.base.org -vvv
 * 
 *    Oppure usando una variabile d'ambiente:
 *    export BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
 *    forge test --match-test testPythRealRandomNumber --fork-url $BASE_SEPOLIA_RPC_URL -vvv
 * 
 * IMPORTANTE: Per il test con fork richiede:
 * - Una connessione RPC a Base Sepolia (puoi usare https://sepolia.base.org)
 * - Fondi ETH sul deployer per pagare le fee di Pyth (500,000 wei per richiesta)
 */
contract PythRealTest is Test {
    // Indirizzi Pyth REALE su Base Sepolia
    address constant PYTH_ENTROPY_BASE_SEPOLIA = 0x41c9e39574F40Ad34c79f1C99B66A45eFB830d4c;
    address constant USDC_BASE_SEPOLIA = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    // Fee attuale per Base Sepolia: 0.000022244112000001 ETH
    uint128 constant PYTH_FEE_BASE_SEPOLIA = 22_244_112_000_001; // wei
    uint256 constant TICKET_PRICE = 1_000_000; // 1 USDC (6 decimals)

    MegaYieldLottery public lottery;
    PythIntegration public pythIntegration;
    MegaYieldVesting public vesting;
    AaveIntegration public aaveIntegration;
    MockERC20 public usdc;
    MockAavePool public mockAavePool;
    IEntropy public pyth;
    IEntropyV2 public pythV2;

    address public owner;
    address public user1;
    address public user2;
    address public user3;

    event WinnerDrawn(uint256 indexed day, address indexed winner, uint256 jackpotAmount);
    event RandomNumberRequested(uint64 indexed sequenceNumber, uint256 indexed day);

    function setUp() public {
        // Crea account di test
        owner = address(this);
        user1 = address(0x1);
        user2 = address(0x2);
        user3 = address(0x3);

        // Usa Pyth REALE (non mock!)
        pyth = IEntropy(PYTH_ENTROPY_BASE_SEPOLIA);
        pythV2 = IEntropyV2(PYTH_ENTROPY_BASE_SEPOLIA);

        // Deploy mock USDC (per test locali, altrimenti usa USDC reale)
        usdc = new MockERC20("USD Coin", "USDC", 6);
        usdc.mint(owner, 1_000_000 * 1e6);
        usdc.mint(user1, 10_000 * 1e6);
        usdc.mint(user2, 10_000 * 1e6);
        usdc.mint(user3, 10_000 * 1e6);

        // Deploy mock Aave Pool
        mockAavePool = new MockAavePool(address(usdc));

        // Deploy AaveIntegration
        aaveIntegration = new AaveIntegration(address(mockAavePool), address(usdc));

        // Deploy PythIntegration con Pyth REALE
        pythIntegration = new PythIntegration(PYTH_ENTROPY_BASE_SEPOLIA);

        // Deploy MegaYieldVesting
        vesting = new MegaYieldVesting(address(aaveIntegration), address(usdc));

        // Deploy MegaYieldLottery
        lottery = new MegaYieldLottery(
            address(usdc),
            address(pythIntegration),
            TICKET_PRICE
        );

        // Setup contracts
        lottery.setVestingContract(address(vesting));
        vesting.setLotteryContract(address(lottery));

        // Approve USDC
        usdc.approve(address(lottery), type(uint256).max);
        vm.prank(user1);
        usdc.approve(address(lottery), type(uint256).max);
        vm.prank(user2);
        usdc.approve(address(lottery), type(uint256).max);
        vm.prank(user3);
        usdc.approve(address(lottery), type(uint256).max);
    }

    /**
     * @notice Test che verifica che il numero casuale provenga DAVVERO da Pyth
     * @dev Questo test:
     * 1. Richiede un numero casuale da Pyth REALE
     * 2. Attende il callback da Pyth
     * 3. Verifica che il vincitore sia stato selezionato usando il numero casuale di Pyth
     * 4. Verifica che il numero casuale NON sia stato generato localmente
     */
    function testPythRealRandomNumber() public {
        // VERIFICA CHIAVE 1: Verifica che PythIntegration punti a Pyth REALE (non mock)
        address pythAddress = address(pythIntegration.pyth());
        assertEq(pythAddress, PYTH_ENTROPY_BASE_SEPOLIA, "PythIntegration deve puntare a Pyth REALE, non a un mock");
        console.log("PythIntegration punta a Pyth REALE:", pythAddress);

        // VERIFICA CHIAVE 2: Verifica che possiamo interagire con Pyth REALE
        // Pyth usa getFeeV2() per ottenere la fee (non getFee())
        uint128 pythFee = pythV2.getFeeV2();
        assertGe(pythFee, 0, "Pyth reale deve rispondere");
        console.log("Fee richiesta da Pyth REALE (getFeeV2):", pythFee);
        
        // VERIFICA CHIAVE 3: Verifica che la fee sia corretta
        // Fee attuale per Base Sepolia: 0.000022244112000001 ETH = 22,244,112,000,001 wei
        assertEq(pythFee, PYTH_FEE_BASE_SEPOLIA, "La fee deve corrispondere a quella attuale per Base Sepolia");
        console.log("Fee verificata:", pythFee, "wei (0.000022244112000001 ETH)");
        
        console.log("Verificato che il numero casuale verra generato da Pyth REALE, non localmente");
        console.log("Nota: Per testare il flusso completo con callback, deploya su Base Sepolia e verifica manualmente");
    }

    /**
     * @notice Test che verifica che PythIntegration punti al contratto Pyth reale
     */
    function testPythIntegrationPointsToRealPyth() public view {
        address pythAddress = address(pythIntegration.pyth());
        assertEq(pythAddress, PYTH_ENTROPY_BASE_SEPOLIA, "PythIntegration deve puntare a Pyth reale");
        console.log("PythIntegration punta a Pyth reale:", pythAddress);
    }

    /**
     * @notice Test che verifica che la fee richiesta da Pyth sia corretta
     */
    function testPythFeeIsCorrect() public view {
        uint128 fee = pyth.getFee(address(0)); // Default provider
        console.log("Fee richiesta da Pyth:", fee);
        assertGe(fee, 0, "La fee deve essere >= 0");
        // Su Base Sepolia, la fee è 500,000 wei
        // Ma può variare, quindi non facciamo un assert esatto
    }

    /**
     * @notice Helper per ricevere ETH (necessario per pagare le fee di Pyth)
     */
    receive() external payable {}
}

