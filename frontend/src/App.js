import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, Plus, Search, User, Clock, CheckCircle, XCircle, LogOut, Lock, FileText, Paperclip, ChevronDown, Building, Mail, Bell } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar } from 'recharts';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

function UserProfileDropdown({ user, onLogout, token, onUserUpdate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const dropdownRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await fetch(`${API_URL}/users/${user.id}/avatar`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        onUserUpdate({ avatar_url: data.avatar_url });
        alert('Avatar uploaded successfully!');
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Failed to upload avatar: ${errorData.error || response.statusText}`);
      }
    } catch (err) {
      alert(`Error uploading avatar: ${err.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = null;
    }
  };

  // Get initials for avatar
  const initials = user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  const avatarImage = user?.avatar_url ? `${API_URL.replace('/api', '')}${user.avatar_url}` : null;

  return (
    <div className="relative" ref={dropdownRef}>
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 focus:outline-none hover:bg-gray-100 p-1.5 rounded-lg transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm overflow-hidden relative group">
          {avatarImage ? (
            <img src={avatarImage} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-100 py-2 z-50">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center space-x-3">
            <div
              className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-lg overflow-hidden relative group cursor-pointer flex-shrink-0"
              onClick={() => fileInputRef.current?.click()}
              title="Change Photo"
            >
              {avatarImage ? (
                <img src={avatarImage} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              {!isUploading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 hidden group-hover:flex items-center justify-center">
                  <Plus className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-gray-900 truncate">{user.full_name}</p>
              <p className="text-sm text-gray-500 truncate">{user.email}</p>
            </div>
          </div>

          <div className="px-4 py-3 space-y-2">
            <div className="flex items-center text-sm text-gray-600">
              <User className="w-4 h-4 mr-3 text-gray-400" />
              <span className="capitalize">{user.role}</span>
            </div>
            {user.department && (
              <div className="flex items-center text-sm text-gray-600">
                <Building className="w-4 h-4 mr-3 text-gray-400" />
                <span>{user.department}</span>
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 pt-2 mt-2">
            <button
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors"
            >
              <LogOut className="w-4 h-4 mr-3" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationBell({ notifications, onMarkAsRead, onMarkAllAsRead, onViewTicket }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    setIsOpen(false);
    onViewTicket(notification.ticket_id);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 rounded-full focus:outline-none transition-colors"
      >
        <span className="sr-only">View notifications</span>
        <Bell className="h-6 w-6" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-50">
          <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={() => { onMarkAllAsRead(); setIsOpen(false); }}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Mark all as read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-sm text-center text-gray-500">
                No new notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div 
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${!notification.is_read ? 'bg-blue-50/50' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <p className={`text-sm ${!notification.is_read ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                      {notification.message}
                    </p>
                    {!notification.is_read && (
                      <span className="h-2 w-2 mt-1.5 ml-2 bg-blue-600 rounded-full flex-shrink-0"></span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(notification.created_at).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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

  const handleUserUpdate = (updatedUser) => {
    const newUser = { ...currentUser, ...updatedUser };
    localStorage.setItem('user', JSON.stringify(newUser));
    setCurrentUser(newUser);
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return <MainApp currentUser={currentUser} token={token} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />;
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

function MainApp({ currentUser, token, onLogout, onUserUpdate }) {
  const [view, setView] = useState('dashboard');
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [stats, setStats] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [filters, setFilters] = useState({ status: '', priority: '', category: '' });
  const [showPasswordReset, setShowPasswordReset] = useState(currentUser?.require_password_change || false);

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

  const fetchOrganizations = async () => {
    try {
      const response = await apiCall(`${API_URL}/organizations`);
      const data = await response.json();
      setOrganizations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
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

  const fetchNotifications = async () => {
    try {
      const response = await apiCall(`${API_URL}/notifications`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markNotificationAsRead = async (id) => {
    try {
      const response = await apiCall(`${API_URL}/notifications/${id}/read`, { method: 'PUT' });
      if (response.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      }
    } catch (error) {
      console.error('Error marking notification read:', error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      const response = await apiCall(`${API_URL}/notifications/read-all`, { method: 'PUT' });
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      }
    } catch (error) {
      console.error('Error marking all notifications read:', error);
    }
  };

  const handleViewTicketFromNotification = async (ticketId) => {
    await fetchTicketDetails(ticketId);
    setView('tickets');
  };

  // Idle Session Timeout (15 minutes = 900,000 ms)
  useEffect(() => {
    let timeoutId;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        onLogout();
      }, 900000);
    };

    // Track interactions during the capture phase
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, resetTimer, true);
    });

    // Initialize timer on mount
    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => {
        window.removeEventListener(event, resetTimer, true);
      });
    };
  }, [onLogout]);

  useEffect(() => {
    fetchUsers();
    fetchTickets();
    fetchStats();
    fetchOrganizations();
    fetchNotifications();

    // Poll for notifications every 30 seconds
    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);

    return () => clearInterval(interval);
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

  const deleteAttachment = async (ticketId, attachmentId) => {
    try {
      const response = await apiCall(`${API_URL}/tickets/${ticketId}/attachments/${attachmentId}`, {
        method: 'DELETE'
      });
      return response.ok;
    } catch (error) {
      console.error('Error deleting attachment:', error);
      return false;
    }
  };

  const uploadAttachments = async (ticketId, files) => {
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('attachments', file);
      });

      const response = await apiCall(`${API_URL}/tickets/${ticketId}/attachments`, {
        method: 'POST',
        body: formData
      });

      return response.ok;
    } catch (error) {
      console.error('Error uploading attachments:', error);
      return false;
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
                {currentUser.role === 'admin' && (
                  <>
                    <button
                      onClick={() => setView('users')}
                      className={`px-3 py-2 rounded-md ${view === 'users' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                      Users
                    </button>
                    <button
                      onClick={() => setView('it_support')}
                      className={`px-3 py-2 rounded-md ${view === 'it_support' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                      IT Support
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setView('create')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center mr-2"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Ticket
              </button>

              <div className="h-8 border-l border-gray-200 mx-2"></div>

              <NotificationBell 
                notifications={notifications}
                onMarkAsRead={markNotificationAsRead}
                onMarkAllAsRead={markAllNotificationsAsRead}
                onViewTicket={handleViewTicketFromNotification}
              />

              <div className="h-8 border-l border-gray-200 mx-2"></div>

              <UserProfileDropdown user={currentUser} onLogout={onLogout} token={token} onUserUpdate={onUserUpdate} />
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
            onDeleteAttachment={deleteAttachment}
            onUploadAttachments={uploadAttachments}
          />
        )}
        {view === 'users' && currentUser.role === 'admin' && (
          <UserManagement
            title="Standard Users"
            users={users.filter(u => u.role === 'user')}
            organizations={organizations}
            onOrgsChange={fetchOrganizations}
            onUsersChange={fetchUsers}
            token={token}
            defaultRole="user"
            currentUser={currentUser}
          />
        )}
        {view === 'it_support' && currentUser.role === 'admin' && (
          <UserManagement
            title="IT Support Staff"
            users={users.filter(u => u.role === 'admin' || u.role === 'support')}
            organizations={organizations}
            onOrgsChange={fetchOrganizations}
            onUsersChange={fetchUsers}
            token={token}
            defaultRole="support"
            currentUser={currentUser}
          />
        )}
      </main>

      {showPasswordReset && (
        <ForcePasswordReset
          token={token}
          onPasswordChanged={() => {
            setShowPasswordReset(false);
            onUserUpdate({ require_password_change: false });
          }}
        />
      )}
    </div>
  );
}

function Dashboard({ stats }) {
  const getPriorityColor = (priority) => {
    const colors = {
      Low: 'mt-1 px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800',
      Medium: 'mt-1 px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800',
      High: 'mt-1 px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800',
      Critical: 'mt-1 px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800'
    };
    return colors[priority] || 'mt-1 px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status) => {
    const colors = {
      Open: 'mt-1 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800',
      'In Progress': 'mt-1 px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800',
      Resolved: 'mt-1 px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800',
      Closed: 'mt-1 px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800'
    };
    return colors[status] || 'mt-1 px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800';
  };

  const COLORS = ['#10B981', '#F59E0B', '#F97316', '#EF4444'];
  const CATEGORY_COLORS = ['#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#64748B'];

  // PostgreSQL COUNT returns a string. We must convert it to a Number for Recharts to calculate pie slices.
  const priorityData = (stats.priority_stats || []).map(item => ({
    ...item,
    value: Number(item.value)
  }));

  const categoryData = (stats.category_stats || []).map(item => ({
    ...item,
    value: Number(item.value)
  }));

  const resolutionData = [
    { name: 'Remote Support', value: Number(stats.remote_resolutions) || 0, fill: '#8B5CF6' }, // Purple
    { name: 'On-Site Visit', value: Number(stats.onsite_resolutions) || 0, fill: '#10B981' }   // Green
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
        <span className="text-sm text-gray-500">Last updated: {new Date().toLocaleTimeString()}</span>
      </div>

      {/* Value Counter Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Tickets" value={stats.total_tickets || 0} icon={<AlertCircle className="w-8 h-8 text-blue-600" />} />
        <StatCard title="Open Tickets" value={stats.open_tickets || 0} icon={<Clock className="w-8 h-8 text-green-600" />} />
        <StatCard title="In Progress" value={stats.in_progress_tickets || 0} icon={<User className="w-8 h-8 text-yellow-600" />} />
        <StatCard title="Resolved" value={stats.resolved_tickets || 0} icon={<CheckCircle className="w-8 h-8 text-purple-600" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket Volume Line Chart */}
        <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Ticket Volume (Last 7 Days)</h3>
          <div className="h-72">
            {stats.volume_stats && stats.volume_stats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.volume_stats} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} allowDecimals={false} />
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Line type="monotone" dataKey="tickets" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">No data available</div>
            )}
          </div>
        </div>

        {/* Priority Breakdown Pie Chart */}
        <div className="bg-white rounded-lg shadow p-6 lg:col-span-1 flex flex-col">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Active by Priority</h3>
          <div className="flex-1 min-h-[300px]">
            {stats.priority_stats && stats.priority_stats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">No active tickets</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tickets Activity Feed */}
        <div className="bg-white rounded-lg shadow lg:col-span-2 flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Recent Activity</h3>
          </div>
          <div className="divide-y divide-gray-200 overflow-y-auto" style={{ maxHeight: '330px' }}>
            {stats.recent_tickets && stats.recent_tickets.length > 0 ? (
              stats.recent_tickets.map((ticket) => (
                <div key={ticket.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-blue-600 mb-1">{ticket.ticket_number}</span>
                      <span className="text-base text-gray-900 font-medium">{ticket.title}</span>
                      <span className="text-sm text-gray-500 mt-1">Reported by {ticket.creator_name}</span>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <span className={getStatusColor(ticket.status)}>
                        {ticket.status}
                      </span>
                      <span className={getPriorityColor(ticket.priority)}>
                        {ticket.priority}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-8 text-center text-gray-500">No recent tickets</div>
            )}
          </div>
        </div>

        {/* Category Breakdown (Custom Progress Bars) */}
        <div className="bg-white rounded-lg shadow p-6 lg:col-span-1 flex flex-col">
          <h3 className="text-lg font-semibold text-gray-800 mb-6 border-b pb-3">Active by Category</h3>
          <div className="flex-1 flex flex-col space-y-5 justify-center px-2">
            {categoryData && categoryData.length > 0 ? (
              (() => {
                const maxCategoryValue = Math.max(...categoryData.map(c => c.value));
                return categoryData.map((entry, index) => {
                  const percentage = maxCategoryValue === 0 ? 0 : (entry.value / maxCategoryValue) * 100;
                  const colorIndex = index % CATEGORY_COLORS.length;
                  const barColor = CATEGORY_COLORS[colorIndex];

                  return (
                    <div key={`cat-${index}`} className="w-full">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700">{entry.name}</span>
                        <span className="text-sm font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-full">{entry.value}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="h-2.5 rounded-full shadow-inner transition-all duration-1000 ease-out"
                          style={{ width: `${percentage}%`, backgroundColor: barColor }}
                        ></div>
                      </div>
                    </div>
                  );
                });
              })()
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">No active tickets</div>
            )}
          </div>
        </div>

        {/* Resolution Method Breakdown */}
        <div className="bg-white rounded-lg shadow p-6 lg:col-span-1 flex flex-col">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Resolution Methods</h3>
          <div className="flex-1 min-h-[300px]">
            {resolutionData && resolutionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={resolutionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={0}
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={true}
                  >
                    {resolutionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">No resolutions recorded</div>
            )}
          </div>
        </div>
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

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Ticket #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Priority</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Resolution</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Created By</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Department</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Assigned To</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Creation Date</th>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {ticket.resolution_method && ticket.resolution_method !== 'Pending' ? (
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${ticket.resolution_method === 'Remote Support' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                        {ticket.resolution_method}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
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
                    {ticket.creator_department || 'Other'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {ticket.assignee_name ? (
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{ticket.assignee_name}</span>
                        <span className="text-xs text-gray-500 mt-1">Updated {new Date(ticket.updated_at).toLocaleDateString()}</span>
                      </div>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">Unassigned</span>
                    )}
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
    const newFiles = Array.from(e.target.files);
    setFormData({ ...formData, attachments: [...formData.attachments, ...newFiles] });
    e.target.value = null; // allow re-selecting the same file if needed
  };

  const removeAttachment = (indexToRemove) => {
    setFormData({
      ...formData,
      attachments: formData.attachments.filter((_, index) => index !== indexToRemove)
    });
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

          {formData.attachments && formData.attachments.length > 0 && (
            <div className="mt-4 space-y-2">
              {formData.attachments.map((file, index) => (
                <div key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-200">
                  <span className="text-sm truncate mr-4 text-gray-700 font-medium">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    className="text-red-500 hover:text-red-700 transition"
                    title="Remove file"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
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

function TicketDetail({ ticket, users, currentUser, onClose, onUpdate, onAddComment, onRefresh, getPriorityColor, getStatusColor, onDeleteAttachment, onUploadAttachments }) {
  const [status, setStatus] = useState(ticket.status);
  const [assignedTo, setAssignedTo] = useState(ticket.assigned_to || '');
  const [resolutionMethod, setResolutionMethod] = useState(ticket.resolution_method || 'Pending');
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpdate = () => {
    onUpdate(ticket.id, {
      status,
      assigned_to: assignedTo || null,
      resolution_method: resolutionMethod
    });
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

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsUploading(true);
    const success = await onUploadAttachments(ticket.id, files);
    if (success) {
      await onRefresh(ticket.id);
    }
    setIsUploading(false);
    e.target.value = null; // reset input
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (!window.confirm('Are you sure you want to permanently delete this attachment?')) return;
    const success = await onDeleteAttachment(ticket.id, attachmentId);
    if (success) {
      await onRefresh(ticket.id);
    }
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
                  disabled={currentUser.role === 'user'}
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
              {(currentUser.role === 'admin' || currentUser.role === 'support') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Assign To</label>
                    <select
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      className="w-full border rounded-md px-3 py-2"
                    >
                      <option value="">Unassigned</option>
                      {users.filter(user => user.role === 'admin' || user.role === 'support').map(user => (
                        <option key={user.id} value={user.id}>{user.full_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Resolution Method</label>
                    <select
                      value={resolutionMethod}
                      onChange={(e) => setResolutionMethod(e.target.value)}
                      className="w-full border rounded-md px-3 py-2"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Remote Support">Remote Support</option>
                      <option value="On-Site Visit">On-Site Visit</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          )}

          {!canEdit && (
            <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded">
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <span className={`inline-block mt-1 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
                  {ticket.status}
                </span>
              </div>
              {ticket.assignee_name && (
                <div>
                  <p className="text-sm text-gray-600">Assigned To</p>
                  <p className="font-medium mt-1">{ticket.assignee_name}</p>
                </div>
              )}
              {ticket.resolution_method && ticket.resolution_method !== 'Pending' && (
                <div>
                  <p className="text-sm text-gray-600">Resolution</p>
                  <span className={`inline-block mt-1 px-2 py-1 text-xs font-semibold rounded-full ${ticket.resolution_method === 'Remote Support' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                    {ticket.resolution_method}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Description</h3>
            <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded">{ticket.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
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
              <div>
                <p className="text-sm text-gray-600">Assigned To</p>
                <p className="font-medium mt-1">
                  {ticket.assignee_name ? (
                    <span className="text-blue-600">{ticket.assignee_name}</span>
                  ) : (
                    <span className="text-gray-400 italic">Unassigned</span>
                  )}
                </p>
              </div>
            </div>

            <div className="space-y-3 bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-sm text-blue-900 mb-3">Ticket Timeline</h4>

              {/* Created At - Always shows */}
              <div className="flex items-start">
                <div className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-green-500"></div>
                <div className="ml-3 flex-1">
                  <p className="text-xs font-medium text-gray-700">Created At</p>
                  <p className="text-sm font-semibold mt-0.5">
                    {new Date(ticket.created_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              {/* Assigned At */}
              <div className="flex items-start">
                <div className={`flex-shrink-0 w-2 h-2 mt-1.5 rounded-full ${ticket.assigned_to ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                <div className="ml-3 flex-1">
                  <p className="text-xs font-medium text-gray-700">Assigned At</p>
                  {ticket.assigned_to ? (
                    <>
                      <p className="text-sm font-semibold mt-0.5">
                        {new Date(ticket.updated_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">to {ticket.assignee_name}</p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400 italic mt-0.5">Not assigned yet</p>
                  )}
                </div>
              </div>

              {/* Resolved At */}
              <div className="flex items-start">
                <div className={`flex-shrink-0 w-2 h-2 mt-1.5 rounded-full ${ticket.resolved_at && ticket.status === 'Resolved' ? 'bg-purple-500' : 'bg-gray-300'}`}></div>
                <div className="ml-3 flex-1">
                  <p className="text-xs font-medium text-gray-700">Resolved At</p>
                  {ticket.resolved_at && ticket.status === 'Resolved' ? (
                    <p className="text-sm font-semibold mt-0.5">
                      {new Date(ticket.resolved_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  ) : ticket.status === 'Closed' && ticket.resolved_at ? (
                    <p className="text-sm font-semibold mt-0.5">
                      {new Date(ticket.resolved_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 italic mt-0.5">
                      {ticket.status === 'Open' ? 'Not started yet' : 'In progress...'}
                    </p>
                  )}
                </div>
              </div>

              {/* Closed At */}
              <div className="flex items-start">
                <div className={`flex-shrink-0 w-2 h-2 mt-1.5 rounded-full ${ticket.status === 'Closed' && ticket.resolved_at ? 'bg-red-500' : 'bg-gray-300'}`}></div>
                <div className="ml-3 flex-1">
                  <p className="text-xs font-medium text-gray-700">Closed At</p>
                  {ticket.status === 'Closed' && ticket.resolved_at ? (
                    <p className="text-sm font-semibold mt-0.5">
                      {new Date(ticket.resolved_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 italic mt-0.5">Not closed yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {(ticket.attachments && ticket.attachments.length > 0 || canEdit) && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold">Attachments</h3>
                {canEdit && (
                  <div>
                    <input
                      type="file"
                      id="upload-more"
                      multiple
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                    <label
                      htmlFor="upload-more"
                      className={`cursor-pointer px-3 py-1.5 rounded text-sm font-medium transition inline-flex items-center ${isUploading ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                    >
                      {isUploading ? 'Uploading...' : '+ Upload Files'}
                    </label>
                  </div>
                )}
              </div>

              {ticket.attachments && ticket.attachments.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ticket.attachments.map(attachment => {
                    const safePath = attachment.filepath.replace(/\\/g, '/');
                    const fileUrl = `http://${window.location.hostname}:3000/${safePath}`;
                    const isImage = attachment.filename.match(/\.(jpg|jpeg|png|gif|webp)$/i);

                    return (
                      <div key={attachment.id} className="border border-gray-200 rounded-lg overflow-hidden group hover:shadow-md transition-shadow relative">
                        {(currentUser.role === 'admin' || (currentUser.role === 'user' && ticket.created_by === currentUser.id)) && (
                          <button
                            onClick={() => handleDeleteAttachment(attachment.id)}
                            className="absolute z-10 top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 shadow-sm hover:bg-red-600 transition"
                            title="Delete attachment"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}

                        {isImage ? (
                          <div className="h-40 bg-gray-100 flex items-center justify-center overflow-hidden">
                            <img
                              src={fileUrl}
                              alt={attachment.filename}
                              className="object-contain w-full h-full"
                            />
                          </div>
                        ) : (
                          <div className="h-40 bg-gray-50 flex flex-col items-center justify-center p-4">
                            <div className="bg-blue-100 p-3 rounded-full mb-2">
                              <span className="text-blue-600 font-bold uppercase">{attachment.filename.split('.').pop()}</span>
                            </div>
                            <p className="text-xs text-center text-gray-500 truncate w-full">{attachment.filename}</p>
                          </div>
                        )}

                        <div className="bg-white p-3 border-t border-gray-100 flex justify-between items-center relative z-0">
                          <span className="text-xs font-medium text-gray-700 truncate mr-2" title={attachment.filename}>
                            {attachment.filename}
                          </span>
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white bg-blue-600 hover:bg-blue-700 text-xs px-3 py-1.5 rounded transition-colors flex-shrink-0 relative z-20"
                          >
                            Download
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic border border-dashed rounded p-4 text-center">No attachments yet.</p>
              )}
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
            {(currentUser.role === 'admin' || currentUser.role === 'support') && (
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

function ForcePasswordReset({ onPasswordChanged, token }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const criteria = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
    symbol: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword)
  };

  const isValid = Object.values(criteria).every(Boolean) && newPassword === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) {
      setError('Please meet all password criteria');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await response.json();
      if (response.ok) {
        onPasswordChanged();
      } else {
        setError(data.error || 'Failed to change password');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-95 flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="bg-orange-100 text-orange-600 p-3 rounded-full inline-block mb-3">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Password Update Required</h2>
          <p className="text-sm text-gray-500 mt-2">
            For security reasons, you must change your password before continuing.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
            />
          </div>

          <div className="bg-gray-50 p-3 rounded text-xs space-y-1">
            <p className="font-semibold text-gray-700 mb-2">Password Requirements:</p>
            <p className={criteria.length ? "text-green-600" : "text-gray-500"}>
              {criteria.length ? "✓" : "○"} At least 8 characters
            </p>
            <p className={criteria.uppercase ? "text-green-600" : "text-gray-500"}>
              {criteria.uppercase ? "✓" : "○"} One uppercase letter
            </p>
            <p className={criteria.lowercase ? "text-green-600" : "text-gray-500"}>
              {criteria.lowercase ? "✓" : "○"} One lowercase letter
            </p>
            <p className={criteria.number ? "text-green-600" : "text-gray-500"}>
              {criteria.number ? "✓" : "○"} One number
            </p>
            <p className={criteria.symbol ? "text-green-600" : "text-gray-500"}>
              {criteria.symbol ? "✓" : "○"} One special character
            </p>
            <p className={newPassword && newPassword === confirmPassword ? "text-green-600" : "text-gray-500"}>
              {newPassword && newPassword === confirmPassword ? "✓" : "○"} Passwords match
            </p>
          </div>

          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

          <button
            type="submit"
            disabled={!isValid || isLoading}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 font-medium disabled:bg-gray-400 mt-4"
          >
            {isLoading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

function UserManagement({ title = "User Management", users, organizations = [], onOrgsChange, onUsersChange, token, defaultRole = 'user', currentUser }) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);

  // If the admin is a Local Admin, default to their own organization
  const defaultOrgId = currentUser?.organization_id || '';
  const [formData, setFormData] = useState({ username: '', email: '', full_name: '', department: '', role: defaultRole, organization_id: defaultOrgId });

  const isLocalAdmin = false; // Admins always act globally for user management now

  const resetForm = () => {
    setFormData({ username: '', email: '', full_name: '', department: '', role: defaultRole, organization_id: defaultOrgId });
    setIsCreating(false);
    setEditingUserId(null);
  };

  const handleEditUserClick = (user) => {
    setFormData({
      username: user.username,
      email: user.email,
      full_name: user.full_name,
      department: user.department,
      role: user.role,
      organization_id: user.organization_id || ''
    });
    setEditingUserId(user.id);
    setIsCreating(true);
  };

  const handleCreateOrg = async () => {
    const orgName = window.prompt("Enter the name of the new Organization:");
    if (!orgName) return;

    try {
      const response = await fetch(`${API_URL}/organizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: orgName })
      });
      if (response.ok) {
        if (onOrgsChange) await onOrgsChange();
        const newOrg = await response.json();
        setFormData(prev => ({ ...prev, organization_id: newOrg.id }));
      } else {
        alert("Failed to create organization");
      }
    } catch (err) {
      alert("Error creating organization");
    }
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      const url = editingUserId ? `${API_URL}/users/${editingUserId}` : `${API_URL}/users`;
      const method = editingUserId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        resetForm();
        onUsersChange(); // Refresh users
        alert(`User ${editingUserId ? 'updated' : 'created'} successfully!`);
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Failed to ${editingUserId ? 'update' : 'create'} user: ${errorData.error || response.statusText}`);
      }
    } catch (err) {
      alert(`Error ${editingUserId ? 'updating' : 'creating'} user: ${err.message}`);
    }
  };

  const handleResetPassword = async (userId) => {
    if (!window.confirm("Reset this user's password to default? They will be forced to change it on their next login.")) return;
    try {
      const response = await fetch(`${API_URL}/users/${userId}/reset-password`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        alert('Password reset successfully to default: Welcome123!');
      }
    } catch (err) {
      alert('Error resetting password');
    }
  };

  const handleUnlockUser = async (user) => {
    if (!window.confirm(`Are you sure you want to unlock the account for ${user.full_name}?`)) return;
    try {
      const response = await fetch(`${API_URL}/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          ...user,
          is_locked: false
        })
      });
      if (response.ok) {
        onUsersChange(); // Refresh users list
      } else {
        alert('Failed to unlock user.');
      }
    } catch (err) {
      alert('Error unlocking user');
    }
  };

  const handleToggleActive = async (user) => {
    const newStatus = !user.is_active;
    const actionText = newStatus ? 'Enable' : 'Disable';
    try {
      const response = await fetch(`${API_URL}/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          ...user,
          is_active: newStatus
        })
      });
      if (response.ok) {
        onUsersChange(); // Refresh users list
      } else {
        alert(`Failed to ${actionText.toLowerCase()} user.`);
      }
    } catch (err) {
      alert(`Error ${actionText.toLowerCase()} user`);
    }
  };

  const handleDeleteUser = async (targetUser) => {
    if (targetUser.id === users.find(u => u.username === targetUser.username)?.id && targetUser.role === 'admin') {
      // Just a small safety, backend handles own deletion
    }
    if (!window.confirm(`WARNING: Are you absolutely sure you want to PERMANENTLY delete the account for ${targetUser.full_name}? This action cannot be undone.`)) return;

    try {
      const response = await fetch(`${API_URL}/users/${targetUser.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        onUsersChange(); // Refresh users list
      } else {
        const errorData = await response.json();
        alert(`Failed to delete user: ${errorData.error || 'Server error'}`);
      }
    } catch (err) {
      alert('Error deleting user');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{title}</h2>
        <button onClick={() => { resetForm(); setIsCreating(true); }} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center">
          <Plus className="w-4 h-4 mr-2" /> Add {title.includes('IT Support') ? 'Staff' : 'User'}
        </button>
      </div>

      {isCreating && (
        <div className="bg-white p-6 rounded-lg shadow-md border mb-6">
          <h3 className="text-lg font-semibold mb-4">{editingUserId ? 'Edit Account' : 'Create New Account'}</h3>
          <form onSubmit={handleSaveUser} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <input type="text" required value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} className="w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <input type="text" required value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Department</label>
              <input type="text" required value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} className="w-full border rounded p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full border rounded p-2">
                <option value="user">User</option>
                <option value="support">Support</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {!isLocalAdmin && (
              <div>
                <label className="block text-sm font-medium mb-1">Organization</label>
                <div className="flex space-x-2">
                  <select value={formData.organization_id} onChange={(e) => setFormData({ ...formData, organization_id: e.target.value })} className="flex-1 border rounded p-2">
                    <option value="">None / Global</option>
                    {organizations.map(org => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                  <button type="button" onClick={handleCreateOrg} className="px-3 bg-green-600 text-white rounded hover:bg-green-700 font-medium whitespace-nowrap">
                    + New
                  </button>
                </div>
              </div>
            )}

            {isLocalAdmin && (
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-500">Organization (Locked to Admin Area)</label>
                <input type="text" disabled value={organizations.find(o => o.id === formData.organization_id)?.name || 'Your Organization'} className="w-full border rounded p-2 bg-gray-100 text-gray-500 cursor-not-allowed" />
              </div>
            )}
            <div className="col-span-2 flex justify-end space-x-3 mt-4">
              <button type="button" onClick={resetForm} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">{editingUserId ? 'Update Account' : 'Create Account'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organization</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map(user => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3 overflow-hidden text-blue-600 font-semibold flex-shrink-0">
                      {user.avatar_url ? (
                        <img src={`${API_URL.replace('/api', '')}${user.avatar_url}`} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 flex items-center">
                        {user.full_name}
                        {user.is_locked && (
                          <span className="ml-2 px-2 inline-flex text-[10px] leading-4 font-bold rounded-full bg-red-100 text-red-800 uppercase tracking-wider">
                            Locked
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : user.role === 'support' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {organizations.find(o => o.id === user.organization_id)?.name || <span className="text-gray-400 italic">None</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.department}</td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <button
                    onClick={() => handleToggleActive(user)}
                    className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none ${user.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${user.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <div className={`text-[10px] font-medium mt-1 ${user.is_active ? 'text-green-600' : 'text-gray-500'}`}>
                    {user.is_active ? 'ACTIVE' : 'DISABLED'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                  <button onClick={() => handleEditUserClick(user)} className="text-blue-600 hover:text-blue-900 border border-blue-200 bg-blue-50 px-3 py-1 rounded text-xs transition-colors mb-1 mr-1">
                    Edit
                  </button>
                  <button onClick={() => handleResetPassword(user.id)} className="text-orange-600 hover:text-orange-900 border border-orange-200 bg-orange-50 px-3 py-1 rounded text-xs transition-colors mb-1 mr-1">
                    Reset Password
                  </button>
                  {user.is_locked && (
                    <button onClick={() => handleUnlockUser(user)} className="text-green-600 hover:text-green-900 border border-green-200 bg-green-50 px-3 py-1 rounded text-xs transition-colors mb-1 mr-1 font-bold">
                      Unlock
                    </button>
                  )}
                  <button onClick={() => handleDeleteUser(user)} className="text-red-600 hover:text-red-900 border border-red-200 bg-red-50 px-3 py-1 rounded text-xs transition-colors mb-1">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}