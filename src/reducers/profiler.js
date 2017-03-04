import { START, STOP, TICK } from '../actions/controls.js'

export default (state = {
  startedAt: null,
  ticks: 0
}, action) => {
  switch (action.type) {
    case START:
      return {
        ...state,
        startedAt: action.startedAt,
        ticks: 0
      };
    case STOP:
      return {
        ...state,
        startedAt: null
      };
    case TICK:
      return {
        ...state,
        ticks: state.ticks + 1
      };
    default:
      return state;
  }
};
