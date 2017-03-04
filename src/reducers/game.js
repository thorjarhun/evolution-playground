import { TICK, UPDATE_ANIMATION, MOVE_BALL } from '../actions/controls';
import { ROWS, COLUMNS, BALL_COLLECTION_COLUMN, PENALTY_POINTS } from '../constants/game';
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

import { replaceAtIndex, augmenter, getInitialProgressIncrement, DIRECTION, pointInPlayground } from '../lib/game';

export default (state = defaultState(), action) => {
  switch (action.type) {
    case TICK:
      return nextState(state);
	  /*
	  case MOVE_BALL:
		  const { index } = action;
		  return dropBallEffectFn(state, index);
		  /*
		  return {
			  ...state,
			  balls: replaceAtIndex(balls, index, ball => 
		  };
		  */
    default:
      return state;
  }
};

