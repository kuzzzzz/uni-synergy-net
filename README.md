# Campus Connect Hub

Build a comprehensive University Campus Connect platform with the following features:

CORE FEATURES:

1. Student Profile System

   - Personal info, department, skills, interests, strengths, weak subjects

   - Availability schedule (time blocks for study sessions)

   - Academic goals and learning preferences

2. Smart Matching Algorithm

   - Match students based on complementary skills (strong in X helps weak in X)

   - Consider availability overlap, shared interests, department proximity

   - Display match score with detailed breakdown

3. Project Collaboration

   - Create projects with required skills and max team size

   - AI-powered member suggestions based on skills match

   - Project progress tracking and milestones

4. Study Groups

   - Form groups by subject, topic, or exam preparation

   - Schedule group sessions with calendar integration

   - Share resources and notes within groups

5. Real-time Communication

   - Direct messaging between matched students

   - Group chat for study groups and projects

   - Notification system for match requests, messages, meetings

6. Analytics Dashboard

   - Student engagement metrics

   - Most popular subjects/skills

   - Success rate of study partnerships

   - Network visualization (Neo4j graph)

TECHNICAL REQUIREMENTS:

- Modern, appealing UI with gradient accents and smooth animations

- Mobile-responsive design

- Dark mode support

- PostgreSQL for relational data

- Neo4j for student connection graph

- Real-time updates via WebSockets

- JWT authentication

- Role-based access (student, admin, staff)

DESIGN STYLE:

- Clean, modern interface inspired by Notion and Linear

- Calming color palette (blues, purples, soft gradients)

- Card-based layouts with subtle shadows

- Smooth transitions and micro-interactions

- Accessible and intuitive navigation

ADDITIONAL FEATURES:

- Calendar integration for scheduling

- Resource sharing (notes, documents, links)

- Rating system for study partners

- Achievement badges for active participation

-add the option of also login in with the school issued ID via an api point 

note this is a masters degree level project and I'll defending it in front of the faculty

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://uni-synergy-net.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/20b7f9b0-7dc6-4da9-ae01-e09d175a4e79).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
