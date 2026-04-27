import React from 'react'
import ReactDOM from 'react-dom/client'

import App from './App/App.tsx'
import { FAKE_LOAD_REACT_MS } from './constants.ts'
import { fakeLoadingDelay } from './fakeLoading.ts'
import './index.css'

window.plumeScale = 1

const mount = async () => {
  await fakeLoadingDelay(FAKE_LOAD_REACT_MS)

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

mount()
