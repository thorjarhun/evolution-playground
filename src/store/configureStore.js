import { createStore, compose, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import rootReducer from '../reducers';
/*
import DevTools from '../containers/DevTools';
const storeEnhancers = [];
if (process.env.NODE_ENV !== 'production') {
    const DevTools = require("../containers/DevTools").default;

    // If the user has the "Redux DevTools" browser extension installed, use that.
    // Otherwise, hook up the in-page DevTools UI component.
    const debugEnhancer = window.devToolsExtension ? window.devToolsExtension() : DevTools.instrument();
    storeEnhancers.push(debugEnhancer);
}
*/
const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
export default initialState => {
//  const store = createStore(rootReducer, initialState, compose(...storeEnhancers));
  const store = createStore(
    rootReducer,
    initialState,
    composeEnhancers(applyMiddleware(thunk))
  );

  if (module.hot) {
    module.hot.accept('../reducers', () => {
      store.replaceReducer(require('../reducers').default);
    });
  }

  return store;
};
