/* Reference code:
// immutable helper to set array value at index { i }
const set = (i, value, xs) => [
  ...xs.slice(0, i),
  value,
  ...xs.slice(i + 1)
]

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

const makeActionCreator = (type, ...argNames) => (...args) =>
  argNames.reduce((a,_,i) => ({ ...a, [argNames[i]]: args[i] }), { type });

const createReducer = (initialState, handlers) => (state = initialState, action) =>
  handlers.hasOwnProperty(action.type)
    ? handlers[action.type](state, action)
    : state;

const SLOW = 'SLOW';
const MEDIUM = 'MEDIUM';
const FAST = 'FAST';

export const SPEED = {
  SLOW,
  MEDIUM,
  FAST
};

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
  CROSSOVER_RATE
} from '../constants/game';

export const nextState = state => {
//	debugger
  if (state.activeList.length) {
    console.log('activeList');
	  return state.activeList.reduce(effectReducer, {
      ...state,
      activeList: []
    });
  }
	if (state.individuals.some(x => x.progress < 1)) {
//		debugger
		console.log('progress');
		return state.individuals.reduce((state, individual, i) =>
				individual.progress < 1
					? moveIndividualEffectFn(state, i)
					: state,
			state);
	}
	console.log('mStack');
//debugger
  while (!state.activeList.length && state.mStack.length && !state.paused && !state.individuals.some(x => x.progress < 1)) {
	  //debugger
    state = animationReducer({
      ...state,
      mStack: state.mStack.slice(0, -1)
    }, state.mStack[state.mStack.length-1]);
  }
  return state;
};

const PAUSE_EFFECT = 'PAUSE_EFFECT';
const DROP_BALL_EFFECT = 'DROP_BALL_EFFECT';

const pauseEffect = makeActionCreator(PAUSE_EFFECT, 'time');
const dropBallEffect = makeActionCreator(DROP_BALL_EFFECT, 'index');

const moveIndividualEffectFn = (state, index) => {
	const individual = {...state.individuals[index]};
	const activeList = [...state.activeList];
	if (individual.expandingGene || individual.shrinkingGene) {
		console.assert(individual.expandingGene - individual.shrinkingGene);
		individual.progress += getInitialProgressIncrement(state.speed);
	} else {
		individual.progress += getInitialProgressIncrement(state.speed) / (individual.helper ? 10 : 3);
		if (individual.progress >= 1 || state.speed === FAST) {
			individual.location = {
				x: individual.destination.x,
				y: individual.destination.y
			};
		}
	}
	return {
		...state,
		activeList,
		individuals: replaceAtIndex(state.individuals, index, () => individual)
	};
};

const effectReducer = createReducer(null, {
  [PAUSE_EFFECT]: (state, { time }) => {
    if (!time || state.speed === FAST) {
      return state;
    }
    return {
      ...state,
      activeList: [...state.activeList, pauseEffect(time-1)]
    };
  },
  [DROP_BALL_EFFECT]: (state, { index }) => {
    var ball = {...state.balls[index]};
    if (ball.row >= ROWS + 2) {
      return state;
    }
    ball.progress += getInitialProgressIncrement(state.speed);
    var collectedPoints = state.collectedPoints;
    var activeList = [...state.activeList];
    if (ball.progress > 0.999 || state.speed === FAST) {
      collectedPoints += moveBall({
        animate: true,
        speed: state.speed,
        activeList,
        boxes: state.boxes,
        balls: state.balls,
        ball,
        index
      });
    } else if (!ball.dead) {
      activeList.push(dropBallEffect(index));
    }
    return {
      ...state,
      balls: replaceAtIndex(state.balls, index, () => ball),
      collectedPoints,
      activeList
    };
  }
});

const DOWN = 'DOWN';
const LEFT = 'LEFT';
const RIGHT = 'RIGHT';
const DIRECTION = {
  DOWN, LEFT, RIGHT
};

const getCollectedPoints = ({ball, index, speed, activeList, prevRow, prevColumn, animate}) => {
  if (animate) {
    ball.location = pointInPlayground(prevRow, prevColumn);
    ball.destination = pointInPlayground(ball.row, ball.column);
    ball.progress = 0;
    if (speed === SPEED.FAST) {
      ball.progress = 0.99;
    }
    activeList.push(dropBallEffect(index));
  }
  if (ball.row > ROWS) {
    ball.dead = true;
    if (ball.column === BALL_COLLECTION_COLUMN) {
      return ball.value;
    }
    return -PENALTY_POINTS;
  }
  return 0;
};

const moveBall = ({animate, speed, activeList, boxes, balls, ball, index}) => {
  const prevRow = ball.row;
  const prevColumn = ball.column;
  var box;
  if (ball.column >= 0 && ball.column < COLUMNS && ball.row >= 0 && ball.row < ROWS) {
    box = boxes[ball.row][ball.column]; // this might be null
  }

  if (!box) {
    ball.direction = DIRECTION.DOWN;
    ball.row++;
    return getCollectedPoints({
      ball,
      index,
      speed,
      activeList,
      prevRow,
      prevColumn,
      animate
    });
  }
  const makeNewBall = ball => ({
    ...ball,
    dead: false
  });
  var newBall;
  switch (box.type) {
    case '0':
      ball.value++;
      if (ball.direction === DIRECTION.DOWN) {
        ball.row++;
      } else if (ball.direction === DIRECTION.RIGHT) {
        ball.column++;
        if (ball.column >= COLUMNS) {
          ball.column--;
          ball.row++;
          ball.direction = DIRECTION.DOWN;
        }
      } else {
        ball.column--;
        if (ball.column < 0) {
          ball.column++;
          ball.row++;
          ball.direction = DIRECTION.DOWN;
        }
      }
      break;
    case '1':
      if (ball.direction === DIRECTION.DOWN) {
        ball.column++;
        ball.direction = DIRECTION.RIGHT;
        if (ball.column >= COLUMNS) {
          ball.column--;
          ball.row++;
          ball.direction = DIRECTION.DOWN;
        }
      } else {
        ball.row++;
        ball.direction = DIRECTION.DOWN;
      }
      break;
    case '2':
      if (ball.direction === DIRECTION.DOWN) {
        ball.column--;
        ball.direction = DIRECTION.LEFT;
        if (ball.column < 0) {
          ball.column++;
          ball.row++;
          ball.direction = DIRECTION.DOWN;
        }
      } else {
        ball.row++;
        ball.direction = DIRECTION.DOWN;
      }
      break;
    case '3':
      if (ball.direction === DIRECTION.DOWN) {
        if (ball.column === 0) {
          ball.column++;
          ball.direction = DIRECTION.RIGHT;
        } else if (ball.column === COLUMNS - 1) {
          ball.column--;
          ball.direction = DIRECTION.LEFT;
        } else {
          newBall = makeNewBall(ball);
          ball.column++;
          ball.direction = DIRECTION.RIGHT;
          newBall.column--;
          newBall.direction = DIRECTION.LEFT;
        }
      } else if (ball.direction === DIRECTION.RIGHT) {
        if (ball.column === COLUMNS - 1) {
          ball.row++;
          ball.direction = DIRECTION.DOWN;
        } else {
          newBall = makeNewBall(ball);
          ball.column++;
          newBall.row++;
          newBall.direction = DIRECTION.DOWN;
        }
      } else if (ball.column === 0) {
        ball.row++;
        ball.direction = DIRECTION.DOWN;
      } else {
        newBall = makeNewBall(ball);
        ball.column--;
        newBall.row++;
        newBall.direction = DIRECTION.DOWN;
      }
      break;
  }

  var collectedPoints = getCollectedPoints({
    ball,
    index,
    speed,
    activeList,
    prevRow,
    prevColumn,
    animate
  });
  if (newBall) {
    collectedPoints += getCollectedPoints({
      ball: newBall,
      index: balls.length,
      speed,
      activeList,
      prevRow,
      prevColumn,
      animate
    });
    balls.push(newBall);
  }
  return collectedPoints;
};

const GENERATION_OBJECT = 'GENERATION_OBJECT';
const EVALUATE_FITNESS_OBJECT = 'EVALUATE_FITNESS_OBJECT';
const SORT_ON_FITNESS_OBJECT = 'SORT_ON_FITNESS_OBJECT';
const BRING_IN_PLAYGROUND_OBJECT = 'BRING_IN_PLAYGROUND_OBJECT';
const EVAL_INDIVUDUAL_OBJECT = 'EVAL_INDIVIDUAL_OBJECT';
const REMOVE_PLAYGROUND_OBJECT = 'REMOVE_PLAYGROUND_OBJECT';
const PAUSE_OBJECT = 'PAUSE_OBJECT';
const SET_STATE_OBJECT = 'SET_STATE_OBJECT';
const MOVE_INDIVIDUAL_OBJECT = 'MOVE_INDIVIDUAL_OBJECT';
const MOVE_INDIVIDUAL_BACK_HOME_OBJECT = 'MOVE_INDIVIDUAL_BACK_HOME_OBJECT';
const CHECK_FOR_IC_OBJECT = 'CHECK_FOR_IC_OBJECT'; // TODO
const ASSIGN_FITNESS_OBJECT = 'ASSIGN_FITNESS_OBJECT';
const DRAW_INDIVIDUAL_OBJECT = 'DRAW_INDIVIDUAL_OBJECT';
const CHECK_THRESHOLD_OBJECT = 'CHECK_THRESHOLD_OBJECT';
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
const INSERT_MUTATION_OPERATION_OBJECT = 'INSERT_MUTATION_OPERATION_OBJECT';

export const generationObject = makeActionCreator(GENERATION_OBJECT);
const evaluateFitnessObject = makeActionCreator(EVALUATE_FITNESS_OBJECT, 'everybody');
const sortOnFitnessObject = makeActionCreator(SORT_ON_FITNESS_OBJECT);
const evalIndividualObject = makeActionCreator(EVAL_INDIVUDUAL_OBJECT, 'index');
const pauseObject = makeActionCreator(PAUSE_OBJECT);
const setStateObject = makeActionCreator(SET_STATE_OBJECT, 'mutation');
const moveIndividualObject = makeActionCreator(MOVE_INDIVIDUAL_OBJECT, 'index', 'destination');
const moveIndividualBackHomeObject = makeActionCreator(MOVE_INDIVIDUAL_BACK_HOME_OBJECT, 'index', 'showFitness')
const checkForIcObject = makeActionCreator(CHECK_FOR_IC_OBJECT, 'index');
const assignFitnessObject = makeActionCreator(ASSIGN_FITNESS_OBJECT, 'index');
const drawIndividualObject = makeActionCreator(DRAW_INDIVIDUAL_OBJECT, 'index');
const checkThresholdObject = makeActionCreator(CHECK_THRESHOLD_OBJECT);
const purgeObject = makeActionCreator(PURGE_OBJECT);
const crossoverObject = makeActionCreator(CROSSOVER_OBJECT, 'index', 'ppr');
const mutateObject = makeActionCreator(MUTATE_OBJECT, 'index', 'ppr');
const removeSpacesObject = makeActionCreator(REMOVE_SPACES_OBJECT, 'index');
const deleteMutationOperationObject = makeActionCreator(DELETE_MUTATION_OPERATION_OBJECT, 'index', 'spot');
const bringInParentOneObject = makeActionCreator(BRING_IN_PARENT_ONE_OBJECT, 'index');
const bringInParentTwoObject = makeActionCreator(BRING_IN_PARENT_TWO_OBJECT, 'index');
const shrinkGeneObject = makeActionCreator(SHRINK_GENE_OBJECT, 'index', 'spot', 'fromSize', 'toSize');
const expandGeneObject = makeActionCreator(EXPAND_GENE_OBJECT, 'index', 'spot', 'fromSize', 'toSize');
const procreateObject = makeActionCreator(PROCREATE, 'index', 'parent1', 'parent2');
const deleteMutationObject = makeActionCreator(DELETE_MUTATION_OBJECT, 'index');
const insertMutationObject = makeActionCreator(INSERT_MUTATION_OBJECT, 'index');
const pointMutationObject = makeActionCreator(POINT_MUTATION_OBJECT, 'index');

const augmentWith = augmentation => augmentee => ({
	...augmentee,
	...augmentation
});

const augmenter = augmentations => augmentee => Object.keys(augmentations).reduce((augmentee, key) => ({
	...augmentee,
	[key]: isFunction(augmentations[key]) ? augmentations[key](augmentee[key]) : augmentations[key]
}), augmentee);

const animationReducer = createReducer(null, {
  [GENERATION_OBJECT]: state => ({
    ...state,
    generation: state.generation + 1,
    mStack: [...state.mStack,
      generationObject(),
      purgeObject(),
      checkThresholdObject(),
      sortOnFitnessObject(),
      evaluateFitnessObject(!state.generation)]
  }),
	[EVALUATE_FITNESS_OBJECT]: (state, { everybody }) => ({
		...state,
		message: 'EVALUATE FITNESS',
		mStack: [...state.mStack,
			setStateObject(augmentWith({
				boxesOn: false,
				gridOn: false,
				labelsOn: false,
				collectedPoints: 0
			})),
			...range(POPULATION_SIZE).slice(everybody ? 0 : parentPickRange(state.individuals))
				.reverse()
				.map(evalIndividualObject),
			setStateObject(augmenter({
				collectedPoints: 0,
				mStack: mStack => mStack.concat(
					setStateObject(augmentWith({boxesOn: true})),
					pauseObject(),
					setStateObject(augmentWith({labelsOn: true})),
					pauseObject(),
					setStateObject(augmentWith({gridOn: true}))
				)
			}))
		]
	}),
  [PURGE_OBJECT]: state => {
    const ppr = parentPickRange(state.individuals);
    const parentIndices = range(POPULATION_SIZE).slice(ppr);
    return {
      ...state,
      individuals: state.individuals.slice(0, ppr).concat(state.individuals.slice(ppr).map(individual => ({
        ...individual,
        showFitness: false,
        visible: false
      }))),
      mStack: state.mStack.concat(parentIndices.reduce((a, index) =>
        a.concat(ppr > 1 && Math.random() < CROSSOVER_RATE ?
	        crossoverObject(index, ppr) : mutateObject(index, ppr)), []))
    }
  },
  [DELETE_MUTATION_OBJECT]: (state, { index }) => {
    const spot = randomInt(0, state.individuals[index].DNA.xs.length);
    return {
      ...state,
      mStack: [...state.mStack,
        deleteMutationOperationObject(index, spot),
        shrinkGeneObject(index, spot, 0, 30),
        pauseObject(),
        setStateObject(state => ({
          ...state,
          individuals: replaceAtIndex(state.individuals, index, individual => ({
            ...individual,
	          DNA: replaceGeneAtIndex(individual.DNA, spot, {xs: ' ', ys: ' ', types: ' '})
          }))
        })),
        pauseObject(),
        expandGeneObject(index, spot, 12, 30)
      ]
    };
  },
  [INSERT_MUTATION_OBJECT]: (state, { index }) => {
    const spot = randomInt(0, state.individuals[index].DNA.xs.length+1);
    return {
      ...state,
      mStack: [...state.mStack,
	      setStateObject(state => ({
		      ...state,
		      individuals: replaceAtIndex(state.individuals, index, individual => ({
			      ...individual,
			      shrinkingGene: false
		      }))
	      })),
        shrinkGeneObject(index, spot, 12, 30),
        pauseObject(),
        expandGeneObject(index, spot, 0, 30),
        setStateObject(state => ({
          ...state,
          individuals: replaceAtIndex(state.individuals, index, individual => ({
            ...individual,
	          DNA: insertGeneAtIndex(individual.DNA, spot, createGene())
          }))
        })),
        pauseObject()
      ]
    };
  },
  [POINT_MUTATION_OBJECT]: (state, { index }) => {
    const spot = randomInt(0, state.individuals[index].DNA.xs.length);

	  const mutationsByChromosomeKey = {
		  xs: gene => (+gene + Math.pow(-1, Math.random() < 0.5) + COLUMNS) % COLUMNS,
		  ys: gene => (+gene + Math.pow(-1, Math.random() < 0.5) + ROWS) % ROWS,
		  types: gene => (+gene + randomInt(0, 3)) % 4
	  };

	  const mutateGeneByChromosomeKey = chromosomeKey => mutationsByChromosomeKey[chromosomeKey];

	  const mutateChromosomeAtIndexByChromosomeKey = (chromosome, index, chromosomeKey) =>
		  replaceAtIndex(chromosome, index, mutateGeneByChromosomeKey(chromosomeKey));

	  const mutateGeneAtIndexInDNAByChromosomeKey = (dna, chromosomeKey, index) => ({
		  ...dna,
		  [chromosomeKey]: mutateChromosomeAtIndexByChromosomeKey(dna[chromosomeKey], index, chromosomeKey)
	  });
	  /*
	  const mutateGeneAtIndexInDNAByChromosomeKey = (dna, chromosomeKey, index) => ({
		  ...dna,
		  [chromosomeKey]: replaceAtIndex(dna[chromosomeKey], index, oldGene => ({
			  xs: (+oldGene + Math.pow(-1, Math.random() < 0.5) + COLUMNS) % COLUMNS,
			  ys: (+oldGene + Math.pow(-1, Math.random() < 0.5) + ROWS) % ROWS,
			  types: (+oldGene + randomInt(0, 3)) % 4
		  })[chromosomeKey])
	  });
	  */


    return {
      ...state,
      mStack: [...state.mStack,
	      setStateObject(augmenter({
		      individuals: individuals => replaceAtIndex(individuals, index, augmentWith({ shrinkingGene: false }))
	      })),
        shrinkGeneObject(index, spot, 12, 30),
        pauseObject(),
	      setStateObject(augmenter({
		      individuals: individuals => replaceAtIndex(individuals, index, augmenter({
			      DNA: DNA => mutateGeneAtIndexInDNAByChromosomeKey(DNA, Object.keys(mutationsByChromosomeKey)[randomInt(0, 3)], spot)
		      }))
	      })),
        pauseObject(),
        expandGeneObject(index, spot, 12, 30)
      ]
    };
  },
  [MUTATE_OBJECT]: (state, { index, ppr }) => {
    const parent = randomInt(0, ppr);
    const mStack = [
      moveIndividualBackHomeObject(index, false),
      moveIndividualBackHomeObject(parent, true)
    ];

    const doMutation = (message, nextObject) => setStateObject(state => ({
      ...state,
      message,
      individuals: replaceAtIndex(state.individuals, index, () => ({
        ...state.individuals[parent],
        visible: true,
        fitness: 0,
	      destination: xoverChildPoint(),
        progress: 0,
        showFitness: false,
        expandingGene: false,
        shrinkingGene: false,
        fromSize: 12,
        toSize: 12
      })),
      mStack: state.mStack.concat(nextObject(index))
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

    return {
      ...state,
      individuals: replaceAtIndex(state.individuals, index, individual => ({
        ...individual,
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
      mStack: state.mStack.concat(setStateObject(state => ({
        ...state,
        individuals: replaceAtIndex(state.individuals.slice(0, -2), index, individual => ({
          ...individual,
          visible: true
        }))
      })))
    };
  },
  [CROSSOVER_OBJECT]: (state, { index, ppr }) => {
    const mStack = [];
    const parents = {};
    while (Object.keys(parents).length < 2) {
      parents[randomInt(0, ppr)] = true;
    }
    const [parent1, parent2] = Object.keys(parents).map(i => +i);
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
	    destination: xoverParent1Point(),
	    progress: 0,
      showFitness: false
    }))
  }),
  [BRING_IN_PARENT_TWO_OBJECT]: (state, { index }) => ({
    ...state,
    individuals: replaceAtIndex(state.individuals, index, individual => ({
	    ...individual,
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
    individuals: replaceAtIndex(state.individuals, index, individual => shrink(individual, spot, fromSize, toSize))
  }),
  [EXPAND_GENE_OBJECT]: (state, { index, spot, fromSize, toSize }) => ({
    ...state,
    individuals: replaceAtIndex(state.individuals, index, individual => ({
      ...individual,
      fromSize,
      toSize,
      modIndex: spot,
      progress: 0,
      expandingGene: true
    }))
  }),
  [DELETE_MUTATION_OPERATION_OBJECT]: (state, { index, spot }) => ({
    ...state,
    individuals: replaceAtIndex(state.individuals, index, individual => ({
      ...individual,
      shrinkingGene: false,
	    DNA: removeGeneAtIndex(individual.DNA, spot)
    }))
  }),
  [CHECK_THRESHOLD_OBJECT]: state =>
    state.usingThreshold && state.individuals[0].fitness > FITNESS_THRESHOLD ?
      {
        ...state,
        initialBallValue: state.initialBallValue - 1,
        mStack: [...state.mStack,
          checkThresholdObject(),
          sortOnFitnessObject(),
          evaluateFitnessObject(true)]
      }
      : state,
  [SORT_ON_FITNESS_OBJECT]: state => ({
    ...state,
    message: 'SORT POPULATION',
    individuals: sortOnFitness(state.individuals).map((individual, i) => ({
	    ...individual,
	    destination: positionForIndividual(i, POPULATION_SIZE),
	    progress: 0
    }))
  }),
  [SET_STATE_OBJECT]: (state, { mutation }) => mutation(state),
/*
  [PAUSE_OBJECT]: state => ({
    ...state,
    activeList: [...state.activeList, pauseEffect(25)]
  }),
*/
  [EVAL_INDIVUDUAL_OBJECT]: (state, { index }) => ({
    ...state,
    mStack: [...state.mStack,
      moveIndividualBackHomeObject(index, true),
      setStateObject(state => ({...state, collectedPoints: 0})),
      checkForIcObject(index),
      assignFitnessObject(index),
      drawIndividualObject(index),
      moveIndividualObject(index, individualInGamePoint())
    ]
  }),
  [MOVE_INDIVIDUAL_OBJECT]: (state, { index, destination }) => ({
    ...state,
    individuals: replaceAtIndex(state.individuals, index, individual => ({
	    ...individual,
	    destination,
	    progress: 0
    }))
  }),
  [MOVE_INDIVIDUAL_BACK_HOME_OBJECT]: (state, { index, showFitness }) => ({
    ...state,
    individuals: replaceAtIndex(state.individuals, index, individual => ({
	    ...individual,
	    destination: positionForIndividual(index, POPULATION_SIZE),
	    progress: 0,
      showFitness
    }))
  }),
  [DRAW_INDIVIDUAL_OBJECT]: (state, { index }) => ({
    ...state,
	  individuals: replaceAtIndex(state.individuals, index, individual => ({
		  ...individual,
		  visible: true
	  })),
    boxes: loadDNA(state.individuals[index].DNA),
    collectedPoints: 0,
    balls: [placeStartBall(state.speed, state.initialBallValue)],
    activeList: [...state.activeList, dropBallEffect(0)]
  }),
  [ASSIGN_FITNESS_OBJECT]: (state, { index }) => ({
    ...state,
    individuals: replaceAtIndex(state.individuals, index, individual => ({
      ...individual,
	    visible: true,
      showFitness: true,
      fitness: state.collectedPoints - individual.DNA.xs.length
    }))
  })
});

const isFunction = x => typeof x === 'function';

/* Alternative 'replaceAtIndex'
const ensureFunction = x => isFunction(x) ? x : () => x;
*/

const replaceAtIndex = (xs, index, fn) => xs.slice(0, index).concat(isFunction(fn) ? fn(xs[index]) : fn, xs.slice(index+1));

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

const shrink = (individual, spot, fromSize, toSize) => ({
  ...individual,
  fromSize,
  toSize,
  modIndex: spot,
	progress: 0,
  expandingGene: false,
  shrinkingGene: true
});

const sortOnFitness = individuals => [...individuals].sort((a,b) => b.fitness - a.fitness);

const placeStartBall = (speed, initialBallValue) => ({
  row: 0,
  column: BALL_DROP_COLUMN,
  location: pointInPlayground(-1, BALL_DROP_COLUMN),
  destination: pointInPlayground(0, BALL_DROP_COLUMN),
  value: initialBallValue,
  direction: DIRECTION.DOWN,
  progress: speed === FAST ? 0.99 : 0,
  dead: false
});

const individualInGamePoint = () => ({
  x: pointInPlayground(0, 0).x,
  y: Math.floor(SVG_HEIGHT * 0.75)
});

const xoverParent1Point = () => ({
  x: pointInPlayground(0, 0).x,
  y: 0.05 * SVG_HEIGHT
});

const xoverParent2Point = individualInGamePoint;

const xoverChildPoint = () => ({
  x: xoverParent1Point().x,
  y: (xoverParent1Point().y + xoverParent2Point().y) / 2
});

const positionForIndividual = (index, populationSize) => {
  const ySpacing = SVG_HEIGHT * 2 / populationSize;
  if (index < populationSize / 2) {
    return {
      x: 0,
      y: ySpacing * index
    };
  }
  return {
    x: SVG_WIDTH * 0.72,
    y: ySpacing * (index - POPULATION_SIZE / 2)
  };
};

export const pointInPlayground = (row, column) => ({
  x: SVG_WIDTH / 4 + X_SPACING * (column + 1) - 2,
  y: Y_SPACING * (row + 1)
});

const getInitialProgressIncrement = speed => ({
	[FAST]: 0.5,
	[MEDIUM]: 0.25,
	[SLOW]: 0.05
})[speed];

// [min, max)
const randomInt = (min, max) => min + Math.floor(Math.random() * (max - min));

//noinspection JSPotentiallyInvalidConstructorUsage
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

const generateIndividual = (location, destination) => () => ({
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
  toSize: 12,
///  stopShrinkingWhenDone: true
});

const play = individual => {
  return 0;
};

const individualLength = individual => individual.length;

const individualWithoutGene = (individual, i) => individual.slice(0, i).concat(individual.slice(i+1));

const checkFitness = individual => Math.max(0, play(individual) - individualLength(individual));

const individualByFitness = comparator((a, b) => checkFitness(a) < checkFitness(b));

export const generateInitialPopulation = () => range(POPULATION_SIZE).map(i => {
  const location = positionForIndividual(i, POPULATION_SIZE);
  const destination = positionForIndividual(i, POPULATION_SIZE);
  return head(range(6).map(generateIndividual(location, destination)).sort(individualByFitness));
}).sort(individualByFitness);

const individualIsIC = individual => {
  const length = individualLength(individual);
  return length >= 5 &&
    checkFitness(individual) > 0 &&
    range(length).every(i => checkFitness(individualWithoutGene(individual, i)) <= 0);
};

// assumes population already sorted
const parentPickRange = population => {
  var last = population.findIndex(individual => checkFitness(individual) <= 0);
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
