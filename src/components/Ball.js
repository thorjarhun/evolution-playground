import React from 'react';
import { pointInPlayground, applyDirection } from '../lib/game';
import { X_SPACING, Y_SPACING } from '../constants/game';

const BALL_DIAMETER = 23; // TODO: calculate based on tile size

export default ({ball}) => {
  var x, y;
  if (ball.location) {
    x = ball.location.x;
    y = ball.location.y;
  } else {
    const location = pointInPlayground(ball.row, ball.column);
    const dest = applyDirection(ball);
    const destination = pointInPlayground(dest.row, dest.column);
    x = location.x + ball.progress * (destination.x - location.x) + X_SPACING / 2;
    y = location.y + ball.progress * (destination.y - location.y) + Y_SPACING / 2;
  }
  return (
    <g transform={`translate(${x},${y})`}>
      <circle r={BALL_DIAMETER / 2} fill="rgb(255, 215, 0)" stroke="blue"/>
      <text fontSize={20} fontFamily="serif" textAnchor="middle" alignmentBaseline="middle">{ball.value}</text>
    </g>
  );
};
