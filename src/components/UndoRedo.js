import React from 'react'
import Slider from 'rc-slider';
import { ActionCreators as UndoActionCreators } from 'redux-undo'
import { connect } from 'react-redux'

const jumpActionCreator = value => (dispatch, getState) => {
  const state = getState();
  return value > state.game.past.length
    ? dispatch(UndoActionCreators.jumpToFuture(value - state.game.past.length - 1))
    : dispatch(UndoActionCreators.jumpToPast(value));
};

export default connect(
  state => ({
    game: state.game
  }),
  dispatch => ({
    onChange: value => dispatch(jumpActionCreator(value))
  })
)(({ game, onChange }) =>
  <Slider dots value={game.past.length} step={1} min={0} max={game.past.length+game.future.length} onChange={onChange}/>
);
