const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Databricks Configuration
const DATABRICKS_HOST = process.env.DATABRICKS_HOST || 'your-instance.cloud.databricks.com';
const DATABRICKS_HTTP_PATH = process.env.DATABRICKS_HTTP_PATH || '/sql/1.0/warehouses/5f20e2fe1019305b';
const DATABRICKS_PAT = process.env.AZURE_PAT_DELIVERY_TEST;

// Test Databricks Connection
async function testDatabricksConnection() {
  try {
    if (!DATABRICKS_PAT) {
      console.error('❌ Error: AZURE_PAT_DELIVERY_TEST environment variable is not set');
      return false;
    }

    const response = await axios.get(
      `https://${DATABRICKS_HOST}/api/2.0/sql/warehouses`,
      {
        headers: {
          'Authorization': `Bearer ${DATABRICKS_PAT}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Databricks Connection Successful');
    return true;
  } catch (error) {
    console.error('❌ Databricks Connection Failed:', error.message);
    return false;
  }
}

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Hello World from Azure Databricks App 🚀',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/databricks-info', (req, res) => {
  res.json({
    databricks_host: DATABRICKS_HOST,
    databricks_http_path: DATABRICKS_HTTP_PATH,
    pat_configured: !!DATABRICKS_PAT,
    message: 'Databricks credentials are configured'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path
  });
});

// Start Server
const server = app.listen(PORT, async () => {
  console.log(`\n🚀 Server is running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Test Databricks connection on startup
  await testDatabricksConnection();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app;