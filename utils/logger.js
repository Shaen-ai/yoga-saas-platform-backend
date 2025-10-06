/**
 * Simple Logger Utility
 * 
 * Provides consistent logging across the application with different levels.
 * In production, errors are logged to files. In development, logs go to console.
 */

const fs = require('fs');
const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';
const logDir = path.join(__dirname, '../logs');

// Create logs directory if it doesn't exist
if (isProduction && !fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

function formatMessage(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';
  return `[${timestamp}] ${level.toUpperCase()}: ${message} ${metaStr}\n`;
}

function writeToFile(filename, message) {
  if (!isProduction) return;
  
  const filePath = path.join(logDir, filename);
  fs.appendFile(filePath, message, (err) => {
    if (err) console.error('Failed to write log:', err);
  });
}

const logger = {
  info: (message, meta) => {
    const formatted = formatMessage('info', message, meta);
    console.log(formatted);
    writeToFile('info.log', formatted);
  },

  warn: (message, meta) => {
    const formatted = formatMessage('warn', message, meta);
    console.warn(formatted);
    writeToFile('warn.log', formatted);
  },

  error: (message, error, meta = {}) => {
    const errorMeta = error ? {
      ...meta,
      error: error.message,
      stack: error.stack
    } : meta;
    
    const formatted = formatMessage('error', message, errorMeta);
    console.error(formatted);
    writeToFile('error.log', formatted);
  },

  debug: (message, meta) => {
    if (isProduction) return; // Don't log debug in production
    
    const formatted = formatMessage('debug', message, meta);
    console.debug(formatted);
  }
};

module.exports = logger;
