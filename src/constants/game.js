export const POPULATION_SIZE = 20;//20;
export const ROWS = 10;
export const COLUMNS = 10;
export const CROSSOVER_RATE = 0.2;
export const INITIAL_GENOME_LENGTH = 25;
export const BALL_DROP_COLUMN = 4;
export const BALL_COLLECTION_COLUMN = 5;
export const SVG_WIDTH = 800;
export const SVG_HEIGHT = 500;
export const X_SPACING = Math.floor(SVG_WIDTH / 2 / (COLUMNS + 2));
export const Y_SPACING = X_SPACING; //SVG_HEIGHT * 0.7 / (ROWS + 1);
export const PENALTY_POINTS = 0;
export const FITNESS_THRESHOLD = 50;
export const INITIAL_BALL_VALUE = 15;

export const SPEED = {
	SLOW: 'SLOW',
	MEDIUM: 'MEDIUM',
	FAST: 'FAST'
};
export const DIRECTION = {
	DOWN: 'DOWN',
	LEFT: 'LEFT',
	RIGHT: 'RIGHT'
};
