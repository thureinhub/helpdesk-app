require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const { hashPassword, verifyPassword } = require('./passwordUtils');
const { generateToken, authenticateToken, authorizeRole } = require('./auth');
const emailService = require('./emailService');

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'helpdesk',
  user: process.env.DB_USER || 'helpdesk_user',
  password: process.env.DB_PASSWORD || 'helpdesk_pass',
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Database connected successfully');
  }
});

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static('uploads'));

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Generate ticket number
const generateTicketNumber = () => {
  const prefix = 'HD';
  const timestamp = Date.now().toString().slice(-8);
  return `${prefix}-${timestamp}`;
};

// Health check (no auth required)
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'HelpDesk API is running' });
});

// ===== AUTHENTICATION ROUTES =====

// Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Find user
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 AND is_active = true',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generate token
    const token = generateToken(user);

    // Send response
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        department: user.department
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user (verify token)
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, full_name, role, department FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Change password
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    // Get current user
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, result.rows[0].password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [hashedPassword, req.user.id]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logout
app.post('/api/auth/logout', authenticateToken, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// ===== PROTECTED ROUTES (Require Authentication) =====

// Get all users (admin and support only)
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, full_name, department, role FROM users WHERE is_active = true ORDER BY full_name'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new user (admin only)
app.post('/api/users', authenticateToken, authorizeRole('admin'), async (req, res) => {
  const { username, email, full_name, department, password, role } = req.body;
  
  try {
    const hashedPassword = await hashPassword(password || 'password123');
    
    const result = await pool.query(
      'INSERT INTO users (username, email, full_name, department, password_hash, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, email, full_name, department, role',
      [username, email, full_name, department, hashedPassword, role || 'user']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all tickets
app.get('/api/tickets', authenticateToken, async (req, res) => {
  const { status, priority, category } = req.query;
  
  try {
    let query = `
      SELECT t.*, 
             u1.full_name as creator_name,
             u2.full_name as assignee_name
      FROM tickets t
      LEFT JOIN users u1 ON t.created_by = u1.id
      LEFT JOIN users u2 ON t.assigned_to = u2.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    // Regular users can only see their own tickets
    if (req.user.role === 'user') {
      query += ` AND (t.created_by = $${paramCount} OR t.assigned_to = $${paramCount})`;
      params.push(req.user.id);
      paramCount++;
    }

    if (status) {
      query += ` AND t.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }
    if (priority) {
      query += ` AND t.priority = $${paramCount}`;
      params.push(priority);
      paramCount++;
    }
    if (category) {
      query += ` AND t.category = $${paramCount}`;
      params.push(category);
      paramCount++;
    }

    query += ' ORDER BY t.created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single ticket with details
app.get('/api/tickets/:id', authenticateToken, async (req, res) => {
  try {
    const ticketResult = await pool.query(`
      SELECT t.*, 
             u1.full_name as creator_name, u1.email as creator_email,
             u2.full_name as assignee_name, u2.email as assignee_email
      FROM tickets t
      LEFT JOIN users u1 ON t.created_by = u1.id
      LEFT JOIN users u2 ON t.assigned_to = u2.id
      WHERE t.id = $1
    `, [req.params.id]);

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = ticketResult.rows[0];

    // Check permissions
    if (req.user.role === 'user' && ticket.created_by !== req.user.id && ticket.assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const attachmentsResult = await pool.query(
      'SELECT * FROM attachments WHERE ticket_id = $1 ORDER BY uploaded_at DESC',
      [req.params.id]
    );

    const commentsResult = await pool.query(`
      SELECT c.*, u.full_name as user_name
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.ticket_id = $1
      ORDER BY c.created_at ASC
    `, [req.params.id]);

    res.json({
      ...ticket,
      attachments: attachmentsResult.rows,
      comments: commentsResult.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new ticket
app.post('/api/tickets', authenticateToken, upload.array('attachments', 5), async (req, res) => {
  const { title, description, priority, category } = req.body;
  const created_by = req.user.id; // Use authenticated user
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const ticketNumber = generateTicketNumber();
    const ticketResult = await client.query(
      `INSERT INTO tickets (ticket_number, title, description, priority, category, created_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'Open') RETURNING *`,
      [ticketNumber, title, description, priority, category, created_by]
    );

    const ticket = ticketResult.rows[0];

    // Handle file uploads
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await client.query(
          'INSERT INTO attachments (ticket_id, filename, filepath, file_size) VALUES ($1, $2, $3, $4)',
          [ticket.id, file.originalname, file.path, file.size]
        );
      }
    }

    // Get creator details for email
    const creatorResult = await client.query(
      'SELECT * FROM users WHERE id = $1',
      [created_by]
    );

    await client.query('COMMIT');

    // Send email notification
    if (creatorResult.rows[0]) {
      emailService.sendTicketCreatedEmail(ticket, creatorResult.rows[0])
        .catch(err => console.error('Email error:', err));
    }

    res.status(201).json(ticket);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Update ticket (support and admin can update any, users can update their own)
app.put('/api/tickets/:id', authenticateToken, async (req, res) => {
  const { status, priority, assigned_to, title, description } = req.body;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get old ticket data and check permissions
    const oldTicketResult = await client.query(
      'SELECT * FROM tickets WHERE id = $1',
      [req.params.id]
    );
    
    if (oldTicketResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const oldTicket = oldTicketResult.rows[0];

    // Check permissions
    if (req.user.role === 'user' && oldTicket.created_by !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCount}`);
      values.push(title);
      paramCount++;
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
      
      if (status === 'Resolved' || status === 'Closed') {
        updates.push(`resolved_at = CURRENT_TIMESTAMP`);
      }
    }
    if (priority !== undefined) {
      updates.push(`priority = $${paramCount}`);
      values.push(priority);
      paramCount++;
    }
    if (assigned_to !== undefined) {
      updates.push(`assigned_to = $${paramCount}`);
      values.push(assigned_to);
      paramCount++;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(req.params.id);

    const query = `UPDATE tickets SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await client.query(query, values);
    const updatedTicket = result.rows[0];

    // Get creator and assignee for notifications
    const creatorResult = await client.query(
      'SELECT * FROM users WHERE id = $1',
      [updatedTicket.created_by]
    );

    await client.query('COMMIT');

    // Send email notifications
    if (status && status !== oldTicket.status && creatorResult.rows[0]) {
      emailService.sendTicketStatusEmail(updatedTicket, creatorResult.rows[0], status)
        .catch(err => console.error('Email error:', err));
    }

    if (assigned_to && assigned_to !== oldTicket.assigned_to) {
      const assigneeResult = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [assigned_to]
      );
      if (assigneeResult.rows[0]) {
        emailService.sendTicketAssignedEmail(updatedTicket, assigneeResult.rows[0])
          .catch(err => console.error('Email error:', err));
      }
    }
    
    res.json(updatedTicket);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Add comment to ticket
app.post('/api/tickets/:id/comments', authenticateToken, async (req, res) => {
  const { comment } = req.body;
  const user_id = req.user.id; // Use authenticated user
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const result = await client.query(
      'INSERT INTO comments (ticket_id, user_id, comment) VALUES ($1, $2, $3) RETURNING *',
      [req.params.id, user_id, comment]
    );

    // Get ticket and user details for email
    const ticketResult = await client.query(`
      SELECT t.*, u.email as creator_email, u.full_name as creator_name
      FROM tickets t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.id = $1
    `, [req.params.id]);

    const commenterResult = await client.query(
      'SELECT * FROM users WHERE id = $1',
      [user_id]
    );

    await client.query('COMMIT');

    // Send email notification
    const ticket = ticketResult.rows[0];
    const commenter = commenterResult.rows[0];
    
    if (ticket && commenter && ticket.created_by !== user_id) {
      emailService.sendCommentNotification(
        ticket,
        { email: ticket.creator_email, full_name: ticket.creator_name },
        commenter,
        comment
      ).catch(err => console.error('Email error:', err));
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Get dashboard statistics
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    let query = `
      SELECT 
        COUNT(*) as total_tickets,
        COUNT(*) FILTER (WHERE status = 'Open') as open_tickets,
        COUNT(*) FILTER (WHERE status = 'In Progress') as in_progress_tickets,
        COUNT(*) FILTER (WHERE status = 'Resolved') as resolved_tickets,
        COUNT(*) FILTER (WHERE status = 'Closed') as closed_tickets,
        COUNT(*) FILTER (WHERE priority = 'Critical') as critical_tickets,
        COUNT(*) FILTER (WHERE priority = 'High') as high_tickets
      FROM tickets
    `;

    // Regular users only see their own stats
    if (req.user.role === 'user') {
      query += ` WHERE created_by = ${req.user.id} OR assigned_to = ${req.user.id}`;
    }

    const stats = await pool.query(query);
    res.json(stats.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`HelpDesk Backend API running on port ${PORT}`);
  console.log(`Authentication enabled`);
});