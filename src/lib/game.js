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
  /*
  individuals: state.individuals.map(individual =>
    individual.progress >= 1
      ? individual
      : {
      ...individual,
      progress: individual.progress + getInitialProgressIncrement(state.speed) / (individual.helper ? 10 : 3)
    }
  ),
  */
  balls: state.balls.map(augmenter({
    progress: progress => progress + getInitialProgressIncrement(state.speed)
  }))
});

const STANDARD_DELAY = 0; // (ticks)

const tickPhase1 = state => {
  const currentIndividual = state.individuals.findIndex(individual => !individual.showFitness);
  if (currentIndividual !== -1) {
    if (!state.gridOn) {
      return {
        ...state,
        gridOn: true,
        delay: STANDARD_DELAY
      };
    }
    if (!state.labelsOn) {
      return {
        ...state,
        labelsOn: true,
        delay: STANDARD_DELAY
      };
    }
    if (state.individuals[currentIndividual].location !== individualInGamePoint()) {
      return {
        ...state,
        message: 'EVALUATE FITNESS',
        individuals: replaceAtIndex(state.individuals, currentIndividual, individual => ({
          ...individual,
          location: individual.destination,
          destination: individualInGamePoint(),
          visible: true,
          progress: 0
        })),
        boxes: loadDNA(state.individuals[currentIndividual].DNA)
      };
    }
    if (!state.balls.length) {
      return {
        ...state,
        /*
        individuals: replaceAtIndex(state.individuals, currentIndividual, augmentWith({
          visible: true
        })),
        */
        balls: [createStartBall(state.initialBallValue)]
      };
    }
    if (state.balls.some(({row}) => row < ROWS)) {
      return {
        ...state,
        balls: advanceBalls(state.balls, state.boxes)
      };
    }
    return {
      ...state,
      individuals: replaceAtIndex(state.individuals, currentIndividual, individual => ({
        ...individual,
        showFitness: true,
        fitness: calculatePoints(state.balls, individual.DNA),
        location: individual.destination,
        destination: positionForIndividual(currentIndividual),
        progress: 0
      })),
      balls: []
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
      message: 'DECREASING BALL VALUE',
      initialBallValue: state.initialBallValue - 1,
      individuals: state.individuals.map(augmentWith({
        showFitness: false
      }))
    };
  }
  return {
    ...state,
    gridOn: false,
    labelsOn: false,
    phase: 2
  };
};

export const nextState = state => {
  if (state.delay) {
    return {
      ...state,
      delay: state.delay - 1
    };
  }

  if (//state.individuals.some(x => x.progress < 1) ||
      state.balls.some(x => x.progress < 1)) {
    state = advanceProgress(state);
  }

  if (state.phase === 1) {
    return tickPhase1(state);
  }

  return animationReducer({
    ...state,
    animationStack: state.animationStack.slice(0, -1)
  }, state.animationStack[state.animationStack.length-1]);
};

export const calculatePoints = (balls, dna=[]) => balls.filter(({row}) => row >= ROWS).map(ball =>
  ball.column === BALL_COLLECTION_COLUMN
    ? ball.value
    : -PENALTY_POINTS
).reduce(add, -dna.length);

const add = (x, y) => x + y;

const identity = x => x;

// TODO: Rewrite more generically with compose and other HoF
const conditional = (predicate, truthy, falsey=identity) =>
  input =>
    predicate(input)
      ? (typeof truthy === 'function' ? truthy(input) : truthy)
      : (typeof falsey === 'function' ? falsey(input) : falsey);

// TODO: Give this some love/attention!
const advanceBalls = (balls, boxes) =>
  balls.map(conditional(ball => ball.progress >= 1, applyDirection)).reduce((balls, ball) =>
    balls.concat(conditional(ball => ball.progress === 0, advanceBall(ball, boxes))(ball))
    , []);

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
  }[ball.direction],
  progress: 0
});

export const advanceBall = (ball, boxes) => getTileEffect(getBoxType(boxes, ball.row, ball.column))(ball);

const getTileEffect = boxType => updaters[boxType] || sendDown;

export const BOX_SYMBOL_BY_INDEX = 'ALRS';

const getBoxType = (boxes, row, column) => {
  if (row >= 0 && row < ROWS) {
    const box = boxes[row][column];
    return box && BOX_SYMBOL_BY_INDEX[box.type];
  }
};

const sendDown = augmentWith({
  direction: DIRECTION.DOWN
});

const sendLeft = augmenter({
  direction: direction => direction !== DIRECTION.RIGHT
    ? DIRECTION.LEFT
    : DIRECTION.DOWN
});

const sendRight = augmenter({
  direction: direction => direction !== DIRECTION.LEFT
    ? DIRECTION.RIGHT
    : DIRECTION.DOWN
});

const updaters = {
  A: augmenter({
    value: value => value + 1
  }),
  L: sendLeft,
  R: sendRight,
  S: ball => [
    sendLeft(ball),
    sendRight(ball)
  ]
};

const GENERATION_OBJECT = 'GENERATION_OBJECT';
const PAUSE_OBJECT = 'PAUSE_OBJECT';
const SET_STATE_OBJECT = 'SET_STATE_OBJECT';
const PURGE_OBJECT = 'PURGE_OBJECT';
const CROSSOVER_OBJECT = 'CROSSOVER_OBJECT';
const MUTATE_OBJECT = 'MUTATE_OBJECT';
const REMOVE_SPACES_OBJECT = 'REMOVE_SPACES_OBJECT';
const DELETE_MUTATION_OPERATION_OBJECT = 'DELETE_MUTATION_OPERATION_OBJECT';
const SHRINK_GENE_OBJECT = 'SHRINK_GENE_OBJECT';
const PROCREATE = 'PROCREATE';
const DELETE_MUTATION_OBJECT = 'DELETE_MUTATION_OBJECT';
const INSERT_MUTATION_OBJECT = 'INSERT_MUTATION_OBJECT';
const POINT_MUTATION_OBJECT = 'POINT_MUTATION_OBJECT';
const EXPAND_GENE_OBJECT = 'EXPAND_GENE_OBJECT';
const MOVE_INDIVIDUAL_OBJECT = 'MOVE_INDIVIDUAL_OBJECT';

export const generationObject = createActionCreator(GENERATION_OBJECT);
const pauseObject = createActionCreator(PAUSE_OBJECT);
const setStateObject = createActionCreator(SET_STATE_OBJECT, 'mutation');
const purgeObject = createActionCreator(PURGE_OBJECT);
const crossoverObject = createActionCreator(CROSSOVER_OBJECT, 'index', 'ppr');
const mutateObject = createActionCreator(MUTATE_OBJECT, 'index', 'ppr');
const removeSpacesObject = createActionCreator(REMOVE_SPACES_OBJECT, 'index');
const deleteMutationOperationObject = createActionCreator(DELETE_MUTATION_OPERATION_OBJECT, 'index', 'spot');

const shrinkGeneObject = createActionCreator(SHRINK_GENE_OBJECT, 'index', 'spot', 'fromSize', 'toSize');
const expandGeneObject = createActionCreator(EXPAND_GENE_OBJECT, 'index', 'spot', 'fromSize', 'toSize');
const procreateObject = createActionCreator(PROCREATE, 'index', 'parent1', 'parent2');
const deleteMutationObject = createActionCreator(DELETE_MUTATION_OBJECT, 'index');
const insertMutationObject = createActionCreator(INSERT_MUTATION_OBJECT, 'index');
const pointMutationObject = createActionCreator(POINT_MUTATION_OBJECT, 'index');

const moveIndividualObject = createActionCreator(MOVE_INDIVIDUAL_OBJECT, 'index', 'destination', 'showFitness');

const animationReducer = createReducer(null, {
  [GENERATION_OBJECT]: state => ({
    ...state,
    generation: state.generation + 1,
    phase: 1,
    animationStack: state.animationStack.concat(
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
      animationStack: append(parentIndices.reverse().reduce((a, index) =>
        a.concat(
          ppr > 1 && Math.random() < CROSSOVER_RATE ?
          crossoverObject(index, ppr)
          :
          mutateObject(index, ppr)
        ), []))
    })(state)
  },
  [DELETE_MUTATION_OBJECT]: (state, { index }) => {
    const spot = randomInt(0, state.individuals[index].DNA.length);
    return augmenter({
      individuals: replaceIndex(index, augmenter({
        DNA: removeIndex(spot)
      }))
    })(state);
  },
  [INSERT_MUTATION_OBJECT]: (state, { index }) => {
    const spot = randomInt(0, state.individuals[index].DNA.length+1);
    return augmenter({
      individuals: replaceIndex(index, augmenter({
        DNA: insertIndex(spot, createGene())
      }))
    })(state);
  },
  [POINT_MUTATION_OBJECT]: (state, { index }) => {
    const spot = randomInt(0, state.individuals[index].DNA.length);

    const mutationsByChromosomeKey = {
      x: x => (x + Math.pow(-1, Math.random() < 0.5) + COLUMNS) % COLUMNS,
      y: y => (y + Math.pow(-1, Math.random() < 0.5) + ROWS) % ROWS,
      type: type => (type + randomInt(1, 4)) % 4
    };

    const mutateGene = gene =>
      (chromosomeKey => ({
        ...gene,
        [chromosomeKey]: mutationsByChromosomeKey[chromosomeKey](gene[chromosomeKey])
      }))(randomKey(mutationsByChromosomeKey));

    const randomKey = obj => Object.keys(obj)[randomInt(0, Object.keys(obj).length)];

    return augmenter({
      individuals: replaceIndex(index, augmenter({
        DNA: replaceIndex(spot, mutateGene)
      }))
    })(state);
  },
  [MUTATE_OBJECT]: (state, { index, ppr }) => {
    const parent = randomInt(0, ppr);
    const animationStack = [
      moveIndividualObject(index, positionForIndividual(index), false),
      moveIndividualObject(parent, positionForIndividual(parent), true)
    ];

    const doMutation = (message, nextObject) => setStateObject(augmenter({
      message,
      individuals: individuals => replaceAtIndex(individuals, index, individual => ({
        ...individuals[parent],
      //  id: base_id++, // TODO: This is really bad for several reasons, including tight coupling and because it is not redux-friendly!
        id: Math.floor(Math.random()*1000),
        visible: true,
        fitness: 0,
        location: individuals[parent].destination,
        destination: xoverChildPoint(),
        showFitness: false
      //  parent: individuals[parent]
      })),
      animationStack: append(nextObject(index))
    }));

    const parentDNALength = state.individuals[parent].DNA.length;
    if (false && Math.random() < 1/3 && parentDNALength > 1) {
      animationStack.push(doMutation('DELETE MUTATION', deleteMutationObject));
    } else if (false && Math.random() < 0.5 && parentDNALength < 30) {
      animationStack.push(doMutation('INSERTION MUTATION', insertMutationObject));
    } else {
      animationStack.push(doMutation('POINT MUTATION', pointMutationObject));
    }
    animationStack.push(moveIndividualObject(parent, xoverParent1Point(), false));
    return {
      ...state,
      animationStack: state.animationStack.concat(animationStack)
    };
  },
  [PROCREATE]: (state, { index, parent1, parent2 }) => {
    const [$parent1, $parent2] = [parent1, parent2].map(i => state.individuals[i]);
    const [p1len, p2len] = [$parent1, $parent2].map(p => p.DNA.length);
    const maxLength = Math.max(p1len, p2len);
    const flags = range(maxLength).map(() => Math.random() < 0.5);

    return augmenter({
      individuals: individuals => replaceAtIndex(individuals, index, augmenter({
        location: xoverChildPoint(),
        destination: xoverChildPoint(),
        fitness: 0,
        showFitness: false,
        visible: true,
        DNA: range(maxLength).map(i => {
          if (i < [p1len, p2len][+flags[i]]) {
            return [$parent1, $parent2][+flags[i]].DNA[i];
          }
          return EMPTY_GENE;
        }),
        parent1: $parent1,
        parent2: $parent2
      }))
      /*
      animationStack: append(setStateObject(augmenter({
        individuals: replaceIndex(index, augmentWith({
          visible: true
        }))
      })))
      */
    })(state);
  },
  [CROSSOVER_OBJECT]: (state, { index, ppr }) => {
    const parent1 = randomInt(0, ppr);
    const parent2 = (parent1 + randomInt(1, ppr)) % ppr;
    return {
      ...state,
      message: 'CROSSOVER',
      animationStack: state.animationStack.concat(
        moveIndividualObject(index, positionForIndividual(index), false),
        moveIndividualObject(parent2, positionForIndividual(parent2), true),
        moveIndividualObject(parent1, positionForIndividual(parent1), true),
        setStateObject(augmenter({
          individuals: replaceIndex(index, individual => ({
            ...individual,
            parent1: null,
            parent2: null
          }))
        })),
        procreateObject(index, parent1, parent2),
        moveIndividualObject(parent2, xoverParent2Point(), false),
        moveIndividualObject(parent1, xoverParent1Point(), false)
      )
    };
  },
  [SET_STATE_OBJECT]: (state, { mutation }) => mutation(state),
  [MOVE_INDIVIDUAL_OBJECT]: (state, { index, destination, showFitness }) => ({
    ...state,
    individuals: replaceAtIndex(state.individuals, index, individual => ({
      ...individual,
      location: individual.destination,
      destination,
      progress: 0,
      showFitness
    }))
  })
});

const isFunction = x => typeof x === 'function';

const insertAtIndex = (xs, index, fn) => xs.slice(0, index).concat(isFunction(fn) ? fn(xs[index]) : fn, xs.slice(index));
const insertIndex = (index, fn) => xs => xs.slice(0, index).concat(isFunction(fn) ? fn(xs[index]) : fn, xs.slice(index));

export const replaceAtIndex = (xs, index, fn) => xs.slice(0, index).concat(isFunction(fn) ? fn(xs[index]) : fn, xs.slice(index+1));
       const replaceIndex = (index, fn) => xs => xs.slice(0, index).concat(isFunction(fn) ? fn(xs[index]) : fn, xs.slice(index+1));

const removeAtIndex = (xs, index) => xs.slice(0, index).concat(xs.slice(index+1));
  const removeIndex = index => xs => xs.slice(0, index).concat(xs.slice(index+1));

const createGene = () => ({
  x: randomInt(0, COLUMNS),
  y: randomInt(0, ROWS),
  type: randomInt(0, 4)
});

export const EMPTY_GENE = {
  x: ' ',
  y: ' ',
  type: ' '
};

const sortOnFitness = individuals => [...individuals].sort((a,b) => b.fitness - a.fitness);

export const createStartBall = initialBallValue => ({
  row: -1,
  column: BALL_DROP_COLUMN,
  value: initialBallValue,
  direction: DIRECTION.DOWN,
  progress: 0
});

import { memoize } from 'ramda';

export const individualInGamePoint = memoize(() => ({
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

export const positionForIndividual = memoize(index => {
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

const play = (dna, initialBallValue) => {
  const boxes = loadDNA(dna);
  var balls = [createStartBall(initialBallValue)];
  while (balls.some(({row}) => row < ROWS)) {
    balls = balls.map(augmentWith({progress: 1}));
    balls = advanceBalls(balls, boxes);
  }
  return calculatePoints(balls, dna);
};

const checkFitness = (dna, initialBallValue) => Math.max(0, play(dna, initialBallValue));
/*
const generateChromosomes = () => range(randomInt(10, INITIAL_GENOME_LENGTH)).map(() => ({
  x: BALL_DROP_COLUMN + randomInt(-1, 3),
  y: randomInt(Math.floor(ROWS / 2), ROWS),
  type: randomInt(0, 4)
}));
*/

const generateChromosomes = () => range(randomInt(10, INITIAL_GENOME_LENGTH)).map(createGene);

var base_id = 1;
const generateIndividual = location => ({
  id: base_id++,
  DNA: generateChromosomes(),
  //location,
  destination: location,
  visible: false,
  fitness: 0,
  progress: 1,
  showFitness: false,
  expandingGene: false,
  shrinkingGene: false,
  fromSize: 12,
  toSize: 12
});

export const generateInitialPopulation = initialBallValue => range(POPULATION_SIZE).map(i => {
  const location = individualInGamePoint();
  var individual;
  var i = 0;
  do {
    individual = generateIndividual(location);
    if (++i > 100) {
      console.log(`i === ${i}`);
      break;
    }
  } while (!checkFitness(individual.DNA, initialBallValue));
  return individual;
});

const individualIsIC = dna =>
  checkFitness(dna) > 0 &&
    range(dna.length).every(i => checkFitness(removeAtIndex(dna, i)) <= 0);

// assumes population already sorted
const parentPickRange = population => {
  var last = population.findIndex(individual => individual.fitness <= 0);
  if (last === -1) { // if none, keep first half of population anyway
    return Math.floor(population.length / 2);
  }
  // if more than half the population is viable, limit to top half
  return Math.min(last, Math.floor(population.length / 2));
};

export const loadDNA = dna => {
  const boxes = range(ROWS).map(() => range(COLUMNS).map(() => null));
  dna.forEach(({x, y, type}) => {
    const row = +y;
    const column = +x;
    boxes[row][column] = {
      row,
      column,
      type
    };
  });
  return boxes;
};

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
