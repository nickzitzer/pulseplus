import React, { useEffect, useState } from 'react';
import api from '../utils/api';

interface SSOProvider {
  sys_id: string;
  name: string;
}

const SSOLoginButtons: React.FC = () => {
  const [providers, setProviders] = useState<SSOProvider[]>([]);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await api.get('/auth/sso-providers');
        setProviders(response.data);
      } catch (error) {
        console.error('Error fetching SSO providers:', error);
      }
    };
    fetchProviders();
  }, []);

  return (
    <div className="mt-4">
      {providers?.map((provider) => (
        <button
          key={provider.sys_id}
          onClick={() => window.location.href = `${api.defaults.baseURL}/auth/sso/${provider.sys_id}`}
          className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mb-2"
        >
          Sign in with {provider.name}
        </button>
      ))}
    </div>
  );
};

export default SSOLoginButtons;