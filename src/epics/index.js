import { combineEpics } from 'redux-observable';
import {startGame$, startRun$, startRound$, dropBall$, advanceBall$} from './game';

export default combineEpics(
	startGame$,
	startRun$,
	startRound$,
	dropBall$,
	advanceBall$
);
