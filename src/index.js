import React from 'react';
import { Provider } from 'react-redux';
import ReactDOM from 'react-dom';
import DevTools from './containers/DevTools';
import configureStore from './store/configureStore';

const store = configureStore();

let render = () => {
  const App = require('./containers/App').default;
  ReactDOM.render(
    <Provider store={store}>
      <div>
        <App />
        {/*
        <DevTools />
        */}
      </div>
    </Provider>,
    document.getElementById('root')
  );
};

if (module.hot) {
  const renderApp = render;
  const renderError = error => {
    ReactDOM.render(
      <pre>
        {error}
      </pre>,
      document.getElementById('root')
    );
  };

  render = () => {
    try {
      renderApp();
    } catch (e) {
      renderError(e);
    }
  };

  module.hot.accept('./containers/App', () => {
    setTimeout(render);
  })
}

render();
