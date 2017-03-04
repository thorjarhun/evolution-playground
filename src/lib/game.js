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


const dropBallEffectFn = (state, index) => {
	const ball = {...state.balls[index]};
	if (ball.row >= ROWS + 2) {
		return state;
	}
	ball.progress += getInitialProgressIncrement(state.speed);
	if (ball.progress >= 1) {
		var points = 0;
		const balls = ballStepComplete(state, index, true).map($ball => {
			if ($ball.row > ROWS) {
				points += $ball.column === BALL_COLLECTION_COLUMN ? $ball.value : -PENALTY_POINTS;
				return {
					...$ball,
					dead: true
				};
			}
			return $ball;
		});
		return {
			...state,
			balls: replaceAtIndex(state.balls, index, balls[0]).concat(balls[1] || []),
			collectedPoints: state.collectedPoints + points
		};
	}
	return {
		...state,
		balls: replaceAtIndex(state.balls, index, ball)
	};
};

const ballStepComplete = (state, index, animate) => {
	const ball = {...state.balls[index]};
	const {row, column} = ball;
	const balls = moveBall({
		boxType: getBoxType(state.boxes, row, column),
		ball
	});

	if (animate) {
		return balls.map(ball => startNextAnimation({
			ball,
			row,
			column
		}));
	}
	return balls;
};

const startNextAnimation = ({ball, row, column}) => ({
	...ball,
	location: pointInPlayground(row, column),
	destination: pointInPlayground(ball.row, ball.column),
	progress: 0
});

const getBoxType = (boxes, row, column) => {
	if (row >= 0 && row < ROWS) {
		const box = boxes[row][column];
		return box && 'ALRS'[box.type];
	}
};

/* This will return an object like:
 [...balls]
 */

const moveBall = ({boxType, ball}) => {
	const updaters = {
		A: ball => ball,
		L: ball => ball,
		R: ball => ball,
		S: ball => ball
	};

	const makeNewBall = ball => ({
		...ball,
		dead: false
	});
	var newBall;
	switch (boxType) {
		case 'A':
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
		case 'L':
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
		case 'R':
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
		case 'S':
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
		default:
			ball.direction = DIRECTION.DOWN;
			ball.row++;
	}

	return [ball].concat(newBall || []);
};

export const nextState = state => {
//	debugger
  if (state.activeList.length) {
	  return state.activeList.reduce(effectReducer, {
      ...state,
      activeList: []
    });
  }
	if (state.balls.some(({dead}) => !dead)) {
		return state.balls.reduce((state, {dead}, i) =>
			!dead
				? dropBallEffectFn(state, i)
				: state,
		state);
	}
	if (state.individuals.some(x => x.progress < 1)) {
//		debugger
		return state.individuals.reduce((state, individual, i) =>
				individual.progress < 1
					? moveIndividualEffectFn(state, i)
					: state,
			state);
	}
//debugger
  while (!state.activeList.length && state.mStack.length && !state.paused && !state.balls.some(ball => !ball.dead) && !state.individuals.some(x => x.progress < 1)) {
	  //debugger
    state = animationReducer({
      ...state,
      mStack: state.mStack.slice(0, -1)
    }, state.mStack[state.mStack.length-1]);
  }
  return state;
};

const PAUSE_EFFECT = 'PAUSE_EFFECT';

const pauseEffect = makeActionCreator(PAUSE_EFFECT, 'time');

const moveIndividualEffectFn = (state, index) => {
	const individual = {...state.individuals[index]};
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
  }
});

const DOWN = 'DOWN';
const LEFT = 'LEFT';
const RIGHT = 'RIGHT';
export const DIRECTION = {
  DOWN, LEFT, RIGHT
};

const GENERATION_OBJECT = 'GENERATION_OBJECT';
const EVALUATE_FITNESS_OBJECT = 'EVALUATE_FITNESS_OBJECT';
const SORT_ON_FITNESS_OBJECT = 'SORT_ON_FITNESS_OBJECT';
const EVAL_INDIVUDUAL_OBJECT = 'EVAL_INDIVIDUAL_OBJECT';
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

export const generationObject = makeActionCreator(GENERATION_OBJECT);
const evaluateFitnessObject = makeActionCreator(EVALUATE_FITNESS_OBJECT);
const sortOnFitnessObject = makeActionCreator(SORT_ON_FITNESS_OBJECT);
const evalIndividualObject = makeActionCreator(EVAL_INDIVUDUAL_OBJECT);
const pauseObject = makeActionCreator(PAUSE_OBJECT);
const setStateObject = makeActionCreator(SET_STATE_OBJECT, 'mutation');
const moveIndividualBackHomeObject = makeActionCreator(MOVE_INDIVIDUAL_BACK_HOME_OBJECT, 'index', 'showFitness');
const checkForIcObject = makeActionCreator(CHECK_FOR_IC_OBJECT, 'index');
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

const append = (...args) => xs => xs.concat(...args);

const PHASE_ONE = 'PHASE_ONE';
const PHASE_TWO = 'PHASE_TWO';
const RUN_INDIVIDUAL = 'RUN_INDIVIDUAL';
const RUN_ENDED = 'RUN_ENDED';
const BALL_DIED = 'BALL_DIED';

const ballDied = makeActionCreator(BALL_DIED, 'index');

const animationReducer = createReducer(null, {
	[PHASE_ONE]: state => state,
	[PHASE_TWO]: state => state,
	[RUN_INDIVIDUAL]: (state, { index }) => state,
	[RUN_ENDED]: state => state,
	[BALL_DIED]: state => (state, { index }) => state,
  [GENERATION_OBJECT]: augmenter({
    generation: generation => generation + 1,
    mStack: append(
      generationObject(),
      purgeObject(),
      checkThresholdObject(),
      sortOnFitnessObject(),
      evaluateFitnessObject())
  }),
	[EVALUATE_FITNESS_OBJECT]: state => ({
		...state,
		message: 'EVALUATE FITNESS',
		mStack: state.mStack.concat(
			setStateObject(augmentWith({
				boxesOn: false,
				gridOn: false,
				labelsOn: false,
				collectedPoints: 0
			})),
			range(POPULATION_SIZE).slice(state.generation === 1 ? 0 : parentPickRange(state.individuals))
				.reverse()
				.reduce((a, i) => a.concat(
					evalIndividualObject(),
					setStateObject(state => ({
						...state,
						currentIndividual: i
					})),
				), []),
			setStateObject(augmenter({
				collectedPoints: 0,
				mStack: append(
					setStateObject(augmentWith({boxesOn: true})),
					pauseObject(),
					setStateObject(augmentWith({labelsOn: true})),
					pauseObject(),
					setStateObject(augmentWith({gridOn: true}))
				)
			}))
		)
	}),
	[EVAL_INDIVUDUAL_OBJECT]: state => ({
		...state,
		mStack: [...state.mStack,
			moveIndividualBackHomeObject(state.currentIndividual, true),
			setStateObject(augmentWith({collectedPoints: 0})),
			checkForIcObject(state.currentIndividual),
			setStateObject(state => ({
				...state,
				individuals: replaceAtIndex(state.individuals, state.currentIndividual, individual => ({
					...individual,
					visible: true,
					showFitness: true,
					fitness: state.collectedPoints - individual.DNA.xs.length
				}))
			})),
			setStateObject(state => ({
				...state,
				individuals: replaceAtIndex(state.individuals, state.currentIndividual, augmentWith({
					visible: true
				})),
				boxes: loadDNA(state.individuals[state.currentIndividual].DNA),
				collectedPoints: 0,
				balls: [createStartBall(state.speed, state.initialBallValue)]
			})),
			setStateObject(state => ({
				...state,
				individuals: replaceAtIndex(state.individuals, state.currentIndividual, augmentWith({
					destination: individualInGamePoint(),
					progress: 0
				}))
			}))
		]
	}),
  [PURGE_OBJECT]: state => {
    const ppr = parentPickRange(state.individuals);
    const parentIndices = range(POPULATION_SIZE).slice(ppr);
    return augmenter({
      individuals: individuals => individuals.slice(0, ppr).concat(individuals.slice(ppr).map(augmentWith({
        showFitness: false,
        visible: false
      }))),
      mStack: append(parentIndices.reduce((a, index) =>
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

    return augmenter({
      mStack: append(
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
      individuals: individuals => replaceAtIndex(individuals, index, () => ({
        ...individuals[parent],
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
      mStack: mStack => mStack.concat(setStateObject(augmenter({
        individuals: individuals => replaceAtIndex(individuals.slice(0, -2), index, individual => ({
          ...individual,
          visible: true
        }))
      })))
    })(state);
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
    individuals: replaceAtIndex(state.individuals, index, augmentWith({
	    destination: xoverParent1Point(),
	    progress: 0,
      showFitness: false
    }))
  }),
  [BRING_IN_PARENT_TWO_OBJECT]: (state, { index }) => ({
    ...state,
    individuals: replaceAtIndex(state.individuals, index, augmentWith({
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
    individuals: replaceAtIndex(state.individuals, index, augmentWith({
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
  [SORT_ON_FITNESS_OBJECT]: augmenter({
    message: 'SORT POPULATION',
    individuals: individuals => sortOnFitness(individuals).map((individual, i) => ({
	    ...individual,
	    destination: positionForIndividual(i),
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
  [MOVE_INDIVIDUAL_BACK_HOME_OBJECT]: (state, { index, showFitness }) => ({
    ...state,
    individuals: replaceAtIndex(state.individuals, index, augmentWith({
	    destination: positionForIndividual(index),
	    progress: 0,
      showFitness
    }))
  })
});

const isFunction = x => typeof x === 'function';

/* Alternative 'replaceAtIndex'
const ensureFunction = x => isFunction(x) ? x : () => x;
*/

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

const createStartBall = (speed, initialBallValue) => ({
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

const positionForIndividual = index => {
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
};

export const pointInPlayground = (row, column) => ({
  x: SVG_WIDTH / 4 + X_SPACING * (column + 1) - 2,
  y: Y_SPACING * (row + 1)
});

export const getInitialProgressIncrement = speed => ({
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
  toSize: 12
});

const play = individual => {
  return 0;
};

const individualLength = individual => individual.length;

const individualWithoutGene = (individual, i) => individual.slice(0, i).concat(individual.slice(i+1));

const checkFitness = individual => Math.max(0, play(individual) - individualLength(individual));

const individualByFitness = comparator((a, b) => checkFitness(a) < checkFitness(b));

export const generateInitialPopulation = () => range(POPULATION_SIZE).map(i => {
  const location = positionForIndividual(i);
  const destination = positionForIndividual(i);
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
