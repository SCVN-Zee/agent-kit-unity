const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const payload = require('../lib/omp-install-payload');

const KIT_OMP = path.resolve(__dirname, '../../omp');
const LUNA_MARKER = /Luna|Playwork|Bridge\.NET|luna\.json|aku-luna/i;

function text(file) {
  return fs.readFileSync(file, 'utf8');
}

test('base payload contains no Luna-specific content', () => {
  const base = payload.baseFiles(KIT_OMP);
  for (const [dest, meta] of Object.entries(base)) {
    if (!/\.(?:md|c?js|json)$/.test(dest)) continue;
    assert.doesNotMatch(text(meta.srcAbs), LUNA_MARKER, `Luna marker in common payload: ${dest}`);
  }
});

test('Luna authoring surfaces are tier-local and activated by the rule', () => {
  const base = payload.baseFiles(KIT_OMP);
  const luna = payload.tierFiles(KIT_OMP, 'luna');
  assert.equal(base['skills/aku-odin/examples/tabbed-component.md'], undefined);
  assert.ok(luna['skills/aku-luna-conventions/SKILL.md']);
  assert.ok(luna['skills/aku-luna-conventions/references/authoring-guards.md']);
  assert.ok(luna['skills/aku-luna-conventions/references/animator-prefab.md']);
  assert.ok(luna['skills/aku-luna-conventions/examples/tabbed-component.md']);
  assert.ok(luna['skills/aku-luna-code-review/references/checklist-luna-compatibility.md']);

  const rule = text(path.join(KIT_OMP, 'tiers/luna/rules/aku-luna-rules.md'));
  for (const glob of ['**/*.cs', '**/*.controller', '**/*.anim', '**/*.prefab', '**/*.unity', '**/*.mat']) {
    assert.match(rule, new RegExp(glob.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(rule, /skill:\/\/aku-luna-conventions/);
});
