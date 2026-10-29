# Adisha Madhushanka — How he works

How Adisha approaches code review, mentoring and day-to-day engineering.

## Code review

Adisha uses pull-request reviews to help developers grow, not only to catch problems. When he reviews code, he suggests improvements and explains the reasoning behind them, including simpler or clearer ways to solve the same problem, so the developer can apply the approach on their own next time.

At Singapore Airlines and OCBC, he maintained a PR review checklist so the team had a consistent reference when preparing their changes.

## Testing

Adisha treats testing as part of delivering a feature, not a separate step. At Singapore Airlines and OCBC, he used Jest and React Testing Library to write unit tests, mock API responses, and cover component behaviour and edge cases.

Both teams had mandatory coverage gates that changes had to meet before merging: 80% for the relevant component at Singapore Airlines, and 90% at OCBC. Pre-push checks also blocked pushing code with failing tests. At OCBC, the team also used SonarQube to find code-quality issues and fixed the findings from its reports.

At MindLogics, Adisha used AI-assisted development extensively to help write unit tests, especially for edge cases.

Across these roles, testing was part of the development and pull-request review process, with automated checks enforcing the team's standards.

## Accessibility

Accessibility is part of how Adisha builds and reviews frontend components. He uses WCAG as a reference and follows each project's accessibility requirements.

In practice, he uses semantic HTML, makes sure keyboard navigation works, checks focus behaviour and colour contrast, and gives controls accessible labels. He uses ARIA where native HTML can't communicate the role or state a control needs.

He finds issues with axe and Lighthouse, alongside manual keyboard checks and screen-reader testing with VoiceOver and NVDA. He combines automated checks with manual testing to see whether people can actually navigate and complete a flow. When he finds an issue, he fixes it and retests the affected interaction, and he considers accessibility throughout development and code review.

## Working with AI tools

Adisha treats AI-generated code as a starting point and stays responsible for what gets merged. He reviews the changes himself, checks them against the requirements and the codebase's existing patterns, and runs the relevant tests and quality checks.

For AI-generated tests, he checks that the assertions verify the intended behaviour and that mocks don't hide defects. Passing tests and high coverage alone aren't enough for him.

He is especially careful with security-sensitive logic, permissions and business rules: he uses AI to assist there, but verifies its assumptions and suggestions independently.

His guideline is to use company-approved tools, keep confidential code and credentials out of unapproved services, and review generated code and tests before merging. The AI tools he has used include Claude Code, GitHub Copilot and AI coding agents, most extensively at MindLogics.

## Mentoring

Adisha mentors developers in several ways at once: pull-request reviews in which he explains the reasoning behind each suggestion, a PR review checklist the team can refer to, a meeting every sprint to find bottlenecks in the developers' assigned work and discuss where they need technical guidance, and practical examples from the developers' own code that help them strengthen their technical judgement and problem-solving skills.

He regularly mentored fellow developers this way at Singapore Airlines and OCBC, making mentoring part of the everyday development process.
