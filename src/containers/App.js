import React from 'react';
import { Provider } from 'react-redux';
import { connect } from 'react-redux';
import Controls from '../components/Controls';
import Game from '../components/Game';

const App = connect(
  state => ({ game: state.game })
)(({game}) =>
  <div>
    <Controls />
    <div>
      <Game state={game}/>
    </div>
  </div>
);

export default ({store}) =>
	<Provider store={store}>
		<App/>
	</Provider>;
