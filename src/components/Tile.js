import React from 'react';
import { pointInPlayground, BOX_SYMBOL_BY_INDEX } from '../lib/game';
import { X_SPACING, Y_SPACING } from '../constants/game';

export default ({tile}) => {
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
