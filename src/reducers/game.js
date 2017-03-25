import { TICK } from '../actions/controls';
import { SPEED, INITIAL_BALL_VALUE } from '../constants/game';
import { nextState, generationObject, generateInitialPopulation, loadDNA, createStartBall, applyDirection, advanceBall, replaceAtIndex } from '../lib/game';

import { MOVE_INDIVIDUAL, SHOW_GRID, SHOW_LABELS, START_RUN, DROP_BALL, ADVANCE_BALL, MOVE_BALL } from '../epics/game';

import undoable from 'redux-undo';


const defaultState = () => ({
  message: '',
  labelsOn: false,
  gridOn: false,
  checkingIC: true,
  usingThreshold: true,
  speed: SPEED.FAST,
  initialBallValue: INITIAL_BALL_VALUE,
  generation: 0,
  balls: [],
  individuals: generateInitialPopulation(INITIAL_BALL_VALUE),
  animationStack: [generationObject()]
});

export default undoable((state = defaultState(), action) => {
  switch (action.type) {
	  case MOVE_INDIVIDUAL:
		  const {index, location} = action.payload;
		  return {
			  ...state,
			  individuals: state.individuals.map((individual, i) => {
				  if (index === i) {
					  return {
						  ...individual,
						  location,
						  destination: location
					  };
				  }
				  return individual;
			  })
		  };
	  case MOVE_BALL:
		  return {
			  ...state,
			  balls: state.balls.map((ball, i) => {
				  if (action.payload.index === i) {
					  return {
						  ...ball,
						  location: action.payload.location
					  };
				  }
				  return ball;
			  })
		  };
	  case SHOW_GRID:
		  return {
			  ...state,
			  gridOn: true
		  };
	  case SHOW_LABELS:
		  return {
			  ...state,
			  labelsOn: true
		  };
	  case START_RUN:
		  const { DNA } = state.individuals[action.payload.index];
		  return {
			  ...state,
			  message: 'EVALUATE FITNESS',
			  boxes: loadDNA(DNA)
		  };
	  case DROP_BALL:
		  return {
			  ...state,
			  individuals: state.individuals.map((individual, i) => {
				  if (action.payload.index === i) {
					  return {
						  ...individual,
						  visible: true
					  };
				  }
				  return individual;
			  }),
			  balls: [createStartBall(state.initialBallValue)]
		  };
	  case ADVANCE_BALL:
		  return {
			  ...state,
			  balls: replaceAtIndex(state.balls, action.payload.index, ball => {
				  return advanceBall(applyDirection(ball), state.boxes);
			  })
		  };
    case TICK:
	    return nextState(state);
    default:
      return state;
  }
});
