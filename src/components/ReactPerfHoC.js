import React  from 'react';
import Perf from 'react-addons-perf';

const { begin, end } = (() => {
  var start = 'foo';
  return {
    begin: () => {
      start = Date.now();
      Perf.start();
    },
    end: message_prefix => {
      Perf.stop();
      console.log(`${message_prefix}${(Date.now() - start)/1000}`);
      const measurements = Perf.getLastMeasurements();
      Perf.printInclusive(measurements);
      Perf.printExclusive(measurements);
      Perf.printWasted(measurements);
    }
  }
})();

export default Component =>
  React.createClass({
    displayName: `perf(${Component.displayName || Component.name || 'Component'})`,
    componentWillMount() {
      begin();
    },
    componentDidMount() {
      end('initial render time: ');
    },
    componentWillUpdate() {
      begin();
    },
    componentDidUpdate() {
      end('render time: ');
    },
    render() {
      return <Component {...this.props} />;
    }
  });
