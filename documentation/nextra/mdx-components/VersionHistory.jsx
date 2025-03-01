import React from 'react';

export function VersionHistory({ versions }) {
  return (
    <div className="version-history">
      <h3>Version History</h3>
      <table>
        <thead>
          <tr>
            <th>Version</th>
            <th>Date</th>
            <th>Changes</th>
          </tr>
        </thead>
        <tbody>
          {versions.map((version, index) => (
            <tr key={index}>
              <td>{version.version}</td>
              <td>{version.date}</td>
              <td>
                <ul>
                  {version.changes.map((change, changeIndex) => (
                    <li key={changeIndex}>{change}</li>
                  ))}
                </ul>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 