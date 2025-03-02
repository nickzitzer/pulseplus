import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import api from '@/utils/api';
import { useAuth } from '@/context/auth';

interface SSOProvider {
  sys_id: string;
  name: string;
  entity_id: string;
  single_sign_on_service: string;
  single_logout_service: string;
  certificate: string;
  active: boolean;
}

/**
 * SSO Provider Management Page
 * 
 * Purpose: Authentication integration
 * Route: /admin/sso-providers
 * Key Components: Provider configuration, Status monitoring, Testing tools, User assignment, Security settings, Audit logging
 */
const SSOProviderManagementPage = () => {
  const [providers, setProviders] = useState<SSOProvider[]>([]);
  const [metadata, setMetadata] = useState('');
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const response = await api.get('/auth/sso-providers');
      setProviders(response.data);
    } catch (error) {
      console.error('Error fetching SSO providers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleImportMetadata = async () => {
    if (!metadata) return;
    
    try {
      await api.post('/auth/sso-providers/import', { metadata });
      alert('Metadata imported successfully');
      fetchProviders();
      setMetadata('');
    } catch (error) {
      console.error('Error importing metadata:', error);
      alert('Error importing metadata');
    }
  };

  const handleExportMetadata = async (providerId: string) => {
    try {
      const response = await api.get(`/auth/sso-providers/${providerId}/metadata`);
      // Create a blob and download it
      const blob = new Blob([response.data], { type: 'text/xml' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sso-provider-${providerId}-metadata.xml`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting metadata:', error);
      alert('Error exporting metadata');
    }
  };

  const handleToggleActive = async (providerId: string, currentActive: boolean) => {
    try {
      await api.patch(`/auth/sso-providers/${providerId}`, {
        active: !currentActive
      });
      fetchProviders();
    } catch (error) {
      console.error('Error toggling provider status:', error);
      alert('Error updating provider status');
    }
  };

  return (
    <>
      <Head>
        <title>SSO Provider Management | PulsePlus</title>
      </Head>
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-4">SSO Provider Management</h1>
          <p className="text-gray-600 mb-6">Authentication integration</p>
          
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Import SSO Provider Metadata</h2>
            <textarea
              className="w-full p-2 border border-gray-300 rounded mb-2"
              rows={5}
              value={metadata}
              onChange={(e) => setMetadata(e.target.value)}
              placeholder="Paste XML metadata here"
            />
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              onClick={handleImportMetadata}
            >
              Import
            </button>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">SSO Providers</h2>
            {loading ? (
              <p>Loading providers...</p>
            ) : providers.length === 0 ? (
              <p>No SSO providers configured</p>
            ) : (
              <div className="space-y-4">
                {providers.map((provider) => (
                  <div key={provider.sys_id} className="border border-gray-200 rounded p-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-medium">{provider.name}</h3>
                      <div className="flex space-x-2">
                        <button
                          className={`px-3 py-1 rounded text-white ${
                            provider.active ? 'bg-green-500' : 'bg-gray-500'
                          }`}
                          onClick={() => handleToggleActive(provider.sys_id, provider.active)}
                        >
                          {provider.active ? 'Active' : 'Inactive'}
                        </button>
                        <button
                          className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                          onClick={() => handleExportMetadata(provider.sys_id)}
                        >
                          Export Metadata
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      <p>Entity ID: {provider.entity_id}</p>
                      <p>SSO URL: {provider.single_sign_on_service}</p>
                      <p>SLO URL: {provider.single_logout_service}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default SSOProviderManagementPage;
