function foo(): number {
  return 1;
}

export function violator(): number {
  return foo();
}

// Added in cursor session cu-2026-05-07-002 to exercise provenance capture.
export function alsoViolator(): number {
  return foo() + 1;
}
