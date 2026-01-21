// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import { PullPayment } from "@openzeppelin/contracts/security/PullPayment.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import { IEntropyConsumer } from "./interfaces/IEntropyConsumer.sol";
import { IEntropyV2 } from "./interfaces/IEntropyV2.sol";
 
/**
 * @title ProjectRaffle
 * @notice Contrato de rifa para proyectos con integración de Pyth Entropy
 * @dev Los fondos se distribuyen entre: proyecto, owner (mantenimiento), y ganador
 * @dev Usa PullPayment para seguridad y Binary Search para eficiencia
 */
contract ProjectRaffle is Ownable, ReentrancyGuard, PullPayment, IEntropyConsumer {
    // Información del proyecto
    string public projectName;
    string public projectDescription;
    uint256 public projectPercentage; // Porcentaje para el proyecto (Basis Points: 100 = 1%)
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant PLATFORM_FEE = 5; // 0.05% (5/10000)
    uint256 public constant MIN_TICKET_PRICE = 0.0001 ether;
    
    // Estado de la rifa
    enum RaffleState { Active, EntropyRequested, DrawExecuted }
    RaffleState public state;
    
    // Participantes y tickets
    struct TicketRange {
        address owner;
        uint256 upperBound;
    }
    TicketRange[] public participants;
    uint256 public totalTickets;
    
    
    // Ganador y distribución
    address public winner;
    bool public fundsDistributed;
    
    // Control de tiempo
    uint256 public immutable raffleDuration;
    uint256 public immutable raffleStartTime;
    address public projectAddress; // Dirección del proyecto guardada al crear la rifa
    address public platformAdmin; // Administrador de la plataforma
    
    // Pyth Entropy
    IEntropyV2 public entropy;
    address public entropyProvider;
    uint64 public entropySequenceNumber;
    
    // Eventos
    event TicketPurchased(address indexed buyer, uint256 amount, uint256 ticketCount);
    event EntropyRequested(uint64 sequenceNumber);
    event DrawExecuted(address indexed winner, uint256 ticketNumber);
    event FundsDistributed(
        address indexed projectAddress,
        address indexed owner,
        address indexed winner,
        uint256 projectAmount,
        uint256 ownerAmount,
        uint256 winnerAmount
    );
    
    /**
     * @notice Constructor del contrato
     * @param _projectName Nombre del proyecto
     * @param _projectDescription Descripción del proyecto
     * @param _projectPercentage Porcentaje del proyecto en basis points (0-10000)
     * @param _entropyAddress Dirección del contrato de Pyth Entropy
     * @param _initialOwner Dirección del owner inicial
     * @param _platformAdmin Dirección del administrador de la plataforma
     * @param _projectAddress Dirección del proyecto que recibirá fondos
     * @param _raffleDuration Duración de la rifa en segundos
     */
    constructor(
        string memory _projectName,
        string memory _projectDescription,
        uint256 _projectPercentage,
        address _entropyAddress,
        address _initialOwner,
        address _platformAdmin,
        address _projectAddress,
        uint256 _raffleDuration
    ) {
        require(_projectPercentage > 0, "Project percentage must be > 0");
        require(_projectPercentage <= BASIS_POINTS, "Project percentage cannot exceed 100%");
        require(_entropyAddress != address(0), "Invalid Entropy address");
        require(_projectAddress != address(0), "Invalid project address");
        require(_platformAdmin != address(0), "Invalid admin address");
        require(_raffleDuration > 0, "Duration must be > 0");
        require(_initialOwner != address(0), "Invalid owner address");
        
        projectName = _projectName;
        projectDescription = _projectDescription;
        projectPercentage = _projectPercentage;
        entropy = IEntropyV2(_entropyAddress);
        projectAddress = _projectAddress;
        platformAdmin = _platformAdmin;
        raffleDuration = _raffleDuration;
        raffleStartTime = block.timestamp;
        
        // Obtener proveedor por defecto de Pyth
        entropyProvider = entropy.getDefaultProvider();
        require(entropyProvider != address(0), "No default provider available");
        
        state = RaffleState.Active;
        _transferOwnership(_initialOwner);
    }
    
    /**
     * @notice Permite a los usuarios comprar tickets
     * @dev 1 wei = 1 ticket
     */
    function buyTickets() external payable {
        require(state == RaffleState.Active, "Raffle not active");
        require(block.timestamp < raffleStartTime + raffleDuration, "Raffle ended");
        require(msg.value >= MIN_TICKET_PRICE, "Minimum ticket price is 0.0001 ETH");
        
        totalTickets += msg.value;
        
        // Guardar rango de tickets para este usuario
        // El límite superior es el nuevo total de tickets
        participants.push(TicketRange({
            owner: msg.sender,
            upperBound: totalTickets
        }));
        
        emit TicketPurchased(msg.sender, msg.value, totalTickets); // Emitimos total acumulado
    }
    
    modifier onlyOwnerOrAdmin() {
        require(msg.sender == owner() || msg.sender == platformAdmin, "Not authorized");
        _;
    }
    
    /**
     * @notice Solicita entropía a Pyth para ejecutar el sorteo
     * @dev Solo el owner o admin puede ejecutar esta función
     * @param userRandomNumber Número aleatorio generado por el usuario
     */
    function requestEntropy(bytes32 userRandomNumber) external payable onlyOwnerOrAdmin {
        require(state == RaffleState.Active, "Raffle not active");
        // require(block.timestamp >= raffleStartTime + raffleDuration, "Raffle still active"); // Comentado para permitir cierre anticipado
        require(totalTickets > 0, "No tickets sold");
        require(participants.length > 0, "No participants");
        
        state = RaffleState.EntropyRequested;
        
        // Obtener el fee necesario para la solicitud
        uint256 fee = entropy.getFee(entropyProvider);
        require(msg.value >= fee, "Insufficient fee");
        
        // Solicitar entropía a Pyth
        entropySequenceNumber = entropy.request{value: fee}(
            entropyProvider,
            userRandomNumber,
            true // use blockhash
        );
        
        emit EntropyRequested(entropySequenceNumber);
        
        // Devolver exceso de fondos si los hay
        if (msg.value > fee) {
            payable(msg.sender).transfer(msg.value - fee);
        }
    }
    
    /**
     * @notice Callback de Pyth con la entropía generada
     * @dev Esta función será llamada por el contrato de Entropy
     * @param sequenceNumber Número de secuencia de la solicitud
     * @param provider Dirección del proveedor
     * @param randomNumber Número aleatorio generado
     */
    function entropyCallback(
        uint64 sequenceNumber,
        address provider,
        bytes32 randomNumber
    ) external override {
        require(msg.sender == address(entropy), "Only entropy contract");
        require(state == RaffleState.EntropyRequested, "Entropy not requested");
        require(sequenceNumber == entropySequenceNumber, "Invalid sequence number");
        require(provider == entropyProvider, "Invalid provider");
        
        // Seleccionar ganador
        winner = _selectWinner(randomNumber);
        state = RaffleState.DrawExecuted;
        
        emit DrawExecuted(winner, uint256(randomNumber) % totalTickets);
    }
    
    /**
     * @notice Obtiene la dirección del contrato de Entropy
     * @return Dirección del contrato de Entropy
     */
    function getEntropy() external view override returns (address) {
        return address(entropy);
    }
    
    /**
     * @notice Distribuye los fondos entre proyecto, owner y ganador usando PullPayment
     * @dev Los beneficiarios deben llamar a withdrawPayments() para retirar sus fondos
     */
    function distributeFunds() external onlyOwnerOrAdmin nonReentrant {
        require(state == RaffleState.DrawExecuted, "Draw not executed");
        require(!fundsDistributed, "Funds already distributed");
        require(winner != address(0), "No winner selected");
        require(projectAddress != address(0), "Invalid project address");
        
        fundsDistributed = true;
        
        uint256 totalBalance = address(this).balance;
        
        // Calcular distribución (Base 10000)
        // Fee de plataforma fijo: 0.05%
        uint256 platformAmount = (totalBalance * PLATFORM_FEE) / BASIS_POINTS;
        
        // El resto del pozo se divide entre proyecto y ganador
        uint256 distributablePool = totalBalance - platformAmount;
        
        // Porcentaje para el proyecto sobre el pozo restante
        uint256 projectAmount = (distributablePool * projectPercentage) / BASIS_POINTS;
        
        // El resto va al ganador
        uint256 winnerAmount = distributablePool - projectAmount;
        
        // Registrar pagos pendientes (patrón pull payment - más seguro)
        _asyncTransfer(projectAddress, projectAmount);
        _asyncTransfer(platformAdmin, platformAmount); // Paga al admin de la plataforma
        _asyncTransfer(winner, winnerAmount);
        
        emit FundsDistributed(
            projectAddress,
            platformAdmin,
            winner,
            projectAmount,
            platformAmount,
            winnerAmount
        );
    }
    
    /**
     * @notice Selecciona el ganador usando Binary Search - O(log n)
     * @param entropySeed Entropía generada por Pyth
     * @return Dirección del ganador
     */
    function _selectWinner(bytes32 entropySeed) internal view returns (address) {
        require(participants.length > 0, "No participants");
        
        // Usar entropía de Pyth para seleccionar ticket ganador
        // El randomTicket está entre 0 y totalTickets - 1
        uint256 randomTicket = uint256(entropySeed) % totalTickets;
        
        // Binary search en array de participants (buscando upperBound) - O(log n)
        uint256 left = 0;
        uint256 right = participants.length - 1;
        
        while (left < right) {
            uint256 mid = (left + right) / 2;
            
            // Si randomTicket es menor que el límite superior de este rango,
            // el ganador podría ser este o uno anterior.
            if (participants[mid].upperBound > randomTicket) {
                right = mid;
            } else {
                // Si randomTicket es >= upperBound, el ganador está después
                left = mid + 1;
            }
        }
        
        return participants[left].owner;
    }
    
    /**
     * @notice Obtiene el array de participantes
     * @return Array de direcciones de participantes
     */
    function getParticipantsCount() external view returns (uint256) {
        return participants.length;
    }
    
    function getTicketRange(uint256 index) external view returns (address owner, uint256 upperBound) {
        TicketRange memory range = participants[index];
        return (range.owner, range.upperBound);
    }
    
    /**
     * @notice Obtiene el balance total del contrato
     * @return Balance en wei
     */
    function getTotalBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @notice Verifica si la rifa está activa para comprar tickets
     * @return true si está activa y dentro del tiempo
     */
    function isActive() external view returns (bool) {
        return state == RaffleState.Active && 
               block.timestamp < raffleStartTime + raffleDuration;
    }
    
    /**
     * @notice Obtiene el tiempo restante de la rifa
     * @return Segundos restantes, 0 si ya terminó
     */
    function getTimeRemaining() external view returns (uint256) {
        uint256 endTime = raffleStartTime + raffleDuration;
        if (block.timestamp >= endTime) {
            return 0;
        }
        return endTime - block.timestamp;
    }
    
    /**
     * @notice Obtiene información del ganador potencial sin ejecutar el sorteo
     * @param entropySeed Entropía de prueba
     * @return Dirección del potencial ganador
     */
    function previewWinner(bytes32 entropySeed) external view returns (address) {
        require(participants.length > 0, "No participants");
        return _selectWinner(entropySeed);
    }
    
    /**
     * @notice Función de emergencia para forzar la selección del ganador (solo owner/admin)
     * @dev Permite al owner seleccionar el ganador sin esperar a Pyth (para testing/emergencias)
     * @param randomNumber Número aleatorio a usar para la selección
     */
    function forceSelectWinner(bytes32 randomNumber) external onlyOwnerOrAdmin {
        require(state == RaffleState.Active || state == RaffleState.EntropyRequested, "Invalid state");
        require(participants.length > 0, "No participants");
        require(totalTickets > 0, "No tickets sold");
        
        // Seleccionar ganador
        winner = _selectWinner(randomNumber);
        state = RaffleState.DrawExecuted;
        
        emit DrawExecuted(winner, uint256(randomNumber) % totalTickets);
    }
}

