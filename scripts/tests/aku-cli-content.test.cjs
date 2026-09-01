#!/usr/bin/env node
/**
 * Content gate: channel-aware Unity CLI routing doctrine.
 *
 * Family list + verdicts frozen 2026-08-30 from the live probe
 * (plans/260830-1503-skills-cli-first/reports/op-families-v2.md, superseding the
 * 1341 freeze): Editor 6000.3.15f1 + Pipeline 0.5.0-exp.1, 142 commands registered.
 * All seven families left parity-unknown with live evidence — six are CLI-primary
 * (`unity command <name>`) with the MCP capability class as fallback; the headless
 * family stays MCP-primary while an interactive session holds the project, with the
 * closed-project headless CLI as the gated fallback. A CLI-primary row must never
 * carry parity-unknown. Probe upgrades need a dated entry in op-families-v2.md and
 * updated expectations here. Command spellings cited in skills must stay inside the
 * frozen catalog captured that day; `unity list`/`unity command` remain runtime authority.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { CONTRACTS } = require('../lint-frontmatter.cjs');
const { deriveFacts } = require('../lib/docs-facts.js');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

function ompMarkdownFiles(dir = 'omp', acc = []) {
  const abs = path.join(ROOT, dir);
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) ompMarkdownFiles(rel, acc);
    else if (e.name.endsWith('.md')) acc.push(rel);
  }
  return acc;
}

// Frozen gate families (reports/op-families-v2.md, 2026-08-30 live probe) -> policy-table
// row marker + primary/fallback channel the probe-backed variant assigns.
const FAMILIES = [
  { family: 'scene', marker: 'scenes;', primary: '**cli**', fallback: 'mcp capability of the same class' },
  { family: 'hierarchy-component', marker: 'hierarchy/components', primary: '**cli**', fallback: 'mcp capability of the same class' },
  { family: 'prefab-lifecycle', marker: 'prefab lifecycle', primary: '**cli**', fallback: 'mcp capability of the same class' },
  { family: 'animator-batch', marker: 'animator batch', primary: '**cli**', fallback: 'mcp capability of the same class' },
  { family: 'code-review-reads', marker: 'console read', primary: '**cli**', fallback: 'mcp capability of the same class' },
  { family: 'conventions-compile-check', marker: 'recompile', primary: '**cli**', fallback: 'mcp capability of the same class' },
  { family: 'headless-build-test-run', marker: 'headless one-shot', primary: 'mcp', fallback: 'verify-at-use' },
];

test('policy table is verdict-aware complete over the frozen families', () => {
  const policy = read('omp/rules/aku-mcp-policy.md').toLowerCase();
  const tableRows = policy.split('\n').filter((l) => l.startsWith('|'));
  assert.ok(tableRows.some((l) => l.includes('capability surface') && l.includes('primary channel') && l.includes('fallback')), 'classification table header present');
  const dataRows = tableRows.filter((l) => !/^\|\s*-/.test(l) && !l.includes('capability surface'));
  assert.ok(dataRows.length >= 6, 'classification table carries its rows');
  for (const { family, marker, primary, fallback } of FAMILIES) {
    const row = dataRows.find((l) => l.includes(marker));
    assert.ok(row, `family ${family} appears in the policy table`);
    assert.ok(row.includes(primary), `family ${family} primary matches its probe verdict`);
    assert.ok(row.includes(fallback), `family ${family} keeps a fallback channel`);
  }
  // Verdict rule: any row tagged parity-unknown must have MCP/eval as primary.
  for (const row of dataRows.filter((l) => l.includes('parity-unknown'))) {
    const primaryCell = row.split('|')[2] || '';
    assert.match(primaryCell, /mcp|eval/i, `parity-unknown row not MCP/eval-first: ${row}`);
  }
  // Headless route stays conservative: close-the-project-first, no lock internals asserted.
  assert.match(policy, /closed in the interactive editor/);
  assert.match(policy, /do not assume single-instance/);
  assert.match(policy, /unproven/);
});

test('policy carries kit-owned CLI + Pipeline setup doctrine', () => {
  const policy = read('omp/rules/aku-mcp-policy.md').toLowerCase();
  assert.match(policy, /## setup \(official unity cli \+ pipeline\)/, 'setup section present');
  assert.match(policy, /unity pipeline install/, 'official install verb taught');
  assert.match(policy, /restart the editor once/, 'activation relaunch fact stated');
});

test('skills cite live-probe CLI recipes with dated evidence annotations', () => {
  const RECIPES = {
    'omp/skills/aku-scene/SKILL.md': ['get_scene_hierarchy', 'list_open_scenes', 'find_assets', 'save_scene', 'eval'],
    'omp/skills/aku-prefab/SKILL.md': ['find_assets', 'create_prefab', 'instantiate_prefab', 'apply_prefab_overrides'],
    'omp/skills/aku-animator/SKILL.md': ['get_animation_clip', 'create_animator_controller', 'add_animator_transition'],
    'omp/skills/aku-code-review/SKILL.md': ['console --tail', 'list_tests', 'run_tests'],
    'omp/tiers/luna/skills/aku-luna-code-review/SKILL.md': ['console --tail', 'list_tests'],
  };
  for (const [f, names] of Object.entries(RECIPES)) {
    const t = read(f);
    for (const n of names) assert.ok(t.includes(n), `${f} cites CLI recipe ${n}`);
    assert.ok(t.includes('proven-run 2026-08-30'), `${f} carries the dated probe annotation`);
  }
});

test('command citations in CLI-first skills stay inside the frozen catalog', () => {
  const CATALOG = new Set('add_animator_layer,add_animator_parameter,add_animator_state,add_animator_transition,add_component,add_scene_to_build,add_timeline_clip,add_timeline_track,apply_prefab_overrides,attach_script,audit,audit_status,bake_lighting,bake_navmesh,bake_navmesh_surfaces,bake_occlusion_culling,build,build_status,cancel_lighting_bake,cancel_navmesh_bake,cancel_occlusion_bake,cancel_tests,capture_game_view,capture_scene_view,clear_baked_lighting,clear_console,clear_navmesh,clear_occlusion_culling,console,copy_asset,create_animation_clip,create_animator_controller,create_asset,create_folder,create_gameobject,create_gameobjects,create_prefab,create_prefab_variant,create_scene,create_script,create_timeline,delete_asset,delete_gameobject,editor_focus,editor_pause,editor_play,editor_status,editor_stop,eval,eval_file,find_assets,find_gameobjects,get_animation_clip,get_animator_controller,get_audio_settings,get_authoring_root,get_build_settings,get_component_properties,get_console_logs,get_graphics_settings,get_import_settings,get_input_settings,get_lighting_settings,get_material_properties,get_navmesh_settings,get_performance_stats,get_physics_settings,get_player_settings,get_quality_settings,get_scene_hierarchy,get_selection,get_serialized_fields,get_shader_properties,get_tags_layers,get_time_settings,get_timeline,import_asset,instantiate_prefab,lighting_bake_status,list_build_profiles,list_build_targets,list_open_scenes,list_shaders,list_tests,menu,move_asset,navmesh_bake_status,occlusion_bake_status,open_scene,package_add,package_list,package_remove,package_resolve,package_search,package_status,read_text_file,recompile,recompile_status,reload_file,reload_file_override,remove_animation_curve,remove_component,remove_scene_from_build,rename_asset,rename_gameobject,revert_prefab_overrides,run_tests,save_all,save_prefab_contents,save_scene,screenshot,search,set_active,set_active_scene,set_animation_curve,set_audio_settings,set_authoring_root,set_autotick,set_build_settings,set_component_properties,set_graphics_settings,set_import_settings,set_input_settings,set_layer,set_lighting_settings,set_material_properties,set_navmesh_settings,set_parent,set_physics_settings,set_player_settings,set_quality_settings,set_selection,set_serialized_field,set_tag,set_tags_layers,set_time_settings,set_transform,switch_build_target,switch_build_target_status,test_status,unpack_prefab,write_text_file'.split(',').concat(['git', 'guid', 'false', 'parameter', 'codebase', 'luna']));
  CATALOG.delete('');
  const FILES = [
    'omp/skills/aku-scene/SKILL.md',
    'omp/skills/aku-prefab/SKILL.md',
    'omp/skills/aku-animator/SKILL.md',
    'omp/skills/aku-code-review/SKILL.md',
    'omp/tiers/luna/skills/aku-luna-code-review/SKILL.md',
  ];
  for (const f of FILES) {
    const text = read(f);
    const cites = [
      ...(text.match(/`([a-z][a-z_]+)`/g) || []).map((s) => s.slice(1, -1)),
      ...(text.match(/`unity command [a-z][a-z_]+/g) || []).map((s) => s.slice('`unity command '.length)),
    ];
    for (const tok of cites) {
      assert.ok(CATALOG.has(tok), `${f} cites a command outside the frozen catalog: ${tok}`);
    }
  }
});

test('in-session test execution routes MCP-primary in review skills', () => {
  for (const f of ['omp/skills/aku-code-review/SKILL.md', 'omp/tiers/luna/skills/aku-luna-code-review/SKILL.md']) {
    const t = read(f);
    const mcp = t.indexOf('tests-run');
    const cli = t.indexOf('run_tests');
    assert.ok(mcp > -1, `${f} names the MCP tests-run route`);
    assert.ok(cli > -1, `${f} names the CLI run_tests alternative`);
    assert.ok(mcp < cli, `${f} orders MCP tests-run before the CLI run_tests alternative`);
    assert.match(t, /Test execution is MCP-primary in-session/i, `${f} marks execution MCP-primary in-session`);
  }
  assert.match(read('omp/rules/aku-mcp-policy.md'), /run tests in-Editor via MCP \(`tests-run`\)/, 'policy keeps in-session execution MCP-primary');
});

test('RuntimeOnly commands are never presented as in-Editor CLI routes', () => {
  for (const f of ompMarkdownFiles()) {
    read(f).split('\n').forEach((ln, i) => {
      if (/simulate_key|simulate_pointer|set_timescale/.test(ln)) {
        assert.match(
          ln,
          /RuntimeOnly|no CLI route|not a kit routing target|dev-player|development build/i,
          `${f}:${i + 1} presents a RuntimeOnly command without its dev-Player label`,
        );
      }
    });
  }
});

test('guard keeps its protection and gains the CLI rung before MCP', () => {
  const guard = read('omp/rules/aku-mcp-guard.md');
  assert.match(guard, /rule:\/\/aku-mcp-policy/, 'guard references the policy');
  for (const ext of ['.prefab', '.unity', '.controller', '.anim', '.mat', '.playable', '.signal']) {
    assert.ok(guard.includes(ext), `guard keeps the ${ext} glob`);
  }
  const redirect = guard.split('\n').find((l) => l.includes('CLI-live'));
  assert.ok(redirect, 'guard redirect offers the CLI rung');
  const r = redirect.toLowerCase();
  assert.ok(r.indexOf('cli-live') > -1 && r.indexOf('cli-live') < r.indexOf('connected unity mcp'), 'CLI rung precedes MCP');
  const pauseIdx = guard.indexOf('pause this asset work');
  const gitIdx = guard.indexOf('committed-state');
  assert.ok(pauseIdx > -1 && gitIdx > -1 && pauseIdx > gitIdx, 'terminal pause survives after the last fallback');
});

test('beta-local flags and build-provenance instructions stay out of shipped files', () => {
  for (const f of ompMarkdownFiles()) {
    const t = read(f);
    assert.ok(!t.includes('--shard'), `${f} teaches beta-local --shard`);
    assert.ok(!t.includes('--format github'), `${f} teaches beta-local --format github`);
    // Phase 4(d) third case: build-provenance instructions are beta-local; shipped
    // prose must not teach provenance-recording build flags or workflows.
    assert.ok(!/provenance/i.test(t), `${f} teaches build-provenance instructions`);
  }
});

test('shipped inventory stays at the frozen 17-surface split', () => {
  const keys = Object.keys(CONTRACTS);
  const count = (pred) => keys.filter(pred).length;
  assert.equal(count((k) => k.startsWith('skills/')), 7, 'base skills');
  assert.equal(count((k) => k.startsWith('rules/')), 5, 'base rules');
  assert.equal(count((k) => k.startsWith('tiers/') && k.includes('/rules/')), 2, 'tier rules');
  assert.equal(count((k) => k.startsWith('tiers/') && k.includes('/skills/')), 3, 'tier skills');
  assert.deepEqual(deriveFacts(ROOT).counts, { skills: 7, rules: 5 }, 'docs-facts derivation agrees');
});
