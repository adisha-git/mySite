# Adisha Madhushanka — Stories

Situations Adisha has handled, for "Tell me about a time…" questions.

## Intermittent "Checked in" label on Singapore Airlines Manage Booking

Situation: On the Singapore Airlines Manage Booking platform, the "Checked in" label sometimes failed to appear for passengers who had already checked in. It was in a key customer-facing flow, so it needed fixing quickly, but it was hard to reproduce consistently.

What Adisha did: He traced the API responses and frontend state updates and found a race condition. Booking details and check-in status loaded separately, and if the page rendered before the check-in status arrived, the label didn't update when the status came back. He reproduced it with network throttling and fixed the rendering logic himself so the label updated when the status loaded. He then worked with QA to verify the fix under slow-network conditions and across different passenger scenarios.

Result: After QA verified the affected scenarios, the fix shipped in that release.

Skills it shows: debugging, asynchronous state in React, working with QA

## Pushing back on an unrealistic React upgrade plan at OCBC

Situation: At OCBC, the security team identified vulnerabilities in some libraries. Their updated versions required a newer version of React, so the work also meant upgrading React DOM, React Router and related dependencies. The initial plan was two people for about two to three months, with three months as the intended maximum.

What Adisha did: He saw that the plan underestimated the work and raised the risks early. He explained that the upgrade would need routing changes, would affect test cases, and would need full regression testing of the application. He proposed two options: another developer or an extra month. His manager initially disagreed, so they worked through the scope and testing effort in several detailed discussions, with Adisha keeping the focus on what was needed to deliver the upgrade safely.

Result: They agreed to both an additional developer and an extra month, giving a revised plan that better accounted for implementation and testing.

What he learned: Raise delivery risks early, explain them clearly, and bring practical options to the discussion.

[TO CONFIRM: the project name, and whether the upgrade finished within the revised plan, with any test or security results]

Skills it shows: estimation, raising risks early, technical communication, dependency upgrades

## A state-management choice he would make differently, at Innovative Software Engineering

Situation: At Innovative Software Engineering in Sri Lanka, Adisha helped select the technology stack for a new project. Although he had used Redux before at Omobio, he argued against it for this application, and the team used React's Context API instead.

What happened: As the application grew, its state management became harder to maintain. Adisha realised he had underestimated the complexity the app would need to support, and that Redux could have managed it more effectively. By then the application was large and moving to Redux would have meant substantial rework, so the team continued with Context API. The consequence of his recommendation was an approach that became harder to change as the project grew.

What he learned: He now assesses long-term state-management needs more carefully and revisits a decision like this earlier. His takeaway is to weigh both the immediate benefits of an architectural choice and the cost of changing it later.

Skills it shows: owning a mistake, architectural judgement, state management in React

## Delivering the MindLogics Visa Workflow system on a tight deadline

Situation: At MindLogics, Adisha's team had to deliver the Visa Workflow Management System, which reads uploaded passports and supporting documents with AWS AI services, within a tight timeframe.

What Adisha did: He prioritised the essential functionality: document upload, information extraction and document review. He built reusable components for these flows so they could be used across the application, which reduced repeated development work. He also used AI-assisted development to speed up implementation and to help generate unit tests, particularly for edge cases.

Result: The team launched the system on time.

What he learned: Under a tight deadline, prioritise the essential user journey and invest in reusable components.

Skills it shows: prioritisation, reusable component design, AI-assisted development, delivering under pressure
