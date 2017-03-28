import React from 'react';
import { Provider } from 'react-redux';
import { connect } from 'react-redux';
import Controls from '../components/Controls';
import Game from '../components/Game';
import UndoRedo from '../components/UndoRedo';

const App = connect(
  state => ({ game: state.game.present })
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
