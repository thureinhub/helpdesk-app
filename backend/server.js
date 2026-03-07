require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const { hashPassword, verifyPassword } = require('./passwordUtils');
const { generateToken, authenticateToken, authorizeRole } = require('./auth');
const emailService = require('./emailService');
const fs = require('fs');
const path = require('path');

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
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Username does not exist. Please check your spelling and try again.' });
    }

    const user = result.rows[0];

    // Check if account is active or locked
    if (!user.is_active) {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact an administrator.' });
    }
    if (user.is_locked) {
      return res.status(403).json({ error: 'Your account has been locked due to too many failed login attempts. Please contact an administrator.' });
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      // Global Admins are exempt from brute-force lockouts to prevent accidental permanent system lockouts
      if (user.role === 'admin' && user.organization_id === null) {
        return res.status(401).json({ error: 'Incorrect password. Global Admins are exempt from account locking.' });
      }

      const newAttempts = (user.failed_login_attempts || 0) + 1;
      const willLock = newAttempts >= 5;

      await pool.query(
        'UPDATE users SET failed_login_attempts = $1, is_locked = $2 WHERE id = $3',
        [newAttempts, willLock, user.id]
      );

      if (willLock) {
        return res.status(403).json({ error: 'Your account has been locked due to too many failed login attempts. Please contact an administrator.' });
      }

      return res.status(401).json({ error: `Incorrect password. You have ${5 - newAttempts} attempts remaining before your account is locked.` });
    }

    // Update last login and reset failed attempts
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP, failed_login_attempts = 0, is_locked = false WHERE id = $1',
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
        department: user.department,
        avatar_url: user.avatar_url,
        require_password_change: user.require_password_change,
        organization_id: user.organization_id
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
      'SELECT id, username, email, full_name, role, department, avatar_url, organization_id FROM users WHERE id = $1',
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

// Change password (and clear the requirements flag)
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

    // Update password and clear flag
    await pool.query(
      'UPDATE users SET password_hash = $1, require_password_change = false WHERE id = $2',
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

// ===== ORGANIZATION ROUTES =====
app.get('/api/organizations', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM organizations ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/organizations', authenticateToken, authorizeRole('admin'), async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Organization name is required' });
  try {
    const result = await pool.query('INSERT INTO organizations (name) VALUES ($1) RETURNING *', [name]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== PROTECTED ROUTES (Require Authentication) =====

// Get all users (admin and support only)
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    let query = "SELECT id, username, email, full_name, department, role, avatar_url, organization_id, is_locked, is_active FROM users WHERE email != 'thurein.win@sealiongroup.com'";
    const params = [];

    if (req.user.role === 'support' || (req.user.role === 'admin' && req.user.organization_id)) {
      query += " AND organization_id = $1";
      params.push(req.user.organization_id);
    }

    query += " ORDER BY full_name";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new user (admin only)
app.post('/api/users', authenticateToken, authorizeRole('admin'), async (req, res) => {
  const { username, email, full_name, department, password, role, organization_id } = req.body;

  // If the admin creating this user has an organization_id, enforce it (Local Admin)
  const finalOrgId = req.user.organization_id ? req.user.organization_id : (organization_id || null);

  try {
    const hashedPassword = await hashPassword(password || 'Welcome123!');

    const result = await pool.query(
      'INSERT INTO users (username, email, full_name, department, password_hash, role, require_password_change, organization_id) VALUES ($1, $2, $3, $4, $5, $6, true, $7) RETURNING id, username, email, full_name, department, role, avatar_url, organization_id, is_locked',
      [username, email, full_name, department, hashedPassword, role || 'user', finalOrgId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update existing user (admin only)
app.put('/api/users/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  const userId = req.params.id;
  const { username, email, full_name, department, role, organization_id, is_locked, is_active } = req.body;

  // Local Admins cannot change a user's organization
  const finalOrgId = req.user.organization_id ? req.user.organization_id : (organization_id || null);

  try {
    const targetUser = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
    if (targetUser.rows.length > 0 && targetUser.rows[0].email === 'thurein.win@sealiongroup.com') {
      return res.status(403).json({ error: 'Cannot modify this system account' });
    }

    const result = await pool.query(
      'UPDATE users SET username = $1, email = $2, full_name = $3, department = $4, role = $5, organization_id = $6, is_locked = COALESCE($8, is_locked), is_active = COALESCE($9, is_active), failed_login_attempts = CASE WHEN $8 = false THEN 0 ELSE failed_login_attempts END WHERE id = $7 RETURNING id, username, email, full_name, department, role, avatar_url, organization_id, is_locked, is_active',
      [username, email, full_name, department, role, finalOrgId, userId, is_locked, is_active]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset user password (admin only)
app.put('/api/users/:id/reset-password', authenticateToken, authorizeRole('admin'), async (req, res) => {
  const userId = req.params.id;
  const tempPassword = 'Welcome123!';

  try {
    const targetUser = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
    if (targetUser.rows.length > 0 && targetUser.rows[0].email === 'thurein.win@sealiongroup.com') {
      return res.status(403).json({ error: 'Cannot modify this system account' });
    }

    const hashedPassword = await hashPassword(tempPassword);

    const result = await pool.query(
      'UPDATE users SET password_hash = $1, require_password_change = true WHERE id = $2 RETURNING id, username, email',
      [hashedPassword, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Password reset successfully to default' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete (HARD delete) user (admin only)
app.delete('/api/users/:id', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    // Check if user is deleting themselves
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const targetUser = await pool.query('SELECT email FROM users WHERE id = $1', [req.params.id]);
    if (targetUser.rows.length > 0 && targetUser.rows[0].email === 'thurein.win@sealiongroup.com') {
      return res.status(403).json({ error: 'Cannot modify this system account' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Nullify references in tickets and comments to avoid foreign key violations
      await client.query('UPDATE tickets SET created_by = NULL WHERE created_by = $1', [req.params.id]);
      await client.query('UPDATE tickets SET assigned_to = NULL WHERE assigned_to = $1', [req.params.id]);
      await client.query('UPDATE comments SET user_id = NULL WHERE user_id = $1', [req.params.id]);

      const result = await client.query(
        'DELETE FROM users WHERE id = $1 RETURNING id',
        [req.params.id]
      );

      await client.query('COMMIT');

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ message: 'User permanently deleted successfully' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload profile avatar
app.post('/api/users/:id/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    // Only admins or the user themselves can update the avatar
    if (req.user.role !== 'admin' && req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const avatarUrl = `/uploads/${req.file.filename}`;

    const result = await pool.query(
      'UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING id, avatar_url',
      [avatarUrl, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Avatar uploaded successfully',
      avatar_url: avatarUrl
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== TICKET ROUTES =====
// Get all tickets
app.get('/api/tickets', authenticateToken, async (req, res) => {
  const { status, priority, category } = req.query;

  try {
    let query = `
      SELECT t.*, 
             u1.full_name as creator_name,
             u1.department as creator_department,
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
    } else if (req.user.role === 'support' || (req.user.role === 'admin' && req.user.organization_id)) {
      // Local Admins and Support staff can only see tickets from their own organization
      query += ` AND t.organization_id = $${paramCount}`;
      params.push(req.user.organization_id);
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
      `INSERT INTO tickets (ticket_number, title, description, priority, category, created_by, status, organization_id)
       VALUES ($1, $2, $3, $4, $5, $6, 'Open', $7) RETURNING *`,
      [ticketNumber, title, description, priority, category, created_by, req.user.organization_id || null]
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

// Upload attachment to existing ticket
app.post('/api/tickets/:id/attachments', authenticateToken, upload.array('attachments', 5), async (req, res) => {
  const ticketId = req.params.id;
  const userId = req.user.id;

  try {
    // Check if ticket exists and user has permission
    const ticketResult = await pool.query('SELECT * FROM tickets WHERE id = $1', [ticketId]);
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = ticketResult.rows[0];
    if (req.user.role === 'user' && ticket.created_by !== userId && ticket.assigned_to !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const newAttachments = [];
    for (const file of req.files) {
      const result = await pool.query(
        'INSERT INTO attachments (ticket_id, filename, filepath, file_size) VALUES ($1, $2, $3, $4) RETURNING *',
        [ticketId, file.originalname, file.path, file.size]
      );
      newAttachments.push(result.rows[0]);
    }

    res.status(201).json(newAttachments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete attachment
app.delete('/api/tickets/:id/attachments/:attachmentId', authenticateToken, async (req, res) => {
  const { id: ticketId, attachmentId } = req.params;
  const userId = req.user.id;

  try {
    // Check permissions
    const ticketResult = await pool.query('SELECT * FROM tickets WHERE id = $1', [ticketId]);
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = ticketResult.rows[0];
    // Only creator, admin, or support can delete. Users can only delete if they created the ticket.
    if (req.user.role === 'user' && ticket.created_by !== userId) {
      return res.status(403).json({ error: 'Access denied. You can only manage attachments on tickets you created.' });
    }

    // Get attachment file info
    const attachmentResult = await pool.query(
      'SELECT * FROM attachments WHERE id = $1 AND ticket_id = $2',
      [attachmentId, ticketId]
    );

    if (attachmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const attachment = attachmentResult.rows[0];

    // Delete from filesystem
    const filePath = path.join(__dirname, attachment.filepath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    } else {
      console.warn(`File not found for deletion: ${filePath}`);
    }

    // Delete from database
    await pool.query('DELETE FROM attachments WHERE id = $1', [attachmentId]);

    res.json({ message: 'Attachment deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update ticket (support and admin can update any, users can update their own)
app.put('/api/tickets/:id', authenticateToken, async (req, res) => {
  const { status, priority, assigned_to, title, description, resolution_method } = req.body;
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
    if (resolution_method !== undefined) {
      updates.push(`resolution_method = $${paramCount}`);
      values.push(resolution_method);
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
    const userId = req.user.id;
    let userFilter = '';
    let andUserFilter = '';

    if (req.user.role === 'user') {
      userFilter = `WHERE t.created_by = ${userId} OR t.assigned_to = ${userId}`;
      andUserFilter = `AND (t.created_by = ${userId} OR t.assigned_to = ${userId})`;
    } else if (req.user.role === 'support' || (req.user.role === 'admin' && req.user.organization_id)) {
      userFilter = `WHERE t.organization_id = ${req.user.organization_id || -1}`;
      andUserFilter = `AND t.organization_id = ${req.user.organization_id || -1}`;
    }

    // 1. Basic Stats
    const basicStatsQuery = `
      SELECT 
        COUNT(*) as total_tickets,
        COUNT(*) FILTER (WHERE status = 'Open') as open_tickets,
        COUNT(*) FILTER (WHERE status = 'In Progress') as in_progress_tickets,
        COUNT(*) FILTER (WHERE status = 'Resolved') as resolved_tickets,
        COUNT(*) FILTER (WHERE status = 'Closed') as closed_tickets,
        COUNT(*) FILTER (WHERE priority = 'Critical') as critical_tickets,
        COUNT(*) FILTER (WHERE priority = 'High') as high_tickets,
        COUNT(*) FILTER (WHERE resolution_method = 'Remote Support') as remote_resolutions,
        COUNT(*) FILTER (WHERE resolution_method = 'On-Site Visit') as onsite_resolutions
      FROM tickets t
      ${userFilter}
    `;

    // 2. Recent Tickets (last 50)
    const recentTicketsQuery = `
      SELECT t.id, t.ticket_number, t.title, t.priority, t.status, t.created_at, u.full_name as creator_name
      FROM tickets t
      LEFT JOIN users u ON t.created_by = u.id
      ${userFilter}
      ORDER BY t.created_at DESC
      LIMIT 50
    `;

    // 3. Tickets by Priority (for Pie Chart) - Only Open/In Progress
    const priorityQuery = `
      SELECT priority as name, COUNT(*) as value
      FROM tickets t
      WHERE status IN ('Open', 'In Progress') ${andUserFilter}
      GROUP BY priority
    `;

    // 4. Tickets by Category (for Pie Chart)
    const categoryQuery = `
      SELECT category as name, COUNT(*) as value
      FROM tickets t
      WHERE status IN ('Open', 'In Progress') ${andUserFilter}
      GROUP BY category
    `;

    // 5. Ticket Volume (Last 7 Days)
    const volumeQuery = `
      WITH RECURSIVE dates AS (
        SELECT CURRENT_DATE - INTERVAL '6 days' AS date
        UNION ALL
        SELECT date + INTERVAL '1 day'
        FROM dates
        WHERE date < CURRENT_DATE
      )
      SELECT 
        to_char(d.date, 'Mon DD') as date,
        COUNT(t.id) as tickets
      FROM dates d
      LEFT JOIN tickets t ON DATE(t.created_at) = d.date ${andUserFilter}
      GROUP BY d.date
      ORDER BY d.date
    `;

    const [basicStats, recentTickets, priorityStats, categoryStats, volumeStats] = await Promise.all([
      pool.query(basicStatsQuery),
      pool.query(recentTicketsQuery),
      pool.query(priorityQuery),
      pool.query(categoryQuery),
      pool.query(volumeQuery)
    ]);

    res.json({
      ...basicStats.rows[0],
      recent_tickets: recentTickets.rows,
      priority_stats: priorityStats.rows,
      category_stats: categoryStats.rows,
      volume_stats: volumeStats.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`HelpDesk Backend API running on port ${PORT}`);
  console.log(`Authentication enabled`);
});