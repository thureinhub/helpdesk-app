import React, { useState, useEffect } from 'react';
import { AlertCircle, Plus, Search, User, Clock, CheckCircle, XCircle, LogOut, Lock } from 'lucide-react';

const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api' 
  : `http://${window.location.hostname}:3000/api`;

export default function HelpDeskApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setCurrentUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setToken(token);
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return <MainApp currentUser={currentUser} token={token} onLogout={handleLogout} />;
}

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        onLogin(data.token, data.user);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-full">
              <Lock className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">HelpDesk</h1>
          <p className="text-gray-600 mt-2">IT Service Desk Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 font-medium disabled:bg-gray-400"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            Default credentials for testing:
          </p>
          <div className="mt-3 text-xs text-gray-500 space-y-1">
            <p><strong>Admin:</strong> admin / password123</p>
            <p><strong>Support:</strong> john.doe / password123</p>
            <p><strong>User:</strong> jane.smith / password123</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MainApp({ currentUser, token, onLogout }) {
  const [view, setView] = useState('dashboard');
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [filters, setFilters] = useState({ status: '', priority: '', category: '' });

  const apiCall = async (url, options = {}) => {
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };

    const response = await fetch(url, { ...options, headers });
    
    if (response.status === 401 || response.status === 403) {
      onLogout();
      throw new Error('Session expired');
    }

    return response;
  };

  const fetchUsers = async () => {
    try {
      const response = await apiCall(`${API_URL}/users`);
      const data = await response.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchTickets = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.category) params.append('category', filters.category);
      
      const response = await apiCall(`${API_URL}/tickets?${params}`);
      const data = await response.json();
      setTickets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiCall(`${API_URL}/dashboard/stats`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchTickets();
    fetchStats();
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [filters]);

  const createTicket = async (ticketData) => {
    try {
      const formData = new FormData();
      Object.keys(ticketData).forEach(key => {
        if (key !== 'attachments') {
          formData.append(key, ticketData[key]);
        }
      });
      
      if (ticketData.attachments) {
        ticketData.attachments.forEach(file => {
          formData.append('attachments', file);
        });
      }

      const response = await apiCall(`${API_URL}/tickets`, {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        fetchTickets();
        fetchStats();
        setView('tickets');
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
    }
  };

  const updateTicket = async (id, updates) => {
    try {
      const response = await apiCall(`${API_URL}/tickets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (response.ok) {
        fetchTickets();
        fetchStats();
      }
    } catch (error) {
      console.error('Error updating ticket:', error);
    }
  };

  const addComment = async (ticketId, comment) => {
    try {
      const response = await apiCall(`${API_URL}/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment }),
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error adding comment:', error);
      return false;
    }
  };

  const fetchTicketDetails = async (ticketId) => {
    try {
      const response = await apiCall(`${API_URL}/tickets/${ticketId}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedTicket(data);
      }
    } catch (error) {
      console.error('Error fetching ticket details:', error);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      Low: 'bg-blue-100 text-blue-800',
      Medium: 'bg-yellow-100 text-yellow-800',
      High: 'bg-orange-100 text-orange-800',
      Critical: 'bg-red-100 text-red-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status) => {
    const colors = {
      Open: 'bg-green-100 text-green-800',
      'In Progress': 'bg-blue-100 text-blue-800',
      Resolved: 'bg-purple-100 text-purple-800',
      Closed: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-8">
              <h1 className="text-2xl font-bold text-blue-600">HelpDesk</h1>
              <div className="flex space-x-4">
                <button
                  onClick={() => setView('dashboard')}
                  className={`px-3 py-2 rounded-md ${view === 'dashboard' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setView('tickets')}
                  className={`px-3 py-2 rounded-md ${view === 'tickets' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  Tickets
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{currentUser.full_name}</span>
                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {currentUser.role}
                </span>
              </div>
              <button
                onClick={() => setView('create')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Ticket
              </button>
              <button
                onClick={onLogout}
                className="text-gray-600 hover:text-gray-800 p-2"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === 'dashboard' && <Dashboard stats={stats} />}
        {view === 'tickets' && (
          <TicketList
            tickets={tickets}
            filters={filters}
            setFilters={setFilters}
            onTicketClick={fetchTicketDetails}
            getPriorityColor={getPriorityColor}
            getStatusColor={getStatusColor}
          />
        )}
        {view === 'create' && (
          <CreateTicket
            onSubmit={createTicket}
            onCancel={() => setView('tickets')}
          />
        )}
        {selectedTicket && (
          <TicketDetail
            ticket={selectedTicket}
            users={users}
            currentUser={currentUser}
            onClose={() => setSelectedTicket(null)}
            onUpdate={updateTicket}
            onAddComment={addComment}
            onRefresh={fetchTicketDetails}
            getPriorityColor={getPriorityColor}
            getStatusColor={getStatusColor}
          />
        )}
      </main>
    </div>
  );
}

function Dashboard({ stats }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Tickets" value={stats.total_tickets || 0} icon={<AlertCircle className="w-8 h-8 text-blue-600" />} />
        <StatCard title="Open Tickets" value={stats.open_tickets || 0} icon={<Clock className="w-8 h-8 text-green-600" />} />
        <StatCard title="In Progress" value={stats.in_progress_tickets || 0} icon={<User className="w-8 h-8 text-yellow-600" />} />
        <StatCard title="Resolved" value={stats.resolved_tickets || 0} icon={<CheckCircle className="w-8 h-8 text-purple-600" />} />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
        </div>
        <div>{icon}</div>
      </div>
    </div>
  );
}

function TicketList({ tickets, filters, setFilters, onTicketClick, getPriorityColor, getStatusColor }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTickets = tickets.filter(ticket => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      ticket.ticket_number.toLowerCase().includes(search) ||
      ticket.title.toLowerCase().includes(search) ||
      (ticket.description && ticket.description.toLowerCase().includes(search)) ||
      (ticket.creator_name && ticket.creator_name.toLowerCase().includes(search))
    );
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Tickets</h2>
        <div className="flex space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border rounded-md pl-10 pr-3 py-2 w-64"
            />
          </div>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="border rounded-md px-3 py-2"
          >
            <option value="">All Status</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
          <select
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            className="border rounded-md px-3 py-2"
          >
            <option value="">All Priority</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ticket #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created By</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTickets.length > 0 ? (
              filteredTickets.map(ticket => (
                <tr
                  key={ticket.id}
                  onClick={() => onTicketClick(ticket.id)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                    {ticket.ticket_number}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{ticket.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {ticket.creator_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                  No tickets found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CreateTicket({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    category: 'Other',
    attachments: []
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, attachments: Array.from(e.target.files) });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">Create New Ticket</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full border rounded-md px-3 py-2"
            placeholder="Brief description of the issue"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            required
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={6}
            className="w-full border rounded-md px-3 py-2"
            placeholder="Detailed description of the issue..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="Hardware">Hardware</option>
              <option value="Software">Software</option>
              <option value="Network">Network</option>
              <option value="Access">Access</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Attachments</label>
          <input
            type="file"
            multiple
            onChange={handleFileChange}
            className="w-full border rounded-md px-3 py-2"
            accept="image/*,.pdf,.doc,.docx,.txt"
          />
          <p className="text-sm text-gray-500 mt-1">Max 5 files, 10MB each</p>
        </div>

        <div className="flex space-x-4">
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
          >
            Create Ticket
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-200 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function TicketDetail({ ticket, users, currentUser, onClose, onUpdate, onAddComment, onRefresh, getPriorityColor, getStatusColor }) {
  const [status, setStatus] = useState(ticket.status);
  const [assignedTo, setAssignedTo] = useState(ticket.assigned_to || '');
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);

  const handleUpdate = () => {
    onUpdate(ticket.id, { status, assigned_to: assignedTo || null });
    onClose();
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    setIsAddingComment(true);
    const success = await onAddComment(ticket.id, newComment);
    if (success) {
      setNewComment('');
      await onRefresh(ticket.id);
    }
    setIsAddingComment(false);
  };

  const canEdit = currentUser.role === 'admin' || currentUser.role === 'support' || ticket.created_by === currentUser.id;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold">{ticket.ticket_number}</h2>
              <p className="text-gray-600 mt-1">{ticket.title}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          {canEdit && (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assign To</label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="">Unassigned</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>{user.full_name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Description</h3>
            <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded">{ticket.description}</p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-600">Priority</p>
              <span className={`inline-block mt-1 px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(ticket.priority)}`}>
                {ticket.priority}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-600">Category</p>
              <p className="font-medium mt-1">{ticket.category}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Created By</p>
              <p className="font-medium mt-1">{ticket.creator_name}</p>
            </div>
          </div>

          {ticket.attachments && ticket.attachments.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Attachments</h3>
              <div className="space-y-2">
                {ticket.attachments.map(attachment => (
                  <div key={attachment.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                    <span className="text-sm">{attachment.filename}</span>
                    <a
                      href={`http://${window.location.hostname}:3000/${attachment.filepath}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Download
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-6 border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Comments ({ticket.comments?.length || 0})</h3>
            
            <div className="space-y-4 mb-4 max-h-60 overflow-y-auto">
              {ticket.comments && ticket.comments.length > 0 ? (
                ticket.comments.map(comment => (
                  <div key={comment.id} className="bg-gray-50 p-4 rounded">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-sm">{comment.user_name}</span>
                      <span className="text-xs text-gray-500">
                        {new Date(comment.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm">{comment.comment}</p>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm italic">No comments yet</p>
              )}
            </div>

            <div className="space-y-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
              <button
                onClick={handleAddComment}
                disabled={isAddingComment || !newComment.trim()}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 text-sm disabled:bg-gray-300"
              >
                {isAddingComment ? 'Adding...' : 'Add Comment'}
              </button>
            </div>
          </div>

          <div className="flex space-x-4 border-t pt-4">
            {canEdit && (
              <button
                onClick={handleUpdate}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
              >
                Update Ticket
              </button>
            )}
            <button
              onClick={onClose}
              className="bg-gray-200 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}