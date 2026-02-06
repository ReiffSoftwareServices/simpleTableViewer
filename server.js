const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Databricks Configuration
const DATABRICKS_HOST = process.env.DATABRICKS_HOST || 'your-instance.cloud.databricks.com';
const DATABRICKS_HTTP_PATH = process.env.DATABRICKS_HTTP_PATH || '/sql/1.0/warehouses/5f20e2fe1019305b';
const DATABRICKS_PAT = process.env.AZURE_PAT_DELIVERY_TEST;

// Databricks Query Function
async function queryDatabricks(query) {
  try {
    if (!DATABRICKS_PAT) {
      throw new Error('AZURE_PAT_DELIVERY_TEST environment variable is not set');
    }

    const response = await axios.post(
      `https://${DATABRICKS_HOST}/api/2.0/sql/statements`,
      {
        statement: query,
        warehouse_path: DATABRICKS_HTTP_PATH
      },
      {
        headers: {
          'Authorization': `Bearer ${DATABRICKS_PAT}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );

    return response.data;
  } catch (error) {
    console.error('❌ Databricks Query Failed:', error.message);
    throw error;
  }
}

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Hello World from Azure Databricks App 🚀',
    endpoints: {
      table: '/table',
      api: '/api/table-data'
    }
  });
});

// HTML Table Viewer
app.get('/table', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Databricks Table Viewer</title>
      <style>
        body { font-family: Arial; background: #f5f5f5; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #667eea; color: white; padding: 12px; text-align: left; }
        td { padding: 10px; border-bottom: 1px solid #ddd; }
        tr:hover { background: #f9f9f9; }
        .loading { text-align: center; padding: 40px; }
        .error { color: red; background: #fee; padding: 15px; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📊 Table: tagueri.cdp_example_salesforce.events_nt</h1>
        <div id="content">
          <div class="loading">Lade Daten...</div>
        </div>
      </div>
      <script>
        async function loadData() {
          try {
            const res = await fetch('/api/table-data');
            const data = await res.json();
            
            if (data.error) {
              document.getElementById('content').innerHTML = '<div class="error">Fehler: ' + data.error + '</div>';
              return;
            }
            
            let html = '<table><thead><tr>';
            data.columns.forEach(col => html += '<th>' + col + '</th>');
            html += '</tr></thead><tbody>';
            
            data.rows.forEach(row => {
              html += '<tr>';
              data.columns.forEach(col => html += '<td>' + (row[col] || '-') + '</td>');
              html += '</tr>';
            });
            
            html += '</tbody></table>';
            html += '<p><strong>Zeilen: ' + data.rows.length + '</strong></p>';
            document.getElementById('content').innerHTML = html;
          } catch (err) {
            document.getElementById('content').innerHTML = '<div class="error">Fehler: ' + err.message + '</div>';
          }
        }
        loadData();
      </script>
    </body>
    </html>
  `);
});

// API Endpoint
app.get('/api/table-data', async (req, res) => {
  try {
    const result = await queryDatabricks('SELECT * FROM tagueri.cdp_example_salesforce.events_nt LIMIT 100');
    
    let columns = [];
    let rows = [];
    
    if (result.result && result.result.data_array) {
      rows = result.result.data_array;
      if (result.result.manifest && result.result.manifest.columns) {
        columns = result.result.manifest.columns.map(col => col.name);
      }
    }
    
    res.json({ columns, rows, rowCount: rows.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => console.log(`🚀 Server auf http://localhost:${PORT}/table`));
