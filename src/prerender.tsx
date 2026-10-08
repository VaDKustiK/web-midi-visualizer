import { renderToString } from 'react-dom/server';
import App from './App';

// Render the same initial UI as the browser. Effects (audio, canvas, uploads) run only after hydration.
export function render() {
  return renderToString(<App />);
}
