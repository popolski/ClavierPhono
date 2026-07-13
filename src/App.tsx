import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Home } from './routes/Home'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
