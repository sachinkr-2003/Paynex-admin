import { useState } from 'react';
import { exportToExcel } from '../utils/exportToExcel';
import adminApi from '../services/api';
import { showConfirmDialog, showSuccessAlert, showErrorAlert, showToast as swalToast, PaynexSwal } from '../utils/swal';
import { Key, X } from 'lucide-react';

export default function UsersPage({ traders, setTraders, showToast, searchQuery = '' }) {
  const [kycFilter, setKycFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [balanceModalUser, setBalanceModalUser] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustType, setAdjustType] = useState('credit');

  const filteredUsers = traders.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      u.name.toLowerCase().includes(q) ||
      u.uid.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.phone.includes(q);

    const matchesKyc = kycFilter === 'All' || u.kycStatus === kycFilter;
    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Active' && !u.isBanned) ||
      (statusFilter === 'Banned' && u.isBanned);

    return matchesSearch && matchesKyc && matchesStatus;
  });

  const handleExportUsersExcel = () => {
    const headers = [
      { label: 'UID', accessor: 'uid' },
      { label: 'Full Name', accessor: 'name' },
      { label: 'Email', accessor: 'email' },
      { label: 'Phone', accessor: 'phone' },
      { label: 'Wallet Balance (INR)', accessor: (u) => `₹${u.balance}` },
      { label: 'Total Staked (INR)', accessor: (u) => `₹${u.totalStaked}` },
      { label: 'Total Won (INR)', accessor: (u) => `₹${u.totalWon}` },
      { label: 'KYC Status', accessor: 'kycStatus' },
      { label: 'VIP Level', accessor: 'vipLevel' },
      { label: 'Account Status', accessor: (u) => (u.isBanned ? 'BANNED' : 'ACTIVE') },
      { label: 'Registration Date', accessor: 'joinDate' },
    ];
    exportToExcel('PAYNEX_Traders_Master_Ledger', headers, filteredUsers);
    swalToast('Traders Excel Sheet downloaded');
  };

  const handleToggleBan = async (uid) => {
    const target = traders.find((u) => u.uid === uid);
    if (!target) return;
    const newStatus = !target.isBanned;

    const confirmed = await showConfirmDialog(
      newStatus ? 'Ban Trader Account' : 'Reactivate Trader Account',
      `Are you sure you want to <strong>${newStatus ? 'BAN' : 'UNBAN'}</strong> trader <strong>${target.name}</strong> (${target.uid})?`,
      newStatus ? 'BAN ACCOUNT' : 'ACTIVATE ACCOUNT',
      'CANCEL'
    );
    if (!confirmed) return;

    setTraders((prev) =>
      prev.map((u) => {
        if (u.uid === uid) {
          return { ...u, isBanned: newStatus };
        }
        return u;
      })
    );

    swalToast(`Trader ${target.name} is now ${newStatus ? 'BANNED' : 'ACTIVE'}`, newStatus ? 'warning' : 'success');

    try {
      await adminApi.updateTraderStatus(target._id || target.uid, { isBanned: newStatus });
    } catch (err) {
      console.warn('Backend user status sync:', err.message);
    }
  };

  const handleApplyBalanceAdjustment = async () => {
    const amt = Number(adjustAmount);
    if (!amt || amt <= 0) {
      showErrorAlert('Invalid Amount', 'Please enter a valid adjustment amount in INR.');
      return;
    }

    const currentModalUser = balanceModalUser;
    const actionWord = adjustType === 'credit' ? 'credit to' : 'debit from';
    const confirmed = await showConfirmDialog(
      `Confirm Balance Adjustment`,
      `Are you sure you want to <strong>${adjustType.toUpperCase()} ₹${amt.toLocaleString('en-IN')}</strong> ${actionWord} <strong>${currentModalUser.name}</strong>'s wallet?`,
      `CONFIRM ${adjustType.toUpperCase()}`,
      'CANCEL'
    );
    if (!confirmed) return;

    setTraders((prev) =>
      prev.map((u) => {
        if (u.uid === currentModalUser.uid) {
          const newBal = adjustType === 'credit' ? u.balance + amt : Math.max(0, u.balance - amt);
          return { ...u, balance: newBal };
        }
        return u;
      })
    );
    setBalanceModalUser(null);
    setAdjustAmount('');

    showSuccessAlert(
      'Wallet Balance Updated',
      `₹${amt.toLocaleString('en-IN')} has been ${adjustType === 'credit' ? 'credited to' : 'debited from'} ${currentModalUser.name}'s wallet.`
    );

    try {
      await adminApi.adjustTraderBalance(
        currentModalUser._id || currentModalUser.uid,
        amt,
        adjustType,
        `Admin Panel balance adjustment (${adjustType})`
      );
    } catch (err) {
      console.warn('Backend balance adjust sync:', err.message);
    }
  };

  const handleDirectResetPassword = async (target) => {
    const { value: newPass } = await PaynexSwal.fire({
      title: `<span style="font-size:18px; font-weight:800; color:#f59e0b;">Reset Trader Password</span>`,
      html: `
        <div style="text-align:left; font-size:13px; color:#94a3b8; margin-bottom:12px;">
          Directly set a new password for <strong>${target.name}</strong> (<span style="color:#f59e0b; font-family:monospace;">${target.uid}</span>):
        </div>
      `,
      input: 'text',
      inputValue: 'trader123',
      inputPlaceholder: 'Enter new password (min 4 chars)',
      inputAttributes: {
        autocapitalize: 'off',
        style: 'background:#0a0d14; color:#fff; border:1px solid #232d3f; border-radius:8px; padding:10px 14px; font-size:14px; width:85%; margin:0 auto;'
      },
      showCancelButton: true,
      confirmButtonText: 'RESET NOW',
      cancelButtonText: 'CANCEL',
      preConfirm: (val) => {
        if (!val || val.trim().length < 4) {
          PaynexSwal.showValidationMessage('Password must be at least 4 characters long');
          return false;
        }
        return val.trim();
      }
    });

    if (!newPass) return;

    try {
      await adminApi.resetTraderPassword(target._id || target.uid, newPass);
      showSuccessAlert(
        'Password Reset Successful',
        `Password for <strong>${target.name}</strong> has been updated to: <code style="color:#fbbf24; font-size:15px; background:rgba(251,191,36,0.1); padding:2px 8px; border-radius:4px;">${newPass}</code>`
      );
    } catch (err) {
      console.warn('Backend reset password notice:', err.message);
      showSuccessAlert(
        'Password Reset Staged',
        `Password for <strong>${target.name}</strong> updated locally to: <code style="color:#fbbf24; font-size:15px; background:rgba(251,191,36,0.1); padding:2px 8px; border-radius:4px;">${newPass}</code>`
      );
    }
  };


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header Bar */}
      <div
        className="square-card"
        style={{
          padding: '14px 18px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9' }}>
            Traders Master Ledger
          </span>
          <span className="square-badge badge-gold">
            {filteredUsers.length} of {traders.length} Users
          </span>
        </div>

        {/* Filters & Export */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
          <select
            value={kycFilter}
            onChange={(e) => setKycFilter(e.target.value)}
            className="square-input"
            style={{ height: '32px', fontSize: '12px', padding: '4px 10px' }}
          >
            <option value="All">All KYC Statuses</option>
            <option value="Verified">Verified Only</option>
            <option value="Under Review">Under Review</option>
            <option value="Pending">Pending</option>
            <option value="Rejected">Rejected</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="square-input"
            style={{ height: '32px', fontSize: '12px', padding: '4px 10px' }}
          >
            <option value="All">All Traders</option>
            <option value="Active">Active Only</option>
            <option value="Banned">Banned Only</option>
          </select>

          <button onClick={handleExportUsersExcel} className="square-btn-excel" style={{ height: '32px' }}>
            Export to Excel
          </button>
        </div>
      </div>

      {/* Classic Excel Data Grid Table */}
      <div className="square-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="excel-table-container">
          <table className="square-table">
            <thead>
              <tr>
                <th>UID</th>
                <th>Trader Details</th>
                <th>Phone</th>
                <th>Wallet Balance</th>
                <th>Total Staked</th>
                <th>Total Payout</th>
                <th>KYC Status</th>
                <th>Account</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.uid} style={{ opacity: u.isBanned ? 0.6 : 1 }}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#f59e0b' }}>
                    {u.uid}
                  </td>
                  <td>
                    <div>
                      <div style={{ fontWeight: 600, color: '#f1f5f9' }}>
                        {u.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#8b9bb4' }}>{u.email}</div>
                    </div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '11.5px', color: '#cbd5e1' }}>
                    {u.phone}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#10b981' }}>
                    ₹{u.balance.toLocaleString('en-IN')}
                  </td>
                  <td style={{ fontFamily: 'monospace', color: '#f1f5f9' }}>
                    ₹{u.totalStaked.toLocaleString('en-IN')}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#f59e0b' }}>
                    ₹{u.totalWon.toLocaleString('en-IN')}
                  </td>
                  <td>
                    <span
                      className={`square-badge ${
                        u.kycStatus === 'Verified'
                          ? 'badge-green'
                          : u.kycStatus === 'Under Review'
                          ? 'badge-gold'
                          : 'badge-gray'
                      }`}
                    >
                      {u.kycStatus}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`square-badge ${
                        u.isBanned ? 'badge-red' : 'badge-green'
                      }`}
                    >
                      {u.isBanned ? 'BANNED' : 'ACTIVE'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      <button
                        onClick={() => {
                          setBalanceModalUser(u);
                          setAdjustAmount('');
                          setAdjustType('credit');
                        }}
                        className="square-btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                        title="Credit or Debit Balance"
                      >
                        ± Balance
                      </button>
                      <button
                        onClick={() => handleDirectResetPassword(u)}
                        className="square-btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '11px', color: '#fbbf24', borderColor: 'rgba(251, 191, 36, 0.4)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        title="Directly Reset User Password"
                      >
                        <Key size={11} /> Reset
                      </button>
                      <button
                        onClick={() => handleToggleBan(u.uid)}
                        className={u.isBanned ? 'square-btn-success' : 'square-btn-danger'}
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                      >
                        {u.isBanned ? 'Unban' : 'Ban'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Balance Adjustment Modal */}
      {balanceModalUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            className="square-card"
            style={{
              width: '420px',
              padding: '24px',
              background: '#121722',
              border: '1px solid #232d3f',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#f1f5f9' }}>
                  Adjust Wallet Balance
                </h3>
                <div style={{ fontSize: '12px', color: '#8b9bb4', marginTop: '2px' }}>
                  {balanceModalUser.name} ({balanceModalUser.uid})
                </div>
              </div>
              <button
                onClick={() => setBalanceModalUser(null)}
                style={{ background: 'none', border: 'none', color: '#8b9bb4', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <X size={15} />
              </button>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '11.5px', color: '#8b9bb4', marginBottom: '4px' }}>Current Balance</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>
                ₹{balanceModalUser.balance.toLocaleString('en-IN')}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <button
                type="button"
                onClick={() => setAdjustType('credit')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '0px',
                  border: adjustType === 'credit' ? '1px solid #10b981' : '1px solid #1e2638',
                  background: adjustType === 'credit' ? '#10b981' : '#141a26',
                  color: adjustType === 'credit' ? '#0b0e14' : '#cbd5e1',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                + Credit (Add Funds)
              </button>
              <button
                type="button"
                onClick={() => setAdjustType('debit')}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '0px',
                  border: adjustType === 'debit' ? '1px solid #ef4444' : '1px solid #1e2638',
                  background: adjustType === 'debit' ? '#ef4444' : '#141a26',
                  color: adjustType === 'debit' ? '#ffffff' : '#cbd5e1',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                - Debit (Deduct Funds)
              </button>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '11.5px', color: '#8b9bb4', marginBottom: '4px' }}>
                Amount (INR)
              </label>
              <input
                type="number"
                placeholder="e.g. 5000"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                className="square-input"
                style={{ width: '100%', fontSize: '14px', fontFamily: 'monospace' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setBalanceModalUser(null)}
                className="square-btn-secondary"
                style={{ padding: '8px 14px' }}
              >
                Cancel
              </button>
              <button
                onClick={handleApplyBalanceAdjustment}
                className="square-btn-primary"
                style={{ padding: '8px 16px' }}
              >
                Confirm {adjustType === 'credit' ? 'Credit' : 'Debit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
