"use client";

import { useState } from "react";

export default function TestPage() {
  const [count, setCount] = useState(0);
  const [clicked, setClicked] = useState(false);

  return (
    <div style={{ padding: "50px", fontFamily: "sans-serif" }}>
      <h1>React Interactivity Test</h1>
      <p>Count: {count}</p>
      <p>Clicked: {clicked ? "YES" : "NO"}</p>

      <button
        onClick={() => {
          console.log("Button clicked!");
          setCount(count + 1);
          setClicked(true);
        }}
        style={{
          padding: "20px 40px",
          fontSize: "18px",
          backgroundColor: "blue",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          marginTop: "20px",
        }}
      >
        CLICK ME (Count: {count})
      </button>

      <p style={{ marginTop: "20px", color: "gray" }}>
        If clicking the button changes the count, React is working.
        <br />
        Check browser console (F12) for "Button clicked!" message.
      </p>
    </div>
  );
}
