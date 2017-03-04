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
/*
const UPDATE_ANIMATION = 'UPDATE_ANIMATION';
const updateAnimation = (objectType, index) => ({
	type: UPDATE_ANIMATION,
	objectType,
	index
});

export const MOVE_BALL = 'MOVE_BALL';
const moveBall = index => ({
	type: 'MOVE_BALL',
	index
});

export const tick = now => (dispatch, getState) => {
	dispatch(updateFPS(now));
	const {game} = getState();

	if (game.balls.some(ball => !ball.dead)) {
		return game.balls.forEach((ball, i) => {
			if (!ball.dead) {
				dispatch(moveBall(i))
			}
		});
	}

	dispatch(tickAction({
		now: Date.now(),
		frameId
	}));
};

export const UPDATE_FPS = 'UPDATE_FPS';
const updateFPS = now => ({
	type: UPDATE_FPS,
	frameId,
	now
});

const tickAction = now => ({
  type: TICK,
  frameId,
  now
});
*/
export const tick = now => ({
	type: TICK,
	now
});

export const toggleAutoplay = now => (dispatch, getState) => {
  const { profiler } = getState();
  if (profiler.startedAt) {
    return dispatch(stop());
  }

  dispatch(start(now));

	const ticker = () => {
		try {
			frameId = window.requestAnimationFrame(ticker);

			dispatch(tick(Date.now()));
		} catch (e) {
			console.error(e);
			dispatch(stop());
			throw e;
		}
	};
	ticker();
};
