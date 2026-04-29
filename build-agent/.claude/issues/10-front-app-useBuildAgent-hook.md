# #10 — front-app: useBuildAgent hook + generate UI

**Created:** 2026-04-27 | **Updated:** 2026-04-27

## Parent

#4

## What to build

Replace the existing useGenerateDocs hook and /api/generate integration with a new useBuildAgent hook that drives the full job/polling flow against the build-agent service.

useBuildAgent posts to POST /build with the target_node_id and full canvas payload (nodes + edges from Zustand state), then polls GET /jobs/{job_id} every 2 seconds until the job reaches done or failed. It exposes { status, step, result, error } to the UI and clears the polling interval on completion.

The generate modal is updated to: show a step label during running state (Generating plan..., Recommending skills...), render plan steps and prompt files on completion, and show a retry button (re-triggers POST /build) when warnings is non-empty due to a partial skills failure.

## Acceptance criteria

- [ ] Clicking Build on a canvas node triggers POST /build with the correct target_node_id and canvas payload
- [ ] UI shows Generating plan... and Recommending skills... labels as the job progresses
- [ ] Completed job renders the implementation plan steps and numbered prompt files in the modal
- [ ] A retry button appears when the response contains a non-empty warnings[] array
- [ ] Retry re-triggers the full POST /build call with the same inputs
- [ ] On job failure, an error message is shown and the user can dismiss or retry
- [ ] useGenerateDocs hook and /api/generate call are removed
- [ ] Polling interval is cleared when the job reaches done or failed (no memory leak)

## Blocked by

- Blocked by #9
