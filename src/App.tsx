import { useEffect, useMemo, useState } from "react";
import "./index.css";

const layout = [
  ["AC", "+/-", "%", "÷"],
  ["7", "8", "9", "×"],
  ["4", "5", "6", "−"],
  ["1", "2", "3", "+"],
  ["calc", "0", ".", "="],
] as const;

const operators = new Set(["+", "−", "×", "÷"]);

type CalcKey = (typeof layout)[number][number];

function formatDisplay(value: string) {
  if (!value) return "0";
  if (value === "Error") return value;

  const raw = value.replace(/−/g, "-").replace(/×/g, "*").replace(/÷/g, "/");
  const num = Number(raw);

  if (!Number.isNaN(num) && Number.isFinite(num)) {
    return num.toLocaleString("en-US", { maximumFractionDigits: 10 });
  }

  return value;
}

function sanitizeExpression(expr: string) {
  return expr
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/,/g, "")
    .trim();
}

function safeEval(expr: string) {
  const cleaned = sanitizeExpression(expr);

  if (!cleaned) return "0";
  if (!/^[0-9+\-*/.()\s]+$/.test(cleaned)) return "Error";

  try {
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${cleaned});`)();
    if (typeof result !== "number" || !Number.isFinite(result)) return "Error";
    return String(result);
  } catch {
    return "Error";
  }
}

function getLastTypedNumber(nextExpr: string) {
  const matches = nextExpr.match(/\d*\.?\d+/g);
  return matches && matches.length > 0 ? matches[matches.length - 1] : "";
}

function formatCurrentTime(date: Date) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function CalcIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="calc-icon"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4.5" y="2.75" width="15" height="18.5" rx="2.5" />
      <rect x="7.25" y="5.5" width="9.5" height="3.5" rx="1" />
      <circle cx="8.25" cy="12" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="15.75" cy="12" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="8.25" cy="15.5" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="12" cy="15.5" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="15.75" cy="15.5" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="8.25" cy="19" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="15.75" cy="19" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  );
}

function App() {
  useEffect(() => {
    const ensureMeta = (selector: string, attrs: Record<string, string>) => {
      let el = document.head.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        document.head.appendChild(el);
      }
      Object.entries(attrs).forEach(([key, value]) => el!.setAttribute(key, value));
    };

    ensureMeta('meta[name="viewport"]', {
      name: "viewport",
      content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
    });

    ensureMeta('meta[name="apple-mobile-web-app-capable"]', {
      name: "apple-mobile-web-app-capable",
      content: "yes",
    });

    ensureMeta('meta[name="apple-mobile-web-app-status-bar-style"]', {
      name: "apple-mobile-web-app-status-bar-style",
      content: "black-translucent",
    });

    ensureMeta('meta[name="apple-mobile-web-app-title"]', {
      name: "apple-mobile-web-app-title",
      content: "Calculator",
    });

    ensureMeta('meta[name="theme-color"]', {
      name: "theme-color",
      content: "#000000",
    });

    document.title = "Calculator";
    document.documentElement.style.background = "#000000";
    document.body.style.background = "#000000";
    document.body.style.margin = "0";
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
  }, []);

  const [expression, setExpression] = useState("");
  const [display, setDisplay] = useState("0");
  const [justEvaluated, setJustEvaluated] = useState(false);
  const [lastTypedNumber, setLastTypedNumber] = useState("");
  const [clearPrimed, setClearPrimed] = useState(false);
  const [currentTime, setCurrentTime] = useState(formatCurrentTime(new Date()));

  useEffect(() => {
    const updateTime = () => setCurrentTime(formatCurrentTime(new Date()));
    updateTime();

    const interval = window.setInterval(updateTime, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const secondaryLine = useMemo(() => {
    if (!expression || justEvaluated) return "";
    return expression;
  }, [expression, justEvaluated]);

  function syncState(nextExpr: string, nextDisplay?: string) {
    setExpression(nextExpr);
    setDisplay(nextDisplay ?? (nextExpr || "0"));
    setLastTypedNumber(getLastTypedNumber(nextExpr));
  }

  function handleDigit(value: string) {
    setClearPrimed(false);

    if (justEvaluated) {
      const next = value === "." ? "0." : value;
      syncState(next, next);
      setJustEvaluated(false);
      return;
    }

    let next = expression;
    const parts = next.split(/([+−×÷])/);
    const current = parts[parts.length - 1] || "";

    if (value === ".") {
      if (current.includes(".")) return;
      next += current === "" || operators.has(current) ? "0." : ".";
    } else if (current === "0") {
      parts[parts.length - 1] = value;
      next = parts.join("");
    } else {
      next += value;
    }

    syncState(next, next);
    setJustEvaluated(false);
  }

  function handleOperator(value: string) {
    setClearPrimed(false);

    if (display === "Error") {
      setExpression("");
      setDisplay("0");
      setJustEvaluated(false);
      return;
    }

    if (expression === "" && value === "−") {
      setExpression("−");
      setDisplay("−");
      setJustEvaluated(false);
      return;
    }

    if (expression === "") return;

    const lastChar = expression[expression.length - 1];
    const next = operators.has(lastChar) ? expression.slice(0, -1) + value : expression + value;
    setExpression(next);
    setDisplay(next);
    setJustEvaluated(false);
  }

  function handleEquals() {
    setClearPrimed(false);
    if (!expression) return;

    const result = safeEval(expression);
    setDisplay(result === "Error" ? "Error" : formatDisplay(result));
    setExpression(result === "Error" ? "" : result);
    setJustEvaluated(true);
  }

  function handlePercent() {
    setClearPrimed(false);
    const cleaned = sanitizeExpression(expression || display);
    const num = Number(cleaned);
    if (Number.isNaN(num)) return;

    const result = String(num / 100);
    setExpression(result);
    setDisplay(formatDisplay(result));
    setJustEvaluated(true);
    setLastTypedNumber(result);
  }

  function handlePlusMinus() {
    setClearPrimed(false);
    const target = expression || display;
    const parts = target.split(/([+−×÷])/);
    let current = parts[parts.length - 1];
    if (!current || operators.has(current)) return;

    current = current.startsWith("-") ? current.slice(1) : `-${current}`;
    parts[parts.length - 1] = current;
    const next = parts.join("");

    syncState(next, next);
  }

  function handleClear() {
    if (!clearPrimed) {
      setClearPrimed(true);
      if (lastTypedNumber) {
        setExpression(lastTypedNumber);
        setDisplay(lastTypedNumber);
      } else {
        setExpression("");
        setDisplay("0");
      }
      setJustEvaluated(false);
      return;
    }

    setClearPrimed(false);
    setExpression("");
    setDisplay("0");
    setJustEvaluated(false);
  }

  function onPress(value: CalcKey) {
    if (value === "calc") return;

    if (/^\d$/.test(value) || value === ".") {
      handleDigit(value);
      return;
    }

    if (operators.has(value)) {
      handleOperator(value);
      return;
    }

    if (value === "=") {
      handleEquals();
      return;
    }

    if (value === "%") {
      handlePercent();
      return;
    }

    if (value === "+/-") {
      handlePlusMinus();
      return;
    }

    if (value === "AC") {
      handleClear();
    }
  }

  return (
    <div className="app-shell">
      <div className="app-inner">
        <div className="status-bar">
          <div className="status-left">
            <span>{currentTime}</span>
            <span className="dnd-icon" aria-hidden="true">
              🌙
            </span>
          </div>

          <div className="dynamic-island" />

          <div className="status-right">
            <span className="carrier-text">Verizon 5G</span>

            <div className="signal-bars smooth" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>

            <div className="battery-outline" aria-hidden="true">
              <div className="battery-fill" />
              <div className="battery-cap" />
            </div>
          </div>
        </div>

        <div className="menu-row">
          <button type="button" className="menu-button" aria-label="Menu">
            <span><i /><b /></span>
            <span><i /><b /></span>
            <span><i /><b /></span>
          </button>
        </div>

        <div className="display-area">
          <div className="secondary-display">
            {secondaryLine || <span className="hidden-zero">0</span>}
          </div>
          <div className="main-display">
            {display === "Error" ? "Error" : formatDisplay(display)}
          </div>
        </div>

        <div className="keypad">
          {layout.flat().map((value, index) => {
            const isTopGray = value === "AC" || value === "+/-" || value === "%";
            const isOperator = operators.has(value) || value === "=";

            let buttonClass = "calc-button dark";
            if (isTopGray) buttonClass = "calc-button gray";
            if (isOperator) buttonClass = "calc-button orange";

            return (
              <button
                key={`${value}-${index}`}
                type="button"
                onClick={() => onPress(value)}
                className={buttonClass}
              >
                {value === "calc" ? (
                  <CalcIcon />
                ) : (
                  <span className={value === "AC" ? "button-text ac-text" : "button-text"}>
                    {value}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="home-indicator-wrap">
          <div className="home-indicator" />
        </div>
      </div>
    </div>
  );
}

const helperChecks = [
  sanitizeExpression("8×2") === "8*2",
  sanitizeExpression(" 10÷4 ") === "10/4",
  safeEval("8×2") === "16",
  safeEval("10÷4") === "2.5",
  safeEval("2+3×4") === "14",
  getLastTypedNumber("12+345") === "345",
  getLastTypedNumber("7.5×2") === "2",
  formatDisplay("1000") === "1,000",
  /^\d{2}:\d{2}$/.test(formatCurrentTime(new Date())),
];

if (helperChecks.some((passed) => !passed)) {
  throw new Error("Calculator helper self-check failed.");
}

export default App;