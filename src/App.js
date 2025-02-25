// App.js
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Login from './Components/Login';
import Location from './Components/LocationSocket';

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));

  // Add this effect to listen for token changes
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    setToken(storedToken);
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={!token ? <Login setToken={setToken} /> : <Navigate to="/location" />} />
        <Route path="/location" element={token ? <Location /> : <Navigate to="/" />} />
        <Route path="*" element={<Navigate to={token ? "/location" : "/"} />} />
      </Routes>
    </Router>
  );
}

export default App;