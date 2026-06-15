import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import NewCampaign from './pages/NewCampaign';
import Analytics from './pages/Analytics';
import Customers from './pages/Customers';
import DataIngestion from './pages/DataIngestion';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/new-campaign" element={<NewCampaign />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/data-ingestion" element={<DataIngestion />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
