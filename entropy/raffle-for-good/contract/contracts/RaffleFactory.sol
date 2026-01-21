// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./ProjectRaffle.sol";

/**
 * @title RaffleFactory
 * @notice Factory contract para crear múltiples rifas de proyectos
 * @dev Solo el owner puede crear nuevas rifas
 */
contract RaffleFactory is Ownable {
    // Array de todas las rifas creadas
    ProjectRaffle[] public raffles;
    
    
    // Mapping para verificar si una dirección es una rifa creada por este factory
    mapping(address => bool) public isRaffle;
    
    // Configuración de Pyth Entropy
    address public entropyAddress;
    
    // Eventos
    event RaffleCreated(
        address indexed raffleAddress,
        string projectName,
        uint256 projectPercentage,
        address indexed creator
    );
    event EntropyConfigUpdated(address entropyAddress);
    
    /**
     * @notice Constructor del factory
     * @param _entropyAddress Dirección del contrato de Pyth Entropy
     * @param _initialOwner Dirección del owner inicial
     */
    constructor(
        address _entropyAddress,
        address _initialOwner
    ) {
        require(_entropyAddress != address(0), "Invalid Entropy address");
        require(_initialOwner != address(0), "Invalid owner address");
        entropyAddress = _entropyAddress;
        _transferOwnership(_initialOwner);
    }
    
    /**
     * @notice Crea una nueva rifa
     * @param name Nombre del proyecto
     * @param description Descripción del proyecto
     * @param projectPercentage Porcentaje para el proyecto (Basis Points: 5000 = 50%)
     * @param projectAddress Dirección del proyecto que recibirá fondos
     * @param raffleDuration Duración de la rifa en segundos
     * @return Dirección del contrato de rifa creado
     */
    function createRaffle(
        string memory name,
        string memory description,
        uint256 projectPercentage,
        address projectAddress,
        uint256 raffleDuration
    ) external returns (address) {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(projectPercentage <= 10000, "Project percentage cannot exceed 100%");
        require(projectPercentage > 0, "Project percentage must be > 0");
        require(projectAddress != address(0), "Invalid project address");
        require(raffleDuration > 0, "Duration must be > 0");
        
        // Crear nueva instancia de ProjectRaffle
        ProjectRaffle raffle = new ProjectRaffle(
            name,
            description,
            projectPercentage,
            entropyAddress,
            msg.sender, // El creador de la rifa es el owner
            owner(), // El admin de la plataforma es el owner del factory
            projectAddress,
            raffleDuration
        );
        
        // Registrar la rifa
        raffles.push(raffle);
        isRaffle[address(raffle)] = true;
        
        emit RaffleCreated(
            address(raffle),
            name,
            projectPercentage,
            msg.sender
        );
        
        return address(raffle);
    }
    
    /**
     * @notice Actualiza la configuración de Entropy
     * @param _entropyAddress Nueva dirección del contrato de Entropy
     */
    function updateEntropyConfig(
        address _entropyAddress
    ) external onlyOwner {
        require(_entropyAddress != address(0), "Invalid Entropy address");
        entropyAddress = _entropyAddress;
        
        emit EntropyConfigUpdated(_entropyAddress);
    }
    
    /**
     * @notice Obtiene el número total de rifas creadas
     * @return Cantidad de rifas
     */
    function getRaffleCount() external view returns (uint256) {
        return raffles.length;
    }
    
    /**
     * @notice Obtiene todas las direcciones de las rifas creadas
     * @return Array de direcciones de rifas
     */
    function getAllRaffles() external view returns (address[] memory) {
        address[] memory result = new address[](raffles.length);
        for (uint256 i = 0; i < raffles.length; i++) {
            result[i] = address(raffles[i]);
        }
        return result;
    }
    
    /**
     * @notice Obtiene información de una rifa específica
     * @param index Índice de la rifa
     * @return raffleAddress Dirección del contrato de rifa
     * @return projectName Nombre del proyecto
     * @return state Estado actual de la rifa
     * @return totalTickets Total de tickets vendidos
     * @return participantCount Número de participantes
     */
    function getRaffleInfo(uint256 index) external view returns (
        address raffleAddress,
        string memory projectName,
        ProjectRaffle.RaffleState state,
        uint256 totalTickets,
        uint256 participantCount
    ) {
        require(index < raffles.length, "Invalid index");
        
        ProjectRaffle raffle = raffles[index];
        raffleAddress = address(raffle);
        projectName = raffle.projectName();
        state = raffle.state();
        totalTickets = raffle.totalTickets();
        participantCount = raffle.getParticipantsCount();
    }
    
    /**
     * @notice Obtiene las últimas N rifas creadas
     * @param count Número de rifas a obtener
     * @return Array de direcciones de las últimas rifas
     */
    function getLatestRaffles(uint256 count) external view returns (address[] memory) {
        uint256 actualCount = count > raffles.length ? raffles.length : count;
        address[] memory result = new address[](actualCount);
        
        for (uint256 i = 0; i < actualCount; i++) {
            result[i] = address(raffles[raffles.length - 1 - i]);
        }
        
        return result;
    }
}

