import React from 'react';

interface Version {
  version: string;
  date: string;
  changes: string[];
}

interface VersionHistoryProps {
  versions: Version[];
}

export const VersionHistory: React.FC<VersionHistoryProps> = ({ versions }) => (
  <div className="version-history">
    <h2>Version History</h2>
    {versions.map(version => (
      <div key={version.version}>
        <h3>{version.version} - {version.date}</h3>
        <ul>
          {version.changes.map(change => (
            <li key={change}>{change}</li>
          ))}
        </ul>
      </div>
    ))}
  </div>
); 