# agent-kit-unity — project-scoped native host install/update/verify.
# Run `make` (or `make help`) to list targets.
#
#   make update    TARGET_DIR=/path/to/unity-repo   # install/refresh + write lock
#   make dry-run   TARGET_DIR=/path/to/unity-repo   # preview, writes nothing
#   make check     TARGET_DIR=/path/to/unity-repo   # verify in sync (exit 2 = drift)
#   make uninstall TARGET_DIR=/path/to/unity-repo   # remove trusted matching paths + lock
#   make bump      VERSION=x.y.z[-beta.N]           # bump version, gate, release commit + tag
#
# TARGET_DIR is a make VARIABLE, not a flag. The kit is MCP-agnostic and
# project-scoped: `ship-kit` reads kit/{AGENTS.md,rules,skills} plus
# auto-detected tier overlays into <TARGET_DIR>/.omp/ and records a checksum
# lock (.omp/aku-lock.json). The retired Claude Code / Codex global builds are
# gone; TARGET=pi|codex|claude projects the same source into native host paths.

NODE       ?= node
# Agent target: omp (backward-compatible default), pi, codex, or claude.
TARGET     ?= omp
# Where to install; defaults to the current directory.
TARGET_DIR ?= .

.DEFAULT_GOAL := help
.PHONY: help update resync dry-run uninstall omp-check test lint check bump

# One dispatch for every mode — $(1) is '', '--dry-run', '--uninstall', or
# '--check', which ship-kit accepts with identical meaning.
define ship_to
	@$(NODE) scripts/ship-kit.cjs "$(TARGET_DIR)" --target "$(TARGET)" $(1)
endef

help: ## List available targets
	@grep -E '^[a-zA-Z_-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*## "}{printf "  \033[36m%-11s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "  TARGET_DIR=<unity-repo>   (default: .); TARGET=omp|pi|codex|claude (default: omp)"

update: ## Install/refresh the selected kit (TARGET=omp|pi|codex|claude) and write its lock
	$(call ship_to,--update)

dry-run: ## Preview the install for TARGET_DIR, writing nothing
	$(call ship_to,--dry-run)

uninstall: ## Remove trusted matching paths; keep drifted/orphan-marked bytes
	$(call ship_to,--uninstall)

omp-check: ## Verify the selected target is in sync (exit 2 on drift/available update)
	$(call ship_to,--check)

resync: update ## Deprecated alias for `make update`
	@echo "note: 'make resync' is deprecated — use 'make update [TARGET_DIR=...]'"

test: ## Run the full test suite (scripts/ + test/)
	npm test

lint: ## Run all lint gates (loc, frontmatter, docs-counts)
	npm run lint

check: lint test ## Full verification gate — lint + test (run before an update)
	@echo "✓ all gates green"

bump: ## Release prep: version bump, make check, release commit + annotated tag (VERSION= required; leading v optional)
	@set -eu; \
	v='$(VERSION)'; v=$${v#v}; \
	$(NODE) -e "const br=require('./scripts/build-release.cjs');const v=process.argv[1];if(!(br.STABLE.test(v)||br.BETA.test(v))){console.error('make bump: VERSION must match scripts/build-release.cjs — x.y.z or x.y.z-beta.N, N>=1 (got '+(v||'none')+')');process.exit(2)}" "$$v"; \
	npm version "$$v" --no-git-tag-version --allow-same-version; \
	v=$$(node -p "require('./package.json').version"); \
	$(MAKE) check; \
	git commit -q -m "chore(release): v$$v" CHANGELOG.md package.json package-lock.json; \
	git tag -a "v$$v" -m "v$$v"; \
	echo "Bumped to v$$v — version files + changelog committed, gate green, annotated tag v$$v created. Push with: git push --atomic origin $$(git branch --show-current) v$$v"
