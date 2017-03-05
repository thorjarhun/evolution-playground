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
			progress: individual.progress + getInitialProgressIncrement(state.speed) / (individual.helper ? 10 : (individual.expandingGene || individual.shrinkingGene) ? 3 : 1)
		}
	),
	balls: state.balls.map(ball => ({
		...ball,
		progress: ball.progress + getInitialProgressIncrement(state.speed)
	}))
});

export const nextState = state => {
	const ANIMATIONS = [
		{
			test: state => state.delay,
			reducer: augmenter({
				delay: delay => delay - 1
			})
		},
		{
			test: state => state.balls.some(({row}) => row < ROWS),
			reducer: advanceBalls
		},
		{
			test: state => state.individuals.some(x => x.progress < 1),
			reducer: state => state
			/*
			reducer: state => state.individuals.reduce((state, individual, i) =>
					individual.progress < 1
						? moveIndividualByIndex(state, i)
						: state,
				state)
			*/
		}
	];

	if (!state.delay) {
		state = advanceProgress(state);
	}

	if (ANIMATIONS.some(({test}) => test(state))) {
		return ANIMATIONS.find(({test}) => test(state)).reducer(state);
	}

	while (state.mStack.length && ANIMATIONS.every(({test}) => !test(state))) {
		state = animationReducer({
			...state,
			mStack: state.mStack.slice(0, -1)
		}, state.mStack[state.mStack.length-1]);
	}
	return state;
};
/*
const moveIndividualByIndex = (state, index) => {
	const individual = {...state.individuals[index]};
	if (individual.expandingGene || individual.shrinkingGene) {
		console.assert(individual.expandingGene - individual.shrinkingGene);
	} else {
		if (individual.progress >= 1) {
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
const advanceIndividuals = (state, index) => ({
	...state,
	individuals: state.individuals.map(individual =>
		individual.progress < 1 || individual.expandingGene || individual.shrinkingGene
			? individual
			: {
				...individual,
				location: individual.destination
			}
	)
})
*/
const advanceBalls = state => ({
	...state,
	balls: state.balls.reduce((balls, ball, i) =>
		ball.progress < 1
			? balls.concat(ball)
			: balls.concat(ballStepComplete(state, i)),
		[])
});

export const calculatePoints = balls => balls.filter(({row}) => row >= ROWS).map(ball =>
	ball.column === BALL_COLLECTION_COLUMN
			? ball.value
			: -PENALTY_POINTS
).reduce(add, 0);

const add = (x, y) => x + y;

const ballStepComplete = (state, index) => {
	const ball = {
		...state.balls[index],
		...calculateDestination(state.balls[index])
	};
	return moveBall({
		boxType: getBoxType(state.boxes, ball.row, ball.column),
		ball
	}).map((ball, offset) => ({
		...ball,
		progress: offset ? .25 : 0
	}));
};

const offsets = {
	[DIRECTION.LEFT]: (row, column) => ({
		row,
		column: column - 1
	}),
	[DIRECTION.RIGHT]: (row, column) => ({
		row,
		column: column + 1
	}),
	[DIRECTION.DOWN]: (row, column) => ({
		row: row + 1,
		column
	})
};

export const calculateDestination = ({row, column, direction}) => offsets[direction](row, column);

const getBoxType = (boxes, row, column) => {
	if (row >= 0 && row < ROWS) {
		const box = boxes[row][column];
		return box && 'ALRS'[box.type];
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

export const generationObject = createActionCreator(GENERATION_OBJECT);
const evaluateFitnessObject = createActionCreator(EVALUATE_FITNESS_OBJECT);
const sortOnFitnessObject = createActionCreator(SORT_ON_FITNESS_OBJECT);
const evalIndividualObject = createActionCreator(EVAL_INDIVUDUAL_OBJECT);
const pauseObject = createActionCreator(PAUSE_OBJECT);
const setStateObject = createActionCreator(SET_STATE_OBJECT, 'mutation');
const moveIndividualBackHomeObject = createActionCreator(MOVE_INDIVIDUAL_BACK_HOME_OBJECT, 'index', 'showFitness');
const checkForIcObject = createActionCreator(CHECK_FOR_IC_OBJECT, 'index');
const checkThresholdObject = createActionCreator(CHECK_THRESHOLD_OBJECT);
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
			checkForIcObject(state.currentIndividual),
			setStateObject(state => ({
				...state,
				individuals: replaceAtIndex(state.individuals, state.currentIndividual, individual => ({
					...individual,
					showFitness: true,
					fitness: calculatePoints(state.balls) - individual.DNA.xs.length
				}))
			})),
			setStateObject(state => ({
				...state,
				individuals: replaceAtIndex(state.individuals, state.currentIndividual, augmentWith({
					visible: true
				})),
				boxes: loadDNA(state.individuals[state.currentIndividual].DNA),
				balls: [createStartBall(state.speed, state.initialBallValue)]
			})),
			setStateObject(state => ({
				...state,
				individuals: replaceAtIndex(state.individuals, state.currentIndividual, individual => ({
					...individual,
					location: individual.destination,
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

	  const mutateGeneAtIndexInDNAByChromosomeKey = (dna, chromosomeKey, index) => ({
		  ...dna,
		  [chromosomeKey]: replaceAtIndex(dna[chromosomeKey], index, mutationsByChromosomeKey[chromosomeKey])
	  });

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
      individuals: individuals => replaceAtIndex(individuals, index, individual => ({
        ...individuals[parent],
        visible: true,
        fitness: 0,
	      location: individual.destination,
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
	    location: individual.destination,
	    destination: positionForIndividual(i),
	    progress: 0
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
  destination: {
	  row: 0,
	  column: BALL_DROP_COLUMN
  },
  value: initialBallValue,
  direction: DIRECTION.DOWN,
  progress: speed === SPEED.FAST ? 1 : 0,
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
	[SPEED.FAST]: 0.5,
	[SPEED.MEDIUM]: 0.25,
	[SPEED.SLOW]: 0.05
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
