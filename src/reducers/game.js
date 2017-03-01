import { TICK } from '../actions/controls';
import { nextState, generationObject, generateInitialPopulation, SPEED } from '../lib/game';

const defaultState = () => ({
  message: '',
  boxesOn: false,
  labelsOn: false,
  gridOn: false,
  checkingIC: true,
  usingThreshold: true,
  speed: SPEED.MEDIUM,
  initialBallValue: 15,
  generation: 0,
  paused: false, //true
//  boxes: [],
  balls: [],
  individuals: generateInitialPopulation(),
  mStack: [generationObject()],
  activeList: []
});

export default (state = defaultState(), action) => {
  switch (action.type) {
    case TICK:
      return nextState(state);
    default:
      return state;
  }
};
