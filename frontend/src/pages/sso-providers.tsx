import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/auth';

interface SSOProvider {
  sys_id: string;
  name: string;
  entity_id: string;
  single_sign_on_service: string;
  single_logout_service: string;
  certificate: string;
  active: boolean;
}

const SSOProvidersPage: React.FC = () => {
  const [providers, setProviders] = useState<SSOProvider[]>([]);
  const [metadata, setMetadata] = useState('');
  const { user } = useAuth();

  const fetchProviders = async () => {
    try {
      const response = await api.get('/auth/sso-providers');
      setProviders(response.data);
    } catch (error) {
      console.error('Error fetching SSO providers:', error);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []); // Empty dependency array ensures it runs only once on mount

  const handleImportMetadata = async () => {
    try {
      await api.post('/sso/import-metadata', { metadata });
      setMetadata('');
      fetchProviders();
    } catch (error) {
      console.error('Error importing metadata:', error);
    }
  };

  const handleExportMetadata = async (providerId: string) => {
    try {
      const response = await api.get(`/sso/export-metadata/${providerId}`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'application/xml' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sso-metadata-${providerId}.xml`;
      a.click();
    } catch (error) {
      console.error('Error exporting metadata:', error);
    }
  };

  if (user?.role as string !== 'admin') {
    return <div>Access Denied</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Manage SSO Providers</h1>
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Import Metadata</h2>
        <textarea
          className="w-full h-32 p-2 border rounded"
          value={metadata}
          onChange={(e) => setMetadata(e.target.value)}
          placeholder="Paste SAML metadata XML here"
        />
        <button
          className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
          onClick={handleImportMetadata}
        >
          Import
        </button>
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-2">SSO Providers</h2>
        <table className="w-full border-collapse border">
          <thead>
            <tr>
              <th className="border p-2">Name</th>
              <th className="border p-2">Entity ID</th>
              <th className="border p-2">Active</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {providers.map((provider) => (
              <tr key={provider.sys_id}>
                <td className="border p-2">{provider.name}</td>
                <td className="border p-2">{provider.entity_id}</td>
                <td className="border p-2">{provider.active ? 'Yes' : 'No'}</td>
                <td className="border p-2">
                  <button
                    className="bg-green-500 text-white px-2 py-1 rounded mr-2"
                    onClick={() => handleExportMetadata(provider.sys_id)}
                  >
                    Export Metadata
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SSOProvidersPage;