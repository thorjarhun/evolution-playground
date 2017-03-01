import React, { createElement } from 'react';
import { ROWS, COLUMNS, SVG_WIDTH, SVG_HEIGHT, X_SPACING, Y_SPACING, BALL_DROP_COLUMN, BALL_COLLECTION_COLUMN } from '../constants/game';
import { pointInPlayground } from '../lib/game';

export default ({ state }) => {
  const topLeft = pointInPlayground(0, 0);
  const bottomRight = pointInPlayground(ROWS, COLUMNS);
  return (
    <svg width={SVG_WIDTH} height={SVG_HEIGHT}>
      <defs>
        <pattern id="grid" width={X_SPACING} height={Y_SPACING} patternUnits="userSpaceOnUse">
          <path d="M 100 0 L 0 0 0 100" fill="none" stroke="gray"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="white"/>
      {
        state.gridOn &&
        <rect x={topLeft.x} y={topLeft.y} width={X_SPACING*10+1} height={Y_SPACING*10+1} fill="url(#grid)" />
      }
      {
        state.boxesOn &&
        [(() => {
            const s = `${state.collectedPoints} pts`;
            const point = pointInPlayground(ROWS + 1, BALL_COLLECTION_COLUMN);
            const x = point.x + X_SPACING / 2;
            const y = point.y;
            return <text key='points' x={x} y={y} fontSize={20} fontFamily="sans-serif" fill="red" textAnchor="middle">{s}</text>;
          })(),
          ...[...Array(ROWS).keys()].reduce((a, i) => {
            return [...a, ...[...Array(COLUMNS).keys()].map(j => {
              if (state.boxes && state.boxes[i][j]) {
                return <Box key={`${i},${j}`} box={state.boxes[i][j]}/>;
              }
              return null;
            })];
          }, []),
          (() => {
            const s = `Generation: ${state.generation}`;
            const point = pointInPlayground(ROWS, 0);
            const x = point.x;
            const y = point.y;
            return <text key='generation' x={x} y={y} dy="1em" fontSize={12} fontFamily="sans-serif">{s}</text>;
          })()
        ]
      }
      {
        state.labelsOn &&
        [...Array(ROWS).keys()].map(row => {
          const left = pointInPlayground(row, 0);
          return <text key={`${row+1},0`} x={left.x - 14} y={left.y + Y_SPACING / 2} fontSize={20} fontFamily="sans-serif" fill="gray">{row}</text>
        }).concat(
          [...Array(COLUMNS).keys()].filter(x => x !== BALL_DROP_COLUMN).map(column => {
            const top = pointInPlayground(0, column);
            return <text key={`0,${column+1}`} x={top.x + X_SPACING / 2} y={top.y - 3} fontSize={20} fontFamily="sans-serif" fill="gray" textAnchor="middle">{column}</text>
          })
        ).concat(
          [(() => {
              const p = pointInPlayground(0, BALL_DROP_COLUMN);
              return <rect key="ballDrop" x={p.x} y={p.y - 10} width={X_SPACING} height={10} fill="rgb(200, 200, 255)" stroke="gray"/>;
            })(),
            (() => {
              const p = pointInPlayground(ROWS, BALL_COLLECTION_COLUMN);
              return <rect key="ballCollect" x={p.x} y={p.y} width={X_SPACING} height={10} fill="rgb(200, 200, 255)" stroke="gray"/>;
            })()
          ]
        )
      }
      {
        state.message &&
        <text key="message" x={pointInPlayground(0,0).x} y={SVG_HEIGHT * 0.9} fontSize={30} fontFamily="sans-serif">{state.message}</text>
      }
      {
        state.individuals.map((individual, i) => {
          return <Individual key={i} individual={individual}/>;
        })
      }
      {
        state.balls.filter(ball => !ball.dead).map((ball, i) => {
          return <Ball key={i} ball={ball}/>;
        })
      }
    </svg>
  );
};

const Individual = ({individual}) => {
  if (!individual.visible) {
    return null;
  }
  const result = [];
  const niceT = individual.DNA.types.split('').map(x => x === ' ' ? x : 'ALRS'[x]);
  var x1 = individual.DNA.xs,
      x2 = '',
      x3 = '',
      y1 = individual.DNA.ys,
      y2 = '',
      y3 = '',
      t1 = niceT,
      t2 = '',
      t3 = '';

  const { modIndex, location, destination, progress, expandingGene, shrinkingGene } = individual;
  if (expandingGene || shrinkingGene) {
    x1 = individual.DNA.xs.slice(0, modIndex);
    x2 = individual.DNA.xs.slice(modIndex, modIndex + 1);
    x3 = individual.DNA.xs.slice(modIndex + 1);
    y1 = individual.DNA.ys.slice(0, modIndex);
    y2 = individual.DNA.ys.slice(modIndex, modIndex + 1);
    y3 = individual.DNA.ys.slice(modIndex + 1);
    t1 = niceT.slice(0, modIndex);
    t2 = niceT.slice(modIndex, modIndex + 1);
    t3 = niceT.slice(modIndex + 1);
  }

  const loc = {
    x: location.x + progress * (destination.x - location.x) + 2,
    y: location.y + progress * (destination.y - location.y)
  };

  const color = (!individual.showFitness || individual.fitness) ? 'black' : 'rgb(210,210,210)';
  result.push(<text key={1} x={loc.x} y={loc.y} dy='1em' fontSize={12} fontFamily="monospace" fill={color} style={{whiteSpace: 'pre'}}>{x1}</text>);
  result.push(<text key={2} x={loc.x} y={loc.y} dy='2em' fontSize={12} fontFamily="monospace" fill={color} style={{whiteSpace: 'pre'}}>{y1}</text>);
  result.push(<text key={3} x={loc.x} y={loc.y} dy='3em' fontSize={12} fontFamily="monospace" fill={color} style={{whiteSpace: 'pre'}}>{t1}</text>);
  if (expandingGene || shrinkingGene) {
	  const temp = expandingGene ? individual.progress : (1 - individual.progress);
	  const bigFontSize = individual.fromSize + temp * (individual.toSize - individual.fromSize);

	  const CHAR_WIDTH = 7;
	  let x = loc.x + CHAR_WIDTH * (x1.length + temp);
	  result.push(<text key={5} x={x} y={loc.y} dy='1em' fontSize={bigFontSize} fontFamily='monospace'
	                    fontWeight='bold'>{x2}</text>);
	  result.push(<text key={6} x={x} y={loc.y} dy='2em' fontSize={bigFontSize} fontFamily='monospace'
	                    fontWeight='bold'>{y2}</text>);
	  result.push(<text key={7} x={x} y={loc.y} dy='3em' fontSize={bigFontSize} fontFamily='monospace'
	                    fontWeight='bold'>{t2}</text>);
	  var shift = x1.length;
	  if (expandingGene) {
		  shift += +!!individual.fromSize + 2*individual.progress;
	  } else {
		  shift += (+!!individual.fromSize - individual.progress) +!!individual.toSize//individual.progress*x2.trim().length;
	  }
    x = loc.x + shift * CHAR_WIDTH;
    result.push(<text key={8} x={x} y={loc.y} dy='1em' fontSize={12} fontFamily='monospace'>{x3}</text>);
    result.push(<text key={9} x={x} y={loc.y} dy='2em' fontSize={12} fontFamily='monospace'>{y3}</text>);
    result.push(<text key={10} x={x} y={loc.y} dy='3em' fontSize={12} fontFamily='monospace'>{t3}</text>);
  }
  if (individual.showFitness) {
    result.push(<text key={4} x={loc.x} y={loc.y} dy='4em' fontSize={12} fontFamily="monospace" fill='rgb(30,150,30)'>{`Fitness: ${individual.fitness}`}</text>);
  }
  return <g>{result}</g>;
};

// TODO: Rename to Tile
const Box = ({box}) => {
  const s = 'ALRS'[box.type];
  const color = [
    'rgb(50,200,200)',
    'rgb(200,50,50)',
    'rgb(50,50,200)',
    'rgb(50,200,50)'
  ][box.type];
  const point = pointInPlayground(box.row, box.column);
  const x = point.x + X_SPACING / 2; // - offset
  const y = point.y + Y_SPACING / 2; // + offset
  return <text x={x} y={y} dy='0.3em' fontSize={18} fontFamily="sans-serif" fill={color} textAnchor="middle">{s}</text>;
};

const BALL_DIAMETER = 23; // TODO: calculate based on tile size

const Ball = ({ball}) => {
  const x = ball.location.x + ball.progress * (ball.destination.x - ball.location.x) + X_SPACING / 2;
  const y = ball.location.y + ball.progress * (ball.destination.y - ball.location.y) + Y_SPACING / 2;
  return (
    <g>
      <circle cx={x} cy={y} r={BALL_DIAMETER / 2} fill="rgb(255, 215, 0)" stroke="blue"/>
      <text x={x} y={y} fontSize={20} fontFamily="serif" textAnchor="middle" alignmentBaseline="middle">{ball.value}</text>
    </g>
  );
};
