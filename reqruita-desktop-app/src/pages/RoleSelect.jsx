import React, { useEffect } from "react";
import "./auth-ui.css";

import bg from "../assets/role-bg.png";
import logo from "../assets/reqruita-logo.png";

export default function RoleSelect({ onPickRole }) {
    // Disable scrolling only on this screen
    useEffect(() => {
        document.body.classList.add("rq-noscr");
        return () => document.body.classList.remove("rq-noscr");
    }, []);

    return (
        <div className="rs-shell">
            <div className="rs-left" style={{ backgroundImage: `url(${bg})` }}>
                <div className="rs-left-content">
                    <h1 className="rs-welcome">
                        Welcome to <br />
                        Reqruita!
                    </h1>
                </div>
            </div>

            <div className="rs-right">
                <div className="rs-panel">
                    <div className="rs-logo">
                        <img src={logo} alt="Reqruita" style={{ width: 72, height: 72 }} />
                    </div>

                    <button
                        className="rs-btn rs-btn-primary"
                        onClick={() => onPickRole("join")}
                    >
                        Join interview
                    </button>

                    <div className="rs-or">or</div>

                    <button
                        className="rs-btn"
                        onClick={() => onPickRole("conduct")}
                    >
                        Conduct interview
                    </button>
                </div>
            </div>
        </div>
    );
}
