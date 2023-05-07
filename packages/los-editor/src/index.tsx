import { EditorApp } from '@faery/editor';
import { initDebugFlags, initLogging } from '@faery/common';
import './global.css';
import { render } from 'solid-js/web';

initLogging();
initDebugFlags();
render(() => <EditorApp />, document.getElementById('root')!);
