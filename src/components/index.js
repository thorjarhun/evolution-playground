import React from 'react';
import { Provider } from 'react-redux';
import { connect } from 'react-redux';
import Controls from './Controls';
import Game from './Game';
import UndoRedo from './UndoRedo';
import { selectGame } from '../selectors';

const App = connect(
  state => ({ game: selectGame(state) })
)(({game}) =>
  <div>
    <Controls />
    <UndoRedo/>
    <div>
      <Game state={game}/>
    </div>
  </div>
);

export default ({store}) =>
  <Provider store={store}>
    <App/>
  </Provider>;
