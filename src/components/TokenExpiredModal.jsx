const TokenExpiredModal = ({ onRefresh, onLogout, isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Session Expired</h2>
        <p>Your session has expired. Do you want to refresh and continue, or log out?</p>
        <div className="modal-buttons">
          <button onClick={onRefresh} className="refresh-btn">Refresh</button>
          <button onClick={onLogout} className="logout-btn">Logout</button>
        </div>
      </div>
    </div>
  );
};

export default TokenExpiredModal;