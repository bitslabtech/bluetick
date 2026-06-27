import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";

/**
 * GoogleRelay - invisible relay page for Google Contacts OAuth popup.
 * Fetches contacts using one-time token, posts to opener, closes self.
 */
const GoogleRelay = () => {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState("loading");
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        const token = searchParams.get("token");
        if (!token) {
            setStatus("error");
            setErrorMsg("Missing token. Please try again.");
            return;
        }

        const relay = async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/contacts/google/pending/${token}`);
                const contacts = res.data.contacts || [];
                if (window.opener && !window.opener.closed) {
                    window.opener.postMessage({ type: "GOOGLE_CONTACTS", contacts }, window.location.origin);
                }
                setStatus("done");
                setTimeout(() => window.close(), 200);
            } catch (err) {
                const msg = err.response?.data?.error || "Session expired. Please try again.";
                setErrorMsg(msg);
                setStatus("error");
                if (window.opener && !window.opener.closed) {
                    window.opener.postMessage({ type: "GOOGLE_CONTACTS_ERROR", error: msg }, window.location.origin);
                }
                setTimeout(() => window.close(), 3000);
            }
        };

        relay();
    }, [searchParams]);

    const containerStyle = {
        margin: 0, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        background: "#0f172a", color: "#fff", display: "flex", alignItems: "center",
        justifyContent: "center", minHeight: "100vh", flexDirection: "column",
        gap: "16px", textAlign: "center", padding: "24px"
    };

    return (
        <div style={containerStyle}>
            {status === "loading" && <>
                <div style={{ fontSize: 48 }}>⏳</div>
                <h2 style={{ fontSize: 20, fontWeight: 700 }}>Connecting to Google...</h2>
                <p style={{ fontSize: 14, color: "#94a3b8" }}>Fetching your contacts, please wait.</p>
            </>}
            {status === "done" && <>
                <div style={{ fontSize: 48 }}>✅</div>
                <h2 style={{ fontSize: 20, fontWeight: 700 }}>Contacts Sent!</h2>
                <p style={{ fontSize: 14, color: "#94a3b8" }}>This window is closing automatically...</p>
                <button onClick={() => window.close()} style={{
                    marginTop: 8, padding: "10px 24px", background: "#6366f1", color: "#fff",
                    border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer"
                }}>Close This Tab</button>
            </>}
            {status === "error" && <>
                <div style={{ fontSize: 48 }}>⚠️</div>
                <h2 style={{ fontSize: 20, fontWeight: 700 }}>Something went wrong</h2>
                <p style={{ fontSize: 14, color: "#94a3b8" }}>{errorMsg}</p>
                <p style={{ fontSize: 12, color: "#64748b" }}>This window will close. Please try again from the Contacts page.</p>
            </>}
        </div>
    );
};

export default GoogleRelay;
