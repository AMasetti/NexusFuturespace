<!--
PR title = Conventional Commit, it decides the release bump on merge:
  feat(scope): …  → minor   ·   fix/perf/refactor(scope): …  → patch
  type!: … or a "BREAKING CHANGE:" footer → major   ·   chore/ci/docs/style/test → no release
-->

## What

<!-- One or two sentences: what changes for someone using the UI. -->

## Why

<!-- The problem or request behind it. Link the Linear ticket if there is one (NEX-123). -->

## Changes

<!-- The notable pieces, one line each. Skip anything obvious from the diff. -->

-

## Robot impact

<!-- Does this change what the UI sends to or reads from the robot? -->

- [ ] None — UI only
- [ ] Changes commands sent to the robot (`set_joints`, `halt`, …)
- [ ] Changes how telemetry / joint state is read

## Testing

- [ ] `npm run check` passes (tsc + eslint)
- [ ] `npm run build` passes
- [ ] Checked in the browser on `/robotics` (desktop)
- [ ] Checked on mobile width, if layout changed
- [ ] Tested with the robot connected (observe + override), if robot impact above

## Checklist

- [ ] PR title follows Conventional Commits and the type matches the change
- [ ] No secrets, local IPs or machine paths in the diff
