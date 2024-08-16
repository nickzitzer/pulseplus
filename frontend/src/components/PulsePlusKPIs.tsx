import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import useAuthenticatedFetch from '../utils/api';



interface PulsePlusKPIsProps {
  gameId: string | undefined;
}

interface KPI {
  competitor: string;
  sys_id: string;
  name: string;
  value: number;
  year: string;
}

interface Competitor {
  sys_id: string;
  name: string;
  department: string;
  image: string;
  kpis: KPI[];
}

const PulsePlusKPIs: React.FC<PulsePlusKPIsProps> = ({ gameId }) => {
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [department, setDepartment] = useState('');
  const [sortColumn, setSortColumn] = useState('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchWithAuth = useAuthenticatedFetch();

  

  useEffect(() => {
    const fetchKPIData = async (gameId: string) => {
      try {
        const kpiResponse = await fetchWithAuth(`/kpis?game=${gameId}`);
        const competitorResponse = await fetchWithAuth(`/competitors?game=${gameId}`);
        const kpiInstanceResponse = await fetchWithAuth(`/kpi-instance-rollup?game=${gameId}&year=${year}`);

        const kpiData = kpiResponse.data;
        const competitorData = competitorResponse.data;
        const kpiInstanceData = kpiInstanceResponse.data;

        setKpis(kpiData);
        
        const competitorsWithKPIs = competitorData.map((competitor: Competitor) => ({
          ...competitor,
          kpis: kpiInstanceData.filter((kpi: KPI) => kpi.competitor === competitor.sys_id)
        }));
        setCompetitors(competitorsWithKPIs);
        setDepartments(Array.from(new Set(competitorsWithKPIs.map((c: Competitor) => c.department))));
      } catch (error) {
        console.error('Error fetching KPI data:', error);
        setError('Failed to load KPI data. Please try again later.');
      }
    };

    if (gameId) {
      fetchKPIData(gameId);
    }
  }, [gameId, fetchWithAuth, year]);


  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedCompetitors = [...competitors]
    .filter(comp => department === '' || comp.department === department)
    .sort((a, b) => {
      if (sortColumn === 'name') {
        return sortDirection === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      } else {
        const aKpi = a.kpis.find(k => k.name === sortColumn);
        const bKpi = b.kpis.find(k => k.name === sortColumn);
        const aValue = aKpi ? aKpi.value : 0;
        const bValue = bKpi ? bKpi.value : 0;
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
    });

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="pulseplus-kpis">
      <div className="mb-4 flex space-x-4">
        <select 
          value={year} 
          onChange={(e) => setYear(e.target.value)}
          className="border rounded p-2"
        >
          {[...Array(5)].map((_, i) => {
            const yearOption = (new Date().getFullYear() - i).toString();
            return <option key={yearOption} value={yearOption}>{yearOption}</option>;
          })}
        </select>
        <select 
          value={department} 
          onChange={(e) => setDepartment(e.target.value)}
          className="border rounded p-2"
        >
          <option value="">All Departments</option>
          {departments.map(dept => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-2 cursor-pointer" onClick={() => handleSort('name')}>
                Competitor {sortColumn === 'name' && (sortDirection === 'asc' ? <ChevronUp className="inline" /> : <ChevronDown className="inline" />)}
              </th>
              {kpis.map(kpi => (
                <th key={kpi.sys_id} className="p-2 cursor-pointer" onClick={() => handleSort(kpi.name)}>
                  {kpi.name} {sortColumn === kpi.name && (sortDirection === 'asc' ? <ChevronUp className="inline" /> : <ChevronDown className="inline" />)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedCompetitors.map(competitor => (
              <tr key={competitor.sys_id} className="border-b">
                <td className="p-2">
                  <div className="flex items-center">
                    <img src={competitor.image || '/next.svg'} alt={competitor.name} className="w-8 h-8 rounded-full mr-2" />
                    <div>
                      <div>{competitor.name}</div>
                      <div className="text-sm text-gray-500">{competitor.department}</div>
                    </div>
                  </div>
                </td>
                {kpis.map(kpi => {
                  const competitorKpi = competitor.kpis.find(k => k.name === kpi.name);
                  return (
                    <td key={kpi.sys_id} className="p-2 text-right">
                      {competitorKpi ? competitorKpi.value : 'N/A'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PulsePlusKPIs;