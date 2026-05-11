import { useCallback, useEffect, useState } from "react";
import { statusApi } from "../../../api";

function StatusPage() {
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const getStatusLabel = () => {
    if (status) {
      return status.toUpperCase();
    }

    if (isLoading) {
      return "LOADING...";
    }

    return "UNAVAILABLE";
  };

  const getStatusTone = () => {
    if (status === "on") {
      return "status-pill status-on";
    }

    if (status === "off") {
      return "status-pill status-off";
    }

    return "status-pill";
  };

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const newStatus = await statusApi.getStatus();
      setStatus(newStatus);
    } catch (error) {
      console.error("Error fetching status:", error);
      setErrorMessage(error.message || "Unable to refresh status right now.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendCommand = async (command) => {
    setErrorMessage("");

    try {
      const newStatus = await statusApi.sendCommand(command);
      setStatus(newStatus);
    } catch (error) {
      console.error("Error sending command:", error);
      setErrorMessage(error.message || `Unable to turn ${command.toUpperCase()} right now.`);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchStatus();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchStatus]);

  return (
    <section className="panel-stack">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Live device control</p>
          <h2>Device Status</h2>
        </div>
        <span className={getStatusTone()}>{getStatusLabel()}</span>
      </div>

      {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}

      <div className="button-row">
        <button
          type="button"
          onClick={() => sendCommand("on")}
          disabled={isLoading}
          className="success-button"
        >
          Turn ON
        </button>
        <button
          type="button"
          onClick={() => sendCommand("off")}
          disabled={isLoading}
          className="danger-button"
        >
          Turn OFF
        </button>
        <button
          type="button"
          onClick={fetchStatus}
          disabled={isLoading}
          className="secondary-button"
        >
          {isLoading ? "Refreshing..." : "Refresh Status"}
        </button>
      </div>
    </section>
  );
}

export default StatusPage;
