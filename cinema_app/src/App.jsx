/*import Mainpage from './pages/Mainpage.jsx'


function App() {

  return(
    <div className="app-container">
      <Mainpage />
    </div>
  )
}

export default App*/

import { useUsers } from './modules/users/hooks/useUsers.js';

function App() {
  const { users, loading, error } = useUsers();

  if (loading) {
    return <p>Cargando usuarios...</p>;
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  return (
    <div>
      <h1>Usuarios</h1>

      <pre>
        {JSON.stringify(users, null, 2)}
      </pre>
    </div>
  );
}

export default App;
