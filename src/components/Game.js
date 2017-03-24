import React, { createElement } from 'react';
import { ROWS, COLUMNS, SVG_WIDTH, SVG_HEIGHT, X_SPACING, Y_SPACING, BALL_DROP_COLUMN, BALL_COLLECTION_COLUMN } from '../constants/game';
import { pointInPlayground, applyDirection, calculatePoints, BOX_SYMBOL_BY_INDEX, EMPTY_GENE } from '../lib/game';

export default ({ state }) => {
  const topLeft = pointInPlayground(0, 0);
  const bottomRight = pointInPlayground(ROWS, COLUMNS);
  return (
    <svg width={SVG_WIDTH} height={SVG_HEIGHT}>
      <defs>
        <pattern id="grid" width={X_SPACING} height={Y_SPACING} patternUnits="userSpaceOnUse">
          <path d="M 100 0 L 0 0 0 100" fill="none" stroke="gray"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="white"/>
      {
        state.gridOn &&
        <rect x={topLeft.x} y={topLeft.y} width={X_SPACING*10+1} height={Y_SPACING*10+1} fill="url(#grid)" />
      }
      {
	      state.labelsOn &&
        [(() => {
            const s = `${calculatePoints(state.balls)} pts`;
            const point = pointInPlayground(ROWS + 1, BALL_COLLECTION_COLUMN);
            const x = point.x + X_SPACING / 2;
            const y = point.y;
            return <text key='points' x={x} y={y} fontSize={20} fontFamily="sans-serif" fill="red" textAnchor="middle">{s}</text>;
          })(),
          ...[...Array(ROWS).keys()].reduce((a, i) => {
            return [...a, ...[...Array(COLUMNS).keys()].map(j => {
              if (state.boxes && state.boxes[i][j]) {
                return <Tile key={`${i},${j}`} tile={state.boxes[i][j]}/>;
              }
              return null;
            })];
          }, []),
          (() => {
            const s = `Generation: ${state.generation}`;
            const point = pointInPlayground(ROWS, 0);
            const x = point.x;
            const y = point.y;
            return <text key='generation' x={x} y={y} dy="1em" fontSize={12} fontFamily="sans-serif">{s}</text>;
          })()
        ]
      }
      {
        state.labelsOn &&
        [...Array(ROWS).keys()].map(row => {
          const left = pointInPlayground(row, 0);
          return <text key={`${row+1},0`} x={left.x - 14} y={left.y + Y_SPACING / 2} fontSize={20} fontFamily="sans-serif" fill="gray">{row}</text>
        }).concat(
          [...Array(COLUMNS).keys()].filter(x => x !== BALL_DROP_COLUMN).map(column => {
            const top = pointInPlayground(0, column);
            return <text key={`0,${column+1}`} x={top.x + X_SPACING / 2} y={top.y - 3} fontSize={20} fontFamily="sans-serif" fill="gray" textAnchor="middle">{column}</text>
          })
        ).concat(
          [(() => {
              const p = pointInPlayground(0, BALL_DROP_COLUMN);
              return <rect key="ballDrop" x={p.x} y={p.y - 10} width={X_SPACING} height={10} fill="rgb(200, 200, 255)" stroke="gray"/>;
            })(),
            (() => {
              const p = pointInPlayground(ROWS, BALL_COLLECTION_COLUMN);
              return <rect key="ballCollect" x={p.x} y={p.y} width={X_SPACING} height={10} fill="rgb(200, 200, 255)" stroke="gray"/>;
            })()
          ]
        )
      }
      {
        state.message &&
        <text key="message" x={pointInPlayground(0,0).x} y={SVG_HEIGHT * 0.9} fontSize={30} fontFamily="sans-serif">{state.message}</text>
      }
      {
	      state.individuals.length <= 20 && <Individuals individuals={state.individuals}/>
      }
	    {/*
		    state.individuals.length > 20 &&
			    <Crossover parent1={state.individuals[1]} parent2={state.individuals[6]} child={state.individuals[7]} />
	    */}
      {
        state.balls.filter(ball => ball.row < ROWS).map((ball, i) => {
          return <Ball key={i} ball={ball}/>;
        })
      }
    </svg>
  );
};

const Individuals = React.createClass({

  render() {
    const {individuals} = this.props;
    return (
      <g>
        {
          individuals.map(individual =>
            individual.visible && <IndividualD3 key={individual.id} model={individual}/>
          )
        }
      </g>
    )
  }
});

import * as d3 from 'd3';
import Faux from 'react-faux-dom';
const CHAR_WIDTH = 8;
const CHAR_HEIGHT = 14;

import { memoize, unary } from 'ramda';

const d3ifyGene = unary(memoize(gene =>
  gene === EMPTY_GENE
    ? []
    : [gene.x, gene.y, BOX_SYMBOL_BY_INDEX[gene.type]]
));

const d3ifyDNA = dna => dna.map(d3ifyGene);

const DURATION = 1000;

// TODO: Rewrite top-level animations for individuals as D3 layout

const updateIndividualD3 = (individual, model) => {
/*
  const translateX = function(d, i, j) {
    debugger;
    return `translate(${i*CHAR_WIDTH},0)`;
  };
  const childDNA = model.DNA.filter(gene => gene !== EMPTY_GENE);

  const genes = individual
    .selectAll('g')
    .data(d3ifyDNA(childDNA), id);

  genes.attr('transform', translateX);
*/
  const fitness = individual
    .selectAll('svg:text')
    .data(d => model.showFitness ? [1] : [], d => d); // TODO: better pattern

  fitness.enter()
    .append('svg:text')
    .attr('fill', 'rgb(30,150,30)')
  //  .attr('y', 3*CHAR_HEIGHT)
    .attr('dy', 3+'em')
    .text(`Fitness: ${model.fitness}`);

  fitness.exit().remove();
};


const id = (() => {
  var index = 1;
  const objects = new WeakMap();
  return obj => {
    if (!objects.has(obj)) {
      objects.set(obj, index++);
    }
    return objects.get(obj);
  }
})();

window.d3 = d3;

const updateD3 = (individual, model, oldDNA) => {
  const childDNA = model.DNA.filter(gene => gene !== EMPTY_GENE);
  const oldChildDNA = oldDNA.filter(gene => gene !== EMPTY_GENE);

  const sizeChange = childDNA.length - oldChildDNA.length;

  const genes = individual
    .selectAll('g')
    .data(d3ifyDNA(childDNA), id);

  const translateX = (d, i) => `translate(${i*CHAR_WIDTH},0)`;

  const swapThis = fn => (...args) => fn.call(...args);
  const unshiftThis = fn => function() { return fn.call(this, this, ...arguments); };
  const addScale2 = unshiftThis(self => `${self.getAttribute('transform')} scale(2)`);

  const fill = (!model.showFitness || model.fitness > 0) ? 'black' : 'rgb(210,210,210)';

  const changeIndex = childDNA.findIndex((gene, i) => gene !== oldChildDNA[i]);

  const newGenes = genes.enter().append('g');

  genes
    .style('fill', fill);

  newGenes
    .attr('transform', translateX)
    .style('fill', fill)
    .selectAll('text')
    .data(d => d)
    .enter()
    .append('text')
    /*
    .attr('dx', (d, i, j) => {
      const parentNode = j[i].parentNode;
      const k = [].indexOf.call(parentNode.parentNode.childNodes, parentNode);
      return (k*.6) + 'em';
    })
    */
    .attr('dy', (d, i) => i + 'em')
    //  .attr('y', (d,i) => i*CHAR_HEIGHT)
    .text(d => ''+d);

  if (sizeChange) {
    const tran1 = genes
      .transition().duration(DURATION)
      .attr('transform', (d, i) => `translate(${i*CHAR_WIDTH + (i < changeIndex ? 0 : sizeChange < 0 ? 2*CHAR_WIDTH : CHAR_WIDTH)},0)`);

    if (sizeChange < 0) {
      tran1
        .transition().duration(DURATION*2)
        .attr('transform', translateX);
    } else {
      tran1
        .transition().duration(DURATION)
        .attr('transform', (d, i) => `translate(${i*CHAR_WIDTH + (i < changeIndex ? 0 : CHAR_WIDTH)},0)`)
        .transition().duration(DURATION)
        .attr('transform', translateX);
    }

    newGenes
      .attr('transform', addScale2)
      .style('fill', 'green')
      .style('fill-opacity', 0)
      .transition().delay(DURATION).duration(DURATION)
      .style('fill-opacity', 1)
      .transition().duration(DURATION)
      .attr('transform', translateX)
      .style('fill', fill);

    genes.exit()
      .style('fill', 'red')
      .transition().duration(DURATION)
      .attr('transform', addScale2)
      .style('fill-opacity', 1)
      .transition().duration(DURATION)
      .style('fill-opacity', 0)
      .remove();
  }
};

const IndividualD3 = React.createClass({
  getInitialState() {
    return {
      animation: false,
      individual: null
    };
  },
  componentDidMount() {
    const { model } = this.props;
    const individual = d3.select(this.connectFauxDOM('g', 'animation'))
      .attr('transform', `translate(${model.location.x},${model.location.y})`)
      .style('font-family', 'monospace');

    this.setState({individual});

    console.log('mount', individual);

    if (model.parent2) {
      this.doCrossOver(individual, model);
    } else {
      updateD3(individual, model, model.DNA);

      updateIndividualD3(individual, model);

      if (model.location !== model.destination) {
        individual.transition()
          .duration(DURATION)
          .attr('transform', `translate(${model.destination.x},${model.destination.y})`);
        this.animateFauxDOM(DURATION, Animator.animating(this));
      }
    }
  },
  fixDNA(individual, model, oldDNA) {
    console.log('fixDNA');
    updateD3(individual, model, oldDNA || model.DNA);
    this.animateFauxDOM(DURATION*6, Animator.animating(this));
  },
  componentWillReceiveProps({model}) { // you bet it will
    if (this.props.model !== model) {
      console.log('props');
      const individual = this.state.individual;//d3.select(this.connectedFauxDOM.animation);
      updateIndividualD3(individual, model);

      if (this.props.model.DNA !== model.DNA) {
        this.fixDNA(individual, model, this.props.model.DNA);
      } else {
        individual.transition()
          .duration(DURATION)
          .attr('transform', `translate(${model.destination.x},${model.destination.y})`);

        this.animateFauxDOM(DURATION, Animator.animating(this));
      }
    }
  },
  doCrossOver(individual, model) {
    const {parent1, parent2} = model;

    const childDNA = model.DNA.filter(gene => gene !== EMPTY_GENE);

    const DNA = d3ifyDNA(model.DNA).filter(x => x.length);

    const shallowEqual = (a,b) => Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(key => a[key] === b[key]);

    const translationBetween = (A, B) =>
      `translate(${B.x-A.x},${B.y-A.y})`;

    individual // TODO: Maybe transition this?
      .attr('transform', `translate(${model.destination.x},${model.destination.y})`);

    const genes = individual
      .style('font-family', 'monospace')
      .selectAll('g')
      .data(DNA)
      .enter()
      .append('g')
      .attr('transform', (d, i, j) => {
        const gene = childDNA[i];
        var index = i;
        while (true) {
          if (index < parent1.DNA.length && shallowEqual(gene, parent1.DNA[index])) {
            break;
          }
          if (index < parent2.DNA.length && shallowEqual(gene, parent2.DNA[index])) {
            break;
          }
          if (index > 50) {
            console.log('opps');
            break;
          }
          index++;
        }
        const x = (index - i)*CHAR_WIDTH;
        if (index < parent1.DNA.length && shallowEqual(gene, parent1.DNA[index])) {
          return `translate(${x},${parent1.destination.y-model.destination.y})`;
        }
        return `translate(${x},${parent2.destination.y-model.destination.y})`;
        /*
         if (i < parent1.DNA.length && shallowEqual(child.DNA[i], parent1.DNA[i])) {
         return translationBetween(model.destination, parent1.destination);
         }
         return translationBetween(model.destination, parent2.destination);
         */
      });

    genes
      .selectAll('text')
      .data(d => d)
      .enter()
      .append('text')
      .attr('x', (d, i, j) => {
        const parentNode = j[i].parentNode;
        const k = [].indexOf.call(parentNode.parentNode.childNodes, parentNode);
        return k*CHAR_WIDTH;
      })
      .attr('y', (d,i) => i*CHAR_HEIGHT)
      .text(d => ''+d);

    const t = d3.transition()
      .duration(10000)
      .ease(d3.easeCubicIn)
      .on('end', () => {
        //dispatch(animateChild())
      });

    genes.transition()
      .duration(DURATION)
      .attr('transform', 'translate(0,0)');

    this.animateFauxDOM(DURATION, Animator.animating(this));
  },
  componentWillMount() {
    this.connectedFauxDOM = {};
    this.animateFauxDOMUntil = 0;
  },
  connectFauxDOM(node, name) {
    this.connectedFauxDOM[name] = typeof node !== 'string' ? node : new Faux.Element(node);
    setTimeout(() => this.drawFauxDOM());
    return this.connectedFauxDOM[name];
  },
  drawFauxDOM() {
    this.setState({
      animation: this.connectedFauxDOM.animation.toReact()
    });
  },
  isAnimatingFauxDOM() {
    return !!this.fauxDOMAnimationInterval;
  },
  componentWillUnmount() {
    this.stopAnimatingFauxDOM();
  },
  animateFauxDOM(duration, callback) {
    this.animateFauxDOMUntil = Math.max(Date.now() + duration, this.animateFauxDOMUntil);
    this.callback = callback;
    if (!this.fauxDOMAnimationInterval) {
      this.fauxDOMAnimationInterval = setInterval(() => {
        if (Date.now() < this.animateFauxDOMUntil) {
          this.drawFauxDOM();
        } else {
          this.stopAnimatingFauxDOM();
        }
      }, 16);
    }
  },
  stopAnimatingFauxDOM() {
    this.fauxDOMAnimationInterval = clearInterval(this.fauxDOMAnimationInterval);
    this.animateFauxDOMUntil = 0;
    if (this.callback) {
      const { callback } = this;
      delete this.callback;
      callback();
    }
  },
  render() {
    return <g>{this.state.animation}</g>;
  }
});

export const Animator = (() => {
  const animations = [];
  const callbacks = [];
  return {
    animating: component => {
      animations.push(component);
      console.log('animating');
      return () => {
        animations.splice(animations.indexOf(component), 1);
        if (!animations.length) {
          console.log('done');
          callbacks.forEach(callback => callback());
        }
      };
    },
    afterAnimation: callback => {
      if (!animations.length) {
        callback();
      } else {
        callbacks.push(callback);
      }
    },
    isAnimating: () => !!animations.length
  }
})();

const Crossover = React.createClass({
	mixins: [
		Faux.mixins.core,
		Faux.mixins.anim
	],
	getInitialState() {
		return {
			animation: 'loading'
		};
	},
	componentDidMount() {
		const {parent1, parent2, child} = this.props;
		const faux = d3.select(this.connectFauxDOM('g', 'animation'));

    const childDNA = child.DNA.filter(gene => gene !== EMPTY_GENE);

    const DNA = child.DNA.map(gene =>
      gene === EMPTY_GENE
        ? []
        : [gene.x, gene.y, BOX_SYMBOL_BY_INDEX[gene.type]]
    ).filter(x => x.length);

    const shallowEqual = (a,b) => Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(key => a[key] === b[key]);

    const translationBetween = (A, B) =>
      `translate(${B.x-A.x},${B.y-A.y})`;

    const individual = faux
      .append('g')
      .attr('transform', `translate(${child.destination.x},${child.destination.y})`);

    const genes = individual
      .style('font-family', 'monospace')
      .selectAll('g')
      .data(DNA)
      .enter()
      .append('g')
      .attr('transform', (d, i, j) => {
        const gene = childDNA[i];
        var index = i;
        while (true) {
          if (index < parent1.DNA.length && shallowEqual(gene, parent1.DNA[index])) {
            break;
          }
          if (index < parent2.DNA.length && shallowEqual(gene, parent2.DNA[index])) {
            break;
          }
          if (index > 50) {
            console.log('opps');
            break;
          }
          index++;
        }
        const x = (index - i)*CHAR_WIDTH;
        if (index < parent1.DNA.length && shallowEqual(gene, parent1.DNA[index])) {
          return `translate(${x},${parent1.destination.y-child.destination.y})`;
        }
        return `translate(${x},${parent2.destination.y-child.destination.y})`;
/*
        if (i < parent1.DNA.length && shallowEqual(child.DNA[i], parent1.DNA[i])) {
          return translationBetween(child.destination, parent1.destination);
        }
        return translationBetween(child.destination, parent2.destination);
        */
      });

    genes
      .selectAll('text')
      .data(d => d)
      .enter()
      .append('text')
      .attr('x', (d, i, j) => {
        const parentNode = j[i].parentNode;
        const k = [].indexOf.call(parentNode.parentNode.childNodes, parentNode);
        return k*CHAR_WIDTH;
      })
      .attr('y', (d,i) => i*CHAR_HEIGHT)
      .text(d => ''+d);

    const t = d3.transition()
      .duration(10000)
      .ease(d3.easeCubicIn)
      .on('end', () => {
        //dispatch(animateChild())
      });

    genes.transition()
      .duration(DURATION)
      .attr('transform', 'translate(0,0)');

    /*
		const DNA1 = parent1.DNA.map((gene,i) => {
			if (shallowEqual(gene, child.DNA[i])) {
				return [gene.x, gene.y, BOX_SYMBOL_BY_INDEX[gene.type]];
			}
			return [];
		});

		const DNA2 = parent2.DNA.map((gene,i) => {
			if (i >= DNA1.length && shallowEqual(gene, child.DNA[i]) || DNA1[i].length === 0) {
				return [gene.x, gene.y, BOX_SYMBOL_BY_INDEX[gene.type]];
			}
			return [];
		});
		*/
		this.animateFauxDOM(DURATION/2);
	},
	render() {
		return <g>{this.state.animation}</g>;
	}
});

const stringifyEncoding = dna => dna.reduce((a,c) => ({
	xs: a.xs + c.x,
	ys: a.ys + c.y,
	types: a.types + c.type
}), { xs: '', ys: '', types: '' });

const Individual = ({individual}) => {
  if (individual.parent1) {
    if (individual.parent2) {
      return <Crossover parent1={individual.parent1} parent2={individual.parent2} child={individual} />;
    }
  }
  if (!individual.visible) {
    return null;
  }
	const DNA = stringifyEncoding(individual.DNA);
  const result = [];
  var x1 = DNA.xs,
      x2 = '',
      x3 = '',
      y1 = DNA.ys,
      y2 = '',
      y3 = '',
      t1 = DNA.types.split('').map(x => x === ' ' ? x : BOX_SYMBOL_BY_INDEX[x]),
      t2 = '',
      t3 = '';

  const { modIndex, location, destination, progress, expandingGene, shrinkingGene } = individual;
  if (expandingGene || shrinkingGene) {
    x3 = x1.slice(modIndex + 1);
	  x2 = x1.slice(modIndex, modIndex + 1);
	  x1 = x1.slice(0, modIndex);
	  y3 = y1.slice(modIndex + 1);
    y2 = y1.slice(modIndex, modIndex + 1);
	  y1 = y1.slice(0, modIndex);
	  t3 = t1.slice(modIndex + 1);
	  t2 = t1.slice(modIndex, modIndex + 1);
    t1 = t1.slice(0, modIndex);
  }

  const loc = {
    x: location.x + progress * (destination.x - location.x),
    y: location.y + progress * (destination.y - location.y)
  };

  const color = (!individual.showFitness || individual.fitness > 0) ? 'black' : 'rgb(210,210,210)';
  result.push(<text key={1} x={loc.x} y={loc.y} dy='0em' fontSize={14} fontFamily="monospace" fill={color} style={{whiteSpace: 'pre'}}>{x1}</text>);
  result.push(<text key={2} x={loc.x} y={loc.y} dy='1em' fontSize={14} fontFamily="monospace" fill={color} style={{whiteSpace: 'pre'}}>{y1}</text>);
  result.push(<text key={3} x={loc.x} y={loc.y} dy='2em' fontSize={14} fontFamily="monospace" fill={color} style={{whiteSpace: 'pre'}}>{t1}</text>);
  if (expandingGene || shrinkingGene) {
	  const temp = expandingGene ? individual.progress : (1 - individual.progress);
	  const bigFontSize = individual.fromSize + temp * (individual.toSize - individual.fromSize);

	  const CHAR_WIDTH = 7;
	  let x = loc.x + CHAR_WIDTH * (x1.length + temp);
	  result.push(<text key={5} x={x} y={loc.y} dy='0em' fontSize={bigFontSize} fontFamily='monospace'
	                    fontWeight='bold'>{x2}</text>);
	  result.push(<text key={6} x={x} y={loc.y} dy='1em' fontSize={bigFontSize} fontFamily='monospace'
	                    fontWeight='bold'>{y2}</text>);
	  result.push(<text key={7} x={x} y={loc.y} dy='2em' fontSize={bigFontSize} fontFamily='monospace'
	                    fontWeight='bold'>{t2}</text>);
	  var shift = x1.length;
	  if (expandingGene) {
		  shift += +!!individual.fromSize + 2*individual.progress;
	  } else {
		  shift += +!!individual.toSize + (+!!individual.fromSize - individual.progress)
	  }
    x = loc.x + shift * CHAR_WIDTH;
    result.push(<text key={8} x={x} y={loc.y} dy='0em' fontSize={14} fontFamily='monospace'>{x3}</text>);
    result.push(<text key={9} x={x} y={loc.y} dy='1em' fontSize={14} fontFamily='monospace'>{y3}</text>);
    result.push(<text key={10} x={x} y={loc.y} dy='2em' fontSize={14} fontFamily='monospace'>{t3}</text>);
  }
  if (individual.showFitness) {
    result.push(<text key={4} x={loc.x} y={loc.y} dy='3em' fontSize={14} fontFamily="monospace" fill='rgb(30,150,30)'>{`Fitness: ${individual.fitness}`}</text>);
  }
  return <g>{result}</g>;
};

const Tile = ({tile}) => {
	const s = BOX_SYMBOL_BY_INDEX[tile.type];
  const color = [
    'rgb(50,200,200)',
    'rgb(200,50,50)',
    'rgb(50,50,200)',
    'rgb(50,200,50)'
  ][tile.type];
  const point = pointInPlayground(tile.row, tile.column);
  const x = point.x + X_SPACING / 2;
  const y = point.y + Y_SPACING / 2;
  return <text x={x} y={y} dy='0.3em' fontSize={18} fontFamily="sans-serif" fill={color} textAnchor="middle">{s}</text>;
};

const BALL_DIAMETER = 23; // TODO: calculate based on tile size

const Ball = ({ball}) => {
	var x, y;
	if (ball.location) {
		x = ball.location.x;
		y = ball.location.y;
	} else {
		const location = pointInPlayground(ball.row, ball.column);
		const dest = applyDirection(ball);
		const destination = pointInPlayground(dest.row, dest.column);
		x = location.x + ball.progress * (destination.x - location.x) + X_SPACING / 2;
		y = location.y + ball.progress * (destination.y - location.y) + Y_SPACING / 2;
	}
  return (
    <g>
      <circle cx={x} cy={y} r={BALL_DIAMETER / 2} fill="rgb(255, 215, 0)" stroke="blue"/>
      <text x={x} y={y} fontSize={20} fontFamily="serif" textAnchor="middle" alignmentBaseline="middle">{ball.value}</text>
    </g>
  );
};
