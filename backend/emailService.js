const nodemailer = require('nodemailer');

// Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER, 
    pass: process.env.SMTP_PASS  
  }
});

async function sendTicketCreatedEmail(ticket, creator) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('📧 [EMAIL DISABLED] Ticket Created:', ticket.ticket_number);
    return true;
  }

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: creator.email,
    subject: `Ticket Created: ${ticket.ticket_number}`,
    html: `
      <h2>Your ticket has been created successfully!</h2>
      <p><strong>Ticket Number:</strong> ${ticket.ticket_number}</p>
      <p><strong>Title:</strong> ${ticket.title}</p>
      <p><strong>Priority:</strong> ${ticket.priority}</p>
      <p><strong>Status:</strong> ${ticket.status}</p>
      <p><strong>Description:</strong></p>
      <p>${ticket.description}</p>
      <br>
      <p>You will be notified of any updates to this ticket.</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Email sent to:', creator.email);
    return true;
  } catch (error) {
    console.error('❌ Email send failed:', error.message);
    return false;
  }
}

async function sendTicketAssignedEmail(ticket, assignee) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('📧 [EMAIL DISABLED] Ticket Assigned:', ticket.ticket_number);
    return true;
  }

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: assignee.email,
    subject: `Ticket Assigned: ${ticket.ticket_number}`,
    html: `
      <h2>A ticket has been assigned to you!</h2>
      <p><strong>Ticket Number:</strong> ${ticket.ticket_number}</p>
      <p><strong>Title:</strong> ${ticket.title}</p>
      <p><strong>Priority:</strong> ${ticket.priority}</p>
      <p><strong>Status:</strong> ${ticket.status}</p>
      <p><strong>Description:</strong></p>
      <p>${ticket.description}</p>
      <br>
      <p>Please review and take action on this ticket.</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Assignment email sent to:', assignee.email);
    return true;
  } catch (error) {
    console.error('❌ Email send failed:', error.message);
    return false;
  }
}

async function sendTicketStatusEmail(ticket, creator, newStatus) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('📧 [EMAIL DISABLED] Status Changed:', ticket.ticket_number);
    return true;
  }

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: creator.email,
    subject: `Ticket Update: ${ticket.ticket_number} - ${newStatus}`,
    html: `
      <h2>Your ticket status has been updated!</h2>
      <p><strong>Ticket Number:</strong> ${ticket.ticket_number}</p>
      <p><strong>Title:</strong> ${ticket.title}</p>
      <p><strong>New Status:</strong> <span style="color: blue; font-weight: bold;">${newStatus}</span></p>
      <br>
      <p>Please log in to your helpdesk portal to view more details.</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Status update email sent to:', creator.email);
    return true;
  } catch (error) {
    console.error('❌ Email send failed:', error.message);
    return false;
  }
}

async function sendCommentNotification(ticket, creator, commenter, comment) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('📧 [EMAIL DISABLED] New Comment:', ticket.ticket_number);
    return true;
  }

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: creator.email,
    subject: `New Comment on Ticket: ${ticket.ticket_number}`,
    html: `
      <h2>New comment on your ticket!</h2>
      <p><strong>Ticket Number:</strong> ${ticket.ticket_number}</p>
      <p><strong>Title:</strong> ${ticket.title}</p>
      <p><strong>Comment by:</strong> ${commenter.full_name}</p>
      <p><strong>Comment:</strong></p>
      <p style="background-color: #f5f5f5; padding: 10px; border-radius: 5px;">${comment}</p>
      <br>
      <p>Please log in to respond.</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Comment notification sent to:', creator.email);
    return true;
  } catch (error) {
    console.error('❌ Email send failed:', error.message);
    return false;
  }
}

module.exports = {
  sendTicketCreatedEmail,
  sendTicketAssignedEmail,
  sendTicketStatusEmail,
  sendCommentNotification
};