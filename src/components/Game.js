import React, { createElement } from 'react';
import { ROWS, COLUMNS, SVG_WIDTH, SVG_HEIGHT, X_SPACING, Y_SPACING, BALL_DROP_COLUMN, BALL_COLLECTION_COLUMN } from '../constants/game';
import { pointInPlayground, applyDirection, calculatePoints, BOX_SYMBOL_BY_INDEX } from '../lib/game';

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
	      state.labelsOn &&
        [(() => {
            const s = `${calculatePoints(state.balls)} pts`;
            const point = pointInPlayground(ROWS + 1, BALL_COLLECTION_COLUMN);
            const x = point.x + X_SPACING / 2;
            const y = point.y;
            return <text key='points' x={x} y={y} fontSize={20} fontFamily="sans-serif" fill="red" textAnchor="middle">{s}</text>;
          })(),
          ...[...Array(ROWS).keys()].reduce((a, i) => {
            return [...a, ...[...Array(COLUMNS).keys()].map(j => {
              if (state.boxes && state.boxes[i][j]) {
                return <Tile key={`${i},${j}`} tile={state.boxes[i][j]}/>;
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
        state.balls.filter(ball => ball.row < ROWS).map((ball, i) => {
          return <Ball key={i} ball={ball}/>;
        })
      }
    </svg>
  );
};

const stringifyEncoding = dna => dna.reduce((a,c) => ({
	xs: a.xs + c.x,
	ys: a.ys + c.y,
	types: a.types + c.type
}), { xs: '', ys: '', types: '' });

const Individual = ({individual}) => {
  if (!individual.visible) {
    return null;
  }
	const DNA = stringifyEncoding(individual.DNA);
  const result = [];
  var x1 = DNA.xs,
      x2 = '',
      x3 = '',
      y1 = DNA.ys,
      y2 = '',
      y3 = '',
      t1 = DNA.types.split('').map(x => x === ' ' ? x : BOX_SYMBOL_BY_INDEX[x]),
      t2 = '',
      t3 = '';

  const { modIndex, location, destination, progress, expandingGene, shrinkingGene } = individual;
  if (expandingGene || shrinkingGene) {
    x3 = x1.slice(modIndex + 1);
	  x2 = x1.slice(modIndex, modIndex + 1);
	  x1 = x1.slice(0, modIndex);
	  y3 = y1.slice(modIndex + 1);
    y2 = y1.slice(modIndex, modIndex + 1);
	  y1 = y1.slice(0, modIndex);
	  t3 = t1.slice(modIndex + 1);
	  t2 = t1.slice(modIndex, modIndex + 1);
    t1 = t1.slice(0, modIndex);
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
		  shift += +!!individual.toSize + (+!!individual.fromSize - individual.progress)
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

const Tile = ({tile}) => {
	const s = BOX_SYMBOL_BY_INDEX[tile.type];
  const color = [
    'rgb(50,200,200)',
    'rgb(200,50,50)',
    'rgb(50,50,200)',
    'rgb(50,200,50)'
  ][tile.type];
  const point = pointInPlayground(tile.row, tile.column);
  const x = point.x + X_SPACING / 2;
  const y = point.y + Y_SPACING / 2;
  return <text x={x} y={y} dy='0.3em' fontSize={18} fontFamily="sans-serif" fill={color} textAnchor="middle">{s}</text>;
};

const BALL_DIAMETER = 23; // TODO: calculate based on tile size

const Ball = ({ball}) => {
	const location = pointInPlayground(ball.row, ball.column);
	const dest = applyDirection(ball);
	const destination = pointInPlayground(dest.row, dest.column);
  const x = location.x + ball.progress * (destination.x - location.x) + X_SPACING / 2;
  const y = location.y + ball.progress * (destination.y - location.y) + Y_SPACING / 2;

  return (
    <g>
      <circle cx={x} cy={y} r={BALL_DIAMETER / 2} fill="rgb(255, 215, 0)" stroke="blue"/>
      <text x={x} y={y} fontSize={20} fontFamily="serif" textAnchor="middle" alignmentBaseline="middle">{ball.value}</text>
    </g>
  );
};
