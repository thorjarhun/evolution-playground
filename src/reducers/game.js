import { TICK } from '../actions/controls';
import { SPEED } from '../constants/game';
import { nextState, generationObject, generateInitialPopulation } from '../lib/game';

const defaultState = () => ({
  message: '',
  labelsOn: false,
  gridOn: false,
  checkingIC: true,
  usingThreshold: true,
  speed: SPEED.MEDIUM,
  initialBallValue: 15,
  generation: 0,
  balls: [],
  individuals: generateInitialPopulation(),
  mStack: [generationObject()],
	currentIndividual: 0
});

export default (state = defaultState(), action) => {
  switch (action.type) {
    case TICK:
      return nextState(state);
    default:
      return state;
  }
};
