import { combineReducers } from 'redux';
import game from './game';
import profiler from './profiler';

export default combineReducers({
  game,
  profiler
});
