import React from 'react';
import { connect } from 'react-redux';
import Controls from '../components/Controls';
import Game from '../components/Game';

export default connect(
  state => ({ game: state.game })
)(({game}) =>
  <div>
    <Controls />
    <div>
      <Game state={game}/>
    </div>
  </div>
);
