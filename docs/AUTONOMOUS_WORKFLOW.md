# JobPilot AI — Autonomous & Browser-Assisted Workflows

## Workflow Safety Policy

JobPilot AI operates under strict safety and compliance parameters:
1. **Never bypass bot protection**: JobPilot does not attempt to bypass CAPTCHA, Cloudflare, Multi-Factor Authentication, or access controls.
2. **Never fabricate submission**: A job application is recorded as "Applied" only when confirmed through an authorized integration or when the user explicitly verifies and approves the submission.
3. **Always require explicit user approval**: Automated form mapping populates fields for user convenience, but final submission is gated behind user consent.

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ 1. Select Job   │ ───>  │ 2. Deep Analyze │ ───>  │ 3. Match Score  │
└─────────────────┘       └─────────────────┘       └─────────────────┘
                                                             │
                                                             ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ 6. Open Form    │ <───  │ 5. Cover Letter │ <───  │ 4. Tailor Resume│
└─────────────────┘       └─────────────────┘       └─────────────────┘
         │
         ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ 7. Map & Fill   │ ───>  │ 8. User Review  │ ───>  │ 9. Explicit OK │
└─────────────────┘       └─────────────────┘       └─────────────────┘
                                                             │
                                                             ▼
                                                    ┌─────────────────┐
                                                    │10. Verified Log │
                                                    └─────────────────┘
```

## Daily Scheduled Sweeps
- Users configure daily search parameters (e.g. 9:00 AM, target titles, locations, minimum match score).
- The background scheduler iterates over enabled adapters (LinkedIn, Indeed, Naukri, Company Career Pages).
- New listings are deduplicated, analyzed, and evaluated against the candidate's master profile.
- When an opportunity exceeds the minimum threshold, in-app and email/Telegram notifications are dispatched.
- Applications are never submitted automatically during daily search sweeps.
