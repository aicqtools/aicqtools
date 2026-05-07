/**
 * S3.B — Python 글로벌 10개 룰 단위 테스트.
 */
import { describe, it, expect } from 'vitest';
import { runFileWithSource } from '../runner/run-file.js';
import { parseYamlRule } from '../matcher/yaml-rule.js';
import requestsNeedsTimeout from '../rules-default/requests-needs-timeout.js';
import noShellTrue from '../rules-default/no-shell-true.js';
import noFstringSql from '../rules-default/no-fstring-sql.js';
import noMutableDefaultArg from '../rules-default/no-mutable-default-arg.js';
import noBareExcept from '../rules-default/no-bare-except.js';
import typeHintRequiredPublic from '../rules-default/type-hint-required-public.js';
import asyncAwaitConsistency from '../rules-default/async-await-consistency.js';
import pytestFixtureNaming from '../rules-default/pytest-fixture-naming.js';

const noPickle = parseYamlRule(`
id: no-pickle
language: python
severity: error
message: Avoid pickle.
query: |
  (call
    function: (attribute
      object: (identifier) @mod
      attribute: (identifier) @attr)
    (#eq? @mod "pickle")
    (#match? @attr "^(load|loads)$")) @call
`);

const noPrintInProd = parseYamlRule(`
id: no-print-in-prod
language: python
severity: warning
message: Use logging.
query: |
  (call
    function: (identifier) @fn
    (#eq? @fn "print")) @call
`);

describe('no-pickle (YAML)', () => {
  it('flags pickle.loads', () => {
    const r = runFileWithSource('a.py', `import pickle\ndata = pickle.loads(buf)\n`, 'python', [noPickle]);
    expect(r.diagnostics).toHaveLength(1);
  });
  it('passes for json.loads', () => {
    const r = runFileWithSource('a.py', `import json\ndata = json.loads(buf)\n`, 'python', [noPickle]);
    expect(r.diagnostics).toHaveLength(0);
  });
});

describe('no-print-in-prod (YAML)', () => {
  it('flags print()', () => {
    const r = runFileWithSource('a.py', `print("hi")\n`, 'python', [noPrintInProd]);
    expect(r.diagnostics).toHaveLength(1);
  });
  it('passes for logger.info', () => {
    const r = runFileWithSource('a.py', `logger.info("hi")\n`, 'python', [noPrintInProd]);
    expect(r.diagnostics).toHaveLength(0);
  });
});

describe('requests-needs-timeout', () => {
  it('flags requests.get without timeout', () => {
    const r = runFileWithSource('a.py', `import requests\nrequests.get("http://x")\n`, 'python', [requestsNeedsTimeout]);
    expect(r.diagnostics).toHaveLength(1);
  });
  it('passes when timeout=N is present', () => {
    const r = runFileWithSource('a.py', `import requests\nrequests.get("http://x", timeout=5)\n`, 'python', [requestsNeedsTimeout]);
    expect(r.diagnostics).toHaveLength(0);
  });
});

describe('no-shell-true', () => {
  it('flags subprocess.run(..., shell=True)', () => {
    const r = runFileWithSource('a.py', `import subprocess\nsubprocess.run("ls", shell=True)\n`, 'python', [noShellTrue]);
    expect(r.diagnostics).toHaveLength(1);
  });
  it('passes for list args', () => {
    const r = runFileWithSource('a.py', `import subprocess\nsubprocess.run(["ls", "-la"])\n`, 'python', [noShellTrue]);
    expect(r.diagnostics).toHaveLength(0);
  });
});

describe('no-fstring-sql', () => {
  it('flags f-string with SELECT and interpolation', () => {
    const r = runFileWithSource('a.py', `q = f"SELECT * FROM users WHERE id = {user_id}"\n`, 'python', [noFstringSql]);
    expect(r.diagnostics.length).toBeGreaterThan(0);
  });
  it('passes for non-SQL f-string', () => {
    const r = runFileWithSource('a.py', `q = f"hello {name}"\n`, 'python', [noFstringSql]);
    expect(r.diagnostics).toHaveLength(0);
  });
});

describe('no-mutable-default-arg', () => {
  it('flags def f(x=[])', () => {
    const r = runFileWithSource('a.py', `def f(x=[]):\n    pass\n`, 'python', [noMutableDefaultArg]);
    expect(r.diagnostics).toHaveLength(1);
  });
  it('passes for def f(x=None)', () => {
    const r = runFileWithSource('a.py', `def f(x=None):\n    pass\n`, 'python', [noMutableDefaultArg]);
    expect(r.diagnostics).toHaveLength(0);
  });
});

describe('no-bare-except', () => {
  it('flags bare except:', () => {
    const r = runFileWithSource('a.py', `try:\n    x = 1\nexcept:\n    pass\n`, 'python', [noBareExcept]);
    expect(r.diagnostics).toHaveLength(1);
  });
  it('passes for except ValueError:', () => {
    const r = runFileWithSource('a.py', `try:\n    x = 1\nexcept ValueError:\n    pass\n`, 'python', [noBareExcept]);
    expect(r.diagnostics).toHaveLength(0);
  });
});

describe('type-hint-required-public', () => {
  it('flags public function without return type', () => {
    const r = runFileWithSource('a.py', `def calculate(x):\n    return x * 2\n`, 'python', [typeHintRequiredPublic]);
    expect(r.diagnostics).toHaveLength(1);
  });
  it('passes for private function (underscore)', () => {
    const r = runFileWithSource('a.py', `def _calculate(x):\n    return x * 2\n`, 'python', [typeHintRequiredPublic]);
    expect(r.diagnostics).toHaveLength(0);
  });
  it('passes when return type is annotated', () => {
    const r = runFileWithSource('a.py', `def calculate(x) -> int:\n    return x * 2\n`, 'python', [typeHintRequiredPublic]);
    expect(r.diagnostics).toHaveLength(0);
  });
});

describe('async-await-consistency', () => {
  it('flags async def without await', () => {
    const r = runFileWithSource('a.py', `async def fetch():\n    return 1\n`, 'python', [asyncAwaitConsistency]);
    expect(r.diagnostics).toHaveLength(1);
  });
  it('passes when await is used', () => {
    const r = runFileWithSource('a.py', `async def fetch():\n    return await get_data()\n`, 'python', [asyncAwaitConsistency]);
    expect(r.diagnostics).toHaveLength(0);
  });
});

describe('pytest-fixture-naming', () => {
  it('flags @pytest.fixture starting with test_', () => {
    const src = `import pytest\n\n@pytest.fixture\ndef test_user():\n    return {"id": 1}\n`;
    const r = runFileWithSource('a.py', src, 'python', [pytestFixtureNaming]);
    expect(r.diagnostics).toHaveLength(1);
  });
  it('passes for non-test prefix', () => {
    const src = `import pytest\n\n@pytest.fixture\ndef sample_user():\n    return {"id": 1}\n`;
    const r = runFileWithSource('a.py', src, 'python', [pytestFixtureNaming]);
    expect(r.diagnostics).toHaveLength(0);
  });
});
