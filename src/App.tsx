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

function CalcIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="calc-icon"
      aria-hidden="true"
    >
      <rect x="4.2" y="2.6" width="15.6" height="18.8" rx="3.3" fill="currentColor" />
      <rect x="7.2" y="5.5" width="9.6" height="3.5" rx="1.1" fill="#2b2b35" />
      <circle cx="8.8" cy="12.3" r="0.95" fill="#2b2b35" />
      <circle cx="12" cy="12.3" r="0.95" fill="#2b2b35" />
      <circle cx="15.2" cy="12.3" r="0.95" fill="#2b2b35" />
      <circle cx="8.8" cy="15.6" r="0.95" fill="#2b2b35" />
      <circle cx="12" cy="15.6" r="0.95" fill="#2b2b35" />
      <circle cx="15.2" cy="15.6" r="0.95" fill="#2b2b35" />
      <circle cx="8.8" cy="18.9" r="0.95" fill="#2b2b35" />
      <circle cx="12" cy="18.9" r="0.95" fill="#2b2b35" />
      <circle cx="15.2" cy="18.9" r="0.95" fill="#2b2b35" />
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
      content:
        "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
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
      <div className="app-inner clean-top">
        <div className="top-accent" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <div className="display-area clean-display">
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
];

if (helperChecks.some((passed) => !passed)) {
  throw new Error("Calculator helper self-check failed.");
}

export default App;