const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const DATABRICKS_HOST = process.env.DATABRICKS_HOST;
const DATABRICKS_HTTP_PATH = process.env.DATABRICKS_HTTP_PATH;
const DATABRICKS_PAT = process.env.AZURE_PAT_DELIVERY_TEST;

app.use(express.json());

console.log('\n=== 🚀 STARTUP INFO ===');
console.log('DATABRICKS_HOST:', DATABRICKS_HOST);
console.log('DATABRICKS_HTTP_PATH:', DATABRICKS_HTTP_PATH);
console.log('DATABRICKS_PAT gesetzt:', !!DATABRICKS_PAT);
console.log('======================\n');

app.get('/', (req, res) => {
  res.json({
    message: 'Hello World from Azure Databricks App 🚀',
    endpoints: { table: '/table', api: '/api/table-data' }
  });
});

app.get('/table', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Databricks Table Viewer</title>
      <style>
        body { font-family: Arial; background: #f5f5f5; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #667eea; color: white; padding: 12px; text-align: left; }
        td { padding: 10px; border-bottom: 1px solid #ddd; font-size: 12px; }
        tr:hover { background: #f9f9f9; }
        .loading { text-align: center; padding: 40px; }
        .error { color: red; background: #fee; padding: 15px; border-radius: 4px; font-family: monospace; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📊 Table: tagueri.cdp_example_salesforce.events_nt</h1>
        <div id="content"><div class="loading">⏳ Lade Daten...</div></div>
      </div>
      <script>
        async function loadData() {
          try {
            console.log('🔄 Fetching /api/table-data...');
            const res = await fetch('/api/table-data');
            console.log('📡 Response Status:', res.status);
            const data = await res.json();
            console.log('📦 Response Data:', data);
            
            if (data.error) {
              document.getElementById('content').innerHTML = '<div class="error">❌ Fehler: ' + data.error + '</div>';
              return;
            }
            
            let html = '<table><thead><tr>';
            data.columns.forEach(col => html += '<th>' + col + '</th>');
            html += '</tr></thead><tbody>';
            
            data.rows.forEach(row => {
              html += '<tr>';
              row.forEach(cellValue => html += '<td>' + (cellValue || '-') + '</td>');
              html += '</tr>';
            });
            
            html += '</tbody></table>';
            html += '<p>✅ <strong>' + data.rows.length + ' Zeilen</strong> geladen</p>';
            document.getElementById('content').innerHTML = html;
          } catch (err) {
            console.error('❌ Error:', err);
            document.getElementById('content').innerHTML = '<div class="error">❌ ' + err.message + '</div>';
          }
        }
        loadData();
      </script>
    </body>
    </html>
  `);
});

app.get('/api/table-data', async (req, res) => {
  console.log('\n🔵 === API REQUEST STARTED ===');
  console.log('⏰ Time:', new Date().toISOString());
  
  try {
    if (!DATABRICKS_PAT) {
      throw new Error('❌ AZURE_PAT_DELIVERY_TEST nicht in .env gesetzt!');
    }
    if (!DATABRICKS_HOST) {
      throw new Error('❌ DATABRICKS_HOST nicht in .env gesetzt!');
    }
    if (!DATABRICKS_HTTP_PATH) {
      throw new Error('❌ DATABRICKS_HTTP_PATH nicht in .env gesetzt!');
    }

    // Warehouse ID aus HTTP Path extrahieren
    const warehouseId = DATABRICKS_HTTP_PATH.split('/').pop();
    
    const query = 'SELECT * FROM tagueri.cdp_example_salesforce.events_nt LIMIT 100';
    
    console.log('\n📤 OUTGOING REQUEST:');
    console.log('URL:', `https://${DATABRICKS_HOST}/api/2.0/sql/statements`);
    console.log('Query:', query);
    console.log('Warehouse Path:', DATABRICKS_HTTP_PATH);
    console.log('Warehouse ID:', warehouseId);
    console.log('Auth Header: Bearer ' + DATABRICKS_PAT.substring(0, 10) + '...');

    const response = await axios.post(
      `https://${DATABRICKS_HOST}/api/2.0/sql/statements`,
      {
        statement: query,
        warehouse_id: warehouseId
      },
      {
        headers: {
          'Authorization': `Bearer ${DATABRICKS_PAT}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );

    console.log('\n📥 INCOMING RESPONSE:');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('Headers:', JSON.stringify(response.headers, null, 2));
    console.log('Full Data (RAW):', JSON.stringify(response.data, null, 2));

    let columns = [];
    let rows = [];

    if (response.data.result && response.data.result.data_array) {
      rows = response.data.result.data_array;
      console.log('\n✅ Rows found:', rows.length);
      
      if (response.data.result.manifest && response.data.result.manifest.columns) {
        columns = response.data.result.manifest.columns.map(col => col.name);
        console.log('✅ Columns found:', columns);
      }
    } else {
      console.log('⚠️ WARNING: Unexpected response structure!');
    }

    console.log('\n✅ SUCCESS - Returning data');
    console.log('🔴 === API REQUEST COMPLETED ===\n');

    res.json({
      columns: columns,
      rows: rows,
      rowCount: rows.length,
      debug: {
        timestamp: new Date().toISOString(),
        databricksHost: DATABRICKS_HOST
      }
    });

  } catch (error) {
    console.log('\n❌ ERROR OCCURRED:');
    console.log('Error Message:', error.message);
    console.log('Error Code:', error.code);
    
    if (error.response) {
      console.log('\n📥 ERROR RESPONSE:');
      console.log('Status:', error.response.status);
      console.log('Status Text:', error.response.statusText);
      console.log('Headers:', JSON.stringify(error.response.headers, null, 2));
      console.log('Data (RAW):', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.log('\n📤 REQUEST ERROR (no response received):');
      console.log('Request:', error.request);
    } else {
      console.log('Error Details:', error);
    }

    console.log('🔴 === API REQUEST FAILED ===\n');

    res.status(500).json({
      error: error.message,
      status: error.response?.status,
      details: error.response?.data
    });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server läuft auf http://localhost:${PORT}`);
  console.log(`📊 Table Viewer: http://localhost:${PORT}/table\n`);
});

module.exports = app;
