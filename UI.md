# UI.md — PasteWise
## Evidence-Based Multilingual Document Understanding Interface

> **Product:** PasteWise  
> **Architecture:** Single Next.js Application  
> **Framework:** Next.js App Router  
> **UI:** React + TypeScript  
> **Styling:** Tailwind CSS + CSS Variables  
> **Validation:** Shared Zod contracts from Backend.md  
> **Primary Experience:** Mobile-first, one-screen document understanding  
> **Primary Languages:** Amharic, Afaan Oromoo, Tigrinya and English

Related documents:
- `AGENTS.md` — Product scope, engineering rules and implementation constraints.
- `Backend.md` — Backend architecture, processing pipeline, API contracts and verification.
- `Infra.md` — Deployment, environment configuration and provider setup.

---

# 1. Product Experience

## 1.1 Core Product Promise

**Understand what your document says. Know what is verified. Know what you still need to check.**

PasteWise transforms confusing documents into understandable explanations and practical next steps.

The interface must communicate three things:

1. What the document says.
2. What the user needs to do.
3. Which information has been verified against the original document.

The UI must never make AI-generated information look more authoritative than the original document.

## 1.2 Primary User Journey

The main experience should take approximately 90 seconds.

```text
OPEN PASTEWISE
      |
      v
PASTE / UPLOAD / CAMERA
      |
      v
SELECT LANGUAGE
      |
      v
EXPLAIN DOCUMENT
      |
      v
PROCESSING
      |
      v
UNDERSTAND RESULTS
      |
      +--------------------+
      |                    |
      v                    v
CHECK ORIGINAL        ASK QUESTION
      |                    |
      v                    v
VERIFY EVIDENCE       FOLLOW-UP ANSWER
      |                    |
      +---------+----------+
                |
                v
          TAKE ACTION
```

The product should not require an account, onboarding tour or complicated configuration.

## 1.3 UI Principles

1. **The paste box is the home screen.** No marketing landing page before the actual product.
2. **Big, calm and readable.** Prioritize people with limited literacy and non-native readers.
3. **Voice is first-class.** Every appropriate explanation card must support playback.
4. **Evidence before confidence.** Verified information must be traceable to original document text.
5. **Never fake certainty.** Unverified information must be visibly distinguished.
6. **Never silently remove information.** Unmatched dates and amounts must remain visible.
7. **Processing must be transparent.** Users should understand what the application is doing.
8. **Graceful degradation.** Demo mode must remain available when external services fail.
9. **Privacy must be understandable.** Explain how uploaded documents are processed.
10. **One obvious next action.** Every screen should have a clear primary action.

---

# 2. Application Structure

## 2.1 Main Screens

Keep the application focused.

```text
/
├── Home / Paste
│
├── Result
│   ├── Explanation
│   ├── Actions
│   ├── Deadlines
│   ├── Costs
│   ├── Documents
│   ├── Original Source
│   └── Follow-up
│
└── /eval
    └── Evaluation Dashboard
```

Result and Follow-up should be states of the same main application experience rather than unnecessarily separate routes.

The `/eval` route is a separate judge-facing experience.

## 2.2 Navigation

Keep navigation minimal.

Desktop:
- PasteWise logo.
- Language selector.
- Privacy information.
- Evaluation link.

Mobile:
- Compact logo.
- Language selector.
- Main content.
- No unnecessary navigation drawer.

The user must be able to start processing immediately.

---

# 3. Home / Paste Screen

Route: `/`

## 3.1 Layout

The home screen contains:

1. Product identity.
2. Short explanatory subtitle.
3. Document input area.
4. Upload and camera actions.
5. Language selection.
6. Primary Explain button.
7. Example documents.
8. Small privacy explanation.

Suggested heading:

**Understand your documents.**

Subtitle:

"Paste or upload a document. We will explain what it says and what you need to do."

## 3.2 PasteBox Component

The main component is `PasteBox`.

Features:
- Large textarea.
- Paste support with Ctrl+V.
- Automatic text detection.
- Character count.
- Clear button.
- File upload.
- Camera capture on supported devices.
- Drag and drop on desktop.
- File preview before processing.

Placeholder:

"Paste your document here..."

Small hint:

"Or upload a photo or PDF."

Supported formats:
- JPEG
- PNG
- PDF
- Plain text through the textarea.

Restrictions must match Backend.md.

Maximum text length: 20,000 characters.

Maximum file size: 8 MB.

Do not display unsupported file formats as accepted.

## 3.3 File Preview

After selecting a file, show:

- Filename.
- File type.
- File size.
- Preview when possible.
- Remove button.
- Processing eligibility.

Do not upload files immediately after selection.

The user should explicitly press Explain it.

For camera capture:
- Request permission only after the user selects the camera action.
- Support mobile camera capture.
- Provide a fallback file picker.
- Explain permission failures in simple language.

## 3.4 LanguageChips

Supported languages:

| Code | Display |
|---|---|
| am | አማርኛ |
| om | Afaan Oromoo |
| ti | ትግርኛ |
| en | English |

Use accessible radio controls.

Requirements:
- Clearly indicate the selected language.
- Support keyboard navigation.
- Use correct script fonts.
- Remember the last selected language using localStorage.
- Wrap localStorage access in try/catch.
- Fall back to English if the saved value is invalid.
- Do not send unsupported language identifiers to the backend.

Source language and explanation language must be separate concepts.

The user selects the desired explanation language. The backend detects the source language.

## 3.5 DemoPicker

Provide three ready-to-use examples:

1. Government notice.
2. Medical document.
3. Financial document.

Each example must load instantly.

Demo selection should display:
- Document title.
- Short description.
- Document preview.
- Try this example action.

Use the backend's actual demo IDs.

Demo mode must not require a live AI provider.

The UI must visibly identify demo output as an example.

## 3.6 Primary Action

Button:

**Explain it**

Behavior:
- Disabled when input is invalid.
- Disabled while processing.
- Displays a loading state after submission.
- Sends text or file to `/api/explain`.
- Sends the selected target language.
- Sends `demoId` for cached examples.

Never submit both file and text unless the API contract explicitly supports that mode.

---

# 4. Processing Experience

The backend uses an explicit processing pipeline. The UI must reflect it.

## 4.1 ProcessingPanel

Show a calm, simple processing indicator.

Suggested stages:

```text
1. Reading your document
2. Understanding the language
3. Finding important information
4. Checking dates and amounts
5. Preparing your explanation
```

Use the real processing stage when available.

If the backend does not expose live stage progress, display a generic loading message instead of pretending that a particular stage has completed.

Suggested message:

"Reading your document. This may take a moment."

## 4.2 Processing States

| State | UI behavior |
|---|---|
| Idle | Input screen |
| Validating | Checking document |
| Extracting | Reading text |
| Understanding | Processing document |
| Verifying | Checking dates and amounts |
| Translating | Preparing selected language |
| Completed | Show results |
| Failed | Friendly error and recovery |
| Timed out | Retry or use example |

Never simulate successful verification using frontend timers.

The UI must only display verification results received from the backend.

## 4.3 Loading Design

- Skeleton result cards.
- Subtle progress indicator.
- No blocking full-screen animation.
- No fake percentage counters.
- No fake stage completion.
- Respect reduced-motion preferences.

---

# 5. Result Screen

The result screen is the most important product interface.

Keep the cards in a consistent order.

```text
RESULT
  |
  +-- Document Overview
  |
  +-- What You Must Do
  |
  +-- Deadlines
  |
  +-- Costs
  |
  +-- Documents to Bring
  |
  +-- Verification Summary
  |
  +-- Original Document
  |
  +-- Follow-up Questions
```

## 5.1 DocumentOverview

Title:

**What this document says**

Display:
- Document type.
- One or two sentence summary.
- Detected source language.
- Selected explanation language.
- Extraction quality.
- Overall explanation confidence.

Document type labels:

| Backend value | UI label |
|---|---|
| government_notice | Government notice |
| medical | Medical document |
| financial | Financial document |
| school | School document |
| other | Other document |

The UI must translate these labels into the selected language.

Do not expose internal backend enum values.

## 5.2 WhatYouMustDo

Display the `actions` array as a numbered checklist.

Each action should have:
- Number.
- Plain-language instruction.
- Optional urgency indicator.
- Evidence reference when available.
- Local completion checkbox.

Checklist behavior:
- Checkboxes are local UI state only.
- Do not modify backend verification data.
- Persist checklist state only for the current document session if necessary.
- Clearly distinguish mandatory actions from suggestions when the backend provides that distinction.

Urgent actions must be accessible without relying on red color alone.

## 5.3 DeadlineCard

Display all extracted deadlines.

Each deadline must show:

- Label.
- Original date.
- Normalized date if available.
- Calendar type.
- Verification status.
- Source evidence.
- Warning where applicable.

Example:

**Application deadline**

Original date: 10/05/2019

<badge>Verified in source</badge>

Source: "Submit your application by 10/05/2019."

If the date is ambiguous:

<badge color="warning">Check the original</badge>

"The date format is unclear. We cannot confirm which day comes first."

### Ethiopian Calendar Display

When the document uses the Ethiopian calendar:

- Show the original Ethiopian date.
- Show the corresponding Gregorian date when reliably converted.
- Identify both calendar systems.
- Preserve the original source date.
- Explain approximate conversion if interpretation is uncertain.

Example:

Original: 10 Meskerem 2019 E.C.

Gregorian equivalent: Display the tested conversion result.

Do not generate example conversions as real verified results.

### Relative Deadlines

For:

"Submit within 30 days of receiving this notice."

Display:

**Relative deadline**

"30 days after you receive this notice."

Warning:

"We cannot calculate the final date because the receipt date is unknown."

Never calculate a final date without the required starting information.

## 5.4 CostCard

Display each extracted amount separately.

Fields:
- Description.
- Original amount.
- Normalized amount where applicable.
- Currency.
- Verification status.
- Source evidence.

Example:

**Registration fee**

ETB 2,500

<badge>Verified in source</badge>

Source: "The registration fee is ETB 2,500."

If an amount cannot be verified:

<badge color="warning">Check the original</badge>

"The extracted amount could not be matched to the original document."

Never:
- Change a currency silently.
- Round an original amount.
- Treat an account number as money.
- Add amounts without a meaningful calculation.
- Hide unverified amounts.

If a calculated total is displayed, label it clearly as a calculation, not a quoted source amount.

## 5.5 DocumentsToBring

Display the `documentsToBring` array as a checklist.

Use large touch targets.

The user may locally mark documents as prepared.

Do not imply that the document issuer requires an item unless the source supports that conclusion.

If the LLM suggests an item without direct evidence, label it as a suggestion.

## 5.6 VerificationSummary

Create a compact verification overview.

Example:

```text
Information checked

3 verified
1 needs checking

Dates and amounts were compared
with the original document.
```

Possible states:

| State | Display |
|---|---|
| verified | Verified in source |
| unverified | Check the original |
| partial | Partly verified |
| relative | Depends on another date |
| ambiguous | Unclear in original |

Do not use one overall green badge to suggest that every field is verified.

The verification summary must be derived from actual backend results.

## 5.7 ConfidenceBanner

The UI must distinguish three independent dimensions.

### Extraction quality

How well the document was read.

### Verification status

Whether a specific fact matches its original evidence.

### Language quality

How reliably the explanation was produced in the selected language.

Example:

"Some text in this image was difficult to read. Check the original before acting."

A low extraction score must not be hidden by a high language quality score.

A verified amount must remain identified as verified even when another field is ambiguous.

---

# 6. Original Document and Evidence Viewer

Component: `OriginalDocumentViewer`

Transparency is a core product feature.

## 6.1 Original Text

Display the original extracted document text.

Features:
- Expand and collapse.
- Search within text.
- Selectable text.
- Highlight extracted source spans.
- Jump to matching evidence from a result card.

## 6.2 Evidence Highlighting

When the user selects a date or amount card:

1. Open the original text.
2. Locate its source span.
3. Highlight the corresponding text.
4. Scroll to the relevant location.
5. Display the exact evidence quote.

Use source offsets that reference the original text.

Never calculate frontend highlight positions from normalized text.

If a source span is invalid, missing or out of range:

- Do not highlight an approximate location.
- Show the available evidence quote if trustworthy.
- Otherwise show "Source location unavailable."

## 6.3 OCR Provenance

When available, indicate whether the text came from:

- PDF text extraction.
- Image OCR.
- Vision-based extraction.

OCR confidence should not be represented as factual verification.

For poor-quality scans, show:

"Some parts of this document may have been read incorrectly."

---

# 7. Follow-up Experience

Component: `FollowUpSheet`

Follow-up should appear as a bottom sheet on mobile and an inline panel on desktop.

## 7.1 Suggested Questions

Provide three context-aware suggestions:

- "What happens if I miss the deadline?"
- "Where do I need to go?"
- "Explain this in simpler words."

Suggestions are prompts, not claims that the document contains the answers.

## 7.2 Chat Interface

Elements:
- Conversation history.
- User message.
- AI response.
- Loading indicator.
- Input field.
- Send button.
- Listen button.

Keep the selected explanation language consistent.

## 7.3 Source-Based Answer Labels

Every follow-up answer should distinguish:

**Stated in the document**

Information directly supported by the original document.

**Not stated in the document**

Information the document does not explain.

Example:

Question:

"What happens if I miss the deadline?"

Answer:

"The document does not explain what happens after the deadline. Please contact the issuing office."

Do not show follow-up answers with a Verified badge unless a specific claim has its own verified source evidence.

## 7.4 Follow-up Failure States

- Network error.
- Timeout.
- Invalid context.
- Unsupported question.
- Provider failure.
- Empty response.

Use friendly messages.

Never fabricate an answer to avoid showing an error.

---

# 8. Voice and Audio Experience

Voice is a first-class product feature.

Component: `ListenButton`

## 8.1 Playback

Every explanation card should support individual playback.

The result screen should also support full explanation playback.

Controls:
- Play.
- Pause.
- Resume.
- Stop.
- Loading.
- Playback error.

Do not autoplay.

Require a user interaction before audio playback.

## 8.2 TTS Fallback

Backend response may provide:

```json
{
  "ok": true,
  "data": {
    "fallback": "webspeech",
    "supported": false
  }
}
```

When server-side TTS is unavailable:

1. Attempt browser speech synthesis.
2. Check whether a voice exists for the selected language.
3. Never silently use an unrelated language voice.
4. If no voice is available, explain the limitation.
5. Keep the text available at all times.

## 8.3 Audio Accessibility

- Visible text must always accompany audio.
- Provide captions/transcript by default.
- Keyboard-operable playback.
- Screen-reader labels.
- No autoplay.
- Clear playback state.

---

# 9. Language and Typography

## 9.1 Supported Languages

- Amharic.
- Afaan Oromoo.
- Tigrinya.
- English.

All UI labels, errors, buttons, warnings and accessibility messages must support these languages.

Do not translate only the document explanation while leaving critical safety messages in English.

## 9.2 Fonts

Bundle fonts locally.

Recommended:

| Script | Font |
|---|---|
| Latin | Inter |
| Amharic | Noto Sans Ethiopic |
| Tigrinya | Noto Sans Ethiopic |
| Afaan Oromoo | Inter or an appropriate Latin font |

Do not rely on remote font loading for essential script rendering.

## 9.3 Text Direction

The initial languages are primarily left-to-right.

However:
- Use semantic direction settings.
- Avoid hardcoded layout assumptions.
- Keep date and currency values readable.
- Ensure source quotes preserve original character order.

## 9.4 Language Switching

Switching the explanation language must not change original evidence.

When the user changes languages:

- Preserve original source text.
- Preserve verified facts.
- Update translated explanations.
- Preserve original amounts.
- Preserve original date strings.
- Keep the same document identity.

If the backend cannot safely translate the existing result, request a supported reprocessing operation rather than locally translating critical facts.

---

# 10. Design System

## 10.1 Visual Direction

The design should feel:

- Calm.
- Trustworthy.
- Clear.
- Human.
- Accessible.
- Modern without looking overly technical.

Avoid:
- Dense dashboards.
- Excessive gradients.
- Neon colors.
- Excessive animation.
- Tiny labels.
- Complex charts in the primary user flow.
- Technical AI terminology.

## 10.2 Color Tokens

Use CSS variables.

Suggested palette:

```css
:root {
  --background: #F8FAFC;
  --surface: #FFFFFF;
  --surface-muted: #F1F5F9;

  --text-primary: #172033;
  --text-secondary: #536174;

  --border: #E2E8F0;

  --accent: #2563EB;
  --accent-hover: #1D4ED8;

  --success: #15803D;
  --warning: #B45309;
  --danger: #B91C1C;

  --focus: #2563EB;
}
```

Dark mode:

```css
.dark {
  --background: #0B1220;
  --surface: #111C2E;
  --surface-muted: #1E293B;

  --text-primary: #F8FAFC;
  --text-secondary: #CBD5E1;

  --border: #334155;

  --accent: #60A5FA;

  --success: #4ADE80;
  --warning: #FBBF24;
  --danger: #F87171;

  --focus: #60A5FA;
}
```

Maintain WCAG AA contrast at minimum.

## 10.3 Typography

Base font size: 18px.

Body line height: 1.6.

Headings should be readable without overwhelming the content.

Use:
- Large result summaries.
- Clear card headings.
- Short paragraphs.
- Comfortable line lengths.
- Adequate spacing.

## 10.4 Spacing

Use an 8px spacing grid.

Recommended:
- Card radius: 16px.
- Input radius: 14px.
- Button height: at least 48px.
- Minimum touch target: 48px.
- Generous mobile padding.
- Consistent vertical rhythm.

## 10.5 Motion

- Subtle transitions only.
- Respect `prefers-reduced-motion`.
- No animations that delay access to results.
- No fake processing progress.

---

# 11. Responsive Layout

## 11.1 Mobile

Primary target: 390px viewport width.

Requirements:
- No horizontal scrolling.
- Full-width input.
- Full-width primary button.
- Stacked result cards.
- Bottom-sheet follow-up.
- Sticky bottom action bar.
- Minimum 48px touch targets.

## 11.2 Tablet

- Comfortable content width.
- Larger document preview.
- Optional two-column result layout.
- Keep primary actions accessible.

## 11.3 Desktop

- Centered content container.
- Maximum content width around 1100px.
- Optional two-column layout:
  - Main explanation.
  - Original document/evidence panel.
- Follow-up panel may sit alongside results.

The result must remain readable without forcing a dense dashboard.

---

# 12. API and Frontend Integration

The frontend must use the backend contracts defined in Backend.md.

## 12.1 API Client

Create:

```text
/lib/api/
├── client.ts
├── explain.ts
├── followup.ts
├── tts.ts
└── types.ts
```

Use the same Zod contracts as the backend wherever possible.

Do not independently redefine response types in components.

## 12.2 API Response Handling

Success:

```json
{
  "ok": true,
  "data": {},
  "meta": {
    "requestId": "req_123",
    "processingMs": 1200,
    "version": "1.0"
  }
}
```

Failure:

```json
{
  "ok": false,
  "error": {
    "code": "INVALID_DOCUMENT",
    "message": "The document could not be processed.",
    "retryable": false
  }
}
```

The API client must:
- Check HTTP status.
- Check the response envelope.
- Validate data with Zod.
- Normalize errors.
- Handle timeouts.
- Avoid exposing raw exceptions.
- Prevent duplicate submissions.

## 12.3 Request Handling

For `/api/explain`:

- Send JSON for text requests.
- Send multipart/form-data for file requests.
- Do not manually set multipart Content-Type boundaries.
- Include the selected target language.
- Include `demoId` when using a demo.
- Handle 413, 415, 422, 429, 502, 503 and 504.

For `/api/followup`:

- Send document context.
- Send bounded conversation history.
- Send question and target language.
- Include the server-issued context integrity mechanism where implemented.

For `/api/tts`:

- Request only when the user presses Listen.
- Handle audio streams.
- Handle browser speech fallback.
- Stop previous audio when starting a new playback session.

---

# 13. Frontend State Management

Use a predictable state model.

Suggested document states:

```ts
type DocumentUIState =
  | { status: "idle" }
  | { status: "validating" }
  | { status: "processing"; requestId: string }
  | { status: "success"; result: Explanation }
  | { status: "error"; error: UIError };
```

Follow-up state:

```ts
type FollowUpState =
  | "idle"
  | "sending"
  | "success"
  | "error";
```

Audio state:

```ts
type AudioState =
  | "idle"
  | "loading"
  | "playing"
  | "paused"
  | "error";
```

Rules:
- Keep document processing state separate from audio state.
- Keep follow-up state separate from result state.
- Avoid duplicating backend verification data in local state.
- Use derived UI state for badges and warnings.
- Do not mutate server results when a user checks a local checklist item.
- Reset stale processing state when switching documents.

No frontend component may independently determine whether a fact is verified.

---

# 14. Component Architecture

Suggested components:

```text
components/
├── layout/
│   ├── AppShell.tsx
│   ├── Header.tsx
│   └── Footer.tsx
│
├── input/
│   ├── PasteBox.tsx
│   ├── FileUploader.tsx
│   ├── CameraCapture.tsx
│   ├── FilePreview.tsx
│   ├── LanguageChips.tsx
│   └── DemoPicker.tsx
│
├── processing/
│   ├── ProcessingPanel.tsx
│   └── ProcessingSkeleton.tsx
│
├── result/
│   ├── ResultView.tsx
│   ├── DocumentOverview.tsx
│   ├── ActionChecklist.tsx
│   ├── DeadlineCard.tsx
│   ├── CostCard.tsx
│   ├── DocumentsCard.tsx
│   ├── VerificationSummary.tsx
│   ├── ConfidenceBanner.tsx
│   └── ResultDisclaimer.tsx
│
├── evidence/
│   ├── OriginalDocumentViewer.tsx
│   ├── EvidenceHighlight.tsx
│   └── SourceQuote.tsx
│
├── followup/
│   ├── FollowUpSheet.tsx
│   ├── MessageList.tsx
│   ├── MessageInput.tsx
│   └── SuggestedQuestions.tsx
│
├── audio/
│   ├── ListenButton.tsx
│   ├── AudioControls.tsx
│   └── AudioStatus.tsx
│
├── common/
│   ├── StatusBadge.tsx
│   ├── StatusToast.tsx
│   ├── ErrorState.tsx
│   ├── EmptyState.tsx
│   └── LoadingSpinner.tsx
│
└── eval/
    ├── EvalOverview.tsx
    ├── MetricCard.tsx
    ├── LanguageComparison.tsx
    ├── SampleComparison.tsx
    └── FailureCases.tsx
```

Components should be reusable but not unnecessarily abstract.

---

# 15. Error and Empty States

Every asynchronous interaction must have a recovery path.

## 15.1 Empty State

Message:

"Paste a document or try an example."

Action:
- Paste.
- Upload.
- Try an example.

## 15.2 Validation Error

Example:

"This file is too large. Please choose a file under 8 MB."

Provide a clear action.

## 15.3 Processing Error

Example:

"We could not read this document."

Actions:
- Try again.
- Upload a clearer image.
- Use an example.

## 15.4 Provider Error

Example:

"The explanation service is temporarily unavailable."

Actions:
- Try again.
- Use an offline example.

Do not expose provider names or technical errors.

## 15.5 Translation Error

Example:

"We could not prepare this explanation in your selected language."

Offer the original language where available.

Never silently display a different language as though it were the selected one.

## 15.6 Low Extraction Quality

Example:

"Some parts of this document were difficult to read. Check the original before acting."

## 15.7 Unverified Facts

Example:

"We found this date, but could not confirm its meaning. Check the original document."

Unverified values must remain visible.

## 15.8 Offline State

Display:

"You are offline. You can still try an example."

Demo mode must work independently of network access.

---

# 16. Privacy and Trust UI

Privacy is a visible product requirement.

Provide a small but accessible privacy explanation on the home screen and a more detailed explanation in the footer or privacy panel.

Suggested copy:

"Your document is processed to create an explanation. PasteWise does not store documents by default. External AI services may process document content when live processing is used."

Important:
- The UI statement must match actual backend retention behavior.
- Identify external provider processing in the full privacy explanation.
- Distinguish live processing from offline demo mode.
- Do not promise absolute confidentiality.
- Do not log or display document content in diagnostic screens.

On results, show a small reminder:

"Always check important information against the original document."

---

# 17. Disclaimer and Safety

Display a compact disclaimer on result screens.

"This explanation is for understanding your document. It is not legal, medical or financial advice. Contact the issuing authority or a qualified professional when necessary."

For urgent medical or legal danger, display the backend-provided safety warning prominently.

Do not:
- Diagnose medical conditions.
- Recommend changing medication.
- Make legal determinations.
- Invent penalties or consequences.
- Tell users to ignore official instructions.

The UI must preserve safety warnings returned by the backend.

---

# 18. Evaluation Dashboard

Route: `/eval`

Purpose: Demonstrate the actual technical quality of PasteWise.

The dashboard is for judges and developers, not normal document-processing users.

## 18.1 Overview

Show:
- Dataset size.
- Supported languages.
- Document categories.
- Evaluation version.
- Last evaluation run.
- Baseline results.
- Adapted results.

## 18.2 Metrics

Display:

1. Critical field accuracy.
2. Verification precision.
3. Verification recall.
4. Faithfulness.
5. Plain-language quality.
6. Translation quality.
7. Schema validity.
8. Processing reliability.
9. Average cost per successful explanation.
10. Processing latency.

Do not display invented metrics.

All figures must come from actual saved evaluation results.

## 18.3 Baseline vs Adapted

Provide side-by-side comparisons.

Compare:
- Original document.
- Baseline explanation.
- Adapted explanation.
- Language.
- Critical fact preservation.
- Human review results.

The adapted model must not automatically be presented as superior.

Show the actual evaluation results.

## 18.4 Failure Cases

Include:
- Ambiguous dates.
- Incorrect OCR.
- Unmatched amounts.
- Relative deadlines.
- Translation errors.
- Hallucinated claims.
- Prompt injection attempts.

Explain what failed and what was changed.

The dashboard must distinguish synthetic evaluation data from actual production data.

## 18.5 Visual Design

Keep the dashboard simple:
- Compact metric cards.
- Clear comparison tables.
- Readable sample outputs.
- Responsive layout.
- No excessive decorative charts.

The page exists to demonstrate honest engineering and measurable improvement.

---

# 19. Accessibility Requirements

Accessibility is central to PasteWise.

## 19.1 Semantic HTML

Use:
- `main`
- `header`
- `footer`
- `section`
- `article`
- `button`
- `textarea`
- `fieldset`
- `legend`
- Proper heading hierarchy.

## 19.2 Keyboard Support

- All actions keyboard accessible.
- Visible focus indicators.
- Logical tab order.
- Escape closes dialogs and sheets where appropriate.
- No keyboard traps.

## 19.3 Screen Readers

- Announce processing completion.
- Announce errors.
- Identify verified and unverified states using text.
- Label audio controls.
- Associate input errors with their controls.
- Announce follow-up responses appropriately.

Use polite live regions for ordinary processing updates and appropriate assertive announcements for critical errors.

## 19.4 Visual Accessibility

- WCAG AA minimum contrast.
- Text resizing to 200%.
- Minimum 48px touch targets.
- No color-only communication.
- No flashing content.
- Reduced motion support.

## 19.5 Reading Accessibility

- Short sentences.
- Common vocabulary.
- Clear headings.
- One main idea per paragraph.
- Avoid dense information blocks.
- Explain technical terms.

---

# 20. Performance and Loading

Requirements:

- Fast initial render.
- No unnecessary client-side dependencies.
- Lazy-load nonessential evaluation components.
- Avoid loading TTS SDKs until required.
- Optimize uploaded image previews.
- Avoid excessive result re-renders.
- Keep large original document text collapsible.
- Avoid rendering huge source documents all at once.

Do not sacrifice readability for aggressive information density.

---

# 21. Demo Requirements

The product must be demonstrable in approximately 90 seconds.

## 21.1 Demo Flow

1. Open PasteWise.
2. Select a government notice example.
3. Select Amharic or English.
4. Press Explain it.
5. Display the explanation.
6. Show the action checklist.
7. Show a verified deadline.
8. Show an unverified or ambiguous field.
9. Open the original source and highlight evidence.
10. Ask a follow-up question.
11. Play the explanation.

## 21.2 Demo Reliability

- Demo responses must be precomputed.
- No live API key required.
- No network required.
- No fake verification.
- No simulated AI results.
- No fake metrics.
- All demo responses must satisfy the same Zod schema as live responses.

## 21.3 Screenshot Checklist

Capture:

- Home screen.
- File upload preview.
- Processing state.
- English result.
- Amharic result.
- Deadline verification.
- Cost verification.
- Original document highlighting.
- Follow-up conversation.
- Evaluation dashboard.

---

# 22. Frontend Testing

## 22.1 Component Tests

Test:
- PasteBox.
- LanguageChips.
- FileUploader.
- DeadlineCard.
- CostCard.
- VerificationSummary.
- OriginalDocumentViewer.
- FollowUpSheet.
- ListenButton.

## 22.2 Integration Tests

Test:
- Text explanation.
- PDF upload.
- Image upload.
- Demo selection.
- Language switching.
- Evidence highlighting.
- Follow-up.
- TTS playback.
- TTS fallback.
- API failures.

## 22.3 Accessibility Tests

Test:
- Keyboard navigation.
- Screen-reader labels.
- Focus visibility.
- Contrast.
- Text resizing.
- Mobile touch targets.
- Reduced motion.

## 22.4 Responsive Tests

Minimum viewports:

| Device | Width |
|---|---:|
| Small mobile | 320px |
| Standard mobile | 390px |
| Large mobile | 430px |
| Tablet | 768px |
| Desktop | 1280px |

No horizontal overflow.

## 22.5 End-to-End Tests

Required scenarios:

1. Paste text and explain.
2. Upload an image and explain.
3. Upload a PDF and explain.
4. Load an offline demo.
5. View verified information.
6. View unverified information.
7. Inspect original evidence.
8. Ask a follow-up.
9. Play audio.
10. Recover from a provider failure.

---

# 23. Implementation Order

Implement the UI in alignment with Backend.md.

| Phase | UI implementation | Acceptance criteria |
|---|---|---|
| 1 | Design tokens and AppShell | Responsive and accessible foundation |
| 2 | PasteBox and LanguageChips | Text input and language selection work |
| 3 | DemoPicker | Offline demos load correctly |
| 4 | API client and Zod integration | Typed backend integration |
| 5 | ProcessingPanel | Accurate loading and error states |
| 6 | ResultView | All backend fields displayed |
| 7 | Verification components | Evidence and verification statuses correct |
| 8 | OriginalDocumentViewer | Correct source-span highlighting |
| 9 | FollowUpSheet | Document-bound conversation |
| 10 | Audio components | TTS and browser fallback |
| 11 | Localization | All supported languages |
| 12 | Evaluation dashboard | Real evaluation results |
| 13 | Accessibility and polish | Accessibility and responsive tests pass |

Do not build the entire frontend with mocked response structures and then attempt to retrofit backend compatibility.

Use the shared contracts from the beginning.

---

# 24. Definition of Done

## Core Experience
- [ ] Paste text.
- [ ] Upload image.
- [ ] Upload PDF.
- [ ] Select target language.
- [ ] Load offline examples.
- [ ] Explain document.
- [ ] Display all result sections.

## Evidence and Verification
- [ ] Show original date.
- [ ] Show normalized date when available.
- [ ] Show original amount.
- [ ] Show currency.
- [ ] Show verification status.
- [ ] Show exact evidence.
- [ ] Highlight valid source spans.
- [ ] Display ambiguity warnings.
- [ ] Never fabricate verified badges.

## Localization
- [ ] Amharic.
- [ ] Afaan Oromoo.
- [ ] Tigrinya.
- [ ] English.
- [ ] Correct fonts.
- [ ] Translated UI labels.
- [ ] Translated safety messages.
- [ ] Language switching preserves source evidence.

## Follow-up and Voice
- [ ] Follow-up interface.
- [ ] Context-aware suggested questions.
- [ ] Document-based answers.
- [ ] Unsupported claims clearly identified.
- [ ] Per-card audio.
- [ ] Full explanation audio.
- [ ] Browser fallback.
- [ ] No autoplay.

## Privacy and Accessibility
- [ ] Privacy explanation.
- [ ] Correct demo/live distinction.
- [ ] WCAG AA contrast.
- [ ] Keyboard navigation.
- [ ] Screen-reader support.
- [ ] 200% text resizing.
- [ ] 48px touch targets.
- [ ] Reduced motion.

## Reliability
- [ ] Loading states.
- [ ] Error states.
- [ ] Offline demo.
- [ ] Provider failure handling.
- [ ] No duplicate submissions.
- [ ] No stale document state.
- [ ] Responsive layouts.

## Evaluation
- [ ] Baseline metrics.
- [ ] Adapted metrics.
- [ ] Language comparisons.
- [ ] Failure cases.
- [ ] Actual evaluation results only.

---

# 25. Final UI Rules

1. The original document is the source of truth.
2. The backend determines verification status.
3. The frontend never independently verifies dates or amounts.
4. Every unverified critical value remains visible.
5. Every evidence highlight must use original-source offsets.
6. Translation must never modify original evidence.
7. AI answers must not be presented as official document statements.
8. Confidence and verification must remain separate.
9. Every async interaction must have a recovery path.
10. Demo mode must work offline.
11. No unnecessary sign-up, onboarding or marketing screens.
12. Accessibility must be part of the initial implementation.
13. Never invent processing progress or evaluation results.
14. Never sacrifice factual clarity for visual polish.

**Final product experience:**

PasteWise should feel like a helpful person sitting beside you, reading a confusing document and explaining it in language you understand.

It should tell you what the document says, what you need to do, which facts are supported by the original, and what you still need to confirm.

**Simple to use. Transparent about uncertainty. Grounded in evidence.**
