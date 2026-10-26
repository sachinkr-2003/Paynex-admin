import { useState } from 'react';
import { exportToExcel } from '../utils/exportToExcel';
import { X } from 'lucide-react';

export default function PlansPage({ plans, setPlans, showToast, searchQuery = '' }) {
  const [editingPlan, setEditingPlan] = useState(null);
  const [formValues, setFormValues] = useState({});

  const filteredPlans = plans.filter((p) => {
    const q = searchQuery.toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
  });

  const handleExportPlansExcel = () => {
    const headers = [
      { label: 'Plan ID', accessor: 'id' },
      { label: 'Plan Name', accessor: 'name' },
      { label: 'Daily Profit %', accessor: (p) => `${p.dailyProfit}%` },
      { label: 'Duration (Days)', accessor: 'durationDays' },
      { label: 'Total Yield %', accessor: (p) => `${p.totalYield}%` },
      { label: 'Min Investment (INR)', accessor: (p) => `₹${p.minAmount}` },
      { label: 'Max Investment (INR)', accessor: (p) => `₹${p.maxAmount}` },
      { label: 'Active Subscribers', accessor: 'activeSubscribers' },
      { label: 'Status', accessor: (p) => (p.isEnabled ? 'ENABLED' : 'DISABLED') },
    ];
    exportToExcel('PAYNEX_Investment_Plans', headers, filteredPlans);
    showToast('Plans sheet exported to Excel');
  };

  const handleTogglePlan = (id) => {
    setPlans((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const next = !p.isEnabled;
          showToast(`Plan ${p.name} is now ${next ? 'ENABLED' : 'DISABLED'}`);
          return { ...p, isEnabled: next };
        }
        return p;
      })
    );
  };

  const handleOpenEdit = (plan) => {
    setEditingPlan(plan);
    setFormValues({ ...plan });
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    setPlans((prev) =>
      prev.map((p) => (p.id === editingPlan.id ? { ...p, ...formValues } : p))
    );
    showToast(`Plan ${editingPlan.name} updated successfully!`);
    setEditingPlan(null);
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
            Investment Staking Plans
          </span>
          <span className="square-badge badge-gold">
            {plans.length} Tiered Packages
          </span>
        </div>

        <button onClick={handleExportPlansExcel} className="square-btn-excel" style={{ height: '32px' }}>
          Export Plans (Excel)
        </button>
      </div>

      {/* Plans Grid (Classic Minimalist Cards) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '16px' }}>
        {filteredPlans.map((plan) => (
          <div
            key={plan.id}
            className="square-card"
            style={{
              padding: '18px',
              borderTop: `3px solid ${plan.color || '#f59e0b'}`,
              opacity: plan.isEnabled ? 1 : 0.6,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
                  {plan.name}
                </h3>
                <div style={{ fontSize: '11px', color: '#8b9bb4', marginTop: '2px' }}>
                  {plan.durationDays} Days Duration
                </div>
              </div>
              <span
                className={`square-badge ${
                  plan.isEnabled ? 'badge-green' : 'badge-gray'
                }`}
              >
                {plan.isEnabled ? 'Active' : 'Disabled'}
              </span>
            </div>

            <div style={{ background: '#0b0e15', border: '1px solid #1a2233', padding: '12px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#8b9bb4' }}>Daily Profit:</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#f59e0b', fontFamily: 'monospace' }}>
                  +{plan.dailyProfit}% / day
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#8b9bb4' }}>Total Yield:</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>
                  +{plan.totalYield}%
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#8b9bb4' }}>Capital Range:</span>
                <span style={{ fontSize: '12px', color: '#f1f5f9', fontFamily: 'monospace' }}>
                  ₹{plan.minAmount.toLocaleString('en-IN')} - ₹{plan.maxAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: '#8b9bb4' }}>Subscribers:</span>
                <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
                  {plan.activeSubscribers} traders
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleTogglePlan(plan.id)}
                className={plan.isEnabled ? 'square-btn-danger' : 'square-btn-success'}
                style={{ flex: 1, padding: '7px' }}
              >
                {plan.isEnabled ? 'Disable Plan' : 'Enable Plan'}
              </button>
              <button
                onClick={() => handleOpenEdit(plan)}
                className="square-btn-secondary"
                style={{ flex: 1, padding: '7px' }}
              >
                Edit Parameters
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Plan Modal */}
      {editingPlan && (
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
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#f1f5f9' }}>
                Edit {editingPlan.name}
              </h3>
              <button
                onClick={() => setEditingPlan(null)}
                style={{ background: 'none', border: 'none', color: '#8b9bb4', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11.5px', color: '#8b9bb4', marginBottom: '4px' }}>
                  Daily Profit %
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formValues.dailyProfit || ''}
                  onChange={(e) => setFormValues({ ...formValues, dailyProfit: Number(e.target.value) })}
                  className="square-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11.5px', color: '#8b9bb4', marginBottom: '4px' }}>
                  Duration (Days)
                </label>
                <input
                  type="number"
                  value={formValues.durationDays || ''}
                  onChange={(e) => setFormValues({ ...formValues, durationDays: Number(e.target.value) })}
                  className="square-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', color: '#8b9bb4', marginBottom: '4px' }}>
                    Min Capital (₹)
                  </label>
                  <input
                    type="number"
                    value={formValues.minAmount || ''}
                    onChange={(e) => setFormValues({ ...formValues, minAmount: Number(e.target.value) })}
                    className="square-input"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', color: '#8b9bb4', marginBottom: '4px' }}>
                    Max Capital (₹)
                  </label>
                  <input
                    type="number"
                    value={formValues.maxAmount || ''}
                    onChange={(e) => setFormValues({ ...formValues, maxAmount: Number(e.target.value) })}
                    className="square-input"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="square-btn-secondary"
                  style={{ padding: '8px 14px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="square-btn-primary"
                  style={{ padding: '8px 16px' }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
