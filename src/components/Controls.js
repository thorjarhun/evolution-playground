import React from 'react';
import cn from 'classnames';
import { connect } from 'react-redux';
import { toggleAutoplay, tick, reset } from '../actions/controls';

export default connect(
    state => ({ profiler: state.profiler, now: Date.now() }),
    dispatch => ({
      reset: () => dispatch(reset()),
      tick: () => dispatch(tick()),
      toggleAutoplay: () => dispatch(toggleAutoplay(Date.now()))
    })
)(({profiler, now, reset, tick, toggleAutoplay}) =>
    <div className='grid-controls'>
      <div className='btn-group' role='group'>
        <button className='btn btn-danger' onClick={reset}>
          RESET
        </button>
        <button className='btn btn-default' disabled={!!profiler.startedAt} onClick={tick}>
          <i className='fa fa-fast-forward fa-lg'/> NEXT
        </button>
        <ToggleButton label='AUTO' on={profiler.startedAt} onClick={toggleAutoplay}/>
      </div>
      {
        profiler.startedAt &&
        <div className='text-muted'>
          {`${calculateFrameRate(profiler.ticks + 1, profiler.startedAt, now)} fps`}
        </div>
      }
    </div>
);

const calculateFrameRate = (ticks, startedAt, now) =>
	startedAt
		? Math.ceil(ticks / ((now - startedAt) / 1000))
		: null;

const ToggleButton = ({
    on,
    label,
    onClass = 'fa-pause',
    offClass = 'fa-play',
    onClick=() => null
}) =>
    <label htmlFor='autoplay' className={cn('btn', 'btn-default', { 'active': on })}>
      <i className={cn('fa', 'fa-lg', {
      'active': on,
      [onClass]: on,
      [offClass]: !on
    })}/>
      <input
          id='autoplay'
          style={{ display: 'none' }}
          type='checkbox'
          onChange={onClick}/> {label}
    </label>;
