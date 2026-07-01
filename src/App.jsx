import { useState } from "react";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Agents from "./pages/Agents.jsx";
import Operations from "./pages/Operations.jsx";

export default function App() {
  const [user, setUser] = useState(null);
  const [rows, setRows] = useState([]);

  if (!user) return <Login onLogin={setUser} />;

  const token = localStorage.getItem("token");
  const username = user?.username || "user";

  return (
    <Dashboard
      user={user}
      rows={rows}
      setRows={setRows}
      onLogout={() => {
        setUser(null);
        setRows([]);
      }}
      AgentsPage={<Agents token={token} username={username} />}
      OperationsPage={<Operations token={token} />}
    />
  );
}
