import './globals.css';
import Navbar from './components/Navbar';

export const metadata = {
  title: 'GPON Dashboard',
  description: 'GPON Planning System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>

        {/* 🔹 Global Navbar */}
        <Navbar />

        {/* 🔹 Page Content */}
        <div style={{ padding: '10px' }}>
          {children}
        </div>

      </body>
    </html>
  );
}