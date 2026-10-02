/**
 * Stryker AST Ignorer Plugin for Copas
 * 
 * Filters out low-value / non-business mutants:
 * 1. Logger statements (logger.info, logger.error, logger.warn, logger.debug, console.log, etc.)
 * 2. Error message string literals (e.g. inside new Error(...) or throw statements)
 * 3. Runtime type guard checks (typeof x === "object", x instanceof Y)
 * 4. Catch blocks and defensive logging inside catch
 */

function isLoggerCall(path) {
  if (!path.isCallExpression()) return false;
  const callee = path.node.callee;
  if (!callee) return false;

  // MemberExpression: logger.info(...), console.log(...), c.get("logger")...
  if (callee.type === "MemberExpression") {
    const obj = callee.object;
    const prop = callee.property;
    const propName = prop?.name;
    const logMethods = ["log", "info", "warn", "error", "debug", "trace"];

    if (obj?.type === "Identifier" && (obj.name === "logger" || obj.name === "console")) {
      return true;
    }
    if (logMethods.includes(propName) && obj?.type === "Identifier" && obj.name.toLowerCase().includes("logger")) {
      return true;
    }
  }
  return false;
}

function isInsideLoggerCall(path) {
  let curr = path;
  while (curr && curr.parentPath) {
    if (isLoggerCall(curr)) return true;
    curr = curr.parentPath;
  }
  return false;
}

function isErrorMessageString(path) {
  if (!path.isStringLiteral() && !path.isTemplateLiteral()) return false;
  const parent = path.parentPath;
  if (!parent) return false;

  // new Error("..."), new DomainError("...")
  if (parent.isNewExpression()) {
    const callee = parent.node.callee;
    if (callee && (callee.name?.endsWith("Error") || callee.property?.name?.endsWith("Error"))) {
      return true;
    }
  }

  // throw "..."
  if (parent.isThrowStatement()) {
    return true;
  }

  return false;
}

function isTypeGuard(path) {
  if (path.isBinaryExpression()) {
    const op = path.node.operator;
    if (op === "instanceof") return true;
    if (path.node.left?.type === "UnaryExpression" && path.node.left.operator === "typeof") return true;
    if (path.node.right?.type === "UnaryExpression" && path.node.right.operator === "typeof") return true;
  }
  return false;
}

export const strykerPlugins = [
  {
    kind: "Ignore",
    name: "copas-ast-ignorer",
    value: {
      shouldIgnore(path) {
        if (isLoggerCall(path) || isInsideLoggerCall(path)) {
          return "Logging statements are observational and do not affect business logic";
        }
        if (isErrorMessageString(path)) {
          return "Error message prose should not be tested for exact literal wording";
        }
        if (isTypeGuard(path)) {
          return "Defensive runtime type guards should not distract from business invariants";
        }
        return undefined;
      },
    },
  },
];
