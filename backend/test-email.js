const nodemailer = require('nodemailer');

console.log('Nodemailer:', nodemailer);
console.log('Type:', typeof nodemailer);
console.log('createTransporter:', typeof nodemailer.createTransporter);

if (nodemailer.createTransporter) {
  console.log('✅ Nodemailer is working!');
} else {
  console.log('❌ Nodemailer is broken!');
}