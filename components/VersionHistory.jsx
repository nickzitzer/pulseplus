// TODO: Implement version history component
export const VersionHistory = ({ versions }) => (
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