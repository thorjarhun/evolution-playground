import { TICK } from '../actions/controls';
import { SPEED, INITIAL_BALL_VALUE } from '../constants/game';
import { nextState, generationObject, generateInitialPopulation } from '../lib/game';

const defaultState = () => ({
  message: '',
  labelsOn: false,
  gridOn: false,
  checkingIC: true,
  usingThreshold: true,
  speed: SPEED.MEDIUM,
  initialBallValue: INITIAL_BALL_VALUE,
  generation: 0,
  balls: [],
  individuals: generateInitialPopulation(INITIAL_BALL_VALUE),
  animationStack: [generationObject()]
});

export default (state = defaultState(), action) => {
  switch (action.type) {
    case TICK:
      return nextState(state);
    default:
      return state;
  }
};
