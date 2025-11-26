import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const GOOGLE_SHEET_NAME = "Inventory tracker";
const WORKSHEET_NAME = "Stock Summary";

export const dynamic = 'force-dynamic';

// Fix private key format - handles various escape scenarios from env vars
function formatPrivateKey(key: string | undefined): string | undefined {
  if (!key) return undefined;
  // Replace literal \n with actual newlines (handles double-escaped and single-escaped)
  return key.replace(/\\\\n/g, '\n').replace(/\\n/g, '\n');
}

export async function GET() {
  try {
    // Load credentials from environment variables
    const credentials = {
      type: 'service_account',
      project_id: process.env.GOOGLE_PROJECT_ID,
      private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
      private_key: formatPrivateKey(process.env.GOOGLE_PRIVATE_KEY),
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_CLIENT_ID,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL,
    };

    if (!credentials.private_key || !credentials.client_email) {
      return NextResponse.json(
        { error: 'Google credentials not configured. Please set environment variables.' },
        { status: 500 }
      );
    }

    // Authenticate with Google Sheets API and Drive API
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets.readonly',
        'https://www.googleapis.com/auth/drive.readonly',
      ],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // First, get the spreadsheet ID by searching for the sheet by name
    // Since we don't have the spreadsheet ID, we'll need to use Drive API to find it
    const drive = google.drive({ version: 'v3', auth });
    
    const response = await drive.files.list({
      q: `name='${GOOGLE_SHEET_NAME}' and mimeType='application/vnd.google-apps.spreadsheet'`,
      fields: 'files(id, name)',
    });

    if (!response.data.files || response.data.files.length === 0) {
      return NextResponse.json(
        { error: `Spreadsheet "${GOOGLE_SHEET_NAME}" not found. Make sure the sheet is shared with the service account.` },
        { status: 404 }
      );
    }

    const spreadsheetId = response.data.files[0].id;

    // Get data from the specific worksheet
    const sheetResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId!,
      range: `'${WORKSHEET_NAME}'`,
    });

    const rows = sheetResponse.data.values;

    if (!rows || rows.length === 0) {
      return NextResponse.json({ data: [], headers: [] });
    }

    // First row is headers
    const headers = rows[0] as string[];
    
    // Find indices for required columns
    const requiredColumns = ['Item Name', 'color', 'size', 'length', 'Total Stock'];
    const columnIndices: { [key: string]: number } = {};
    
    requiredColumns.forEach((col) => {
      const index = headers.findIndex(
        (h) => h.toLowerCase().trim() === col.toLowerCase().trim()
      );
      if (index !== -1) {
        columnIndices[col] = index;
      }
    });

    // Extract only the required columns from each row (skip header row and first data row)
    const data = rows.slice(2).map((row: string[]) => {
      const item: { [key: string]: string } = {};
      requiredColumns.forEach((col) => {
        if (columnIndices[col] !== undefined) {
          item[col] = (row[columnIndices[col]] as string) || '';
        }
      });
      return item;
    });

    // Filter out empty rows
    const filteredData = data.filter((item: { [key: string]: string }) => 
      Object.values(item).some((val: string) => val && val.trim() !== '')
    );

    return NextResponse.json({ 
      data: filteredData, 
      headers: requiredColumns.filter(col => columnIndices[col] !== undefined)
    });
  } catch (error) {
    console.error('Error fetching sheet data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory data', details: String(error) },
      { status: 500 }
    );
  }
}
