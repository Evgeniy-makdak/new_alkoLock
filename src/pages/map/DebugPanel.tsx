type DebugPanelProps = {
  debugInfo: string;
};

export const DebugPanel = ({ debugInfo }: DebugPanelProps) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 150,
        left: 10,
        zIndex: 1000,
        background: 'rgba(255, 255, 255, 0.8)',
        padding: '10px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        maxWidth: '450px',
        maxHeight: '200px',
        overflow: 'auto',
        fontSize: '12px',
      }}>
      <pre>{debugInfo}</pre>
    </div>
  );
};
