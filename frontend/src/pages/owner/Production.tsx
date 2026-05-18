import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import ProgressBar from '../../components/ProgressBar';
import { getProductionJobs, updateProductionJob } from '../../lib/api/ordersQuotesService';

interface Stage {
  stage: string;
  status: string;
}

interface Job {
  id: string;
  itemId: number;
  orderId: number;
  orderStatus: string;
  client: string;
  product: string;
  qty: number;
  completedQty: number;
  status: string;
  currentStep: string;
  dueDate: string;
  notes: string;
  stages: Stage[];
}

const STEP_ORDER = ['pending', 'design', 'printing', 'cutting', 'packaging', 'ready'];
const STEP_LABELS: Record<string, string> = {
  pending: 'Ready for production',
  design: 'Design',
  printing: 'Printing',
  cutting: 'Cutting',
  packaging: 'Packaging',
  ready: 'Ready',
};

function formatDate(isoDate: string | null): string {
  if (!isoDate) return '-';
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getProgress(job: Job): number {
  if (job.qty <= 0) return 0;
  return Math.round((job.completedQty / job.qty) * 100);
}

function progressColor(progress: number): 'green' | 'orange' | undefined {
  if (progress === 100) return 'green';
  if (progress >= 50) return 'orange';
  return undefined;
}

function buildStages(currentStep: string, status: string): Stage[] {
  const currentIndex = Math.max(STEP_ORDER.indexOf(currentStep), 0);
  return STEP_ORDER.map((step, index) => ({
    stage: STEP_LABELS[step],
    status: index < currentIndex ? 'completed' : index === currentIndex ? status : 'pending',
  }));
}

function mapJob(job: any): Job {
  const currentStep = job.current_step || 'pending';
  const completedQty = Number(job.completed_quantity || 0);
  const qty = Number(job.quantity || 0);

  return {
    id: String(job.job_id || `JOB-${job.id}`),
    itemId: Number(job.id),
    orderId: Number(job.order_id),
    orderStatus: job.order_status || 'CONFIRMED',
    client: job.client_name || 'Unknown',
    product: job.product || 'Order Item',
    qty,
    completedQty,
    status: job.status || 'ready_for_production',
    currentStep,
    dueDate: formatDate(job.due_date),
    notes: job.notes || '-',
    stages: buildStages(currentStep, job.status || 'ready_for_production'),
  };
}

export default function Production() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showWorkView, setShowWorkView] = useState(false);
  const [savingJobId, setSavingJobId] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getProductionJobs();
      const jobList = (response.data.data || []).map(mapJob);
      setJobs(jobList);
      setSelectedJob((current) => {
        if (!jobList.length) return null;
        if (!current) return jobList[0];
        return jobList.find((job) => job.itemId === current.itemId) || jobList[0];
      });
    } catch (err) {
      console.error('Failed to load production data:', err);
      setError('Could not load production data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStepUpdate = async (job: Job, currentStep: string) => {
    setSavingJobId(job.itemId);
    try {
      await updateProductionJob(job.itemId, { current_step: currentStep });
      await fetchData();
    } catch (err) {
      console.error('Failed to update production job:', err);
      setError('Could not update production job.');
    } finally {
      setSavingJobId(null);
    }
  };

  const activeJobs = jobs.filter((job) => job.status !== 'completed').length;
  const inProgress = jobs.filter((job) => job.status === 'in_progress').length;
  const ready = jobs.filter((job) => job.status === 'ready_for_production').length;
  const completed = jobs.filter((job) => job.status === 'completed').length;

  const filtered = jobs.filter((job) => {
    const q = query.toLowerCase();
    const matchesQuery = !q
      || job.id.toLowerCase().includes(q)
      || String(job.orderId).includes(q)
      || job.client.toLowerCase().includes(q)
      || job.product.toLowerCase().includes(q);
    const matchesStatus = !filterStatus || job.status === filterStatus || job.currentStep === filterStatus;
    return matchesQuery && matchesStatus;
  });

  if (loading) {
    return (
      <AppShell role="owner" activePage="owner-production">
        <Topbar title="Production Dashboard" />
        <div className="loading-state">Loading production data...</div>
      </AppShell>
    );
  }

  return (
    <AppShell role="owner" activePage="owner-production">
      <Topbar title="Production Dashboard" />

      {error && <div className="error-state" style={{ marginBottom: 12 }}>{error}</div>}

      <section className="grid-4" style={{ marginBottom: 14 }}>
        <StatCard label="Active Jobs" value={activeJobs} sub="Confirmed/in-progress items" />
        <StatCard label="Ready" value={ready} sub="Not started yet" />
        <StatCard label="In Progress" value={inProgress} sub="Being worked on" />
        <StatCard label="Completed" value={completed} sub="Ready items still in active orders" />
      </section>

      <section className="production-layout">
        <div className="stack">
          <article className="table-wrap">
            <div className="table-head">
              <h3>All Jobs</h3>
              <div className="search-container">
                <input
                  className="input"
                  type="search"
                  placeholder="Search by job ID, order, client or product..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <button className="filter-icon" type="button" onClick={() => setDropdownOpen((open) => !open)}>v</button>
                {dropdownOpen && (
                  <div className="filter-dropdown show">
                    <div className="field">
                      <label>Status</label>
                      <select className="select" value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>
                        <option value="">All</option>
                        <option value="ready_for_production">Ready</option>
                        <option value="design">Design</option>
                        <option value="printing">Printing</option>
                        <option value="cutting">Cutting</option>
                        <option value="packaging">Packaging</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                    <button className="btn primary" type="button" onClick={() => setDropdownOpen(false)}>Apply</button>
                  </div>
                )}
              </div>
            </div>

            <div className="job-cards">
              {filtered.length === 0 ? (
                <p className="muted" style={{ padding: '12px 0' }}>No production jobs found.</p>
              ) : filtered.map((job) => {
                const progress = getProgress(job);
                return (
                  <article
                    key={job.id}
                    className={`card${selectedJob?.itemId === job.itemId ? ' card--selected' : ''}`}
                    onClick={() => setSelectedJob(job)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <h4>{job.id}</h4>
                      <StatusBadge status={job.status} />
                    </div>
                    <p style={{ marginBottom: 2 }}><strong>Order:</strong> #{job.orderId}</p>
                    <p style={{ marginBottom: 2 }}><strong>Client:</strong> {job.client}</p>
                    <p style={{ marginBottom: 2 }}><strong>Product:</strong> {job.product} - {job.qty} pcs</p>
                    <p style={{ marginBottom: 6 }}><strong>Step:</strong> {STEP_LABELS[job.currentStep] || job.currentStep}</p>
                    <ProgressBar percent={progress} color={progressColor(progress)} />
                    <p style={{ fontSize: 11, marginTop: 4, color: 'var(--muted)' }}>
                      {job.completedQty} / {job.qty} completed ({progress}%)
                    </p>
                    <div className="card-actions">
                      <button
                        className="btn"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedJob(job);
                          setShowWorkView(true);
                        }}
                      >
                        Open Work View
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </article>
        </div>

        {selectedJob && (
          <aside className="box" style={{ alignSelf: 'flex-start', position: 'sticky', top: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <h3 style={{ fontSize: 17 }}>{selectedJob.id}</h3>
              <StatusBadge status={selectedJob.status} />
            </div>
            <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>
              Order #{selectedJob.orderId} - {selectedJob.client}
            </p>

            <div className="line" />

            <h4 style={{ margin: '12px 0 8px' }}>Job Details</h4>
            <ul style={{ listStyle: 'none', display: 'grid', gap: 6, fontSize: 13 }}>
              <li><strong>Product:</strong> {selectedJob.product}</li>
              <li><strong>Quantity:</strong> {selectedJob.qty} pcs</li>
              <li><strong>Order Status:</strong> {selectedJob.orderStatus}</li>
              <li><strong>Due Date:</strong> {selectedJob.dueDate}</li>
            </ul>

            <div className="line" />

            <h4 style={{ margin: '12px 0 8px' }}>Progress</h4>
            <ProgressBar percent={getProgress(selectedJob)} color={progressColor(getProgress(selectedJob))} />
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
              {selectedJob.completedQty} / {selectedJob.qty} ({getProgress(selectedJob)}%) complete
            </p>

            <div className="line" />

            <h4 style={{ margin: '12px 0 8px' }}>Update Step</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {STEP_ORDER.slice(1).map((step) => (
                <button
                  key={step}
                  className={step === 'ready' ? 'btn primary' : 'btn'}
                  disabled={savingJobId === selectedJob.itemId}
                  onClick={() => handleStepUpdate(selectedJob, step)}
                >
                  {STEP_LABELS[step]}
                </button>
              ))}
            </div>

            <div className="line" />

            <button className="btn primary block" style={{ marginTop: 4 }} onClick={() => setShowWorkView(true)}>
              Open Work View
            </button>
          </aside>
        )}
      </section>

      {showWorkView && selectedJob && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '32px 16px',
            overflowY: 'auto',
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowWorkView(false);
          }}
        >
          <div style={{
            background: 'var(--surface, #fff)',
            borderRadius: 12,
            width: '100%',
            maxWidth: 680,
            boxShadow: '0 25px 50px rgba(0,0,0,0.35)',
            overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 20px',
              borderBottom: '1px solid var(--border, #e4e6eb)',
              position: 'sticky',
              top: 0,
              background: 'var(--surface, #fff)',
              zIndex: 1,
            }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Work View - {selectedJob.id}</h2>
              <button className="btn" onClick={() => setShowWorkView(false)}>Close</button>
            </div>
            <div style={{ padding: 20 }}>
              <h3 style={{ marginBottom: 8 }}>Work Progress - {selectedJob.id}</h3>
              <ProgressBar percent={getProgress(selectedJob)} color={progressColor(getProgress(selectedJob))} />
              <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6, marginBottom: 16 }}>
                {selectedJob.completedQty} / {selectedJob.qty} completed ({getProgress(selectedJob)}%)
              </p>
              <table className="orders-table" style={{ marginBottom: 24 }}>
                <thead>
                  <tr><th>Stage</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {selectedJob.stages.map((stage) => (
                    <tr key={stage.stage}>
                      <td>{stage.stage}</td>
                      <td><StatusBadge status={stage.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <h3 style={{ marginBottom: 12 }}>Job Info</h3>
              <div className="form-grid-2" style={{ fontSize: 14, gap: 8 }}>
                <p><strong>Client:</strong> {selectedJob.client}</p>
                <p><strong>Order:</strong> #{selectedJob.orderId}</p>
                <p><strong>Product:</strong> {selectedJob.product}</p>
                <p><strong>Quantity:</strong> {selectedJob.qty}</p>
                <p><strong>Status:</strong> <StatusBadge status={selectedJob.status} /></p>
                <p><strong>Current Step:</strong> {STEP_LABELS[selectedJob.currentStep] || selectedJob.currentStep}</p>
                <p><strong>Deadline:</strong> {selectedJob.dueDate}</p>
                <p style={{ gridColumn: '1 / -1' }}><strong>Notes:</strong> {selectedJob.notes}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
