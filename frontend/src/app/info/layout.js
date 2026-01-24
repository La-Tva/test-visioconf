import Sidebar from '../components/Sidebar';

export default function InfoLayout({ children }) {
  return (
    <div style={{ display: 'flex', width: '100%', minHeight: '100vh', background: '#F8FAFC' }}>
      <Sidebar />
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  );
}
