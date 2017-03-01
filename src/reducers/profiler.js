import { START, STOP, TICK } from '../actions/controls.js'

const calculateFrameRate = (ticks, startedAt, now) =>
  startedAt
  ? Math.ceil(ticks / ((now - startedAt) / 1000))
  : null;

export default (state = {
  startedAt: null,
  ticks: 0,
  frameRate: null,
  frameId: null
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
        startedAt: null,
        frameRate: null
      };
    case TICK:
      return {
        ...state,
        ticks: state.ticks + 1,
        frameRate: calculateFrameRate(state.ticks + 1, state.startedAt, action.now),
        frameId: action.frameId
      };
    default:
      return state;
  }
};
