import Sidebar from '../components/Sidebar';

export default function HomeLayout({ children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F8FAFC' }} className="responsive-layout">
      <Sidebar />
      <div style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </div>
    </div>
  );
}
