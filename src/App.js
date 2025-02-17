import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Components/Login';
import Location from './Components/LocationSocket';

function App() {
  const token = localStorage.getItem("token");

  return (
    <Router>
      <Routes>
        <Route path="/" element={!token ? <Login /> : <Navigate to="/location" />} />

        <Route path="/location" element={token ? <Location /> : <Navigate to="/" />} />

        <Route path="*" element={<Navigate to={token ? "/location" : "/"} />} />
      </Routes>
    </Router>
  );
}

export default App;
