import AppShell from '../../components/AppShell';
import Topbar from '../../components/Topbar';
import ProgressBar from '../../components/ProgressBar';

interface Props { onNavigate: (page: string) => void; }

export default function ManagerOrderDetails({ onNavigate }: Props) {
  return (
    <AppShell role="manager" activePage="active-jobs" onNavigate={onNavigate}>
      <Topbar title="Order Details #1033" userName="Manager View" />
      <section className="order-layout">
        <article className="stack">
          <section className="box">
            <h3>Order Overview</h3>
            <div className="spec-grid">
              <p>Client Name <span>Client Name</span></p>
              <p>Batch Code <span>B-260426-P</span></p>
              <p>Product <span>Packaging Sleeves</span></p>
              <p>Status <span>UNPRICED</span></p>
              <p>Quantity <span>2500</span></p>
              <p>Deadline <span>30 Apr 2026</span></p>
            </div>
          </section>
          <section className="box">
            <h3>Production Progress</h3>
            <p><strong>Current Step:</strong> File review</p>
            <ProgressBar percent={30} style={{ marginTop: 10 }} />
            <ul style={{ marginTop: 10 }}>
              <li>Prepress: Completed</li>
              <li>Printing: Not started</li>
              <li>Finishing: Not started</li>
              <li>QC: Not started</li>
            </ul>
          </section>
        </article>
        <aside className="box">
          <h3>Manager Actions</h3>
          <button className="btn primary block" onClick={() => onNavigate('edit-order')}>Edit Order</button>
          <button className="btn block" style={{ marginTop: 8 }} onClick={() => onNavigate('order-work-view')}>View Order Work</button>
          <button className="btn block" style={{ marginTop: 8 }} onClick={() => onNavigate('accounting')}>Send to Accounting</button>
        </aside>
      </section>
    </AppShell>
  );
}
