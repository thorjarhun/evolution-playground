export const START = 'START';
export const STOP = 'STOP';
export const TICK = 'TICK';
export const RESET = 'RESET';

var frameId;

const start = startedAt => ({
  type: START,
  startedAt
});

const stopAction = () => ({
  type: STOP
});

const resetAction = () => ({
  type: RESET
});

const stop = () => dispatch => {
  window.cancelAnimationFrame(frameId);
  dispatch(stopAction());
};

export const reset = () => (dispatch, getState) => {
  const { profiler } = getState();
  if (profiler.startedAt) {
    dispatch(stop());
  }
  dispatch(resetAction());
};

export const tick = () => ({
	type: TICK
});

import { Animator } from './../components/Game';

export const toggleAutoplay = now => (dispatch, getState) => {
  const { profiler } = getState();
  if (profiler.startedAt) {
    return dispatch(stop());
  }

  dispatch(start(now));

	const ticker = () => {
		//Animator.afterAnimation(() => {
      try {
        frameId = window.requestAnimationFrame(ticker);

        if (!Animator.isAnimating()) {
          dispatch(tick());
        }
      } catch (e) {
        console.error(e);
        dispatch(stop());
        throw e;
      }
    //});
	};
	ticker();
};
