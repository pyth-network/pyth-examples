// Game constants shared between client and server

// World settings
export const WORLD_WIDTH = 5000;
export const WORLD_HEIGHT = 5000;

// Server settings
export const TICK_RATE = 20; // Updates per second
export const TICK_INTERVAL = 1000 / TICK_RATE; // 50ms

// Snake settings
export const SNAKE_BASE_SPEED = 150; // Units per second
export const SNAKE_MAX_ROTATION_SPEED = Math.PI * 2; // Radians per second (360 degrees)
export const SNAKE_INITIAL_LENGTH = 5;
export const SNAKE_SEGMENT_SPACING = 15; // Distance between segments
export const SNAKE_HEAD_RADIUS = 10;
export const SNAKE_SEGMENT_RADIUS = 8;
export const SNAKE_GROWTH_PER_PELLET = 3; // Default segments added per pellet (actual growth varies by pellet size)

// Pellet settings
export const PELLET_COUNT = 200;
export const PELLET_MIN_SIZE = 4;
export const PELLET_MAX_SIZE = 8;
export const PELLET_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
  '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
  '#F8B739', '#52B788'
];

// Collision detection
export const COLLISION_DISTANCE = SNAKE_HEAD_RADIUS + SNAKE_SEGMENT_RADIUS;

// Leaderboard
export const LEADERBOARD_SIZE = 5;

