/**
 * Semantic Release Configuration — Production (main branch only)
 *
 * Semantic-release config; package name + assets list adjusted for this kit.
 */

module.exports = {
  branches: ['main'],
  plugins: [
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'conventionalcommits',
        releaseRules: [
          { type: 'feat', release: 'minor' },
          { type: 'fix', release: 'patch' },
          { type: 'hotfix', release: 'patch' },
          { type: 'perf', release: 'patch' },
          { type: 'docs', scope: 'README', release: 'patch' },
          { type: 'refactor', release: 'patch' },
          { type: 'style', release: 'patch' }
        ]
      }
    ],
    [
      '@semantic-release/release-notes-generator',
      {
        preset: 'conventionalcommits',
        presetConfig: {
          types: [
            { type: 'feat', section: '🚀 Features' },
            { type: 'hotfix', section: '🔥 Hotfixes' },
            { type: 'fix', section: '🐞 Bug Fixes' },
            { type: 'docs', section: '📚 Documentation' },
            { type: 'style', section: '💄 Styles' },
            { type: 'refactor', section: '♻️ Code Refactoring' },
            { type: 'perf', section: '⚡ Performance Improvements' },
            { type: 'test', section: '✅ Tests' },
            { type: 'build', section: '🏗️ Build System' },
            { type: 'ci', section: '👷 CI' }
          ]
        }
      }
    ],
    [
      '@semantic-release/changelog',
      { changelogFile: 'CHANGELOG.md' }
    ],
    [
      '@semantic-release/npm',
      { npmPublish: true }
    ],
    [
      '@semantic-release/github',
      {
        assets: [
          { path: 'CHANGELOG.md', label: 'Changelog' }
        ]
      }
    ],
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'package.json'],
        message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}'
      }
    ]
  ]
};
