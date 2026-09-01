# agent-kit-unity — OMP kit install/update/verify into a Unity repo's .omp/.
# Run `make` (or `make help`) to list targets.
#
#   make update    TARGET_DIR=/path/to/unity-repo   # install/refresh + write lock
#   make dry-run   TARGET_DIR=/path/to/unity-repo   # preview, writes nothing
#   make check     TARGET_DIR=/path/to/unity-repo   # verify in sync (exit 2 = drift)
#   make uninstall TARGET_DIR=/path/to/unity-repo   # remove trusted matching paths + lock
#   make bump      VERSION=x.y.z[-beta.N]           # bump version + README URL, gate, release commit + tag
#
# TARGET_DIR is a make VARIABLE, not a flag. The kit is convention-only and
# project-scoped: `ship-omp` copies omp/{AGENTS.md,rules,skills} plus
# auto-detected tier overlays into <TARGET_DIR>/.omp/ and records a checksum
# lock (.omp/aku-lock.json). The retired Claude Code / Codex global builds are
# gone; there is one install surface now.

NODE       ?= node
# Only agent target now; kept so `make update TARGET=omp` still reads naturally.
TARGET     ?= omp
# Where to install; defaults to the current directory.
TARGET_DIR ?= .

.DEFAULT_GOAL := help
.PHONY: help update resync dry-run uninstall omp-check test lint check bump

# One dispatch for every mode — $(1) is '', '--dry-run', '--uninstall', or
# '--check', which ship-omp accepts with identical meaning.
define ship_to
	@case "$(TARGET)" in \
	  omp) $(NODE) scripts/ship-omp.cjs $(TARGET_DIR) $(1) ;; \
	  *) echo "make: unknown TARGET '$(TARGET)' — only 'omp' is supported" >&2; exit 2 ;; \
	esac
endef

help: ## List available targets
	@grep -E '^[a-zA-Z_-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*## "}{printf "  \033[36m%-11s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "  TARGET_DIR=<unity-repo>   (default: .)"

update: ## Install/refresh the OMP kit into TARGET_DIR/.omp and write the lock
	$(call ship_to,--update)

dry-run: ## Preview the install for TARGET_DIR, writing nothing
	$(call ship_to,--dry-run)

uninstall: ## Remove trusted matching paths; keep drifted/orphan-marked bytes
	$(call ship_to,--uninstall)

omp-check: ## Verify TARGET_DIR/.omp is in sync (exit 2 on drift/available update)
	$(call ship_to,--check)

resync: update ## Deprecated alias for `make update`
	@echo "note: 'make resync' is deprecated — use 'make update [TARGET_DIR=...]'"

test: ## Run the full test suite (scripts/ + test/)
	npm test

lint: ## Run all lint gates (loc, frontmatter, docs-counts)
	npm run lint

check: lint test ## Full verification gate — lint + test (run before an update)
	@echo "✓ all gates green"

bump: ## Release prep: version bump, README URL, make check, release commit + annotated tag (VERSION= required; leading v optional)
	@set -eu; \
	v='$(VERSION)'; v=$${v#v}; \
	$(NODE) -e "const br=require('./scripts/build-release.cjs');const v=process.argv[1];if(!(br.STABLE.test(v)||br.BETA.test(v))){console.error('make bump: VERSION must match scripts/build-release.cjs — x.y.z or x.y.z-beta.N, N>=1 (got '+(v||'none')+')');process.exit(2)}" "$$v"; \
	npm version "$$v" --no-git-tag-version; \
	v=$$(node -p "require('./package.json').version"); \
	node -e "const fs=require('fs');const v=require('./package.json').version;const p='README.md';const s=fs.readFileSync(p,'utf8');const rx=/\/download\/v[^/]+\/install\.sh/g;if(!rx.test(s)){console.error('make bump: no /download/v*/install.sh URL found in README.md');process.exit(1)}fs.writeFileSync(p,s.replace(rx,'/download/v'+v+'/install.sh'));console.log('bump: README install URL -> v'+v)"; \
	$(MAKE) check; \
	git commit -q -m "chore(release): v$$v" CHANGELOG.md package.json package-lock.json README.md; \
	git tag -a "v$$v" -m "v$$v"; \
	echo "Bumped to v$$v — version files + README committed, gate green, annotated tag v$$v created. Push with: git push --atomic origin $$(git branch --show-current) v$$v"
