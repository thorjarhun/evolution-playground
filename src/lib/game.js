const createActionCreator = (type, ...argNames) => (...args) =>
  argNames.reduce((a,_,i) => ({ ...a, [argNames[i]]: args[i] }), { type });

const createReducer = (initialState, handlers) => (state = initialState, action) =>
  handlers.hasOwnProperty(action.type)
    ? handlers[action.type](state, action)
    : state;

const augmentWith = augmentation => augmentee => ({
	...augmentee,
	...augmentation
});

const augmenter = augmentations => augmentee => Object.keys(augmentations).reduce((augmentee, key) => ({
	...augmentee,
	[key]: isFunction(augmentations[key]) ? augmentations[key](augmentee[key]) : augmentations[key]
}), augmentee);

const append = (...args) => xs => xs.concat(...args);

import {
  ROWS,
  COLUMNS,
  SVG_WIDTH,
  SVG_HEIGHT,
  X_SPACING,
  Y_SPACING,
  BALL_DROP_COLUMN,
  BALL_COLLECTION_COLUMN,
  POPULATION_SIZE,
  INITIAL_GENOME_LENGTH,
  PENALTY_POINTS,
  FITNESS_THRESHOLD,
  CROSSOVER_RATE,
	SPEED,
	DIRECTION
} from '../constants/game';

// TODO: Obsolesce manually updating progress
const advanceProgress = state => ({
	...state,
	individuals: state.individuals.map(individual =>
		individual.progress >= 1
			? individual
			: {
			...individual,
			progress: individual.progress + getInitialProgressIncrement(state.speed) / (individual.helper ? 10 : 3)
		}
	),
	balls: state.balls.map(augmenter({
		progress: progress => progress + getInitialProgressIncrement(state.speed)
	}))
});

const PAUSE_DURATION = 0;

export const nextState = state => {
	if (state.delay) {
		return {
			...state,
			delay: state.delay - 1
		};
	}
	state = advanceProgress(state);
	
	if (state.phase === 1) {
	//	const currentIndividual = state.individuals.findIndex(individual => !individual.showFitness);
		const individual = state.individuals[state.currentIndividual];
		if (individual.progress < 1) {
			return state;
		}
		if (!individual.showFitness) {
			if (!state.gridOn) {
				return {
					...state,
					gridOn: true,
					delay: PAUSE_DURATION
				};
			}
			if (!state.labelsOn) {
				return {
					...state,
					labelsOn: true,
					delay: PAUSE_DURATION
				};
			}
			if (individual.destination !== individualInGamePoint()) {
				return {
					...state,
					individuals: replaceAtIndex(state.individuals, state.currentIndividual, individual => ({
						...individual,
						location: individual.destination,
						destination: individualInGamePoint(),
						progress: 0
					})),
					message: 'EVALUATE FITNESS',
					boxes: loadDNA(state.individuals[state.currentIndividual].DNA)
				};
			}
			if (!state.balls.length) {
				return {
					...state,
					individuals: replaceAtIndex(state.individuals, state.currentIndividual, augmentWith({
						visible: true
					})),
					balls: [createStartBall(state.speed, state.initialBallValue)]
				};
			}
			if (state.balls.some(({row}) => row < ROWS)) {
				return {
					...state,
					balls: advanceBalls(state.balls, state.boxes, true)
				};
			}
			return {
				...state,
				individuals: replaceAtIndex(state.individuals, state.currentIndividual, individual => ({
					...individual,
					showFitness: true,
					fitness: calculatePoints(state.balls) - individual.DNA.xs.length,
					location: individual.destination,
					destination: positionForIndividual(state.currentIndividual),
					progress: 0
				})),
				balls: []
			};
		} else if (state.currentIndividual < POPULATION_SIZE - 1) {
			return {
				...state,
				currentIndividual: state.currentIndividual + 1
			};
		} else if (state.individuals.some((a, index) => state.individuals.slice(index).some(b => a.fitness < b.fitness))) {
			return {
				...state,
				gridOn: false,
				labelsOn: false,
				message: 'SORT POPULATION',
				individuals: sortOnFitness(state.individuals).map((individual, i) => ({
					...individual,
					location: individual.destination,
					destination: positionForIndividual(i),
					progress: 0
				}))
			};
		} else if (state.usingThreshold && state.individuals[0].fitness > FITNESS_THRESHOLD) {
			return {
				...state,
				message: 'DECREASING BALL VALUE', // TODO: Express this more prominently
				initialBallValue: state.initialBallValue - 1,
				currentIndividual: 0,
				individuals: state.individuals.map(augmentWith({
					showFitness: false
				}))
			};
		} else {
			return {
				...state,
				phase: 2
			};
		}
	}

	if (state.mStack.length && state.individuals.every(x => x.progress >= 1)) {
		return animationReducer({
			...state,
			mStack: state.mStack.slice(0, -1)
		}, state.mStack[state.mStack.length-1]);
	}
	return state;
};

export const calculatePoints = balls => balls.filter(({row}) => row >= ROWS).map(ball =>
	ball.column === BALL_COLLECTION_COLUMN
		? ball.value
		: -PENALTY_POINTS
).reduce(add, 0);

const add = (x, y) => x + y;

const advanceBalls = (balls, boxes, animate) =>
	balls.reduce((balls, ball) =>
		balls.concat(animate && ball.progress < 1
			? ball
			: advanceBall(applyDirection(ball), boxes)
		)
		, []);

const advanceBall = (ball, boxes) => moveBall({
	boxType: getBoxType(boxes, ball.row, ball.column),
	ball
}).map((ball, offset) => ({
	...ball,
	progress: offset ? .25 : 0
}));

export const applyDirection = ball => ({
	...ball,
	...{
		[DIRECTION.LEFT]: {
			column: ball.column - 1
		},
		[DIRECTION.RIGHT]: {
			column: ball.column + 1
		},
		[DIRECTION.DOWN]: {
			row: ball.row + 1
		}
	}[ball.direction]
});

export const boxSymbolByIndex = type => 'ALRS'[type];

const getBoxType = (boxes, row, column) => {
	if (row >= 0 && row < ROWS) {
		const box = boxes[row][column];
		return box && boxSymbolByIndex(box.type);
	}
};

const moveBall = ({boxType, ball}) => {
	if (updaters[boxType]) {
		return updaters[boxType](ball);
	} else {
		sendDown(ball);
		return [ball];
	}
};
const sendLeft = ball => {
	if (ball.column === 0) {
		sendDown(ball);
	} else {
		ball.direction = DIRECTION.LEFT;
	}
};

const sendRight = ball => {
	if (ball.column === COLUMNS - 1) {
		sendDown(ball);
	} else {
		ball.direction = DIRECTION.RIGHT;
	}
};

const sendDown = ball => {
	ball.direction = DIRECTION.DOWN;
};

const updaters = {
	A: ball => {
		ball.value++;
		if (ball.direction === DIRECTION.DOWN) {
			sendDown(ball);
		} else if (ball.direction === DIRECTION.RIGHT) {
			sendRight(ball);
		} else {
			sendLeft(ball);
		}
		return [ball];
	},
	L: ball => {
		if (ball.direction === DIRECTION.DOWN) {
			sendRight(ball);
		} else {
			sendDown(ball);
		}
		return [ball];
	},
	R: ball => {
		if (ball.direction === DIRECTION.DOWN) {
			sendLeft(ball);
		} else {
			sendDown(ball);
		}
		return [ball];
	},
	S: ball => {
		var newBall;
		if (ball.direction === DIRECTION.DOWN) {
			if (ball.column === 0) {
				sendRight(ball);
			} else if (ball.column === COLUMNS - 1) {
				sendLeft(ball);
			} else {
				newBall = {...ball};
				sendLeft(newBall);
				sendRight(ball);
			}
		} else if (ball.direction === DIRECTION.RIGHT) {
			if (ball.column === COLUMNS - 1) {
				sendDown(ball);
			} else {
				newBall = {...ball};
				sendDown(newBall);
				sendRight(ball);
			}
		} else if (ball.column === 0) {
			sendDown(ball);
		} else {
			newBall = {...ball};
			sendDown(newBall);
			sendLeft(ball);
		}
		return [ball].concat(newBall || []);
	}
};

const GENERATION_OBJECT = 'GENERATION_OBJECT';
const PAUSE_OBJECT = 'PAUSE_OBJECT';
const SET_STATE_OBJECT = 'SET_STATE_OBJECT';
const MOVE_INDIVIDUAL_BACK_HOME_OBJECT = 'MOVE_INDIVIDUAL_BACK_HOME_OBJECT';
const PURGE_OBJECT = 'PURGE_OBJECT';
const CROSSOVER_OBJECT = 'CROSSOVER_OBJECT';
const MUTATE_OBJECT = 'MUTATE_OBJECT';
const REMOVE_SPACES_OBJECT = 'REMOVE_SPACES_OBJECT';
const DELETE_MUTATION_OPERATION_OBJECT = 'DELETE_MUTATION_OPERATION_OBJECT';
const BRING_IN_PARENT_ONE_OBJECT = 'BRING_IN_PARENT_ONE_OBJECT';
const BRING_IN_PARENT_TWO_OBJECT = 'BRING_IN_PARENT_TWO_OBJECT';
const SHRINK_SPACE_OBJECT = 'SHRINK_SPACE_OBJECT';
const SHRINK_GENE_OBJECT = 'SHRINK_GENE_OBJECT';
const PROCREATE = 'PROCREATE';
const DELETE_MUTATION_OBJECT = 'DELETE_MUTATION_OBJECT';
const INSERT_MUTATION_OBJECT = 'INSERT_MUTATION_OBJECT';
const POINT_MUTATION_OBJECT = 'POINT_MUTATION_OBJECT';
const EXPAND_GENE_OBJECT = 'EXPAND_GENE_OBJECT';

export const generationObject = createActionCreator(GENERATION_OBJECT);
const pauseObject = createActionCreator(PAUSE_OBJECT);
const setStateObject = createActionCreator(SET_STATE_OBJECT, 'mutation');
const moveIndividualBackHomeObject = createActionCreator(MOVE_INDIVIDUAL_BACK_HOME_OBJECT, 'index', 'showFitness');
const purgeObject = createActionCreator(PURGE_OBJECT);
const crossoverObject = createActionCreator(CROSSOVER_OBJECT, 'index', 'ppr');
const mutateObject = createActionCreator(MUTATE_OBJECT, 'index', 'ppr');
const removeSpacesObject = createActionCreator(REMOVE_SPACES_OBJECT, 'index');
const deleteMutationOperationObject = createActionCreator(DELETE_MUTATION_OPERATION_OBJECT, 'index', 'spot');
const bringInParentOneObject = createActionCreator(BRING_IN_PARENT_ONE_OBJECT, 'index');
const bringInParentTwoObject = createActionCreator(BRING_IN_PARENT_TWO_OBJECT, 'index');
const shrinkGeneObject = createActionCreator(SHRINK_GENE_OBJECT, 'index', 'spot', 'fromSize', 'toSize');
const expandGeneObject = createActionCreator(EXPAND_GENE_OBJECT, 'index', 'spot', 'fromSize', 'toSize');
const procreateObject = createActionCreator(PROCREATE, 'index', 'parent1', 'parent2');
const deleteMutationObject = createActionCreator(DELETE_MUTATION_OBJECT, 'index');
const insertMutationObject = createActionCreator(INSERT_MUTATION_OBJECT, 'index');
const pointMutationObject = createActionCreator(POINT_MUTATION_OBJECT, 'index');

const PHASE_ONE = 'PHASE_ONE';
const PHASE_TWO = 'PHASE_TWO';
const RUN_INDIVIDUAL = 'RUN_INDIVIDUAL';
const RUN_ENDED = 'RUN_ENDED';
const BALL_DIED = 'BALL_DIED';

const ballDied = createActionCreator(BALL_DIED, 'index');

const animationReducer = createReducer(null, {
	[PHASE_ONE]: state => state,
	[PHASE_TWO]: state => state,
	[RUN_INDIVIDUAL]: (state, { index }) => state,
	[RUN_ENDED]: state => state,
	[BALL_DIED]: state => (state, { index }) => state,
  [GENERATION_OBJECT]: state => ({
	  ...state,
    generation: state.generation + 1,
	  phase: 1,
	  currentIndividual: state.individuals.findIndex(individual => !individual.showFitness),
	  mStack: state.mStack.concat(
      generationObject(),
      purgeObject())
  }),
  [PURGE_OBJECT]: state => {
    const ppr = parentPickRange(state.individuals);
    const parentIndices = range(POPULATION_SIZE).slice(ppr);
    return augmenter({
      individuals: individuals => individuals.slice(0, ppr).concat(individuals.slice(ppr).map(augmentWith({
        showFitness: false,
        visible: false
      }))),
      mStack: append(parentIndices.reverse().reduce((a, index) =>
        a.concat(ppr > 1 && Math.random() < CROSSOVER_RATE ?
	        crossoverObject(index, ppr) : mutateObject(index, ppr)), []))
    })(state)
  },
  [DELETE_MUTATION_OBJECT]: (state, { index }) => {
    const spot = randomInt(0, state.individuals[index].DNA.xs.length);
    return augmenter({
      mStack: append(
        deleteMutationOperationObject(index, spot),
        shrinkGeneObject(index, spot, 0, 30),
        pauseObject(),
        setStateObject(augmenter({
          individuals: individuals => replaceAtIndex(individuals, index, augmenter({
	          DNA: DNA => replaceGeneAtIndex(DNA, spot, {xs: ' ', ys: ' ', types: ' '})
          }))
        })),
        pauseObject(),
        expandGeneObject(index, spot, 12, 30)
      )
    })(state);
  },
  [INSERT_MUTATION_OBJECT]: (state, { index }) => {
    const spot = randomInt(0, state.individuals[index].DNA.xs.length+1);
    return augmenter({
      mStack: append(
	      setStateObject(augmenter({
		      individuals: individuals => replaceAtIndex(individuals, index, augmentWith({
			      shrinkingGene: false
		      }))
	      })),
        shrinkGeneObject(index, spot, 12, 30),
        pauseObject(),
        expandGeneObject(index, spot, 0, 30),
        setStateObject(augmenter({
          individuals: individuals => replaceAtIndex(individuals, index, augmenter({
	          DNA: DNA => insertGeneAtIndex(DNA, spot, createGene())
          }))
        })),
        pauseObject()
      )
    })(state);
  },
  [POINT_MUTATION_OBJECT]: (state, { index }) => {
    const spot = randomInt(0, state.individuals[index].DNA.xs.length);

	  const mutationsByChromosomeKey = {
		  xs: gene => (+gene + Math.pow(-1, Math.random() < 0.5) + COLUMNS) % COLUMNS,
		  ys: gene => (+gene + Math.pow(-1, Math.random() < 0.5) + ROWS) % ROWS,
		  types: gene => (+gene + randomInt(0, 3)) % 4
	  };

	  const mutateGeneAtIndexInDNAByChromosomeKey = (dna, chromosomeKey, index) => ({
		  ...dna,
		  [chromosomeKey]: replaceAtIndex(dna[chromosomeKey], index, mutationsByChromosomeKey[chromosomeKey])
	  });

	  const randomKey = obj => Object.keys(obj)[randomInt(0, Object.keys(obj).length)];

    return augmenter({
      mStack: append(
	      setStateObject(augmenter({
		      individuals: individuals => replaceAtIndex(individuals, index, augmentWith({ shrinkingGene: false }))
	      })),
        shrinkGeneObject(index, spot, 12, 30),
        pauseObject(),
	      setStateObject(augmenter({
		      individuals: individuals => replaceAtIndex(individuals, index, augmenter({
			      DNA: DNA => mutateGeneAtIndexInDNAByChromosomeKey(DNA, randomKey(mutationsByChromosomeKey), spot)
		      }))
	      })),
        pauseObject(),
        expandGeneObject(index, spot, 12, 30)
      )
    })(state);
  },
  [MUTATE_OBJECT]: (state, { index, ppr }) => {
    const parent = randomInt(0, ppr);
    const mStack = [
      moveIndividualBackHomeObject(index, false),
      moveIndividualBackHomeObject(parent, true)
    ];

    const doMutation = (message, nextObject) => setStateObject(augmenter({
      message,
      individuals: individuals => replaceAtIndex(individuals, index, individual => ({
        ...individuals[parent],
        visible: true,
        fitness: 0,
	      location: individuals[parent].destination,
	      destination: xoverChildPoint(),
        progress: 0,
        showFitness: false,
        expandingGene: false,
        shrinkingGene: false,
        fromSize: 12,
        toSize: 12
      })),
	    mStack: append(nextObject(index))
    }));

	  if (Math.random() < 1/3 && state.individuals[parent].DNA.xs.length > 1) {
      mStack.push(doMutation('DELETE MUTATION', deleteMutationObject));
    } else if (Math.random() < 0.5 && state.individuals[parent].DNA.xs.length < 30) {
      mStack.push(doMutation('INSERTION MUTATION', insertMutationObject));
    } else {
      mStack.push(doMutation('POINT MUTATION', pointMutationObject));
    }
    mStack.push(bringInParentOneObject(parent));
    return {
      ...state,
      mStack: state.mStack.concat(mStack)
    };
  },
  [PROCREATE]: (state, { index, parent1, parent2 }) => {
	  const createMergeableDNA = (dna, flags, toggle) => stringifyEncoding(range(dna.xs.length).map(i =>
	    toggle && flags[i] || !toggle && !flags[i]
		    ? { type: dna.types[i],
				    x: dna.xs[i],
				    y: dna.ys[i] }
		    : { type: ' ', x: ' ', y: ' ' }
	  ));

	  const createHelper = (individual, location, flags, toggle) => ({
		  ...individual,
		  DNA: createMergeableDNA(individual.DNA, flags, toggle),
		  location: {...location},
		  destination: xoverChildPoint(),
		  progress: 0,
		  visible: true,
		  helper: true
	  });

    const [$parent1, $parent2] = [parent1, parent2].map(i => state.individuals[i]);
    const [p1len, p2len] = [$parent1, $parent2].map(p => p.DNA.xs.length);
    const maxLength = Math.max(p1len, p2len);
    const flags = range(maxLength).map(() => Math.random() < 0.5);

    const helper1 = createHelper($parent1, xoverParent1Point(), flags, false);
	  const helper2 = createHelper($parent2, xoverParent2Point(), flags, true);

    return augmenter({
      individuals: individuals => replaceAtIndex(individuals, index, augmenter({
	      location: xoverChildPoint(),
	      destination: xoverChildPoint(),
        fitness: 0,
        showFitness: false,
        visible: false,
        DNA: stringifyEncoding(range(maxLength).map(i => {
	        if (i < [p1len, p2len][+flags[i]]) {
		        const { types, xs, ys } = [$parent1, $parent2][+flags[i]].DNA;
		        return {
			        type: types[i],
			        x: xs[i],
			        y: ys[i]
		        };
	        }
	        return {
		        type: ' ',
		        x: ' ',
		        y: ' '
	        };
        }))
      })).concat(helper1, helper2),
      mStack: append(setStateObject(augmenter({
        individuals: individuals => replaceAtIndex(individuals.slice(0, -2), index, augmentWith({
          visible: true
        }))
      })))
    })(state);
  },
  [CROSSOVER_OBJECT]: (state, { index, ppr }) => {
    const mStack = [];
	  const parent1 = randomInt(0, ppr);
	  const parent2 = (parent1 + randomInt(1, ppr)) % ppr;
    mStack.push(moveIndividualBackHomeObject(index, false));
    mStack.push(moveIndividualBackHomeObject(parent2, true));
    mStack.push(moveIndividualBackHomeObject(parent1, true));
    mStack.push(removeSpacesObject(index));
	  mStack.push(setStateObject(state => ({
		  ...state,
		  individuals: replaceAtIndex(state.individuals, index, individual => ({
			  ...individual,
			  shrinkingGene: individual.DNA.xs.includes(' ')
		  }))
	  })));
    mStack.push(procreateObject(index, parent1, parent2));
    mStack.push(bringInParentTwoObject(parent2));
    mStack.push(bringInParentOneObject(parent1));
    return {
      ...state,
      message: 'CROSSOVER',
      mStack: state.mStack.concat(mStack)
    };
  },
  [BRING_IN_PARENT_ONE_OBJECT]: (state, { index }) => ({
    ...state,
    individuals: replaceAtIndex(state.individuals, index, individual => ({
	    ...individual,
	    location: individual.destination,
	    destination: xoverParent1Point(),
	    progress: 0,
      showFitness: false
    }))
  }),
  [BRING_IN_PARENT_TWO_OBJECT]: (state, { index }) => ({
    ...state,
    individuals: replaceAtIndex(state.individuals, index, individual => ({
	    ...individual,
	    location: individual.destination,
	    destination: xoverParent2Point(),
	    progress: 0,
      showFitness: false
    }))
  }),
  [REMOVE_SPACES_OBJECT]: (state, { index }) => {
    const last = state.individuals[index].DNA.xs.lastIndexOf(' ');
    if (last !== -1) {
	    return {
		    ...state,
		    mStack: state.mStack.concat(
			    removeSpacesObject(index),
	        deleteMutationOperationObject(index, last),
	        shrinkGeneObject(index, last, 12, 0))
	    };
    }
	  return state;
  },
  [SHRINK_GENE_OBJECT]: (state, { index, spot, fromSize, toSize }) => ({
    ...state,
    individuals: replaceAtIndex(state.individuals, index, individual => ({
	    ...individual,
	    location: individual.destination,
	    fromSize,
		  toSize,
		  modIndex: spot,
			progress: 0,
		  expandingGene: false,
		  shrinkingGene: true
		}))
  }),
  [EXPAND_GENE_OBJECT]: (state, { index, spot, fromSize, toSize }) => ({
    ...state,
    individuals: replaceAtIndex(state.individuals, index, individual => ({
	    ...individual,
	    location: individual.destination,
	    fromSize,
      toSize,
      modIndex: spot,
      progress: 0,
      expandingGene: true
    }))
  }),
  [DELETE_MUTATION_OPERATION_OBJECT]: (state, { index, spot }) => ({
    ...state,
    individuals: replaceAtIndex(state.individuals, index, augmenter({
      shrinkingGene: false,
	    DNA: DNA => removeGeneAtIndex(DNA, spot)
    }))
  }),
  [SET_STATE_OBJECT]: (state, { mutation }) => mutation(state),
/*
  [PAUSE_OBJECT]: state => ({
    ...state,
    delay: 25
  }),
*/
  [MOVE_INDIVIDUAL_BACK_HOME_OBJECT]: (state, { index, showFitness }) => ({
    ...state,
    individuals: replaceAtIndex(state.individuals, index, individual => ({
	    ...individual,
	    location: individual.destination,
	    destination: positionForIndividual(index),
	    progress: 0,
      showFitness
    }))
  })
});

const isFunction = x => typeof x === 'function';

export const replaceAtIndex = (xs, index, fn) => xs.slice(0, index).concat(isFunction(fn) ? fn(xs[index]) : fn, xs.slice(index+1));

const replaceIndex = (i, fn, xs) => xs.slice(0, i).concat(isFunction(fn) ? fn(xs[i]) : fn, xs.slice(i + 1));

const insertAtIndex = (xs, index, fn) => xs.slice(0, index).concat(isFunction(fn) ? fn(xs[index]) : fn, xs.slice(index));

const removeAtIndex = (xs, index) => xs.slice(0, index).concat(xs.slice(index+1));

const replaceGeneAtIndex = (dna, index, newGene) => Object.keys(dna).reduce((dna,key) => ({
	...dna,
	[key]: replaceAtIndex(dna[key], index, newGene[key])
}), dna);
const insertGeneAtIndex = (dna, index, newGene) => Object.keys(dna).reduce((dna,key) => ({
	...dna,
	[key]: insertAtIndex(dna[key], index, newGene[key])
}), dna);

const removeGeneAtIndex = (dna, index) => Object.keys(dna).reduce((dna,key) => ({
	...dna,
	[key]: removeAtIndex(dna[key], index)
}), dna);


/* TODO: Make string and array use same monoidal methods:
- slice
- concat
- length
- map/reduce/filter
- shift/unshift
- push/pop
*/

const createGene = () => ({
	xs: randomInt(0, COLUMNS),
	ys: randomInt(0, ROWS),
	types: randomInt(0, 4)
});

const sortOnFitness = individuals => [...individuals].sort((a,b) => b.fitness - a.fitness);

const createStartBall = (speed, initialBallValue) => ({
  row: -1,
  column: BALL_DROP_COLUMN,
  value: initialBallValue,
  direction: DIRECTION.DOWN,
  progress: speed === SPEED.FAST ? 1 : 0
});

import { memoize } from 'ramda';

const individualInGamePoint = memoize(() => ({
  x: pointInPlayground(0, 0).x,
  y: Math.floor(SVG_HEIGHT * 0.75)
}));

const xoverParent1Point = memoize(() => ({
  x: pointInPlayground(0, 0).x,
  y: 0.05 * SVG_HEIGHT
}));

const xoverParent2Point = individualInGamePoint;

const xoverChildPoint = memoize(() => ({
  x: xoverParent1Point().x,
  y: (xoverParent1Point().y + xoverParent2Point().y) / 2
}));

const positionForIndividual = memoize(index => {
  const ySpacing = SVG_HEIGHT * 2 / POPULATION_SIZE;
  if (index < POPULATION_SIZE / 2) {
    return {
      x: 0,
      y: ySpacing * index
    };
  }
  return {
    x: SVG_WIDTH * 0.72,
    y: ySpacing * (index - POPULATION_SIZE / 2)
  };
});

export const pointInPlayground = (row, column) => ({
  x: SVG_WIDTH / 4 + X_SPACING * (column + 1) - 2,
  y: Y_SPACING * (row + 1)
});

export const getInitialProgressIncrement = speed => ({
	[SPEED.FAST]: 0.5,
	[SPEED.MEDIUM]: 0.25,
	[SPEED.SLOW]: 0.05
})[speed];

// [min, max)
const randomInt = (min, max) => min + Math.floor(Math.random() * (max - min));

const range = n => [...Array(n).keys()];

import { comparator, head } from 'ramda';

// TODO: spellcheck
const generateChromosomes = () => range(randomInt(10, INITIAL_GENOME_LENGTH)).map(() => ({
  x: BALL_DROP_COLUMN + randomInt(-1, 3),
  y: randomInt(Math.floor(ROWS / 2), ROWS),
  type: randomInt(0, 4)
}));

const stringifyEncoding = dna => dna.reduce((a,c) => ({
  xs: a.xs + c.x,
  ys: a.ys + c.y,
  types: a.types + c.type
}), { xs: '', ys: '', types: '' });

const stringifyEncoding2 = dna => Object.keys(dna).reduce((a, key) => (a[`${key}s`] = dna[key].join(''),a), {});

const generateIndividual = (location, destination) => ({
  DNA: stringifyEncoding(generateChromosomes()),
  location: {
    x: location.x,
    y: location.y
  },
  destination: {
    x: destination.x,
    y: destination.y
  },
  visible: false,
  fitness: 0,
  progress: 1,
  showFitness: false,
  expandingGene: false,
  shrinkingGene: false,
  fromSize: 12,
  toSize: 12
});

const play = (dna, initialBallValue) => {
	const boxes = loadDNA(dna);
	var balls = [createStartBall(SPEED.FAST, initialBallValue)];
	while (balls.some(({row}) => row < ROWS)) {
		balls = advanceBalls(balls, boxes, false);
	}
	return calculatePoints(balls);
};

const dnaLength = chromosome => chromosome.length;

const checkFitness = (dna, initialBallValue) => Math.max(0, play(dna, initialBallValue) - dnaLength(dna.xs));

export const generateInitialPopulation = initialBallValue => range(POPULATION_SIZE).map(i => {
  const location = positionForIndividual(i);
  const destination = positionForIndividual(i);
	var individual;
	do {
		individual = generateIndividual(location, destination);
	} while (!checkFitness(individual.DNA, initialBallValue));
	return individual;
}).sort(comparator((a, b) => checkFitness(a.DNA, initialBallValue) < checkFitness(b.DNA, initialBallValue)));

const individualIsIC = dna => {
  const length = dnaLength(dna);
  return length >= 5 &&
    checkFitness(dna) > 0 &&
    range(length).every(i => checkFitness(removeGeneAtIndex(dna, i)) <= 0);
};

// assumes population already sorted
const parentPickRange = population => {
  var last = population.findIndex(individual => individual.fitness <= 0);
  if (last === -1) { // if none, keep first half of population anyway
    return population.length / 2;
  }
  // if more than half the population is viable, limit to top half
  return Math.min(last+1, Math.floor(population.length / 2));
};

const loadDNA = ({types, xs, ys}) => {
  const boxes = range(ROWS).map(() => range(COLUMNS).map(() => null));
  range(types.length).forEach(i => {
    const row = +ys[i];
    const column = +xs[i];
    const type = types[i];
    boxes[row][column] = {
      row,
      column,
      type
    };
  });
  return boxes;
};

/* Reference code:
const newKey = (size) => (key) => {
	if (key === -1) { return size - 1 }
	if (key === size) { return 0 }
	return key
}

const newKeys = (size, keys) =>
	keys.map(newKey(size))

const combinePositions = ({ y, x }) =>
	[-1, 0, 1].reduce((a, $y, _, offset) =>
			offset.reduce((b, $x) =>
					($x || $y) ? [...b, [y + $y, x + $x]] : b,
				a
			),
		[]
	)

const getIn = (grid) => (position) =>
	(([y, x]) => grid[y][x])(newKeys(grid.length, position))

export const getNeighbours = (grid, position) =>
	combinePositions(position)
		.map(getIn(grid))
		.reduce((a, b) => a + b)

export const willLive = (isAlive, neighbours) =>
	isAlive
		? neighbours >= 2 && neighbours <= 3
		: neighbours === 3
	*/
/*
function *ICE() {
	const population = generateInitialPopulation();
	var generation = 0;
	while (true) {
		generation++;
		let first = 0;
		if (generation !== 1) {
			first = parentPickRange(population);
			// make all individuals visible
		}
		// bring in playground object
		// evaluate each individual in population.slice(first);
		population.slice(first).forEach(individual => {

		});
		// remove the playground
		const balls = [];
	}
}
*/
