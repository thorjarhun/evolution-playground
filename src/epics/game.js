


import { applyDirection, pointInPlayground } from '../lib/game';

export const START_GAME = 'START_GAME';
export const SHOW_GRID = 'SHOW_GRID';
export const SHOW_LABELS = 'SHOW_LABELS';
export const MOVE_INDIVIDUAL = 'MOVE_INDIVIDUAL';

export const startGame = () => ({
  type: START_GAME
});

export const showGrid = () => ({
  type: SHOW_GRID
});

export const showLabels = () => ({
  type: SHOW_LABELS
});

export const moveIndividual = (index, location) => ({
  type: MOVE_INDIVIDUAL,
  payload: {
    index,
    location  
  }
});

export const moveIndividualToBoard = index => ({
  type: MOVE_INDIVIDUAL
});

/*
export const showGrid$ = action$ =>
  action$.ofType(SHOW_GRID)
*/

import Rx from 'rxjs/Rx';

const animationFrame$ = Rx.Observable.interval(0, Rx.Scheduler.animationFrame);

import {positionForIndividual, individualInGamePoint} from '../lib/game';

// rate should be in (0, 1]
const lerp = rate => (start, end) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  return {
    x: start.x + dx * rate,
    y: start.y + dy * rate
  };
};

const distanceBetweenPoints = (pointA, pointB) => Math.sqrt(Math.pow(pointA.x - pointB.x, 2) + Math.pow(pointA.y - pointB.y, 2));

const showGrid$ = Rx.Observable.of(showGrid()).delay(1000);
const showLabels$ = Rx.Observable.of(showLabels()).delay(1000);

const lerp5 = lerp(.05);

const moveIndividual$ = (index, initialLocation, destination) =>
  Rx.Observable.concat(
    animationFrame$
      .scan(location =>
          lerp5(location, destination)
        , initialLocation)
      .takeWhile(location => distanceBetweenPoints(location, destination) > 1)
      .map(location => moveIndividual(index, location)),
    Rx.Observable.of(moveIndividual(index, destination))
  );

const moveIndividualToBoard$ = index => moveIndividual$(index, positionForIndividual(index), individualInGamePoint());

const moveIndividualHome$ = (index, initialLocation) => moveIndividual$(index, initialLocation, positionForIndividual(index));

export const START_RUN = 'START_RUN';
const startRun = index => ({
  type: START_RUN,
  payload: {
    index
  }
});

export const PRE_END_RUN = 'PRE_END_RUN';

export const END_RUN = 'END_RUN';
const endRun = () => ({
  type: END_RUN
});

export const DROP_BALL = 'DROP_BALL';
const dropBall = index => ({
  type: DROP_BALL,
  payload: {
    index
  }
});

export const MOVE_BALL = 'MOVE_BALL';
const moveBall = (index, location) => ({
  type: MOVE_BALL,
  payload: {
    index,
    location
  }
});

const lerp25 = lerp(0.25);

const moveBall$ = (index, initialLocation, destination) =>
  Rx.Observable.concat(
    animationFrame$
      .scan(location =>
          lerp25(location, destination)
        , initialLocation)
      .takeWhile(location => distanceBetweenPoints(location, destination) > 1)
      .map(location => moveBall(index, location)),
    Rx.Observable.of(moveBall(index, destination))
  );


export const advanceBall$ = (action$, store) =>
  action$.ofType(ADVANCE_BALL)
    .mergeMap(({payload}) => {
      const ball = store.getState().game.balls[payload.index];
      return Rx.Observable.concat(
        moveBall$(payload.index, ball.location, pointInPlayground(applyDirection(ball).row, applyDirection(ball).column)),
        Rx.Observable.of(advanceBall(payload.index))
      );
    });

export const ADVANCE_BALL = 'ADVANCE_BALL';

export const advanceBall = index => ({
  type: ADVANCE_BALL,
  payload: {
    index
  }
});

export const dropBall$ = (action$, store) => {
  return action$.ofType(DROP_BALL)
    .mergeMap(({payload}) => {
      const { index } = payload;
      const ball = store.getState().game.balls[index];
      return Rx.Observable.concat(
        moveBall$(index, pointInPlayground(ball.row, ball.column), pointInPlayground(applyDirection(ball).row, applyDirection(ball).column)),
        Rx.Observable.of(advanceBall(index))
      );
    })
};


export const startRun$ = action$ =>
  action$.ofType(START_RUN)
    .mergeMap(({payload}) =>
      Rx.Observable.concat(
        moveIndividualToBoard$(payload.index),
        Rx.Observable.of(dropBall(payload.index)),
        moveIndividualHome$(payload.index, individualInGamePoint()).delayWhen(() => action$.ofType(PRE_END_RUN)),
        Rx.Observable.of(endRun())
      )
    );

/*
export const endRun$ = (action$, store) =>
  action$.ofType(END_RUN)
    .mapTo(store.getState().game.individuals.findIndex(individual => !individual.showFitness))
*/
const START_ROUND = 'START_ROUND';
const startRound = () => ({
  type: START_ROUND
});

export const startRound$ = (action$, store) =>
  action$.ofType(START_ROUND)
    .mergeMap(() =>
      Rx.Observable.concat(
        showGrid$,
        showLabels$,
        Rx.Observable.of(startRun(0)),
        ...[...Array(store.getState().game.individuals.length-1).keys()].map(i =>
          Rx.Observable.concat(
            Rx.Observable.of(startRun(i+1)).delayWhen(() => action$.ofType(END_RUN)),
          )
        )
      )
    );

/*
const showGrid = Rx.Observable.of('grid').delay(1000).do(x => console.log(x), null, () => console.log('grid done'));
const showLabels = Rx.Observable.of('labels').delay(1000).do(x => console.log(x), null, () => console.log('labels done'));
*/
export const startGame$ = action$ =>
  action$.ofType(TICK)
    .mergeMap(() =>
      Rx.Observable.concat(Rx.Observable.of(startRound()))
    ).flatMap(x => {
      console.log(JSON.stringify(x, null, 2));
      return Rx.Observable.of(x);
    });










/*    
.ball {
  height: 2rem;
  width: 2rem;
  background: red;
  border-radius: 2rem;
  transform:
    translateX(calc(var(--ball-x) * 1px))
    translateY(calc(var(--ball-y) * 1px));
}

body, html {
  font-size: 100%;
  height: 100%;
  width: 100%;
  margin: 0;
  padding: 0;
  background: #343334;
}

function lerp(position, targetPosition) {
  const dx = (targetPosition.x - position.x) * 0.05;
  const dy = (targetPosition.y - position.y) * 0.05;

  return { x: position.x + dx, y: position.y + dy };
}

var initialPos = { x: 0, y: 0 };

const mouse$ = Rx.Observable
  .fromEvent(document, 'click')
  .map(e => ({ x: e.clientX, y: e.clientY }));

const ball$ = mouse$
  .mergeMap(mouse =>
    RxCSS.animationFrame
      .scan(state => ({
        ball: lerp(state.ball, mouse || state.ball)
      }), { ball: initialPos })
      .takeWhile(x => {
        const {ball} = x;
        return Math.abs(mouse.x-ball.x) > 0.1 && Math.abs(mouse.y-ball.y) > 0.1
      })
      .flatMap(x => {
        console.log(JSON.stringify(x, null, 2));
        return Rx.Observable.of(x);
      })
      .do(null, null, () => {
        console.log(mouse)
        initialPos = mouse
        //dispatch(moveCompleted)
      })
  )
  .pluck('ball');

RxCSS({
  ball: ball$
});
*/

