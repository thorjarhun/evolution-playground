import 'rxjs';
import React from 'react';
import { render } from 'react-dom';
import { AppContainer } from 'react-hot-loader';
import 'rc-slider/assets/index.css';
import App from './containers/App';
import configureStore from './configureStore';
const store = configureStore();

render(
  <AppContainer>
    <App store={store}/>
  </AppContainer>,
  document.getElementById('root')
);

if (module.hot) {
  module.hot.accept('./containers/App', () => {
    try {
      const NewApp = require('./containers/App').default;
      render(
        <AppContainer>
          <NewApp store={store}/>
        </AppContainer>,
        document.getElementById('root')
      )
    } catch(e) {
      console.error(e);
    }
  });
}
