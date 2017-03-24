import { createStore, compose, applyMiddleware } from 'redux';
import { createEpicMiddleware } from 'redux-observable';
import thunkMiddleware from 'redux-thunk';
import rootReducer from './reducers';
//import rootEpic from './epics';

//const epicMiddleware = createEpicMiddleware(rootEpic);

export default initialState => {
	const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
  const store = createStore(
    rootReducer,
    initialState,
    composeEnhancers(
	    applyMiddleware(
	  //    epicMiddleware,
	      thunkMiddleware
      )
    )
  );

  if (module.hot) {
    module.hot.accept('./reducers', () => {
      store.replaceReducer(require('./reducers').default);
    });
    /*
	  module.hot.accept('./epics', () => {
		  epicMiddleware.replaceEpic(require('./epics').default);
	  });
	  */
  }
  return store;
};
