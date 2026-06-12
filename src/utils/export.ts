// Export and backup utilities for Keobi - CSV, HTML, and JSON Backup/Restore
import * as FileSystem from 'expo-file-system';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import getDatabase from '../db/database';
import { transactionRepository } from '../db/transactionRepository';
import { formatCurrency, formatDate } from './helpers';
import { Transaction, TransactionType } from '../types';

// ── CSV Export ───────────────────────────────────────────────────────────────
export const exportToCSV = async (startDate: number, endDate: number, label: string) => {
  const transactions = await transactionRepository.getByDateRange(startDate, endDate);

  if (transactions.length === 0) {
    throw new Error('Tidak ada transaksi untuk diekspor');
  }

  const headers = ['Tanggal', 'Jenis', 'Kategori', 'Dompet', 'Nominal', 'Catatan'];
  const rows = transactions.map((t: Transaction) => [
    formatDate(t.date, 'dd/MM/yyyy'),
    t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
    t.category_name || 'Tanpa Kategori',
    t.wallet_name || '-',
    t.amount.toString(),
    t.note || '',
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const fileName = `keobi_${label.replace(/\s+/g, '_')}_${Date.now()}.csv`;
  const file = new File(Paths.cache, fileName);
  await file.write(csvContent);

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/csv',
      dialogTitle: `Export Keobi - ${label}`,
    });
  }

  return file.uri;
};

// ── HTML Report Export ───────────────────────────────────────────────────────
export const exportToHTML = async (startDate: number, endDate: number, label: string) => {
  const transactions = await transactionRepository.getByDateRange(startDate, endDate);
  const summary = await transactionRepository.getSummaryForPeriod(startDate, endDate);

  const rows = transactions.map((t: Transaction) => `
    <tr>
      <td>${formatDate(t.date, 'dd/MM/yyyy')}</td>
      <td style="color: ${t.type === 'income' ? '#22C55E' : '#EF4444'}">${t.type === 'income' ? '↓ Masuk' : '↑ Keluar'}</td>
      <td>${t.category_name || '-'}</td>
      <td>${t.wallet_name || '-'}</td>
      <td style="text-align:right; font-weight:600">${formatCurrency(t.amount)}</td>
      <td>${t.note || '-'}</td>
    </tr>
  `).join('');

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; color: #333; margin: 20px; }
  h1 { color: #1A6FE8; font-size: 24px; margin-bottom: 4px; }
  .subtitle { color: #666; margin-bottom: 24px; }
  .summary { display: flex; gap: 20px; margin-bottom: 24px; }
  .summary-card { background: #F0F4FF; border-radius: 8px; padding: 12px 20px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1A6FE8; color: white; padding: 10px; text-align: left; }
  td { padding: 8px 10px; border-bottom: 1px solid #eee; }
  tr:nth-child(even) { background: #F8FAFF; }
</style>
</head>
<body>
  <h1>keobi</h1>
  <div class="subtitle">Laporan Keuangan — ${label}</div>
  <div class="summary">
    <div class="summary-card">
      <div>Total Pemasukan</div>
      <div style="color:#22C55E;font-weight:bold;font-size:18px">${formatCurrency(summary.income)}</div>
    </div>
    <div class="summary-card">
      <div>Total Pengeluaran</div>
      <div style="color:#EF4444;font-weight:bold;font-size:18px">${formatCurrency(summary.expense)}</div>
    </div>
    <div class="summary-card">
      <div>Selisih</div>
      <div style="color:${summary.income >= summary.expense ? '#22C55E' : '#EF4444'};font-weight:bold;font-size:18px">${formatCurrency(summary.income - summary.expense)}</div>
    </div>
  </div>
  <table>
    <thead>
      <tr><th>Tanggal</th><th>Jenis</th><th>Kategori</th><th>Dompet</th><th>Nominal</th><th>Catatan</th></tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="6" style="text-align:center;color:#999">Tidak ada transaksi</td></tr>'}
    </tbody>
  </table>
  <p style="color:#999;text-align:center;margin-top:24px">Dibuat dengan Keobi • ${formatDate(Date.now(), 'dd MMMM yyyy')}</p>
</body>
</html>`;

  const fileName = `keobi_laporan_${label.replace(/\s+/g, '_')}_${Date.now()}.html`;
  const file = new File(Paths.cache, fileName);
  await file.write(htmlContent);

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/html',
      dialogTitle: `Laporan Keobi - ${label}`,
    });
  }

  return file.uri;
};

// ── Database JSON Backup ─────────────────────────────────────────────────────
export const backupDatabase = async () => {
  const db = await getDatabase();

  // Retrieve all data from SQLite tables
  const settings = await db.getAllAsync('SELECT * FROM settings');
  const wallets = await db.getAllAsync('SELECT * FROM wallets');
  const categories = await db.getAllAsync('SELECT * FROM categories');
  const transactions = await db.getAllAsync('SELECT * FROM transactions');

  const backupData = JSON.stringify({
    keobi_backup_version: 1,
    exportedAt: Date.now(),
    settings,
    wallets,
    categories,
    transactions,
  }, null, 2);

  const backupFileName = `keobi_backup_${Date.now()}.json`;
  const backupFile = new File(Paths.cache, backupFileName);
  await backupFile.write(backupData);

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(backupFile.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Backup Data Keobi',
    });
  }

  return backupFile.uri;
};

// ── Database JSON Restore ────────────────────────────────────────────────────
export const restoreDatabase = async () => {
  const db = await getDatabase();

  // 1. Pick the backup file
  const pickerResult = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });

  if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
    throw new Error('Proses restore dibatalkan');
  }

  const pickedFileUri = pickerResult.assets[0].uri;

  // 2. Read string content from file
  const backupDataStr = await FileSystem.readAsStringAsync(pickedFileUri);
  const backupData = JSON.parse(backupDataStr);

  // 3. Validate JSON keys
  if (backupData.keobi_backup_version !== 1 || !backupData.wallets || !backupData.transactions) {
    throw new Error('Format file backup tidak valid');
  }

  const now = Date.now();

  // 4. Overwrite SQLite database in a safe atomic transaction
  await db.withTransactionAsync(async () => {
    // Delete old data (foreign key order: child first)
    await db.runAsync('DELETE FROM transactions');
    await db.runAsync('DELETE FROM categories');
    await db.runAsync('DELETE FROM wallets');
    await db.runAsync('DELETE FROM settings');

    // Insert restored settings
    if (backupData.settings) {
      for (const s of backupData.settings) {
        await db.runAsync(
          'INSERT INTO settings (key, value) VALUES (?, ?)',
          [s.key, s.value]
        );
      }
    }

    // Insert restored wallets
    if (backupData.wallets) {
      for (const w of backupData.wallets) {
        await db.runAsync(
          'INSERT INTO wallets (id, name, icon, color, balance, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [w.id, w.name, w.icon, w.color, w.balance, w.created_at || now, w.updated_at || now]
        );
      }
    }

    // Insert restored categories
    if (backupData.categories) {
      for (const c of backupData.categories) {
        await db.runAsync(
          'INSERT INTO categories (id, name, color, icon, type, is_default, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [c.id, c.name, c.color, c.icon, c.type, c.is_default, c.created_at || now]
        );
      }
    }

    // Insert restored transactions
    if (backupData.transactions) {
      for (const t of backupData.transactions) {
        await db.runAsync(
          'INSERT INTO transactions (id, wallet_id, category_id, type, amount, note, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [t.id, t.wallet_id, t.category_id || null, t.type, t.amount, t.note || '', t.date, t.created_at || now]
        );
      }
    }
  });
};
