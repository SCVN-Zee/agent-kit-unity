/**
 * Semantic contract for Unity-owned identifiers and Animator driving.
 *
 * These checks bind the automatic rule bridge, canonical policy skills, domain
 * recipes, review lenses, and public mirrors. Structural path tests do not
 * catch contradictory guidance across those surfaces.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const KIT_ROOT = path.resolve(__dirname, '../..');
const CONTENT_PATHS = Object.freeze({
  rules: 'omp/rules/aku-code-convention-rules.md',
  codeSkill: 'omp/skills/aku-code-conventions/SKILL.md',
  bounded: 'omp/skills/aku-code-conventions/BOUNDED_DOMAIN_FIELDS.md',
  driving: 'omp/skills/aku-code-conventions/ANIMATOR_DRIVING.md',
  recipe: 'omp/skills/aku-code-conventions/examples/identifier-pickers.md',
  animatorSkill: 'omp/skills/aku-animator/SKILL.md',
  animatorTree: 'omp/skills/aku-animator/DECISION_TREE.md',
  animatorReview: 'omp/skills/aku-code-review/references/animator-review.md',
  serializationReview: 'omp/skills/aku-code-review/references/checklist-serialization-wiring.md',
  lunaReview: 'omp/tiers/luna/skills/aku-luna-code-review/references/checklist-luna-compatibility.md'
});

function read(relativePath) {
  const absolutePath = path.join(KIT_ROOT, relativePath);
  assert.ok(fs.existsSync(absolutePath), `${relativePath} must exist`);
  return fs.readFileSync(absolutePath, 'utf8');
}

function assertIncludes(body, expected, relativePath) {
  assert.ok(body.includes(expected), `${relativePath} must include: ${expected}`);
}

function csharpFences(body) {
  return Array.from(body.matchAll(/```csharp\n([\s\S]*?)```/g), (match) => match[1]);
}

test('identifier: fixed content manifest resolves every contract surface', () => {
  for (const relativePath of Object.values(CONTENT_PATHS)) {
    read(relativePath);
  }
});

test('code rule is a thin bridge to the authoritative skill', () => {
  const relativePath = CONTENT_PATHS.rules;
  const body = read(relativePath);

  const frontmatterEnd = body.indexOf('\n---\n', 4);
  assert.ok(frontmatterEnd > 0, `${relativePath} must retain YAML frontmatter`);
  assertIncludes(body.slice(0, frontmatterEnd), 'globs: ["**/*.cs"]', `${relativePath} frontmatter`);
  assertIncludes(body, 'MUST read and apply `skill://aku-code-conventions`', relativePath);
  assert.doesNotMatch(body, /^## /m, `${relativePath} must not duplicate policy sections`);
  assert.ok(body.split('\n').length <= 12, `${relativePath} must remain a thin bridge`);

  const skillPath = CONTENT_PATHS.codeSkill;
  const skillBody = read(skillPath);
  assertIncludes(skillBody, 'authoritative source for Unity C# policy', skillPath);
  assertIncludes(skillBody, 'MUST read the subfiles relevant to the work', skillPath);
  assertIncludes(skillBody, 'reading and applying `skill://aku-odin` when Odin is installed', skillPath);
});

test('identifier: canonical policy binds Unity identifiers to authoritative pickers', () => {
  const relativePath = CONTENT_PATHS.bounded;
  const body = read(relativePath);

  assertIncludes(body, 'Unity-owned identifier contract', relativePath);
  assertIncludes(body, 'Single selection', relativePath);
  assertIncludes(body, 'Multiple selection', relativePath);
  assertIncludes(body, '`LayerMask`', relativePath);
  assertIncludes(body, '`IsUniqueList = true`', relativePath);
});

test('identifier: focused recipes cover project and controller authorities', () => {
  const relativePath = CONTENT_PATHS.recipe;
  const body = read(relativePath);

  for (const expected of [
    'GameObject layer',
    'Sorting layer',
    'Animator parameter',
    'Animator layer',
    'Animator state',
    'LayerMask',
    'IsUniqueList = true',
    'SortingLayer.layers',
    'AnimatorControllerParameterType.Trigger',
    'AnimatorOverrideController',
    'Animator.GetLayerIndex',
    'Animator.StringToHash',
    'layer.id',
    '[ValidateInput(nameof(IsPreviewStateInLayer)',
    'if (layer.name != _previewLayer)',
    '_previewLayerIndex = _animator.GetLayerIndex(_previewLayer)',
    '#if UNITY_EDITOR'
  ]) {
    assertIncludes(body, expected, relativePath);
  }
});

test('identifier: dropdown providers stay compiled and guard only editor bodies', () => {
  const body = read(CONTENT_PATHS.recipe);
  for (const provider of ['GetGameObjectLayers', 'GetSortingLayers', 'GetTriggerParameters', 'GetAnimatorLayers', 'GetAnimatorStatePaths']) {
    const providerShape = new RegExp(`private (?:static )?IEnumerable ${provider}\\(\\)\\n\\{\\n#if UNITY_EDITOR`);
    assert.match(body, providerShape, `${provider} must stay compiled with an editor-only body`);
  }

  const bounded = read(CONTENT_PATHS.bounded);
  assertIncludes(bounded, '`static class` of', CONTENT_PATHS.bounded);
  assertIncludes(bounded, '`const` values', CONTENT_PATHS.bounded);
});

test('identifier: canonical runtime examples never use Animator string setters', () => {
  const paths = [
    'omp/skills/aku-code-conventions/examples/monobehaviour-template.md',
    'omp/skills/aku-code-conventions/examples/setup-refs-pattern.md',
    'omp/skills/aku-animator/examples/locomotion-attack-controller.md'
  ];
  const stringSetter = /\.Set(?:Trigger|Bool|Float|Integer)\s*\(\s*["']/;

  for (const relativePath of paths) {
    const positiveCode = csharpFences(read(relativePath)).join('\n');
    assert.ok(positiveCode.length > 0, `${relativePath} must contain a C# example`);
    assert.doesNotMatch(positiveCode, stringSetter, `${relativePath} must use cached Animator IDs`);
  }
});

test('animator: canonical policy makes normal gameplay transition-first', () => {
  const relativePath = CONTENT_PATHS.driving;
  const body = read(relativePath);

  assertIncludes(body, 'Normal gameplay completion contract', relativePath);
  assertIncludes(body, 'reachable entry and required exit transitions', relativePath);
  assertIncludes(body, '`runtimeAnimatorController`', relativePath);
  assertIncludes(body, 'Read the animator data back', relativePath);
  assertIncludes(body, '`Play` / `CrossFade`', relativePath);
  assertIncludes(body, 'Set `hasExitTime` explicitly', relativePath);
});

test('animator: authoring gate verifies graph and component wiring', () => {
  const relativePath = CONTENT_PATHS.animatorSkill;
  const body = read(relativePath);

  assertIncludes(body, '**Component wiring**', relativePath);
  assertIncludes(body, 'entry and required exit', relativePath);
  assertIncludes(body, 'cached hash', relativePath);
  const decisionTree = read(CONTENT_PATHS.animatorTree);
  assertIncludes(decisionTree, 'read the component back', CONTENT_PATHS.animatorTree);
  assertIncludes(decisionTree, 'entry and required exit', CONTENT_PATHS.animatorTree);
});

test('animator: review and Luna guidance preserve narrow direct-state exceptions', () => {
  const animatorReviewPath = CONTENT_PATHS.animatorReview;
  const serializationPath = CONTENT_PATHS.serializationReview;
  const lunaPath = CONTENT_PATHS.lunaReview;
  const animatorReview = read(animatorReviewPath);
  const serialization = read(serializationPath);
  const luna = read(lunaPath);

  assertIncludes(animatorReview, 'documented exception rationale', animatorReviewPath);
  assertIncludes(serialization, 'DEFECT — unconstrained Unity-owned identifier', serializationPath);
  assertIncludes(serialization, 'project **without** Odin', serializationPath);
  assertIncludes(luna, 'Normal gameplay', lunaPath);
  assertIncludes(luna, 'full-path hash', lunaPath);
});
