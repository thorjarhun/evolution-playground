import React from 'react';
import { createDevTools } from 'redux-devtools';
import DockMonitor from 'redux-devtools-dock-monitor';
import LogMonitor from 'redux-devtools-log-monitor';
import InspectorMonitor from 'redux-devtools-inspector';

const DevTools = createDevTools(
  <DockMonitor defaultIsVisible
               toggleVisibilityKey='ctrl-h'
               changePositionKey='ctrl-q'
               changeMonitorKey='ctrl-m'>
    <InspectorMonitor />
    <LogMonitor theme='tomorrow' />
  </DockMonitor>
);

export default DevTools;
